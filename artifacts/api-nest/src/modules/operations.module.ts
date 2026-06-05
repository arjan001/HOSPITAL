/**
 * Operations — business logic #4 Care Pack mapping & #5 Demand aggregation.
 *
 *   GET  /api/v2/care-packs/mappings              — active condition → pack map (storefront)
 *   POST /api/v2/care-packs/assessments           — persist assessment outcome (session)
 *   GET  /api/v2/admin/care-pack-mappings         — CRUD list (admin)
 *   POST /api/v2/admin/care-pack-mappings
 *   PATCH /api/v2/admin/care-pack-mappings/:id
 *   DELETE /api/v2/admin/care-pack-mappings/:id
 *   GET  /api/v2/admin/demand/aggregation         — unified demand roll-up (admin)
 *   GET  /api/v2/admin/procurement/decisions      — procurement queue (BL #6)
 *   POST /api/v2/admin/procurement/generate         — build decisions from demand
 *   PATCH /api/v2/admin/procurement/decisions/:id
 *   GET  /api/v2/admin/procurement/decisions/:id/suggestions  — supplier ranks (BL #7)
 *   POST /api/v2/admin/procurement/decisions/:id/suggest
 *   POST /api/v2/admin/procurement/decisions/:id/select-supplier
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm"
import {
  db,
  carePackAssessments,
  carePackMappings,
  prescriptions,
  prescriptionDrugs,
  procurementDecisions,
  supplierSuggestions,
  type CarePackMapping,
  type ProcurementDecision,
  type SupplierSuggestion,
} from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"
import { AdminGuard, RequirePerm, AnyAdmin } from "../common/admin-guard"
import { CrmModule, CrmService } from "./crm.module"
import { SourcingModule, SourcingRequestsService } from "./sourcing.module"
import {
  CarePackAssemblyService,
  OperationsFulfillmentModule,
} from "./operations-fulfillment"
import {
  priorityFromQty,
  scoreSuppliersForSku,
  type InventoryInput,
  type QuoteInput,
  type SupplierInput,
} from "../common/supplier-scoring"

const DEFAULT_MAPPINGS: Array<{
  conditionKey: string
  packSlug: string
  packName: string
  productSkus: string[]
  priority: number
}> = [
  { conditionKey: "diabetes", packSlug: "diabetes-care", packName: "Diabetes Care Pack", productSkus: ["DM-STRIP-50", "DM-LANCET", "MET-500"], priority: 10 },
  { conditionKey: "hypertension", packSlug: "blood-pressure-care", packName: "Blood Pressure Care Pack", productSkus: ["BP-CUFF", "AMLO-5", "LOS-50"], priority: 10 },
  { conditionKey: "asthma", packSlug: "asthma-care", packName: "Asthma & Respiratory Pack", productSkus: ["SALB-INH", "BUD-INH", "SPACER-1"], priority: 10 },
  { conditionKey: "chronic", packSlug: "nutrition", packName: "Nutrition & Wellness Pack", productSkus: ["MULTI-VIT", "OMEGA-3", "FIBRE-SUP"], priority: 5 },
  { conditionKey: "acute", packSlug: "cold-flu", packName: "Cold & Flu Pack", productSkus: ["PARA-500", "CET-10", "THROAT-LOZ"], priority: 8 },
  { conditionKey: "family", packSlug: "family-first-aid", packName: "Family First Aid Pack", productSkus: ["FA-KIT-M", "BAND-AID", "ANTISEPT"], priority: 7 },
  { conditionKey: "wellness", packSlug: "immunity", packName: "Immunity Boost Pack", productSkus: ["VIT-C-1G", "ZINC-15", "ECHIN"], priority: 6 },
  { conditionKey: "monitoring", packSlug: "diabetes-monitor", packName: "Diabetes Monitoring Pack", productSkus: ["GLUCO-METER", "DM-STRIP-50", "DM-LANCET"], priority: 9 },
]

@Injectable()
export class CarePackMappingService {
  constructor(
    @Inject(CrmService) private readonly crm: CrmService,
    @Optional() @Inject(CarePackAssemblyService) private readonly assembly?: CarePackAssemblyService,
  ) {}

  async ensureDefaults(): Promise<void> {
    const rows = await db.select({ id: carePackMappings.id }).from(carePackMappings).limit(1)
    if (rows.length > 0) return
    const now = new Date()
    for (const m of DEFAULT_MAPPINGS) {
      await db.insert(carePackMappings).values({
        id: newId("cpm"),
        conditionKey: m.conditionKey,
        packSlug: m.packSlug,
        packName: m.packName,
        productSkus: m.productSkus,
        priority: m.priority,
        active: true,
        notes: "Seeded default mapping",
        updatedAt: now,
      })
    }
  }

  async listActive(): Promise<CarePackMapping[]> {
    await this.ensureDefaults()
    return db
      .select()
      .from(carePackMappings)
      .where(eq(carePackMappings.active, true))
      .orderBy(desc(carePackMappings.priority), carePackMappings.conditionKey)
  }

  async listAll(): Promise<CarePackMapping[]> {
    await this.ensureDefaults()
    return db.select().from(carePackMappings).orderBy(desc(carePackMappings.priority))
  }

  resolvePacks(
    mappings: CarePackMapping[],
    conditionKeys: string[],
  ): Array<{ packSlug: string; packName: string; productSkus: string[] }> {
    const keys = new Set(conditionKeys.map((k) => k.trim().toLowerCase()).filter(Boolean))
    const hits = mappings
      .filter((m) => m.active && keys.has(m.conditionKey.toLowerCase()))
      .sort((a, b) => b.priority - a.priority)
    const seen = new Set<string>()
    const out: Array<{ packSlug: string; packName: string; productSkus: string[] }> = []
    for (const m of hits) {
      if (seen.has(m.packSlug)) continue
      seen.add(m.packSlug)
      out.push({
        packSlug: m.packSlug,
        packName: m.packName,
        productSkus: Array.isArray(m.productSkus) ? m.productSkus : [],
      })
    }
    if (out.length === 0 && mappings.length > 0) {
      const fallback = mappings.find((m) => m.conditionKey === "wellness") ?? mappings[0]
      out.push({
        packSlug: fallback.packSlug,
        packName: fallback.packName,
        productSkus: Array.isArray(fallback.productSkus) ? fallback.productSkus : [],
      })
    }
    return out
  }

  async create(input: {
    conditionKey: string
    packSlug: string
    packName: string
    productSkus?: string[]
    priority?: number
    active?: boolean
    notes?: string
  }): Promise<CarePackMapping> {
    const id = newId("cpm")
    const now = new Date()
    await db.insert(carePackMappings).values({
      id,
      conditionKey: input.conditionKey.trim().toLowerCase(),
      packSlug: input.packSlug.trim(),
      packName: input.packName.trim(),
      productSkus: input.productSkus ?? [],
      priority: input.priority ?? 0,
      active: input.active ?? true,
      notes: input.notes ?? null,
      updatedAt: now,
    })
    const row = await db.select().from(carePackMappings).where(eq(carePackMappings.id, id)).limit(1)
    return row[0]!
  }

  async update(
    id: string,
    patch: Partial<{
      conditionKey: string
      packSlug: string
      packName: string
      productSkus: string[]
      priority: number
      active: boolean
      notes: string
    }>,
  ): Promise<CarePackMapping> {
    const existing = await db.select().from(carePackMappings).where(eq(carePackMappings.id, id)).limit(1)
    if (!existing[0]) throw new HttpException("Mapping not found", HttpStatus.NOT_FOUND)
    await db
      .update(carePackMappings)
      .set({
        conditionKey: patch.conditionKey?.trim().toLowerCase() ?? existing[0].conditionKey,
        packSlug: patch.packSlug?.trim() ?? existing[0].packSlug,
        packName: patch.packName?.trim() ?? existing[0].packName,
        productSkus: patch.productSkus ?? existing[0].productSkus,
        priority: patch.priority ?? existing[0].priority,
        active: patch.active ?? existing[0].active,
        notes: patch.notes ?? existing[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(carePackMappings.id, id))
    const row = await db.select().from(carePackMappings).where(eq(carePackMappings.id, id)).limit(1)
    return row[0]!
  }

  async remove(id: string): Promise<void> {
    const r = await db.delete(carePackMappings).where(eq(carePackMappings.id, id)).returning({ id: carePackMappings.id })
    if (!r.length) throw new HttpException("Mapping not found", HttpStatus.NOT_FOUND)
  }

  async recordAssessment(
    sid: string,
    input: {
      conditionKeys: string[]
      recommendedPacks?: Array<{ packSlug: string; packName: string; productSkus: string[] }>
      riskLevel?: string
      source?: string
    },
  ) {
    const mappings = await this.listActive()
    const recommended =
      input.recommendedPacks?.length
        ? input.recommendedPacks
        : this.resolvePacks(mappings, input.conditionKeys)
    const userId = await ensureUserId(sid)
    const id = newId("cpa")
    await db.insert(carePackAssessments).values({
      id,
      sessionId: sid,
      userId,
      conditionKeys: input.conditionKeys,
      recommendedPacks: recommended,
      riskLevel: input.riskLevel ?? null,
      source: input.source ?? "web_assessment",
      createdAt: new Date(),
    })
    const channelKey = sid.startsWith("wa:") ? sid : `usr:${userId}`
    void this.crm.recordEvent(channelKey, "assessment_completed", {
      userId,
      source: input.source ?? "web_assessment",
      metadata: { conditionKeys: input.conditionKeys, packs: recommended.map((p) => p.packSlug) },
    })
    if (recommended.length > 0) {
      void this.assembly?.createFromAssessment(id).catch(() => undefined)
    }
    return { id, recommendedPacks: recommended, userId }
  }
}

type DrugAgg = { name: string; quantity: number; rxCount: number }
type SkuAgg = { sku: string; quantity: number; sources: Set<string> }

@Injectable()
export class DemandAggregationService {
  constructor(@Inject(CarePackMappingService) private readonly packs: CarePackMappingService) {}

  async aggregate(windowDays = 30) {
    const days = Math.min(365, Math.max(7, Number(windowDays) || 30))
    const since = new Date(Date.now() - days * 86400000)

    const rxRows = await db
      .select({
        id: prescriptions.id,
        status: prescriptions.status,
        extractedDrugs: prescriptions.extractedDrugs,
        submittedAt: prescriptions.submittedAt,
      })
      .from(prescriptions)
      .where(
        and(
          gte(prescriptions.submittedAt, since),
          inArray(prescriptions.status, ["verified", "accepted", "dispensed"]),
        ),
      )

    const rxIds = rxRows.map((r) => r.id)
    const pricedDrugs =
      rxIds.length > 0
        ? await db
            .select({
              prescriptionId: prescriptionDrugs.prescriptionId,
              name: prescriptionDrugs.name,
              quantity: prescriptionDrugs.quantity,
            })
            .from(prescriptionDrugs)
            .where(inArray(prescriptionDrugs.prescriptionId, rxIds))
        : []

    const assessmentRows = await db
      .select()
      .from(carePackAssessments)
      .where(gte(carePackAssessments.createdAt, since))
      .orderBy(desc(carePackAssessments.createdAt))

    const mappings = await this.packs.listActive()
    const slugToName = Object.fromEntries(mappings.map((m) => [m.packSlug, m.packName]))

    const byDrug = new Map<string, DrugAgg>()
    const bySku = new Map<string, SkuAgg>()
    const byPackSlug = new Map<string, { assessments: number; skus: Map<string, number> }>()

    const drugsByRx = new Map<string, typeof pricedDrugs>()
    for (const d of pricedDrugs) {
      const list = drugsByRx.get(d.prescriptionId) ?? []
      list.push(d)
      drugsByRx.set(d.prescriptionId, list)
    }

    for (const rx of rxRows) {
      const priced = drugsByRx.get(rx.id) ?? []
      const drugs =
        priced.length > 0
          ? priced
          : ((rx.extractedDrugs ?? []) as Array<{ name?: string; quantity?: number }>)
      for (const d of drugs) {
        const name = String(d.name ?? "").trim()
        if (!name) continue
        const key = name.toLowerCase()
        const qty = typeof d.quantity === "number" && d.quantity > 0 ? d.quantity : 1
        const cur = byDrug.get(key) ?? { name, quantity: 0, rxCount: 0 }
        cur.quantity += qty
        cur.rxCount += 1
        byDrug.set(key, cur)
      }
    }

    for (const a of assessmentRows) {
      for (const pack of a.recommendedPacks ?? []) {
        const slug = pack.packSlug
        const slot = byPackSlug.get(slug) ?? { assessments: 0, skus: new Map() }
        slot.assessments += 1
        for (const sku of pack.productSkus ?? []) {
          const s = String(sku).trim()
          if (!s) continue
          slot.skus.set(s, (slot.skus.get(s) ?? 0) + 1)
          const agg = bySku.get(s) ?? { sku: s, quantity: 0, sources: new Set<string>() }
          agg.quantity += 1
          agg.sources.add("assessment")
          bySku.set(s, agg)
        }
        byPackSlug.set(slug, slot)
      }
    }

    const byDrugList = [...byDrug.values()].sort((a, b) => b.quantity - a.quantity)
    const bySkuList = [...bySku.values()]
      .map((r) => ({
        sku: r.sku,
        quantity: r.quantity,
        sources: [...r.sources],
      }))
      .sort((a, b) => b.quantity - a.quantity)

    const byPackList = [...byPackSlug.entries()]
      .map(([packSlug, v]) => ({
        packSlug,
        packName: slugToName[packSlug] ?? packSlug,
        assessments: v.assessments,
        skus: Object.fromEntries([...v.skus.entries()].sort((a, b) => b[1] - a[1])),
      }))
      .sort((a, b) => b.assessments - a.assessments)

    const procurementHints = bySkuList.slice(0, 25).map((row) => ({
      sku: row.sku,
      suggestedQty: row.quantity,
      reason:
        row.sources.includes("prescription") && row.sources.includes("assessment")
          ? "Rx fulfilment + care pack assessments"
          : row.sources.includes("prescription")
            ? "Verified/accepted prescriptions"
            : "Care pack assessment demand",
    }))

    return {
      windowDays: days,
      generatedAt: new Date().toISOString(),
      summary: {
        prescriptionCount: rxRows.length,
        assessmentCount: assessmentRows.length,
        uniqueDrugs: byDrugList.length,
        uniqueSkus: bySkuList.length,
        carePackSlugs: byPackList.length,
      },
      byDrug: byDrugList.slice(0, 50),
      bySku: bySkuList,
      byPackSlug: byPackList,
      procurementHints,
    }
  }
}

@Injectable()
export class ProcurementService {
  constructor(
    @Inject(DemandAggregationService) private readonly demand: DemandAggregationService,
    @Inject(SourcingRequestsService) private readonly sourcing: SourcingRequestsService,
  ) {}

  async list(opts?: { status?: string }): Promise<ProcurementDecision[]> {
    const status = (opts?.status ?? "").trim()
    if (status) {
      return db
        .select()
        .from(procurementDecisions)
        .where(eq(procurementDecisions.status, status))
        .orderBy(desc(procurementDecisions.updatedAt))
    }
    return db.select().from(procurementDecisions).orderBy(desc(procurementDecisions.updatedAt))
  }

  async get(id: string): Promise<ProcurementDecision> {
    const row = await db.select().from(procurementDecisions).where(eq(procurementDecisions.id, id)).limit(1)
    if (!row[0]) throw new HttpException("Procurement decision not found", HttpStatus.NOT_FOUND)
    return row[0]
  }

  async generateFromDemand(
    windowDays = 30,
    inventory: InventoryInput[] = [],
  ): Promise<{ created: number; updated: number }> {
    const agg = await this.demand.aggregate(windowDays)
    const invBySku = new Map(inventory.map((i) => [i.sku, i]))
    const now = new Date()
    let created = 0
    let updated = 0

    for (const hint of agg.procurementHints) {
      const sku = hint.sku.trim()
      if (!sku) continue
      const inv = invBySku.get(sku)
      const productName = inv?.productName?.trim() || sku
      const existing = await db
        .select()
        .from(procurementDecisions)
        .where(and(eq(procurementDecisions.sku, sku), eq(procurementDecisions.status, "pending")))
        .limit(1)

      const sources = agg.bySku.find((r) => r.sku === sku)?.sources ?? []
      const priority = priorityFromQty(hint.suggestedQty)

      if (existing[0]) {
        if (hint.suggestedQty > existing[0].suggestedQty) {
          await db
            .update(procurementDecisions)
            .set({
              suggestedQty: hint.suggestedQty,
              productName: productName || existing[0].productName,
              priority,
              reason: hint.reason,
              demandSources: sources,
              demandWindowDays: windowDays,
              updatedAt: now,
            })
            .where(eq(procurementDecisions.id, existing[0].id))
          updated++
        }
        continue
      }

      await db.insert(procurementDecisions).values({
        id: newId("prd"),
        sku,
        productName,
        suggestedQty: hint.suggestedQty,
        priority,
        reason: hint.reason,
        demandSources: sources,
        status: "pending",
        demandWindowDays: windowDays,
        createdAt: now,
        updatedAt: now,
      })
      created++
    }

    return { created, updated }
  }

  async patch(
    id: string,
    patch: {
      status?: string
      suggestedQty?: number
      priority?: string
      notes?: string
      productName?: string
      decidedBy?: string
    },
  ): Promise<ProcurementDecision> {
    const cur = await this.get(id)
    const now = new Date()
    const status = patch.status ?? cur.status
    const decidedAt =
      patch.status && ["approved", "rejected", "ordered"].includes(patch.status) ? now : cur.decidedAt

    await db
      .update(procurementDecisions)
      .set({
        status,
        suggestedQty: patch.suggestedQty ?? cur.suggestedQty,
        priority: patch.priority ?? cur.priority,
        notes: patch.notes ?? cur.notes,
        productName: patch.productName?.trim() || cur.productName,
        decidedBy: patch.decidedBy ?? cur.decidedBy,
        decidedAt: decidedAt ?? cur.decidedAt,
        updatedAt: now,
      })
      .where(eq(procurementDecisions.id, id))
    return this.get(id)
  }

  async listSuggestions(decisionId: string): Promise<SupplierSuggestion[]> {
    await this.get(decisionId)
    return db
      .select()
      .from(supplierSuggestions)
      .where(eq(supplierSuggestions.procurementDecisionId, decisionId))
      .orderBy(supplierSuggestions.rank)
  }

  async suggestSuppliers(
    decisionId: string,
    input: {
      suppliers: SupplierInput[]
      quotes?: QuoteInput[]
      inventory?: InventoryInput[]
    },
  ): Promise<SupplierSuggestion[]> {
    const decision = await this.get(decisionId)
    if (decision.status === "rejected") {
      throw new HttpException("Cannot suggest suppliers for a rejected decision", HttpStatus.BAD_REQUEST)
    }
    if (decision.status === "pending") {
      throw new HttpException(
        "Approve the procurement decision before running supplier suggestions",
        HttpStatus.BAD_REQUEST,
      )
    }
    if (decision.status === "ordered") {
      throw new HttpException("Supplier already selected for this line", HttpStatus.BAD_REQUEST)
    }

    const inv = input.inventory?.find((i) => i.sku === decision.sku)
    const scored = scoreSuppliersForSku(
      decision.sku,
      decision.suggestedQty,
      input.suppliers ?? [],
      input.quotes ?? [],
      inv,
    )

    await db
      .delete(supplierSuggestions)
      .where(eq(supplierSuggestions.procurementDecisionId, decisionId))

    const now = new Date()
    for (const row of scored) {
      await db.insert(supplierSuggestions).values({
        id: newId("sug"),
        procurementDecisionId: decisionId,
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        rank: row.rank,
        score: row.score,
        unitCostEstimate: row.unitCostEstimate,
        currency: row.currency,
        moq: row.moq,
        leadTimeDays: row.leadTimeDays,
        rationale: row.rationale,
        status: "suggested",
        createdAt: now,
      })
    }

    return this.listSuggestions(decisionId)
  }

  async selectSupplier(
    decisionId: string,
    suggestionId: string,
    decidedBy?: string,
    inventory: InventoryInput[] = [],
  ): Promise<{
    decision: ProcurementDecision
    suggestion: SupplierSuggestion
    sourcingRequest: { id: string; sku: string; status: string }
  }> {
    const decision = await this.get(decisionId)
    const suggestions = await this.listSuggestions(decisionId)
    const pick = suggestions.find((s) => s.id === suggestionId)
    if (!pick) throw new HttpException("Suggestion not found", HttpStatus.NOT_FOUND)

    const inv = inventory?.find((i) => i.sku === decision.sku)
    const { sourcingRequest } = await this.sourcing.createFromProcurement({
      procurementDecisionId: decisionId,
      sku: decision.sku,
      productName: decision.productName,
      quantityNeeded: decision.suggestedQty,
      urgency: decision.priority,
      supplierId: pick.supplierId,
      supplierName: pick.supplierName,
      unitPrice: pick.unitCostEstimate,
      leadTimeDays: pick.leadTimeDays,
      notes: decision.reason ?? undefined,
      currentStock: inv?.onHand ?? 0,
      reorderPoint: inv?.safetyStock ?? 0,
    })

    const now = new Date()
    for (const s of suggestions) {
      await db
        .update(supplierSuggestions)
        .set({ status: s.id === suggestionId ? "selected" : "rejected" })
        .where(eq(supplierSuggestions.id, s.id))
    }

    await db
      .update(procurementDecisions)
      .set({
        status: "ordered",
        selectedSupplierId: pick.supplierId,
        selectedSupplierName: pick.supplierName,
        sourcingRequestId: sourcingRequest.id,
        decidedBy: decidedBy ?? decision.decidedBy,
        decidedAt: now,
        updatedAt: now,
      })
      .where(eq(procurementDecisions.id, decisionId))

    const updated = await this.listSuggestions(decisionId)
    const suggestion = updated.find((s) => s.id === suggestionId)!
    return {
      decision: await this.get(decisionId),
      suggestion,
      sourcingRequest: {
        id: sourcingRequest.id,
        sku: sourcingRequest.sku,
        status: sourcingRequest.status,
      },
    }
  }

  async summary() {
    const rows = await db
      .select({
        status: procurementDecisions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(procurementDecisions)
      .groupBy(procurementDecisions.status)
    const counts = Object.fromEntries(rows.map((r) => [r.status, r.count])) as Record<string, number>
    return {
      pending: counts.pending ?? 0,
      approved: counts.approved ?? 0,
      ordered: counts.ordered ?? 0,
      rejected: counts.rejected ?? 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/procurement")
class ProcurementAdminController {
  constructor(@Inject(ProcurementService) private readonly procurement: ProcurementService) {}

  @Get("summary")
  @RequirePerm("sourcing.view")
  summary() {
    return this.procurement.summary()
  }

  @Get("decisions")
  @RequirePerm("sourcing.view")
  list(@Query("status") status?: string) {
    return this.procurement.list({ status })
  }

  @Get("decisions/:id")
  @RequirePerm("sourcing.view")
  get(@Param("id") id: string) {
    return this.procurement.get(id)
  }

  @Post("generate")
  @RequirePerm("sourcing.manage")
  generate(@Body() body: Record<string, unknown>) {
    const windowDays = Number(body.windowDays) || 30
    const inventory = Array.isArray(body.inventory)
      ? (body.inventory as Array<InventoryInput & { productName?: string }>)
      : []
    return this.procurement.generateFromDemand(windowDays, inventory)
  }

  @Patch("decisions/:id")
  @RequirePerm("sourcing.manage")
  patch(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.procurement.patch(id, {
      status: typeof body.status === "string" ? body.status : undefined,
      suggestedQty: body.suggestedQty != null ? Number(body.suggestedQty) : undefined,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      productName: typeof body.productName === "string" ? body.productName : undefined,
      decidedBy: typeof body.decidedBy === "string" ? body.decidedBy : undefined,
    })
  }

  @Get("decisions/:id/suggestions")
  @RequirePerm("sourcing.view")
  suggestions(@Param("id") id: string) {
    return this.procurement.listSuggestions(id)
  }

  @Post("decisions/:id/suggest")
  @RequirePerm("sourcing.manage")
  suggest(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.procurement.suggestSuppliers(id, {
      suppliers: Array.isArray(body.suppliers) ? (body.suppliers as SupplierInput[]) : [],
      quotes: Array.isArray(body.quotes) ? (body.quotes as QuoteInput[]) : [],
      inventory: Array.isArray(body.inventory) ? (body.inventory as InventoryInput[]) : [],
    })
  }

  @Post("decisions/:id/select-supplier")
  @RequirePerm("sourcing.manage")
  select(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { adminEmail?: string },
  ) {
    const suggestionId = String(body.suggestionId ?? "")
    if (!suggestionId) throw new HttpException("suggestionId required", HttpStatus.BAD_REQUEST)
    const inventory = Array.isArray(body.inventory)
      ? (body.inventory as InventoryInput[])
      : []
    return this.procurement.selectSupplier(id, suggestionId, req.adminEmail, inventory)
  }
}

@Controller("care-packs")
class CarePacksPublicController {
  constructor(@Inject(CarePackMappingService) private readonly svc: CarePackMappingService) {}

  @Get("mappings")
  async mappings() {
    const rows = await this.svc.listActive()
    return {
      mappings: rows.map((m) => ({
        conditionKey: m.conditionKey,
        packSlug: m.packSlug,
        packName: m.packName,
        productSkus: m.productSkus,
        priority: m.priority,
      })),
    }
  }

  @Post("assessments")
  async assess(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    const conditionKeys = Array.isArray(body.conditionKeys)
      ? (body.conditionKeys as unknown[]).map(String)
      : []
    if (conditionKeys.length === 0) {
      throw new HttpException("conditionKeys required", HttpStatus.BAD_REQUEST)
    }
    const result = await this.svc.recordAssessment(sid, {
      conditionKeys,
      recommendedPacks: Array.isArray(body.recommendedPacks)
        ? (body.recommendedPacks as Array<{ packSlug: string; packName: string; productSkus: string[] }>)
        : undefined,
      riskLevel: typeof body.riskLevel === "string" ? body.riskLevel : undefined,
      source: typeof body.source === "string" ? body.source : "web_assessment",
    })
    return { ok: true, ...result }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/care-pack-mappings")
class CarePackMappingsAdminController {
  constructor(@Inject(CarePackMappingService) private readonly svc: CarePackMappingService) {}

  @Get()
  @RequirePerm("sourcing.view")
  list() {
    return this.svc.listAll()
  }

  @Post()
  @RequirePerm("sourcing.manage")
  create(@Body() body: Record<string, unknown>) {
    if (!body.conditionKey || !body.packSlug || !body.packName) {
      throw new HttpException("conditionKey, packSlug, packName required", HttpStatus.BAD_REQUEST)
    }
    return this.svc.create({
      conditionKey: String(body.conditionKey),
      packSlug: String(body.packSlug),
      packName: String(body.packName),
      productSkus: Array.isArray(body.productSkus) ? body.productSkus.map(String) : [],
      priority: Number(body.priority) || 0,
      active: body.active !== false,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    })
  }

  @Patch(":id")
  @RequirePerm("sourcing.manage")
  patch(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.update(id, {
      conditionKey: body.conditionKey != null ? String(body.conditionKey) : undefined,
      packSlug: body.packSlug != null ? String(body.packSlug) : undefined,
      packName: body.packName != null ? String(body.packName) : undefined,
      productSkus: Array.isArray(body.productSkus) ? body.productSkus.map(String) : undefined,
      priority: body.priority != null ? Number(body.priority) : undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    })
  }

  @Delete(":id")
  @RequirePerm("sourcing.manage")
  async remove(@Param("id") id: string) {
    await this.svc.remove(id)
    return { ok: true }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/demand")
class DemandAdminController {
  constructor(@Inject(DemandAggregationService) private readonly demand: DemandAggregationService) {}

  @Get("aggregation")
  @RequirePerm("sourcing.view")
  aggregation(@Query("windowDays") windowDays?: string) {
    return this.demand.aggregate(Number(windowDays) || 30)
  }
}

@Module({
  imports: [CrmModule, SourcingModule, OperationsFulfillmentModule],
  controllers: [
    CarePacksPublicController,
    CarePackMappingsAdminController,
    DemandAdminController,
    ProcurementAdminController,
  ],
  providers: [CarePackMappingService, DemandAggregationService, ProcurementService],
  exports: [CarePackMappingService, DemandAggregationService, ProcurementService],
})
export class OperationsModule {}

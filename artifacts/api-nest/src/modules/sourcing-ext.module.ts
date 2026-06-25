/**
 * Sourcing pricing, automation rules, and supplier performance (Stage 4).
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
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common"
import { and, desc, eq, isNull, lt } from "drizzle-orm"
import {
  db,
  partnerDirectory,
  partnerQuotes,
  purchaseOrderLines,
  purchaseOrders,
  sourcingAutomationLog,
  sourcingAutomationRules,
  sourcingCompetitorPrices,
  sourcingPriceHistory,
  sourcingSupplierScoreOverrides,
} from "@workspace/db"
import { newId } from "../common/repository"
import { listSourcingInventory } from "../common/sourcing-inventory"
import { scoreSuppliersForSku, type SupplierInput } from "../common/supplier-scoring"
import { buildDemandForecast } from "../common/demand-forecast"
import { buildWeeklySkuOrderSeries, enhanceForecastEntries } from "../common/demand-forecast-enhanced"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { SourcingModule, SourcingRequestsService } from "./sourcing.module"
import { SupplierPurchaseOrdersModule, SupplierPurchaseOrdersService } from "./supplier-purchase-orders.module"
import { OperationsModule, DemandAggregationService } from "./operations.module"
import { CatalogModule, CatalogService } from "./catalog.module"

const DEFAULT_RULES = [
  {
    id: "rule_low_stock",
    name: "Auto-source items below safety stock",
    trigger: "low_stock",
    isActive: true,
    conditions: { onHandRatio: 1.0 },
    action: "create_request",
    defaultPriority: "high",
    shortfallThreshold: 1,
    autoDraftPo: false,
  },
  {
    id: "rule_forecast_shortfall",
    name: "Forecast shortfall → draft PO",
    trigger: "forecast_shortfall",
    isActive: false,
    conditions: {},
    action: "create_request",
    defaultPriority: "normal",
    shortfallThreshold: 10,
    autoDraftPo: true,
  },
] as const

function priceHistoryDto(row: typeof sourcingPriceHistory.$inferSelect) {
  return {
    id: row.id,
    sku: row.sku,
    productName: row.productName ?? "",
    supplierId: row.supplierId,
    unitCost: row.unitCost,
    currency: row.currency,
    source: row.source as "quote" | "po" | "manual",
    capturedAt: row.capturedAt.toISOString(),
  }
}

function competitorDto(row: typeof sourcingCompetitorPrices.$inferSelect) {
  return {
    id: row.id,
    sku: row.sku,
    productName: row.productName,
    competitor: row.competitor,
    unitPrice: row.unitPrice,
    currency: row.currency,
    url: row.url ?? "",
    capturedAt: row.capturedAt.toISOString(),
  }
}

function ruleDto(row: typeof sourcingAutomationRules.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    isActive: row.isActive,
    conditions: (row.conditions ?? {}) as Record<string, unknown>,
    action: row.action as "create_request" | "create_rfq",
    defaultPriority: row.defaultPriority as "low" | "normal" | "high" | "urgent",
    defaultQty: row.defaultQty ?? undefined,
    shortfallThreshold: row.shortfallThreshold,
    autoDraftPo: row.autoDraftPo,
    createdAt: row.createdAt.toISOString(),
    lastRunAt: row.lastRunAt?.toISOString(),
    lastRunSummary: row.lastRunSummary ?? undefined,
  }
}

function logDto(row: typeof sourcingAutomationLog.$inferSelect) {
  return {
    id: row.id,
    ruleId: row.ruleId,
    ruleName: row.ruleName,
    ranAt: row.ranAt.toISOString(),
    matched: row.matched,
    created: row.created,
    details: row.details ?? [],
  }
}

function supplierFromPayload(id: string, payload: Record<string, unknown>): SupplierInput & {
  name: string
  country?: string
} {
  const tier = String(payload.tier ?? "trial") as SupplierInput["tier"]
  const verification = String(payload.verification ?? "pending")
  return {
    id,
    name: String(payload.name ?? payload.displayName ?? id),
    tier: ["preferred", "approved", "trial", "blocked"].includes(tier) ? tier : "trial",
    verification: ["verified", "pending", "unverified"].includes(verification)
      ? (verification as SupplierInput["verification"])
      : "pending",
    leadTimeDays: Number(payload.leadTimeDays) || 7,
    moq: Number(payload.moq) || 1,
    rating: Number(payload.rating) || 0,
    categories: Array.isArray(payload.categories) ? payload.categories.map(String) : [],
    country: typeof payload.country === "string" ? payload.country : undefined,
  }
}

@Injectable()
export class SourcingPricingService {
  async listPriceHistory() {
    const rows = await db.select().from(sourcingPriceHistory).orderBy(desc(sourcingPriceHistory.capturedAt))
    return rows.map(priceHistoryDto)
  }

  async addPriceHistory(body: Record<string, unknown>) {
    const sku = String(body.sku ?? "").trim()
    const supplierId = String(body.supplierId ?? "").trim()
    if (!sku || !supplierId) {
      throw new HttpException("sku and supplierId required", HttpStatus.BAD_REQUEST)
    }
    const [row] = await db
      .insert(sourcingPriceHistory)
      .values({
        id: newId("ph"),
        sku,
        productName: typeof body.productName === "string" ? body.productName : null,
        supplierId,
        unitCost: Number(body.unitCost) || 0,
        currency: String(body.currency ?? "KES"),
        source: String(body.source ?? "manual"),
        capturedAt: new Date(),
      })
      .returning()
    return priceHistoryDto(row!)
  }

  async removePriceHistory(id: string) {
    await db.delete(sourcingPriceHistory).where(eq(sourcingPriceHistory.id, id))
    return { ok: true as const }
  }

  async listCompetitors() {
    const rows = await db.select().from(sourcingCompetitorPrices).orderBy(desc(sourcingCompetitorPrices.capturedAt))
    return rows.map(competitorDto)
  }

  async addCompetitor(body: Record<string, unknown>) {
    const sku = String(body.sku ?? "").trim()
    const productName = String(body.productName ?? "").trim()
    const competitor = String(body.competitor ?? "").trim()
    if (!sku || !productName || !competitor) {
      throw new HttpException("sku, productName, competitor required", HttpStatus.BAD_REQUEST)
    }
    const [row] = await db
      .insert(sourcingCompetitorPrices)
      .values({
        id: newId("cp"),
        sku,
        productName,
        competitor,
        unitPrice: Number(body.unitPrice) || 0,
        currency: String(body.currency ?? "KES"),
        url: typeof body.url === "string" ? body.url : null,
        capturedAt: new Date(),
      })
      .returning()
    return competitorDto(row!)
  }

  async removeCompetitor(id: string) {
    await db.delete(sourcingCompetitorPrices).where(eq(sourcingCompetitorPrices.id, id))
    return { ok: true as const }
  }

  /** Flags competitor rows older than N days — cron can call this weekly. */
  async staleCompetitorReport(maxAgeDays = 30) {
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000)
    const rows = await db
      .select()
      .from(sourcingCompetitorPrices)
      .where(lt(sourcingCompetitorPrices.capturedAt, cutoff))
    return {
      staleCount: rows.length,
      stale: rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        competitor: r.competitor,
        capturedAt: r.capturedAt.toISOString(),
        daysOld: Math.floor((Date.now() - r.capturedAt.getTime()) / 86400000),
      })),
    }
  }
}

@Injectable()
export class SourcingAutomationDbService {
  constructor(
    @Inject(SourcingRequestsService) private readonly requests: SourcingRequestsService,
    @Inject(SupplierPurchaseOrdersService) private readonly pos: SupplierPurchaseOrdersService,
    @Inject(DemandAggregationService) private readonly demand: DemandAggregationService,
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  async listRules() {
    let rows = await db.select().from(sourcingAutomationRules).orderBy(sourcingAutomationRules.createdAt)
    if (rows.length === 0) {
      const now = new Date()
      await db.insert(sourcingAutomationRules).values(
        DEFAULT_RULES.map((r) => ({
          ...r,
          conditions: r.conditions as Record<string, unknown>,
          defaultQty: null,
          createdAt: now,
        })),
      )
      rows = await db.select().from(sourcingAutomationRules).orderBy(sourcingAutomationRules.createdAt)
    }
    return rows.map(ruleDto)
  }

  async replaceRules(rules: Record<string, unknown>[]) {
    await db.delete(sourcingAutomationRules)
    const now = new Date()
    if (rules.length > 0) {
      await db.insert(sourcingAutomationRules).values(
        rules.map((r) => ({
          id: String(r.id ?? newId("rule")),
          name: String(r.name ?? "Rule"),
          trigger: String(r.trigger ?? "low_stock"),
          isActive: r.isActive !== false,
          conditions: (r.conditions ?? {}) as Record<string, unknown>,
          action: String(r.action ?? "create_request"),
          defaultPriority: String(r.defaultPriority ?? "normal"),
          defaultQty: r.defaultQty != null ? Math.round(Number(r.defaultQty)) : null,
          shortfallThreshold: Math.max(1, Math.round(Number(r.shortfallThreshold) || 1)),
          autoDraftPo: Boolean(r.autoDraftPo),
          createdAt: now,
          lastRunAt: r.lastRunAt ? new Date(String(r.lastRunAt)) : null,
          lastRunSummary: typeof r.lastRunSummary === "string" ? r.lastRunSummary : null,
        })),
      )
    }
    return this.listRules()
  }

  async listLog(limit = 50) {
    const rows = await db
      .select()
      .from(sourcingAutomationLog)
      .orderBy(desc(sourcingAutomationLog.ranAt))
      .limit(Math.min(100, Math.max(1, limit)))
    return rows.map(logDto)
  }

  async clearLog() {
    await db.delete(sourcingAutomationLog)
    return { ok: true as const }
  }

  async runInventoryScan() {
    const rules = (await this.listRules()).filter((r) => r.isActive && r.trigger !== "forecast_shortfall")
    const inventory = await listSourcingInventory()
    const requestRows = await this.requests.list()
    const openSkus = new Set(
      requestRows
        .filter((r) => ["open", "draft", "quoting"].includes(r.status))
        .map((r) => r.sku),
    )
    let requestsCreated = 0
    const flagged: Array<{ sku: string; productName: string; reason: string }> = []
    const details: string[] = []

    for (const item of inventory) {
      if (openSkus.has(item.sku)) continue
      for (const rule of rules) {
        let triggered = false
        let reason = ""
        if (rule.trigger === "low_stock") {
          const ratio = item.safetyStock > 0 ? item.onHand / item.safetyStock : 1
          const threshold = Number(rule.conditions.onHandRatio ?? 1)
          if (item.onHand <= item.reorderPoint || ratio <= threshold) {
            triggered = true
            reason = `On hand ${item.onHand} ≤ reorder ${item.reorderPoint}`
          }
        } else if (rule.trigger === "expiry_soon" && item.batchExpiry) {
          const days = Math.ceil((new Date(item.batchExpiry).getTime() - Date.now()) / 86400000)
          const window = Number(rule.conditions.expiryWindowDays ?? 60)
          if (days <= window) {
            triggered = true
            reason = `Batch expires in ${days} day(s)`
          }
        }
        const types = rule.conditions.types as string[] | undefined
        if (triggered && (!types?.length || types.includes(item.type ?? ""))) {
          flagged.push({ sku: item.sku, productName: item.productName, reason })
          const qty = rule.defaultQty ?? Math.max(item.reorderPoint * 2 - item.onHand, item.safetyStock)
          await this.requests.createOpenRequest({
            sku: item.sku,
            productName: item.productName,
            quantityNeeded: qty,
            urgency: rule.defaultPriority,
            notes: `Auto-generated by rule "${rule.name}" — ${reason}`,
            currentStock: item.onHand,
            reorderPoint: item.reorderPoint,
          })
          requestsCreated++
          openSkus.add(item.sku)
          details.push(`Created request for ${item.sku} qty ${qty}`)
          await db
            .update(sourcingAutomationRules)
            .set({
              lastRunAt: new Date(),
              lastRunSummary: `${requestsCreated} request(s) from scan`,
            })
            .where(eq(sourcingAutomationRules.id, rule.id))
          break
        }
      }
    }

    if (rules.length > 0) {
      await db.insert(sourcingAutomationLog).values({
        id: newId("alog"),
        ruleId: "scan",
        ruleName: "Inventory scan",
        ranAt: new Date(),
        matched: flagged.length,
        created: requestsCreated,
        details: details.length ? details : ["No items matched."],
      })
    }

    return { rulesEvaluated: rules.length, requestsCreated, flagged }
  }

  async runForecastShortfall(windowDays = 30) {
    const rules = (await this.listRules()).filter(
      (r) => r.isActive && r.trigger === "forecast_shortfall",
    )
    if (rules.length === 0) {
      return { rulesEvaluated: 0, requestsCreated: 0, posCreated: 0, flagged: [] as Array<{ sku: string; productName: string; reason: string }> }
    }

    const agg = await this.demand.aggregate(windowDays)
    const forecast = await buildDemandForecast({ bySku: agg.bySku }, this.catalog, windowDays)
    const inventory = await listSourcingInventory()
    const invBySku = new Map(inventory.map((i) => [i.sku, i]))
    const suppliers = await this.loadSuppliers()
    const quoteRows = await db.select().from(partnerQuotes)
    const quotes = quoteRows.map((q) => ({
      supplierId: q.supplierId,
      unitCost: q.unitPrice,
    }))

    let requestsCreated = 0
    let posCreated = 0
    const flagged: Array<{ sku: string; productName: string; reason: string }> = []
    const details: string[] = []
    const rule = rules[0]!

    for (const entry of forecast.entries) {
      const inv = invBySku.get(entry.sku)
      const onHand = inv?.onHand ?? 0
      const safety = inv?.safetyStock ?? 0
      const suggested = Math.max(0, entry.projectedDemand + safety - onHand)
      if (suggested < rule.shortfallThreshold) continue

      flagged.push({
        sku: entry.sku,
        productName: entry.productName,
        reason: `Forecast shortfall ${suggested} (projected ${entry.projectedDemand}/${entry.windowDays}d)`,
      })

      if (rule.autoDraftPo && suppliers.length > 0) {
        const ranked = scoreSuppliersForSku(entry.sku, suggested, suppliers, quotes, inv)
        const top = ranked[0]
        if (top) {
          await this.pos.create(
            {
              supplierId: top.supplierId,
              status: "draft",
              notes: `Auto draft from forecast rule "${rule.name}" — ${entry.productName}`,
              items: [
                {
                  name: entry.productName,
                  qty: suggested,
                  unitPrice: top.unitCostEstimate ?? inv?.unitCost ?? 0,
                },
              ],
            },
            "automation",
          )
          posCreated++
          details.push(`Draft PO for ${entry.sku} qty ${suggested} → ${top.supplierName}`)
        }
      } else {
        await this.requests.createOpenRequest({
          sku: entry.sku,
          productName: entry.productName,
          quantityNeeded: rule.defaultQty ?? suggested,
          urgency: rule.defaultPriority,
          notes: `Forecast shortfall — projected ${entry.projectedDemand}/${entry.windowDays}d, on-hand ${onHand}`,
          currentStock: onHand,
          reorderPoint: inv?.reorderPoint,
        })
        requestsCreated++
        details.push(`Request for ${entry.sku} qty ${suggested}`)
      }
    }

    await db
      .update(sourcingAutomationRules)
      .set({
        lastRunAt: new Date(),
        lastRunSummary: `${requestsCreated} requests, ${posCreated} draft POs`,
      })
      .where(eq(sourcingAutomationRules.id, rule.id))

    await db.insert(sourcingAutomationLog).values({
      id: newId("alog"),
      ruleId: rule.id,
      ruleName: rule.name,
      ranAt: new Date(),
      matched: flagged.length,
      created: requestsCreated + posCreated,
      details: details.length ? details : ["No forecast shortfalls above threshold."],
    })

    return { rulesEvaluated: rules.length, requestsCreated, posCreated, flagged }
  }

  /** Stage 5.4 — enhanced forecast → supplier scoring → draft/sent POs. */
  async runProcurementPipeline(opts: {
    windowDays?: number
    autoApprove?: boolean
    shortfallThreshold?: number
  }) {
    const windowDays = opts.windowDays ?? 30
    const threshold = opts.shortfallThreshold ?? 1
    const agg = await this.demand.aggregate(windowDays)
    const baseline = await buildDemandForecast(agg, this.catalog, windowDays)
    const series = await buildWeeklySkuOrderSeries(this.catalog, windowDays)
    const { entries, model } = enhanceForecastEntries(baseline.entries, series)

    const inventory = await listSourcingInventory()
    const invBySku = new Map(inventory.map((i) => [i.sku, i]))
    const suppliers = await this.loadSuppliers()
    const quoteRows = await db.select().from(partnerQuotes)
    const quotes = quoteRows.map((q) => ({
      supplierId: q.supplierId,
      unitCost: q.unitPrice,
    }))

    let posCreated = 0
    let skipped = 0
    const flagged: Array<{ sku: string; productName: string; reason: string }> = []
    const details: string[] = []
    const createdPos: Array<{ poNumber: string; supplierId: string; sku: string; qty: number }> = []

    for (const entry of entries) {
      const inv = invBySku.get(entry.sku)
      const onHand = inv?.onHand ?? 0
      const safety = inv?.safetyStock ?? 0
      const suggested = Math.max(0, entry.projectedDemand + safety - onHand)
      if (suggested < threshold) continue

      flagged.push({
        sku: entry.sku,
        productName: entry.productName,
        reason: `Pipeline shortfall ${suggested} (${model}, projected ${entry.projectedDemand})`,
      })

      if (suppliers.length === 0) {
        skipped++
        details.push(`No suppliers for ${entry.sku}`)
        continue
      }

      const ranked = scoreSuppliersForSku(entry.sku, suggested, suppliers, quotes, inv)
      const top = ranked[0]
      if (!top) {
        skipped++
        continue
      }

      const po = await this.pos.create(
        {
          supplierId: top.supplierId,
          status: opts.autoApprove ? "sent" : "draft",
          notes: `Procurement pipeline (${model}) — ${entry.productName}`,
          items: [
            {
              name: entry.productName,
              qty: suggested,
              unitPrice: top.unitCostEstimate ?? inv?.unitCost ?? 0,
            },
          ],
        },
        "procurement-pipeline",
      )
      posCreated++
      createdPos.push({
        poNumber: po.poNumber,
        supplierId: top.supplierId,
        sku: entry.sku,
        qty: suggested,
      })
      details.push(
        `${opts.autoApprove ? "Sent" : "Draft"} PO ${po.poNumber} for ${entry.sku} qty ${suggested} → ${top.supplierName}`,
      )
    }

    await db.insert(sourcingAutomationLog).values({
      id: newId("alog"),
      ruleId: "procurement_pipeline",
      ruleName: "Procurement pipeline",
      ranAt: new Date(),
      matched: flagged.length,
      created: posCreated,
      details: details.length ? details : ["No shortfalls above threshold."],
    })

    return {
      model,
      windowDays,
      autoApprove: Boolean(opts.autoApprove),
      shortfallThreshold: threshold,
      flagged,
      posCreated,
      skipped,
      createdPos,
      details,
    }
  }

  private async loadSuppliers(): Promise<SupplierInput[]> {
    const rows = await db
      .select()
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.partnerType, "supplier"), isNull(partnerDirectory.deletedAt)))
    return rows.map((r) => supplierFromPayload(r.id, r.payload ?? {}))
  }
}

@Injectable()
export class SourcingPerformanceService {
  async listScores() {
    const [suppliers, pos, quoteRows, overrides] = await Promise.all([
      db
        .select()
        .from(partnerDirectory)
        .where(and(eq(partnerDirectory.partnerType, "supplier"), isNull(partnerDirectory.deletedAt))),
      db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)),
      db.select().from(partnerQuotes),
      db.select().from(sourcingSupplierScoreOverrides),
    ])

    const linesByPo = new Map<string, Array<typeof purchaseOrderLines.$inferSelect>>()
    const allLines = await db.select().from(purchaseOrderLines)
    for (const line of allLines) {
      const list = linesByPo.get(line.purchaseOrderId) ?? []
      list.push(line)
      linesByPo.set(line.purchaseOrderId, list)
    }

    const allCosts = quoteRows.map((q) => q.unitPrice).filter((c) => c > 0)
    const globalAvgCost = allCosts.length > 0 ? allCosts.reduce((a, b) => a + b, 0) / allCosts.length : 0
    const overrideBySupplier = new Map(overrides.map((o) => [o.supplierId, o]))

    return suppliers
      .map((s) => {
        const meta = supplierFromPayload(s.id, s.payload ?? {})
        const sPos = pos.filter((p) => p.supplierId === s.id)
        const sQuotes = quoteRows.filter((q) => q.supplierId === s.id)
        const receivedPos = sPos.filter((p) => p.status === "received").length
        const considered = sPos.filter((p) =>
          ["received", "dispatched", "sent", "confirmed"].includes(p.status),
        ).length
        const fillRate = considered > 0 ? receivedPos / considered : 0
        const onTimeRate = (() => {
          const recv = sPos.filter((p) => p.status === "received" && p.expectedDate)
          if (recv.length === 0) return 0
          const onTime = recv.filter((p) => p.updatedAt <= (p.expectedDate as Date)).length
          return onTime / recv.length
        })()
        const supCosts = sQuotes.map((q) => q.unitPrice).filter((c) => c > 0)
        const avgUnitCost = supCosts.length > 0 ? supCosts.reduce((a, b) => a + b, 0) / supCosts.length : 0
        const priceIndex = globalAvgCost > 0 && avgUnitCost > 0 ? avgUnitCost / globalAvgCost : 1
        const totalSpend = sPos.reduce((acc, p) => acc + (p.total || 0), 0)
        const ov = overrideBySupplier.get(s.id)
        const qualityScore = ov?.qualityScore ?? 80
        const complaints = ov?.complaints ?? 0
        const fillScore = fillRate * 100
        const onTimeScore = onTimeRate * 100
        const priceScore = priceIndex > 0 ? Math.max(0, Math.min(100, 100 - (priceIndex - 1) * 100)) : 50
        const complaintPenalty = Math.min(20, complaints * 4)
        const composite = Math.round(
          fillScore * 0.3 + onTimeScore * 0.25 + priceScore * 0.25 + qualityScore * 0.2 - complaintPenalty,
        )
        const suggestedTier =
          composite >= 80 ? "preferred" : composite >= 60 ? "approved" : composite >= 40 ? "trial" : "blocked"

        return {
          supplierId: s.id,
          supplierName: meta.name,
          country: meta.country ?? "",
          tier: meta.tier,
          verification: meta.verification,
          totalPos: sPos.length,
          receivedPos,
          fillRate,
          onTimeRate,
          avgUnitCost,
          priceIndex,
          totalSpend,
          qualityScore,
          complaints,
          composite,
          suggestedTier,
          notes: ov?.notes ?? "",
        }
      })
      .sort((a, b) => b.composite - a.composite)
  }

  async upsertOverride(supplierId: string, body: Record<string, unknown>) {
    const id = supplierId.trim()
    if (!id) throw new HttpException("supplierId required", HttpStatus.BAD_REQUEST)
    const now = new Date()
    const [row] = await db
      .insert(sourcingSupplierScoreOverrides)
      .values({
        supplierId: id,
        qualityScore: body.qualityScore != null ? Math.round(Number(body.qualityScore)) : null,
        complaints: Math.max(0, Math.round(Number(body.complaints) || 0)),
        notes: typeof body.notes === "string" ? body.notes : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sourcingSupplierScoreOverrides.supplierId,
        set: {
          qualityScore: body.qualityScore != null ? Math.round(Number(body.qualityScore)) : null,
          complaints: Math.max(0, Math.round(Number(body.complaints) || 0)),
          notes: typeof body.notes === "string" ? body.notes : null,
          updatedAt: now,
        },
      })
      .returning()
    return row!
  }
}

@UseGuards(AdminGuard)
@Controller("admin/sourcing")
class SourcingExtController {
  constructor(
    @Inject(SourcingPricingService) private readonly pricing: SourcingPricingService,
    @Inject(SourcingAutomationDbService) private readonly automation: SourcingAutomationDbService,
    @Inject(SourcingPerformanceService) private readonly performance: SourcingPerformanceService,
  ) {}

  @Get("price-history")
  @RequirePerm("sourcing.view")
  listPriceHistory() {
    return this.pricing.listPriceHistory()
  }

  @Post("price-history")
  @RequirePerm("sourcing.manage")
  addPriceHistory(@Body() body: Record<string, unknown>) {
    return this.pricing.addPriceHistory(body ?? {})
  }

  @Delete("price-history/:id")
  @RequirePerm("sourcing.manage")
  removePriceHistory(@Param("id") id: string) {
    return this.pricing.removePriceHistory(id)
  }

  @Get("competitor-prices")
  @RequirePerm("sourcing.view")
  listCompetitors() {
    return this.pricing.listCompetitors()
  }

  @Post("competitor-prices")
  @RequirePerm("sourcing.manage")
  addCompetitor(@Body() body: Record<string, unknown>) {
    return this.pricing.addCompetitor(body ?? {})
  }

  @Delete("competitor-prices/:id")
  @RequirePerm("sourcing.manage")
  removeCompetitor(@Param("id") id: string) {
    return this.pricing.removeCompetitor(id)
  }

  @Get("competitor-prices/stale")
  @RequirePerm("sourcing.view")
  staleCompetitors(@Query("maxAgeDays") maxAgeDays?: string) {
    return this.pricing.staleCompetitorReport(Math.round(Number(maxAgeDays) || 30))
  }

  @Get("automation/rules")
  @RequirePerm("sourcing.view")
  listRules() {
    return this.automation.listRules()
  }

  @Put("automation/rules")
  @RequirePerm("sourcing.manage")
  replaceRules(@Body() body: Record<string, unknown>[]) {
    return this.automation.replaceRules(Array.isArray(body) ? body : [])
  }

  @Get("automation/log")
  @RequirePerm("sourcing.view")
  listLog(@Query("limit") limit?: string) {
    return this.automation.listLog(Math.round(Number(limit) || 50))
  }

  @Delete("automation/log")
  @RequirePerm("sourcing.manage")
  clearLog() {
    return this.automation.clearLog()
  }

  @Post("automation/run-scan")
  @RequirePerm("sourcing.manage")
  runScan() {
    return this.automation.runInventoryScan()
  }

  @Post("automation/run-forecast")
  @RequirePerm("sourcing.manage")
  runForecast(@Body() body: { windowDays?: number }) {
    return this.automation.runForecastShortfall(body?.windowDays ?? 30)
  }

  @Post("automation/run-procurement-pipeline")
  @RequirePerm("sourcing.manage", "procurement.manage")
  runProcurementPipeline(
    @Body() body: { windowDays?: number; autoApprove?: boolean; shortfallThreshold?: number },
  ) {
    return this.automation.runProcurementPipeline(body ?? {})
  }

  @Get("performance")
  @RequirePerm("sourcing.view")
  listPerformance() {
    return this.performance.listScores()
  }

  @Put("performance/:supplierId/override")
  @RequirePerm("sourcing.manage")
  upsertOverride(@Param("supplierId") supplierId: string, @Body() body: Record<string, unknown>) {
    return this.performance.upsertOverride(supplierId, body ?? {})
  }
}

@Module({
  imports: [SourcingModule, SupplierPurchaseOrdersModule, OperationsModule, CatalogModule],
  controllers: [SourcingExtController],
  providers: [SourcingPricingService, SourcingAutomationDbService, SourcingPerformanceService],
  exports: [SourcingPricingService, SourcingAutomationDbService, SourcingPerformanceService],
})
export class SourcingExtModule {}

/**
 * BL #8 Inventory allocation & BL #9 Care pack assembly.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import {
  db,
  carePackAssessments,
  carePackAssemblyJobs,
  carePackAssemblyLines,
  carePackMappings,
  inventoryAllocations,
  procurementDecisions,
} from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, RequirePerm, AnyAdmin } from "../common/admin-guard"
import {
  canReserveSku,
  computeAvailability,
  type StockLineInput,
} from "../common/inventory-availability"

export type { StockLineInput } from "../common/inventory-availability"

@Injectable()
export class InventoryAllocationService {
  async list(opts?: { status?: string; referenceType?: string; referenceId?: string }) {
    const conditions = []
    if (opts?.status?.trim()) conditions.push(eq(inventoryAllocations.status, opts.status.trim()))
    if (opts?.referenceType?.trim()) {
      conditions.push(eq(inventoryAllocations.referenceType, opts.referenceType.trim()))
    }
    if (opts?.referenceId?.trim()) {
      conditions.push(eq(inventoryAllocations.referenceId, opts.referenceId.trim()))
    }
    if (conditions.length === 0) {
      return db.select().from(inventoryAllocations).orderBy(desc(inventoryAllocations.updatedAt))
    }
    return db
      .select()
      .from(inventoryAllocations)
      .where(and(...conditions))
      .orderBy(desc(inventoryAllocations.updatedAt))
  }

  async reservedBySku(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        sku: inventoryAllocations.sku,
        qty: sql<number>`coalesce(sum(${inventoryAllocations.quantity}), 0)::int`,
      })
      .from(inventoryAllocations)
      .where(eq(inventoryAllocations.status, "reserved"))
      .groupBy(inventoryAllocations.sku)
    return Object.fromEntries(rows.map((r) => [r.sku, r.qty]))
  }

  availability(stock: StockLineInput[], reserved: Record<string, number>) {
    return computeAvailability(stock, reserved)
  }

  async allocate(input: {
    sku: string
    productName: string
    quantity: number
    referenceType: string
    referenceId: string
    location?: string
    notes?: string
    allocatedBy?: string
    stock: StockLineInput[]
  }) {
    const qty = Math.max(1, Math.round(input.quantity))
    const reserved = await this.reservedBySku()
    const check = canReserveSku(input.stock, reserved, input.sku, qty)
    if (!check.ok) {
      throw new HttpException(
        `Insufficient available stock for ${input.sku} (need ${check.need}, available ${check.available})`,
        HttpStatus.CONFLICT,
      )
    }

    const existing = await db
      .select()
      .from(inventoryAllocations)
      .where(
        and(
          eq(inventoryAllocations.sku, input.sku),
          eq(inventoryAllocations.referenceType, input.referenceType),
          eq(inventoryAllocations.referenceId, input.referenceId),
          eq(inventoryAllocations.status, "reserved"),
        ),
      )
      .limit(1)

    const now = new Date()
    if (existing[0]) {
      await db
        .update(inventoryAllocations)
        .set({
          quantity: existing[0].quantity + qty,
          productName: input.productName,
          location: input.location ?? existing[0].location,
          notes: input.notes ?? existing[0].notes,
          updatedAt: now,
        })
        .where(eq(inventoryAllocations.id, existing[0].id))
      const updated = await db
        .select()
        .from(inventoryAllocations)
        .where(eq(inventoryAllocations.id, existing[0].id))
        .limit(1)
      return updated[0]!
    }

    const id = newId("ial")
    await db.insert(inventoryAllocations).values({
      id,
      sku: input.sku,
      productName: input.productName,
      quantity: qty,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      status: "reserved",
      location: input.location ?? null,
      notes: input.notes ?? null,
      allocatedBy: input.allocatedBy ?? null,
      createdAt: now,
      updatedAt: now,
    })
    const created = await db.select().from(inventoryAllocations).where(eq(inventoryAllocations.id, id)).limit(1)
    return created[0]!
  }

  async patchStatus(id: string, status: "reserved" | "committed" | "released", actor?: string) {
    const row = await db.select().from(inventoryAllocations).where(eq(inventoryAllocations.id, id)).limit(1)
    if (!row[0]) throw new HttpException("Allocation not found", HttpStatus.NOT_FOUND)
    await db
      .update(inventoryAllocations)
      .set({
        status,
        allocatedBy: actor ?? row[0].allocatedBy,
        updatedAt: new Date(),
      })
      .where(eq(inventoryAllocations.id, id))
    const updated = await db.select().from(inventoryAllocations).where(eq(inventoryAllocations.id, id)).limit(1)
    return updated[0]!
  }

  async summary() {
    const rows = await db
      .select({
        status: inventoryAllocations.status,
        count: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${inventoryAllocations.quantity}), 0)::int`,
      })
      .from(inventoryAllocations)
      .groupBy(inventoryAllocations.status)
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, { count: r.count, units: r.units }]))
    return {
      reserved: byStatus.reserved ?? { count: 0, units: 0 },
      committed: byStatus.committed ?? { count: 0, units: 0 },
      released: byStatus.released ?? { count: 0, units: 0 },
    }
  }

  async allocateProcurementOrdered(stock: StockLineInput[], allocatedBy?: string) {
    const ordered = await db
      .select()
      .from(procurementDecisions)
      .where(eq(procurementDecisions.status, "ordered"))

    let created = 0
    const skipped: string[] = []
    for (const pr of ordered) {
      const existing = await db
        .select({ id: inventoryAllocations.id })
        .from(inventoryAllocations)
        .where(
          and(
            eq(inventoryAllocations.referenceType, "procurement_decision"),
            eq(inventoryAllocations.referenceId, pr.id),
            inArray(inventoryAllocations.status, ["reserved", "committed"]),
          ),
        )
        .limit(1)
      if (existing[0]) continue
      try {
        await this.allocate({
          sku: pr.sku,
          productName: pr.productName,
          quantity: pr.suggestedQty,
          referenceType: "procurement_decision",
          referenceId: pr.id,
          notes: pr.reason ?? undefined,
          allocatedBy,
          stock,
        })
        created++
      } catch {
        skipped.push(pr.sku)
      }
    }
    return { created, scanned: ordered.length, skipped }
  }
}

@Injectable()
export class CarePackAssemblyService {
  constructor(@Inject(InventoryAllocationService) private readonly alloc: InventoryAllocationService) {}

  private async linesForPack(packSlug: string, packName: string, productSkus: string[]) {
    const skus = [...new Set(productSkus.map((s) => s.trim()).filter(Boolean))]
    if (skus.length === 0) {
      const maps = await db
        .select()
        .from(carePackMappings)
        .where(and(eq(carePackMappings.packSlug, packSlug), eq(carePackMappings.active, true)))
        .limit(1)
      const map = maps[0]
      if (map?.productSkus?.length) {
        return (map.productSkus as string[]).map((sku) => ({
          sku,
          productName: map.packName,
          quantityRequired: 1,
        }))
      }
    }
    return skus.map((sku) => ({
      sku,
      productName: packName,
      quantityRequired: 1,
    }))
  }

  async listJobs(status?: string) {
    if (status?.trim()) {
      return db
        .select()
        .from(carePackAssemblyJobs)
        .where(eq(carePackAssemblyJobs.status, status.trim()))
        .orderBy(desc(carePackAssemblyJobs.updatedAt))
    }
    return db.select().from(carePackAssemblyJobs).orderBy(desc(carePackAssemblyJobs.updatedAt))
  }

  async getJob(id: string) {
    const job = await db.select().from(carePackAssemblyJobs).where(eq(carePackAssemblyJobs.id, id)).limit(1)
    if (!job[0]) throw new HttpException("Assembly job not found", HttpStatus.NOT_FOUND)
    const lines = await db
      .select()
      .from(carePackAssemblyLines)
      .where(eq(carePackAssemblyLines.jobId, id))
      .orderBy(carePackAssemblyLines.sku)
    const allocations = await this.alloc.list({
      referenceType: "care_pack_assembly",
      referenceId: id,
    })
    return { job: job[0], lines, allocations }
  }

  async createJob(input: {
    packSlug: string
    packName: string
    productSkus?: string[]
    assessmentId?: string
    userId?: string
    sessionId?: string
    patientLabel?: string
    priority?: string
    notes?: string
  }) {
    const lineDefs = await this.linesForPack(
      input.packSlug,
      input.packName,
      input.productSkus ?? [],
    )
    if (lineDefs.length === 0) {
      throw new HttpException("No SKUs defined for this care pack", HttpStatus.BAD_REQUEST)
    }

    const now = new Date()
    const jobId = newId("cpj")
    await db.insert(carePackAssemblyJobs).values({
      id: jobId,
      packSlug: input.packSlug,
      packName: input.packName,
      assessmentId: input.assessmentId ?? null,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      patientLabel: input.patientLabel ?? null,
      priority: input.priority ?? "normal",
      status: "queued",
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })

    for (const line of lineDefs) {
      await db.insert(carePackAssemblyLines).values({
        id: newId("cpl"),
        jobId,
        sku: line.sku,
        productName: line.productName,
        quantityRequired: line.quantityRequired,
        quantityAllocated: 0,
        status: "open",
        createdAt: now,
      })
    }

    return this.getJob(jobId)
  }

  async createFromAssessment(assessmentId: string) {
    const rows = await db
      .select()
      .from(carePackAssessments)
      .where(eq(carePackAssessments.id, assessmentId))
      .limit(1)
    if (!rows[0]) throw new HttpException("Assessment not found", HttpStatus.NOT_FOUND)

    const pack = rows[0].recommendedPacks?.[0]
    if (!pack) throw new HttpException("Assessment has no recommended pack", HttpStatus.BAD_REQUEST)

    const existing = await db
      .select({ id: carePackAssemblyJobs.id })
      .from(carePackAssemblyJobs)
      .where(eq(carePackAssemblyJobs.assessmentId, assessmentId))
      .limit(1)
    if (existing[0]) return this.getJob(existing[0].id)

    return this.createJob({
      packSlug: pack.packSlug,
      packName: pack.packName,
      productSkus: pack.productSkus ?? [],
      assessmentId,
      userId: rows[0].userId ?? undefined,
      sessionId: rows[0].sessionId ?? undefined,
      patientLabel: rows[0].sessionId ? `Session ${rows[0].sessionId.slice(-6)}` : "Care pack patient",
      priority: rows[0].riskLevel?.includes("Higher") ? "high" : "normal",
      notes: `From assessment ${assessmentId}`,
    })
  }

  async scanPendingAssessments(limit = 20) {
    const assessments = await db
      .select()
      .from(carePackAssessments)
      .orderBy(desc(carePackAssessments.createdAt))
      .limit(Math.min(100, limit * 3))

    const jobs = await db.select({ assessmentId: carePackAssemblyJobs.assessmentId }).from(carePackAssemblyJobs)
    const hasJob = new Set(jobs.map((j) => j.assessmentId).filter(Boolean))

    return assessments
      .filter((a) => !hasJob.has(a.id))
      .slice(0, limit)
      .map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        recommendedPacks: a.recommendedPacks,
        riskLevel: a.riskLevel,
      }))
  }

  async allocateJob(
    jobId: string,
    stock: StockLineInput[],
    allocatedBy?: string,
  ) {
    const { job, lines } = await this.getJob(jobId)
    if (["assembled", "ready", "dispatched", "cancelled"].includes(job.status)) {
      throw new HttpException(`Cannot allocate job in status ${job.status}`, HttpStatus.BAD_REQUEST)
    }

    const created: typeof inventoryAllocations.$inferSelect[] = []
    const now = new Date()

    for (const line of lines) {
      if (line.quantityAllocated >= line.quantityRequired) continue
      const need = line.quantityRequired - line.quantityAllocated
      try {
        const alloc = await this.alloc.allocate({
          sku: line.sku,
          productName: line.productName,
          quantity: need,
          referenceType: "care_pack_assembly",
          referenceId: jobId,
          location: stock.find((s) => s.sku === line.sku)?.location,
          notes: `Care pack ${job.packSlug}`,
          allocatedBy,
          stock,
        })
        created.push(alloc)
        await db
          .update(carePackAssemblyLines)
          .set({
            quantityAllocated: line.quantityRequired,
            status: "allocated",
          })
          .where(eq(carePackAssemblyLines.id, line.id))
      } catch {
        await db
          .update(carePackAssemblyLines)
          .set({ status: "short" })
          .where(eq(carePackAssemblyLines.id, line.id))
      }
    }

    const refreshed = await this.getJob(jobId)
    const allAllocated = refreshed.lines.every((l) => l.quantityAllocated >= l.quantityRequired)
    await db
      .update(carePackAssemblyJobs)
      .set({
        status: allAllocated ? "picking" : "allocating",
        updatedAt: now,
      })
      .where(eq(carePackAssemblyJobs.id, jobId))

    return { ...await this.getJob(jobId), allocationsCreated: created.length }
  }

  async patchJob(
    jobId: string,
    patch: { status?: string; notes?: string; assembledBy?: string },
  ) {
    const { job, lines } = await this.getJob(jobId)
    const now = new Date()
    const status = patch.status ?? job.status
    const assembledAt =
      status === "assembled" || status === "ready" ? now : job.assembledAt

    if (status === "assembled" || status === "ready") {
      const incomplete = lines.some((l) => l.quantityAllocated < l.quantityRequired)
      if (incomplete) {
        throw new HttpException(
          "Allocate all pick lines before marking assembled",
          HttpStatus.BAD_REQUEST,
        )
      }
      if (["cancelled", "dispatched"].includes(job.status)) {
        throw new HttpException(`Cannot mark ${status} from ${job.status}`, HttpStatus.BAD_REQUEST)
      }
      const allocs = await this.alloc.list({
        referenceType: "care_pack_assembly",
        referenceId: jobId,
        status: "reserved",
      })
      for (const a of allocs) {
        await this.alloc.patchStatus(a.id, "committed", patch.assembledBy)
      }
    }

    if (status === "cancelled") {
      const allocs = await this.alloc.list({
        referenceType: "care_pack_assembly",
        referenceId: jobId,
        status: "reserved",
      })
      for (const a of allocs) {
        await this.alloc.patchStatus(a.id, "released", patch.assembledBy)
      }
    }

    await db
      .update(carePackAssemblyJobs)
      .set({
        status,
        notes: patch.notes ?? job.notes,
        assembledBy: patch.assembledBy ?? job.assembledBy,
        assembledAt: assembledAt ?? job.assembledAt,
        updatedAt: now,
      })
      .where(eq(carePackAssemblyJobs.id, jobId))

    return this.getJob(jobId)
  }

  async summary() {
    const rows = await db
      .select({
        status: carePackAssemblyJobs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(carePackAssemblyJobs)
      .groupBy(carePackAssemblyJobs.status)
    const counts = Object.fromEntries(rows.map((r) => [r.status, r.count])) as Record<string, number>
    return {
      queued: counts.queued ?? 0,
      allocating: counts.allocating ?? 0,
      picking: counts.picking ?? 0,
      assembled: counts.assembled ?? 0,
      ready: counts.ready ?? 0,
      dispatched: counts.dispatched ?? 0,
      cancelled: counts.cancelled ?? 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/inventory")
class InventoryAllocationController {
  constructor(@Inject(InventoryAllocationService) private readonly alloc: InventoryAllocationService) {}

  @Get("allocations/summary")
  @RequirePerm("sourcing.view")
  summary() {
    return this.alloc.summary()
  }

  @Get("allocations")
  @RequirePerm("sourcing.view")
  list(
    @Query("status") status?: string,
    @Query("referenceType") referenceType?: string,
    @Query("referenceId") referenceId?: string,
  ) {
    return this.alloc.list({ status, referenceType, referenceId })
  }

  @Post("availability")
  @RequirePerm("sourcing.view")
  async availability(@Body() body: Record<string, unknown>) {
    const stock = Array.isArray(body.stock) ? (body.stock as StockLineInput[]) : []
    const reserved = await this.alloc.reservedBySku()
    return { lines: this.alloc.availability(stock, reserved), reserved }
  }

  @Post("allocations")
  @RequirePerm("sourcing.manage")
  allocate(@Body() body: Record<string, unknown>, @Req() req: Request & { adminEmail?: string }) {
    const stock = Array.isArray(body.stock) ? (body.stock as StockLineInput[]) : []
    if (!body.sku || !body.referenceType || !body.referenceId) {
      throw new HttpException("sku, referenceType, referenceId required", HttpStatus.BAD_REQUEST)
    }
    return this.alloc.allocate({
      sku: String(body.sku),
      productName: String(body.productName ?? body.sku),
      quantity: Number(body.quantity) || 1,
      referenceType: String(body.referenceType),
      referenceId: String(body.referenceId),
      location: typeof body.location === "string" ? body.location : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      allocatedBy: req.adminEmail,
      stock,
    })
  }

  @Post("allocations/sync-procurement")
  @RequirePerm("sourcing.manage")
  syncProcurement(@Body() body: Record<string, unknown>, @Req() req: Request & { adminEmail?: string }) {
    const stock = Array.isArray(body.stock) ? (body.stock as StockLineInput[]) : []
    return this.alloc.allocateProcurementOrdered(stock, req.adminEmail)
  }

  @Patch("allocations/:id")
  @RequirePerm("sourcing.manage")
  patch(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { adminEmail?: string },
  ) {
    const status = String(body.status ?? "") as "reserved" | "committed" | "released"
    if (!["reserved", "committed", "released"].includes(status)) {
      throw new HttpException("status must be reserved | committed | released", HttpStatus.BAD_REQUEST)
    }
    return this.alloc.patchStatus(id, status, req.adminEmail)
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/care-packs/assembly")
class CarePackAssemblyController {
  constructor(@Inject(CarePackAssemblyService) private readonly assembly: CarePackAssemblyService) {}

  @Get("summary")
  @RequirePerm("sourcing.view")
  summary() {
    return this.assembly.summary()
  }

  @Get("jobs")
  @RequirePerm("sourcing.view")
  jobs(@Query("status") status?: string) {
    return this.assembly.listJobs(status)
  }

  @Get("jobs/:id")
  @RequirePerm("sourcing.view")
  job(@Param("id") id: string) {
    return this.assembly.getJob(id)
  }

  @Get("pending-assessments")
  @RequirePerm("sourcing.view")
  pending(@Query("limit") limit?: string) {
    return this.assembly.scanPendingAssessments(Number(limit) || 20)
  }

  @Post("jobs")
  @RequirePerm("sourcing.manage")
  create(@Body() body: Record<string, unknown>) {
    return this.assembly.createJob({
      packSlug: String(body.packSlug ?? ""),
      packName: String(body.packName ?? ""),
      productSkus: Array.isArray(body.productSkus) ? body.productSkus.map(String) : [],
      assessmentId: typeof body.assessmentId === "string" ? body.assessmentId : undefined,
      patientLabel: typeof body.patientLabel === "string" ? body.patientLabel : undefined,
      priority: typeof body.priority === "string" ? body.priority : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    })
  }

  @Post("jobs/from-assessment/:assessmentId")
  @RequirePerm("sourcing.manage")
  fromAssessment(@Param("assessmentId") assessmentId: string) {
    return this.assembly.createFromAssessment(assessmentId)
  }

  @Post("jobs/:id/allocate")
  @RequirePerm("sourcing.manage")
  allocate(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { adminEmail?: string },
  ) {
    const stock = Array.isArray(body.stock) ? (body.stock as StockLineInput[]) : []
    return this.assembly.allocateJob(id, stock, req.adminEmail)
  }

  @Patch("jobs/:id")
  @RequirePerm("sourcing.manage")
  patch(
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { adminEmail?: string },
  ) {
    return this.assembly.patchJob(id, {
      status: typeof body.status === "string" ? body.status : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      assembledBy: req.adminEmail,
    })
  }
}

@Module({
  controllers: [InventoryAllocationController, CarePackAssemblyController],
  providers: [InventoryAllocationService, CarePackAssemblyService],
  exports: [InventoryAllocationService, CarePackAssemblyService],
})
export class OperationsFulfillmentModule {}

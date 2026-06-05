/**
 * Postgres-backed QA & Logistics admin CRUD (replaces cmsStore qa.* / logistics.*).
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
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common"
import { eq, sql } from "drizzle-orm"
import {
  db,
  logisticsBatches,
  logisticsColdChainChecks,
  logisticsDeliveries,
  logisticsExceptions,
  logisticsRiders,
  logisticsSettings,
  logisticsZones,
  qaDispatchChecks,
  qaInventoryItems,
  qaSettings,
} from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, AnyAdmin, RequirePerm } from "../common/admin-guard"
import {
  parseIso,
  toIso,
  type LogisticsBatchDto,
  type LogisticsColdCheckDto,
  type LogisticsConfigDto,
  type LogisticsDeliveryDto,
  type LogisticsExceptionDto,
  type LogisticsRiderDto,
  type LogisticsZoneDto,
  type QaConfigDto,
  type QaDispatchCheckDto,
  type QaInventoryDto,
} from "./qa-logistics.dto"

const QA_SETTINGS_ID = "default"
const LOGISTICS_SETTINGS_ID = "default"

const DEFAULT_QA_CONFIG: QaConfigDto = {
  expiryWarningDays: 90,
  expiryCriticalDays: 30,
  requireAllStepsForApproval: true,
  blockExpiredFromDispatch: true,
}

const DEFAULT_LOGISTICS_CONFIG: LogisticsConfigDto = {
  targetOrdersPerBatch: 8,
  targetSlaHours: 6,
  costCapPerDelivery: 350,
  onlyLeftTurnRule: false,
  autoAssignRiders: true,
  smsCustomerOnDispatch: true,
  smsCustomerOnDelivery: true,
}

function mapInventory(row: typeof qaInventoryItems.$inferSelect): QaInventoryDto {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    sku: row.sku,
    stock: row.stock,
    safetyStock: row.safetyStock,
    unit: row.unit,
    expiryDate: row.expiryDate ?? undefined,
    batchRef: row.batchRef ?? undefined,
    location: row.location,
    notes: row.notes ?? undefined,
  }
}

function mapDispatch(row: typeof qaDispatchChecks.$inferSelect): QaDispatchCheckDto {
  return {
    id: row.id,
    batchRef: row.batchRef,
    orderRef: row.orderRef ?? undefined,
    steps: row.steps ?? {},
    notes: row.notes,
    checkedBy: row.checkedBy,
    createdAt: toIso(row.createdAt)!,
    approvedAt: toIso(row.approvedAt),
    rejectedAt: toIso(row.rejectedAt),
    rejectionReason: row.rejectionReason ?? undefined,
  }
}

function mapZone(row: typeof logisticsZones.$inferSelect): LogisticsZoneDto {
  return {
    id: row.id,
    name: row.name,
    areas: row.areas,
    slaHours: row.slaHours,
    surcharge: row.surcharge,
    coldChainCapable: row.coldChainCapable,
    active: row.active,
  }
}

function mapRider(row: typeof logisticsRiders.$inferSelect): LogisticsRiderDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    vehicle: row.vehicle,
    capacity: row.capacity,
    zoneId: row.zoneId,
    coldChainCapable: row.coldChainCapable,
    active: row.active,
    notes: row.notes ?? undefined,
  }
}

function mapBatch(row: typeof logisticsBatches.$inferSelect): LogisticsBatchDto {
  return {
    id: row.id,
    ref: row.ref,
    zoneId: row.zoneId,
    riderId: row.riderId,
    scheduledAt: toIso(row.scheduledAt)!,
    status: row.status,
    orderIds: row.orderIds ?? [],
    coldChain: row.coldChain,
    notes: row.notes ?? undefined,
    createdAt: toIso(row.createdAt)!,
    dispatchedAt: toIso(row.dispatchedAt),
    completedAt: toIso(row.completedAt),
  }
}

function mapDelivery(row: typeof logisticsDeliveries.$inferSelect): LogisticsDeliveryDto {
  return {
    id: row.id,
    orderRef: row.orderRef,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    address: row.address,
    zoneId: row.zoneId,
    batchId: row.batchId,
    riderId: row.riderId,
    status: row.status,
    attempts: row.attempts,
    codAmount: row.codAmount,
    estimatedCost: row.estimatedCost,
    failureReason: row.failureReason ?? undefined,
    createdAt: toIso(row.createdAt)!,
    dispatchedAt: toIso(row.dispatchedAt),
    deliveredAt: toIso(row.deliveredAt),
    slaHours: row.slaHours ?? undefined,
  }
}

function mapCold(row: typeof logisticsColdChainChecks.$inferSelect): LogisticsColdCheckDto {
  return {
    id: row.id,
    batchId: row.batchId,
    tempBefore: row.tempBefore,
    tempAfter: row.tempAfter,
    packagedBy: row.packagedBy,
    packagedAt: toIso(row.packagedAt)!,
    passed: row.passed,
    notes: row.notes ?? undefined,
  }
}

function mapException(row: typeof logisticsExceptions.$inferSelect): LogisticsExceptionDto {
  return {
    id: row.id,
    deliveryId: row.deliveryId,
    type: row.type,
    summary: row.summary,
    resolution: row.resolution,
    cost: row.cost ?? undefined,
    createdAt: toIso(row.createdAt)!,
    resolvedAt: toIso(row.resolvedAt),
  }
}

@Injectable()
export class QaOpsService {
  async listInventory() {
    const rows = await db.select().from(qaInventoryItems).orderBy(qaInventoryItems.name)
    return rows.map(mapInventory)
  }

  async replaceInventory(items: QaInventoryDto[]) {
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(qaInventoryItems)
      if (items.length === 0) return
      await tx.insert(qaInventoryItems).values(
        items.map((i) => ({
          id: i.id,
          kind: i.kind,
          name: i.name,
          sku: i.sku,
          stock: i.stock,
          safetyStock: i.safetyStock,
          unit: i.unit,
          expiryDate: i.expiryDate ?? null,
          batchRef: i.batchRef ?? null,
          location: i.location,
          notes: i.notes ?? null,
          updatedAt: now,
        })),
      )
    })
    return this.listInventory()
  }

  async createInventory(body: Partial<QaInventoryDto>) {
    const id = body.id?.trim() || newId("inv")
    const now = new Date()
    await db.insert(qaInventoryItems).values({
      id,
      kind: body.kind ?? "medication",
      name: String(body.name ?? "").trim() || "Unnamed",
      sku: String(body.sku ?? "").trim() || id,
      stock: Number(body.stock) || 0,
      safetyStock: Number(body.safetyStock) || 0,
      unit: body.unit ?? "units",
      expiryDate: body.expiryDate ?? null,
      batchRef: body.batchRef ?? null,
      location: body.location ?? "",
      notes: body.notes ?? null,
      updatedAt: now,
    })
    const row = await db.select().from(qaInventoryItems).where(eq(qaInventoryItems.id, id)).limit(1)
    return mapInventory(row[0]!)
  }

  async patchInventory(id: string, body: Partial<QaInventoryDto>) {
    const existing = await db.select().from(qaInventoryItems).where(eq(qaInventoryItems.id, id)).limit(1)
    if (!existing[0]) throw new HttpException("Inventory item not found", HttpStatus.NOT_FOUND)
    await db
      .update(qaInventoryItems)
      .set({
        kind: body.kind ?? existing[0].kind,
        name: body.name ?? existing[0].name,
        sku: body.sku ?? existing[0].sku,
        stock: body.stock ?? existing[0].stock,
        safetyStock: body.safetyStock ?? existing[0].safetyStock,
        unit: body.unit ?? existing[0].unit,
        expiryDate: body.expiryDate !== undefined ? body.expiryDate ?? null : existing[0].expiryDate,
        batchRef: body.batchRef !== undefined ? body.batchRef ?? null : existing[0].batchRef,
        location: body.location ?? existing[0].location,
        notes: body.notes !== undefined ? body.notes ?? null : existing[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(qaInventoryItems.id, id))
    const row = await db.select().from(qaInventoryItems).where(eq(qaInventoryItems.id, id)).limit(1)
    return mapInventory(row[0]!)
  }

  async deleteInventory(id: string) {
    const r = await db.delete(qaInventoryItems).where(eq(qaInventoryItems.id, id)).returning({ id: qaInventoryItems.id })
    if (!r.length) throw new HttpException("Inventory item not found", HttpStatus.NOT_FOUND)
    return { ok: true }
  }

  async listDispatchChecks() {
    const rows = await db.select().from(qaDispatchChecks).orderBy(sql`${qaDispatchChecks.createdAt} desc`)
    return rows.map(mapDispatch)
  }

  async replaceDispatchChecks(items: QaDispatchCheckDto[]) {
    await db.transaction(async (tx) => {
      await tx.delete(qaDispatchChecks)
      if (items.length === 0) return
      await tx.insert(qaDispatchChecks).values(
        items.map((c) => ({
          id: c.id,
          batchRef: c.batchRef,
          orderRef: c.orderRef ?? null,
          steps: c.steps ?? {},
          notes: c.notes ?? "",
          checkedBy: c.checkedBy ?? "",
          createdAt: parseIso(c.createdAt) ?? new Date(),
          approvedAt: parseIso(c.approvedAt),
          rejectedAt: parseIso(c.rejectedAt),
          rejectionReason: c.rejectionReason ?? null,
        })),
      )
    })
    return this.listDispatchChecks()
  }

  async createDispatchCheck(body: Partial<QaDispatchCheckDto>) {
    const id = body.id?.trim() || newId("qac")
    const now = new Date()
    await db.insert(qaDispatchChecks).values({
      id,
      batchRef: String(body.batchRef ?? "").trim() || "UNKNOWN",
      orderRef: body.orderRef ?? null,
      steps: body.steps ?? {},
      notes: body.notes ?? "",
      checkedBy: body.checkedBy ?? "",
      createdAt: parseIso(body.createdAt) ?? now,
      approvedAt: parseIso(body.approvedAt),
      rejectedAt: parseIso(body.rejectedAt),
      rejectionReason: body.rejectionReason ?? null,
    })
    const row = await db.select().from(qaDispatchChecks).where(eq(qaDispatchChecks.id, id)).limit(1)
    return mapDispatch(row[0]!)
  }

  async patchDispatchCheck(id: string, body: Partial<QaDispatchCheckDto>) {
    const existing = await db.select().from(qaDispatchChecks).where(eq(qaDispatchChecks.id, id)).limit(1)
    if (!existing[0]) throw new HttpException("QA check not found", HttpStatus.NOT_FOUND)
    await db
      .update(qaDispatchChecks)
      .set({
        batchRef: body.batchRef ?? existing[0].batchRef,
        orderRef: body.orderRef !== undefined ? body.orderRef ?? null : existing[0].orderRef,
        steps: body.steps ?? existing[0].steps,
        notes: body.notes ?? existing[0].notes,
        checkedBy: body.checkedBy ?? existing[0].checkedBy,
        approvedAt:
          body.approvedAt !== undefined ? parseIso(body.approvedAt) : existing[0].approvedAt,
        rejectedAt:
          body.rejectedAt !== undefined ? parseIso(body.rejectedAt) : existing[0].rejectedAt,
        rejectionReason:
          body.rejectionReason !== undefined ? body.rejectionReason ?? null : existing[0].rejectionReason,
      })
      .where(eq(qaDispatchChecks.id, id))
    const row = await db.select().from(qaDispatchChecks).where(eq(qaDispatchChecks.id, id)).limit(1)
    return mapDispatch(row[0]!)
  }

  async deleteDispatchCheck(id: string) {
    const r = await db.delete(qaDispatchChecks).where(eq(qaDispatchChecks.id, id)).returning({ id: qaDispatchChecks.id })
    if (!r.length) throw new HttpException("QA check not found", HttpStatus.NOT_FOUND)
    return { ok: true }
  }

  async getConfig(): Promise<QaConfigDto> {
    const rows = await db.select().from(qaSettings).where(eq(qaSettings.id, QA_SETTINGS_ID)).limit(1)
    if (!rows[0]) {
      await db.insert(qaSettings).values({ id: QA_SETTINGS_ID, updatedAt: new Date() })
      return { ...DEFAULT_QA_CONFIG }
    }
    const r = rows[0]
    return {
      expiryWarningDays: r.expiryWarningDays,
      expiryCriticalDays: r.expiryCriticalDays,
      requireAllStepsForApproval: r.requireAllStepsForApproval,
      blockExpiredFromDispatch: r.blockExpiredFromDispatch,
    }
  }

  async patchConfig(body: QaConfigDto) {
    await this.getConfig()
    await db
      .update(qaSettings)
      .set({
        expiryWarningDays: body.expiryWarningDays,
        expiryCriticalDays: body.expiryCriticalDays,
        requireAllStepsForApproval: body.requireAllStepsForApproval,
        blockExpiredFromDispatch: body.blockExpiredFromDispatch,
        updatedAt: new Date(),
      })
      .where(eq(qaSettings.id, QA_SETTINGS_ID))
    return this.getConfig()
  }

  async scanExpiry() {
    const [inventory, config] = await Promise.all([this.listInventory(), this.getConfig()])
    const now = Date.now()
    const flags: Array<{
      id: string
      sku: string
      name: string
      batchRef?: string
      expiryDate?: string
      daysToExpiry: number
      severity: "critical" | "warning" | "expired" | "low_stock"
      blockDispatch: boolean
      flaggedAt: string
    }> = []
    let expired = 0
    let critical = 0
    let warning = 0

    for (const item of inventory) {
      if (item.expiryDate) {
        const days = Math.ceil((new Date(item.expiryDate).getTime() - now) / 86_400_000)
        let severity: (typeof flags)[0]["severity"] | null = null
        if (days < 0) {
          severity = "expired"
          expired++
        } else if (days <= config.expiryCriticalDays) {
          severity = "critical"
          critical++
        } else if (days <= config.expiryWarningDays) {
          severity = "warning"
          warning++
        }
        if (severity) {
          flags.push({
            id: newId("qaflag"),
            sku: item.sku,
            name: item.name,
            batchRef: item.batchRef,
            expiryDate: item.expiryDate,
            daysToExpiry: days,
            severity,
            blockDispatch: severity === "expired" && config.blockExpiredFromDispatch,
            flaggedAt: new Date().toISOString(),
          })
        }
      }
      if (item.stock <= item.safetyStock) {
        flags.push({
          id: newId("qaflag"),
          sku: item.sku,
          name: item.name,
          batchRef: item.batchRef,
          daysToExpiry: 9999,
          severity: "low_stock",
          blockDispatch: false,
          flaggedAt: new Date().toISOString(),
        })
      }
    }

    const snapshot = { generatedAt: new Date().toISOString(), flags }
    await db
      .update(qaSettings)
      .set({ expiryFlagsSnapshot: snapshot, updatedAt: new Date() })
      .where(eq(qaSettings.id, QA_SETTINGS_ID))

    return { flags, expired, critical, warning }
  }
}

@Injectable()
export class LogisticsOpsService {
  async listZones() {
    return (await db.select().from(logisticsZones).orderBy(logisticsZones.name)).map(mapZone)
  }

  async replaceZones(items: LogisticsZoneDto[]) {
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(logisticsZones)
      if (items.length) {
        await tx.insert(logisticsZones).values(
          items.map((z) => ({
            id: z.id,
            name: z.name,
            areas: z.areas,
            slaHours: z.slaHours,
            surcharge: z.surcharge,
            coldChainCapable: z.coldChainCapable,
            active: z.active,
            updatedAt: now,
          })),
        )
      }
    })
    return this.listZones()
  }

  async listRiders() {
    return (await db.select().from(logisticsRiders).orderBy(logisticsRiders.name)).map(mapRider)
  }

  async replaceRiders(items: LogisticsRiderDto[]) {
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(logisticsRiders)
      if (items.length) {
        await tx.insert(logisticsRiders).values(
          items.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            vehicle: r.vehicle,
            capacity: r.capacity,
            zoneId: r.zoneId,
            coldChainCapable: r.coldChainCapable,
            active: r.active,
            notes: r.notes ?? null,
            updatedAt: now,
          })),
        )
      }
    })
    return this.listRiders()
  }

  async listBatches() {
    const rows = await db.select().from(logisticsBatches).orderBy(sql`${logisticsBatches.createdAt} desc`)
    return rows.map(mapBatch)
  }

  async replaceBatches(items: LogisticsBatchDto[]) {
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(logisticsBatches)
      if (items.length) {
        await tx.insert(logisticsBatches).values(
          items.map((b) => ({
            id: b.id,
            ref: b.ref,
            zoneId: b.zoneId,
            riderId: b.riderId,
            scheduledAt: parseIso(b.scheduledAt) ?? now,
            status: b.status,
            orderIds: b.orderIds ?? [],
            coldChain: b.coldChain,
            notes: b.notes ?? null,
            createdAt: parseIso(b.createdAt) ?? now,
            dispatchedAt: parseIso(b.dispatchedAt),
            completedAt: parseIso(b.completedAt),
            updatedAt: now,
          })),
        )
      }
    })
    return this.listBatches()
  }

  async listDeliveries() {
    const rows = await db.select().from(logisticsDeliveries).orderBy(sql`${logisticsDeliveries.createdAt} desc`)
    return rows.map(mapDelivery)
  }

  async replaceDeliveries(items: LogisticsDeliveryDto[]) {
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(logisticsDeliveries)
      if (items.length) {
        await tx.insert(logisticsDeliveries).values(
          items.map((d) => ({
            id: d.id,
            orderRef: d.orderRef,
            customerName: d.customerName,
            customerPhone: d.customerPhone,
            address: d.address,
            zoneId: d.zoneId,
            batchId: d.batchId,
            riderId: d.riderId,
            status: d.status,
            attempts: d.attempts,
            codAmount: d.codAmount,
            estimatedCost: d.estimatedCost,
            failureReason: d.failureReason ?? null,
            createdAt: parseIso(d.createdAt) ?? now,
            dispatchedAt: parseIso(d.dispatchedAt),
            deliveredAt: parseIso(d.deliveredAt),
            slaHours: d.slaHours ?? null,
            updatedAt: now,
          })),
        )
      }
    })
    return this.listDeliveries()
  }

  async listColdChecks() {
    const rows = await db.select().from(logisticsColdChainChecks).orderBy(sql`${logisticsColdChainChecks.packagedAt} desc`)
    return rows.map(mapCold)
  }

  async replaceColdChecks(items: LogisticsColdCheckDto[]) {
    await db.transaction(async (tx) => {
      await tx.delete(logisticsColdChainChecks)
      if (items.length) {
        await tx.insert(logisticsColdChainChecks).values(
          items.map((c) => ({
            id: c.id,
            batchId: c.batchId,
            tempBefore: c.tempBefore,
            tempAfter: c.tempAfter,
            packagedBy: c.packagedBy,
            packagedAt: parseIso(c.packagedAt) ?? new Date(),
            passed: c.passed,
            notes: c.notes ?? null,
          })),
        )
      }
    })
    return this.listColdChecks()
  }

  async listExceptions() {
    const rows = await db.select().from(logisticsExceptions).orderBy(sql`${logisticsExceptions.createdAt} desc`)
    return rows.map(mapException)
  }

  async replaceExceptions(items: LogisticsExceptionDto[]) {
    await db.transaction(async (tx) => {
      await tx.delete(logisticsExceptions)
      if (items.length) {
        await tx.insert(logisticsExceptions).values(
          items.map((e) => ({
            id: e.id,
            deliveryId: e.deliveryId,
            type: e.type,
            summary: e.summary,
            resolution: e.resolution,
            cost: e.cost ?? null,
            createdAt: parseIso(e.createdAt) ?? new Date(),
            resolvedAt: parseIso(e.resolvedAt),
          })),
        )
      }
    })
    return this.listExceptions()
  }

  async getConfig(): Promise<LogisticsConfigDto> {
    const rows = await db.select().from(logisticsSettings).where(eq(logisticsSettings.id, LOGISTICS_SETTINGS_ID)).limit(1)
    if (!rows[0]) {
      await db.insert(logisticsSettings).values({ id: LOGISTICS_SETTINGS_ID, updatedAt: new Date() })
      return { ...DEFAULT_LOGISTICS_CONFIG }
    }
    const r = rows[0]
    return {
      targetOrdersPerBatch: r.targetOrdersPerBatch,
      targetSlaHours: r.targetSlaHours,
      costCapPerDelivery: r.costCapPerDelivery,
      onlyLeftTurnRule: r.onlyLeftTurnRule,
      autoAssignRiders: r.autoAssignRiders,
      smsCustomerOnDispatch: r.smsCustomerOnDispatch,
      smsCustomerOnDelivery: r.smsCustomerOnDelivery,
    }
  }

  async patchConfig(body: LogisticsConfigDto) {
    await this.getConfig()
    await db
      .update(logisticsSettings)
      .set({
        targetOrdersPerBatch: body.targetOrdersPerBatch,
        targetSlaHours: body.targetSlaHours,
        costCapPerDelivery: body.costCapPerDelivery,
        onlyLeftTurnRule: body.onlyLeftTurnRule,
        autoAssignRiders: body.autoAssignRiders,
        smsCustomerOnDispatch: body.smsCustomerOnDispatch,
        smsCustomerOnDelivery: body.smsCustomerOnDelivery,
        updatedAt: new Date(),
      })
      .where(eq(logisticsSettings.id, LOGISTICS_SETTINGS_ID))
    return this.getConfig()
  }

  async autoAssign() {
    const [deliveries, riders, config] = await Promise.all([
      this.listDeliveries(),
      this.listRiders(),
      this.getConfig(),
    ])

    if (!config.autoAssignRiders) {
      return {
        assigned: 0,
        skipped: deliveries.length,
        slaAtRisk: 0,
        notes: ["Auto-assign disabled in config"],
      }
    }

    const load = new Map<string, number>()
    for (const d of deliveries) {
      if (d.riderId) load.set(d.riderId, (load.get(d.riderId) ?? 0) + 1)
    }

    const activeRiders = riders.filter((r) => r.active)
    const notes: string[] = []
    let assigned = 0
    let skipped = 0
    let atRisk = 0

    const updated = deliveries.map((d) => {
      if (d.status !== "pending" || d.riderId) {
        skipped++
        return d
      }
      const candidates = activeRiders
        .filter((r) => !d.zoneId || !r.zoneId || r.zoneId === d.zoneId)
        .filter((r) => (load.get(r.id) ?? 0) < r.capacity)
        .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))
      const rider = candidates[0]
      if (!rider) {
        atRisk++
        notes.push(`No rider for ${d.orderRef} (zone ${d.zoneId ?? "any"})`)
        skipped++
        return d
      }
      load.set(rider.id, (load.get(rider.id) ?? 0) + 1)
      assigned++
      return { ...d, riderId: rider.id, status: "assigned" }
    })

    if (assigned > 0) await this.replaceDeliveries(updated)
    else if (skipped === deliveries.length && deliveries.length > 0) {
      /* no-op */
    }

    return { assigned, skipped, slaAtRisk: atRisk, notes }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/qa")
class QaAdminController {
  constructor(@Inject(QaOpsService) private readonly qa: QaOpsService) {}

  @Get("inventory")
  @RequirePerm("inventory.view")
  listInventory() {
    return this.qa.listInventory()
  }

  @Put("inventory")
  @RequirePerm("inventory.edit")
  replaceInventory(@Body() body: QaInventoryDto[]) {
    return this.qa.replaceInventory(Array.isArray(body) ? body : [])
  }

  @Post("inventory")
  @RequirePerm("inventory.edit")
  createInventory(@Body() body: Partial<QaInventoryDto>) {
    return this.qa.createInventory(body)
  }

  @Patch("inventory/:id")
  @RequirePerm("inventory.edit")
  patchInventory(@Param("id") id: string, @Body() body: Partial<QaInventoryDto>) {
    return this.qa.patchInventory(id, body)
  }

  @Delete("inventory/:id")
  @RequirePerm("inventory.edit")
  deleteInventory(@Param("id") id: string) {
    return this.qa.deleteInventory(id)
  }

  @Get("dispatch-checks")
  @RequirePerm("inventory.view")
  listChecks() {
    return this.qa.listDispatchChecks()
  }

  @Put("dispatch-checks")
  @RequirePerm("inventory.edit")
  replaceChecks(@Body() body: QaDispatchCheckDto[]) {
    return this.qa.replaceDispatchChecks(Array.isArray(body) ? body : [])
  }

  @Post("dispatch-checks")
  @RequirePerm("inventory.edit")
  createCheck(@Body() body: Partial<QaDispatchCheckDto>) {
    return this.qa.createDispatchCheck(body)
  }

  @Patch("dispatch-checks/:id")
  @RequirePerm("inventory.edit")
  patchCheck(@Param("id") id: string, @Body() body: Partial<QaDispatchCheckDto>) {
    return this.qa.patchDispatchCheck(id, body)
  }

  @Delete("dispatch-checks/:id")
  @RequirePerm("inventory.edit")
  deleteCheck(@Param("id") id: string) {
    return this.qa.deleteDispatchCheck(id)
  }

  @Get("config")
  @RequirePerm("inventory.view")
  getConfig() {
    return this.qa.getConfig()
  }

  @Patch("config")
  @RequirePerm("inventory.edit")
  patchConfig(@Body() body: QaConfigDto) {
    return this.qa.patchConfig(body)
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/logistics")
class LogisticsAdminController {
  constructor(@Inject(LogisticsOpsService) private readonly logistics: LogisticsOpsService) {}

  @Get("zones")
  @RequirePerm("delivery.manage")
  listZones() {
    return this.logistics.listZones()
  }

  @Put("zones")
  @RequirePerm("delivery.manage")
  replaceZones(@Body() body: LogisticsZoneDto[]) {
    return this.logistics.replaceZones(Array.isArray(body) ? body : [])
  }

  @Get("riders")
  @RequirePerm("delivery.manage")
  listRiders() {
    return this.logistics.listRiders()
  }

  @Put("riders")
  @RequirePerm("delivery.manage")
  replaceRiders(@Body() body: LogisticsRiderDto[]) {
    return this.logistics.replaceRiders(Array.isArray(body) ? body : [])
  }

  @Get("batches")
  @RequirePerm("delivery.manage")
  listBatches() {
    return this.logistics.listBatches()
  }

  @Put("batches")
  @RequirePerm("delivery.manage")
  replaceBatches(@Body() body: LogisticsBatchDto[]) {
    return this.logistics.replaceBatches(Array.isArray(body) ? body : [])
  }

  @Get("deliveries")
  @RequirePerm("delivery.manage")
  listDeliveries() {
    return this.logistics.listDeliveries()
  }

  @Put("deliveries")
  @RequirePerm("delivery.manage")
  replaceDeliveries(@Body() body: LogisticsDeliveryDto[]) {
    return this.logistics.replaceDeliveries(Array.isArray(body) ? body : [])
  }

  @Get("cold-chain-checks")
  @RequirePerm("delivery.manage")
  listColdChecks() {
    return this.logistics.listColdChecks()
  }

  @Put("cold-chain-checks")
  @RequirePerm("delivery.manage")
  replaceColdChecks(@Body() body: LogisticsColdCheckDto[]) {
    return this.logistics.replaceColdChecks(Array.isArray(body) ? body : [])
  }

  @Get("exceptions")
  @RequirePerm("delivery.manage")
  listExceptions() {
    return this.logistics.listExceptions()
  }

  @Put("exceptions")
  @RequirePerm("delivery.manage")
  replaceExceptions(@Body() body: LogisticsExceptionDto[]) {
    return this.logistics.replaceExceptions(Array.isArray(body) ? body : [])
  }

  @Get("config")
  @RequirePerm("delivery.manage")
  getConfig() {
    return this.logistics.getConfig()
  }

  @Patch("config")
  @RequirePerm("delivery.manage")
  patchConfig(@Body() body: LogisticsConfigDto) {
    return this.logistics.patchConfig(body)
  }
}

@Module({
  controllers: [QaAdminController, LogisticsAdminController],
  providers: [QaOpsService, LogisticsOpsService],
  exports: [QaOpsService, LogisticsOpsService],
})
export class QaLogisticsModule {}

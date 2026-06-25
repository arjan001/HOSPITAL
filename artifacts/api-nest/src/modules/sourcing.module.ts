/**
 * Postgres-backed sourcing inventory + requests.
 *
 *   GET/PUT  /api/v2/admin/sourcing/inventory
 *   GET      /api/v2/admin/sourcing/requests
 *   POST     /api/v2/admin/sourcing/requests/open
 *   POST     /api/v2/admin/sourcing/requests
 *   GET      /api/v2/admin/sourcing/requests/:id
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
import { desc, eq } from "drizzle-orm"
import { db, partnerQuotes, sourcingRequests } from "@workspace/db"
import { newId } from "../common/repository"
import {
  listSourcingInventory,
  replaceSourcingInventory,
  type SourcingInventoryDto,
} from "../common/sourcing-inventory"
import { AdminGuard, RequirePerm, AnyAdmin } from "../common/admin-guard"

export function priorityToUrgency(priority: string): string {
  if (priority === "urgent") return "critical"
  if (priority === "high") return "high"
  if (priority === "low") return "low"
  return "normal"
}

@Injectable()
export class SourcingRequestsService {
  async list(opts?: { status?: string }) {
    const status = (opts?.status ?? "").trim()
    if (status) {
      return db
        .select()
        .from(sourcingRequests)
        .where(eq(sourcingRequests.status, status))
        .orderBy(desc(sourcingRequests.createdAt))
    }
    return db.select().from(sourcingRequests).orderBy(desc(sourcingRequests.createdAt))
  }

  async get(id: string) {
    const row = await db.select().from(sourcingRequests).where(eq(sourcingRequests.id, id)).limit(1)
    if (!row[0]) throw new HttpException("Sourcing request not found", HttpStatus.NOT_FOUND)
    return row[0]
  }

  /** Create replenishment request when a procurement line gets a selected supplier. */
  async createFromProcurement(input: {
    procurementDecisionId: string
    sku: string
    productName: string
    quantityNeeded: number
    urgency: string
    supplierId: string
    supplierName: string
    supplierEmail?: string
    unitPrice?: number | null
    leadTimeDays?: number | null
    notes?: string
    currentStock?: number
    reorderPoint?: number
  }) {
    const now = new Date()
    const srId = newId("sr")
    const leadDays = input.leadTimeDays ?? 7
    const expectedAt = new Date(now.getTime() + leadDays * 86400000)

    const [sr] = await db
      .insert(sourcingRequests)
      .values({
        id: srId,
        sku: input.sku,
        productName: input.productName,
        currentStock: input.currentStock ?? 0,
        reorderPoint: input.reorderPoint ?? 0,
        quantityNeeded: input.quantityNeeded,
        urgency: priorityToUrgency(input.urgency),
        status: "quoting",
        notes:
          (input.notes ?? "") +
          `\nProcurement decision: ${input.procurementDecisionId}`,
        assignedSupplierId: input.supplierId,
        expectedDeliveryAt: expectedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    let quote = null
    if (input.unitPrice != null && input.unitPrice > 0) {
      const [pq] = await db
        .insert(partnerQuotes)
        .values({
          id: newId("pq"),
          sourcingRequestId: srId,
          supplierId: input.supplierId,
          supplierName: input.supplierName,
          supplierEmail: input.supplierEmail ?? null,
          unitPrice: Math.round(input.unitPrice),
          quantity: input.quantityNeeded,
          leadTimeDays: leadDays,
          notes: "Auto-created from procurement supplier selection",
          status: "accepted",
          submittedAt: now,
          respondedAt: now,
        })
        .returning()
      quote = pq ?? null
    }

    return { sourcingRequest: sr!, partnerQuote: quote }
  }

  /** Open replenishment request (forecast, low stock, manual — no supplier yet). */
  async createOpenRequest(input: {
    sku: string
    productName: string
    quantityNeeded: number
    urgency: string
    notes?: string
    currentStock?: number
    reorderPoint?: number
  }) {
    const sku = input.sku.trim()
    const productName = input.productName.trim()
    if (!sku || !productName) {
      throw new HttpException("sku and productName required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const [sr] = await db
      .insert(sourcingRequests)
      .values({
        id: newId("sr"),
        sku,
        productName,
        currentStock: input.currentStock ?? 0,
        reorderPoint: input.reorderPoint ?? 0,
        quantityNeeded: Math.max(1, Math.round(input.quantityNeeded)),
        urgency: priorityToUrgency(input.urgency),
        status: "open",
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return sr!
  }

  async patch(id: string, patch: { status?: string; notes?: string }) {
    const row = await this.get(id)
    const status = patch.status?.trim()
    const allowed = new Set(["open", "quoting", "ordered", "received", "cancelled", "draft"])
    if (status && !allowed.has(status)) {
      throw new HttpException("Invalid status", HttpStatus.BAD_REQUEST)
    }
    const [updated] = await db
      .update(sourcingRequests)
      .set({
        ...(status ? { status } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(sourcingRequests.id, id))
      .returning()
    return updated!
  }

  async remove(id: string) {
    await this.get(id)
    await db.delete(sourcingRequests).where(eq(sourcingRequests.id, id))
    return { ok: true as const }
  }
}

@Injectable()
export class SourcingInventoryService {
  list() {
    return listSourcingInventory()
  }

  replace(items: SourcingInventoryDto[]) {
    return replaceSourcingInventory(Array.isArray(items) ? items : [])
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/sourcing")
class SourcingAdminController {
  constructor(
    @Inject(SourcingRequestsService) private readonly sourcing: SourcingRequestsService,
    @Inject(SourcingInventoryService) private readonly inventory: SourcingInventoryService,
  ) {}

  @Get("inventory")
  @RequirePerm("sourcing.view", "inventory.view")
  listInventory() {
    return this.inventory.list()
  }

  @Put("inventory")
  @RequirePerm("sourcing.manage", "inventory.edit")
  replaceInventory(@Body() body: SourcingInventoryDto[]) {
    return this.inventory.replace(Array.isArray(body) ? body : [])
  }

  @Get("requests")
  @RequirePerm("sourcing.view")
  list() {
    return this.sourcing.list()
  }

  @Get("requests/:id")
  @RequirePerm("sourcing.view")
  get(@Param("id") id: string) {
    return this.sourcing.get(id)
  }

  @Post("requests/open")
  @RequirePerm("sourcing.manage")
  createOpen(@Body() body: Record<string, unknown>) {
    return this.sourcing.createOpenRequest({
      sku: String(body.sku ?? ""),
      productName: String(body.productName ?? ""),
      quantityNeeded: Number(body.quantityNeeded ?? body.qty) || 1,
      urgency: String(body.urgency ?? body.priority ?? "normal"),
      notes: typeof body.notes === "string" ? body.notes : undefined,
      currentStock: body.currentStock != null ? Number(body.currentStock) : undefined,
      reorderPoint: body.reorderPoint != null ? Number(body.reorderPoint) : undefined,
    })
  }

  @Patch("requests/:id")
  @RequirePerm("sourcing.manage")
  patch(@Param("id") id: string, @Body() body: { status?: string; notes?: string }) {
    return this.sourcing.patch(id, body ?? {})
  }

  @Delete("requests/:id")
  @RequirePerm("sourcing.manage")
  remove(@Param("id") id: string) {
    return this.sourcing.remove(id)
  }

  @Post("requests")
  @RequirePerm("sourcing.manage")
  create(@Body() body: Record<string, unknown>) {
    const sku = String(body.sku ?? "").trim()
    const productName = String(body.productName ?? "").trim()
    const supplierId = String(body.supplierId ?? "").trim()
    const supplierName = String(body.supplierName ?? "").trim()
    if (!sku || !productName || !supplierId || !supplierName) {
      throw new HttpException("sku, productName, supplierId, supplierName required", HttpStatus.BAD_REQUEST)
    }
    return this.sourcing.createFromProcurement({
      procurementDecisionId: String(body.procurementDecisionId ?? "manual"),
      sku,
      productName,
      quantityNeeded: Number(body.quantityNeeded) || 1,
      urgency: String(body.urgency ?? body.priority ?? "normal"),
      supplierId,
      supplierName,
      supplierEmail: typeof body.supplierEmail === "string" ? body.supplierEmail : undefined,
      unitPrice: body.unitPrice != null ? Number(body.unitPrice) : null,
      leadTimeDays: body.leadTimeDays != null ? Number(body.leadTimeDays) : null,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      currentStock: body.currentStock != null ? Number(body.currentStock) : 0,
      reorderPoint: body.reorderPoint != null ? Number(body.reorderPoint) : 0,
    })
  }
}

@Module({
  controllers: [SourcingAdminController],
  providers: [SourcingRequestsService, SourcingInventoryService],
  exports: [SourcingRequestsService, SourcingInventoryService],
})
export class SourcingModule {}

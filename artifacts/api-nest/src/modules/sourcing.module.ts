/**
 * Postgres-backed sourcing requests (replaces CMS-only writes for procurement flow).
 *
 *   GET  /api/v2/admin/sourcing/requests
 *   POST /api/v2/admin/sourcing/requests
 *   GET  /api/v2/admin/sourcing/requests/:id
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
  Post,
  UseGuards,
} from "@nestjs/common"
import { desc, eq } from "drizzle-orm"
import { db, partnerQuotes, sourcingRequests } from "@workspace/db"
import { newId } from "../common/repository"
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
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/sourcing")
class SourcingAdminController {
  constructor(@Inject(SourcingRequestsService) private readonly sourcing: SourcingRequestsService) {}

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
  providers: [SourcingRequestsService],
  exports: [SourcingRequestsService],
})
export class SourcingModule {}

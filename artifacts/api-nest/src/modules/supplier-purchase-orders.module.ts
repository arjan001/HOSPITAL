/**
 * Supplier purchase orders — Postgres-backed POs linked to cms supplier ids.
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
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { desc, eq } from "drizzle-orm"
import {
  db,
  purchaseOrderLines,
  purchaseOrders,
} from "@workspace/db"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { newId } from "../common/repository"

type PoLineInput = { name?: string; qty?: number; unitPrice?: number }
type CreatePoBody = {
  supplierId?: string
  items?: PoLineInput[]
  expectedDate?: string | null
  notes?: string
  status?: string
}

type PoDto = {
  id: string
  supplierId: string
  poNumber: string
  status: string
  total: number
  expectedDate: string | null
  notes: string | null
  createdBy: string | null
  items: Array<{ id: string; name: string; qty: number; unitPrice: number }>
  createdAt: string
  updatedAt: string
}

function lineTotal(items: PoLineInput[]): number {
  return items.reduce((sum, it) => {
    const qty = Math.max(1, Math.round(Number(it.qty ?? 1)))
    const unit = Math.max(0, Math.round(Number(it.unitPrice ?? 0)))
    return sum + qty * unit
  }, 0)
}

function normalizeLines(items: PoLineInput[]) {
  return (Array.isArray(items) ? items : [])
    .filter((it) => String(it.name ?? "").trim())
    .map((it, idx) => ({
      id: newId("pol"),
      name: String(it.name).trim(),
      qty: Math.max(1, Math.round(Number(it.qty ?? 1))),
      unitPrice: Math.max(0, Math.round(Number(it.unitPrice ?? 0))),
      sortOrder: idx,
    }))
}

@Injectable()
class SupplierPurchaseOrdersService {
  private toDto(
    row: typeof purchaseOrders.$inferSelect,
    lines: Array<typeof purchaseOrderLines.$inferSelect>,
  ): PoDto {
    return {
      id: row.id,
      supplierId: row.supplierId,
      poNumber: row.poNumber,
      status: row.status,
      total: row.total,
      expectedDate: row.expectedDate?.toISOString() ?? null,
      notes: row.notes ?? null,
      createdBy: row.createdBy ?? null,
      items: lines.map((l) => ({
        id: l.id,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async list(supplierId?: string): Promise<PoDto[]> {
    const rows = supplierId
      ? await db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.supplierId, supplierId))
          .orderBy(desc(purchaseOrders.createdAt))
      : await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt))
    const out: PoDto[] = []
    for (const row of rows) {
      const lines = await db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.purchaseOrderId, row.id))
        .orderBy(purchaseOrderLines.sortOrder)
      out.push(this.toDto(row, lines))
    }
    return out
  }

  async supplierStats(supplierId: string) {
    const rows = await db
      .select({
        status: purchaseOrders.status,
        total: purchaseOrders.total,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.supplierId, supplierId))
    const active = rows.filter((r) => !["received", "cancelled", "disputed"].includes(r.status))
    return {
      activePoCount: active.length,
      totalPoValue: rows.reduce((s, r) => s + (r.total || 0), 0),
    }
  }

  async create(body: CreatePoBody, createdBy?: string): Promise<PoDto> {
    const supplierId = String(body.supplierId ?? "").trim()
    if (!supplierId) {
      throw new HttpException("supplierId is required", HttpStatus.BAD_REQUEST)
    }
    const items = normalizeLines(body.items ?? [])
    if (items.length === 0) {
      throw new HttpException("At least one line item is required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`
    const total = lineTotal(items)
    const id = newId("po")
    const [row] = await db
      .insert(purchaseOrders)
      .values({
        id,
        supplierId,
        poNumber,
        status: body.status === "sent" ? "sent" : "draft",
        total,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes?.trim() || null,
        createdBy: createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    await db.insert(purchaseOrderLines).values(
      items.map((it) => ({
        ...it,
        purchaseOrderId: id,
      })),
    )
    const lines = await db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, id))
    return this.toDto(row, lines)
  }

  async updateStatus(id: string, status: string): Promise<PoDto> {
    const allowed = new Set(["draft", "sent", "confirmed", "dispatched", "received", "disputed", "cancelled"])
    if (!allowed.has(status)) {
      throw new HttpException("Invalid status", HttpStatus.BAD_REQUEST)
    }
    const [row] = await db
      .update(purchaseOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning()
    if (!row) throw new HttpException("PO not found", HttpStatus.NOT_FOUND)
    const lines = await db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, id))
    return this.toDto(row, lines)
  }
}

@UseGuards(AdminGuard)
@RequirePerm("suppliers.manage", "procurement.manage")
@Controller("admin/supplier-purchase-orders")
class SupplierPurchaseOrdersController {
  constructor(@Inject(SupplierPurchaseOrdersService) private readonly svc: SupplierPurchaseOrdersService) {}

  @Get()
  list(@Query("supplierId") supplierId?: string) {
    return this.svc.list(supplierId?.trim() || undefined)
  }

  @Get("stats")
  stats(@Query("supplierId") supplierId: string) {
    if (!supplierId?.trim()) {
      throw new HttpException("supplierId query required", HttpStatus.BAD_REQUEST)
    }
    return this.svc.supplierStats(supplierId.trim())
  }

  @Post()
  create(@Req() req: Request, @Body() body: CreatePoBody) {
    const who = (req as Request & { adminUser?: { email?: string } }).adminUser?.email
    return this.svc.create(body ?? {}, who)
  }

  @Put(":id/status")
  patchStatus(@Param("id") id: string, @Body() body: { status?: string }) {
    return this.svc.updateStatus(id, String(body?.status ?? ""))
  }
}

@Module({
  controllers: [SupplierPurchaseOrdersController],
  providers: [SupplierPurchaseOrdersService],
  exports: [SupplierPurchaseOrdersService],
})
export class SupplierPurchaseOrdersModule {}

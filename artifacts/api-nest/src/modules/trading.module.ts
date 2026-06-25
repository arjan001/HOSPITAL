/**
 * Postgres-backed B2B trading (deals, bids, negotiations, settlements).
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
  UseGuards,
} from "@nestjs/common"
import { desc, eq } from "drizzle-orm"
import {
  db,
  tradingBids,
  tradingDeals,
  tradingNegotiations,
  tradingSettlements,
} from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, RequirePerm } from "../common/admin-guard"

function dealDto(row: typeof tradingDeals.$inferSelect) {
  return {
    id: row.id,
    ref: row.ref,
    sku: row.sku ?? "",
    product: row.product,
    supplier: row.supplier,
    qty: row.qty,
    unit: row.unit,
    targetPrice: row.targetPrice,
    awardedPrice: row.awardedPrice,
    currency: row.currency,
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
  }
}

function bidDto(row: typeof tradingBids.$inferSelect) {
  return {
    id: row.id,
    dealRef: row.dealRef,
    supplier: row.supplier,
    unitPrice: row.unitPrice,
    currency: row.currency,
    moq: row.moq,
    leadDays: row.leadDays,
    note: row.note ?? "",
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
  }
}

function negDto(row: typeof tradingNegotiations.$inferSelect) {
  return {
    id: row.id,
    dealRef: row.dealRef,
    supplier: row.supplier,
    round: row.round as 1 | 2,
    ourOffer: row.ourOffer,
    theirCounter: row.theirCounter,
    currency: row.currency,
    floor: row.floor,
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
  }
}

function settleDto(row: typeof tradingSettlements.$inferSelect) {
  return {
    id: row.id,
    dealRef: row.dealRef,
    supplier: row.supplier,
    poNumber: row.poNumber,
    linkedPurchaseOrderId: row.linkedPurchaseOrderId ?? "",
    invoiceNumber: row.invoiceNumber ?? "",
    poValue: row.poValue,
    invoiceValue: row.invoiceValue,
    currency: row.currency,
    matchStatus: row.matchStatus,
    paymentStatus: row.paymentStatus,
    dueDate: row.dueDate ?? "",
    settledAt: row.settledAt ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
  }
}

@Injectable()
class TradingService {
  async listDeals() {
    const rows = await db.select().from(tradingDeals).orderBy(desc(tradingDeals.createdAt))
    return rows.map(dealDto)
  }

  async createDeal(body: Record<string, unknown>) {
    const ref = String(body.ref ?? "").trim()
    const product = String(body.product ?? "").trim()
    const supplier = String(body.supplier ?? "").trim()
    if (!ref || !product || !supplier) {
      throw new HttpException("ref, product, supplier required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const [row] = await db.insert(tradingDeals).values({
      id: newId("td"),
      ref,
      sku: typeof body.sku === "string" && body.sku.trim() ? body.sku.trim() : null,
      product,
      supplier,
      qty: Math.max(1, Math.round(Number(body.qty) || 1)),
      unit: String(body.unit ?? "packs").trim() || "packs",
      targetPrice: Number(body.targetPrice) || 0,
      awardedPrice: Number(body.awardedPrice) || 0,
      currency: String(body.currency ?? "KES").trim() || "KES",
      status: String(body.status ?? "open"),
      notes: typeof body.notes === "string" ? body.notes : null,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return dealDto(row!)
  }

  /** Create an open deal from a margin-scan recommendation (pipeline → trading). */
  async createDealFromMargin(body: Record<string, unknown>) {
    const sku = String(body.sku ?? "").trim()
    const recommendedPrice = Number(body.recommendedPrice ?? body.targetPrice)
    if (!sku || !Number.isFinite(recommendedPrice) || recommendedPrice <= 0) {
      throw new HttpException("sku and recommendedPrice required", HttpStatus.BAD_REQUEST)
    }
    const product = String(body.product ?? body.productName ?? sku).trim() || sku
    const supplier = String(body.supplier ?? "TBD").trim() || "TBD"
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const ref = String(body.ref ?? `MARG-${sku}-${stamp}`).trim()
    const notes =
      typeof body.notes === "string"
        ? body.notes
        : `Auto-created from margin scan (target ${Number(body.targetMarginPct) || 25}%)`
    return this.createDeal({
      ref,
      sku,
      product,
      supplier,
      qty: body.qty ?? 1,
      unit: body.unit ?? "packs",
      targetPrice: recommendedPrice,
      currency: body.currency ?? "KES",
      status: "open",
      notes,
    })
  }

  async patchDeal(id: string, body: Record<string, unknown>) {
    const set: Partial<typeof tradingDeals.$inferInsert> = { updatedAt: new Date() }
    if (body.status !== undefined) set.status = String(body.status)
    if (body.awardedPrice !== undefined) set.awardedPrice = Number(body.awardedPrice)
    if (body.notes !== undefined) set.notes = String(body.notes)
    const [row] = await db.update(tradingDeals).set(set).where(eq(tradingDeals.id, id)).returning()
    if (!row) throw new HttpException("Deal not found", HttpStatus.NOT_FOUND)
    return dealDto(row)
  }

  async removeDeal(id: string) {
    const [row] = await db.select().from(tradingDeals).where(eq(tradingDeals.id, id)).limit(1)
    if (!row) throw new HttpException("Deal not found", HttpStatus.NOT_FOUND)
    await db.delete(tradingDeals).where(eq(tradingDeals.id, id))
    return { ok: true as const }
  }

  async listBids() {
    const rows = await db.select().from(tradingBids).orderBy(desc(tradingBids.submittedAt))
    return rows.map(bidDto)
  }

  async createBid(body: Record<string, unknown>) {
    const dealRef = String(body.dealRef ?? "").trim()
    const supplier = String(body.supplier ?? "").trim()
    if (!dealRef || !supplier) {
      throw new HttpException("dealRef and supplier required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const [row] = await db.insert(tradingBids).values({
      id: newId("tb"),
      dealRef,
      supplier,
      unitPrice: Number(body.unitPrice) || 0,
      currency: String(body.currency ?? "KES"),
      moq: Math.max(1, Math.round(Number(body.moq) || 1)),
      leadDays: Math.max(1, Math.round(Number(body.leadDays) || 7)),
      note: typeof body.note === "string" ? body.note : null,
      status: String(body.status ?? "pending"),
      submittedAt: now,
      updatedAt: now,
    }).returning()
    return bidDto(row!)
  }

  async patchBid(id: string, body: Record<string, unknown>) {
    const set: Partial<typeof tradingBids.$inferInsert> = { updatedAt: new Date() }
    if (body.status !== undefined) set.status = String(body.status)
    if (body.unitPrice !== undefined) set.unitPrice = Number(body.unitPrice)
    const [row] = await db.update(tradingBids).set(set).where(eq(tradingBids.id, id)).returning()
    if (!row) throw new HttpException("Bid not found", HttpStatus.NOT_FOUND)
    return bidDto(row)
  }

  async removeBid(id: string) {
    await db.delete(tradingBids).where(eq(tradingBids.id, id))
    return { ok: true as const }
  }

  async listNegotiations() {
    const rows = await db.select().from(tradingNegotiations).orderBy(desc(tradingNegotiations.createdAt))
    return rows.map(negDto)
  }

  async createNegotiation(body: Record<string, unknown>) {
    const dealRef = String(body.dealRef ?? "").trim()
    const supplier = String(body.supplier ?? "").trim()
    if (!dealRef || !supplier) {
      throw new HttpException("dealRef and supplier required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const [row] = await db.insert(tradingNegotiations).values({
      id: newId("tn"),
      dealRef,
      supplier,
      round: Math.min(2, Math.max(1, Math.round(Number(body.round) || 1))),
      ourOffer: Number(body.ourOffer) || 0,
      theirCounter: Number(body.theirCounter) || 0,
      currency: String(body.currency ?? "KES"),
      floor: Number(body.floor) || 0,
      status: String(body.status ?? "pending"),
      notes: typeof body.notes === "string" ? body.notes : null,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return negDto(row!)
  }

  async patchNegotiation(id: string, body: Record<string, unknown>) {
    const set: Partial<typeof tradingNegotiations.$inferInsert> = { updatedAt: new Date() }
    if (body.status !== undefined) set.status = String(body.status)
    if (body.theirCounter !== undefined) set.theirCounter = Number(body.theirCounter)
    const [row] = await db.update(tradingNegotiations).set(set).where(eq(tradingNegotiations.id, id)).returning()
    if (!row) throw new HttpException("Negotiation not found", HttpStatus.NOT_FOUND)
    return negDto(row)
  }

  async removeNegotiation(id: string) {
    await db.delete(tradingNegotiations).where(eq(tradingNegotiations.id, id))
    return { ok: true as const }
  }

  async listSettlements() {
    const rows = await db.select().from(tradingSettlements).orderBy(desc(tradingSettlements.createdAt))
    return rows.map(settleDto)
  }

  async createSettlement(body: Record<string, unknown>) {
    const dealRef = String(body.dealRef ?? "").trim()
    const poNumber = String(body.poNumber ?? "").trim()
    if (!dealRef || !poNumber) {
      throw new HttpException("dealRef and poNumber required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const [row] = await db.insert(tradingSettlements).values({
      id: newId("ts"),
      dealRef,
      supplier: String(body.supplier ?? "").trim(),
      poNumber,
      linkedPurchaseOrderId:
        typeof body.linkedPurchaseOrderId === "string" && body.linkedPurchaseOrderId.trim()
          ? body.linkedPurchaseOrderId.trim()
          : null,
      invoiceNumber: typeof body.invoiceNumber === "string" ? body.invoiceNumber : null,
      poValue: Number(body.poValue) || 0,
      invoiceValue: Number(body.invoiceValue) || 0,
      currency: String(body.currency ?? "KES"),
      matchStatus: String(body.matchStatus ?? "pending"),
      paymentStatus: String(body.paymentStatus ?? "unpaid"),
      dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
      settledAt: typeof body.settledAt === "string" ? body.settledAt : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      createdAt: now,
      updatedAt: now,
    }).returning()
    return settleDto(row!)
  }

  async patchSettlement(id: string, body: Record<string, unknown>) {
    const set: Partial<typeof tradingSettlements.$inferInsert> = { updatedAt: new Date() }
    if (body.matchStatus !== undefined) set.matchStatus = String(body.matchStatus)
    if (body.paymentStatus !== undefined) set.paymentStatus = String(body.paymentStatus)
    if (body.settledAt !== undefined) set.settledAt = String(body.settledAt)
    if (body.linkedPurchaseOrderId !== undefined) {
      set.linkedPurchaseOrderId =
        typeof body.linkedPurchaseOrderId === "string" && body.linkedPurchaseOrderId.trim()
          ? body.linkedPurchaseOrderId.trim()
          : null
    }
    const [row] = await db.update(tradingSettlements).set(set).where(eq(tradingSettlements.id, id)).returning()
    if (!row) throw new HttpException("Settlement not found", HttpStatus.NOT_FOUND)
    return settleDto(row)
  }

  async removeSettlement(id: string) {
    await db.delete(tradingSettlements).where(eq(tradingSettlements.id, id))
    return { ok: true as const }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/trading")
class TradingAdminController {
  constructor(@Inject(TradingService) private readonly svc: TradingService) {}

  @Get("deals")
  @RequirePerm("sourcing.view", "sourcing.manage")
  listDeals() {
    return this.svc.listDeals()
  }

  @Post("deals")
  @RequirePerm("sourcing.manage")
  createDeal(@Body() body: Record<string, unknown>) {
    return this.svc.createDeal(body ?? {})
  }

  @Post("deals/from-margin")
  @RequirePerm("sourcing.manage")
  createDealFromMargin(@Body() body: Record<string, unknown>) {
    return this.svc.createDealFromMargin(body ?? {})
  }

  @Patch("deals/:id")
  @RequirePerm("sourcing.manage")
  patchDeal(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.patchDeal(id, body ?? {})
  }

  @Delete("deals/:id")
  @RequirePerm("sourcing.manage")
  removeDeal(@Param("id") id: string) {
    return this.svc.removeDeal(id)
  }

  @Get("bids")
  @RequirePerm("sourcing.view", "sourcing.manage")
  listBids() {
    return this.svc.listBids()
  }

  @Post("bids")
  @RequirePerm("sourcing.manage")
  createBid(@Body() body: Record<string, unknown>) {
    return this.svc.createBid(body ?? {})
  }

  @Patch("bids/:id")
  @RequirePerm("sourcing.manage")
  patchBid(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.patchBid(id, body ?? {})
  }

  @Delete("bids/:id")
  @RequirePerm("sourcing.manage")
  removeBid(@Param("id") id: string) {
    return this.svc.removeBid(id)
  }

  @Get("negotiations")
  @RequirePerm("sourcing.view", "sourcing.manage")
  listNegotiations() {
    return this.svc.listNegotiations()
  }

  @Post("negotiations")
  @RequirePerm("sourcing.manage")
  createNegotiation(@Body() body: Record<string, unknown>) {
    return this.svc.createNegotiation(body ?? {})
  }

  @Patch("negotiations/:id")
  @RequirePerm("sourcing.manage")
  patchNegotiation(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.patchNegotiation(id, body ?? {})
  }

  @Delete("negotiations/:id")
  @RequirePerm("sourcing.manage")
  removeNegotiation(@Param("id") id: string) {
    return this.svc.removeNegotiation(id)
  }

  @Get("settlements")
  @RequirePerm("sourcing.view", "sourcing.manage")
  listSettlements() {
    return this.svc.listSettlements()
  }

  @Post("settlements")
  @RequirePerm("sourcing.manage")
  createSettlement(@Body() body: Record<string, unknown>) {
    return this.svc.createSettlement(body ?? {})
  }

  @Patch("settlements/:id")
  @RequirePerm("sourcing.manage")
  patchSettlement(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.patchSettlement(id, body ?? {})
  }

  @Delete("settlements/:id")
  @RequirePerm("sourcing.manage")
  removeSettlement(@Param("id") id: string) {
    return this.svc.removeSettlement(id)
  }
}

@Module({
  controllers: [TradingAdminController],
  providers: [TradingService],
  exports: [TradingService],
})
export class TradingModule {}

/**
 * Post-delivery customer feedback — rating, NPS, comment per order.
 *
 * Routes:
 *   POST /api/v2/me/orders/:orderNo/feedback   — submit feedback (session)
 *   GET  /api/v2/me/orders/:orderNo/feedback   — check if submitted
 *   GET  /api/v2/admin/feedback                — list all feedback (admin)
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
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq } from "drizzle-orm"
import {
  adminOrders as adminOrdersTable,
  db,
  deliveryFeedback,
  logisticsDeliveries,
  orders as ordersTable,
} from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"
import { AdminGuard, AnyAdmin, RequirePerm } from "../common/admin-guard"

export type DeliveryFeedbackDto = {
  id: string
  orderRef: string
  userId: string | null
  deliveryId: string | null
  rating: number
  nps: number | null
  comment: string | null
  createdAt: string
}

function mapRow(row: typeof deliveryFeedback.$inferSelect): DeliveryFeedbackDto {
  return {
    id: row.id,
    orderRef: row.orderRef,
    userId: row.userId,
    deliveryId: row.deliveryId,
    rating: row.rating,
    nps: row.nps,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  }
}

@Injectable()
export class CustomerFeedbackService {
  private async assertDelivered(orderRef: string): Promise<string | null> {
    const ref = orderRef.trim()
    const [delivery] = await db
      .select({ id: logisticsDeliveries.id })
      .from(logisticsDeliveries)
      .where(and(eq(logisticsDeliveries.orderRef, ref), eq(logisticsDeliveries.status, "delivered")))
      .limit(1)
    if (delivery) return delivery.id

    const [admin] = await db
      .select({ id: adminOrdersTable.id })
      .from(adminOrdersTable)
      .where(and(eq(adminOrdersTable.orderNo, ref), eq(adminOrdersTable.status, "delivered")))
      .limit(1)
    if (admin) return null

    throw new HttpException("Order is not delivered yet", HttpStatus.BAD_REQUEST)
  }

  private async assertOwnedOrder(uid: string, orderNo: string) {
    const [row] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.userId, uid), eq(ordersTable.orderNumber, orderNo)))
      .limit(1)
    if (!row) throw new HttpException("Order not found", HttpStatus.NOT_FOUND)
    return row
  }

  async submit(
    sid: string,
    orderNo: string,
    input: { rating?: number; nps?: number; comment?: string },
  ): Promise<DeliveryFeedbackDto> {
    const uid = await ensureUserId(sid)
    const ref = orderNo.trim()
    if (!ref) throw new HttpException("orderNo is required", HttpStatus.BAD_REQUEST)

    await this.assertOwnedOrder(uid, ref)
    const deliveryId = await this.assertDelivered(ref)

    const rating = Math.round(Number(input.rating))
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new HttpException("rating must be 1–5", HttpStatus.BAD_REQUEST)
    }
    const npsRaw = input.nps
    const nps =
      npsRaw === undefined || npsRaw === null
        ? null
        : Math.round(Number(npsRaw))
    if (nps !== null && (!Number.isFinite(nps) || nps < 0 || nps > 10)) {
      throw new HttpException("nps must be 0–10", HttpStatus.BAD_REQUEST)
    }

    const existing = await db
      .select()
      .from(deliveryFeedback)
      .where(eq(deliveryFeedback.orderRef, ref))
      .limit(1)
    if (existing[0]) {
      throw new HttpException("Feedback already submitted for this order", HttpStatus.CONFLICT)
    }

    const id = newId("fdbk")
    const now = new Date()
    await db.insert(deliveryFeedback).values({
      id,
      orderRef: ref,
      userId: uid,
      deliveryId,
      rating,
      nps,
      comment: input.comment?.trim() || null,
      createdAt: now,
    })
    const [row] = await db.select().from(deliveryFeedback).where(eq(deliveryFeedback.id, id)).limit(1)
    return mapRow(row!)
  }

  async getForOrder(sid: string, orderNo: string): Promise<DeliveryFeedbackDto | null> {
    const uid = await ensureUserId(sid)
    const ref = orderNo.trim()
    await this.assertOwnedOrder(uid, ref)
    const [row] = await db
      .select()
      .from(deliveryFeedback)
      .where(eq(deliveryFeedback.orderRef, ref))
      .limit(1)
    return row ? mapRow(row) : null
  }

  async listAdmin(): Promise<{ items: DeliveryFeedbackDto[]; avgRating: number; npsScore: number | null }> {
    const rows = await db.select().from(deliveryFeedback).orderBy(desc(deliveryFeedback.createdAt))
    const items = rows.map(mapRow)
    const avgRating =
      items.length > 0 ? items.reduce((s, i) => s + i.rating, 0) / items.length : 0
    const withNps = items.filter((i) => i.nps !== null)
    const promoters = withNps.filter((i) => (i.nps ?? 0) >= 9).length
    const detractors = withNps.filter((i) => (i.nps ?? 0) <= 6).length
    const npsScore =
      withNps.length > 0
        ? Math.round(((promoters - detractors) / withNps.length) * 100)
        : null
    return { items, avgRating: Math.round(avgRating * 10) / 10, npsScore }
  }
}

@Controller("me/orders")
class MeFeedbackController {
  constructor(@Inject(CustomerFeedbackService) private readonly feedback: CustomerFeedbackService) {}

  @Get(":orderNo/feedback")
  async get(@Req() req: Request, @Param("orderNo") orderNo: string) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.feedback.getForOrder(sid, orderNo)
  }

  @Post(":orderNo/feedback")
  async post(
    @Req() req: Request,
    @Param("orderNo") orderNo: string,
    @Body() body: { rating?: number; nps?: number; comment?: string },
  ) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.feedback.submit(sid, orderNo, body ?? {})
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/feedback")
class AdminFeedbackController {
  constructor(@Inject(CustomerFeedbackService) private readonly feedback: CustomerFeedbackService) {}

  @Get()
  @RequirePerm("delivery.manage")
  list() {
    return this.feedback.listAdmin()
  }
}

@Module({
  controllers: [MeFeedbackController, AdminFeedbackController],
  providers: [CustomerFeedbackService],
  exports: [CustomerFeedbackService],
})
export class CustomerFeedbackModule {}

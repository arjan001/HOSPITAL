/**
 * Orders module — customer order management (Postgres-backed).
 *
 * Routes (all scoped to the session cookie / req.sessionId):
 *   GET  /api/v2/me/orders          — list all orders for the session
 *   GET  /api/v2/me/orders/:id      — fetch a specific order
 *   POST /api/v2/me/orders          — place a new order
 *
 * Data model:
 *   One row in `orders` per order (keyed by `userId`, resolved from the session
 *   via common/session-user.ts) plus one row per line item in `order_items`.
 *   Money is stored as whole-KSh integers.
 *
 * Order lifecycle:
 *   pending → paid (after Paystack callback) → fulfilled (after dispatch) | cancelled
 *   The lifecycle status string is stored verbatim in `orders.status`.
 *
 * Note on @Inject(OrdersService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
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
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db, orders as ordersTable, orderItems as orderItemsTable } from "@workspace/db"
import { ensureUserId } from "../common/session-user"
import { newId } from "../common/repository"

export type OrderLine = {
  productSlug: string
  name: string
  unitPrice: number
  quantity: number
}

export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled"
export type PaymentMethod = "mpesa" | "card" | "cod" | "unknown"

export type Order = {
  id: string
  number: string
  items: OrderLine[]
  subtotal: number
  deliveryFee: number
  total: number
  currency: "KSH"
  status: OrderStatus
  paymentMethod: PaymentMethod
  customer: { fullName: string; phone: string; email: string }
  shippingAddress: { line1: string; line2?: string; city: string; region: string }
  createdAt: string
}

type OrderInput = {
  items?: Array<Partial<OrderLine>>
  deliveryFee?: number
  paymentMethod?: PaymentMethod
  customer?: Partial<Order["customer"]>
  shippingAddress?: Partial<Order["shippingAddress"]>
}

function toLine(raw: Partial<OrderLine>): OrderLine {
  return {
    productSlug: String(raw.productSlug ?? ""),
    name: String(raw.name ?? ""),
    unitPrice: Math.max(0, Number(raw.unitPrice ?? 0)),
    quantity: Math.max(1, Math.floor(Number(raw.quantity ?? 1))),
  }
}

function toOrder(row: typeof ordersTable.$inferSelect, items: (typeof orderItemsTable.$inferSelect)[]): Order {
  return {
    id: row.id,
    number: row.orderNumber,
    items: items.map((i) => ({
      productSlug: i.productSlug,
      name: i.productName,
      unitPrice: i.unitPrice,
      quantity: i.qty,
    })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    currency: "KSH",
    status: (row.status as OrderStatus) ?? "pending",
    paymentMethod: (row.paymentMethod as PaymentMethod) ?? "unknown",
    customer: {
      fullName: row.customerName,
      phone: row.customerPhone,
      email: row.customerEmail ?? "",
    },
    shippingAddress: {
      line1: row.shippingLine1,
      line2: row.shippingLine2 ?? undefined,
      city: row.shippingCity,
      region: row.shippingRegion,
    },
    createdAt: row.placedAt.toISOString(),
  }
}

@Injectable()
class OrdersService {
  private async itemsFor(orderIds: string[]): Promise<Map<string, (typeof orderItemsTable.$inferSelect)[]>> {
    const map = new Map<string, (typeof orderItemsTable.$inferSelect)[]>()
    if (orderIds.length === 0) return map
    const rows = await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds))
    for (const r of rows) {
      const list = map.get(r.orderId) ?? []
      list.push(r)
      map.set(r.orderId, list)
    }
    return map
  }

  async list(sid: string): Promise<Order[]> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, uid))
      .orderBy(desc(ordersTable.placedAt))
    const items = await this.itemsFor(rows.map((r) => r.id))
    return rows.map((r) => toOrder(r, items.get(r.id) ?? []))
  }

  async get(sid: string, id: string): Promise<Order> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, uid)))
      .limit(1)
    if (!rows[0]) throw new HttpException("Order not found", HttpStatus.NOT_FOUND)
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id))
    return toOrder(rows[0], items)
  }

  async create(sid: string, data: OrderInput): Promise<Order> {
    const uid = await ensureUserId(sid)
    const items = (data.items ?? []).map(toLine).filter((i) => i.productSlug && i.unitPrice > 0)
    if (items.length === 0) {
      throw new HttpException("Order must have at least one item", HttpStatus.BAD_REQUEST)
    }
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const deliveryFee = Math.max(0, Number(data.deliveryFee ?? 0))
    const total = subtotal + deliveryFee
    const id = newId("ord")
    const orderNumber = `SHX-${Date.now().toString(36).toUpperCase()}`
    const method = data.paymentMethod ?? "unknown"
    // orders.paymentMethod is NOT NULL and our schema's PaymentMethod union does
    // not include "unknown"; store the literal so the API round-trips, defaulting
    // a missing method to "cod" so the column constraint is always satisfied.
    const storedMethod = method === "unknown" ? "cod" : method
    const [row] = await db
      .insert(ordersTable)
      .values({
        id,
        orderNumber,
        userId: uid,
        status: "pending",
        paymentMethod: storedMethod,
        paymentStatus: "pending",
        customerName: String(data.customer?.fullName ?? ""),
        customerPhone: String(data.customer?.phone ?? ""),
        customerEmail: String(data.customer?.email ?? "") || null,
        shippingLine1: String(data.shippingAddress?.line1 ?? ""),
        shippingLine2: data.shippingAddress?.line2 ? String(data.shippingAddress.line2) : null,
        shippingCity: String(data.shippingAddress?.city ?? ""),
        shippingRegion: String(data.shippingAddress?.region ?? ""),
        subtotal,
        deliveryFee,
        total,
      })
      .returning()
    await db.insert(orderItemsTable).values(
      items.map((i) => ({
        id: newId("oitem"),
        orderId: id,
        productSlug: i.productSlug,
        productName: i.name,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        total: i.unitPrice * i.quantity,
      })),
    )
    // Return the API's original shape (method echoes the request, incl. "unknown").
    return { ...toOrder(row, []), items, paymentMethod: method }
  }
}

@Controller("me/orders")
class OrdersController {
  constructor(@Inject(OrdersService) private readonly svc: OrdersService) {}

  @Get()
  list(@Req() req: Request) {
    return this.svc.list(req.sessionId)
  }

  @Get(":id")
  get(@Req() req: Request, @Param("id") id: string) {
    return this.svc.get(req.sessionId, id)
  }

  @Post()
  create(@Req() req: Request, @Body() body: OrderInput) {
    return this.svc.create(req.sessionId, body ?? {})
  }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

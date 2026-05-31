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
  Query,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, ilike, inArray } from "drizzle-orm"
import { db, orders as ordersTable, orderItems as orderItemsTable } from "@workspace/db"
import { ensureUserId } from "../common/session-user"
import { newId } from "../common/repository"
import { AdminOrdersModule, AdminOrdersService } from "./admin-orders.module"

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
  /** Caller-supplied order number (the one shown to the customer). When present it
   *  is stored verbatim so the confirmation screen, admin feed and tracking all
   *  agree; otherwise a SHX- number is generated. */
  orderNumber?: string
  /** True when payment has already been confirmed (Paystack M-Pesa / card). Stores
   *  the order as paid/confirmed instead of pending. */
  paid?: boolean
  items?: Array<Partial<OrderLine>>
  deliveryFee?: number
  paymentMethod?: PaymentMethod
  customer?: Partial<Order["customer"]>
  shippingAddress?: Partial<Order["shippingAddress"]>
  /** Optional payment + fulfilment detail, mirrored into the admin Sales & Orders
   *  feed so the pharmacy sees the M-Pesa receipt, payer phone and delivery note. */
  mpesaCode?: string
  mpesaPhone?: string
  /** Gateway transaction reference (Paystack reference, for M-Pesa-via-Paystack
   *  and card). Mirrored into the admin feed so staff can reconcile the payment. */
  paymentRef?: string
  specialInstructions?: string
}

/** Public order-tracking shape (matches the storefront track-order page). */
export type TrackedOrder = {
  id: string
  orderNumber: string
  customer: string
  phone: string
  email: string
  items: Array<{ name: string; qty: number; price: number; variation?: string }>
  subtotal: number
  deliveryFee: number
  total: number
  location: string
  address: string
  status: "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled"
  paymentMethod: PaymentMethod
  createdAt: string
}

/** Map the stored lifecycle status to the customer-facing tracking status. */
function toTrackStatus(s?: string | null): TrackedOrder["status"] {
  switch ((s ?? "").toLowerCase()) {
    case "paid":
    case "confirmed":
      return "confirmed"
    case "dispatched":
      return "dispatched"
    case "fulfilled":
    case "delivered":
      return "delivered"
    case "cancelled":
      return "cancelled"
    default:
      return "pending"
  }
}

function toTrackedOrder(
  row: typeof ordersTable.$inferSelect,
  items: (typeof orderItemsTable.$inferSelect)[],
): TrackedOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customer: row.customerName,
    phone: row.customerPhone,
    email: row.customerEmail ?? "",
    items: items.map((i) => ({ name: i.productName, qty: i.qty, price: i.unitPrice })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    location: row.shippingCity || row.shippingRegion || "",
    address: [row.shippingLine1, row.shippingLine2].filter(Boolean).join(", "),
    status: toTrackStatus(row.status),
    paymentMethod: (row.paymentMethod as PaymentMethod) ?? "cod",
    createdAt: row.placedAt.toISOString(),
  }
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
  constructor(
    @Inject(AdminOrdersService) private readonly adminOrders: AdminOrdersService,
  ) {}

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
    const provided =
      typeof data.orderNumber === "string"
        ? data.orderNumber.trim().replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 40)
        : ""
    const orderNumber = provided || `SHX-${Date.now().toString(36).toUpperCase()}`
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
        status: data.paid ? "paid" : "pending",
        paymentMethod: storedMethod,
        paymentStatus: data.paid ? "paid" : "pending",
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
    // Mirror into the admin Sales & Orders feed (the global pharmacy view).
    // This runs server-side so it works in production WITHOUT the guest holding
    // an admin token — the storefront's client-side write to /admin/orders is
    // rejected by AdminGuard in prod (fails closed) and silently swallowed.
    // Best-effort: a mirror failure must never fail the customer's order.
    try {
      await this.adminOrders.upsert({
        orderNo: orderNumber,
        customer: String(data.customer?.fullName ?? ""),
        phone: String(data.customer?.phone ?? ""),
        email: String(data.customer?.email ?? ""),
        items: items.map((i) => ({ name: i.name, qty: i.quantity, price: i.unitPrice })),
        subtotal,
        delivery: deliveryFee,
        total,
        location: String(data.shippingAddress?.city ?? data.shippingAddress?.region ?? ""),
        address: [
          data.shippingAddress?.line1,
          data.shippingAddress?.line2,
          data.shippingAddress?.city,
          data.shippingAddress?.region,
        ]
          .filter(Boolean)
          .join(", "),
        status: data.paid ? "confirmed" : "pending",
        orderedVia: "website",
        paymentMethod: storedMethod,
        mpesaCode: data.mpesaCode ? String(data.mpesaCode) : undefined,
        mpesaPhone: data.mpesaPhone
          ? String(data.mpesaPhone)
          : String(data.customer?.phone ?? "") || undefined,
        paymentRef: data.paymentRef ? String(data.paymentRef) : undefined,
        specialInstructions: data.specialInstructions
          ? String(data.specialInstructions)
          : undefined,
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[orders] admin Sales & Orders mirror failed", err)
    }

    // Return the API's original shape (method echoes the request, incl. "unknown").
    return { ...toOrder(row, []), items, paymentMethod: method }
  }

  /**
   * Server-side reconciliation: mark an order PAID once a payment provider
   * (Paystack) confirms its charge — independent of any browser.
   *
   * Why this exists: the storefront's pending→paid transition used to run ONLY
   * in the customer's tab (poll `/status` → success → POST `/me/orders`). If the
   * tab closed, lost the network, or the modal timed out before that fired, the
   * captured payment was orphaned — money taken, but the order stuck at pending
   * and invisible to the pharmacy. This path is driven by the Paystack webhook
   * (and the lazy `/status` re-verify), so a confirmed charge ALWAYS advances the
   * order and surfaces it to admin. Idempotent: a re-delivered webhook just
   * re-writes the same paid state.
   */
  async reconcilePaid(input: {
    orderNumber: string
    paymentRef?: string
    mpesaReceipt?: string
    phone?: string
    amount?: number
    paymentMethod?: PaymentMethod
  }): Promise<{ matchedOrder: boolean }> {
    const orderNumber = String(input.orderNumber ?? "")
      .trim()
      .replace(/[^a-zA-Z0-9\-]/g, "")
      .slice(0, 40)
    if (!orderNumber) return { matchedOrder: false }

    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderNumber, orderNumber))
      .limit(1)
    const row = rows[0]

    if (row) {
      // Defense in depth: never confirm an underpayment. The payment amount is
      // server-recorded at init (not client-supplied at webhook time), but we
      // re-check it against the order total before advancing. A short charge
      // leaves the order pending so admin can reconcile it manually.
      const amountOk = input.amount == null || input.amount >= row.total
      // Advance to paid only when the charge is sufficient and the order isn't a
      // terminal cancellation (never resurrect a cancelled order).
      const advance = row.status !== "cancelled" && amountOk
      if (advance) {
        await db
          .update(ordersTable)
          .set({
            status: "paid",
            paymentStatus: "paid",
            paymentReference: input.paymentRef ?? row.paymentReference,
            mpesaReceipt: input.mpesaReceipt ?? row.mpesaReceipt,
            updatedAt: new Date(),
          })
          .where(eq(ordersTable.id, row.id))
      }

      // Re-mirror into the admin Sales & Orders feed, carrying the full line items
      // + payment detail. upsert() is no-demote and dedupes by orderNo, so this is
      // safe whether or not the client already mirrored it. Status reflects the
      // real outcome: confirmed on a clean charge, otherwise left pending (or
      // cancelled) for staff attention.
      const mirrorStatus = row.status === "cancelled" ? "cancelled" : advance ? "confirmed" : "pending"
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, row.id))
      try {
        await this.adminOrders.upsert({
          orderNo: orderNumber,
          customer: row.customerName,
          phone: row.customerPhone,
          email: row.customerEmail ?? "",
          items: items.map((i) => ({ name: i.productName, qty: i.qty, price: i.unitPrice })),
          subtotal: row.subtotal,
          delivery: row.deliveryFee,
          total: row.total,
          location: row.shippingCity || row.shippingRegion || "",
          address: [row.shippingLine1, row.shippingLine2, row.shippingCity, row.shippingRegion]
            .filter(Boolean)
            .join(", "),
          status: mirrorStatus,
          orderedVia: "website",
          paymentMethod: row.paymentMethod,
          mpesaCode: input.mpesaReceipt || row.mpesaReceipt || undefined,
          mpesaPhone: input.phone || row.customerPhone || undefined,
          paymentRef: input.paymentRef || row.paymentReference || undefined,
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[orders] reconcile admin mirror failed", err)
      }
      return { matchedOrder: true }
    }

    // No customer order row exists — the storefront confirm never ran. A captured
    // payment must still NEVER be invisible to the pharmacy, so surface a
    // confirmed admin order from the payment record alone (line items unknown).
    try {
      await this.adminOrders.upsert({
        orderNo: orderNumber,
        phone: input.phone ?? "",
        total: input.amount ?? 0,
        status: "confirmed",
        orderedVia: "website",
        paymentMethod: input.paymentMethod ?? "mpesa",
        mpesaCode: input.mpesaReceipt || undefined,
        mpesaPhone: input.phone || undefined,
        paymentRef: input.paymentRef || undefined,
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[orders] reconcile admin fallback failed", err)
    }
    return { matchedOrder: false }
  }

  /**
   * Public order tracking — looks an order up across all sessions by its order
   * number (or recent orders by phone). Returns the customer-facing shape used by
   * the storefront track-order page. Unauthenticated by design (parity with the
   * legacy /api/track-order route): the order number / phone is the lookup key.
   */
  async track(params: { orderNumber?: string; phone?: string }): Promise<TrackedOrder[]> {
    const orderNumber = (params.orderNumber ?? "").trim().replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 40)
    const phone = (params.phone ?? "").trim()
    if (!orderNumber && !phone) {
      throw new HttpException("Provide order number or phone number", HttpStatus.BAD_REQUEST)
    }

    let rows: (typeof ordersTable.$inferSelect)[]
    if (orderNumber) {
      rows = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.orderNumber, orderNumber))
        .orderBy(desc(ordersTable.placedAt))
        .limit(10)
    } else {
      // Normalise to the 9 significant digits of a Kenyan mobile number
      // (strip +254 / leading 0). Require the FULL number — a short fragment must
      // not enumerate other customers' orders. Because `clean` is the entire
      // significant portion, the substring match is effectively exact across the
      // stored formats ("0712…", "+254712…", "254712…").
      const clean = phone.replace(/[^0-9]/g, "").replace(/^254/, "").replace(/^0/, "")
      if (clean.length < 9) {
        throw new HttpException("Enter the full phone number used on the order", HttpStatus.BAD_REQUEST)
      }
      rows = await db
        .select()
        .from(ordersTable)
        .where(ilike(ordersTable.customerPhone, `%${clean}%`))
        .orderBy(desc(ordersTable.placedAt))
        .limit(10)
    }

    if (rows.length === 0) throw new HttpException("No orders found", HttpStatus.NOT_FOUND)
    const items = await this.itemsFor(rows.map((r) => r.id))
    return rows.map((r) => toTrackedOrder(r, items.get(r.id) ?? []))
  }
}

@Controller("orders")
class OrderTrackingController {
  constructor(@Inject(OrdersService) private readonly svc: OrdersService) {}

  @Get("track")
  track(@Query("orderNumber") orderNumber?: string, @Query("phone") phone?: string) {
    return this.svc.track({ orderNumber, phone })
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
  imports: [AdminOrdersModule],
  controllers: [OrderTrackingController, OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

export { OrdersService }

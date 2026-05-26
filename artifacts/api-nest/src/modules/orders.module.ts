/**
 * Orders module — customer order management.
 *
 * Routes (all scoped to the session cookie / req.sessionId):
 *   GET  /api/v2/me/orders          — list all orders for the session
 *   GET  /api/v2/me/orders/:id      — fetch a specific order
 *   POST /api/v2/me/orders          — place a new order
 *
 * Data model:
 *   AccountOrder[] per sessionId in InMemoryRepository<AccountOrder>.
 *   Each order captures: line items, subtotal, deliveryFee, total, currency (KSH),
 *   status, paymentMethod, customer info, and shippingAddress.
 *
 * Order lifecycle:
 *   pending → paid (after Paystack callback) → fulfilled (after dispatch) | cancelled
 *
 * Paystack integration:
 *   After a successful POST /api/v2/payments/paystack/charge, the storefront
 *   polls /status until "success", then creates the order here with status="paid".
 *
 * Postgres swap:
 *   Replace `new InMemoryRepository<AccountOrder>()` in OrdersService with
 *   a Drizzle-backed implementation against the `orders` + `order_lines` tables.
 *   No controller changes.
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
import { InMemoryRepository, newId } from "../common/repository"

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

function seedOrdersFor(sid: string): Order[] {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const mk = (
    offsetDays: number,
    status: OrderStatus,
    paymentMethod: PaymentMethod,
    items: OrderLine[],
    deliveryFee: number,
    address: Order["shippingAddress"],
  ): Order => {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    return {
      id: newId("ord"),
      number: `SHX-${(100000 + Math.floor(Math.random() * 899999)).toString()}`,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: "KSH",
      status,
      paymentMethod,
      customer: {
        fullName: "Aisha Mwangi",
        phone: "+254 712 345 678",
        email: "aisha@example.com",
      },
      shippingAddress: address,
      createdAt: new Date(now - offsetDays * day).toISOString(),
    }
  }
  return [
    mk(1, "fulfilled", "mpesa",
      [
        { productSlug: "panadol-extra-24s", name: "Panadol Extra 24 tabs", unitPrice: 250, quantity: 2 },
        { productSlug: "vitamin-c-1000mg", name: "Vitamin C 1000mg (30 tabs)", unitPrice: 650, quantity: 1 },
      ],
      200,
      { line1: "Apt 4B, Riverside Lane", city: "Nairobi", region: "Westlands" },
    ),
    mk(7, "fulfilled", "card",
      [
        { productSlug: "ventolin-inhaler-100mcg", name: "Ventolin Inhaler 100mcg", unitPrice: 950, quantity: 1 },
        { productSlug: "amoxicillin-500mg-21s", name: "Amoxicillin 500mg (21 caps)", unitPrice: 480, quantity: 1 },
      ],
      250,
      { line1: "House 12, Garden Estate", city: "Nairobi", region: "Roysambu" },
    ),
    mk(3, "paid", "mpesa",
      [
        { productSlug: "metformin-500mg-100s", name: "Metformin 500mg (100 tabs)", unitPrice: 720, quantity: 1 },
        { productSlug: "amlodipine-5mg-30s", name: "Amlodipine 5mg (30 tabs)", unitPrice: 410, quantity: 2 },
      ],
      200,
      { line1: "Apt 4B, Riverside Lane", city: "Nairobi", region: "Westlands" },
    ),
    mk(0, "pending", "mpesa",
      [
        { productSlug: "paracetamol-500mg-100s", name: "Paracetamol 500mg (100 tabs)", unitPrice: 320, quantity: 1 },
        { productSlug: "zinc-tab-30s", name: "Zinc 25mg (30 tabs)", unitPrice: 450, quantity: 1 },
        { productSlug: "thermometer-digital", name: "Digital Thermometer", unitPrice: 800, quantity: 1 },
      ],
      150,
      { line1: "Apt 4B, Riverside Lane", city: "Nairobi", region: "Westlands" },
    ),
    mk(21, "cancelled", "cod",
      [
        { productSlug: "ibuprofen-400mg-20s", name: "Ibuprofen 400mg (20 tabs)", unitPrice: 280, quantity: 1 },
      ],
      150,
      { line1: "House 12, Garden Estate", city: "Nairobi", region: "Roysambu" },
    ),
  ]
}

@Injectable()
class OrdersService {
  private repo = new InMemoryRepository<Order>()
  private seeded = new Set<string>()

  private ensureSeeded(sid: string) {
    if (this.seeded.has(sid)) return
    this.seeded.add(sid)
    if (this.repo.listFor(sid).length === 0) {
      for (const o of seedOrdersFor(sid)) this.repo.add(sid, o)
    }
  }

  list(sid: string): Order[] {
    this.ensureSeeded(sid)
    return [...this.repo.listFor(sid)].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }

  get(sid: string, id: string): Order {
    this.ensureSeeded(sid)
    const o = this.repo.findById(sid, id)
    if (!o) throw new HttpException("Order not found", HttpStatus.NOT_FOUND)
    return o
  }

  create(sid: string, data: OrderInput): Order {
    const items = (data.items ?? []).map(toLine).filter((i) => i.productSlug && i.unitPrice > 0)
    if (items.length === 0) {
      throw new HttpException("Order must have at least one item", HttpStatus.BAD_REQUEST)
    }
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const deliveryFee = Math.max(0, Number(data.deliveryFee ?? 0))
    const order: Order = {
      id: newId("ord"),
      number: `SHX-${Date.now().toString(36).toUpperCase()}`,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      currency: "KSH",
      status: "pending",
      paymentMethod: data.paymentMethod ?? "unknown",
      customer: {
        fullName: String(data.customer?.fullName ?? ""),
        phone: String(data.customer?.phone ?? ""),
        email: String(data.customer?.email ?? ""),
      },
      shippingAddress: {
        line1: String(data.shippingAddress?.line1 ?? ""),
        line2: data.shippingAddress?.line2 ? String(data.shippingAddress.line2) : undefined,
        city: String(data.shippingAddress?.city ?? ""),
        region: String(data.shippingAddress?.region ?? ""),
      },
      createdAt: new Date().toISOString(),
    }
    return this.repo.add(sid, order)
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

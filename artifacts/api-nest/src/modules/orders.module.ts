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

@Injectable()
class OrdersService {
  private repo = new InMemoryRepository<Order>()

  list(sid: string): Order[] {
    return [...this.repo.listFor(sid)].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }

  get(sid: string, id: string): Order {
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

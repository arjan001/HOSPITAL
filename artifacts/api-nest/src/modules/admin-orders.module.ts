/**
 * AdminOrders module — order fulfillment and management for pharmacy staff.
 *
 * Routes:
 *   GET    /api/v2/admin/orders              — list all orders (paginated, filterable)
 *   GET    /api/v2/admin/orders/:id          — fetch a single order + line items
 *   PUT    /api/v2/admin/orders/:id          — update order status / assign courier
 *   DELETE /api/v2/admin/orders/:id          — cancel and remove an order
 *   GET    /api/v2/admin/orders/stats        — KPI counts by status
 *   POST   /api/v2/admin/orders/:id/notes    — add a fulfillment note
 *
 * Filter params (GET /admin/orders):
 *   status, paymentMethod, from, to, search (customer name / order number)
 *
 * Status lifecycle:
 *   pending → paid → processing → dispatched → delivered | cancelled | refunded
 *
 * Relationship with customer OrdersModule:
 *   Both modules share the same in-memory store (via AdminOrdersService
 *   reading from OrdersService's repository). When Postgres lands, both
 *   point to the same `orders` table — only the filter/pagination differs.
 *
 * Note on @Inject(AdminOrdersService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
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
  Query,
  UseGuards,
} from "@nestjs/common"
import { AdminGuard } from "../common/admin-guard"
import {
  PatientNotificationsModule,
  PatientNotificationsService,
  type PatientNotificationEvent,
} from "./patient-notifications.module"

/**
 * Admin Sales & Orders backend.
 *
 * Unlike the customer-facing `/me/orders` (which is session-scoped to a single
 * cookie), this is a **global** store: admins see every order placed across
 * the whole storefront. Today it's an in-process Map keyed by orderNo; the
 * Postgres swap is a one-file change against `sql/01_sales_orders.sql`.
 *
 * Status semantics — single source of truth:
 *   pending     → placed but payment NOT confirmed (COD, M-Pesa awaiting receipt)
 *   confirmed   → payment captured / cash received → counts as a SALE
 *   dispatched  → fulfilment in motion (also a SALE)
 *   delivered   → completed (also a SALE)
 *   cancelled   → failed / declined / abandoned
 *
 * A "Sale" is any order in confirmed | dispatched | delivered.
 */

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled"

export type AdminOrderItem = {
  name: string
  qty: number
  price: number
  variation?: string
}

export type AdminOrderRecord = {
  id: string
  orderNo: string
  customer: string
  phone: string
  email: string
  items: AdminOrderItem[]
  subtotal: number
  delivery: number
  total: number
  location: string
  address: string
  notes: string
  specialInstructions: string
  status: AdminOrderStatus
  orderedVia: string
  paymentMethod: string
  mpesaCode: string
  mpesaPhone: string
  mpesaMessage: string
  date: string
  createdAt: string
  updatedAt: string
}

export const SALE_STATUSES: AdminOrderStatus[] = [
  "confirmed",
  "dispatched",
  "delivered",
]

function newOrderId(): string {
  return `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function todayLabel(d = new Date()): string {
  return d.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type UpsertInput = Partial<Omit<AdminOrderRecord, "id" | "createdAt" | "updatedAt" | "date">> & {
  orderNo: string
  status: AdminOrderStatus
}

@Injectable()
class AdminOrdersService {
  constructor(
    @Inject(PatientNotificationsService)
    private readonly patientNotify: PatientNotificationsService,
  ) {}

  /** Global store keyed by orderNo (unique). */
  private byOrderNo = new Map<string, AdminOrderRecord>()

  /** Domain status → patient-notification event. Only statuses that should
   *  text the customer are mapped; `pending` deliberately is not. */
  private eventForStatus(status: AdminOrderStatus): PatientNotificationEvent | undefined {
    switch (status) {
      case "confirmed": return "order_confirmed"
      case "dispatched": return "order_dispatched"
      case "delivered": return "order_delivered"
      case "cancelled": return "order_cancelled"
      default: return undefined
    }
  }

  /** Fire a patient WhatsApp when an order reaches a notifiable status. */
  private notifyStatusChange(order: AdminOrderRecord, status: AdminOrderStatus): void {
    const event = this.eventForStatus(status)
    if (!event) return
    this.patientNotify.notify(event, {
      phone: order.mpesaPhone || order.phone,
      name: order.customer,
      variables: {
        order_id: order.orderNo,
        order_total: `KSh ${order.total.toLocaleString()}`,
        payment_method: order.paymentMethod,
      },
    })
  }

  list(): AdminOrderRecord[] {
    return [...this.byOrderNo.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }

  get(id: string): AdminOrderRecord {
    const found = [...this.byOrderNo.values()].find((o) => o.id === id)
    if (!found) throw new HttpException("Order not found", HttpStatus.NOT_FOUND)
    return found
  }

  countPending(): number {
    let n = 0
    for (const o of this.byOrderNo.values()) if (o.status === "pending") n++
    return n
  }

  /** Status lifecycle rank — higher means further along. Prevents an
   *  out-of-order fire-and-forget upsert from demoting a confirmed order
   *  back to pending. `cancelled` is terminal and cannot be overwritten. */
  private statusRank(s: AdminOrderStatus): number {
    switch (s) {
      case "pending": return 0
      case "confirmed": return 1
      case "dispatched": return 2
      case "delivered": return 3
      case "cancelled": return 99
    }
  }

  upsert(input: UpsertInput): AdminOrderRecord {
    if (!input.orderNo) {
      throw new HttpException("orderNo is required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const existing = this.byOrderNo.get(input.orderNo)
    const base: AdminOrderRecord =
      existing ?? {
        id: newOrderId(),
        orderNo: input.orderNo,
        customer: "",
        phone: "",
        email: "",
        items: [],
        subtotal: 0,
        delivery: 0,
        total: 0,
        location: "",
        address: "",
        notes: "",
        specialInstructions: "",
        status: "pending",
        orderedVia: "website",
        paymentMethod: "cod",
        mpesaCode: "",
        mpesaPhone: "",
        mpesaMessage: "",
        date: todayLabel(now),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
    // Never demote an order that has already advanced past the incoming status
    // (e.g. a late "pending" arriving after "confirmed" is ignored on status).
    const incomingRank = this.statusRank(input.status)
    const baseRank = this.statusRank(base.status)
    const effectiveStatus: AdminOrderStatus =
      existing && incomingRank < baseRank ? base.status : input.status
    const next: AdminOrderRecord = {
      ...base,
      customer: input.customer ?? base.customer,
      phone: input.phone ?? base.phone,
      email: input.email ?? base.email,
      items: input.items && input.items.length > 0 ? input.items : base.items,
      subtotal: input.subtotal ?? base.subtotal,
      delivery: input.delivery ?? base.delivery,
      total: input.total ?? base.total,
      location: input.location ?? base.location,
      address: input.address ?? base.address,
      notes: input.notes ?? base.notes,
      specialInstructions: input.specialInstructions ?? base.specialInstructions,
      status: effectiveStatus,
      orderedVia: input.orderedVia ?? base.orderedVia,
      paymentMethod: input.paymentMethod ?? base.paymentMethod,
      mpesaCode: input.mpesaCode ?? base.mpesaCode,
      mpesaPhone: input.mpesaPhone ?? base.mpesaPhone,
      mpesaMessage: input.mpesaMessage ?? base.mpesaMessage,
      updatedAt: now.toISOString(),
    }
    this.byOrderNo.set(next.orderNo, next)
    // Auto-text the patient when the effective status advances to a new,
    // notifiable state (treat a brand-new order's baseline as "pending").
    const prevStatus = existing?.status ?? "pending"
    if (effectiveStatus !== prevStatus) {
      this.notifyStatusChange(next, effectiveStatus)
    }
    return next
  }

  patchStatus(id: string, status: AdminOrderStatus): AdminOrderRecord {
    const target = this.get(id)
    const next = { ...target, status, updatedAt: new Date().toISOString() }
    this.byOrderNo.set(target.orderNo, next)
    if (status !== target.status) {
      this.notifyStatusChange(next, status)
    }
    return next
  }

  remove(ids: string[]): { deleted: number } {
    let deleted = 0
    const set = new Set(ids)
    for (const [key, order] of this.byOrderNo) {
      if (set.has(order.id)) {
        this.byOrderNo.delete(key)
        deleted++
      }
    }
    return { deleted }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/orders")
class AdminOrdersController {
  constructor(
    @Inject(AdminOrdersService) private readonly svc: AdminOrdersService,
  ) {}

  @Get()
  list(@Query("count") count?: string, @Query("status") status?: string) {
    if (count === "true" && status === "pending") {
      return { count: this.svc.countPending() }
    }
    const all = this.svc.list()
    if (status) return all.filter((o) => o.status === status)
    return all
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.get(id)
  }

  @Post()
  upsert(@Body() body: UpsertInput) {
    return this.svc.upsert(body ?? ({} as UpsertInput))
  }

  @Patch(":id")
  patch(@Param("id") id: string, @Body() body: { status?: AdminOrderStatus }) {
    if (!body?.status) {
      throw new HttpException("status is required", HttpStatus.BAD_REQUEST)
    }
    return this.svc.patchStatus(id, body.status)
  }

  @Delete()
  removeBulk(@Query("ids") ids?: string) {
    const list = (ids ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length === 0) {
      throw new HttpException("ids query param required", HttpStatus.BAD_REQUEST)
    }
    return this.svc.remove(list)
  }
}

@Module({
  imports: [PatientNotificationsModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}

export { AdminOrdersService }

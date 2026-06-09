/**
 * AdminOrders module — order fulfillment and management for pharmacy staff.
 *
 * Routes:
 *   GET    /api/v2/admin/orders              — list all orders (filterable by status)
 *   GET    /api/v2/admin/orders/:id          — fetch a single order
 *   POST   /api/v2/admin/orders              — upsert an order by orderNo
 *   PATCH  /api/v2/admin/orders/:id          — update order status
 *   DELETE /api/v2/admin/orders?ids=a,b      — bulk-remove orders
 *
 * Status lifecycle (admin vocabulary — distinct from customer /me/orders):
 *   pending → confirmed → dispatched → delivered | cancelled
 *
 * Persistence:
 *   Postgres-backed via Drizzle (`@workspace/db` → `admin_orders`), keyed by the
 *   unique `orderNo`. This is the global pharmacy view of every order placed on
 *   the storefront; line items are an embedded jsonb snapshot. Kept deliberately
 *   separate from the customer `orders` table because it carries a richer
 *   admin-facing shape and its own status vocabulary.
 *
 * Note on @Inject(AdminOrdersService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
  Body,
  Controller,
  Delete,
  forwardRef,
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
import { desc, eq, inArray, sql, getTableColumns } from "drizzle-orm"
import { db, adminOrders as adminOrdersTable } from "@workspace/db"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import {
  PatientNotificationsModule,
  PatientNotificationsService,
  type PatientNotificationEvent,
} from "./patient-notifications.module"
import { NotificationsModule, NotificationsService } from "./notifications.module"
import { AuditService } from "./audit.module"

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
  paymentRef: string
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

type AdminOrderRow = typeof adminOrdersTable.$inferSelect

function toRecord(row: AdminOrderRow): AdminOrderRecord {
  return {
    id: row.id,
    orderNo: row.orderNo,
    customer: row.customer,
    phone: row.phone,
    email: row.email,
    items: (row.items ?? []) as AdminOrderItem[],
    subtotal: row.subtotal,
    delivery: row.delivery,
    total: row.total,
    location: row.location,
    address: row.address,
    notes: row.notes,
    specialInstructions: row.specialInstructions,
    status: row.status as AdminOrderStatus,
    orderedVia: row.orderedVia,
    paymentMethod: row.paymentMethod,
    mpesaCode: row.mpesaCode,
    mpesaPhone: row.mpesaPhone,
    mpesaMessage: row.mpesaMessage,
    paymentRef: row.paymentRef,
    date: todayLabel(row.createdAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

type UpsertInput = Partial<Omit<AdminOrderRecord, "id" | "createdAt" | "updatedAt" | "date">> & {
  orderNo: string
  status: AdminOrderStatus
}

@Injectable()
class AdminOrdersService {
  constructor(
    @Inject(forwardRef(() => PatientNotificationsService))
    private readonly patientNotify: PatientNotificationsService,
    @Inject(NotificationsService)
    private readonly notifications: NotificationsService,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

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

  async list(): Promise<AdminOrderRecord[]> {
    const rows = await db
      .select()
      .from(adminOrdersTable)
      .orderBy(desc(adminOrdersTable.createdAt))
    return rows.map(toRecord)
  }

  async get(id: string): Promise<AdminOrderRecord> {
    const rows = await db
      .select()
      .from(adminOrdersTable)
      .where(eq(adminOrdersTable.id, id))
      .limit(1)
    if (!rows[0]) throw new HttpException("Order not found", HttpStatus.NOT_FOUND)
    return toRecord(rows[0])
  }

  async countPending(): Promise<number> {
    const rows = await db
      .select({ id: adminOrdersTable.id })
      .from(adminOrdersTable)
      .where(eq(adminOrdersTable.status, "pending"))
    return rows.length
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

  async upsert(input: UpsertInput): Promise<AdminOrderRecord> {
    if (!input.orderNo) {
      throw new HttpException("orderNo is required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const existingRows = await db
      .select()
      .from(adminOrdersTable)
      .where(eq(adminOrdersTable.orderNo, input.orderNo))
      .limit(1)
    const existing = existingRows[0] ? toRecord(existingRows[0]) : undefined

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
        paymentRef: "",
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
      paymentRef: input.paymentRef ?? base.paymentRef,
      updatedAt: now.toISOString(),
    }

    const values = {
      id: next.id,
      orderNo: next.orderNo,
      customer: next.customer,
      phone: next.phone,
      email: next.email,
      items: next.items,
      subtotal: next.subtotal,
      delivery: next.delivery,
      total: next.total,
      location: next.location,
      address: next.address,
      notes: next.notes,
      specialInstructions: next.specialInstructions,
      status: next.status,
      orderedVia: next.orderedVia,
      paymentMethod: next.paymentMethod,
      mpesaCode: next.mpesaCode,
      mpesaPhone: next.mpesaPhone,
      mpesaMessage: next.mpesaMessage,
      paymentRef: next.paymentRef,
      updatedAt: now,
    }

    // Atomic upsert keyed on the unique order_no. Doing INSERT ... ON CONFLICT
    // (rather than a read-then-insert) means two concurrent first-writes for the
    // same order (e.g. a client double-submit / retry) can't race into a unique
    // violation — the loser folds into an UPDATE instead of throwing. Postgres'
    // `xmax = 0` is true only for a freshly inserted row, so it tells us — at the
    // DB level, immune to the read race above — whether THIS call created the
    // order, which is what gates the one-time admin bell notification.
    const [savedRow] = await db
      .insert(adminOrdersTable)
      .values({ ...values, createdAt: now })
      .onConflictDoUpdate({ target: adminOrdersTable.orderNo, set: values })
      .returning({
        ...getTableColumns(adminOrdersTable),
        wasInserted: sql<boolean>`(xmax = 0)`,
      })
    const { wasInserted, ...savedCols } = savedRow
    const saved = toRecord(savedCols as AdminOrderRow)

    // Brand-new order → alert the admin shell bell (durable feed) so staff see
    // it land without polling the orders page. Fires once, on first insert only
    // (DB-confirmed via wasInserted, so a concurrent duplicate write won't
    // double-fire); later status updates flow through the patient-notify path.
    if (wasInserted) {
      void this.notifications
        .push("admin", {
          module: "orders",
          level: saved.status === "pending" ? "warning" : "success",
          title: `New order ${saved.orderNo}`,
          body: [
            saved.customer || "Guest",
            `KSh ${saved.total.toLocaleString()}`,
            saved.paymentMethod === "mpesa"
              ? "M-Pesa"
              : saved.paymentMethod === "card"
                ? "Card"
                : saved.paymentMethod.toUpperCase(),
          ]
            .filter(Boolean)
            .join(" · "),
          href: "/admin/orders",
        })
        .catch(() => {
          /* best-effort: a notification failure must never fail the order write */
        })
    }

    // Auto-text the patient when the effective status advances to a new,
    // notifiable state (treat a brand-new order's baseline as "pending").
    const prevStatus = existing?.status ?? "pending"
    if (effectiveStatus !== prevStatus) {
      this.notifyStatusChange(saved, effectiveStatus)
    }

    if (wasInserted) {
      void this.audit.record({
        module: "Orders",
        action: "create",
        key: saved.orderNo,
        summary: `Order ${saved.orderNo} placed (${saved.customer || "Guest"}, KSh ${saved.total.toLocaleString()})`,
        after: { status: saved.status, total: saved.total },
      })
    } else if (effectiveStatus !== prevStatus) {
      void this.audit.record({
        module: "Orders",
        action: "status",
        key: saved.orderNo,
        summary: `Order ${saved.orderNo}: ${prevStatus} → ${effectiveStatus}`,
        before: { status: prevStatus },
        after: { status: effectiveStatus },
      })
    }
    return saved
  }

  async patchStatus(
    id: string,
    status: AdminOrderStatus,
    opts?: { notify?: boolean },
  ): Promise<AdminOrderRecord> {
    const target = await this.get(id)
    const [row] = await db
      .update(adminOrdersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(adminOrdersTable.id, id))
      .returning()
    const saved = toRecord(row)
    if (status !== target.status) {
      if (opts?.notify !== false) this.notifyStatusChange(saved, status)
      void this.audit.record({
        module: "Orders",
        action: "status",
        key: saved.orderNo,
        summary: `Order ${saved.orderNo}: ${target.status} → ${status}`,
        before: { status: target.status },
        after: { status },
      })
    }
    return saved
  }

  async remove(ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 }
    const removed = await db
      .delete(adminOrdersTable)
      .where(inArray(adminOrdersTable.id, ids))
      .returning({ id: adminOrdersTable.id })
    void this.audit.record({
      module: "Orders",
      action: "delete",
      summary: `Deleted ${removed.length} order${removed.length === 1 ? "" : "s"}`,
      after: { ids: removed.map((r) => r.id) },
      severity: "danger",
    })
    return { deleted: removed.length }
  }
}

@UseGuards(AdminGuard)
@RequirePerm("orders.view", "orders.update")
@Controller("admin/orders")
class AdminOrdersController {
  constructor(
    @Inject(AdminOrdersService) private readonly svc: AdminOrdersService,
  ) {}

  @Get()
  async list(@Query("count") count?: string, @Query("status") status?: string) {
    if (count === "true" && status === "pending") {
      return { count: await this.svc.countPending() }
    }
    const all = await this.svc.list()
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
  imports: [forwardRef(() => PatientNotificationsModule), NotificationsModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}

export { AdminOrdersService }

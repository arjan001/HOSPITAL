/**
 * AdminPayments module — payment transaction ledger for pharmacy staff.
 *
 * Routes:
 *   GET  /api/v2/admin/payments?action=transactions  — paginated payment rows
 *   GET  /api/v2/admin/payments?action=stats         — aggregated totals
 *   POST /api/v2/admin/payments/:id/refund           — refund a charge (Paystack)
 *
 * Data source:
 *   The `payments` table is now the source of truth (provider="paystack"),
 *   queried DIRECTLY here — not projected from orders. Each charge is a row keyed
 *   by the unique Paystack `reference`; the order number rides in the
 *   `provider_response` jsonb. Customer display names are resolved from
 *   `admin_orders` (by orderNo) as a best-effort enrichment.
 *
 * Note on @Inject(AdminPaymentsService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
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
  UseGuards,
} from "@nestjs/common"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { db, payments } from "@workspace/db"
import {
  AdminOrdersModule,
  AdminOrdersService,
} from "./admin-orders.module"
import { AuditService } from "./audit.module"
import { AdminGuard, RequirePerm } from "../common/admin-guard"

export type PaymentStatus =
  | "success"
  | "pending"
  | "failed"
  | "cancelled"
  | "refunded"

export interface PaymentTransaction {
  id: string
  reference: string
  orderNumber: string
  amount: number
  currency: string
  status: PaymentStatus
  phone: string
  mpesaReceipt?: string
  customer?: string
  paymentMethod: string
  provider: string
  message?: string
  timestamp: string
  updatedAt: string
}

interface ProviderMeta {
  orderNumber?: string
  message?: string
  paystackId?: string | number
  refund?: { at: string; amount: number; by: string }
}

interface PaymentsPage {
  items: PaymentTransaction[]
  total: number
  page: number
  pageSize: number
  stats: PaymentStats
}

interface PaymentStats {
  revenue: number
  success: number
  pending: number
  failed: number
  cancelled: number
  refunded: number
  count: number
}

function normalizeStatus(s: string): PaymentStatus {
  const v = (s || "").toLowerCase()
  if (v === "success") return "success"
  if (v === "failed") return "failed"
  if (v === "cancelled" || v === "reversed" || v === "abandoned") return "cancelled"
  if (v === "refunded") return "refunded"
  return "pending"
}

@Injectable()
class AdminPaymentsService {
  private readonly secret = process.env["PAYSTACK_SECRET_KEY"] ?? ""
  private readonly base = "https://api.paystack.co"

  constructor(
    @Inject(AdminOrdersService) private readonly orders: AdminOrdersService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** orderNo → customer display name, for enriching the ledger. */
  private async customerByOrderNo(): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    try {
      for (const o of await this.orders.list()) {
        if (o.orderNo && o.customer) map.set(o.orderNo, o.customer)
      }
    } catch {
      /* enrichment is best-effort; never block the ledger */
    }
    return map
  }

  private toTransaction(
    r: typeof payments.$inferSelect,
    customers: Map<string, string>,
  ): PaymentTransaction {
    const meta = (r.providerResponse ?? {}) as ProviderMeta
    const orderNumber = meta.orderNumber ?? ""
    return {
      id: r.id,
      reference: r.reference,
      orderNumber,
      amount: r.amount,
      currency: r.currency || "KES",
      status: normalizeStatus(r.status),
      phone: r.phone ?? "",
      mpesaReceipt: r.mpesaReceipt ?? undefined,
      customer: orderNumber ? customers.get(orderNumber) : undefined,
      paymentMethod: r.method ?? "mpesa",
      provider: r.provider ?? "paystack",
      message: meta.message ?? undefined,
      timestamp: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }
  }

  async transactions(opts: {
    page?: number
    pageSize?: number
    method?: string
    status?: string
    search?: string
  }): Promise<PaymentsPage> {
    const page = Math.max(1, Number(opts.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const filters = []
    if (opts.method) filters.push(eq(payments.method, opts.method.toLowerCase()))
    if (opts.status) filters.push(eq(payments.status, normalizeStatus(opts.status)))
    if (opts.search) {
      const q = `%${opts.search.trim()}%`
      filters.push(
        or(
          ilike(payments.reference, q),
          ilike(payments.phone, q),
          ilike(payments.mpesaReceipt, q),
          sql`${payments.providerResponse} ->> 'orderNumber' ILIKE ${q}`,
        ),
      )
    }
    const where = filters.length ? and(...filters) : undefined

    const [rows, countRows, customers] = await Promise.all([
      db
        .select()
        .from(payments)
        .where(where)
        .orderBy(desc(payments.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(payments)
        .where(where),
      this.customerByOrderNo(),
    ])

    const total = Number(countRows[0]?.count ?? 0)
    const items = rows.map((r) => this.toTransaction(r, customers))
    const stats = await this.stats()
    return { items, total, page, pageSize, stats }
  }

  async stats(): Promise<PaymentStats> {
    // Aggregate across the whole table (not just the current page).
    const rows = await db
      .select({ status: payments.status, amount: payments.amount })
      .from(payments)
    const s: PaymentStats = {
      revenue: 0,
      success: 0,
      pending: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
      count: rows.length,
    }
    for (const r of rows) {
      const st = normalizeStatus(r.status)
      if (st === "success") {
        s.success++
        s.revenue += r.amount || 0
      } else if (st === "pending") s.pending++
      else if (st === "cancelled") s.cancelled++
      else if (st === "refunded") s.refunded++
      else s.failed++
    }
    return s
  }

  /**
   * Refund a charge through Paystack and mark the row refunded. This is a real
   * gateway call — never a silent ledger flip — so the brand promise of
   * integrity holds. Only successful charges can be refunded.
   */
  async refund(id: string, actor: string): Promise<PaymentTransaction> {
    if (!this.secret) {
      throw new HttpException(
        {
          error: "Payment provider not configured",
          hint: "Set PAYSTACK_SECRET_KEY to enable refunds.",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
    const rows = await db.select().from(payments).where(eq(payments.id, id)).limit(1)
    const row = rows[0]
    if (!row) throw new HttpException("Payment not found", HttpStatus.NOT_FOUND)
    const current = normalizeStatus(row.status)
    if (current === "refunded") {
      throw new HttpException("Payment is already refunded", HttpStatus.CONFLICT)
    }
    if (current !== "success") {
      throw new HttpException(
        "Only successful payments can be refunded",
        HttpStatus.BAD_REQUEST,
      )
    }

    const res = await fetch(`${this.base}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
      },
      // Paystack refund is keyed by the original transaction reference.
      body: JSON.stringify({ transaction: row.reference }),
    })
    const body = (await res.json().catch(() => ({}))) as {
      status?: boolean
      message?: string
    }
    if (!res.ok || body.status === false) {
      throw new HttpException(
        body.message || `Paystack refund failed (${res.status})`,
        res.status >= 400 && res.status < 500
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.BAD_GATEWAY,
      )
    }

    const meta = (row.providerResponse ?? {}) as ProviderMeta
    const nextMeta: ProviderMeta = {
      ...meta,
      refund: { at: new Date().toISOString(), amount: row.amount, by: actor },
    }
    const updated = await db
      .update(payments)
      .set({ status: "refunded", providerResponse: nextMeta, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning()
    void this.audit.record({
      module: "Payments",
      action: "refund",
      key: row.reference,
      summary: `Refunded ${row.currency || "KES"} ${row.amount} on ${row.reference}`,
      before: { status: current },
      after: { status: "refunded" },
      userId: actor,
      severity: "danger",
    })
    const customers = await this.customerByOrderNo()
    return this.toTransaction(updated[0]!, customers)
  }
}

@UseGuards(AdminGuard)
@RequirePerm("payments.view", "payments.refund")
@Controller("admin/payments")
class AdminPaymentsController {
  constructor(
    @Inject(AdminPaymentsService) private readonly svc: AdminPaymentsService,
  ) {}

  @Get()
  handle(
    @Query("action") action?: string,
    @Query("method") method?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    if (action === "stats") return this.svc.stats()
    return this.svc.transactions({
      method,
      status,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Post(":id/refund")
  refund(@Param("id") id: string) {
    return this.svc.refund(id, "admin")
  }
}

@Module({
  imports: [AdminOrdersModule],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
})
export class AdminPaymentsModule {}

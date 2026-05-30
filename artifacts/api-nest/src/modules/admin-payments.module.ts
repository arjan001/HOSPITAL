/**
 * AdminPayments module — payment transaction ledger for pharmacy staff.
 *
 * Routes:
 *   GET /api/v2/admin/payments               — list all payment records
 *   GET /api/v2/admin/payments/stats         — aggregated totals by status/method
 *   GET /api/v2/admin/payments/:reference    — fetch a single payment record
 *
 * Filter params (GET /admin/payments):
 *   status (pending|success|failed), method (mpesa|card|cod), from, to, search
 *
 * Data source:
 *   Reads from the PaystackModule's in-memory payment store (shared reference).
 *   When Paystack payments are written to Postgres, this module reads the
 *   `paystack_payments` table instead — no controller changes.
 *
 * Relationship with PaystackModule:
 *   PaystackModule owns the payment record lifecycle (create on charge,
 *   update on callback). AdminPaymentsModule is read-only — it surfaces
 *   records for reconciliation and dispute resolution.
 *
 * Note on @Inject(AdminPaymentsService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  AdminOrdersModule,
  AdminOrdersService,
  type AdminOrderRecord,
} from "./admin-orders.module"
import { AdminGuard, RequirePerm } from "../common/admin-guard"

/**
 * Admin Payments view.
 *
 * Payments are NOT a separate domain — every successful payment is already
 * recorded against its order in `AdminOrdersModule` (orderNo, paymentMethod,
 * mpesaCode, mpesaPhone, total, status, customer…). This module simply
 * projects orders into the Transaction shape the legacy Payments tab uses.
 *
 * The Postgres swap is the same one as orders (`sql/01_sales_orders.sql`) —
 * no separate table.
 *
 *   GET /api/v2/admin/payments                         → Transaction[]
 *   GET /api/v2/admin/payments?action=transactions     → Transaction[]
 *   GET /api/v2/admin/payments?action=stats            → { revenue, success, pending, failed }
 */

export type PaymentStatus =
  | "success"
  | "pending"
  | "failed"
  | "cancelled"

export interface PaymentTransaction {
  id: string
  reference: string
  amount: number
  currency: "KSH"
  status: PaymentStatus
  phone: string
  mpesaReceipt?: string
  customer?: string
  paymentMethod: string
  timestamp: string
}

function orderStatusToPayment(status: AdminOrderRecord["status"]): PaymentStatus {
  switch (status) {
    case "confirmed":
    case "dispatched":
    case "delivered":
      return "success"
    case "cancelled":
      // Order-level cancellation ≠ payment technical failure. Surface it as
      // its own status so the admin can distinguish user-cancelled from
      // gateway-rejected once a real `payment_status` lands on orders.
      return "cancelled"
    default:
      return "pending"
  }
}

function orderToTransaction(o: AdminOrderRecord): PaymentTransaction {
  return {
    id: o.id,
    reference: o.orderNo,
    amount: o.total,
    currency: "KSH",
    status: orderStatusToPayment(o.status),
    phone: o.mpesaPhone || o.phone,
    mpesaReceipt: o.mpesaCode || undefined,
    customer: o.customer,
    paymentMethod: o.paymentMethod,
    timestamp: o.createdAt,
  }
}

@Injectable()
class AdminPaymentsService {
  constructor(
    @Inject(AdminOrdersService) private readonly orders: AdminOrdersService,
  ) {}

  transactions(method?: string): PaymentTransaction[] {
    const all = this.orders.list().map(orderToTransaction)
    if (!method) return all
    return all.filter(
      (t) => t.paymentMethod.toLowerCase() === method.toLowerCase(),
    )
  }

  stats(): {
    revenue: number
    success: number
    pending: number
    failed: number
    cancelled: number
    count: number
  } {
    const all = this.orders.list().map(orderToTransaction)
    let revenue = 0
    let success = 0
    let pending = 0
    let failed = 0
    let cancelled = 0
    for (const t of all) {
      if (t.status === "success") {
        success++
        revenue += t.amount
      } else if (t.status === "pending") {
        pending++
      } else if (t.status === "cancelled") {
        cancelled++
      } else {
        failed++
      }
    }
    return { revenue, success, pending, failed, cancelled, count: all.length }
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
  ) {
    if (action === "stats") return this.svc.stats()
    // Default action: "transactions"
    return this.svc.transactions(method)
  }
}

@Module({
  imports: [AdminOrdersModule],
  controllers: [AdminPaymentsController],
  providers: [AdminPaymentsService],
})
export class AdminPaymentsModule {}

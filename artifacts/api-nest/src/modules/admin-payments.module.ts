/**
 * AdminPayments module — payment transaction ledger for pharmacy staff.
 *
 * Routes:
 *   GET /api/v2/admin/payments?action=transactions  — list payment records
 *   GET /api/v2/admin/payments?action=stats         — aggregated totals
 *
 * Data source:
 *   Read-only projection of `AdminOrdersService` (Postgres-backed `admin_orders`).
 *   Every successful payment is already recorded against its order (orderNo,
 *   paymentMethod, mpesaCode, mpesaPhone, total, status, customer…); this module
 *   projects those rows into the Transaction shape the legacy Payments tab uses.
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

  async transactions(method?: string): Promise<PaymentTransaction[]> {
    const all = (await this.orders.list()).map(orderToTransaction)
    if (!method) return all
    return all.filter(
      (t) => t.paymentMethod.toLowerCase() === method.toLowerCase(),
    )
  }

  async stats(): Promise<{
    revenue: number
    success: number
    pending: number
    failed: number
    cancelled: number
    count: number
  }> {
    const all = (await this.orders.list()).map(orderToTransaction)
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

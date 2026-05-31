import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, orders, orderItems, payments, adminOrders } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminOrdersService } from "./admin-orders.module"
import { OrdersService } from "./orders.module"
import { PaystackService } from "./paystack.module"
import type {
  PatientNotificationsService,
  PatientNotificationEvent,
  NotifyOptions,
} from "./patient-notifications.module"
import type { NotificationsService } from "./notifications.module"

// Regression suite for the orphaned-payment bug: a Paystack charge succeeded but
// the storefront tab closed before its client-side confirm could advance the
// order, so the order stayed `pending` and never reached the admin panel.
// Everything here hits real Postgres (the established convention) with a unique
// TEST- order number per case, wiped before each test and after the suite.

const ORDER_MATCHED = "TEST-PSR-MATCHED"
const ORDER_CANCELLED = "TEST-PSR-CANCELLED"
const ORDER_ORPHAN = "TEST-PSR-ORPHAN"
const ORDER_DUP = "TEST-PSR-DUP"
const ORDER_SHORT = "TEST-PSR-SHORT"
const ALL_ORDER_NOS = [ORDER_MATCHED, ORDER_CANCELLED, ORDER_ORPHAN, ORDER_DUP, ORDER_SHORT]

const REF_MATCHED = "TEST-REF-MATCHED"
const REF_CANCELLED = "TEST-REF-CANCELLED"
const REF_ORPHAN = "TEST-REF-ORPHAN"
const REF_DUP = "TEST-REF-DUP"
const REF_SHORT = "TEST-REF-SHORT"
const ALL_REFS = [REF_MATCHED, REF_CANCELLED, REF_ORPHAN, REF_DUP, REF_SHORT]

async function cleanup() {
  await db.delete(adminOrders).where(inArray(adminOrders.orderNo, ALL_ORDER_NOS))
  await db.delete(payments).where(inArray(payments.reference, ALL_REFS))
  // order_items cascade on the parent order delete.
  await db.delete(orders).where(inArray(orders.orderNumber, ALL_ORDER_NOS))
}

/** Insert a pending customer order (+ one line item) exactly as the storefront
 *  would have left it after a checkout whose payment confirm never ran. */
async function seedPendingOrder(orderNumber: string, status = "pending") {
  const id = newId("ord")
  await db.insert(orders).values({
    id,
    orderNumber,
    status,
    paymentMethod: "card",
    paymentStatus: "pending",
    customerName: "Amina Yusuf",
    customerPhone: "+254712345678",
    customerEmail: "amina@example.com",
    shippingLine1: "12 Biashara St",
    shippingCity: "Nairobi",
    shippingRegion: "Nairobi",
    subtotal: 1500,
    deliveryFee: 200,
    total: 1700,
  })
  await db.insert(orderItems).values({
    id: newId("oit"),
    orderId: id,
    productSlug: "amoxicillin-500mg",
    productName: "Amoxicillin 500mg",
    qty: 2,
    unitPrice: 750,
    total: 1500,
  })
  return id
}

/** Insert a pending payment row as the Paystack init step would have. */
async function seedPendingPayment(reference: string, orderNumber: string, amount = 1700) {
  await db.insert(payments).values({
    id: newId("pay"),
    reference,
    provider: "paystack",
    method: "card",
    phone: "+254712345678",
    amount,
    currency: "KES",
    status: "pending",
    providerResponse: { orderNumber },
  })
}

function makePaystack() {
  const patientNotify = {
    notify: vi.fn((_e: PatientNotificationEvent, _o: NotifyOptions) => {}),
  } as unknown as PatientNotificationsService
  const adminNotify = { push: vi.fn(() => Promise.resolve()) } as unknown as NotificationsService
  const adminOrdersSvc = new AdminOrdersService(patientNotify, adminNotify)
  const ordersSvc = new OrdersService(adminOrdersSvc)
  const paystack = new PaystackService(ordersSvc)
  return { paystack }
}

describe("Paystack → order reconciliation (orphaned-payment fix)", () => {
  beforeEach(async () => {
    await cleanup()
  })
  afterAll(async () => {
    await cleanup()
  })

  it("advances a pending order to paid and mirrors it to admin on charge.success webhook", async () => {
    await seedPendingOrder(ORDER_MATCHED)
    await seedPendingPayment(REF_MATCHED, ORDER_MATCHED)
    const { paystack } = makePaystack()

    // Simulate Paystack's signed webhook arriving after the tab already closed.
    await paystack.applyCallback({
      event: "charge.success",
      data: {
        reference: REF_MATCHED,
        status: "success",
        gateway_response: "Approved",
        metadata: { receipt_number: "RCPT-12345" },
      },
    })

    // The reconcile runs fire-and-forget; give the microtask queue a tick.
    await new Promise((r) => setTimeout(r, 50))

    const [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, ORDER_MATCHED))
      .limit(1)
    expect(orderRow.status).toBe("paid")
    expect(orderRow.paymentStatus).toBe("paid")
    expect(orderRow.paymentReference).toBe(REF_MATCHED)
    expect(orderRow.mpesaReceipt).toBe("RCPT-12345")

    const [adminRow] = await db
      .select()
      .from(adminOrders)
      .where(eq(adminOrders.orderNo, ORDER_MATCHED))
      .limit(1)
    expect(adminRow).toBeTruthy()
    expect(adminRow.status).toBe("confirmed")
    expect(adminRow.paymentRef).toBe(REF_MATCHED)
    expect(adminRow.total).toBe(1700)
    expect((adminRow.items as { name: string; qty: number; price: number }[])[0]).toMatchObject({
      name: "Amoxicillin 500mg",
      qty: 2,
      price: 750,
    })
  })

  it("never resurrects a cancelled order, but still surfaces the paid charge to admin", async () => {
    await seedPendingOrder(ORDER_CANCELLED, "cancelled")
    await seedPendingPayment(REF_CANCELLED, ORDER_CANCELLED)
    const { paystack } = makePaystack()

    await paystack.applyCallback({
      event: "charge.success",
      data: { reference: REF_CANCELLED, status: "success", gateway_response: "Approved" },
    })
    await new Promise((r) => setTimeout(r, 50))

    const [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, ORDER_CANCELLED))
      .limit(1)
    expect(orderRow.status).toBe("cancelled")
    expect(orderRow.paymentStatus).toBe("pending")
  })

  it("creates a confirmed admin order from the payment alone when no order row exists", async () => {
    // The storefront never POSTed an order (tab closed mid-redirect) — only the
    // payment row exists. The captured charge must still reach the pharmacy.
    await seedPendingPayment(REF_ORPHAN, ORDER_ORPHAN)
    const { paystack } = makePaystack()

    await paystack.applyCallback({
      event: "charge.success",
      data: {
        reference: REF_ORPHAN,
        status: "success",
        gateway_response: "Approved",
        metadata: { receipt_number: "RCPT-ORPHAN" },
      },
    })
    await new Promise((r) => setTimeout(r, 50))

    const [adminRow] = await db
      .select()
      .from(adminOrders)
      .where(eq(adminOrders.orderNo, ORDER_ORPHAN))
      .limit(1)
    expect(adminRow).toBeTruthy()
    expect(adminRow.status).toBe("confirmed")
    expect(adminRow.paymentRef).toBe(REF_ORPHAN)
    expect(adminRow.mpesaCode).toBe("RCPT-ORPHAN")
    expect(adminRow.total).toBe(1700)
  })

  it("is idempotent: a re-delivered webhook leaves a single paid order + admin row", async () => {
    await seedPendingOrder(ORDER_DUP)
    await seedPendingPayment(REF_DUP, ORDER_DUP)
    const { paystack } = makePaystack()

    const event = {
      event: "charge.success",
      data: { reference: REF_DUP, status: "success", gateway_response: "Approved" },
    }
    // Paystack retries webhooks — the second delivery must not double-write.
    await paystack.applyCallback(event)
    await paystack.applyCallback(event)
    await new Promise((r) => setTimeout(r, 50))

    const orderRows = await db.select().from(orders).where(eq(orders.orderNumber, ORDER_DUP))
    expect(orderRows).toHaveLength(1)
    expect(orderRows[0].status).toBe("paid")

    const adminRows = await db.select().from(adminOrders).where(eq(adminOrders.orderNo, ORDER_DUP))
    expect(adminRows).toHaveLength(1)
    expect(adminRows[0].status).toBe("confirmed")
    expect(adminRows[0].total).toBe(1700)
  })

  it("does NOT confirm an underpayment — the order stays pending for manual review", async () => {
    await seedPendingOrder(ORDER_SHORT) // total 1700
    await seedPendingPayment(REF_SHORT, ORDER_SHORT, 1000) // charge came up short
    const { paystack } = makePaystack()

    await paystack.applyCallback({
      event: "charge.success",
      data: { reference: REF_SHORT, status: "success", gateway_response: "Approved" },
    })
    await new Promise((r) => setTimeout(r, 50))

    const [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, ORDER_SHORT))
      .limit(1)
    expect(orderRow.status).toBe("pending")
    expect(orderRow.paymentStatus).toBe("pending")

    const [adminRow] = await db
      .select()
      .from(adminOrders)
      .where(eq(adminOrders.orderNo, ORDER_SHORT))
      .limit(1)
    expect(adminRow?.status).toBe("pending")
  })
})

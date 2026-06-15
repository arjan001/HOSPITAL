import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq, inArray } from "drizzle-orm"
import { db, adminOrders, orders as customerOrders } from "@workspace/db"
import { AdminOrdersService, adminToCustomerOrderStatus, type AdminOrderStatus } from "./admin-orders.module"
import type {
  PatientNotificationsService,
  PatientNotificationEvent,
  NotifyOptions,
} from "./patient-notifications.module"
import type { NotificationsService } from "./notifications.module"
import type { AuditService } from "./audit.module"

type NotifyCall = { event: PatientNotificationEvent; opts: NotifyOptions }

// All order numbers this suite touches — wiped before each test (and after the
// suite) so the Postgres-backed service starts from a clean slate and the
// notify-once-per-status assertions hold on repeated runs.
const ORDER_NOS = Array.from({ length: 10 }, (_, i) => `ORD-${i + 1}`)

async function cleanup() {
  await db.delete(adminOrders).where(inArray(adminOrders.orderNo, ORDER_NOS))
  await db.delete(customerOrders).where(inArray(customerOrders.orderNumber, ORDER_NOS))
}

function makeService() {
  const notifyCalls: NotifyCall[] = []
  const patientNotify = {
    notify: vi.fn((event: PatientNotificationEvent, opts: NotifyOptions) => {
      notifyCalls.push({ event, opts })
    }),
  } as unknown as PatientNotificationsService
  const adminNotify = { push: vi.fn(() => Promise.resolve()) } as unknown as NotificationsService
  const audit = { record: vi.fn(() => Promise.resolve()) } as unknown as AuditService
  const svc = new AdminOrdersService(patientNotify, adminNotify, audit)
  return { svc, notifyCalls, adminNotify }
}

describe("AdminOrdersService notifications", () => {
  let ctx: ReturnType<typeof makeService>
  beforeEach(async () => {
    await cleanup()
    ctx = makeService()
  })
  afterAll(async () => {
    await cleanup()
  })

  it("notifies order_confirmed when a new order is upserted as confirmed", async () => {
    await ctx.svc.upsert({
      orderNo: "ORD-1",
      status: "confirmed",
      customer: "Amina Yusuf",
      phone: "0712345678",
      total: 1500,
      paymentMethod: "mpesa",
    })

    expect(ctx.notifyCalls).toHaveLength(1)
    expect(ctx.notifyCalls[0].event).toBe<PatientNotificationEvent>("order_confirmed")
    expect(ctx.notifyCalls[0].opts.name).toBe("Amina Yusuf")
    expect(ctx.notifyCalls[0].opts.variables).toMatchObject({ order_id: "ORD-1" })
  })

  it("prefers mpesaPhone over phone when resolving the recipient", async () => {
    await ctx.svc.upsert({
      orderNo: "ORD-2",
      status: "confirmed",
      phone: "0700000000",
      mpesaPhone: "0712345678",
    })

    expect(ctx.notifyCalls[0].opts.phone).toBe("0712345678")
  })

  it("falls back to phone when mpesaPhone is empty", async () => {
    await ctx.svc.upsert({
      orderNo: "ORD-3",
      status: "confirmed",
      phone: "0700000000",
      mpesaPhone: "",
    })

    expect(ctx.notifyCalls[0].opts.phone).toBe("0700000000")
  })

  it("does NOT notify for a pending order", async () => {
    await ctx.svc.upsert({ orderNo: "ORD-4", status: "pending", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("notifies once per advancing status, not on a no-op re-upsert", async () => {
    await ctx.svc.upsert({ orderNo: "ORD-5", status: "confirmed", phone: "0712345678" })
    // Same status again — must not re-notify.
    await ctx.svc.upsert({ orderNo: "ORD-5", status: "confirmed", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(1)

    // Advancing to dispatched fires a fresh notification.
    await ctx.svc.upsert({ orderNo: "ORD-5", status: "dispatched", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(2)
    expect(ctx.notifyCalls[1].event).toBe("order_dispatched")
  })

  it("does not notify when an out-of-order upsert would demote the status", async () => {
    await ctx.svc.upsert({ orderNo: "ORD-6", status: "confirmed", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    // A late "pending" must be ignored (no demotion, no notification).
    await ctx.svc.upsert({ orderNo: "ORD-6", status: "pending", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("patchStatus notifies the mapped event with the resolved phone", async () => {
    const order = await ctx.svc.upsert({
      orderNo: "ORD-7",
      status: "confirmed",
      phone: "0700000000",
      mpesaPhone: "0712345678",
    })
    ctx.notifyCalls.length = 0

    await ctx.svc.patchStatus(order.id, "delivered")

    expect(ctx.notifyCalls).toHaveLength(1)
    expect(ctx.notifyCalls[0].event).toBe<PatientNotificationEvent>("order_delivered")
    expect(ctx.notifyCalls[0].opts.phone).toBe("0712345678")
  })

  it("patchStatus does not notify when the status is unchanged", async () => {
    const order = await ctx.svc.upsert({ orderNo: "ORD-8", status: "confirmed", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    await ctx.svc.patchStatus(order.id, "confirmed")
    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("maps cancelled to order_cancelled", async () => {
    const order = await ctx.svc.upsert({ orderNo: "ORD-9", status: "confirmed", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    await ctx.svc.patchStatus(order.id, "cancelled" as AdminOrderStatus)
    expect(ctx.notifyCalls[0].event).toBe("order_cancelled")
  })

  it("two concurrent first-writes for the same order don't throw and fire the admin bell exactly once", async () => {
    // The atomic ON CONFLICT upsert + xmax insert-detection must survive a
    // client double-submit / retry: neither call rejects on the unique order_no,
    // and the one-time "new order" bell fires only for the call that truly created it.
    const place = () =>
      ctx.svc.upsert({ orderNo: "ORD-10", status: "pending", customer: "Hodan Ali", phone: "0712345678", total: 999, paymentMethod: "mpesa" })

    const results = await Promise.allSettled([place(), place()])
    expect(results.every((r) => r.status === "fulfilled")).toBe(true)
    expect(ctx.adminNotify.push).toHaveBeenCalledTimes(1)
  })

  it("maps admin status to customer order status", () => {
    expect(adminToCustomerOrderStatus("confirmed")).toBe("paid")
    expect(adminToCustomerOrderStatus("dispatched")).toBe("dispatched")
    expect(adminToCustomerOrderStatus("delivered")).toBe("fulfilled")
  })

  it("patchStatus mirrors into the customer orders table for tracking", async () => {
    const orderNo = "ORD-7"
    await db.insert(customerOrders).values({
      id: "cust_ord_7",
      orderNumber: orderNo,
      userId: null,
      status: "paid",
      paymentMethod: "mpesa",
      paymentStatus: "paid",
      customerName: "Test Patient",
      customerPhone: "0712345678",
      customerEmail: null,
      shippingLine1: "Line 1",
      shippingLine2: null,
      shippingCity: "Nairobi",
      shippingRegion: "Nairobi",
      subtotal: 1000,
      deliveryFee: 200,
      total: 1200,
    })

    const adminOrder = await ctx.svc.upsert({
      orderNo,
      status: "confirmed",
      phone: "0712345678",
      customer: "Test Patient",
      total: 1200,
      paymentMethod: "mpesa",
    })

    await ctx.svc.patchStatus(adminOrder.id, "dispatched")

    const [customerRow] = await db
      .select()
      .from(customerOrders)
      .where(eq(customerOrders.orderNumber, orderNo))
      .limit(1)
    expect(customerRow?.status).toBe("dispatched")
  })
})

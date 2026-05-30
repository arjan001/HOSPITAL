import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminOrdersService, type AdminOrderStatus } from "./admin-orders.module"
import type {
  PatientNotificationsService,
  PatientNotificationEvent,
  NotifyOptions,
} from "./patient-notifications.module"

type NotifyCall = { event: PatientNotificationEvent; opts: NotifyOptions }

function makeService() {
  const notifyCalls: NotifyCall[] = []
  const patientNotify = {
    notify: vi.fn((event: PatientNotificationEvent, opts: NotifyOptions) => {
      notifyCalls.push({ event, opts })
    }),
  } as unknown as PatientNotificationsService
  const svc = new AdminOrdersService(patientNotify)
  return { svc, notifyCalls }
}

describe("AdminOrdersService notifications", () => {
  let ctx: ReturnType<typeof makeService>
  beforeEach(() => {
    ctx = makeService()
  })

  it("notifies order_confirmed when a new order is upserted as confirmed", () => {
    ctx.svc.upsert({
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

  it("prefers mpesaPhone over phone when resolving the recipient", () => {
    ctx.svc.upsert({
      orderNo: "ORD-2",
      status: "confirmed",
      phone: "0700000000",
      mpesaPhone: "0712345678",
    })

    expect(ctx.notifyCalls[0].opts.phone).toBe("0712345678")
  })

  it("falls back to phone when mpesaPhone is empty", () => {
    ctx.svc.upsert({
      orderNo: "ORD-3",
      status: "confirmed",
      phone: "0700000000",
      mpesaPhone: "",
    })

    expect(ctx.notifyCalls[0].opts.phone).toBe("0700000000")
  })

  it("does NOT notify for a pending order", () => {
    ctx.svc.upsert({ orderNo: "ORD-4", status: "pending", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("notifies once per advancing status, not on a no-op re-upsert", () => {
    ctx.svc.upsert({ orderNo: "ORD-5", status: "confirmed", phone: "0712345678" })
    // Same status again — must not re-notify.
    ctx.svc.upsert({ orderNo: "ORD-5", status: "confirmed", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(1)

    // Advancing to dispatched fires a fresh notification.
    ctx.svc.upsert({ orderNo: "ORD-5", status: "dispatched", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(2)
    expect(ctx.notifyCalls[1].event).toBe("order_dispatched")
  })

  it("does not notify when an out-of-order upsert would demote the status", () => {
    ctx.svc.upsert({ orderNo: "ORD-6", status: "confirmed", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    // A late "pending" must be ignored (no demotion, no notification).
    ctx.svc.upsert({ orderNo: "ORD-6", status: "pending", phone: "0712345678" })
    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("patchStatus notifies the mapped event with the resolved phone", () => {
    const order = ctx.svc.upsert({
      orderNo: "ORD-7",
      status: "confirmed",
      phone: "0700000000",
      mpesaPhone: "0712345678",
    })
    ctx.notifyCalls.length = 0

    ctx.svc.patchStatus(order.id, "delivered")

    expect(ctx.notifyCalls).toHaveLength(1)
    expect(ctx.notifyCalls[0].event).toBe<PatientNotificationEvent>("order_delivered")
    expect(ctx.notifyCalls[0].opts.phone).toBe("0712345678")
  })

  it("patchStatus does not notify when the status is unchanged", () => {
    const order = ctx.svc.upsert({ orderNo: "ORD-8", status: "confirmed", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    ctx.svc.patchStatus(order.id, "confirmed")
    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("maps cancelled to order_cancelled", () => {
    const order = ctx.svc.upsert({ orderNo: "ORD-9", status: "confirmed", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    ctx.svc.patchStatus(order.id, "cancelled" as AdminOrderStatus)
    expect(ctx.notifyCalls[0].event).toBe("order_cancelled")
  })
})

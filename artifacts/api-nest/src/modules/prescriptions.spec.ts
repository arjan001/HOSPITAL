import { beforeEach, describe, expect, it, vi } from "vitest"
import { PrescriptionsService } from "./prescriptions.module"
import type { PaystackService } from "./paystack.module"
import type { UploadsService } from "./uploads.module"
import type {
  PatientNotificationsService,
  PatientNotificationEvent,
  NotifyOptions,
} from "./patient-notifications.module"
import type { NotificationsService } from "./notifications.module"

type NotifyCall = { event: PatientNotificationEvent; opts: NotifyOptions }

/**
 * Build a PrescriptionsService wired to recording stubs. We never go through
 * Nest's DI — the service is plain TS, so direct construction is the cheapest
 * way to assert its notification side effects.
 */
function makeService() {
  const notifyCalls: NotifyCall[] = []
  const patientNotify = {
    notify: vi.fn((event: PatientNotificationEvent, opts: NotifyOptions) => {
      notifyCalls.push({ event, opts })
    }),
  } as unknown as PatientNotificationsService

  const verifyPaidReference = vi.fn(
    async (reference: string, _expected: number) => ({
      orderNumber: "",
      mpesaReceipt: `RCPT-${reference}`,
      amount: _expected,
    }),
  )
  const paystack = { verifyPaidReference } as unknown as PaystackService

  // Treat every client-supplied key as owned so file plumbing isn't under test.
  const uploads = { ownsKey: () => true } as unknown as UploadsService

  // In-app bell notifications are a side channel; record nothing, just absorb.
  const inApp = { push: vi.fn() } as unknown as NotificationsService

  const svc = new PrescriptionsService(paystack, uploads, patientNotify, inApp)
  return { svc, notifyCalls, paystack, verifyPaidReference }
}

const SID = "sess_test"

describe("PrescriptionsService notifications", () => {
  let ctx: ReturnType<typeof makeService>
  beforeEach(() => {
    ctx = makeService()
  })

  it("notifies prescription_uploaded with the resolved phone on create", () => {
    const rx = ctx.svc.create(SID, {
      recipient: "Amina Yusuf",
      phone: "0712345678",
    })

    expect(ctx.notifyCalls).toHaveLength(1)
    const call = ctx.notifyCalls[0]
    expect(call.event).toBe<PatientNotificationEvent>("prescription_uploaded")
    expect(call.opts.phone).toBe("0712345678")
    expect(call.opts.name).toBe("Amina Yusuf")
    expect(call.opts.variables).toMatchObject({ rx_id: rx.rxNumber })
  })

  it("notifies prescription_verified on a status transition to verified", () => {
    const rx = ctx.svc.create(SID, { recipient: "Amina", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    ctx.svc.update(SID, rx.id, { status: "verified" })

    expect(ctx.notifyCalls).toHaveLength(1)
    expect(ctx.notifyCalls[0].event).toBe("prescription_verified")
    expect(ctx.notifyCalls[0].opts.phone).toBe("0712345678")
  })

  it("notifies prescription_rejected with the reason variable", () => {
    const rx = ctx.svc.create(SID, { recipient: "Amina", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    ctx.svc.update(SID, rx.id, { status: "rejected", rejectedReason: "Illegible scan" })

    expect(ctx.notifyCalls).toHaveLength(1)
    expect(ctx.notifyCalls[0].event).toBe("prescription_rejected")
    expect(ctx.notifyCalls[0].opts.variables).toMatchObject({ rx_reason: "Illegible scan" })
  })

  it("does not notify when the status is unchanged", () => {
    const rx = ctx.svc.create(SID, { recipient: "Amina", phone: "0712345678" })
    ctx.notifyCalls.length = 0

    ctx.svc.update(SID, rx.id, { pharmacistNote: "Checked stock" })

    expect(ctx.notifyCalls).toHaveLength(0)
  })

  it("fires both payment_received and prescription_dispensed on pay()", async () => {
    const rx = ctx.svc.create(SID, { recipient: "Amina", phone: "0712345678" })
    ctx.svc.update(SID, rx.id, {
      status: "verified",
      approvedDrugs: [
        { name: "Amoxicillin", dosage: "500mg", instructions: "1x3", price: 200, quantity: 2 },
      ],
    })
    ctx.notifyCalls.length = 0

    // Bind the verified charge to this Rx (orderNumber must be RX-<rxNumber>).
    ctx.verifyPaidReference.mockResolvedValueOnce({
      orderNumber: `RX-${rx.rxNumber}`,
      mpesaReceipt: "QWE123",
      amount: 400,
    })

    const paid = await ctx.svc.pay(SID, rx.id, { reference: "ref-1" })
    expect(paid.status).toBe("dispensed")

    const events = ctx.notifyCalls.map((c) => c.event)
    expect(events).toContain<PatientNotificationEvent>("payment_received")
    expect(events).toContain<PatientNotificationEvent>("prescription_dispensed")
    for (const c of ctx.notifyCalls) expect(c.opts.phone).toBe("0712345678")
  })

  it("create still succeeds (no throw) when notify is a no-op", () => {
    // Even if the notifier did nothing, the domain write must complete.
    expect(() => ctx.svc.create(SID, { recipient: "Amina", phone: "" })).not.toThrow()
  })
})

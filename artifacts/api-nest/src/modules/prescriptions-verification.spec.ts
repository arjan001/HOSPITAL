/**
 * Business logic 3 — Prescription verification (end-to-end service flow).
 *
 * pending → medication list → verified (quotation) → accepted → pay → dispensed
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import { db, prescriptions } from "@workspace/db"
import { ensureUserId } from "../common/session-user"
import { PrescriptionsService, itemizedTotal } from "./prescriptions.module"
import type { PaystackService } from "./paystack.module"
import type { UploadsService } from "./uploads.module"
import type { PatientNotificationsService } from "./patient-notifications.module"
import type { NotificationsService } from "./notifications.module"
import type { AuditService } from "./audit.module"

const SID = "sess_verify_e2e"

async function cleanup() {
  const uid = await ensureUserId(SID)
  await db.delete(prescriptions).where(eq(prescriptions.userId, uid))
}

function makeService() {
  const notifyCalls: Array<{ event: string }> = []
  const patientNotify = {
    notify: vi.fn((event: string) => {
      notifyCalls.push({ event })
    }),
  } as unknown as PatientNotificationsService
  const verifyPaidReference = vi.fn(
    async (reference: string, expected: number) => ({
      orderNumber: "",
      mpesaReceipt: `RCPT-${reference}`,
      amount: expected,
    }),
  )
  const paystack = { verifyPaidReference } as unknown as PaystackService
  const uploads = { ownsKey: async () => true } as unknown as UploadsService
  const inApp = { push: vi.fn() } as unknown as NotificationsService
  const audit = { record: vi.fn(() => Promise.resolve()) } as unknown as AuditService
  const crm = {
    recordSessionEvent: vi.fn(() => Promise.resolve()),
    recordEvent: vi.fn(() => Promise.resolve()),
  } as unknown as import("./crm.module").CrmService
  const svc = new PrescriptionsService(paystack, uploads, patientNotify, inApp, audit, crm)
  return { svc, notifyCalls, verifyPaidReference }
}

describe("Prescription verification workflow", () => {
  let ctx: ReturnType<typeof makeService>

  beforeEach(async () => {
    await cleanup()
    ctx = makeService()
  })
  afterAll(async () => {
    await cleanup()
  })

  it("runs pending → verified → accepted → dispensed with priced drugs", async () => {
    const created = await ctx.svc.create(SID, {
      recipient: "Jane Patient",
      phone: "0711222333",
      email: "jane@example.com",
    })
    expect(created.status).toBe("pending")

    await ctx.svc.update(SID, created.id, {
      approvedDrugs: [
        {
          name: "Metformin 500mg",
          dosage: "500mg",
          instructions: "1 tab BD",
          price: 400,
          quantity: 30,
        },
      ],
    })

    const quoted = await ctx.svc.update(SID, created.id, { status: "verified" })
    expect(quoted.status).toBe("verified")
    expect(quoted.timeline.some((t) => t.kind === "verified")).toBe(true)

    const accepted = await ctx.svc.acceptQuotation(SID, created.id)
    expect(accepted.status).toBe("accepted")

    const total = itemizedTotal(accepted.approvedDrugs)
    ctx.verifyPaidReference.mockResolvedValueOnce({
      orderNumber: `RX-${accepted.rxNumber}`,
      mpesaReceipt: "RCPT-VERIFY",
      amount: total,
    })
    const paid = await ctx.svc.pay(SID, created.id, { reference: "PAY-VERIFY-1" })
    expect(paid.status).toBe("dispensed")
    expect(paid.payment?.amount).toBe(total)
  })

  it("rejects with reason from pending", async () => {
    const created = await ctx.svc.create(SID, { recipient: "Reject Me", phone: "0700000001" })
    const rejected = await ctx.svc.update(SID, created.id, {
      status: "rejected",
      rejectedReason: "Illegible scan",
    })
    expect(rejected.status).toBe("rejected")
    expect(rejected.rejectedReason).toBe("Illegible scan")
  })
})

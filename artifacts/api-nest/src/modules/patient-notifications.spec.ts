import { describe, expect, it, vi, type Mock } from "vitest"
import {
  EVENT_TO_TRIGGER,
  PatientNotificationsService,
  normalizeKePhone,
  type PatientNotificationEvent,
} from "./patient-notifications.module"
import type { CommunicationsAutomationService } from "./pipeline.module"

/**
 * A minimal stand-in for CommunicationsAutomationService. We only exercise
 * `sendByTrigger`, so that is all we stub; the cast keeps us honest about the
 * surface the notifier actually depends on without dragging in the real
 * pipeline (cmsStore, email, whatsapp transports, …).
 */
function makeComms(
  impl: CommunicationsAutomationService["sendByTrigger"],
): { svc: PatientNotificationsService; sendByTrigger: Mock } {
  const sendByTrigger = vi.fn(impl)
  const comms = { sendByTrigger } as unknown as CommunicationsAutomationService
  return { svc: new PatientNotificationsService(comms), sendByTrigger }
}

/** Resolve once all the microtasks queued by fire-and-forget `notify` settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve))

describe("EVENT_TO_TRIGGER", () => {
  it("maps every domain event to a template trigger", () => {
    const events: PatientNotificationEvent[] = [
      "prescription_uploaded",
      "prescription_verified",
      "prescription_dispensed",
      "prescription_rejected",
      "order_confirmed",
      "order_dispatched",
      "order_delivered",
      "order_cancelled",
      "payment_received",
    ]
    for (const event of events) {
      expect(EVENT_TO_TRIGGER[event], `missing trigger for ${event}`).toBeTruthy()
    }
  })

  it("uses the documented prescription/order trigger names", () => {
    expect(EVENT_TO_TRIGGER.prescription_uploaded).toBe("prescription_received")
    expect(EVENT_TO_TRIGGER.prescription_dispensed).toBe("prescription_ready_for_pickup")
    expect(EVENT_TO_TRIGGER.order_confirmed).toBe("order_confirmation")
    expect(EVENT_TO_TRIGGER.payment_received).toBe("payment_received")
  })
})

describe("normalizeKePhone", () => {
  it("normalises the three common Kenyan formats to 2547…", () => {
    expect(normalizeKePhone("0712345678")).toBe("254712345678")
    expect(normalizeKePhone("712345678")).toBe("254712345678")
    expect(normalizeKePhone("+254712345678")).toBe("254712345678")
    expect(normalizeKePhone("254712345678")).toBe("254712345678")
  })

  it("strips spaces, dashes, parens and plus signs", () => {
    expect(normalizeKePhone("+254 712-345 678")).toBe("254712345678")
    expect(normalizeKePhone("(0712) 345-678")).toBe("254712345678")
  })

  it("returns an empty string for missing/empty input", () => {
    expect(normalizeKePhone(undefined)).toBe("")
    expect(normalizeKePhone("")).toBe("")
    expect(normalizeKePhone("   ")).toBe("")
  })
})

describe("PatientNotificationsService.notify", () => {
  it("dispatches the mapped trigger with normalised phone and base variables", async () => {
    const { svc, sendByTrigger } = makeComms(async () => ({
      ok: true,
      channel: "whatsapp",
      preview: "ok",
    }))

    svc.notify("order_confirmed", {
      phone: "0712345678",
      name: "Amina Yusuf",
      variables: { order_id: "ORD-1" },
    })
    await flush()

    expect(sendByTrigger).toHaveBeenCalledTimes(1)
    const arg = sendByTrigger.mock.calls[0][0]
    expect(arg.trigger).toBe("order_confirmation")
    expect(arg.to).toBe("254712345678")
    expect(arg.channel).toBe("whatsapp")
    expect(arg.preferTemplate).toBe(true)
    expect(arg.variables).toMatchObject({
      store_name: "Shaniid RX",
      patient_name: "Amina Yusuf",
      first_name: "Amina",
      order_id: "ORD-1",
    })
  })

  it("passes the patient's preferred language through to the pipeline", async () => {
    const { svc, sendByTrigger } = makeComms(async () => ({
      ok: true,
      channel: "whatsapp",
      preview: "ok",
    }))

    svc.notify("order_dispatched", { phone: "0712345678", language: "sw" })
    await flush()

    expect(sendByTrigger.mock.calls[0][0].language).toBe("sw")
  })

  it("never dispatches when there is no phone on record", async () => {
    const { svc, sendByTrigger } = makeComms(async () => ({
      ok: true,
      channel: "whatsapp",
      preview: "ok",
    }))

    svc.notify("order_confirmed", { phone: undefined })
    svc.notify("order_confirmed", { phone: "" })
    await flush()

    expect(sendByTrigger).not.toHaveBeenCalled()
  })

  it("does not throw when no template is configured (skipped result)", async () => {
    const { svc, sendByTrigger } = makeComms(async () => ({
      ok: false,
      channel: "whatsapp",
      preview: "",
      skipped: true,
      reason: "No whatsapp template configured",
    }))

    expect(() =>
      svc.notify("prescription_uploaded", { phone: "0712345678" }),
    ).not.toThrow()
    await flush()

    expect(sendByTrigger).toHaveBeenCalledTimes(1)
  })

  it("swallows pipeline errors so the calling domain flow never breaks", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { svc } = makeComms(async () => {
      throw new Error("provider exploded")
    })

    expect(() =>
      svc.notify("order_delivered", { phone: "0712345678" }),
    ).not.toThrow()
    await flush()

    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

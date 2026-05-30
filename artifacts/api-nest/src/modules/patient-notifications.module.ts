/**
 * PatientNotifications module — auto-send patient WhatsApp on domain events.
 *
 * This is the single seam that turns prescription / order lifecycle changes
 * into customer-facing WhatsApp messages. Domain services (prescriptions,
 * admin orders) call `notify(event, …)` whenever a status meaningfully
 * changes; this module maps the event to the matching admin-managed message
 * template (by its `trigger`) and dispatches it through the existing
 * Communications pipeline.
 *
 * How it sends (and falls back):
 *   notify() → CommunicationsAutomationService.sendByTrigger() with
 *   `preferTemplate: true`. Because these are *proactively initiated* (a status
 *   change, not a patient reply), they may fall outside Meta's 24h
 *   customer-service window, so the pipeline sends a Meta-approved *template*
 *   (with the patient's language) rather than free-form text. If the Meta
 *   provider / template name isn't available it falls back to a text message,
 *   and if no provider is configured at all the message is queued in the
 *   `communications.outbox` cmsStore key instead of throwing — so nothing
 *   breaks if WhatsApp is never switched on.
 *
 * Language:
 *   Pass `language` per patient (ISO code or human label). It drives the Meta
 *   template language code; absent that it falls back to
 *   `WHATSAPP_DEFAULT_LANGUAGE` then "en".
 *
 * Delivery visibility:
 *   Every real send is recorded in the `communications.sent-log` cmsStore key
 *   (provider message id + status). Meta delivery/read callbacks land on the
 *   webhook in pipeline.module and advance each row sent → delivered → read.
 *
 * Fire-and-forget contract:
 *   `notify()` returns void and never throws into the calling domain flow.
 *   A failed or skipped send is logged and swallowed — a pharmacist updating
 *   an order must never see it fail because a notification couldn't go out.
 *
 * No new persisted shape:
 *   Auto-sends are external (WhatsApp) or logged/queued in the existing
 *   `communications.*` cmsStore keys — there is no new entity, so no
 *   packages/db schema change is required for this module.
 *
 * Note on @Inject(CommunicationsAutomationService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every constructor — project-wide rule.
 */
import { Inject, Injectable, Module } from "@nestjs/common"
import {
  CommunicationsAutomationService,
  PipelineModule,
} from "./pipeline.module"

/**
 * Domain events that should text the patient. Each maps to a `TemplateTrigger`
 * defined in the admin Message Templates (see message-templates.tsx). Keep the
 * left side phrased as a *domain event* and the right side as the template
 * trigger, so the mapping is the only place the two vocabularies meet.
 */
export type PatientNotificationEvent =
  | "prescription_uploaded"
  | "prescription_verified"
  | "prescription_dispensed"
  | "prescription_rejected"
  | "order_confirmed"
  | "order_dispatched"
  | "order_delivered"
  | "order_cancelled"
  | "payment_received"

const EVENT_TO_TRIGGER: Record<PatientNotificationEvent, string> = {
  prescription_uploaded: "prescription_received",
  prescription_verified: "prescription_verified",
  // "dispensed / ready" — the closest patient-facing "your prescription is
  // ready" template is prescription_ready_for_pickup; pharmacy staff can tune
  // the copy in the admin Message Templates without code changes.
  prescription_dispensed: "prescription_ready_for_pickup",
  prescription_rejected: "prescription_rejected",
  order_confirmed: "order_confirmation",
  order_dispatched: "order_dispatched",
  order_delivered: "order_delivered",
  order_cancelled: "order_cancelled",
  payment_received: "payment_received",
}

/**
 * Normalise a Kenyan phone number to bare E.164 digits (254…). Mirrors the
 * logic in paystack.module so a number stored as "0712…", "712…", or
 * "+254 712…" all resolve to the same WhatsApp-addressable form. Returns "" for
 * an empty/unusable input so the caller can skip silently.
 */
function normalizeKePhone(raw: string | undefined): string {
  const digits = String(raw ?? "").replace(/[\s\-()+]/g, "")
  if (!digits) return ""
  if (digits.startsWith("254")) return digits
  if (digits.startsWith("0") && digits.length >= 10) return `254${digits.slice(1)}`
  if (digits.length === 9) return `254${digits}`
  return digits
}

export type NotifyOptions = {
  /** Customer phone in any common KE format; normalised before sending. */
  phone: string | undefined
  /** Customer full name — used to derive {{patient_name}} / {{first_name}}. */
  name?: string
  /** Extra template tokens (e.g. order_id, order_total, rx_id, rx_reason). */
  variables?: Record<string, string | number>
  /**
   * Patient's preferred language (ISO code or human label, e.g. "en", "sw",
   * "Somali"). Drives the Meta template language code where the template is
   * approved in multiple languages. Falls back to `WHATSAPP_DEFAULT_LANGUAGE`
   * then "en" when not supplied.
   */
  language?: string
}

@Injectable()
export class PatientNotificationsService {
  constructor(
    @Inject(CommunicationsAutomationService)
    private readonly comms: CommunicationsAutomationService,
  ) {}

  /**
   * Fire a patient-facing WhatsApp for a domain event. Fire-and-forget: this
   * returns immediately and never throws into the caller — any failure is
   * logged and swallowed.
   */
  notify(event: PatientNotificationEvent, opts: NotifyOptions): void {
    void this.dispatch(event, opts).catch((err) => {
      console.warn(
        `[patient-notifications] ${event} failed:`,
        err instanceof Error ? err.message : err,
      )
    })
  }

  private async dispatch(
    event: PatientNotificationEvent,
    opts: NotifyOptions,
  ): Promise<void> {
    const to = normalizeKePhone(opts.phone)
    if (!to) return // No phone on record — nothing to send.

    const trigger = EVENT_TO_TRIGGER[event]
    const name = String(opts.name ?? "").trim()
    const variables: Record<string, string | number> = {
      store_name: "Shaniid RX",
      ...(name ? { patient_name: name, first_name: name.split(/\s+/)[0] } : {}),
      ...(opts.variables ?? {}),
    }

    const result = await this.comms.sendByTrigger({
      trigger,
      to,
      channel: "whatsapp",
      variables,
      // Patient notifications are proactively initiated (order/prescription
      // status changes), so they may land outside Meta's 24h customer-service
      // window. Prefer a Meta-approved template send (with per-patient language)
      // — the pipeline falls back to free text when no template/provider exists.
      preferTemplate: true,
      language: opts.language ?? process.env.WHATSAPP_DEFAULT_LANGUAGE,
    })
    if (!result.ok && result.skipped) {
      // Not an error — provider/template not wired yet. The pipeline has already
      // queued it to the outbox when a template exists; log for visibility.
      console.info(
        `[patient-notifications] ${event} → ${trigger}: ${result.reason ?? "skipped"}`,
      )
    }
  }
}

@Module({
  imports: [PipelineModule],
  providers: [PatientNotificationsService],
  exports: [PatientNotificationsService],
})
export class PatientNotificationsModule {}

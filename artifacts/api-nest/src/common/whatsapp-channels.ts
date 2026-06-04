/**
 * Dual WhatsApp channels (operations model):
 *
 *   Confirmations (Twilio) — proactive patient texts: order confirmed, Rx verified,
 *   payment received, refill reminders. Free-form body; no Meta template window.
 *
 *   Prescription bot (Meta Cloud) — inbound patient messages + session replies on the
 *   business number wired to Meta webhooks. Creates prescription rows from intake.
 *
 * Env:
 *   WHATSAPP_CONFIRMATIONS_PROVIDER  twilio | meta  (default: twilio when configured)
 *   WHATSAPP_BOT_PROVIDER            meta (only Meta supported for webhooks today)
 *   TWILIO_* / WHATSAPP_*            see whatsapp.module.ts
 */

export type WhatsAppChannelRole = "confirmations" | "bot"

export function confirmationsProviderPref(): "twilio" | "meta" | "auto" {
  const v = (process.env.WHATSAPP_CONFIRMATIONS_PROVIDER || "auto").trim().toLowerCase()
  if (v === "twilio" || v === "meta") return v
  return "auto"
}

export function botProviderPref(): "meta" {
  return "meta"
}

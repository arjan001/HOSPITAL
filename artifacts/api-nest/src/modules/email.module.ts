/**
 * Email module — transactional email dispatch via Resend.
 *
 * Routes:
 *   GET  /api/v2/notifications/email/status  — check if Resend is configured
 *   POST /api/v2/notifications/email/send    — send a transactional email
 *
 * Env vars:
 *   RESEND_API_KEY   — required; module soft-disables (503) when absent
 *   RESEND_FROM_EMAIL — optional override; defaults to noreply@shaniidrx.com
 *
 * Templates use {{token}} convention (see message-templates.tsx).
 * All sends are best-effort — never throw on Resend API errors.
 *
 * Note on @Inject(EmailService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
} from "@nestjs/common"

/* ─── Template catalogue ──────────────────────────────────────────────────── */

export type EmailTemplate =
  /* Account */
  | "account.verification"
  | "account.password_reset"
  /* Orders */
  | "order.receipt"
  | "order.dispatched"
  | "order.delivered"
  | "order.cancelled"
  /* Prescriptions */
  | "prescription.received"
  | "prescription.approved"
  | "prescription.rejected"
  /* Consultations */
  | "consultation.booked"
  | "consultation.reminder"
  | "consultation.cancelled"
  /* Payments */
  | "payment.failed"
  /* Support */
  | "support.ticket.opened"
  | "support.ticket.reply"
  /* Partner lifecycle */
  | "partner.welcome"
  | "partner.kyc.approved"
  | "partner.kyc.rejected"
  | "partner.suspended"
  /* Delivery operations */
  | "delivery.job.assigned"
  /* Internal / admin */
  | "admin.low_stock"
  | "admin.new_prescription"
  | "admin.new_consultation"
  /* Fallback */
  | "generic"

export type SendEmailInput = {
  to: string
  subject?: string
  template?: EmailTemplate
  html?: string
  text?: string
  data?: Record<string, unknown>
  from?: string
}

export type SendEmailResult = {
  ok: boolean
  id?: string
  skipped?: boolean
  reason?: string
}

/* ─── Brand tokens ────────────────────────────────────────────────────────── */

const WINE   = "#3D0814"
const ORANGE = "#F97316"
const RED    = "#B91C1C"
const GREEN  = "#065F46"

/* ─── Default subjects ────────────────────────────────────────────────────── */

const SUBJECT: Record<EmailTemplate, string> = {
  "account.verification":    "Confirm your Shaniid RX account",
  "account.password_reset":  "Reset your Shaniid RX password",
  "order.receipt":           "Your Shaniid RX order receipt",
  "order.dispatched":        "Your order is on its way",
  "order.delivered":         "Your order has been delivered",
  "order.cancelled":         "Your Shaniid RX order has been cancelled",
  "prescription.received":   "We received your prescription",
  "prescription.approved":   "Your prescription is verified — ready to order",
  "prescription.rejected":   "Update on your Shaniid RX prescription",
  "consultation.booked":     "Your consultation is confirmed",
  "consultation.reminder":   "Reminder: your consultation starts soon",
  "consultation.cancelled":  "Your Shaniid RX consultation has been cancelled",
  "payment.failed":          "Payment not completed — Shaniid RX",
  "support.ticket.opened":   "We received your support request",
  "support.ticket.reply":    "New reply on your Shaniid RX support ticket",
  "partner.welcome":         "Your Shaniid RX partner portal access",
  "partner.kyc.approved":    "Your KYC has been approved — Shaniid RX",
  "partner.kyc.rejected":    "Action required: KYC review — Shaniid RX",
  "partner.suspended":       "Your Shaniid RX partner account",
  "delivery.job.assigned":   "New delivery assignment — Shaniid RX",
  "admin.low_stock":         "[Shaniid RX] Low stock alert",
  "admin.new_prescription":  "[Shaniid RX] New prescription uploaded",
  "admin.new_consultation":  "[Shaniid RX] New consultation booked",
  "generic":                 "Shaniid RX",
}

/* ─── Shared layout helpers ───────────────────────────────────────────────── */

function ctaButton(label: string, url: string, color = ORANGE): string {
  return `<p style="margin:20px 0 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,${color},${RED});color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px;">${label}</a>
  </p>`
}

function infoTable(rows: Array<[string, string]>): string {
  const cells = rows.map(([label, value]) => `
    <tr style="border-bottom:1px solid #F2DCC8;">
      <td style="padding:10px 14px;font-size:12px;color:#6b5a60;white-space:nowrap;">${label}</td>
      <td style="padding:10px 14px;font-weight:600;font-size:13px;word-break:break-all;">${value}</td>
    </tr>`).join("")
  return `<table style="background:#FFFBF5;border-radius:10px;width:100%;border:1px solid #F2DCC8;margin:16px 0;border-collapse:collapse;">${cells}</table>`
}

function statusBadge(label: string, color: string, bg: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;background:${bg};color:${color};">${label}</span>`
}

function layout(body: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;font-family:Inter,system-ui,sans-serif;color:#1f1115;background:#FFFBF5;">
  <div style="max-width:580px;margin:0 auto;background:#fff;border:1px solid #F2DCC8;border-radius:16px;overflow:hidden;">
    <div style="background:${WINE};padding:18px 26px;display:flex;align-items:center;gap:12px;">
      <span style="color:#fff;font-weight:800;font-size:17px;letter-spacing:0.04em;">SHANIID RX</span>
      <span style="color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Trusted Pharmaceutical Infrastructure</span>
    </div>
    <div style="padding:24px 28px;font-size:15px;line-height:1.6;">${body}</div>
    <div style="padding:14px 28px;background:#FFFBF5;border-top:1px solid #F2DCC8;font-size:11px;color:#9b8a8f;line-height:1.5;">
      &copy; ${new Date().getFullYear()} Shaniid RX — A Shaniid Group Company.<br>
      If you did not expect this email, you can safely ignore it.
      Questions? <a href="mailto:support@shaniidrx.com" style="color:${ORANGE};">support@shaniidrx.com</a>
    </div>
  </div>
</body></html>`
}

/* ─── Template renderer ───────────────────────────────────────────────────── */

function render(template: EmailTemplate, data: Record<string, unknown> = {}): string {
  const s = (key: string, fallback = "") => typeof data[key] === "string" ? data[key] as string : fallback
  const n = (key: string, fallback = 0)  => typeof data[key] === "number" ? data[key] as number : fallback
  const name = s("name", "there")

  const body = ((): string => {
    switch (template) {

      /* ── Account ──────────────────────────────────────────────────────── */

      case "account.verification":
        return `<p>Welcome to <b>Shaniid RX</b>, ${name}.</p>
          <p>Your account is being set up. Please confirm your email using the link or OTP sent alongside this message.</p>
          <p style="font-size:13px;color:#6b5a60;">If this wasn't you, no action is needed — the request will expire automatically.</p>`

      case "account.password_reset":
        return `<p>Hi ${name},</p>
          <p>We received a request to reset your Shaniid RX password. Click the button below — this link is valid for <b>30 minutes</b>.</p>
          ${ctaButton("Reset my password", s("url", "https://shaniidrx.com/sign-in"))}
          <p style="font-size:13px;color:#6b5a60;margin-top:16px;">If you didn't request a reset, you can safely ignore this email. Your password won't change.</p>`

      /* ── Orders ───────────────────────────────────────────────────────── */

      case "order.receipt":
        return `<p>Hi ${name},</p>
          <p>Thank you for your order. Your payment was received and a pharmacist is preparing your medicine.</p>
          ${infoTable([
            ["Order number", s("orderNumber")],
            ["Amount paid",  `KSh ${s("amount")}`],
            ["Payment method", s("paymentMethod", "M-Pesa")],
            ["Estimated delivery", s("deliveryDate", "Within 24 hours")],
          ])}
          <p style="font-size:13px;color:#6b5a60;">You'll receive another email when your order is dispatched. For questions, reply to this email or contact our support team.</p>
          ${ctaButton("Track your order", s("url", "https://shaniidrx.com/account/orders"))}`

      case "order.dispatched":
        return `<p>Hi ${name},</p>
          <p>Your order <b>${s("orderNumber")}</b> has been dispatched and is on its way to you.</p>
          ${infoTable([
            ["Order number", s("orderNumber")],
            ["Delivery address", s("address")],
            ["Rider / Driver", s("riderName", "Your assigned rider")],
            ["Rider phone", s("riderPhone", "—")],
          ])}
          <p>Your rider will call when they arrive. Please have your phone handy.</p>
          ${ctaButton("View order", s("url", "https://shaniidrx.com/account/orders"))}`

      case "order.delivered":
        return `<p>Hi ${name},</p>
          <p>Your order <b>${s("orderNumber")}</b> has been delivered. We hope your medicine serves you well.</p>
          <p style="margin:16px 0;padding:14px 18px;background:#F0FDF4;border-radius:10px;border:1px solid #BBF7D0;font-size:14px;color:${GREEN};">
            ✓ Delivered — ${s("deliveredAt", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }))}
          </p>
          <p style="font-size:13px;color:#6b5a60;">If you have questions about your medication, speak to one of our pharmacists anytime.</p>
          ${ctaButton("Speak to a pharmacist", s("url", "https://shaniidrx.com/speak-to-a-doctor"))}`

      case "order.cancelled":
        return `<p>Hi ${name},</p>
          <p>Your order <b>${s("orderNumber")}</b> has been cancelled.</p>
          ${s("reason") ? `<p style="padding:12px 16px;background:#FEF2F2;border-radius:10px;border:1px solid #FECACA;font-size:14px;color:#991B1B;"><b>Reason:</b> ${s("reason")}</p>` : ""}
          <p>If a payment was made, a refund will be processed within <b>3–5 business days</b> to your original payment method.</p>
          ${ctaButton("Browse medicines", "https://shaniidrx.com/shop")}`

      /* ── Prescriptions ────────────────────────────────────────────────── */

      case "prescription.received":
        return `<p>Hi ${name},</p>
          <p>We have received your prescription and it is currently under review by one of our pharmacists.</p>
          ${infoTable([
            ["Reference", s("rxNumber", "—")],
            ["Submitted", s("submittedAt", new Date().toLocaleDateString("en-GB"))],
            ["Status", "Under review"],
          ])}
          <p style="font-size:13px;color:#6b5a60;">You'll be notified by email once the review is complete. Typical turnaround is under 2 hours during operating hours.</p>
          ${ctaButton("View prescription", s("url", "https://shaniidrx.com/account/prescriptions"))}`

      case "prescription.approved":
        return `<p>Hi ${name},</p>
          <p>Your prescription <b>${s("rxNumber")}</b> has been verified by one of our pharmacists. You can now place an order for the approved medication.</p>
          ${s("medication") ? `${infoTable([["Approved medication", s("medication")], ["Quantity", s("quantity", "As prescribed")]])}` : ""}
          <p style="font-size:13px;color:#6b5a60;">This prescription is valid for one order. Please reach out if you need a repeat.</p>
          ${ctaButton("Order now", s("url", "https://shaniidrx.com/account/prescriptions"))}`

      case "prescription.rejected":
        return `<p>Hi ${name},</p>
          <p>After review, our pharmacist was unable to approve prescription <b>${s("rxNumber")}</b>.</p>
          ${s("reason") ? `<p style="padding:12px 16px;background:#FEF9EC;border-radius:10px;border:1px solid #FDE68A;font-size:14px;color:#92400E;"><b>Reason:</b> ${s("reason")}</p>` : ""}
          <p>You are welcome to resubmit with a clearer image or an updated prescription. Our pharmacists are also available to help.</p>
          ${ctaButton("Resubmit prescription", s("url", "https://shaniidrx.com/account/prescriptions"))}`

      /* ── Consultations ────────────────────────────────────────────────── */

      case "consultation.booked":
        return `<p>Hi ${name},</p>
          <p>Your consultation is confirmed. Join using the link below at your scheduled time.</p>
          ${infoTable([
            ["Doctor", s("doctor", "Your assigned doctor")],
            ["Date & time", s("dateTime", "—")],
            ["Duration", s("duration", "30 minutes")],
          ])}
          ${ctaButton("Join consultation", s("url", "https://shaniidrx.com/speak-to-a-doctor"))}
          <p style="font-size:13px;color:#6b5a60;margin-top:16px;">Please be ready 5 minutes before your slot. If you need to reschedule, contact us at least 1 hour in advance.</p>`

      case "consultation.reminder":
        return `<p>Hi ${name},</p>
          <p>This is a reminder that your consultation with <b>${s("doctor", "your doctor")}</b> starts in <b>${s("timeUntil", "1 hour")}</b>.</p>
          ${infoTable([
            ["Date & time", s("dateTime", "—")],
            ["Room link", s("url", "—")],
          ])}
          ${ctaButton("Join now", s("url", "https://shaniidrx.com/speak-to-a-doctor"))}`

      case "consultation.cancelled":
        return `<p>Hi ${name},</p>
          <p>Your consultation scheduled for <b>${s("dateTime", "—")}</b> has been cancelled.</p>
          ${s("reason") ? `<p style="padding:12px 16px;background:#FEF2F2;border-radius:10px;border:1px solid #FECACA;font-size:14px;color:#991B1B;"><b>Reason:</b> ${s("reason")}</p>` : ""}
          <p>If a payment was made, a refund will be issued within 3–5 business days. You are welcome to book again at any time.</p>
          ${ctaButton("Book a new consultation", "https://shaniidrx.com/speak-to-a-doctor")}`

      /* ── Payments ─────────────────────────────────────────────────────── */

      case "payment.failed":
        return `<p>Hi ${name},</p>
          <p>We were unable to process your payment of <b>KSh ${s("amount")}</b> for order <b>${s("orderNumber")}</b>.</p>
          ${s("reason") ? `<p style="padding:12px 16px;background:#FEF2F2;border-radius:10px;border:1px solid #FECACA;font-size:14px;color:#991B1B;">${s("reason")}</p>` : ""}
          <p>Your order is still saved. You can try again with a different payment method or contact your bank if the issue persists.</p>
          ${ctaButton("Retry payment", s("url", "https://shaniidrx.com/checkout"))}`

      /* ── Support ──────────────────────────────────────────────────────── */

      case "support.ticket.opened":
        return `<p>Hi ${name},</p>
          <p>We've received your support request and our team will get back to you within <b>24 hours</b> during business days.</p>
          ${infoTable([
            ["Ticket ID", s("ticketId")],
            ["Subject", s("subject", "General inquiry")],
            ["Submitted", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
          ])}
          <p style="font-size:13px;color:#6b5a60;">You can view your ticket and reply at any time from your account.</p>
          ${ctaButton("View ticket", s("url", "https://shaniidrx.com/account/support"))}`

      case "support.ticket.reply":
        return `<p>Hi ${name},</p>
          <p>Our team has replied to your support ticket <b>${s("ticketId")}</b>:</p>
          <blockquote style="border-left:3px solid ${WINE};padding:10px 16px;color:#374151;margin:16px 0;background:#FFFBF5;border-radius:0 8px 8px 0;font-size:14px;">${s("message", "(no message body)")}</blockquote>
          ${ctaButton("Reply", s("url", "https://shaniidrx.com/account/support"))}`

      /* ── Partner lifecycle ────────────────────────────────────────────── */

      case "partner.welcome": {
        const portalType  = s("partnerType", "partner")
        const portalUrl   = s("portalUrl", `https://shaniidrx.com/portal/${portalType}`)
        const portalLabel = portalType === "supplier" ? "Supplier" : portalType === "clinic" ? "Clinic & Healthcare" : "Logistics"
        return `<p>Hi ${name},</p>
          <p>Welcome to the <b>Shaniid RX ${portalLabel} Partner Network</b>. Your portal account has been created. Use the credentials below to sign in:</p>
          ${infoTable([
            ["Portal URL",   portalUrl],
            ["Email",        s("email")],
            ["Portal code",  `<span style="font-size:16px;font-weight:800;letter-spacing:0.1em;color:${WINE};">${s("portalCode")}</span>`],
          ])}
          <p style="font-size:13px;color:#6b5a60;">Keep your portal code private — it authenticates you alongside your email. Complete your KYC to unlock full partner features.</p>
          ${ctaButton("Access your portal", portalUrl)}`
      }

      case "partner.kyc.approved": {
        const portalType  = s("partnerType", "partner")
        const portalUrl   = s("portalUrl", `https://shaniidrx.com/portal/${portalType}`)
        return `<p>Hi ${name},</p>
          <p>Great news — your KYC documents have been reviewed and <b style="color:${GREEN};">approved</b>. Your partner account is now fully active.</p>
          <p style="margin:16px 0;padding:14px 18px;background:#F0FDF4;border-radius:10px;border:1px solid #BBF7D0;font-size:14px;color:${GREEN};">
            ${statusBadge("KYC Approved", GREEN, "#D1FAE5")} &nbsp; Your account is now live on the Shaniid RX network.
          </p>
          <p style="font-size:13px;color:#6b5a60;">You will now begin receiving assignments and orders through the platform. Log in to your portal to confirm your settings.</p>
          ${ctaButton("Go to portal", portalUrl)}`
      }

      case "partner.kyc.rejected": {
        const portalType  = s("partnerType", "partner")
        const portalUrl   = s("portalUrl", `https://shaniidrx.com/portal/${portalType}`)
        return `<p>Hi ${name},</p>
          <p>Our compliance team has reviewed your KYC documents and requires some changes before your account can be activated.</p>
          ${s("reason") ? `<p style="padding:12px 16px;background:#FEF9EC;border-radius:10px;border:1px solid #FDE68A;font-size:14px;color:#92400E;"><b>Issue noted:</b> ${s("reason")}</p>` : ""}
          <p>Please log in to your portal, update the flagged documents, and resubmit. Our team will re-review within 2 business days.</p>
          ${ctaButton("Update documents", portalUrl)}`
      }

      case "partner.suspended":
        return `<p>Hi ${name},</p>
          <p>Your Shaniid RX partner account has been <b style="color:${RED};">suspended</b>.</p>
          ${s("reason") ? `<p style="padding:12px 16px;background:#FEF2F2;border-radius:10px;border:1px solid #FECACA;font-size:14px;color:#991B1B;"><b>Reason:</b> ${s("reason")}</p>` : ""}
          <p style="font-size:13px;color:#6b5a60;">During suspension, new assignments are paused. To appeal or resolve the issue, please contact your account manager or reach out to <a href="mailto:partners@shaniidrx.com" style="color:${ORANGE};">partners@shaniidrx.com</a>.</p>`

      /* ── Delivery operations ──────────────────────────────────────────── */

      case "delivery.job.assigned":
        return `<p>Hi ${name},</p>
          <p>A new delivery has been assigned to your fleet.</p>
          ${infoTable([
            ["Order number",   s("orderNumber")],
            ["Customer",       s("customerName")],
            ["Phone",          s("customerPhone", "—")],
            ["Address",        s("address")],
            ["County",         s("county")],
            ["Items",          s("items", "—")],
          ])}
          <p>Log in to your logistics portal to accept and manage this delivery.</p>
          ${ctaButton("View in portal", s("url", "https://shaniidrx.com/portal/logistics"))}`

      /* ── Internal / admin ─────────────────────────────────────────────── */

      case "admin.low_stock":
        return `<p>This is an automated alert from the Shaniid RX inventory system.</p>
          <p><b>${s("productName")}</b> has fallen below its low-stock threshold.</p>
          ${infoTable([
            ["Product",          s("productName")],
            ["SKU / ID",         s("productId", "—")],
            ["Current stock",    `${n("stockCount")} units`],
            ["Threshold",        `${n("threshold")} units`],
            ["Category",         s("category", "—")],
          ])}
          <p>Please reorder or update stock immediately to avoid fulfilment disruption.</p>
          ${ctaButton("Manage products", s("url", "https://shaniidrx.com/admin/products"))}`

      case "admin.new_prescription":
        return `<p>A new prescription has been uploaded and is waiting for pharmacist review.</p>
          ${infoTable([
            ["Patient",    s("patientName", "Anonymous")],
            ["Reference",  s("rxNumber")],
            ["Uploaded",   s("uploadedAt", new Date().toLocaleDateString("en-GB"))],
          ])}
          ${ctaButton("Review prescription", s("url", "https://shaniidrx.com/admin/prescriptions"))}`

      case "admin.new_consultation":
        return `<p>A new consultation has been booked and requires doctor assignment.</p>
          ${infoTable([
            ["Patient",    s("patientName", "Anonymous")],
            ["Date & time", s("dateTime", "—")],
            ["Type",       s("consultationType", "General")],
          ])}
          ${ctaButton("View consultation", s("url", "https://shaniidrx.com/admin/consultations"))}`

      default:
        return `<p>${s("message", "Hello from Shaniid RX.")}</p>`
    }
  })()

  return layout(body)
}

/* ─── Service ─────────────────────────────────────────────────────────────── */

@Injectable()
export class EmailService {
  private apiKey  = process.env.RESEND_API_KEY   || ""
  private fromAddr = process.env.RESEND_FROM_EMAIL || "Shaniid RX <noreply@shaniidrx.com>"

  isEnabled(): boolean { return !!this.apiKey }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.isEnabled()) {
      return { ok: false, skipped: true, reason: "RESEND_API_KEY is not configured" }
    }
    if (!input?.to) return { ok: false, reason: "Missing recipient" }

    const template = input.template ?? "generic"
    const subject  = input.subject || SUBJECT[template]
    const html     = input.html    || render(template, input.data ?? {})

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: input.from || this.fromAddr, to: input.to, subject, html, text: input.text }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        return { ok: false, reason: `Resend ${res.status}: ${body.slice(0, 240)}` }
      }
      const json = (await res.json().catch(() => ({}))) as { id?: string }
      return { ok: true, id: json?.id }
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) }
    }
  }
}

/* ─── Controller ──────────────────────────────────────────────────────────── */

@Controller("notifications/email")
class EmailController {
  constructor(@Inject(EmailService) private readonly svc: EmailService) {}

  @Get("status")
  status() {
    return {
      enabled:   this.svc.isEnabled(),
      templates: Object.keys(SUBJECT),
    }
  }

  @Post("send")
  async send(@Body() body: SendEmailInput) {
    if (!body?.to) throw new HttpException("Missing 'to'", HttpStatus.BAD_REQUEST)
    const r = await this.svc.send(body)
    if (!r.ok && r.skipped) {
      throw new HttpException({ ok: false, hint: r.reason }, HttpStatus.SERVICE_UNAVAILABLE)
    }
    return r
  }
}

/* ─── Module ──────────────────────────────────────────────────────────────── */

@Module({
  controllers: [EmailController],
  providers:   [EmailService],
  exports:     [EmailService],
})
export class EmailModule {}

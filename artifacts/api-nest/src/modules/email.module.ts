/**
 * Email module — transactional email dispatch.
 *
 * Routes:
 *   POST /api/v2/email/send      — send a single transactional email
 *   GET  /api/v2/email/templates — list available templates
 *   POST /api/v2/email/preview   — render a template with sample data
 *
 * Today the module logs to console (dev stub). To connect a real provider:
 *   1. Choose a provider (Resend, SendGrid, SES).
 *   2. Add its SDK to api-nest's package.json.
 *   3. Implement `EmailProvider.send()` in this file.
 *   4. Set the required env var (e.g. RESEND_API_KEY) and read it in the service.
 *   5. No controller changes needed.
 *
 * Templates use {{token}} interpolation (same convention as message-templates.tsx).
 * Common tokens: {{patientName}}, {{orderNumber}}, {{deliveryDate}}, {{trackingUrl}}.
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

/**
 * Resend-backed transactional email.
 *
 * Env-gated by RESEND_API_KEY. If the key is missing the service still loads
 * but returns a 503 with a friendly hint so the storefront keeps working
 * without crashing during local dev.
 *
 * Supported transactional templates:
 *   - account.verification        → magic link / OTP from Clerk passthrough
 *   - prescription.approved       → pharmacist verified an Rx, now buyable
 *   - order.receipt               → Paystack payment succeeded
 *   - consultation.booked         → doctor video room link
 *   - support.ticket.reply        → admin replied on a support thread
 *
 * Each call returns `{ ok, id?, skipped?, reason? }`. We never throw on
 * Resend's API errors — emails are best-effort, the rest of the flow
 * should never be blocked by a transport failure.
 */

export type EmailTemplate =
  | "account.verification"
  | "prescription.approved"
  | "order.receipt"
  | "consultation.booked"
  | "support.ticket.reply"
  | "generic"

export type SendEmailInput = {
  to: string
  subject: string
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

const BRAND_WINE = "#3D0814"
const BRAND_ORANGE = "#F97316"
const BRAND_RED = "#B91C1C"

const TEMPLATE_SUBJECT: Record<EmailTemplate, string> = {
  "account.verification":   "Confirm your Shaniid RX account",
  "prescription.approved":  "Your prescription is verified — ready to order",
  "order.receipt":          "Your Shaniid RX order receipt",
  "consultation.booked":    "Your Shaniid RX consultation is confirmed",
  "support.ticket.reply":   "An update on your Shaniid RX support ticket",
  "generic":                "Shaniid RX",
}

function renderTemplateHtml(template: EmailTemplate, data: Record<string, unknown> = {}): string {
  const name = typeof data.name === "string" ? data.name : "there"
  const body = (() => {
    switch (template) {
      case "account.verification":
        return `<p>Welcome to Shaniid RX, ${name}.</p>
          <p>Please confirm your account using the link or code in the next message.</p>
          <p>If this wasn't you, you can safely ignore this email.</p>`
      case "prescription.approved":
        return `<p>Hello ${name},</p>
          <p>Your prescription <b>${String(data.rxNumber ?? "")}</b> has been verified by one of our pharmacists. You can now order the approved medication from your account.</p>
          <p><a href="${String(data.url ?? "https://shaniidrx.com/account/prescriptions")}" style="background:linear-gradient(135deg,${BRAND_ORANGE},${BRAND_RED});color:#fff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:600;">View prescription</a></p>`
      case "order.receipt":
        return `<p>Hello ${name},</p>
          <p>Thank you for your order <b>${String(data.orderNumber ?? "")}</b>. We received your payment of <b>KSh ${String(data.amount ?? "")}</b> and a pharmacist is preparing your medicine.</p>
          <p>You'll get another update when it's on its way.</p>`
      case "consultation.booked":
        return `<p>Hello ${name},</p>
          <p>Your consultation with <b>${String(data.doctor ?? "your doctor")}</b> is confirmed. Join from the link below at the agreed time.</p>
          <p><a href="${String(data.url ?? "https://shaniidrx.com/speak-to-a-doctor")}" style="background:linear-gradient(135deg,${BRAND_ORANGE},${BRAND_RED});color:#fff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:600;">Join consultation</a></p>`
      case "support.ticket.reply":
        return `<p>Hello ${name},</p>
          <p>Your support ticket <b>${String(data.ticketId ?? "")}</b> has a new reply from our team:</p>
          <blockquote style="border-left:3px solid ${BRAND_WINE};padding:8px 14px;color:#374151;">${String(data.message ?? "")}</blockquote>
          <p><a href="${String(data.url ?? "https://shaniidrx.com/account/support")}" style="background:linear-gradient(135deg,${BRAND_ORANGE},${BRAND_RED});color:#fff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:600;">View ticket</a></p>`
      default:
        return `<p>${String(data.message ?? "Hello from Shaniid RX.")}</p>`
    }
  })()
  return `<!doctype html><html><body style="font-family:Inter,system-ui,sans-serif;color:#1f1115;background:#FFFBF5;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #F2DCC8;border-radius:16px;overflow:hidden;">
      <div style="background:${BRAND_WINE};padding:18px 24px;color:#fff;font-weight:700;font-size:16px;">SHANIID RX</div>
      <div style="padding:22px 26px;font-size:15px;line-height:1.55;">${body}</div>
      <div style="padding:16px 26px;background:#FFFBF5;border-top:1px solid #F2DCC8;font-size:11px;color:#6b5a60;">
        Shaniid RX — Trusted pharmaceutical infrastructure. If you didn't request this, please ignore.
      </div>
    </div>
  </body></html>`
}

@Injectable()
export class EmailService {
  private apiKey = process.env.RESEND_API_KEY || ""
  private fromAddr = process.env.RESEND_FROM || "Shaniid RX <noreply@shaniidrx.com>"

  isEnabled(): boolean {
    return !!this.apiKey
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.isEnabled()) {
      return { ok: false, skipped: true, reason: "RESEND_API_KEY is not configured" }
    }
    if (!input?.to) {
      return { ok: false, reason: "Missing recipient" }
    }

    const template = input.template ?? "generic"
    const subject = input.subject || TEMPLATE_SUBJECT[template]
    const html = input.html || renderTemplateHtml(template, input.data ?? {})

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: input.from || this.fromAddr,
          to: input.to,
          subject,
          html,
          text: input.text,
        }),
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

@Controller("notifications/email")
class EmailController {
  constructor(@Inject(EmailService) private readonly svc: EmailService) {}

  @Get("status")
  status() {
    return { enabled: this.svc.isEnabled() }
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

@Module({
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

/**
 * WhatsApp module — outbound WhatsApp dispatch.
 *
 * Provider decision (May 2026):
 *   The storefront message-templates already carry Meta-approved template
 *   names (`whatsappTemplateName`, e.g. "order_confirmation_v1"), so the
 *   primary provider is the **Meta WhatsApp Cloud API**. A **Twilio** WhatsApp
 *   transport is also supported as a drop-in alternative (useful before a Meta
 *   Business account / template approval is in place).
 *
 * The module is fully env-gated and fails *soft*: when no provider is
 * configured, `send()` returns `{ ok:false, skipped:true }` instead of
 * throwing, so callers (e.g. the Communications pipeline) can fall back to the
 * outbox queue. Nothing breaks if WhatsApp is never switched on.
 *
 * Routes:
 *   GET  /api/v2/notifications/whatsapp/status  — provider readiness (admin)
 *   POST /api/v2/notifications/whatsapp/send    — send a message (admin)
 *
 * Env vars:
 *   WHATSAPP_PROVIDER        — "meta" | "twilio" (optional; auto-detected)
 *   --- Meta WhatsApp Cloud API ---
 *   WHATSAPP_ACCESS_TOKEN    — permanent system-user token
 *   WHATSAPP_PHONE_NUMBER_ID — the sending phone number id
 *   WHATSAPP_API_VERSION     — Graph API version (default v21.0)
 *   --- Twilio ---
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM     — e.g. "whatsapp:+14155238886"
 *
 * Note on @Inject(WhatsAppService):
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
  UseGuards,
} from "@nestjs/common"
import { AdminGuard } from "../common/admin-guard"

export type WhatsAppProvider = "meta" | "twilio" | "none"

export type SendWhatsAppInput = {
  /** Recipient MSISDN — any human format; normalised to E.164 digits. */
  to: string
  /** Plain text body (session message / Twilio). */
  body?: string
  /** Meta-approved template name. When set and provider is Meta, a template
   *  message is sent instead of free-form text. */
  templateName?: string
  /** Ordered body parameters for the Meta template ({{1}}, {{2}}, …). */
  variables?: string[]
  /** Template language code (default "en"). */
  languageCode?: string
}

export type SendWhatsAppResult = {
  ok: boolean
  id?: string
  skipped?: boolean
  reason?: string
}

const REQUEST_TIMEOUT_MS = 8_000

function digits(input: string): string {
  return (input || "").replace(/[^\d]/g, "")
}

/**
 * Derive the ordered positional-parameter list for a Meta template body.
 *
 * Meta templates use positional placeholders ({{1}}, {{2}}, …). Our admin
 * message-templates use *named* tokens ({{first_name}}, {{order_id}}, …). The
 * reliable {{token}}→positional mapping is the **order of first appearance** in
 * the template body: when a Meta template is registered, its body is the same
 * copy with each named token replaced by {{1}}, {{2}}, … left-to-right. So
 * scanning the stored body for tokens in first-appearance order (deduped)
 * yields exactly the positional order Meta expects.
 *
 * Convention (document this when registering Meta templates): the Meta template
 * body MUST be the admin template body with named tokens swapped for {{1..N}}
 * in the same left-to-right order.
 */
export function orderedTemplateTokens(body: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body || ""))) {
    const key = m[1]
    if (!seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
  }
  return out
}

/**
 * Normalise a free-form patient language preference to a Meta template language
 * code. Accepts ISO codes ("en", "sw") or human labels ("English", "Swahili",
 * "Somali", "Kiswahili") and falls back to "en". Region-tagged codes ("en_US")
 * collapse to their base language. Keep the supported set aligned with the
 * languages your Meta templates are actually approved in.
 */
export function normalizeLanguageCode(input?: string): string {
  const v = String(input ?? "").trim().toLowerCase()
  if (!v) return "en"
  const map: Record<string, string> = {
    en: "en", eng: "en", english: "en",
    sw: "sw", swa: "sw", swahili: "sw", kiswahili: "sw",
    so: "so", som: "so", somali: "so",
    ar: "ar", arabic: "ar",
  }
  if (map[v]) return map[v]
  return v.split(/[-_]/)[0] || "en"
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

@Injectable()
export class WhatsAppService {
  /* Meta WhatsApp Cloud API */
  private metaToken = process.env.WHATSAPP_ACCESS_TOKEN || ""
  private metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || ""
  private apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0"

  /* Twilio */
  private twilioSid = process.env.TWILIO_ACCOUNT_SID || ""
  private twilioToken = process.env.TWILIO_AUTH_TOKEN || ""
  private twilioFrom = process.env.TWILIO_WHATSAPP_FROM || ""

  private metaConfigured(): boolean {
    return !!(this.metaToken && this.metaPhoneId)
  }

  private twilioConfigured(): boolean {
    return !!(this.twilioSid && this.twilioToken && this.twilioFrom)
  }

  /** Resolve the active provider, honouring WHATSAPP_PROVIDER then auto-detect. */
  provider(): WhatsAppProvider {
    const pref = (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase()
    if (pref === "meta") return this.metaConfigured() ? "meta" : "none"
    if (pref === "twilio") return this.twilioConfigured() ? "twilio" : "none"
    if (this.metaConfigured()) return "meta"
    if (this.twilioConfigured()) return "twilio"
    return "none"
  }

  isEnabled(): boolean {
    return this.provider() !== "none"
  }

  status() {
    return {
      configured: this.isEnabled(),
      provider: this.provider(),
      meta: { configured: this.metaConfigured() },
      twilio: { configured: this.twilioConfigured() },
    }
  }

  async send(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const provider = this.provider()
    if (provider === "none") {
      return {
        ok: false,
        skipped: true,
        reason:
          "WhatsApp provider not configured (set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID for Meta, or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM for Twilio)",
      }
    }
    const to = digits(input?.to || "")
    if (!to) return { ok: false, reason: "Missing or invalid recipient" }
    if (!input.body && !input.templateName) {
      return { ok: false, reason: "Provide a body or a templateName" }
    }
    try {
      return provider === "meta"
        ? await this.sendMeta(to, input)
        : await this.sendTwilio(to, input)
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async sendMeta(to: string, input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.metaPhoneId}/messages`
    const payload = input.templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode || "en" },
            ...(input.variables && input.variables.length
              ? {
                  components: [
                    {
                      type: "body",
                      parameters: input.variables.map((text) => ({ type: "text", text })),
                    },
                  ],
                }
              : {}),
          },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: input.body || "" },
        }

    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.metaToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      REQUEST_TIMEOUT_MS,
    )
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
      messages?: Array<{ id?: string }>
    }
    if (!res.ok) {
      return { ok: false, reason: data?.error?.message || `Meta WhatsApp API ${res.status}` }
    }
    return { ok: true, id: data?.messages?.[0]?.id }
  }

  private async sendTwilio(to: string, input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`
    const from = this.twilioFrom.startsWith("whatsapp:")
      ? this.twilioFrom
      : `whatsapp:${this.twilioFrom}`
    const params = new URLSearchParams()
    params.set("To", `whatsapp:+${to}`)
    params.set("From", from)
    params.set("Body", input.body || "")

    const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString("base64")
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
      REQUEST_TIMEOUT_MS,
    )
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string }
    if (!res.ok) {
      return { ok: false, reason: data?.message || `Twilio API ${res.status}` }
    }
    return { ok: true, id: data?.sid }
  }
}

@UseGuards(AdminGuard)
@Controller("notifications/whatsapp")
class WhatsAppController {
  constructor(@Inject(WhatsAppService) private readonly whatsapp: WhatsAppService) {}

  @Get("status")
  status() {
    return this.whatsapp.status()
  }

  @Post("send")
  async send(@Body() body: SendWhatsAppInput) {
    if (!body?.to) {
      throw new HttpException("`to` is required", HttpStatus.BAD_REQUEST)
    }
    if (!body?.body && !body?.templateName) {
      throw new HttpException("Provide a `body` or a `templateName`", HttpStatus.BAD_REQUEST)
    }
    return this.whatsapp.send(body)
  }
}

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}

/**
 * SMS module — outbound SMS dispatch via Africa's Talking.
 *
 * Africa's Talking is the SMS provider for the East-African market (Kenya
 * first). The module is fully env-gated and fails *soft*: when no provider is
 * configured, `send()` returns `{ ok:false, skipped:true }` instead of
 * throwing, so callers (the Communications pipeline / campaign sender) can fall
 * back to the outbox queue. Nothing breaks if SMS is never switched on.
 *
 * Routes:
 *   GET  /api/v2/notifications/sms/status  — provider readiness (admin)
 *   POST /api/v2/notifications/sms/send    — send a message (admin)
 *
 * Env vars:
 *   AFRICASTALKING_USERNAME   — API username ("sandbox" routes to the sandbox)
 *   AFRICASTALKING_API_KEY    — API key
 *   AFRICASTALKING_SENDER_ID  — optional alphanumeric sender id / short code
 *
 * Note on @Inject(SmsService):
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

export type SmsProvider = "africastalking" | "none"

export type SendSmsInput = {
  /** Recipient MSISDN — any human format; normalised to E.164 (Kenya default). */
  to: string
  /** Plain text body. */
  message: string
}

export type SendSmsResult = {
  ok: boolean
  id?: string
  skipped?: boolean
  reason?: string
}

const REQUEST_TIMEOUT_MS = 8_000

/**
 * Normalise a phone number to E.164. Defaults to Kenya (+254) for local formats
 * since that is the launch market; numbers already in international form
 * (leading "+" or country code) are preserved.
 */
export function toE164(input: string): string {
  const raw = (input || "").trim()
  if (raw.startsWith("+")) return "+" + raw.slice(1).replace(/\D/g, "")
  const d = raw.replace(/\D/g, "")
  if (!d) return ""
  if (d.startsWith("254")) return "+" + d
  if (d.startsWith("0")) return "+254" + d.slice(1)
  // Bare local subscriber number (e.g. 7XXXXXXXX / 1XXXXXXXX).
  if (d.length === 9 && (d.startsWith("7") || d.startsWith("1"))) return "+254" + d
  return "+" + d
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
export class SmsService {
  private username = process.env.AFRICASTALKING_USERNAME || ""
  private apiKey = process.env.AFRICASTALKING_API_KEY || ""
  private senderId = process.env.AFRICASTALKING_SENDER_ID || ""

  private get sandbox(): boolean {
    return this.username.trim().toLowerCase() === "sandbox"
  }

  private get baseUrl(): string {
    return this.sandbox
      ? "https://api.sandbox.africastalking.com"
      : "https://api.africastalking.com"
  }

  private configured(): boolean {
    return !!(this.username && this.apiKey)
  }

  provider(): SmsProvider {
    return this.configured() ? "africastalking" : "none"
  }

  isEnabled(): boolean {
    return this.provider() !== "none"
  }

  status() {
    return {
      configured: this.isEnabled(),
      provider: this.provider(),
      sandbox: this.sandbox,
      senderId: this.senderId || null,
    }
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    if (!this.configured()) {
      return {
        ok: false,
        skipped: true,
        reason:
          "SMS provider not configured (set AFRICASTALKING_USERNAME + AFRICASTALKING_API_KEY)",
      }
    }
    const to = toE164(input?.to || "")
    if (!to) return { ok: false, reason: "Missing or invalid recipient" }
    if (!input?.message) return { ok: false, reason: "Missing message body" }

    try {
      const params = new URLSearchParams()
      params.set("username", this.username)
      params.set("to", to)
      params.set("message", input.message)
      if (this.senderId) params.set("from", this.senderId)

      const res = await fetchWithTimeout(
        `${this.baseUrl}/version1/messaging`,
        {
          method: "POST",
          headers: {
            apiKey: this.apiKey,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: params.toString(),
        },
        REQUEST_TIMEOUT_MS,
      )
      const data = (await res.json().catch(() => ({}))) as {
        SMSMessageData?: {
          Message?: string
          Recipients?: Array<{
            statusCode?: number
            status?: string
            number?: string
            messageId?: string
          }>
        }
      }
      if (!res.ok) {
        return { ok: false, reason: `Africa's Talking API ${res.status}` }
      }
      const recipient = data?.SMSMessageData?.Recipients?.[0]
      // Africa's Talking returns 100/101/102 as the success status codes; a
      // recipient-level failure (e.g. invalid number, insufficient balance)
      // carries a different code + descriptive status string.
      const ok =
        !!recipient &&
        (recipient.status === "Success" ||
          (typeof recipient.statusCode === "number" &&
            recipient.statusCode >= 100 &&
            recipient.statusCode < 103))
      if (!ok) {
        return {
          ok: false,
          reason:
            recipient?.status ||
            data?.SMSMessageData?.Message ||
            "SMS not accepted by provider",
        }
      }
      return { ok: true, id: recipient?.messageId }
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) }
    }
  }
}

@UseGuards(AdminGuard)
@Controller("notifications/sms")
class SmsController {
  constructor(@Inject(SmsService) private readonly sms: SmsService) {}

  @Get("status")
  status() {
    return this.sms.status()
  }

  @Post("send")
  async send(@Body() body: SendSmsInput) {
    if (!body?.to) {
      throw new HttpException("`to` is required", HttpStatus.BAD_REQUEST)
    }
    if (!body?.message) {
      throw new HttpException("`message` is required", HttpStatus.BAD_REQUEST)
    }
    return this.sms.send(body)
  }
}

@Module({
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}

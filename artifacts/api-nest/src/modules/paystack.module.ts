/**
 * Paystack payments module.
 *
 * Mounted at `/api/v2/payments/paystack` and exposes:
 *   POST   /charge              – initiate an M-Pesa STK push (KES mobile money)
 *   GET    /status?reference=…  – poll the latest status for a reference
 *   POST   /callback            – Paystack webhook (charge.success / charge.failed)
 *
 * Env contract:
 *   PAYSTACK_SECRET_KEY      – required to talk to Paystack. If missing every
 *                              endpoint returns HTTP 503 with a friendly hint
 *                              (the rest of the app keeps running).
 *   PAYSTACK_PUBLIC_KEY      – optional, surfaced on /charge response so the
 *                              storefront can render Paystack-branded UI.
 *   PAYSTACK_CALLBACK_URL    – optional, sent on each charge so Paystack pings
 *                              us on settlement. Falls back to "{host}/api/v2/payments/paystack/callback".
 *
 * Storage is an in-memory `Map<reference, PaymentRecord>` keyed by Paystack
 * reference. Mirrors the legacy PayHero shape so the storefront can swap the
 * fetch URLs without touching its UI state machine. Swap to Drizzle by
 * replacing the `Map` with a `paystack_payments` table — no controller changes.
 */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { createHmac, timingSafeEqual } from "node:crypto"

type PaystackStatus = "pending" | "success" | "failed" | "cancelled"

export interface PaymentRecord {
  reference: string
  orderNumber: string
  phone: string
  amount: number
  currency: "KES"
  status: PaystackStatus
  mpesaReceipt?: string
  message?: string
  createdAt: string
  updatedAt: string
  paystackId?: string | number
}

interface ChargeInput {
  orderNumber?: string
  phone?: string
  amount?: number
  email?: string
  customerName?: string
}

interface PaystackChargeApiResponse {
  status?: boolean
  message?: string
  data?: {
    reference?: string
    status?: string
    display_text?: string
    id?: number | string
  }
}

interface PaystackVerifyApiResponse {
  status?: boolean
  message?: string
  data?: {
    reference?: string
    status?: string
    gateway_response?: string
    id?: number | string
    authorization?: { mobile_money_number?: string }
    metadata?: { receipt_number?: string }
  }
}

interface PaystackCallbackEvent {
  event?: string
  data?: {
    reference?: string
    status?: string
    gateway_response?: string
    id?: number | string
    customer?: { phone?: string }
    metadata?: Record<string, unknown>
    authorization?: { mobile_money_number?: string }
  }
}

function normalizeKePhone(raw: string): string {
  const digits = String(raw || "").replace(/[\s\-()+]/g, "")
  if (digits.startsWith("254")) return digits
  if (digits.startsWith("0") && digits.length >= 10) return `254${digits.slice(1)}`
  if (digits.length === 9) return `254${digits}`
  return digits
}

function paystackStatusToOurs(s?: string): PaystackStatus {
  const v = (s || "").toLowerCase()
  if (v === "success") return "success"
  if (v === "failed") return "failed"
  if (v === "abandoned" || v === "reversed") return "cancelled"
  return "pending"
}

@Injectable()
class PaystackService {
  private readonly secret = process.env["PAYSTACK_SECRET_KEY"] ?? ""
  private readonly publicKey = process.env["PAYSTACK_PUBLIC_KEY"] ?? ""
  private readonly defaultCallback = process.env["PAYSTACK_CALLBACK_URL"] ?? ""
  private readonly base = "https://api.paystack.co"
  private readonly records = new Map<string, PaymentRecord>()
  private readonly byOrder = new Map<string, string>() // orderNumber -> reference

  isConfigured(): boolean {
    return Boolean(this.secret)
  }

  requireConfigured() {
    if (!this.isConfigured()) {
      throw new HttpException(
        {
          error: "Payment provider not configured",
          hint:
            "Set PAYSTACK_SECRET_KEY (and optionally PAYSTACK_PUBLIC_KEY, PAYSTACK_CALLBACK_URL) and restart the api-nest service.",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
  }

  getPublicConfig() {
    return {
      configured: this.isConfigured(),
      publicKey: this.publicKey || null,
    }
  }

  private buildCallbackUrl(req: Request): string {
    if (this.defaultCallback) return this.defaultCallback
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https"
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host
    return host ? `${proto}://${host}/api/v2/payments/paystack/callback` : ""
  }

  private async paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...(init ?? {}),
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    })
    const text = await res.text()
    let json: unknown
    try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
    if (!res.ok) {
      const msg = (json as { message?: string })?.message || `Paystack ${res.status}`
      throw new HttpException({ error: msg, status: res.status, raw: json }, HttpStatus.BAD_GATEWAY)
    }
    return json as T
  }

  async charge(req: Request, input: ChargeInput): Promise<{
    success: true
    status: PaystackStatus
    reference: string
    publicKey: string | null
    message: string
  }> {
    this.requireConfigured()
    const phone = normalizeKePhone(input.phone ?? "")
    const amount = Math.max(1, Math.round(Number(input.amount ?? 0)))
    const email = (input.email && input.email.includes("@"))
      ? input.email.trim()
      : `${phone || "guest"}@shaniidrx.local`
    if (!/^254[17]\d{8}$/.test(phone)) {
      throw new HttpException("Enter a valid Safaricom number (e.g. 0712345678)", HttpStatus.BAD_REQUEST)
    }
    if (amount < 1) {
      throw new HttpException("Amount must be at least KES 1", HttpStatus.BAD_REQUEST)
    }
    const orderNumber = String(input.orderNumber ?? "").trim() || `SHX-${Date.now().toString(36).toUpperCase()}`

    const payload = {
      email,
      amount: amount * 100, // Paystack expects the smallest currency unit
      currency: "KES",
      mobile_money: { phone, provider: "mpesa" },
      metadata: {
        order_number: orderNumber,
        customer_name: input.customerName || "",
        source: "shaniidrx-storefront",
      },
      callback_url: this.buildCallbackUrl(req),
    }

    const res = await this.paystackFetch<PaystackChargeApiResponse>("/charge", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const reference = res.data?.reference || `psk_${Date.now().toString(36)}`
    const status = paystackStatusToOurs(res.data?.status)

    const now = new Date().toISOString()
    const record: PaymentRecord = {
      reference,
      orderNumber,
      phone,
      amount,
      currency: "KES",
      status,
      message: res.data?.display_text || res.message || "STK push sent to your phone",
      paystackId: res.data?.id,
      createdAt: now,
      updatedAt: now,
    }
    this.records.set(reference, record)
    this.byOrder.set(orderNumber, reference)

    return {
      success: true,
      status,
      reference,
      publicKey: this.publicKey || null,
      message: record.message ?? "",
    }
  }

  /**
   * Returns the cached record and, while still pending, lazily verifies with
   * Paystack so the storefront poll loop is the only thing that needs to fire.
   */
  async status(args: { reference?: string; orderNumber?: string }): Promise<PaymentRecord> {
    this.requireConfigured()
    const reference =
      args.reference ||
      (args.orderNumber ? this.byOrder.get(args.orderNumber) : undefined)
    if (!reference) {
      throw new HttpException("Unknown payment reference", HttpStatus.NOT_FOUND)
    }
    const cached = this.records.get(reference)
    if (!cached) {
      throw new HttpException("Unknown payment reference", HttpStatus.NOT_FOUND)
    }
    if (cached.status !== "pending") return cached

    try {
      const verify = await this.paystackFetch<PaystackVerifyApiResponse>(
        `/transaction/verify/${encodeURIComponent(reference)}`,
      )
      const status = paystackStatusToOurs(verify.data?.status)
      const updated: PaymentRecord = {
        ...cached,
        status,
        mpesaReceipt: verify.data?.metadata?.receipt_number || cached.mpesaReceipt,
        message: verify.data?.gateway_response || cached.message,
        updatedAt: new Date().toISOString(),
      }
      this.records.set(reference, updated)
      return updated
    } catch {
      // Stay "pending" if Paystack is briefly unreachable — the storefront
      // keeps polling, the webhook will catch us up.
      return cached
    }
  }

  /**
   * Verifies a Paystack webhook by computing HMAC-SHA512 of the raw request
   * body using `PAYSTACK_SECRET_KEY` and comparing in constant time to the
   * `x-paystack-signature` header. Throws HttpException on any mismatch so
   * the controller returns 401/403 and never mutates state on forged calls.
   */
  verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
    if (!this.secret) {
      throw new HttpException(
        { error: "Webhook verification disabled — PAYSTACK_SECRET_KEY not set" },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
    if (!rawBody || rawBody.length === 0) {
      throw new HttpException("Empty webhook body", HttpStatus.BAD_REQUEST)
    }
    if (!signatureHeader || typeof signatureHeader !== "string") {
      throw new HttpException("Missing webhook signature", HttpStatus.UNAUTHORIZED)
    }
    const expected = createHmac("sha512", this.secret).update(rawBody).digest("hex")
    let provided: Buffer
    let computed: Buffer
    try {
      provided = Buffer.from(signatureHeader, "hex")
      computed = Buffer.from(expected, "hex")
    } catch {
      throw new HttpException("Malformed webhook signature", HttpStatus.UNAUTHORIZED)
    }
    if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) {
      throw new HttpException("Invalid webhook signature", HttpStatus.UNAUTHORIZED)
    }
  }

  /** Webhook ingest. Signature is already verified by the controller. */
  applyCallback(event: PaystackCallbackEvent): { ok: true } {
    const data = event?.data
    if (!data?.reference) return { ok: true }
    // Only act on events we recognize — avoid future event types silently
    // flipping payment state in unintended ways.
    const ev = (event?.event || "").toLowerCase()
    if (ev && ev !== "charge.success" && ev !== "charge.failed") return { ok: true }
    const cached = this.records.get(data.reference)
    if (!cached) return { ok: true }
    const status = paystackStatusToOurs(data.status)
    const updated: PaymentRecord = {
      ...cached,
      status,
      mpesaReceipt:
        (data.metadata as { receipt_number?: string } | undefined)?.receipt_number ||
        cached.mpesaReceipt,
      message: data.gateway_response || cached.message,
      updatedAt: new Date().toISOString(),
    }
    this.records.set(data.reference, updated)
    return { ok: true }
  }
}

@Controller("payments/paystack")
class PaystackController {
  constructor(@Inject(PaystackService) private readonly svc: PaystackService) {}

  @Get("config")
  config() {
    return this.svc.getPublicConfig()
  }

  @Post("charge")
  async charge(@Req() req: Request, @Body() body: ChargeInput) {
    return this.svc.charge(req, body ?? {})
  }

  @Get("status")
  async status(
    @Query("reference") reference?: string,
    @Query("orderNumber") orderNumber?: string,
  ) {
    return this.svc.status({ reference, orderNumber })
  }

  @Post("callback")
  callback(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature: string | undefined,
    @Body() body: PaystackCallbackEvent,
  ) {
    // 1. Verify HMAC against the raw bytes Paystack signed.
    // 2. Only then mutate state. Forged callbacks return 401 and change nothing.
    this.svc.verifySignature(req.rawBody, signature)
    return this.svc.applyCallback(body ?? {})
  }
}

@Module({
  controllers: [PaystackController],
  providers: [PaystackService],
})
export class PaystackModule {}

/**
 * Paystack payments module (Postgres-backed).
 *
 * Mounted at `/api/v2/payments/paystack` and exposes:
 *   GET    /config             – public config (configured flag + public key)
 *   POST   /charge              – initiate an M-Pesa STK push (KES mobile money)
 *   GET    /status?reference=…  – poll the latest status for a reference
 *   POST   /callback            – Paystack webhook (charge.success / charge.failed)
 *
 * Env contract:
 *   PAYSTACK_SECRET_KEY      – required to talk to Paystack. If missing every
 *                              endpoint returns HTTP 503 with a friendly hint.
 *   PAYSTACK_PUBLIC_KEY      – optional, surfaced on /charge so the storefront
 *                              can render Paystack-branded UI.
 *   PAYSTACK_CALLBACK_URL    – optional; falls back to "{host}/api/v2/payments/paystack/callback".
 *
 * Persistence:
 *   Charges are rows in the `payments` table (provider="paystack"), keyed by the
 *   unique Paystack `reference`. The order number, display message, and Paystack
 *   id ride in the `provider_response` jsonb column (there are no dedicated
 *   columns for them). Lookups by order number query that jsonb field.
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
import { desc, eq, sql } from "drizzle-orm"
import { db, payments } from "@workspace/db"
import { newId } from "../common/repository"

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
  data?: { reference?: string; status?: string; display_text?: string; message?: string; id?: number | string }
}

interface PaystackInitApiResponse {
  status?: boolean
  message?: string
  data?: { authorization_url?: string; access_code?: string; reference?: string }
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

type ProviderMeta = { orderNumber?: string; message?: string; paystackId?: string | number }

function normalizeKePhone(raw: string): string {
  const digits = String(raw || "").replace(/[\s\-()+]/g, "")
  if (digits.startsWith("254")) return digits
  if (digits.startsWith("0") && digits.length >= 10) return `254${digits.slice(1)}`
  if (digits.length === 9) return `254${digits}`
  return digits
}

/**
 * Paystack REQUIRES an email on every transaction and validates it server-side.
 * Guest checkout often has no email, so we synthesise one — but the fallback
 * MUST use a real, registered domain. A reserved TLD like ".local" is rejected
 * by Paystack with "Invalid Email Address Passed", which is exactly what blocked
 * guest M-Pesa checkout. Use the brand's real domain so the charge is accepted.
 */
function resolveCustomerEmail(rawEmail: string | undefined, phone: string): string {
  const e = String(rawEmail ?? "").trim()
  if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return e
  return `${phone || "guest"}@shaniidrx.com`
}

function paystackStatusToOurs(s?: string): PaystackStatus {
  const v = (s || "").toLowerCase()
  if (v === "success") return "success"
  if (v === "failed") return "failed"
  if (v === "abandoned" || v === "reversed") return "cancelled"
  return "pending"
}

function toRecord(r: typeof payments.$inferSelect): PaymentRecord {
  const meta = (r.providerResponse ?? {}) as ProviderMeta
  return {
    reference: r.reference,
    orderNumber: meta.orderNumber ?? "",
    phone: r.phone ?? "",
    amount: r.amount,
    currency: "KES",
    status: r.status as PaystackStatus,
    mpesaReceipt: r.mpesaReceipt ?? undefined,
    message: meta.message ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    paystackId: meta.paystackId,
  }
}

@Injectable()
class PaystackService {
  private readonly secret = process.env["PAYSTACK_SECRET_KEY"] ?? ""
  private readonly publicKey = process.env["PAYSTACK_PUBLIC_KEY"] ?? ""
  private readonly defaultCallback = process.env["PAYSTACK_CALLBACK_URL"] ?? ""
  private readonly base = "https://api.paystack.co"

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
    return { configured: this.isConfigured(), publicKey: this.publicKey || null }
  }

  private buildCallbackUrl(req: Request): string {
    if (this.defaultCallback) return this.defaultCallback
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https"
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host
    return host ? `${proto}://${host}/api/v2/payments/paystack/callback` : ""
  }

  /**
   * Browser-facing return URL for the hosted card checkout. Unlike the webhook
   * `buildCallbackUrl`, this is where Paystack redirects the customer's browser
   * after they finish on the hosted page — so it must be a real page, not the
   * POST webhook endpoint. We point it at the storefront origin; the storefront
   * modal is already polling `/status` by reference, so this is just a courtesy
   * landing for the popped-open tab.
   */
  private buildBrowserReturnUrl(req: Request): string {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https"
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host
    return host ? `${proto}://${host}/?paystack_return=1` : ""
  }

  private async paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Awaited<ReturnType<typeof fetch>>
    try {
      res = await fetch(`${this.base}${path}`, {
        ...(init ?? {}),
        headers: {
          Authorization: `Bearer ${this.secret}`,
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      })
    } catch (err) {
      // Transport-level failure (DNS, timeout, connection reset) — Paystack is
      // unreachable, not a caller error. Surface as 502 so it's handled like an
      // upstream outage rather than bubbling up as a generic 500.
      throw new HttpException(
        `Could not reach Paystack (${(err as Error)?.message || "network error"}). Please try again.`,
        HttpStatus.BAD_GATEWAY,
      )
    }
    const text = await res.text()
    let json: unknown
    try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
    if (!res.ok) {
      // Paystack nests the actionable decline reason in data.message (e.g.
      // "Declined. Please use the test mobile money number…" in test mode, or a
      // real gateway decline like "Insufficient funds"/"Request cancelled by
      // user" in live mode). The top-level message is usually the useless
      // generic "Charge attempted", so prefer the specific nested reason.
      const body = json as { message?: string; data?: { message?: string } }
      const msg = body?.data?.message || body?.message || `Paystack ${res.status}`
      // Paystack 4xx = caller-actionable validation rejection (e.g. "Invalid
      // phone number format", "Declined…"). Surface it as a 4xx so
      // AllExceptionsFilter passes the REAL reason through to the storefront
      // instead of masking every Paystack problem as a generic 5xx "Internal
      // server error". Upstream 5xx / network issues stay a 502 (Paystack is
      // down — not the caller's fault).
      const clientStatus =
        res.status >= 400 && res.status < 500
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.BAD_GATEWAY
      throw new HttpException(msg, clientStatus)
    }
    return json as T
  }

  private async findReferenceByOrder(orderNumber: string): Promise<string | undefined> {
    const rows = await db
      .select({ reference: payments.reference })
      .from(payments)
      .where(sql`${payments.providerResponse} ->> 'orderNumber' = ${orderNumber}`)
      .orderBy(desc(payments.createdAt))
      .limit(1)
    return rows[0]?.reference
  }

  private async readByReference(reference: string): Promise<PaymentRecord | null> {
    const rows = await db.select().from(payments).where(eq(payments.reference, reference)).limit(1)
    return rows[0] ? toRecord(rows[0]) : null
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
    const email = resolveCustomerEmail(input.email, phone)
    if (!/^254[17]\d{8}$/.test(phone)) {
      throw new HttpException(
        "Please enter a valid phone number (e.g. 0712345678, +254712345678, or 0110123456)",
        HttpStatus.BAD_REQUEST,
      )
    }
    if (amount < 1) {
      throw new HttpException("Amount must be at least KES 1", HttpStatus.BAD_REQUEST)
    }
    const orderNumber = String(input.orderNumber ?? "").trim() || `SHX-${Date.now().toString(36).toUpperCase()}`

    const payload = {
      email,
      amount: amount * 100, // Paystack expects the smallest currency unit
      currency: "KES",
      // Paystack mobile-money REQUIRES E.164 with a leading "+". A bare
      // "254XXXXXXXXX" is rejected with "Invalid phone number format"; only
      // "+254XXXXXXXXX" is accepted. We store the bare 254 form internally and
      // only add the "+" on the wire to Paystack.
      mobile_money: { phone: `+${phone}`, provider: "mpesa" },
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
    const message =
      res.data?.display_text ||
      (status === "failed" || status === "cancelled" ? res.data?.message : undefined) ||
      res.message ||
      "STK push sent to your phone"
    const meta: ProviderMeta = { orderNumber, message, paystackId: res.data?.id }

    await db
      .insert(payments)
      .values({
        id: newId("pay"),
        reference,
        provider: "paystack",
        method: "mpesa",
        phone,
        amount,
        currency: "KES",
        status,
        providerResponse: meta,
      })
      .onConflictDoUpdate({
        target: payments.reference,
        set: { status, phone, amount, providerResponse: meta, updatedAt: new Date() },
      })

    return {
      success: true,
      status,
      reference,
      publicKey: this.publicKey || null,
      message,
    }
  }

  /**
   * Initialise a hosted Paystack transaction (card + any enabled channel).
   *
   * Why this exists alongside `charge`:
   *   `charge` does an in-app M-Pesa STK push (great UX, mobile-money only).
   *   Card payments cannot be collected via the raw charge API — Paystack's
   *   documented flow is `POST /transaction/initialize` → redirect the customer
   *   to the returned `authorization_url` (Paystack's PCI-compliant hosted page)
   *   → verify by reference afterwards. We persist the pending row exactly like
   *   `charge`, so the existing `/status` poll, `/transaction/verify`, and the
   *   webhook all confirm card payments with zero extra plumbing.
   */
  async initialize(req: Request, input: ChargeInput): Promise<{
    success: true
    reference: string
    authorizationUrl: string
    publicKey: string | null
  }> {
    this.requireConfigured()
    const amount = Math.max(1, Math.round(Number(input.amount ?? 0)))
    const phone = normalizeKePhone(input.phone ?? "")
    const email = resolveCustomerEmail(input.email, phone)
    if (amount < 1) {
      throw new HttpException("Amount must be at least KES 1", HttpStatus.BAD_REQUEST)
    }
    const orderNumber = String(input.orderNumber ?? "").trim() || `SHX-${Date.now().toString(36).toUpperCase()}`

    const payload = {
      email,
      amount: amount * 100, // smallest currency unit
      currency: "KES",
      channels: ["card"],
      metadata: {
        order_number: orderNumber,
        customer_name: input.customerName || "",
        source: "shaniidrx-storefront",
      },
      callback_url: this.buildBrowserReturnUrl(req),
    }

    const res = await this.paystackFetch<PaystackInitApiResponse>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    const reference = res.data?.reference
    const authorizationUrl = res.data?.authorization_url
    if (!reference || !authorizationUrl) {
      throw new HttpException(
        res.message || "Paystack did not return a checkout URL.",
        HttpStatus.BAD_GATEWAY,
      )
    }

    const meta: ProviderMeta = { orderNumber, message: "Awaiting card payment" }
    await db
      .insert(payments)
      .values({
        id: newId("pay"),
        reference,
        provider: "paystack",
        method: "card",
        phone: phone || null,
        amount,
        currency: "KES",
        status: "pending",
        providerResponse: meta,
      })
      .onConflictDoUpdate({
        target: payments.reference,
        set: { status: "pending", amount, providerResponse: meta, updatedAt: new Date() },
      })

    return { success: true, reference, authorizationUrl, publicKey: this.publicKey || null }
  }

  /**
   * Returns the stored record and, while still pending, lazily verifies with
   * Paystack so the storefront poll loop is the only thing that needs to fire.
   */
  async status(args: { reference?: string; orderNumber?: string }): Promise<PaymentRecord> {
    this.requireConfigured()
    const reference = args.reference || (args.orderNumber ? await this.findReferenceByOrder(args.orderNumber) : undefined)
    if (!reference) {
      throw new HttpException("Unknown payment reference", HttpStatus.NOT_FOUND)
    }
    const cached = await this.readByReference(reference)
    if (!cached) {
      throw new HttpException("Unknown payment reference", HttpStatus.NOT_FOUND)
    }
    if (cached.status !== "pending") return cached

    try {
      const verify = await this.paystackFetch<PaystackVerifyApiResponse>(
        `/transaction/verify/${encodeURIComponent(reference)}`,
      )
      const status = paystackStatusToOurs(verify.data?.status)
      const mpesaReceipt = verify.data?.metadata?.receipt_number || cached.mpesaReceipt
      const message = verify.data?.gateway_response || cached.message
      const meta: ProviderMeta = { orderNumber: cached.orderNumber, message, paystackId: cached.paystackId }
      await db
        .update(payments)
        .set({ status, mpesaReceipt: mpesaReceipt ?? null, providerResponse: meta, updatedAt: new Date() })
        .where(eq(payments.reference, reference))
      return { ...cached, status, mpesaReceipt, message, updatedAt: new Date().toISOString() }
    } catch {
      // Stay "pending" if Paystack is briefly unreachable — the storefront keeps
      // polling, the webhook will catch us up.
      return cached
    }
  }

  /**
   * Verifies a Paystack webhook by computing HMAC-SHA512 of the raw request body
   * using `PAYSTACK_SECRET_KEY` and comparing in constant time to the
   * `x-paystack-signature` header. Throws on any mismatch.
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

  /**
   * Verify that `reference` corresponds to a *successful* Paystack charge of at
   * least `minAmount` KSh, lazily re-checking with Paystack if still pending.
   * The single trust gate other modules use before granting value for a payment.
   */
  async verifyPaidReference(reference: string, minAmount: number): Promise<PaymentRecord> {
    this.requireConfigured()
    const ref = String(reference ?? "").trim()
    if (!ref) {
      throw new HttpException("A payment reference is required.", HttpStatus.BAD_REQUEST)
    }
    // status() throws NOT_FOUND for an unknown reference — blocks forged refs.
    const record = await this.status({ reference: ref })
    if (record.status !== "success") {
      throw new HttpException(
        "Payment has not been confirmed for this reference.",
        HttpStatus.PAYMENT_REQUIRED,
      )
    }
    if (record.amount < minAmount) {
      throw new HttpException(
        "The confirmed payment is less than the amount due.",
        HttpStatus.BAD_REQUEST,
      )
    }
    return record
  }

  /** Webhook ingest. Signature is already verified by the controller. */
  async applyCallback(event: PaystackCallbackEvent): Promise<{ ok: true }> {
    const data = event?.data
    if (!data?.reference) return { ok: true }
    // Only act on events we recognize — avoid future event types silently
    // flipping payment state in unintended ways.
    const ev = (event?.event || "").toLowerCase()
    if (ev && ev !== "charge.success" && ev !== "charge.failed") return { ok: true }
    const cached = await this.readByReference(data.reference)
    if (!cached) return { ok: true }
    const status = paystackStatusToOurs(data.status)
    const mpesaReceipt =
      (data.metadata as { receipt_number?: string } | undefined)?.receipt_number || cached.mpesaReceipt
    const message = data.gateway_response || cached.message
    const meta: ProviderMeta = { orderNumber: cached.orderNumber, message, paystackId: cached.paystackId }
    await db
      .update(payments)
      .set({ status, mpesaReceipt: mpesaReceipt ?? null, providerResponse: meta, updatedAt: new Date() })
      .where(eq(payments.reference, data.reference))
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

  @Post("initialize")
  async initialize(@Req() req: Request, @Body() body: ChargeInput) {
    return this.svc.initialize(req, body ?? {})
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
  exports: [PaystackService],
})
export class PaystackModule {}

export { PaystackService }

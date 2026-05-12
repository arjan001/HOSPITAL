/**
 * PayHero Kenya integration helpers.
 * Docs: https://docs.payhero.co.ke
 *
 * Auth: PayHero uses HTTP Basic auth. Either supply the pre-computed token or
 * the raw username/password pair and we derive the header:
 *   Authorization: Basic base64(USERNAME:PASSWORD)
 *
 * Env vars (add to Netlify > Site > Environment):
 *   PAYHERO_BASIC_AUTH_TOKEN - Pre-computed Basic auth value. Accepts either the
 *                              bare base64 string or the full "Basic xxx" header.
 *                              Takes precedence over username/password when set.
 *   PAYHERO_API_USERNAME     - API username issued by PayHero (used when token
 *                              is not provided)
 *   PAYHERO_API_PASSWORD     - API password issued by PayHero (used when token
 *                              is not provided)
 *   PAYHERO_CHANNEL_ID       - Numeric payment channel ID (Payment Channels >
 *                              My Payment Channels)
 *   PAYHERO_WALLET_ID        - Wallet payment channel ID used to read the
 *                              payments wallet balance
 *                              (GET /api/v2/payment_channels/{id}). Falls
 *                              back to PAYHERO_CHANNEL_ID when unset.
 *   PAYHERO_CALLBACK_URL     - (Optional) Full public URL PayHero posts the STK
 *                              callback to. When unset, the callback URL is
 *                              derived from NEXT_PUBLIC_SITE_URL / URL /
 *                              DEPLOY_PRIME_URL + /api/payments/payhero/callback.
 */

const CALLBACK_PATH = "/api/payments/payhero/callback"

/** Resolve the public callback URL from explicit env or the site's base URL. */
export function resolvePayHeroCallbackUrl(): string | null {
  const explicit = process.env.PAYHERO_CALLBACK_URL?.trim()
  if (explicit) return explicit

  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    ""
  ).trim()
  if (!base) return null

  const normalised = base.replace(/\/+$/, "")
  return `${normalised}${CALLBACK_PATH}`
}

const PAYHERO_BASE = "https://backend.payhero.co.ke/api/v2"

export interface PayHeroEnv {
  username?: string
  password?: string
  channelId: number
  walletId?: number
  callbackUrl: string
  authHeader: string
}

function buildAuthHeader(): string | null {
  const rawToken = process.env.PAYHERO_BASIC_AUTH_TOKEN?.trim()
  if (rawToken) {
    return rawToken.toLowerCase().startsWith("basic ") ? rawToken : `Basic ${rawToken}`
  }

  const username = process.env.PAYHERO_API_USERNAME
  const password = process.env.PAYHERO_API_PASSWORD
  if (!username || !password) return null

  const token = Buffer.from(`${username}:${password}`).toString("base64")
  return `Basic ${token}`
}

export function getPayHeroEnv(): PayHeroEnv | null {
  const channelIdRaw = process.env.PAYHERO_CHANNEL_ID
  const walletIdRaw = process.env.PAYHERO_WALLET_ID
  const callbackUrl = resolvePayHeroCallbackUrl()

  const authHeader = buildAuthHeader()
  if (!authHeader || !channelIdRaw || !callbackUrl) return null

  const channelId = Number(channelIdRaw)
  if (!Number.isFinite(channelId) || channelId <= 0) return null

  // Treat the .env.example placeholder (0) the same as an unset wallet ID so
  // we don't accidentally hit /payment_channels/0, which PayHero answers with
  // "wallet not found". Only a positive integer is considered a real override.
  const walletIdParsed = walletIdRaw ? Number(walletIdRaw) : NaN
  const walletId = Number.isFinite(walletIdParsed) && walletIdParsed > 0 ? walletIdParsed : undefined

  return {
    username: process.env.PAYHERO_API_USERNAME,
    password: process.env.PAYHERO_API_PASSWORD,
    channelId,
    walletId,
    callbackUrl,
    authHeader,
  }
}

/** Normalise a Kenyan phone number to the 2547XXXXXXXX / 2541XXXXXXXX form PayHero accepts. */
export function normalizePhone(input: string): string {
  const cleaned = (input || "").replace(/[\s\-()+]/g, "")
  if (/^254\d{9}$/.test(cleaned)) return cleaned
  if (/^0\d{9}$/.test(cleaned)) return "254" + cleaned.slice(1)
  if (/^7\d{8}$/.test(cleaned) || /^1\d{8}$/.test(cleaned)) return "254" + cleaned
  return cleaned
}

export interface StkPushInput {
  amount: number
  phone: string
  externalReference: string
  customerName?: string
}

export interface StkPushResult {
  success: boolean
  status?: string
  reference?: string
  checkoutRequestId?: string
  raw: unknown
  error?: string
}

/** Initiate a PayHero M-Pesa STK push. Returns the CheckoutRequestID for polling. */
export async function initiateStkPush(env: PayHeroEnv, input: StkPushInput): Promise<StkPushResult> {
  const normalizedPhone = normalizePhone(input.phone)
  // PayHero's backend occasionally returns "sql: no rows in result set" when a
  // required field (most commonly customer_name) is missing — their downstream
  // lookup blows up on the empty value. Guarantee every field is present so
  // their validation never has to guess.
  const payload = {
    amount: Math.max(1, Math.round(input.amount)),
    phone_number: normalizedPhone,
    channel_id: Number(env.channelId),
    provider: "m-pesa",
    external_reference: input.externalReference,
    customer_name: (input.customerName && input.customerName.trim()) || `Customer ${normalizedPhone.slice(-4)}`,
    callback_url: env.callbackUrl,
  }

  try {
    const res = await fetch(`${PAYHERO_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.authHeader,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    const obj = (data && typeof data === "object") ? (data as Record<string, unknown>) : {}

    const extractError = (): string | undefined => {
      const candidates = [
        obj.error_message,
        obj.message,
        obj.error,
        (obj.data as Record<string, unknown> | undefined)?.error_message,
        (obj.data as Record<string, unknown> | undefined)?.message,
        (obj.response as Record<string, unknown> | undefined)?.error_message,
        (obj.response as Record<string, unknown> | undefined)?.ResultDesc,
      ]
      for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return c.trim()
      }
      return undefined
    }

    if (!res.ok) {
      const err = extractError()
      return {
        success: false,
        raw: data,
        error: err ? humanizeStkPushError(err) : `PayHero responded with HTTP ${res.status}`,
      }
    }

    // Some PayHero errors come back as HTTP 200 with { success: false, error: "..." }.
    // The classic offender is "sql: no rows in result set" — bubble that up to
    // the caller instead of pretending it succeeded.
    const succeeded = Boolean(obj.success)
    if (!succeeded) {
      const err = extractError()
      return {
        success: false,
        raw: data,
        error: err ? humanizeStkPushError(err) : "PayHero rejected the STK push",
      }
    }

    return {
      success: true,
      status: typeof obj.status === "string" ? obj.status : undefined,
      reference: typeof obj.reference === "string" ? obj.reference : undefined,
      checkoutRequestId: typeof obj.CheckoutRequestID === "string" ? obj.CheckoutRequestID : undefined,
      raw: data,
    }
  } catch (err) {
    return {
      success: false,
      raw: null,
      error: err instanceof Error ? err.message : "Network error contacting PayHero",
    }
  }
}

export interface TransactionStatusResult {
  status: string
  amount?: number
  mpesaReceipt?: string
  phone?: string
  externalReference?: string
  resultDesc?: string
  raw: unknown
}

/** Query the live status of a PayHero transaction by CheckoutRequestID or reference. */
export async function getTransactionStatus(env: PayHeroEnv, reference: string): Promise<TransactionStatusResult | null> {
  try {
    const url = `${PAYHERO_BASE}/transaction-status?reference=${encodeURIComponent(reference)}`
    const res = await fetch(url, {
      headers: { Authorization: env.authHeader },
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) return null

    const response = (data.response || data.data || data) as Record<string, unknown>
    const status =
      (data.status as string) ||
      (response?.Status as string) ||
      (response?.status as string) ||
      "pending"

    return {
      status: String(status).toLowerCase(),
      amount: typeof response?.Amount === "number" ? (response.Amount as number) : undefined,
      mpesaReceipt: (response?.MpesaReceiptNumber as string) || undefined,
      phone: (response?.Phone as string) || undefined,
      externalReference: (response?.ExternalReference as string) || undefined,
      resultDesc: (response?.ResultDesc as string) || undefined,
      raw: data,
    }
  } catch {
    return null
  }
}

export interface WalletBalance {
  balance: number
  channelId?: number
  channelName?: string
  walletType?: "service_wallet" | "payment_wallet"
  raw: unknown
}

export interface WalletBalanceError {
  error: string
  status?: number
  raw?: unknown
}

export type WalletType = "service_wallet" | "payment_wallet"

function extractBalance(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null
  const obj = payload as Record<string, unknown>

  // Try the many field names PayHero has used across doc versions.
  const candidates = [
    obj.service_wallet_balance,
    obj.payment_wallet_balance,
    obj.wallet_balance,
    obj.balance,
    obj.available_balance,
    obj.amount_available,
    (obj.data as Record<string, unknown> | undefined)?.balance,
    (obj.data as Record<string, unknown> | undefined)?.wallet_balance,
    (obj.wallet as Record<string, unknown> | undefined)?.balance,
    ((obj.balance_plain as Record<string, unknown> | undefined)?.balance),
  ]

  for (const raw of candidates) {
    if (raw == null) continue
    const n = typeof raw === "number" ? raw : Number(raw)
    if (Number.isFinite(n)) return n
  }
  return null
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const obj = payload as Record<string, unknown>
  const candidates = [
    obj.error_message,
    obj.message,
    obj.error,
    obj.detail,
    (obj.data as Record<string, unknown> | undefined)?.error_message,
    (obj.data as Record<string, unknown> | undefined)?.message,
    (obj.data as Record<string, unknown> | undefined)?.error,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim()
  }
  // PayHero sometimes returns { success: false } with no explicit message.
  if (obj.success === false) return "PayHero rejected the request"
  return null
}

function humanizeWalletError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("wallet not found") || lower.includes("channel not found")) {
    return "PayHero returned \"wallet not found\" for the configured channel. Set PAYHERO_WALLET_ID to your wallet payment channel ID (Dashboard > Payment Channels — the channel whose type is \"wallet\")."
  }
  if (lower.includes("sql: no rows in result set")) {
    return "PayHero could not resolve the wallet channel (it returned an empty lookup). Confirm PAYHERO_WALLET_ID points at an active wallet channel in app.payhero.co.ke > Payment Channels, and that the channel is linked to this merchant account."
  }
  return raw
}

/**
 * Translate vague PayHero error strings into something a merchant can act on.
 * The most common offender is "sql: no rows in result set" — PayHero's
 * backend surfaces a Go `database/sql` error verbatim when one of its
 * downstream lookups (channel, wallet, merchant account, short code mapping)
 * returns no rows. Merchants see the raw message and have no idea what to
 * fix. We rewrite known patterns into actionable guidance while preserving
 * the original text for anything we don't recognise.
 */
function humanizeStkPushError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes("sql: no rows in result set")) {
    return "PayHero could not match this payment to an active channel or merchant record. Check in app.payhero.co.ke that: (1) PAYHERO_CHANNEL_ID is an active M-Pesa channel on this merchant account, (2) the channel is linked to your Paybill/Till, and (3) the API credentials belong to the same merchant as the channel."
  }
  if (lower.includes("insufficient")) {
    return "PayHero reports the merchant service wallet has insufficient balance to cover STK-push fees. Top up the service wallet in app.payhero.co.ke > Wallets before retrying."
  }
  if (lower.includes("channel not found") || lower.includes("wallet not found")) {
    return "PayHero could not find the configured payment channel. Verify PAYHERO_CHANNEL_ID matches an active channel in app.payhero.co.ke > Payment Channels."
  }
  return raw
}

/**
 * Read a wallet balance from PayHero.
 *
 * PayHero exposes two distinct endpoints (docs.payhero.co.ke):
 *   - Service wallet — funds STK-push fees are deducted from:
 *       GET /api/v2/wallets?wallet_type=service_wallet
 *     Response carries `available_balance`.
 *   - Payments wallet — customer payments available to withdraw. The
 *     `wallets?wallet_type=payment_wallet` variant is NOT a valid endpoint
 *     and returns "wallet not found"; the balance lives on the wallet
 *     payment channel itself:
 *       GET /api/v2/payment_channels/{wallet_channel_id}
 *     Response carries `balance_plain.balance` and `channel_type: "wallet"`.
 *     `wallet_channel_id` comes from PAYHERO_WALLET_ID (fall back to
 *     PAYHERO_CHANNEL_ID only when the operator has a single channel).
 *
 * On non-2xx responses — and on 200 bodies that carry an explicit PayHero
 * error (e.g. `{ "error": "wallet not found" }`) — we return a
 * `WalletBalanceError` with the PayHero message so the admin UI can show
 * something actionable instead of a generic failure.
 */
export async function getWalletBalance(
  env: PayHeroEnv,
  walletType: WalletType = "service_wallet",
): Promise<WalletBalance | WalletBalanceError> {
  let url: string
  let channelId: number | undefined
  // Track whether we resolved the channel from PAYHERO_WALLET_ID (an explicit
  // override) or fell back to PAYHERO_CHANNEL_ID. When we fell back, the
  // channel likely points at an STK-push channel rather than a wallet, and
  // the error messaging should name PAYHERO_CHANNEL_ID instead of blaming an
  // unset PAYHERO_WALLET_ID.
  let walletIdExplicit = false
  if (walletType === "service_wallet") {
    url = `${PAYHERO_BASE}/wallets?wallet_type=service_wallet`
  } else {
    if (env.walletId && Number.isFinite(env.walletId) && env.walletId > 0) {
      channelId = env.walletId
      walletIdExplicit = true
    } else {
      channelId = env.channelId
    }
    if (!Number.isFinite(channelId) || (channelId as number) <= 0) {
      return {
        error:
          "PAYHERO_WALLET_ID is not set. Add the wallet payment channel ID from app.payhero.co.ke > Payment Channels to read your payments wallet balance.",
      }
    }
    url = `${PAYHERO_BASE}/payment_channels/${encodeURIComponent(String(channelId))}`
  }

  try {
    const res = await fetch(url, { headers: { Authorization: env.authHeader } })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = extractErrorMessage(data) || `PayHero responded with HTTP ${res.status}`
      return { error: humanizeWalletError(msg), status: res.status, raw: data }
    }

    // PayHero occasionally returns HTTP 200 with { error: "wallet not found" }
    // or { success: false, ... } for payment_channels/{id} when the ID does
    // not resolve. Surface those before the balance extractor loses the
    // context.
    const explicitError = extractErrorMessage(data)
    if (explicitError) {
      return { error: humanizeWalletError(explicitError), status: res.status, raw: data }
    }

    // For the payments wallet, insist the channel we read is actually a
    // wallet channel. Pointing PAYHERO_WALLET_ID at the STK-push channel
    // returns valid channel data without balance_plain, which would
    // otherwise bubble up as a vague "unexpected response".
    if (walletType === "payment_wallet" && data && typeof data === "object") {
      const obj = data as Record<string, unknown>
      const type = typeof obj.channel_type === "string" ? obj.channel_type.toLowerCase() : null
      if (type && type !== "wallet") {
        const envVar = walletIdExplicit ? "PAYHERO_WALLET_ID" : "PAYHERO_CHANNEL_ID"
        const hint = walletIdExplicit
          ? `Use the channel whose type is "wallet" in Dashboard > Payment Channels.`
          : `Set PAYHERO_WALLET_ID to your wallet payment channel ID (Dashboard > Payment Channels — the channel whose type is "wallet"). PAYHERO_CHANNEL_ID is the STK-push channel and cannot be used to read the payments wallet balance.`
        return {
          error: `${envVar} ${channelId} points to a "${type}" channel, not a wallet channel. ${hint}`,
          status: res.status,
          raw: data,
        }
      }
    }

    const balance = extractBalance(data)
    if (balance == null) {
      return {
        error:
          walletType === "payment_wallet"
            ? "PayHero returned the channel without a balance. Confirm PAYHERO_WALLET_ID is the wallet payment channel (channel_type: \"wallet\")."
            : "PayHero returned an unexpected wallet response",
        status: res.status,
        raw: data,
      }
    }

    return {
      balance,
      walletType,
      raw: data,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Network error contacting PayHero",
    }
  }
}

export function isWalletBalance(
  v: WalletBalance | WalletBalanceError,
): v is WalletBalance {
  return typeof (v as WalletBalance).balance === "number"
}

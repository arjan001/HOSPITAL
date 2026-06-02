/**
 * Stateless, signed partner session tokens.
 *
 * Mirrors admin-token.ts: a token encodes the partner account id + the partner
 * entity it is scoped to ({pid, partnerType, partnerId}) plus an expiry, signed
 * with an HMAC keyed on SESSION_SECRET. Self-contained so it survives server
 * restarts (the old in-memory partner session map did not) and works across
 * scaled instances with no shared store. Every portal data read resolves
 * `partnerId` from the verified token, so partners can only ever read their own
 * entity's data (BOLA protection).
 *
 * Token format:  base64url(JSON{pid,partnerType,partnerId,exp}) + "." + base64url(HMAC-SHA256)
 */
import { createHmac, timingSafeEqual } from "node:crypto"

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type PartnerTokenClaims = {
  pid: string
  partnerType: "supplier" | "clinic" | "logistics"
  partnerId: string
  exp: number
}

function secret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.ADMIN_API_TOKEN ||
    "shaniidrx-dev-admin-secret"
  )
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest())
}

export function signPartnerToken(
  input: { pid: string; partnerType: PartnerTokenClaims["partnerType"]; partnerId: string },
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const claims: PartnerTokenClaims = {
    pid: input.pid,
    partnerType: input.partnerType,
    partnerId: input.partnerId,
    exp: Date.now() + ttlMs,
  }
  const payload = b64url(Buffer.from(JSON.stringify(claims), "utf8"))
  return `${payload}.${sign(payload)}`
}

export function verifyPartnerToken(token: string | undefined | null): PartnerTokenClaims | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null

  const expected = sign(payload)
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }

  try {
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    )
    const claims = JSON.parse(json) as PartnerTokenClaims
    if (!claims?.pid || !claims?.partnerId || !claims?.partnerType) return null
    if (typeof claims.exp !== "number" || Date.now() > claims.exp) return null
    if (!["supplier", "clinic", "logistics"].includes(claims.partnerType)) return null
    return claims
  } catch {
    return null
  }
}

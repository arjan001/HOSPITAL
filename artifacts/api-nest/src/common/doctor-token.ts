/**
 * Stateless signed doctor portal tokens (mirrors partner-token.ts).
 *
 * Format: base64url(JSON{aid,doctorId,exp}) + "." + base64url(HMAC-SHA256)
 */
import { createHmac, timingSafeEqual } from "node:crypto"

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type DoctorTokenClaims = {
  aid: string
  doctorId: string
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

export function signDoctorToken(
  input: { aid: string; doctorId: string },
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const claims: DoctorTokenClaims = {
    aid: input.aid,
    doctorId: input.doctorId,
    exp: Date.now() + ttlMs,
  }
  const payload = b64url(Buffer.from(JSON.stringify(claims), "utf8"))
  return `${payload}.${sign(payload)}`
}

export function verifyDoctorToken(token: string | undefined | null): DoctorTokenClaims | null {
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
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    const claims = JSON.parse(json) as DoctorTokenClaims
    if (!claims?.aid || !claims?.doctorId) return null
    if (typeof claims.exp !== "number" || Date.now() > claims.exp) return null
    return claims
  } catch {
    return null
  }
}

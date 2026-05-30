/**
 * Stateless, signed admin session tokens.
 *
 * A token encodes the admin user's id + role and an expiry, signed with an
 * HMAC keyed on SESSION_SECRET. Because it is self-contained it survives
 * server restarts and works across horizontally-scaled instances with no
 * shared session store — the same philosophy as the signed `shaniidrx_sid`
 * cookie. The guard verifies the signature + expiry without a DB hit; the
 * acting user's live role/permissions are loaded from Postgres only when a
 * handler actually needs them.
 *
 * Token format:  base64url(JSON{uid,role,exp}) + "." + base64url(HMAC-SHA256)
 */
import { createHmac, timingSafeEqual } from "node:crypto"

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export type AdminTokenClaims = {
  uid: string
  role: string
  exp: number
}

function secret(): string {
  // SESSION_SECRET is required by main.ts (the app refuses to boot without it),
  // so this is always present in a correctly-configured deployment. The
  // fallbacks only matter for misconfigured local runs.
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

export function signAdminToken(
  input: { uid: string; role: string },
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const claims: AdminTokenClaims = {
    uid: input.uid,
    role: input.role,
    exp: Date.now() + ttlMs,
  }
  const payload = b64url(Buffer.from(JSON.stringify(claims), "utf8"))
  return `${payload}.${sign(payload)}`
}

export function verifyAdminToken(token: string | undefined | null): AdminTokenClaims | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null

  const expected = sign(payload)
  // Constant-time comparison; bail if lengths differ (timingSafeEqual throws).
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
    const claims = JSON.parse(json) as AdminTokenClaims
    if (!claims?.uid || !claims?.role || typeof claims.exp !== "number") return null
    if (Date.now() > claims.exp) return null
    return claims
  } catch {
    return null
  }
}

import { NextRequest, NextResponse } from "next/server"
import { rateLimit, isValidEmail } from "@/lib/security"

/**
 * Brute-force guard for login attempts.
 *
 * Supabase's signInWithPassword runs from the client so the browser
 * hits Supabase directly.  Before that happens the client asks this
 * endpoint whether the attempt is allowed.  Two independent buckets
 * (per-IP and per-email) make the protection resilient to attackers
 * who rotate proxies or who target a single account from many IPs.
 */

// Per-IP: 10 attempts / 5 min
// Per-email: 5 attempts / 5 min
const IP_LIMIT = { limit: 10, windowSeconds: 300 }
const EMAIL_LIMIT = { limit: 5, windowSeconds: 300 }

// Secondary in-memory store keyed by email (separate from IP-keyed store in security.ts)
const emailStore = new Map<string, { count: number; resetAt: number }>()
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of emailStore) if (now > v.resetAt) emailStore.delete(k)
}, 60_000)

function checkEmail(email: string, config = EMAIL_LIMIT) {
  const now = Date.now()
  const rec = emailStore.get(email)
  if (!rec || now > rec.resetAt) {
    emailStore.set(email, { count: 1, resetAt: now + config.windowSeconds * 1000 })
    return { allowed: true, remaining: config.limit - 1 }
  }
  rec.count++
  if (rec.count > config.limit) return { allowed: false, remaining: 0 }
  return { allowed: true, remaining: config.limit - rec.count }
}

export async function POST(request: NextRequest) {
  let body: { email?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : ""
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const ipCheck = rateLimit(request, IP_LIMIT)
  if (!ipCheck.success) {
    return NextResponse.json(
      { error: "Too many login attempts from your network. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "300" } }
    )
  }

  const emailCheck = checkEmail(email)
  if (!emailCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts for this account. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "300" } }
    )
  }

  return NextResponse.json({ ok: true, remaining: Math.min(ipCheck.remaining, emailCheck.remaining) })
}

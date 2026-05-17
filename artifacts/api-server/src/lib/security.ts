import type { Request, Response } from "express"

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitStore) {
    if (now > val.resetAt) rateLimitStore.delete(key)
  }
}, 60_000)

interface RateLimitConfig {
  limit: number
  windowSeconds: number
}

export function rateLimit(
  req: Request,
  config: RateLimitConfig = { limit: 30, windowSeconds: 60 }
): { success: boolean; remaining: number } {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.ip ||
    "unknown"

  const key = `${ip}:${req.path}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 })
    return { success: true, remaining: config.limit - 1 }
  }

  record.count++
  if (record.count > config.limit) return { success: false, remaining: 0 }
  return { success: true, remaining: config.limit - record.count }
}

export function rateLimitResponse(res: Response) {
  return res.status(429).json({ error: "Too many requests. Please slow down." })
}

export function sanitize(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`;\\]/g, "")
    .trim()
    .slice(0, maxLength)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320
}

export function isValidPhone(phone: string): boolean {
  if (typeof phone !== "string") return false
  // Normalize: keep only digits and a single leading +. This tolerates spaces,
  // dashes, parens, dots, non-breaking spaces and other punctuation that may
  // sneak in via paste / autocomplete from contact apps. Mirrors the more
  // permissive cleaner used in the storefront checkout form.
  const hasLeadingPlus = phone.trim().startsWith("+")
  const digits = phone.replace(/\D/g, "")
  const cleaned = (hasLeadingPlus ? "+" : "") + digits
  // Strict Kenyan formats:
  if (/^(\+?254[17]\d{8}|0[17]\d{8}|011\d{7})$/.test(cleaned)) return true
  // Generic international: optional +, then 9-15 digits
  return /^\+?\d{9,15}$/.test(cleaned)
}

export function sanitizePhoneSearch(phone: string): string {
  return phone.replace(/[^0-9+]/g, "").slice(0, 15)
}

export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function validatePassword(password: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof password !== "string") return { ok: false, error: "Invalid password" }
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" }
  if (password.length > 128) return { ok: false, error: "Password is too long" }
  if (!/[A-Za-z]/.test(password)) return { ok: false, error: "Password must contain a letter" }
  if (!/[0-9]/.test(password)) return { ok: false, error: "Password must contain a number" }
  const hasSymbolOrMixedCase = /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))
  if (!hasSymbolOrMixedCase) return { ok: false, error: "Password must contain a symbol or mixed case letters" }
  const COMMON_WEAK = new Set(["password", "password1", "password123", "12345678", "qwerty123"])
  if (COMMON_WEAK.has(password.toLowerCase())) return { ok: false, error: "This password is too common." }
  return { ok: true }
}

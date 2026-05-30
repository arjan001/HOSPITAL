/**
 * Newsletter module — PUBLIC subscribe endpoint for the storefront.
 *
 * Route:
 *   POST /api/v2/newsletter   — { email, source? } → append a subscriber
 *
 * Why this exists:
 *   Storefront newsletter forms (footer, compact bar, offer modal) previously
 *   POSTed to a dead legacy `/api/newsletter` route, so subscriptions were
 *   silently lost and never reached the admin panel. This endpoint persists
 *   each subscriber into the SAME durable cms_docs key the admin panel reads
 *   (`newsletter-subscribers`), so the existing admin list + CSV export work
 *   unchanged.
 *
 * Auth model:
 *   PUBLIC (no AdminGuard) — guests must be able to subscribe. Persistence goes
 *   through the internal admin-cms mirror using `ADMIN_API_TOKEN` (same pattern
 *   as partners.module.ts). Global rate-limiting still applies.
 *
 * NestJS rule: explicit @Inject() is unnecessary here (no injected deps), but
 * the controller keeps a no-arg constructor for consistency.
 */
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Module,
  Post,
} from "@nestjs/common"
import { newId } from "../common/repository"

const CMS_BASE = `http://127.0.0.1:${process.env.PORT || 8090}/api/v2/admin/cms`
const CMS_KEY = "newsletter-subscribers"
const CMS_TIMEOUT_MS = 4_000
const INTERNAL_TOKEN = process.env.ADMIN_API_TOKEN?.trim()
const INTERNAL_HEADERS: Record<string, string> = INTERNAL_TOKEN
  ? { "x-admin-token": INTERNAL_TOKEN }
  : {}

interface Subscriber {
  id: string
  email: string
  is_active: boolean
  subscribed_at: string
  source?: string
}

async function cmsGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), CMS_TIMEOUT_MS)
    try {
      const res = await fetch(`${CMS_BASE}/${encodeURIComponent(key)}`, {
        headers: INTERNAL_HEADERS,
        signal: ctrl.signal,
      })
      if (res.status === 404) return fallback
      if (!res.ok) return fallback
      const body = (await res.json()) as { value: T }
      return body.value ?? fallback
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return fallback
  }
}

async function cmsPut<T>(key: string, value: T): Promise<void> {
  // Fail-closed: cms_docs is the only durable home for subscribers, so a dropped
  // write would lose the signup. Surface any network error / non-2xx so the
  // caller returns a real failure instead of a false success.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CMS_TIMEOUT_MS)
  let res: Awaited<ReturnType<typeof fetch>>
  try {
    res = await fetch(`${CMS_BASE}/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...INTERNAL_HEADERS },
      body: JSON.stringify(value),
      signal: ctrl.signal,
    })
  } catch (err) {
    throw new HttpException(
      `Could not save subscription (${(err as Error)?.message || "network error"}). Please try again.`,
      HttpStatus.BAD_GATEWAY,
    )
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    throw new HttpException(
      `Could not save subscription (status ${res.status}). Please try again.`,
      HttpStatus.BAD_GATEWAY,
    )
  }
}

@Controller("newsletter")
export class NewsletterController {
  @Post()
  async subscribe(
    @Body() body: { email?: string; source?: string },
  ): Promise<{ ok: true; alreadySubscribed: boolean }> {
    const email = String(body?.email ?? "").trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpException("Please enter a valid email address", HttpStatus.BAD_REQUEST)
    }
    const source = body?.source ? String(body.source).slice(0, 64) : undefined

    const existing = await cmsGet<Subscriber[]>(CMS_KEY, [])
    const match = existing.find((s) => s.email.toLowerCase() === email)
    if (match) {
      // Re-activate a previously-unsubscribed email; otherwise no-op.
      if (!match.is_active) {
        const next = existing.map((s) =>
          s.email.toLowerCase() === email ? { ...s, is_active: true } : s,
        )
        await cmsPut(CMS_KEY, next)
      }
      return { ok: true, alreadySubscribed: true }
    }

    const rec: Subscriber = {
      id: newId("nl"),
      email,
      is_active: true,
      subscribed_at: new Date().toISOString(),
      ...(source ? { source } : {}),
    }
    await cmsPut(CMS_KEY, [rec, ...existing].slice(0, 5000))
    return { ok: true, alreadySubscribed: false }
  }
}

@Module({ controllers: [NewsletterController] })
export class NewsletterModule {}

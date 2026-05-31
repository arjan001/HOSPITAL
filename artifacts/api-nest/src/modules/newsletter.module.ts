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
 * Persistence:
 *   Writes DIRECTLY through `AdminCmsService` (Postgres `cms_docs` via Drizzle).
 *   NO HTTP loopback to the AdminGuard-protected `/admin/cms` route — that path
 *   required `ADMIN_API_TOKEN` and failed (502 → "Internal server error") in any
 *   environment where the token was unset (dev without the secret, or the
 *   published app). Injecting the service removes that dependency entirely while
 *   keeping the endpoint PUBLIC so guests can subscribe.
 *
 * NestJS rule: explicit @Inject(Token) on the controller constructor because
 * tsx/esbuild does not emit emitDecoratorMetadata.
 */
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Module,
  Post,
} from "@nestjs/common"
import { newId } from "../common/repository"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"

const CMS_KEY = "newsletter-subscribers"

interface Subscriber {
  id: string
  email: string
  is_active: boolean
  subscribed_at: string
  source?: string
}

@Controller("newsletter")
export class NewsletterController {
  constructor(@Inject(AdminCmsService) private readonly cms: AdminCmsService) {}

  @Post()
  async subscribe(
    @Body() body: { email?: string; source?: string },
  ): Promise<{ ok: true; alreadySubscribed: boolean }> {
    const email = String(body?.email ?? "").trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpException("Please enter a valid email address", HttpStatus.BAD_REQUEST)
    }
    const source = body?.source ? String(body.source).slice(0, 64) : undefined

    const entry = await this.cms.get(CMS_KEY)
    const existing = Array.isArray(entry?.value) ? (entry.value as Subscriber[]) : []
    const match = existing.find((s) => s.email?.toLowerCase() === email)
    if (match) {
      // Re-activate a previously-unsubscribed email; otherwise no-op.
      if (!match.is_active) {
        const next = existing.map((s) =>
          s.email?.toLowerCase() === email ? { ...s, is_active: true } : s,
        )
        await this.cms.put(CMS_KEY, next)
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
    await this.cms.put(CMS_KEY, [rec, ...existing].slice(0, 5000))
    return { ok: true, alreadySubscribed: false }
  }
}

@Module({ imports: [AdminCmsModule], controllers: [NewsletterController] })
export class NewsletterModule {}

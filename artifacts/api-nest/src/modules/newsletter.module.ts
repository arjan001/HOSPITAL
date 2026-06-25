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
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"
import { newId } from "../common/repository"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"
import { NotificationsModule, NotificationsService } from "./notifications.module"
import { AdminGuard, RequirePerm, AnyAdmin } from "../common/admin-guard"

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
  constructor(
    @Inject(AdminCmsService) private readonly cms: AdminCmsService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Post()
  async subscribe(
    @Body() body: { email?: string; source?: string },
  ): Promise<{ ok: true; alreadySubscribed: boolean }> {
    const email = String(body?.email ?? "").trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpException("Please enter a valid email address", HttpStatus.BAD_REQUEST)
    }
    const source = body?.source ? String(body.source).slice(0, 64) : undefined

    // The subscriber list is a single JSON-array document, so a naive
    // read-modify-write can drop a concurrent sign-up (lost update). Retry
    // against the cms_docs row version (optimistic concurrency) until our write
    // lands — this is what keeps PUBLIC, high-concurrency sign-ups durable.
    for (let attempt = 0; attempt < 6; attempt++) {
      const entry = await this.cms.get(CMS_KEY)
      const existing = Array.isArray(entry?.value) ? (entry.value as Subscriber[]) : []
      const match = existing.find((s) => s.email?.toLowerCase() === email)

      if (match) {
        // Already known: re-activate if previously unsubscribed, else no-op.
        if (match.is_active) return { ok: true, alreadySubscribed: true }
        const next = existing.map((s) =>
          s.email?.toLowerCase() === email ? { ...s, is_active: true } : s,
        )
        const saved = await this.cms.putIfVersion(CMS_KEY, next, entry!.version)
        if (saved) return { ok: true, alreadySubscribed: true }
        continue // version moved under us → re-read and retry
      }

      const rec: Subscriber = {
        id: newId("nl"),
        email,
        is_active: true,
        subscribed_at: new Date().toISOString(),
        ...(source ? { source } : {}),
      }
      const next = [rec, ...existing].slice(0, 5000)
      const saved = entry
        ? await this.cms.putIfVersion(CMS_KEY, next, entry.version)
        : await this.cms.createIfAbsent(CMS_KEY, next)
      if (!saved) continue // lost the race → re-read and retry

      // Surface the sign-up to the admin notification bell (durable, Postgres).
      // Fire-and-forget: a notification failure must never fail the subscription.
      try {
        await this.notifications.push("admin", {
          module: "marketing",
          level: "info",
          title: "New newsletter subscriber",
          body: source ? `${email} (via ${source})` : email,
          href: "/admin/newsletter",
        })
      } catch {
        /* non-fatal */
      }

      return { ok: true, alreadySubscribed: false }
    }

    throw new HttpException(
      "Could not save your subscription right now, please try again.",
      HttpStatus.CONFLICT,
    )
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/newsletter")
class NewsletterAdminController {
  constructor(@Inject(AdminCmsService) private readonly cms: AdminCmsService) {}

  @Get("subscribers")
  @RequirePerm("analytics.view", "marketing.broadcast")
  async listSubscribers(): Promise<Subscriber[]> {
    const entry = await this.cms.get(CMS_KEY)
    return Array.isArray(entry?.value) ? (entry.value as Subscriber[]) : []
  }

  @Patch("subscribers/:id")
  @RequirePerm("marketing.broadcast", "cms.settings")
  async patchSubscriber(
    @Param("id") id: string,
    @Body() body: { is_active?: boolean },
  ): Promise<Subscriber> {
    const entry = await this.cms.get(CMS_KEY)
    const existing = Array.isArray(entry?.value) ? (entry.value as Subscriber[]) : []
    const idx = existing.findIndex((s) => s.id === id)
    if (idx === -1) {
      throw new HttpException("Subscriber not found", HttpStatus.NOT_FOUND)
    }
    const next = existing.map((s, i) =>
      i === idx ? { ...s, ...(body.is_active !== undefined ? { is_active: body.is_active } : {}) } : s,
    )
    await this.cms.put(CMS_KEY, next)
    return next[idx]!
  }

  @Delete("subscribers/:id")
  @RequirePerm("marketing.broadcast", "cms.settings")
  async deleteSubscriber(@Param("id") id: string): Promise<{ ok: true }> {
    const entry = await this.cms.get(CMS_KEY)
    const existing = Array.isArray(entry?.value) ? (entry.value as Subscriber[]) : []
    const next = existing.filter((s) => s.id !== id)
    if (next.length === existing.length) {
      throw new HttpException("Subscriber not found", HttpStatus.NOT_FOUND)
    }
    await this.cms.put(CMS_KEY, next)
    return { ok: true }
  }
}

@Module({
  imports: [AdminCmsModule, NotificationsModule],
  controllers: [NewsletterController, NewsletterAdminController],
})
export class NewsletterModule {}

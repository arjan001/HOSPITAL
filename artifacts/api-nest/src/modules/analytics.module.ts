/**
 * Analytics ingest + admin dashboard (ported from api-server).
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq } from "drizzle-orm"
import { db, analyticsEvents } from "@workspace/db"
import { buildAnalytics, buildRealtime, geoFromHeaders, hostOf, isBotUA, parseUserAgent, searchTermFromReferrer } from "../common/analytics"
import { AdminGuard, AnyAdmin, RequirePerm } from "../common/admin-guard"

function newId(): string {
  return `aev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

@Injectable()
export class AnalyticsIngestService {
  async trackView(req: Request, body: Record<string, unknown>) {
    const ua = req.header("user-agent") || ""
    const { device, browser, os } = parseUserAgent(ua)
    const geo = geoFromHeaders(req)
    const referrer = String(body.referrer || "")
    const searchTerm = searchTermFromReferrer(referrer)
    await db.insert(analyticsEvents).values({
      id: newId(),
      kind: "view",
      sessionId: String(body.sessionId || ""),
      visitorId: String(body.visitorId || ""),
      path: String(body.path || "").slice(0, 512),
      referrer: referrer.slice(0, 512),
      referrerHost: hostOf(referrer),
      searchTerm,
      isBot: Boolean(body.isBot) || isBotUA(ua),
      isReturning: Boolean(body.isReturning),
      device,
      browser,
      os,
      screenWidth: Number.isFinite(Number(body.screenWidth)) ? Number(body.screenWidth) : null,
      language: String(body.language || "").slice(0, 32),
      country: geo.country,
      countryName: geo.countryName,
      region: geo.region,
      city: geo.city,
      utmSource: String(body.utmSource || "").slice(0, 200),
      utmMedium: String(body.utmMedium || "").slice(0, 200),
      utmCampaign: String(body.utmCampaign || "").slice(0, 200),
    })
    return { ok: true }
  }

  async updateView(body: Record<string, unknown>) {
    const sessionId = String(body.sessionId || "")
    const path = String(body.path || "")
    if (!sessionId || !path) return { ok: false }
    const duration = Math.max(0, Math.round(Number(body.duration) || 0))
    const scrollDepth = Math.min(100, Math.max(0, Math.round(Number(body.scrollDepth) || 0)))
    const [latest] = await db
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.sessionId, sessionId), eq(analyticsEvents.path, path), eq(analyticsEvents.kind, "view")))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(1)
    if (!latest) return { ok: false }
    await db
      .update(analyticsEvents)
      .set({ durationSec: duration, scrollDepth, updatedAt: new Date() })
      .where(eq(analyticsEvents.id, latest.id))
    return { ok: true }
  }

  async trackEvent(req: Request, body: Record<string, unknown>) {
    const name = String(body.name || body.eventType || "event")
    const ua = req.header("user-agent") || ""
    const { device, browser, os } = parseUserAgent(ua)
    const geo = geoFromHeaders(req)
    const kind = name === "search" ? "search" : name === "click" ? "click" : "event"
    const eventTarget = String(body.eventTarget || "")
    await db.insert(analyticsEvents).values({
      id: newId(),
      kind,
      eventName: name.slice(0, 120),
      sessionId: String(body._sessionId || body.sessionId || ""),
      visitorId: String(body.visitorId || ""),
      path: String(body.path || body.pagePath || "").slice(0, 512),
      referrerHost: hostOf(String(body.referrer || "")),
      isBot: isBotUA(ua),
      device,
      browser,
      os,
      country: geo.country,
      countryName: geo.countryName,
      region: geo.region,
      city: geo.city,
      searchTerm: String(body.term || body.query || body.searchTerm || (kind === "search" ? eventTarget : "")).slice(0, 200),
      clickTarget: String(body.target || body.label || body.clickTarget || (kind === "click" ? eventTarget : "")).slice(0, 200),
      meta: body as Record<string, unknown>,
    })
    return { ok: true }
  }

  async trackAbandoned(body: Record<string, unknown>) {
    const { db: database, abandonedCheckouts } = await import("@workspace/db")
    const sessionId = String(body.sessionId || "")
    if (!sessionId) return { ok: false }
    const items = Array.isArray(body.items) ? (body.items as Array<{ name: string; qty: number; price: number }>) : []
    const fields = {
      customerName: String(body.customerName || ""),
      customerPhone: String(body.customerPhone || ""),
      items,
      subtotal: Math.max(0, Math.round(Number(body.subtotal) || 0)),
      stepReached: String(body.stepReached || "").slice(0, 120),
      reason: String(body.reason || "").slice(0, 200),
      updatedAt: new Date(),
    }
    const [existing] = await database
      .select({ id: abandonedCheckouts.id })
      .from(abandonedCheckouts)
      .where(eq(abandonedCheckouts.sessionId, sessionId))
      .orderBy(desc(abandonedCheckouts.createdAt))
      .limit(1)
    if (existing) {
      await database.update(abandonedCheckouts).set(fields).where(eq(abandonedCheckouts.id, existing.id))
    } else {
      await database.insert(abandonedCheckouts).values({
        id: `aban_${Date.now().toString(36)}`,
        sessionId,
        ...fields,
      })
    }
    return { ok: true }
  }

  async recoverAbandoned(body: Record<string, unknown>) {
    const { db: database, abandonedCheckouts } = await import("@workspace/db")
    const sessionId = String(body.sessionId || "")
    if (!sessionId) return { ok: false }
    const [existing] = await database
      .select({ id: abandonedCheckouts.id })
      .from(abandonedCheckouts)
      .where(eq(abandonedCheckouts.sessionId, sessionId))
      .orderBy(desc(abandonedCheckouts.createdAt))
      .limit(1)
    if (existing) {
      await database
        .update(abandonedCheckouts)
        .set({ recovered: true, updatedAt: new Date() })
        .where(eq(abandonedCheckouts.id, existing.id))
    }
    return { ok: true }
  }
}

@Controller("track-view")
class TrackViewController {
  constructor(@Inject(AnalyticsIngestService) private readonly svc: AnalyticsIngestService) {}

  @Post()
  post(@Req() req: Request, @Body() body: Record<string, unknown>) {
    if (body?._update || body?.duration != null || body?.scrollDepth != null) {
      return this.svc.updateView(body ?? {})
    }
    return this.svc.trackView(req, body ?? {})
  }

  @Patch()
  patch(@Body() body: Record<string, unknown>) {
    return this.svc.updateView(body ?? {})
  }
}

@Controller("track-event")
class TrackEventController {
  constructor(@Inject(AnalyticsIngestService) private readonly svc: AnalyticsIngestService) {}

  @Post()
  post(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.svc.trackEvent(req, body ?? {})
  }
}

@Controller("track-abandoned")
class TrackAbandonedController {
  constructor(@Inject(AnalyticsIngestService) private readonly svc: AnalyticsIngestService) {}

  @Post()
  post(@Body() body: Record<string, unknown>) {
    return this.svc.trackAbandoned(body ?? {})
  }

  @Patch()
  patch(@Body() body: Record<string, unknown>) {
    return this.svc.recoverAbandoned(body ?? {})
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/analytics")
class AdminAnalyticsController {
  @Get()
  @RequirePerm("analytics.view")
  async summary(@Query("days") daysRaw?: string) {
    const days = Math.min(365, Math.max(1, Math.round(Number(daysRaw) || 30)))
    return buildAnalytics(days)
  }

  @Get("realtime")
  @RequirePerm("analytics.view")
  realtime() {
    return buildRealtime()
  }
}

@Module({
  controllers: [TrackViewController, TrackEventController, TrackAbandonedController, AdminAnalyticsController],
  providers: [AnalyticsIngestService],
})
export class AnalyticsModule {}

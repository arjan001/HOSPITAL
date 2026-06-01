import { Router } from "express"
import { and, desc, eq } from "drizzle-orm"
import { db, analyticsEvents } from "@workspace/db"
import { geoFromHeaders, isBotUA, parseUserAgent, hostOf } from "../../lib/analytics.js"

const router = Router()

function newId(): string {
  return `aev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/* POST — record a page view. */
router.post("/", async (req, res) => {
  try {
    const b = (req.body || {}) as Record<string, unknown>
    const ua = req.header("user-agent") || ""
    const { device, browser, os } = parseUserAgent(ua)
    const geo = geoFromHeaders(req)
    const referrer = String(b.referrer || "")
    await db.insert(analyticsEvents).values({
      id: newId(),
      kind: "view",
      sessionId: String(b.sessionId || ""),
      visitorId: String(b.visitorId || ""),
      path: String(b.path || "").slice(0, 512),
      referrer: referrer.slice(0, 512),
      referrerHost: hostOf(referrer),
      isBot: Boolean(b.isBot) || isBotUA(ua),
      isReturning: Boolean(b.isReturning),
      device,
      browser,
      os,
      screenWidth: Number.isFinite(Number(b.screenWidth)) ? Number(b.screenWidth) : null,
      language: String(b.language || "").slice(0, 32),
      country: geo.country,
      countryName: geo.countryName,
      region: geo.region,
      city: geo.city,
      utmSource: String(b.utmSource || "").slice(0, 200),
      utmMedium: String(b.utmMedium || "").slice(0, 200),
      utmCampaign: String(b.utmCampaign || "").slice(0, 200),
    })
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

/* PATCH — update duration + scroll depth for the most recent open view of a
   (session, path). Also reachable via sendBeacon (POST with _update). */
async function applyUpdate(b: Record<string, unknown>) {
  const sessionId = String(b.sessionId || "")
  const path = String(b.path || "")
  if (!sessionId || !path) return
  const duration = Math.max(0, Math.round(Number(b.duration) || 0))
  const scrollDepth = Math.min(100, Math.max(0, Math.round(Number(b.scrollDepth) || 0)))
  const [latest] = await db
    .select({ id: analyticsEvents.id })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.sessionId, sessionId), eq(analyticsEvents.path, path), eq(analyticsEvents.kind, "view")))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(1)
  if (!latest) return
  await db
    .update(analyticsEvents)
    .set({ durationSec: duration, scrollDepth, updatedAt: new Date() })
    .where(eq(analyticsEvents.id, latest.id))
}

router.patch("/", async (req, res) => {
  try {
    await applyUpdate((req.body || {}) as Record<string, unknown>)
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

export default router

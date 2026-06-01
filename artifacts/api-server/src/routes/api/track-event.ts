import { Router } from "express"
import { db, analyticsEvents } from "@workspace/db"
import { geoFromHeaders, isBotUA, parseUserAgent, hostOf } from "../../lib/analytics.js"

const router = Router()

function newId(): string {
  return `aev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/* POST — record a custom interaction (click or site search). The storefront
   sends `{ name, ... }`; name "search" carries a `term`, name "click" carries
   a `target`. Everything else is stored as a generic event. */
router.post("/", async (req, res) => {
  try {
    const b = (req.body || {}) as Record<string, unknown>
    // Accept both the analytics-store shape (`name`, `term`, `target`, `path`)
    // and the navbar shape (`eventType`, `eventTarget`, `pagePath`).
    const name = String(b.name || b.eventType || "event")
    const ua = req.header("user-agent") || ""
    const { device, browser, os } = parseUserAgent(ua)
    const geo = geoFromHeaders(req)
    const kind = name === "search" ? "search" : name === "click" ? "click" : "event"
    const eventTarget = String(b.eventTarget || "")
    await db.insert(analyticsEvents).values({
      id: newId(),
      kind,
      eventName: name.slice(0, 120),
      sessionId: String(b._sessionId || b.sessionId || ""),
      visitorId: String(b.visitorId || ""),
      path: String(b.path || b.pagePath || "").slice(0, 512),
      referrerHost: hostOf(String(b.referrer || "")),
      isBot: isBotUA(ua),
      device,
      browser,
      os,
      country: geo.country,
      countryName: geo.countryName,
      region: geo.region,
      city: geo.city,
      searchTerm: String(b.term || b.query || b.searchTerm || (kind === "search" ? eventTarget : "")).slice(0, 200),
      clickTarget: String(b.target || b.label || b.clickTarget || (kind === "click" ? eventTarget : "")).slice(0, 200),
      meta: b as Record<string, unknown>,
    })
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

export default router

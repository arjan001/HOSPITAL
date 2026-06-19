/**
 * analytics.ts — server-side analytics helpers for the api-server tracking
 * pipeline. Parses request metadata (user-agent → device/browser/os, proxy
 * headers → geo) and aggregates `analytics_events` into the shape the admin
 * Analytics dashboard consumes.
 */
import type { Request } from "express"
import { and, desc, gte, lt, sql } from "drizzle-orm"
import { db, analyticsEvents, abandonedCheckouts, adminOrders } from "@workspace/db"

const SALE_STATUSES = new Set(["confirmed", "dispatched", "delivered"])

const BOT_RE =
  /bot|crawl|spider|scraper|curl|wget|python|java|go-http|headless|phantom|puppeteer|selenium|playwright|facebookexternalhit|slurp|bingpreview|lighthouse|pingdom|uptimerobot/i

export function isBotUA(ua: string): boolean {
  return BOT_RE.test(ua || "")
}

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const u = ua || ""
  // Device
  let device = "desktop"
  if (/iPad|Tablet|PlayBook|Silk/i.test(u) || (/Android/i.test(u) && !/Mobile/i.test(u))) device = "tablet"
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|webOS|BlackBerry/i.test(u)) device = "mobile"
  // Browser
  let browser = "Unknown"
  if (/Edg\//i.test(u)) browser = "Edge"
  else if (/OPR\/|Opera/i.test(u)) browser = "Opera"
  else if (/SamsungBrowser/i.test(u)) browser = "Samsung Internet"
  else if (/Chrome\//i.test(u) && !/Chromium/i.test(u)) browser = "Chrome"
  else if (/CriOS/i.test(u)) browser = "Chrome"
  else if (/Firefox\/|FxiOS/i.test(u)) browser = "Firefox"
  else if (/Version\/.*Safari/i.test(u)) browser = "Safari"
  else if (/MSIE|Trident/i.test(u)) browser = "Internet Explorer"
  // OS
  let os = "Unknown"
  if (/Windows NT/i.test(u)) os = "Windows"
  else if (/Android/i.test(u)) os = "Android"
  else if (/iPhone|iPad|iPod/i.test(u)) os = "iOS"
  else if (/Mac OS X/i.test(u)) os = "macOS"
  else if (/Linux/i.test(u)) os = "Linux"
  else if (/CrOS/i.test(u)) os = "ChromeOS"
  return { device, browser, os }
}

const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya", UG: "Uganda", TZ: "Tanzania", RW: "Rwanda", ET: "Ethiopia",
  SO: "Somalia", NG: "Nigeria", GH: "Ghana", ZA: "South Africa", EG: "Egypt",
  US: "United States", GB: "United Kingdom", IN: "India", CA: "Canada",
  DE: "Germany", FR: "France", AE: "United Arab Emirates", SA: "Saudi Arabia",
  CN: "China", AU: "Australia", NL: "Netherlands", SE: "Sweden", IT: "Italy",
  ES: "Spain", BR: "Brazil", JP: "Japan", QA: "Qatar", TR: "Turkey",
}

export function countryName(code: string): string {
  if (!code) return ""
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase()
}

function header(req: Request, name: string): string {
  const v = req.headers[name.toLowerCase()]
  return (Array.isArray(v) ? v[0] : v || "").toString()
}

/**
 * Best-effort geo from common CDN/proxy headers. Returns blanks when the
 * platform doesn't inject geo headers — the dashboard renders gracefully
 * with empty geo sections rather than showing fabricated locations.
 */
export function geoFromHeaders(req: Request): { country: string; countryName: string; region: string; city: string } {
  const country =
    header(req, "cf-ipcountry") ||
    header(req, "x-vercel-ip-country") ||
    header(req, "x-geo-country") ||
    header(req, "x-appengine-country") ||
    header(req, "fly-client-country") ||
    ""
  const region =
    header(req, "x-vercel-ip-country-region") ||
    header(req, "x-geo-region") ||
    header(req, "x-appengine-region") ||
    ""
  let city =
    header(req, "x-vercel-ip-city") ||
    header(req, "x-geo-city") ||
    header(req, "x-appengine-city") ||
    ""
  try {
    city = decodeURIComponent(city)
  } catch {
    /* keep raw */
  }
  const code = country && country.toUpperCase() !== "XX" ? country.toUpperCase() : ""
  return { country: code, countryName: countryName(code), region, city }
}

export function hostOf(url: string): string {
  if (!url) return ""
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

/** Extract organic search query from referrer URL when present. */
export function searchTermFromReferrer(referrer: string): string {
  if (!referrer) return ""
  try {
    const u = new URL(referrer)
    const q =
      u.searchParams.get("q") ||
      u.searchParams.get("p") ||
      u.searchParams.get("query") ||
      u.searchParams.get("text") ||
      ""
    return q.trim().slice(0, 200)
  } catch {
    return ""
  }
}

const SEARCH_ENGINES = ["google", "bing", "yahoo", "duckduckgo", "yandex", "baidu", "ecosia", "brave"]
const SOCIAL = ["facebook", "instagram", "twitter", "x.com", "t.co", "tiktok", "linkedin", "youtube", "whatsapp", "pinterest", "reddit", "telegram"]

function channelFor(referrerHost: string, utmMedium: string, utmSource: string): string {
  const m = (utmMedium || "").toLowerCase()
  if (m.includes("cpc") || m.includes("ppc") || m.includes("paid")) return "Paid Search"
  if (m.includes("email")) return "Email"
  if (m.includes("social")) return "Social"
  if (utmSource) return "Campaign"
  if (!referrerHost) return "Direct"
  if (SEARCH_ENGINES.some((s) => referrerHost.includes(s))) return "Organic Search"
  if (SOCIAL.some((s) => referrerHost.includes(s))) return "Social"
  return "Referral"
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 1000) / 10
}

async function buildSalesMetrics(days: number, start: Date, prevStart: Date, now: Date) {
  const rows = await db.select().from(adminOrders).where(gte(adminOrders.createdAt, prevStart))

  const confirmed = (from: Date, to?: Date) =>
    rows.filter(
      (o) =>
        o.createdAt >= from &&
        (!to || o.createdAt < to) &&
        SALE_STATUSES.has(String(o.status || "")),
    )

  const inWindow = confirmed(start)
  const prevWindow = confirmed(prevStart, start)
  const allInWindow = rows.filter((o) => o.createdAt >= start)

  const totalRevenue = inWindow.reduce((s, o) => s + (o.total || 0), 0)
  const prevRevenue = prevWindow.reduce((s, o) => s + (o.total || 0), 0)

  const dayMap = new Map<string, { orders: number; revenue: number }>()
  const productMap = new Map<string, { name: string; sold: number; revenue: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    dayMap.set(d, { orders: 0, revenue: 0 })
  }
  for (const o of inWindow) {
    const d = o.createdAt.toISOString().slice(0, 10)
    const slot = dayMap.get(d)
    if (!slot) continue
    slot.orders += 1
    slot.revenue += o.total || 0
    for (const item of o.items ?? []) {
      const name = String(item.name || "").trim()
      if (!name) continue
      const qty = Math.max(0, Number(item.qty) || 0)
      const price = Math.max(0, Number(item.price) || 0)
      const row = productMap.get(name) ?? { name, sold: 0, revenue: 0 }
      row.sold += qty
      row.revenue += price * qty
      productMap.set(name, row)
    }
  }

  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 50)

  return {
    totalOrders: allInWindow.length,
    totalRevenue,
    prevOrderCount: rows.filter((o) => o.createdAt >= prevStart && o.createdAt < start).length,
    prevRevenue,
    salesTimeline: [...dayMap.entries()].map(([date, e]) => ({ date, ...e })),
    confirmedOrderCount: inWindow.length,
    topProducts,
  }
}

type Row = typeof analyticsEvents.$inferSelect

/**
 * Aggregate the analytics_events table into the full dashboard payload.
 * `days` controls the window; the previous equal-length window is used for
 * period-over-period comparisons.
 */
export async function buildAnalytics(days: number) {
  const now = new Date()
  const start = new Date(now.getTime() - days * 86400000)
  const prevStart = new Date(start.getTime() - days * 86400000)

  const [rows, prevRows, carts, sales] = await Promise.all([
    db.select().from(analyticsEvents).where(gte(analyticsEvents.createdAt, start)),
    db
      .select()
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.createdAt, prevStart), lt(analyticsEvents.createdAt, start))),
    db.select().from(abandonedCheckouts).where(gte(abandonedCheckouts.createdAt, prevStart)).orderBy(desc(abandonedCheckouts.createdAt)),
    buildSalesMetrics(days, start, prevStart, now),
  ])

  const views = rows.filter((r) => r.kind === "view")
  const humanViews = views.filter((r) => !r.isBot)
  const botViews = views.filter((r) => r.isBot)
  const prevHumanViews = prevRows.filter((r) => r.kind === "view" && !r.isBot)
  const clicks = rows.filter((r) => r.kind === "click")
  const searches = rows.filter((r) => r.kind === "search")

  const uniqueSessions = new Set(humanViews.map((r) => r.sessionId).filter(Boolean)).size
  const uniqueVisitors = new Set(humanViews.map((r) => r.visitorId).filter(Boolean)).size

  // Bounce rate: sessions with exactly one page view.
  const sessionViewCounts = new Map<string, number>()
  for (const r of humanViews) {
    if (!r.sessionId) continue
    sessionViewCounts.set(r.sessionId, (sessionViewCounts.get(r.sessionId) || 0) + 1)
  }
  const bounced = [...sessionViewCounts.values()].filter((c) => c === 1).length
  const bounceRate = sessionViewCounts.size > 0 ? Math.round((bounced / sessionViewCounts.size) * 100) : 0

  const durations = humanViews.filter((r) => r.durationSec > 0).map((r) => r.durationSec)
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
  const scrolls = humanViews.filter((r) => r.scrollDepth > 0).map((r) => r.scrollDepth)
  const avgScrollDepth = scrolls.length ? Math.round(scrolls.reduce((a, b) => a + b, 0) / scrolls.length) : 0

  // Top pages
  const topPages = topCount(humanViews.map((r) => r.path)).map(([page, count]) => ({ page, count }))

  // Page retention
  const pageDur = new Map<string, { sum: number; n: number; views: number }>()
  for (const r of humanViews) {
    const e = pageDur.get(r.path) || { sum: 0, n: 0, views: 0 }
    e.views += 1
    if (r.durationSec > 0) {
      e.sum += r.durationSec
      e.n += 1
    }
    pageDur.set(r.path, e)
  }
  const pageRetention = [...pageDur.entries()]
    .map(([page, e]) => ({ page, avgDuration: e.n ? Math.round(e.sum / e.n) : 0, views: e.views }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10)

  // Views by day (human + bot + clicks)
  const dayMap = new Map<string, { count: number; human: number; bot: number; clicks: number }>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    dayMap.set(d, { count: 0, human: 0, bot: 0, clicks: 0 })
  }
  for (const r of views) {
    const d = r.createdAt.toISOString().slice(0, 10)
    const e = dayMap.get(d)
    if (!e) continue
    e.count += 1
    if (r.isBot) e.bot += 1
    else e.human += 1
  }
  for (const r of clicks) {
    const d = r.createdAt.toISOString().slice(0, 10)
    const e = dayMap.get(d)
    if (e) e.clicks += 1
  }
  const viewsByDay = [...dayMap.entries()].map(([date, e]) => ({ date, ...e }))

  // Devices / browsers
  const devices = distribution(humanViews.map((r) => r.device || "desktop")).map(([device, count]) => ({
    device,
    count,
    percentage: pct(count, humanViews.length),
  }))
  const browsers = distribution(humanViews.map((r) => r.browser || "Unknown")).map(([browser, count]) => ({
    browser,
    count,
    percentage: pct(count, humanViews.length),
  }))

  // Geo
  const geoViews = humanViews.filter((r) => r.country)
  const countryMap = new Map<string, { count: number; name: string; cities: Map<string, number> }>()
  for (const r of geoViews) {
    const e = countryMap.get(r.country) || { count: 0, name: r.countryName || r.country, cities: new Map() }
    e.count += 1
    if (r.city) e.cities.set(r.city, (e.cities.get(r.city) || 0) + 1)
    countryMap.set(r.country, e)
  }
  const countries = [...countryMap.entries()]
    .map(([country, e]) => ({
      country,
      countryName: e.name,
      count: e.count,
      percentage: pct(e.count, geoViews.length),
      topCities: [...e.cities.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count })),
    }))
    .sort((a, b) => b.count - a.count)

  const cityMap = new Map<string, { country: string; countryName: string; count: number }>()
  for (const r of geoViews) {
    if (!r.city) continue
    const key = `${r.city}|${r.country}`
    const e = cityMap.get(key) || { country: r.country, countryName: r.countryName || r.country, count: 0 }
    e.count += 1
    cityMap.set(key, e)
  }
  const topCities = [...cityMap.entries()]
    .map(([key, e]) => ({ city: key.split("|")[0], country: e.country, countryName: e.countryName, count: e.count, percentage: pct(e.count, geoViews.length) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Clicks
  const totalClicks = clicks.length
  const topClicks = topCount(clicks.map((r) => r.clickTarget).filter(Boolean)).map(([target, count]) => ({ target, count }))
  const clicksByPage = topCount(clicks.map((r) => r.path)).map(([page, count]) => ({ page, count }))

  // Engagement: views + clicks per page
  const engageMap = new Map<string, { views: number; clicks: number }>()
  for (const r of humanViews) {
    const e = engageMap.get(r.path) || { views: 0, clicks: 0 }
    e.views += 1
    engageMap.set(r.path, e)
  }
  for (const r of clicks) {
    const e = engageMap.get(r.path) || { views: 0, clicks: 0 }
    e.clicks += 1
    engageMap.set(r.path, e)
  }
  const topPagesByEngagement = [...engageMap.entries()]
    .map(([page, e]) => ({ page, views: e.views, clicks: e.clicks, total: e.views + e.clicks }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Referrers
  const refMap = new Map<string, { count: number; pages: Map<string, number>; terms: Map<string, number>; isSearch: boolean; isSocial: boolean }>()
  for (const r of humanViews) {
    const host = r.referrerHost
    if (!host) continue
    const e = refMap.get(host) || {
      count: 0,
      pages: new Map(),
      terms: new Map(),
      isSearch: SEARCH_ENGINES.some((s) => host.includes(s)),
      isSocial: SOCIAL.some((s) => host.includes(s)),
    }
    e.count += 1
    e.pages.set(r.path, (e.pages.get(r.path) || 0) + 1)
    const term = (r.searchTerm || "").trim()
    if (term) e.terms.set(term, (e.terms.get(term) || 0) + 1)
    refMap.set(host, e)
  }
  const referrers = [...refMap.entries()]
    .map(([source, e]) => ({
      source,
      count: e.count,
      isSearchEngine: e.isSearch,
      isSocial: e.isSocial,
      topPages: [...e.pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, count]) => ({ page, count })),
      topSearchTerms: [...e.terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([term, count]) => ({ term, count })),
    }))
    .sort((a, b) => b.count - a.count)
  const searchEngineReferrers = referrers
    .filter((r) => r.isSearchEngine)
    .map((r) => ({ source: r.source, count: r.count, topTerms: r.topSearchTerms }))

  // Traffic channels
  const channels = distribution(
    humanViews.map((r) => channelFor(r.referrerHost, r.utmMedium, r.utmSource)),
  ).map(([channel, count]) => ({ channel, count, percentage: pct(count, humanViews.length) }))

  // New vs returning (per visitor)
  const returningVisitors = new Set(humanViews.filter((r) => r.isReturning).map((r) => r.visitorId)).size
  const newVisitors = Math.max(0, uniqueVisitors - returningVisitors)
  const nvrTotal = newVisitors + returningVisitors
  const newVsReturning = {
    new: newVisitors,
    returning: returningVisitors,
    newPercentage: pct(newVisitors, nvrTotal),
    returningPercentage: pct(returningVisitors, nvrTotal),
  }

  // UTM
  const utmCampMap = new Map<string, { views: number; source: string; medium: string }>()
  for (const r of humanViews) {
    if (!r.utmCampaign) continue
    const e = utmCampMap.get(r.utmCampaign) || { views: 0, source: r.utmSource, medium: r.utmMedium }
    e.views += 1
    utmCampMap.set(r.utmCampaign, e)
  }
  const utmCampaigns = [...utmCampMap.entries()].map(([campaign, e]) => ({ campaign, views: e.views, source: e.source, medium: e.medium })).sort((a, b) => b.views - a.views)
  const utmSources = topCount(humanViews.map((r) => r.utmSource).filter(Boolean)).map(([source, count]) => ({ source, count }))

  // Languages
  const languages = distribution(humanViews.map((r) => (r.language || "").split("-")[0]).filter(Boolean)).map(([language, count]) => ({
    language,
    count,
    percentage: pct(count, humanViews.length),
  }))

  // Searches
  const searchTermMap = new Map<string, { count: number; visitors: Set<string>; last: Date }>()
  for (const r of searches) {
    const term = (r.searchTerm || "").trim()
    if (!term) continue
    const e = searchTermMap.get(term) || { count: 0, visitors: new Set(), last: r.createdAt }
    e.count += 1
    if (r.visitorId) e.visitors.add(r.visitorId)
    if (r.createdAt > e.last) e.last = r.createdAt
    searchTermMap.set(term, e)
  }
  const searchByDay = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) searchByDay.set(new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10), 0)
  for (const r of searches) {
    const d = r.createdAt.toISOString().slice(0, 10)
    if (searchByDay.has(d)) searchByDay.set(d, (searchByDay.get(d) || 0) + 1)
  }
  const searchesPayload = {
    total: searches.length,
    top: [...searchTermMap.entries()]
      .map(([term, e]) => ({ term, count: e.count, uniqueVisitors: e.visitors.size, lastSeen: e.last.toISOString() }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
    byDay: [...searchByDay.entries()].map(([date, count]) => ({ date, count })),
  }

  // Recent visitors (latest event per session)
  const sessionLatest = new Map<string, Row>()
  const sessionPages = new Map<string, Set<string>>()
  for (const r of humanViews) {
    if (!r.sessionId) continue
    const prev = sessionLatest.get(r.sessionId)
    if (!prev || r.createdAt > prev.createdAt) sessionLatest.set(r.sessionId, r)
    const set = sessionPages.get(r.sessionId) || new Set()
    set.add(r.path)
    sessionPages.set(r.sessionId, set)
  }
  const recentVisitors = [...sessionLatest.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50)
    .map((r) => ({
      sessionId: r.sessionId,
      visitorId: r.visitorId,
      page: r.path,
      pagePaths: [...(sessionPages.get(r.sessionId) || [])].slice(-8),
      country: r.country,
      countryName: r.countryName,
      city: r.city,
      region: r.region,
      device: r.device,
      browser: r.browser,
      referrer: r.referrer,
      referrerHost: r.referrerHost,
      isReturning: r.isReturning,
      latest: r.createdAt.toISOString(),
      pages: sessionPages.get(r.sessionId)?.size || 1,
    }))

  // Live heatmap (last 5 min)
  const liveCutoff = new Date(now.getTime() - 5 * 60000)
  const liveViews = humanViews.filter((r) => r.createdAt >= liveCutoff)
  const liveSessions = new Set(liveViews.map((r) => r.sessionId).filter(Boolean))
  const liveCellMap = new Map<string, { country: string; countryName: string; region: string; city: string; visitors: Set<string>; views: number; latest: Date }>()
  for (const r of liveViews) {
    const key = `${r.country}|${r.region}|${r.city}`
    const e = liveCellMap.get(key) || { country: r.country, countryName: r.countryName, region: r.region, city: r.city, visitors: new Set(), views: 0, latest: r.createdAt }
    e.views += 1
    if (r.sessionId) e.visitors.add(r.sessionId)
    if (r.createdAt > e.latest) e.latest = r.createdAt
    liveCellMap.set(key, e)
  }
  const liveByCountry = new Map<string, { countryName: string; visitors: Set<string> }>()
  for (const r of liveViews) {
    if (!r.country) continue
    const e = liveByCountry.get(r.country) || { countryName: r.countryName, visitors: new Set() }
    if (r.sessionId) e.visitors.add(r.sessionId)
    liveByCountry.set(r.country, e)
  }
  const activityByMinute: { minute: string; visitors: number }[] = []
  const recentHuman = humanViews.filter((r) => r.createdAt >= new Date(now.getTime() - 10 * 60000))
  for (let i = 9; i >= 0; i--) {
    const mEnd = new Date(now.getTime() - i * 60000)
    const mStart = new Date(mEnd.getTime() - 60000)
    const label = mEnd.toISOString().slice(11, 16)
    const inMin = recentHuman.filter((r) => r.createdAt >= mStart && r.createdAt < mEnd)
    activityByMinute.push({ minute: label, visitors: new Set(inMin.map((r) => r.sessionId).filter(Boolean)).size })
  }
  const currentViewingMap = new Map<string, { views: number; visitors: Set<string> }>()
  for (const r of liveViews) {
    const e = currentViewingMap.get(r.path) || { views: 0, visitors: new Set() }
    e.views += 1
    if (r.sessionId) e.visitors.add(r.sessionId)
    currentViewingMap.set(r.path, e)
  }
  const liveHeatmap = {
    activeVisitors: liveSessions.size,
    windowMinutes: 5,
    cells: [...liveCellMap.values()].map((e) => ({ country: e.country, countryName: e.countryName, region: e.region, city: e.city, visitors: e.visitors.size, views: e.views, latest: e.latest.toISOString() })),
    byCountry: [...liveByCountry.entries()].map(([country, e]) => ({ country, countryName: e.countryName, visitors: e.visitors.size })).sort((a, b) => b.visitors - a.visitors),
    activityByMinute,
    currentlyViewing: [...currentViewingMap.entries()].map(([page, e]) => ({ page, views: e.views, visitors: e.visitors.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 10),
  }

  // Abandoned checkouts (within window)
  const windowCarts = carts.filter((c) => c.createdAt >= start)
  const byStep: Record<string, number> = {}
  const byReason: Record<string, number> = {}
  for (const c of windowCarts) {
    byStep[c.stepReached || "unknown"] = (byStep[c.stepReached || "unknown"] || 0) + 1
    byReason[c.reason || "unknown"] = (byReason[c.reason || "unknown"] || 0) + 1
  }
  const abandonedCheckoutsPayload = {
    total: windowCarts.length,
    recovered: windowCarts.filter((c) => c.recovered).length,
    value: windowCarts.filter((c) => !c.recovered).reduce((s, c) => s + (c.subtotal || 0), 0),
    byStep,
    byReason,
    recent: windowCarts.slice(0, 20).map((c) => ({
      id: c.id,
      customerName: c.customerName,
      items: Array.isArray(c.items) ? c.items : [],
      subtotal: c.subtotal,
      stepReached: c.stepReached,
      reason: c.reason,
      recovered: c.recovered,
      createdAt: c.createdAt.toISOString(),
    })),
  }

  return {
    totalViews: views.length,
    humanViewCount: humanViews.length,
    botViewCount: botViews.length,
    previousPeriodViews: prevHumanViews.length,
    uniqueSessions,
    avgDuration,
    avgScrollDepth,
    bounceRate,
    totalOrders: sales.totalOrders,
    totalRevenue: sales.totalRevenue,
    prevOrderCount: sales.prevOrderCount,
    prevRevenue: sales.prevRevenue,
    confirmedOrderCount: sales.confirmedOrderCount,
    conversionRate:
      uniqueSessions > 0
        ? Math.round((sales.confirmedOrderCount / uniqueSessions) * 1000) / 10
        : 0,
    revenueChangePct:
      sales.prevRevenue > 0
        ? Math.round(((sales.totalRevenue - sales.prevRevenue) / sales.prevRevenue) * 1000) / 10
        : sales.totalRevenue > 0
          ? 100
          : 0,
    topPages,
    pageRetention,
    viewsByDay,
    salesTimeline: sales.salesTimeline,
    topProducts: sales.topProducts,
    devices,
    browsers,
    countries,
    topCities,
    topPagesByEngagement,
    recentVisitors,
    referrers,
    searchEngineReferrers,
    totalClicks,
    topClicks,
    clicksByPage,
    botTraffic: { total: botViews.length, percentage: pct(botViews.length, views.length) },
    abandonedCheckouts: abandonedCheckoutsPayload,
    trafficChannels: channels,
    newVsReturning,
    utmCampaigns,
    utmSources,
    languages,
    searches: searchesPayload,
    liveHeatmap,
  }
}

export async function buildRealtime() {
  const cutoff = new Date(Date.now() - 5 * 60000)
  const rows = await db
    .select()
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, cutoff), sql`${analyticsEvents.isBot} = false`))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(100)
  const views = rows.filter((r) => r.kind === "view")
  const activeVisitors = new Set(views.map((r) => r.sessionId).filter(Boolean)).size
  const recentEvents = rows.slice(0, 20).map((r) => ({
    kind: r.kind,
    path: r.path,
    city: r.city,
    country: r.country,
    countryName: r.countryName,
    at: r.createdAt.toISOString(),
  }))
  return { activeVisitors, recentEvents }
}

function topCount(values: string[]): [string, number][] {
  const m = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    m.set(v, (m.get(v) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
}

function distribution(values: string[]): [string, number][] {
  const m = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    m.set(v, (m.get(v) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

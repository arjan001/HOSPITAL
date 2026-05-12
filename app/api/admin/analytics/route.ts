import { NextRequest, NextResponse } from "next/server"
import { getPageViews, getEvents, getAbandonedCheckouts, getRecentPageViews, countryCodeToName } from "@/lib/analytics-store"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "30")

  // Fetch analytics data from Netlify Blobs
  const [views, allEvents, abandoned] = await Promise.all([
    getPageViews(days),
    getEvents(days),
    getAbandonedCheckouts(days),
  ])

  // Try to get orders from Supabase (graceful fallback if unavailable)
  let orders: { id: string; total: number; status: string; created_at: string }[] = []
  let prevOrders: { id: string; total: number }[] = []
  let prevViewCount = 0

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient()

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceISO = since.toISOString()
    const prevSince = new Date()
    prevSince.setDate(prevSince.getDate() - days * 2)
    const prevSinceISO = prevSince.toISOString()

    const [ordersRes, prevOrdersRes] = await Promise.all([
      supabase.from("orders").select("id, total, status, created_at").gte("created_at", sinceISO).order("created_at", { ascending: false }),
      supabase.from("orders").select("id, total").gte("created_at", prevSinceISO).lt("created_at", sinceISO),
    ])

    orders = ordersRes.data || []
    prevOrders = prevOrdersRes.data || []
  } catch {
    // Supabase unavailable - orders will be empty
  }

  // Calculate previous period view count from blobs
  const prevPeriodViews = await getPageViews(days * 2)
  const since = new Date()
  since.setDate(since.getDate() - days)
  prevViewCount = prevPeriodViews.filter(v => new Date(v.created_at) < since).length

  const totalViews = views.length
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const prevOrderCount = prevOrders.length
  const prevRevenue = prevOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  // Separate human vs bot views
  const humanViews = views.filter(v => !v.is_bot)
  const botViews = views.filter(v => v.is_bot)
  const humanViewCount = humanViews.length
  const botViewCount = botViews.length

  // Unique sessions (human only)
  const uniqueSessions = new Set(humanViews.map(v => v.session_id).filter(Boolean)).size

  // Average session duration (human only, views with duration > 0)
  const viewsWithDuration = humanViews.filter(v => v.duration_seconds && v.duration_seconds > 0)
  const avgDuration = viewsWithDuration.length > 0
    ? Math.round(viewsWithDuration.reduce((sum, v) => sum + v.duration_seconds, 0) / viewsWithDuration.length)
    : 0

  // Average scroll depth (human only)
  const viewsWithScroll = humanViews.filter(v => v.scroll_depth && v.scroll_depth > 0)
  const avgScrollDepth = viewsWithScroll.length > 0
    ? Math.round(viewsWithScroll.reduce((sum, v) => sum + v.scroll_depth, 0) / viewsWithScroll.length)
    : 0

  // Bounce rate: sessions with only 1 page view / total sessions
  const sessionPageCounts: Record<string, number> = {}
  humanViews.forEach(v => {
    if (v.session_id) sessionPageCounts[v.session_id] = (sessionPageCounts[v.session_id] || 0) + 1
  })
  const totalSessions = Object.keys(sessionPageCounts).length || 1
  const bounceSessions = Object.values(sessionPageCounts).filter(c => c === 1).length
  const bounceRate = Math.round((bounceSessions / totalSessions) * 100)

  // Sales by day
  const salesByDay: Record<string, { orders: number; revenue: number }> = {}
  orders.forEach((o) => {
    const day = new Date(o.created_at).toISOString().split("T")[0]
    if (!salesByDay[day]) salesByDay[day] = { orders: 0, revenue: 0 }
    salesByDay[day].orders++
    salesByDay[day].revenue += Number(o.total) || 0
  })
  const salesTimeline: { date: string; orders: number; revenue: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    salesTimeline.push({ date: key, orders: salesByDay[key]?.orders || 0, revenue: salesByDay[key]?.revenue || 0 })
  }

  // Views by page (human only)
  const pageMap: Record<string, number> = {}
  humanViews.forEach((v) => { pageMap[v.page_path] = (pageMap[v.page_path] || 0) + 1 })
  const topPages = Object.entries(pageMap)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // Page retention: avg duration per page
  const pageDuration: Record<string, { total: number; count: number }> = {}
  viewsWithDuration.forEach(v => {
    if (!pageDuration[v.page_path]) pageDuration[v.page_path] = { total: 0, count: 0 }
    pageDuration[v.page_path].total += v.duration_seconds
    pageDuration[v.page_path].count++
  })
  const pageRetention = Object.entries(pageDuration)
    .map(([page, d]) => ({ page, avgDuration: Math.round(d.total / d.count), views: d.count }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 15)

  // Views by day (plus click totals per day so the traffic chart can show
  // views and clicks on the same timeline).
  const dayMap: Record<string, { total: number; human: number; bot: number }> = {}
  views.forEach((v) => {
    const day = new Date(v.created_at).toISOString().split("T")[0]
    if (!dayMap[day]) dayMap[day] = { total: 0, human: 0, bot: 0 }
    dayMap[day].total++
    if (v.is_bot) dayMap[day].bot++
    else dayMap[day].human++
  })
  const clicksByDayMap: Record<string, number> = {}
  allEvents.forEach((e) => {
    if (e.event_type !== "click" || e.is_bot) return
    const day = new Date(e.created_at).toISOString().split("T")[0]
    clicksByDayMap[day] = (clicksByDayMap[day] || 0) + 1
  })
  const viewsByDay: { date: string; count: number; human: number; bot: number; clicks: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    viewsByDay.push({
      date: key,
      count: dayMap[key]?.total || 0,
      human: dayMap[key]?.human || 0,
      bot: dayMap[key]?.bot || 0,
      clicks: clicksByDayMap[key] || 0,
    })
  }

  // Device breakdown (human only)
  const deviceMap: Record<string, number> = {}
  humanViews.forEach((v) => {
    const d = v.device_type || "desktop"
    deviceMap[d] = (deviceMap[d] || 0) + 1
  })
  const devices = Object.entries(deviceMap).map(([device, count]) => ({
    device, count, percentage: Math.round((count / Math.max(humanViewCount, 1)) * 100)
  }))

  // Browser breakdown (human only)
  const browserMap: Record<string, number> = {}
  humanViews.forEach((v) => { browserMap[v.browser || "Unknown"] = (browserMap[v.browser || "Unknown"] || 0) + 1 })
  const browsers = Object.entries(browserMap)
    .map(([browser, count]) => ({ browser, count, percentage: Math.round((count / Math.max(humanViewCount, 1)) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Country breakdown (human only) - now with full country names, city, and region
  const countryMap: Record<string, { count: number; name: string; cities: Record<string, number> }> = {}
  humanViews.forEach((v) => {
    if (v.country) {
      if (!countryMap[v.country]) {
        countryMap[v.country] = { count: 0, name: v.country_name || countryCodeToName(v.country), cities: {} }
      }
      countryMap[v.country].count++
      if (v.city) {
        countryMap[v.country].cities[v.city] = (countryMap[v.country].cities[v.city] || 0) + 1
      }
    }
  })
  const countries = Object.entries(countryMap)
    .map(([country, data]) => ({
      country,
      countryName: data.name,
      count: data.count,
      percentage: Math.round((data.count / Math.max(humanViewCount, 1)) * 100),
      topCities: Object.entries(data.cities)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // Top referrers (human only) — now with top landing pages per referrer and
  // extracted search terms when the referrer is a search engine.
  const SEARCH_QUERY_PARAMS = ["q", "query", "search", "p", "wd", "text", "k"]
  const SEARCH_HOST_HINTS = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia", "brave"]
  function hostIsSearchEngine(host: string): boolean {
    const h = host.toLowerCase()
    return SEARCH_HOST_HINTS.some((s) => h.includes(s))
  }

  // Social/messaging platforms. Many have multiple hostnames (e.g. Facebook
  // links out via l.facebook.com, lm.facebook.com; Instagram uses l.instagram.com;
  // Twitter/X via t.co). We collapse these into a single canonical label so
  // admins see "Facebook" instead of three separate entries.
  const SOCIAL_HOST_MAP: { match: (h: string) => boolean; label: string }[] = [
    { match: (h) => /(^|\.)facebook\.com$/.test(h) || /(^|\.)fb\.com$/.test(h) || /(^|\.)fb\.me$/.test(h), label: "Facebook" },
    { match: (h) => /(^|\.)instagram\.com$/.test(h), label: "Instagram" },
    { match: (h) => /(^|\.)tiktok\.com$/.test(h) || /(^|\.)bytedance\.net$/.test(h), label: "TikTok" },
    { match: (h) => h === "t.co" || /(^|\.)twitter\.com$/.test(h) || /(^|\.)x\.com$/.test(h), label: "Twitter / X" },
    { match: (h) => /(^|\.)linkedin\.com$/.test(h) || h === "lnkd.in", label: "LinkedIn" },
    { match: (h) => /(^|\.)pinterest\.[a-z.]+$/.test(h) || h === "pin.it", label: "Pinterest" },
    { match: (h) => /(^|\.)reddit\.com$/.test(h) || /(^|\.)redd\.it$/.test(h), label: "Reddit" },
    { match: (h) => /(^|\.)youtube\.com$/.test(h) || h === "youtu.be", label: "YouTube" },
    { match: (h) => /(^|\.)snapchat\.com$/.test(h), label: "Snapchat" },
    { match: (h) => /(^|\.)whatsapp\.com$/.test(h) || h === "wa.me" || /(^|\.)whatsapp\.net$/.test(h), label: "WhatsApp" },
    { match: (h) => /(^|\.)t\.me$/.test(h) || /(^|\.)telegram\.(org|me)$/.test(h), label: "Telegram" },
    { match: (h) => /(^|\.)threads\.net$/.test(h), label: "Threads" },
    { match: (h) => /(^|\.)messenger\.com$/.test(h), label: "Messenger" },
    { match: (h) => /(^|\.)discord\.(com|gg)$/.test(h), label: "Discord" },
  ]

  function classifySocialHost(host: string): string | null {
    const h = host.toLowerCase()
    const match = SOCIAL_HOST_MAP.find((m) => m.match(h))
    return match ? match.label : null
  }

  // When the raw referrer is empty but utm_source/utm_medium indicate a social
  // platform (e.g. client inferred from fbclid/ttclid/igshid), map it to the
  // canonical social label so it appears in Top Referrers.
  function utmSocialLabel(utmSource?: string, utmMedium?: string): string | null {
    const src = (utmSource || "").toLowerCase().trim()
    const med = (utmMedium || "").toLowerCase().trim()
    if (!src) return null
    const isSocialMedium = med === "social" || med === "paid_social" || med === "paidsocial"
    const byName: Record<string, string> = {
      facebook: "Facebook",
      fb: "Facebook",
      instagram: "Instagram",
      ig: "Instagram",
      tiktok: "TikTok",
      twitter: "Twitter / X",
      x: "Twitter / X",
      linkedin: "LinkedIn",
      pinterest: "Pinterest",
      reddit: "Reddit",
      youtube: "YouTube",
      snapchat: "Snapchat",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      threads: "Threads",
    }
    if (byName[src] && (isSocialMedium || Object.keys(byName).includes(src))) return byName[src]
    return null
  }

  const refAgg: Record<string, {
    count: number
    pages: Record<string, number>
    searches: Record<string, number>
    isSearchEngine: boolean
    isSocial: boolean
  }> = {}

  humanViews.forEach((v) => {
    let hostKey = "Direct"
    let isSE = false
    let isSocial = false
    let searchTerm = ""
    if (v.referrer) {
      try {
        const u = new URL(v.referrer)
        const social = classifySocialHost(u.hostname)
        if (social) {
          hostKey = social
          isSocial = true
        } else {
          hostKey = u.hostname
        }
        isSE = hostIsSearchEngine(u.hostname)
        if (isSE) {
          for (const p of SEARCH_QUERY_PARAMS) {
            const val = u.searchParams.get(p)
            if (val) {
              searchTerm = val.trim().toLowerCase().slice(0, 120)
              break
            }
          }
        }
      } catch {
        hostKey = "Direct"
      }
    }
    // Fallback: referrer header was stripped but a utm_source/click-ID on the
    // landing page pointed to a known social platform. Attribute the visit
    // there rather than leaving it as Direct.
    if (hostKey === "Direct") {
      const inferred = utmSocialLabel(v.utm_source, v.utm_medium)
      if (inferred) {
        hostKey = inferred
        isSocial = true
      }
    }
    if (!refAgg[hostKey]) {
      refAgg[hostKey] = { count: 0, pages: {}, searches: {}, isSearchEngine: isSE, isSocial }
    }
    refAgg[hostKey].count++
    refAgg[hostKey].isSearchEngine = refAgg[hostKey].isSearchEngine || isSE
    refAgg[hostKey].isSocial = refAgg[hostKey].isSocial || isSocial
    const landing = v.page_path || "/"
    refAgg[hostKey].pages[landing] = (refAgg[hostKey].pages[landing] || 0) + 1
    if (searchTerm) {
      refAgg[hostKey].searches[searchTerm] = (refAgg[hostKey].searches[searchTerm] || 0) + 1
    }
  })

  const referrers = Object.entries(refAgg)
    .map(([source, data]) => ({
      source,
      count: data.count,
      isSearchEngine: data.isSearchEngine,
      isSocial: data.isSocial,
      topPages: Object.entries(data.pages)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topSearchTerms: Object.entries(data.searches)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // Dedicated search-engine referrer roll-up so admins can see which search
  // engines drove traffic and (where available) which keyword queries landed
  // visitors on the site.
  const searchEngineStats: Record<string, { count: number; terms: Record<string, number> }> = {}
  referrers.forEach((r) => {
    if (!r.isSearchEngine) return
    if (!searchEngineStats[r.source]) searchEngineStats[r.source] = { count: 0, terms: {} }
    searchEngineStats[r.source].count += r.count
    r.topSearchTerms.forEach((t) => {
      searchEngineStats[r.source].terms[t.term] = (searchEngineStats[r.source].terms[t.term] || 0) + t.count
    })
  })
  const searchEngineReferrers = Object.entries(searchEngineStats)
    .map(([source, data]) => ({
      source,
      count: data.count,
      topTerms: Object.entries(data.terms)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    }))
    .sort((a, b) => b.count - a.count)

  // Click events summary
  const clickEvents = allEvents.filter(e => e.event_type === "click" && !e.is_bot)
  const totalClicks = clickEvents.length

  const clickTargetMap: Record<string, number> = {}
  clickEvents.forEach(e => {
    const target = e.event_target || "Unknown"
    clickTargetMap[target] = (clickTargetMap[target] || 0) + 1
  })
  const topClicks = Object.entries(clickTargetMap)
    .map(([target, count]) => ({ target, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const clickPageMap: Record<string, number> = {}
  clickEvents.forEach(e => {
    clickPageMap[e.page_path || "/"] = (clickPageMap[e.page_path || "/"] || 0) + 1
  })
  const clicksByPage = Object.entries(clickPageMap)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Traffic Source Categorization
  const searchEngines = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia", "brave"]
  const socialNetworks = ["facebook", "instagram", "tiktok", "twitter", "x.com", "linkedin", "pinterest", "reddit", "youtube", "snapchat", "whatsapp", "t.co"]
  const emailProviders = ["mail", "email", "outlook", "gmail", "newsletter"]

  function categorizeSource(referrer: string, utmMedium?: string, utmSource?: string): string {
    if (utmMedium) {
      const med = utmMedium.toLowerCase()
      if (med === "cpc" || med === "ppc" || med === "paid" || med === "paidsearch") return "Paid Search"
      if (med === "social" || med === "paid_social" || med === "paidsocial") return "Social"
      if (med === "email" || med === "e-mail") return "Email"
      if (med === "organic") return "Organic Search"
      if (med === "referral") return "Referral"
      if (med === "display" || med === "banner" || med === "cpm") return "Display"
      if (med === "affiliate") return "Affiliate"
    }
    if (utmSource) {
      const src = utmSource.toLowerCase()
      if (searchEngines.some(se => src.includes(se))) return "Organic Search"
      if (socialNetworks.some(sn => src.includes(sn))) return "Social"
      if (emailProviders.some(ep => src.includes(ep))) return "Email"
    }
    if (!referrer) return "Direct"
    try {
      const host = new URL(referrer).hostname.toLowerCase()
      if (searchEngines.some(se => host.includes(se))) return "Organic Search"
      if (socialNetworks.some(sn => host.includes(sn))) return "Social"
      if (emailProviders.some(ep => host.includes(ep))) return "Email"
      return "Referral"
    } catch {
      return "Direct"
    }
  }

  const sourceCategories: Record<string, number> = {}
  humanViews.forEach(v => {
    const cat = categorizeSource(v.referrer || "", v.utm_medium, v.utm_source)
    sourceCategories[cat] = (sourceCategories[cat] || 0) + 1
  })
  const trafficChannels = Object.entries(sourceCategories)
    .map(([channel, count]) => ({ channel, count, percentage: Math.round((count / Math.max(humanViewCount, 1)) * 100) }))
    .sort((a, b) => b.count - a.count)

  // New vs Returning Visitors
  const visitorMap: Record<string, boolean> = {}
  humanViews.forEach(v => {
    const vid = v.visitor_id || v.session_id
    if (vid && visitorMap[vid] === undefined) {
      visitorMap[vid] = v.is_returning === true
    }
  })
  const totalUniqueVisitors = Object.keys(visitorMap).length || 1
  const returningVisitors = Object.values(visitorMap).filter(r => r).length
  const newVisitors = totalUniqueVisitors - returningVisitors
  const newVsReturning = {
    new: newVisitors,
    returning: returningVisitors,
    newPercentage: Math.round((newVisitors / totalUniqueVisitors) * 100),
    returningPercentage: Math.round((returningVisitors / totalUniqueVisitors) * 100),
  }

  // UTM Campaign Data
  const campaignMap: Record<string, { views: number; source: string; medium: string }> = {}
  humanViews.forEach(v => {
    if (v.utm_campaign) {
      if (!campaignMap[v.utm_campaign]) {
        campaignMap[v.utm_campaign] = { views: 0, source: v.utm_source || "", medium: v.utm_medium || "" }
      }
      campaignMap[v.utm_campaign].views++
    }
  })
  const utmCampaigns = Object.entries(campaignMap)
    .map(([campaign, data]) => ({ campaign, views: data.views, source: data.source, medium: data.medium }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  const utmEvents = allEvents.filter(e => e.event_type === "utm_landing" && !e.is_bot)
  const utmSourceMap: Record<string, number> = {}
  utmEvents.forEach(e => {
    const src = (e.event_data as Record<string, string>)?.utm_source || "unknown"
    utmSourceMap[src] = (utmSourceMap[src] || 0) + 1
  })
  const utmSources = Object.entries(utmSourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Language Breakdown
  const langMap: Record<string, number> = {}
  humanViews.forEach(v => {
    if (v.language) {
      const lang = v.language.split("-")[0]
      langMap[lang] = (langMap[lang] || 0) + 1
    }
  })
  const languages = Object.entries(langMap)
    .map(([language, count]) => ({ language, count, percentage: Math.round((count / Math.max(humanViewCount, 1)) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Abandoned checkouts summary
  const totalAbandoned = abandoned.length
  const recoveredCount = abandoned.filter(a => a.recovered).length
  const abandonedValue = abandoned.reduce((sum, a) => sum + (Number(a.subtotal) || 0), 0)
  const abandonedByStep: Record<string, number> = {}
  const abandonedByReason: Record<string, number> = {}
  abandoned.forEach(a => {
    abandonedByStep[a.step_reached || "cart"] = (abandonedByStep[a.step_reached || "cart"] || 0) + 1
    const reason = a.reason || "unknown"
    abandonedByReason[reason] = (abandonedByReason[reason] || 0) + 1
  })

  // ---- Search term analytics ----
  const searchEvents = allEvents.filter(e => e.event_type === "search" && !e.is_bot)
  const searchTermCounts: Record<string, { count: number; uniqueSessions: Set<string>; lastSeen: string }> = {}
  searchEvents.forEach(e => {
    const term = (e.event_target || "").trim().toLowerCase()
    if (!term) return
    if (!searchTermCounts[term]) {
      searchTermCounts[term] = { count: 0, uniqueSessions: new Set(), lastSeen: e.created_at }
    }
    searchTermCounts[term].count++
    if (e.session_id) searchTermCounts[term].uniqueSessions.add(e.session_id)
    if (e.created_at > searchTermCounts[term].lastSeen) searchTermCounts[term].lastSeen = e.created_at
  })
  const topSearches = Object.entries(searchTermCounts)
    .map(([term, data]) => ({
      term,
      count: data.count,
      uniqueVisitors: data.uniqueSessions.size,
      lastSeen: data.lastSeen,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
  const totalSearches = searchEvents.length

  // Searches over time (last "days" buckets)
  const searchByDayMap: Record<string, number> = {}
  searchEvents.forEach(e => {
    const day = new Date(e.created_at).toISOString().split("T")[0]
    searchByDayMap[day] = (searchByDayMap[day] || 0) + 1
  })
  const searchesByDay: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    searchesByDay.push({ date: key, count: searchByDayMap[key] || 0 })
  }

  // ---- Live visitor heat map (last 15 minutes, human only) ----
  const liveWindowMinutes = 15
  const recentViews = await getRecentPageViews(liveWindowMinutes)
  const recentHumanViews = recentViews.filter(v => !v.is_bot)
  const liveCutoff = Date.now() - 5 * 60 * 1000
  const activeSessionIds = new Set<string>()
  const liveCellMap: Record<string, {
    country: string
    countryName: string
    region: string
    city: string
    sessions: Set<string>
    views: number
    latest: string
  }> = {}

  recentHumanViews.forEach(v => {
    if (new Date(v.created_at).getTime() >= liveCutoff && v.session_id) {
      activeSessionIds.add(v.session_id)
    }
    const country = v.country || "??"
    const city = v.city || "Unknown"
    const key = `${country}__${city}`
    if (!liveCellMap[key]) {
      liveCellMap[key] = {
        country,
        countryName: v.country_name || countryCodeToName(country),
        region: v.region || "",
        city,
        sessions: new Set(),
        views: 0,
        latest: v.created_at,
      }
    }
    liveCellMap[key].views++
    if (v.session_id) liveCellMap[key].sessions.add(v.session_id)
    if (v.created_at > liveCellMap[key].latest) liveCellMap[key].latest = v.created_at
  })

  const heatmapCells = Object.values(liveCellMap)
    .map(c => ({
      country: c.country,
      countryName: c.countryName,
      region: c.region,
      city: c.city,
      visitors: c.sessions.size || 1,
      views: c.views,
      latest: c.latest,
    }))
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views)
    .slice(0, 25)

  const activeVisitors = activeSessionIds.size
  const liveByCountryMap: Record<string, { country: string; countryName: string; visitors: number }> = {}
  heatmapCells.forEach(cell => {
    if (!liveByCountryMap[cell.country]) {
      liveByCountryMap[cell.country] = { country: cell.country, countryName: cell.countryName, visitors: 0 }
    }
    liveByCountryMap[cell.country].visitors += cell.visitors
  })
  const liveByCountry = Object.values(liveByCountryMap).sort((a, b) => b.visitors - a.visitors).slice(0, 10)

  // Minute-by-minute active visitor trend for the last 15 minutes.
  const activityByMinute: { minute: string; visitors: number }[] = []
  for (let i = liveWindowMinutes - 1; i >= 0; i--) {
    const windowStart = Date.now() - (i + 1) * 60 * 1000
    const windowEnd = Date.now() - i * 60 * 1000
    const sessions = new Set<string>()
    recentHumanViews.forEach(v => {
      const ts = new Date(v.created_at).getTime()
      if (ts >= windowStart && ts < windowEnd && v.session_id) sessions.add(v.session_id)
    })
    const minuteLabel = new Date(windowEnd - 30 * 1000).toISOString().slice(11, 16)
    activityByMinute.push({ minute: minuteLabel, visitors: sessions.size })
  }

  // Pages currently being viewed (active within 5 minutes).
  const currentPageMap: Record<string, { views: number; sessions: Set<string> }> = {}
  recentHumanViews.forEach(v => {
    if (new Date(v.created_at).getTime() < liveCutoff) return
    const path = v.page_path || "/"
    if (!currentPageMap[path]) currentPageMap[path] = { views: 0, sessions: new Set() }
    currentPageMap[path].views++
    if (v.session_id) currentPageMap[path].sessions.add(v.session_id)
  })
  const currentlyViewing = Object.entries(currentPageMap)
    .map(([page, data]) => ({ page, views: data.views, visitors: data.sessions.size }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10)

  // Flat top-cities leaderboard (ranked across every country, not nested).
  const cityMap: Record<string, { city: string; country: string; countryName: string; count: number }> = {}
  humanViews.forEach((v) => {
    if (!v.city) return
    const key = `${v.country || "??"}__${v.city}`
    if (!cityMap[key]) {
      cityMap[key] = {
        city: v.city,
        country: v.country || "??",
        countryName: v.country_name || countryCodeToName(v.country || ""),
        count: 0,
      }
    }
    cityMap[key].count++
  })
  const topCities = Object.values(cityMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((c) => ({
      ...c,
      percentage: Math.round((c.count / Math.max(humanViewCount, 1)) * 100),
    }))

  // Top pages by combined engagement (views + clicks on the page).
  const pageEngagement: Record<string, { views: number; clicks: number }> = {}
  humanViews.forEach((v) => {
    const p = v.page_path || "/"
    if (!pageEngagement[p]) pageEngagement[p] = { views: 0, clicks: 0 }
    pageEngagement[p].views++
  })
  clickEvents.forEach((e) => {
    const p = e.page_path || "/"
    if (!pageEngagement[p]) pageEngagement[p] = { views: 0, clicks: 0 }
    pageEngagement[p].clicks++
  })
  const topPagesByEngagement = Object.entries(pageEngagement)
    .map(([page, d]) => ({ page, views: d.views, clicks: d.clicks, total: d.views + d.clicks }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Recent visitor feed — most recent human sessions with the full list of
  // pages they accessed (most recent first). One row per session.
  const sessionMap: Record<string, {
    sessionId: string
    visitorId: string
    page: string
    pagePaths: string[]
    country: string
    countryName: string
    city: string
    region: string
    device: string
    browser: string
    referrer: string
    isReturning: boolean
    latest: string
    pages: number
  }> = {}
  humanViews.forEach((v) => {
    const sid = v.session_id || v.visitor_id || v.id
    if (!sid) return
    const path = v.page_path || "/"
    if (!sessionMap[sid]) {
      sessionMap[sid] = {
        sessionId: sid,
        visitorId: v.visitor_id || "",
        page: path,
        pagePaths: [path],
        country: v.country || "",
        countryName: v.country_name || countryCodeToName(v.country || ""),
        city: v.city || "",
        region: v.region || "",
        device: v.device_type || "desktop",
        browser: v.browser || "",
        referrer: v.referrer || "",
        isReturning: v.is_returning === true,
        latest: v.created_at,
        pages: 1,
      }
    } else {
      const row = sessionMap[sid]
      row.pages++
      if (!row.pagePaths.includes(path)) row.pagePaths.push(path)
      if (v.created_at > row.latest) {
        row.latest = v.created_at
        row.page = path
      }
      if (!row.country && v.country) row.country = v.country
      if (!row.countryName && v.country_name) row.countryName = v.country_name
      if (!row.city && v.city) row.city = v.city
      if (!row.referrer && v.referrer) row.referrer = v.referrer
    }
  })
  const recentVisitors = Object.values(sessionMap)
    .sort((a, b) => new Date(b.latest).getTime() - new Date(a.latest).getTime())
    .slice(0, 25)
    .map((s) => {
      let refHost = ""
      if (s.referrer) {
        try { refHost = new URL(s.referrer).hostname } catch { refHost = "" }
      }
      return { ...s, referrerHost: refHost || "Direct" }
    })

  return NextResponse.json({
    totalViews,
    humanViewCount,
    botViewCount,
    previousPeriodViews: prevViewCount,
    uniqueSessions,
    avgDuration,
    avgScrollDepth,
    bounceRate,
    totalOrders,
    totalRevenue,
    prevOrderCount,
    prevRevenue,
    topPages,
    pageRetention,
    viewsByDay,
    salesTimeline,
    devices,
    browsers,
    countries,
    referrers,
    searchEngineReferrers,
    totalClicks,
    topClicks,
    clicksByPage,
    botTraffic: {
      total: botViewCount,
      percentage: totalViews > 0 ? Math.round((botViewCount / totalViews) * 100) : 0,
    },
    abandonedCheckouts: {
      total: totalAbandoned,
      recovered: recoveredCount,
      value: abandonedValue,
      byStep: abandonedByStep,
      byReason: abandonedByReason,
      recent: abandoned.slice(0, 10).map(a => ({
        id: a.id,
        customerName: a.customer_name || "Anonymous",
        items: a.items,
        subtotal: a.subtotal,
        stepReached: a.step_reached,
        reason: a.reason || "",
        recovered: a.recovered,
        createdAt: a.created_at,
      })),
    },
    trafficChannels,
    newVsReturning,
    utmCampaigns,
    utmSources,
    languages,
    topCities,
    topPagesByEngagement,
    recentVisitors,
    searches: {
      total: totalSearches,
      top: topSearches,
      byDay: searchesByDay,
    },
    liveHeatmap: {
      activeVisitors,
      cells: heatmapCells,
      byCountry: liveByCountry,
      activityByMinute,
      currentlyViewing,
      windowMinutes: liveWindowMinutes,
    },
  })
}

import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"
import { getPageViews } from "@/lib/analytics-store"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  // Fetch SEO pages from Supabase (graceful fallback)
  let pages: Record<string, unknown>[] = []
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const supabase = createAdminClient()
    const { data: seoPages } = await supabase
      .from("seo_pages")
      .select("*")
      .order("page_path")
    pages = seoPages || []
  } catch {
    // Supabase unavailable
    return NextResponse.json({
      overview: { avgSeoScore: 0, totalPages: 0, indexedPages: 0, pagesWithIssues: 0, totalTraffic30d: 0, searchEngineTraffic: 0, searchTrafficPercent: 0 },
      pages: [],
      topReferrers: [],
    })
  }

  // Fetch page views from Netlify Blobs
  const views30 = await getPageViews(30)
  const since7 = new Date()
  since7.setDate(since7.getDate() - 7)

  const allViews = views30.filter(v => !v.is_bot)

  // Views per page path
  const viewsByPath: Record<string, { total: number; last7: number; sessions: Set<string>; durationSum: number; durationCount: number; referrers: Record<string, number> }> = {}

  allViews.forEach(v => {
    const path = v.page_path || "/"
    if (!viewsByPath[path]) {
      viewsByPath[path] = { total: 0, last7: 0, sessions: new Set(), durationSum: 0, durationCount: 0, referrers: {} }
    }
    viewsByPath[path].total++
    if (new Date(v.created_at) >= since7) viewsByPath[path].last7++
    if (v.session_id) viewsByPath[path].sessions.add(v.session_id)
    if (v.duration_seconds && v.duration_seconds > 0) {
      viewsByPath[path].durationSum += v.duration_seconds
      viewsByPath[path].durationCount++
    }
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname
        viewsByPath[path].referrers[host] = (viewsByPath[path].referrers[host] || 0) + 1
      } catch { /* ignore */ }
    }
  })

  const searchEngines = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia"]
  const isSearchEngine = (host: string) => searchEngines.some(se => host.includes(se))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageAnalytics = pages.map((page: any) => {
    const path = page.page_path
    const stats = viewsByPath[path]

    let score = 0
    const checks: { label: string; passed: boolean; weight: number; tip: string }[] = []

    const hasTitle = !!page.meta_title && page.meta_title.length > 0
    const titleOk = hasTitle && page.meta_title.length >= 20 && page.meta_title.length <= 60
    checks.push({ label: "Meta title", passed: titleOk, weight: 20, tip: titleOk ? "Good length" : !hasTitle ? "Missing meta title" : page.meta_title.length < 20 ? "Too short (min 20 chars)" : "Too long (max 60 chars)" })
    if (titleOk) score += 20
    else if (hasTitle) score += 8

    const hasDesc = !!page.meta_description && page.meta_description.length > 0
    const descOk = hasDesc && page.meta_description.length >= 70 && page.meta_description.length <= 160
    checks.push({ label: "Meta description", passed: descOk, weight: 20, tip: descOk ? "Good length" : !hasDesc ? "Missing meta description" : page.meta_description.length < 70 ? "Too short (min 70 chars)" : "Too long (max 160 chars)" })
    if (descOk) score += 20
    else if (hasDesc) score += 8

    const hasKeywords = !!page.meta_keywords && page.meta_keywords.length > 0
    checks.push({ label: "Meta keywords", passed: hasKeywords, weight: 10, tip: hasKeywords ? "Keywords set" : "No keywords defined" })
    if (hasKeywords) score += 10

    const hasOgTitle = !!page.og_title && page.og_title.length > 0
    checks.push({ label: "OG title", passed: hasOgTitle, weight: 10, tip: hasOgTitle ? "Social title set" : "Missing Open Graph title" })
    if (hasOgTitle) score += 10

    const hasOgDesc = !!page.og_description && page.og_description.length > 0
    checks.push({ label: "OG description", passed: hasOgDesc, weight: 10, tip: hasOgDesc ? "Social description set" : "Missing Open Graph description" })
    if (hasOgDesc) score += 10

    const hasOgImage = !!page.og_image && page.og_image.length > 0
    checks.push({ label: "OG image", passed: hasOgImage, weight: 10, tip: hasOgImage ? "Social image set" : "Missing Open Graph image — impacts social sharing" })
    if (hasOgImage) score += 10

    const hasCanonical = !!page.canonical_url && page.canonical_url.length > 0
    checks.push({ label: "Canonical URL", passed: hasCanonical, weight: 10, tip: hasCanonical ? "Canonical set" : "No canonical URL — may cause duplicate content" })
    if (hasCanonical) score += 10

    const isIndexable = !page.no_index
    checks.push({ label: "Indexable", passed: isIndexable, weight: 10, tip: isIndexable ? "Page is indexable" : "Page is set to noindex" })
    if (isIndexable) score += 10

    const totalViews = stats?.total || 0
    const weeklyViews = stats?.last7 || 0
    const uniqueVisitors = stats?.sessions.size || 0
    const avgDuration = stats?.durationCount ? Math.round(stats.durationSum / stats.durationCount) : 0

    const referrerList = stats ? Object.entries(stats.referrers)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) : []

    const searchTraffic = stats ? Object.entries(stats.referrers)
      .filter(([host]) => isSearchEngine(host))
      .reduce((sum, [, count]) => sum + count, 0) : 0

    let discoverability: "excellent" | "good" | "fair" | "poor" | "hidden"
    if (page.no_index) discoverability = "hidden"
    else if (score >= 80 && totalViews > 10) discoverability = "excellent"
    else if (score >= 60 && totalViews > 5) discoverability = "good"
    else if (score >= 40 || totalViews > 0) discoverability = "fair"
    else discoverability = "poor"

    return {
      id: page.id,
      page_path: path,
      page_title: page.page_title,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      no_index: page.no_index,
      seoScore: score,
      checks,
      discoverability,
      traffic: {
        views30d: totalViews,
        views7d: weeklyViews,
        uniqueVisitors,
        avgDuration,
        searchTraffic,
        referrers: referrerList,
      },
    }
  })

  const avgScore = pages.length > 0 ? Math.round(pageAnalytics.reduce((s, p) => s + p.seoScore, 0) / pages.length) : 0
  const totalSearchTraffic = pageAnalytics.reduce((s, p) => s + p.traffic.searchTraffic, 0)
  const totalOrganic = allViews.length
  const indexedPages = pages.filter((p: Record<string, unknown>) => !p.no_index).length
  const pagesWithIssues = pageAnalytics.filter(p => p.seoScore < 60).length

  const globalRefs: Record<string, number> = {}
  allViews.forEach(v => {
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname
        globalRefs[host] = (globalRefs[host] || 0) + 1
      } catch { /* ignore */ }
    }
  })
  const topReferrers = Object.entries(globalRefs)
    .map(([source, count]) => ({
      source,
      count,
      isSearch: isSearchEngine(source),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return NextResponse.json({
    overview: {
      avgSeoScore: avgScore,
      totalPages: pages.length,
      indexedPages,
      pagesWithIssues,
      totalTraffic30d: totalOrganic,
      searchEngineTraffic: totalSearchTraffic,
      searchTrafficPercent: totalOrganic > 0 ? Math.round((totalSearchTraffic / totalOrganic) * 100) : 0,
    },
    pages: pageAnalytics,
    topReferrers,
  })
}

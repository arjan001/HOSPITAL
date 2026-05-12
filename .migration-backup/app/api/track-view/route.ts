import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, sanitize } from "@/lib/security"
import { addPageView, updatePageView, parseNetlifyGeo, getClientIP, countryCodeToName, touchSession } from "@/lib/analytics-store"
import { classifyTraffic } from "@/lib/traffic-classifier"

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 60, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  try {
    const body = await request.json()

    // sendBeacon always sends POST, so detect duration updates via _update flag
    if (body._update) {
      const sessionId = sanitize(body.sessionId || "", 100)
      const path = sanitize(body.path || "", 500)
      const duration = Math.min(3600, Math.max(0, Math.floor(Number(body.duration) || 0)))
      const scrollDepth = Math.min(100, Math.max(0, Math.floor(Number(body.scrollDepth) || 0)))
      if (sessionId && path) {
        await updatePageView(sessionId, path, duration, scrollDepth)
        touchSession(sessionId).catch(() => {})
      }
      return NextResponse.json({ success: true })
    }

    const userAgent = request.headers.get("user-agent") || ""
    const traffic = classifyTraffic(request.headers, body.isBot === true)

    // Netlify geo headers for country, city, region
    const geo = parseNetlifyGeo(request.headers)
    const ip = getClientIP(request.headers)

    const sessionId = sanitize(body.sessionId || "", 100)

    await addPageView({
      page_path: sanitize(body.path || "/", 500),
      referrer: sanitize(body.referrer || "", 2000),
      user_agent: userAgent.slice(0, 500),
      country: geo.country || "",
      country_name: geo.countryName || countryCodeToName(geo.country),
      city: geo.city || "",
      region: geo.region || "",
      device_type: traffic.deviceType,
      browser: traffic.browser,
      session_id: sessionId,
      is_bot: traffic.isBot,
      ip_address: ip.slice(0, 45),
      duration_seconds: 0,
      scroll_depth: 0,
      visitor_id: sanitize(body.visitorId || "", 100),
      is_returning: body.isReturning === true,
      language: sanitize(body.language || "", 20),
      utm_source: sanitize(body.utmSource || "", 200),
      utm_medium: sanitize(body.utmMedium || "", 200),
      utm_campaign: sanitize(body.utmCampaign || "", 200),
    })

    // Touch realtime session tracker (non-bot only)
    if (!traffic.isBot && sessionId) {
      touchSession(sessionId).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Failed to track view:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

// PATCH - Update duration and scroll depth for existing page view
export async function PATCH(request: NextRequest) {
  const rl = rateLimit(request, { limit: 60, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  try {
    const body = await request.json()
    const sessionId = sanitize(body.sessionId || "", 100)
    const path = sanitize(body.path || "", 500)
    const duration = Math.min(3600, Math.max(0, Math.floor(Number(body.duration) || 0)))
    const scrollDepth = Math.min(100, Math.max(0, Math.floor(Number(body.scrollDepth) || 0)))

    if (!sessionId || !path) {
      return NextResponse.json({ success: true }) // silent drop
    }

    await updatePageView(sessionId, path, duration, scrollDepth)

    // Touch realtime session tracker
    touchSession(sessionId).catch(() => {})

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, sanitize } from "@/lib/security"
import { addEvent, parseNetlifyGeo, getClientIP, countryCodeToName } from "@/lib/analytics-store"
import { classifyTraffic } from "@/lib/traffic-classifier"

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 120, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  try {
    const body = await request.json()
    const traffic = classifyTraffic(request.headers, body.isBot === true)
    const geo = parseNetlifyGeo(request.headers)
    const ip = getClientIP(request.headers)

    await addEvent({
      event_type: sanitize(body.eventType || "click", 50),
      event_target: sanitize(body.eventTarget || "", 200),
      event_data: body.eventData || {},
      page_path: sanitize(body.pagePath || "/", 500),
      session_id: sanitize(body.sessionId || "", 100),
      device_type: traffic.deviceType,
      browser: traffic.browser,
      country: geo.country || "",
      country_name: geo.countryName || countryCodeToName(geo.country),
      city: geo.city || "",
      region: geo.region || "",
      is_bot: traffic.isBot,
      bot_reason: traffic.botReason,
      ip_address: ip.slice(0, 45),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Failed to track event:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

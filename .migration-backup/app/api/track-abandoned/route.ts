import { NextRequest, NextResponse } from "next/server"
import { UAParser } from "ua-parser-js"
import { rateLimit, rateLimitResponse, sanitize } from "@/lib/security"
import { upsertCheckout, recoverCheckout } from "@/lib/analytics-store"

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  try {
    const body = await request.json()
    const userAgent = request.headers.get("user-agent") || ""
    const parser = new UAParser(userAgent)
    const browser = parser.getBrowser().name || "Unknown"
    const deviceType = parser.getDevice().type || "desktop"

    const sessionId = sanitize(body.sessionId || "", 100)
    if (!sessionId) return NextResponse.json({ success: true })

    await upsertCheckout(sessionId, {
      customer_name: sanitize(body.customerName || "", 100),
      customer_phone: sanitize(body.customerPhone || "", 20),
      customer_email: sanitize(body.customerEmail || "", 320),
      items: body.items || [],
      subtotal: Math.max(0, Number(body.subtotal) || 0),
      step_reached: sanitize(body.stepReached || "cart", 50),
      reason: sanitize(body.reason || "", 50),
      device_type: deviceType,
      browser,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

// Mark checkout as recovered (when order completes)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = sanitize(body.sessionId || "", 100)
    if (!sessionId) return NextResponse.json({ success: true })

    await recoverCheckout(sessionId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

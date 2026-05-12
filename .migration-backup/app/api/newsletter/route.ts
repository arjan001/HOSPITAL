import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, sanitize, isValidEmail } from "@/lib/security"

export async function POST(request: NextRequest) {
  // Rate limit: max 3 subscribes per minute per IP
  const rl = rateLimit(request, { limit: 3, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  try {
    const { email } = await request.json()
    const cleanEmail = sanitize(email, 320).toLowerCase()

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: cleanEmail }, { onConflict: "email" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 })
  }
}

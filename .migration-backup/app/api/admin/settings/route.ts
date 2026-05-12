import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  const { data: current } = await supabase.from("site_settings").select("id").limit(1).single()
  if (!current) return NextResponse.json({ error: "No settings row found" }, { status: 404 })

  const updates: Record<string, unknown> = {}
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) updates[key] = value
  }

  assign("store_name", body.storeName)
  assign("store_email", body.storeEmail)
  assign("store_phone", body.storePhone)
  assign("whatsapp_number", body.whatsappNumber)
  assign("currency_symbol", body.currency)
  if (body.freeShippingThreshold !== undefined) {
    const n = Number(body.freeShippingThreshold)
    updates.free_shipping_threshold = Number.isFinite(n) ? n : 0
  }
  assign("enable_whatsapp_checkout", body.enableWhatsappCheckout)
  assign("maintenance_mode", body.maintenanceMode)
  assign("site_title", body.metaTitle)
  assign("site_description", body.metaDescription)
  assign("meta_keywords", body.metaKeywords)
  assign("primary_color", body.primaryColor)
  assign("logo_image_url", body.logoUrl)
  assign("favicon_url", body.faviconUrl)
  assign("footer_description", body.footerText)
  assign("footer_instagram", body.socialInstagram)
  assign("footer_tiktok", body.socialTiktok)
  assign("footer_twitter", body.socialTwitter)
  assign("show_newsletter", body.enableNewsletter)

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from("site_settings")
    .update(updates)
    .eq("id", current.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

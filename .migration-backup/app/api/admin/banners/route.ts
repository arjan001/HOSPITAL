import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse, isValidUUID } from "@/lib/security"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()

  const [bannersRes, navOffersRes, popupRes] = await Promise.all([
    supabase.from("banners").select("*").order("sort_order", { ascending: true }),
    supabase.from("navbar_offers").select("*").order("sort_order", { ascending: true }),
    supabase.from("popup_offers").select("*").order("created_at", { ascending: false }),
  ])

  return NextResponse.json({
    banners: bannersRes.data || [],
    navbarOffers: navOffersRes.data || [],
    popupOffers: popupRes.data || [],
  })
}

// Banners CRUD
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  if (body.type === "banner") {
    const { data, error } = await supabase
      .from("banners")
      .insert({
        title: body.title,
        subtitle: body.subtitle || null,
        image_url: body.image || null,
        link_url: body.link || "/shop",
        position: body.position || "hero",
        is_active: true,
        sort_order: body.sortOrder || 0,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.type === "navbar_offer") {
    const { data, error } = await supabase
      .from("navbar_offers")
      .insert({
        text: body.text,
        is_active: true,
        sort_order: body.sortOrder || 0,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.type === "popup_offer") {
    const { data, error } = await supabase
      .from("popup_offers")
      .insert({
        title: body.title,
        description: body.description || null,
        discount_percentage: body.discountPercentage ? Number(body.discountPercentage) : null,
        image_url: body.image || null,
        link: body.link || "/shop",
        discount_label: body.discountLabel || null,
        valid_until: body.validUntil || null,
        is_active: body.isActive ?? true,
      })
      .select()
      .single()
    if (error) {
      console.error("[v0] popup_offers insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  if (body.type === "banner") {
    const { error } = await supabase
      .from("banners")
      .update({
        title: body.title,
        subtitle: body.subtitle || null,
        image_url: body.image || null,
        link_url: body.link || "/shop",
        position: body.position || "hero",
        is_active: body.isActive ?? true,
      })
      .eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.type === "navbar_offer") {
    const { error } = await supabase
      .from("navbar_offers")
      .update({ text: body.text, is_active: body.isActive ?? true })
      .eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.type === "popup_offer") {
    const { error } = await supabase
      .from("popup_offers")
      .update({
        title: body.title,
        description: body.description || null,
        discount_percentage: body.discountPercentage ? Number(body.discountPercentage) : null,
        image_url: body.image || null,
        link: body.link || "/shop",
        discount_label: body.discountLabel || null,
        valid_until: body.validUntil || null,
        is_active: body.isActive ?? true,
      })
      .eq("id", body.id)
    if (error) {
      console.error("[v0] popup_offers update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const type = searchParams.get("type")

  if (!id || !type) return NextResponse.json({ error: "Missing id or type" }, { status: 400 })
  if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  if (!["banner", "navbar_offer", "popup_offer"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  const table = type === "banner" ? "banners" : type === "navbar_offer" ? "navbar_offers" : "popup_offers"
  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

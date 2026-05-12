import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/security"

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  
  const supabase = await createClient()
  const { data } = await supabase
    .from("hero_banners")
    .select("*")
    .order("sort_order", { ascending: true })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  
  const supabase = await createClient()
  const body = await req.json()

  const { error } = await supabase.from("hero_banners").insert({
    title: body.title,
    subtitle: body.subtitle || null,
    image_url: body.imageUrl || null,
    button_link: body.buttonLink || "/shop",
    button_text: body.buttonText || "Shop Now",
    is_active: body.isActive ?? true,
    sort_order: body.sortOrder ?? 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  
  const supabase = await createClient()
  const body = await req.json()

  const { error } = await supabase
    .from("hero_banners")
    .update({
      title: body.title,
      subtitle: body.subtitle || null,
      image_url: body.imageUrl || null,
      button_link: body.buttonLink || "/shop",
      button_text: body.buttonText || "Shop Now",
      is_active: body.isActive ?? true,
      sort_order: body.sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const { error } = await supabase.from("hero_banners").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}


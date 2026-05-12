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
    .from("seo_pages")
    .select("*")
    .order("page_path")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  const { error } = await supabase
    .from("seo_pages")
    .upsert({
      id: body.id || undefined,
      page_path: body.page_path,
      page_title: body.page_title,
      meta_title: body.meta_title,
      meta_description: body.meta_description,
      meta_keywords: body.meta_keywords,
      og_title: body.og_title,
      og_description: body.og_description,
      og_image: body.og_image,
      canonical_url: body.canonical_url,
      no_index: body.no_index ?? false,
      no_follow: body.no_follow ?? false,
      structured_data: body.structured_data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "page_path" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { id } = await request.json()

  const { error } = await supabase.from("seo_pages").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"

const VALID_CATEGORIES = new Set(["addon", "gift_wrap", "greeting_card"])

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    category: row.category as string,
    name: row.name as string,
    description: (row.description as string) || "",
    price: Number(row.price) || 0,
    imageUrl: (row.image_url as string) || "",
    isActive: row.is_active as boolean,
    sortOrder: (row.sort_order as number) || 0,
  }
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 60, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  let query = supabase.from("gift_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
  if (category && VALID_CATEGORIES.has(category)) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data || []).map(mapRow))
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const body = await request.json()

  if (!VALID_CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("gift_items")
    .insert({
      category: body.category,
      name: body.name,
      description: body.description || null,
      price: Number(body.price) || 0,
      image_url: body.imageUrl || null,
      is_active: body.isActive ?? true,
      sort_order: Number(body.sortOrder) || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapRow(data))
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const body = await request.json()

  if (!body.id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })
  if (!VALID_CATEGORIES.has(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("gift_items")
    .update({
      category: body.category,
      name: body.name,
      description: body.description || null,
      price: Number(body.price) || 0,
      image_url: body.imageUrl || null,
      is_active: body.isActive ?? true,
      sort_order: Number(body.sortOrder) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  const { error } = await supabase.from("gift_items").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

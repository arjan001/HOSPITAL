import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const VALID_CATEGORIES = new Set(["addon", "gift_wrap", "greeting_card"])

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category")

  let query = supabase
    .from("gift_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (category && VALID_CATEGORIES.has(category)) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data || []).map((row) => ({
    id: row.id as string,
    category: row.category as string,
    name: row.name as string,
    description: (row.description as string) || "",
    price: Number(row.price) || 0,
    imageUrl: (row.image_url as string) || "",
    isActive: row.is_active as boolean,
    sortOrder: (row.sort_order as number) || 0,
  }))

  return NextResponse.json(items)
}

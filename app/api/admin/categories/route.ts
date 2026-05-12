import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"
import { resolveCategoryImage } from "@/lib/category-images"
import { revalidatePath } from "next/cache"

// Re-render public pages that depend on the category catalog so new
// categories (and their SEO metadata / sitemap entries) become discoverable
// by search engines and AI crawlers immediately after creation.
function revalidateCategoryPages() {
  try {
    revalidatePath("/sitemap.xml")
    revalidatePath("/llms.txt")
    revalidatePath("/shop")
    revalidatePath("/")
  } catch {
    // best-effort
  }
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get product counts
  const { data: products } = await supabase.from("products").select("category_id")
  const countMap: Record<string, number> = {}
  for (const p of products || []) {
    countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
  }

  const categories = (data || []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: resolveCategoryImage(cat.slug, cat.image_url),
    productCount: countMap[cat.id] || 0,
    isActive: cat.is_active,
    sortOrder: cat.sort_order,
  }))

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: body.name,
      slug,
      image_url: body.image || null,
      is_active: true,
      sort_order: body.sortOrder || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateCategoryPages()
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const body = await request.json()

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const { error } = await supabase
    .from("categories")
    .update({
      name: body.name,
      slug,
      image_url: body.image || null,
      is_active: body.isActive ?? true,
    })
    .eq("id", body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateCategoryPages()
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateCategoryPages()
  return NextResponse.json({ success: true })
}

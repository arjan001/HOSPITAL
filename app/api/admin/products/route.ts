import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"
import { revalidatePath } from "next/cache"

// Re-render public pages that depend on the product catalog so new products
// (and their SEO metadata / sitemap entries) become discoverable by search
// engines and AI crawlers immediately after upload instead of waiting for the
// hourly revalidate tick.
function revalidateCatalogPages(slug?: string) {
  try {
    revalidatePath("/sitemap.xml")
    revalidatePath("/llms.txt")
    revalidatePath("/shop")
    revalidatePath("/")
    if (slug) revalidatePath(`/product/${slug}`)
  } catch {
    // best-effort; ignore
  }
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const body = await request.json()

  try {
    // Find category ID by slug
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", body.categorySlug)
      .single()

    // Insert product
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: body.name,
        slug: body.slug,
        price: body.price,
        original_price: body.originalPrice || null,
        description: body.description || "",
        category_id: category?.id || null,
        is_new: body.isNew || false,
        is_on_offer: body.isOnOffer || false,
        offer_percentage: body.offerPercentage || 0,
        in_stock: body.inStock ?? true,
        collection: body.collection || "women",
        featured: body.featured || false,
      })
      .select()
      .single()

    if (productError) throw productError

    // Insert images
    if (body.images?.length) {
      const imageRows = body.images.map((imgUrl: string, i: number) => ({
        product_id: product.id,
        image_url: imgUrl,
        alt_text: `${body.name} - Image ${i + 1}`,
        sort_order: i,
        is_primary: i === 0,
      }))
      await supabase.from("product_images").insert(imageRows)
    }

    // Insert variations
    if (body.variations?.length) {
      const variationRows = body.variations.map((v: { type: string; options: string[] }) => ({
        product_id: product.id,
        type: v.type,
        options: v.options,
      }))
      await supabase.from("product_variations").insert(variationRows)
    }

    return NextResponse.json({ id: product.id })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  } finally {
    revalidateCatalogPages(body?.slug)
  }
}

export async function PUT(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const body = await request.json()

  try {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", body.categorySlug)
      .single()

    // Update product
    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: body.name,
        slug: body.slug,
        price: body.price,
        original_price: body.originalPrice || null,
        description: body.description || "",
        category_id: category?.id || null,
        is_new: body.isNew || false,
        is_on_offer: body.isOnOffer || false,
        offer_percentage: body.offerPercentage || 0,
        in_stock: body.inStock ?? true,
        collection: body.collection || "unisex",
      })
      .eq("id", body.id)

    if (updateError) throw updateError

    // Replace images
    await supabase.from("product_images").delete().eq("product_id", body.id)
    if (body.images?.length) {
      const imageRows = body.images.map((imgUrl: string, i: number) => ({
        product_id: body.id,
        image_url: imgUrl,
        alt_text: `${body.name} - Image ${i + 1}`,
        sort_order: i,
        is_primary: i === 0,
      }))
      await supabase.from("product_images").insert(imageRows)
    }

    // Replace variations
    await supabase.from("product_variations").delete().eq("product_id", body.id)
    if (body.variations?.length) {
      const variationRows = body.variations.map((v: { type: string; options: string[] }) => ({
        product_id: body.id,
        type: v.type,
        options: v.options,
      }))
      await supabase.from("product_variations").insert(variationRows)
    }

    return NextResponse.json({ id: body.id })
  } catch (error) {
    console.error("Update product error:", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  } finally {
    revalidateCatalogPages(body?.slug)
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing product ID" }, { status: 400 })
  }

  try {
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete product error:", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  } finally {
    revalidateCatalogPages()
  }
}

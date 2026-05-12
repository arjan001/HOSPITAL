import { Router } from "express"
import { createClient } from "../../../lib/supabase.js"

const router = Router()

async function requireAuth(req: import("express").Request, res: import("express").Response) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false }
  const token = authHeader.slice(7)
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) { res.status(401).json({ error: "Unauthorized" }); return false }
  return true
}

function resolveCategoryImage(slug: string | null | undefined, imageUrl: string | null | undefined): string {
  if (imageUrl && !imageUrl.startsWith("/placeholder")) return imageUrl
  return "/placeholder.svg?height=500&width=400"
}

router.get("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()

  const [productsRes, imagesRes, variationsRes] = await Promise.all([
    supabase.from("products").select("*, categories(name, slug)").order("sort_order", { ascending: true }),
    supabase.from("product_images").select("*").order("sort_order", { ascending: true }),
    supabase.from("product_variations").select("*"),
  ])

  const imagesByProduct: Record<string, string[]> = {}
  for (const img of imagesRes.data || []) {
    if (!imagesByProduct[img.product_id]) imagesByProduct[img.product_id] = []
    imagesByProduct[img.product_id].push(img.image_url)
  }

  const variationsByProduct: Record<string, { type: string; options: string[] }[]> = {}
  for (const v of variationsRes.data || []) {
    if (!variationsByProduct[v.product_id]) variationsByProduct[v.product_id] = []
    variationsByProduct[v.product_id].push({ type: v.type, options: Array.isArray(v.options) ? v.options : [v.value] })
  }

  const products = (productsRes.data || []).map((p) => {
    const cats = (p as Record<string, unknown> & { categories?: { name: string; slug: string } }).categories
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      originalPrice: p.original_price ? Number(p.original_price) : undefined,
      category: cats?.name || "",
      categorySlug: cats?.slug || "",
      images: imagesByProduct[p.id] || [],
      variations: variationsByProduct[p.id] || [],
      isNew: Boolean(p.is_new),
      isOnOffer: Boolean(p.is_on_offer),
      offerPercentage: p.offer_percentage ? Number(p.offer_percentage) : 0,
      inStock: Boolean(p.in_stock),
      collection: p.collection || "unisex",
      description: p.description || "",
    }
  })

  res.json(products)
})

router.post("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body

  try {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", body.categorySlug).single()

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: body.name, slug: body.slug, price: body.price,
        original_price: body.originalPrice || null,
        description: body.description || "",
        category_id: category?.id || null,
        is_new: body.isNew || false,
        is_on_offer: body.isOnOffer || false,
        offer_percentage: body.offerPercentage || 0,
        in_stock: body.inStock ?? true,
        collection: body.collection || "women",
      })
      .select().single()

    if (productError) throw productError

    if (body.images?.length) {
      await supabase.from("product_images").insert(
        body.images.map((imgUrl: string, i: number) => ({
          product_id: product.id, image_url: imgUrl,
          alt_text: `${body.name} - Image ${i + 1}`, sort_order: i, is_primary: i === 0,
        }))
      )
    }

    if (body.variations?.length) {
      await supabase.from("product_variations").insert(
        body.variations.map((v: { type: string; options: string[] }) => ({ product_id: product.id, type: v.type, options: v.options }))
      )
    }

    res.json(product)
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({ error: "Failed to create product" })
  }
})

router.put("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body

  try {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", body.categorySlug).single()

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: body.name, slug: body.slug, price: body.price,
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

    await supabase.from("product_images").delete().eq("product_id", body.id)
    if (body.images?.length) {
      await supabase.from("product_images").insert(
        body.images.map((imgUrl: string, i: number) => ({
          product_id: body.id, image_url: imgUrl,
          alt_text: `${body.name} - Image ${i + 1}`, sort_order: i, is_primary: i === 0,
        }))
      )
    }

    await supabase.from("product_variations").delete().eq("product_id", body.id)
    if (body.variations?.length) {
      await supabase.from("product_variations").insert(
        body.variations.map((v: { type: string; options: string[] }) => ({ product_id: body.id, type: v.type, options: v.options }))
      )
    }

    res.json({ id: body.id })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({ error: "Failed to update product" })
  }
})

router.delete("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const id = req.query.id as string

  if (!id) return res.status(400).json({ error: "Missing product ID" })

  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

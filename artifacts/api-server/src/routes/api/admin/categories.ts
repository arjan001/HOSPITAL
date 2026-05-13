import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/legacy-store.js"

const router = Router()
router.use(requireAdmin)

function resolveCategoryImage(slug: string | null | undefined, imageUrl: string | null | undefined): string {
  const FALLBACKS: Record<string, string> = {
    "necklace-sets": "/images/products/necklaces/necklace-sets-category.jpeg",
  }
  if (imageUrl && !imageUrl.startsWith("/placeholder")) return imageUrl
  if (slug && FALLBACKS[slug]) return FALLBACKS[slug]
  return "/placeholder.svg?height=500&width=400"
}

router.get("/", async (req, res) => {
  const store = createClient()
  const { data, error } = await store.from("categories").select("*").order("sort_order", { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  const { data: products } = await store.from("products").select("category_id")
  const countMap: Record<string, number> = {}
  for (const p of products || []) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1

  const categories = (data || []).map((cat: any) => ({
    id: cat.id, name: cat.name, slug: cat.slug,
    image: resolveCategoryImage(cat.slug, cat.image_url),
    productCount: countMap[cat.id] || 0,
    isActive: cat.is_active, sortOrder: cat.sort_order,
  }))

  res.json(categories)
})

router.post("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const { data, error } = await store
    .from("categories")
    .insert({ name: body.name, slug, image_url: body.image || null, is_active: true, sort_order: body.sortOrder || 0 })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const { error } = await store
    .from("categories")
    .update({ name: body.name, slug, image_url: body.image || null, is_active: body.isActive ?? true })
    .eq("id", body.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  const store = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })

  const { error } = await store.from("categories").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

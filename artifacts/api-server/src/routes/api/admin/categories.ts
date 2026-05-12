import { Router } from "express"
import { createClient } from "../../../lib/supabase.js"

const router = Router()

async function requireAuth(req: import("express").Request, res: import("express").Response) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false }
    const token = authHeader.slice(7)
    let supabase, admin
    try {
      supabase = (await import("../../../lib/supabase.js")).createClient()
      admin = (await import("../../../lib/supabase.js")).createAdminClient()
    } catch {
      res.status(503).json({ error: "Backend not configured" }); return false
    }
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) { res.status(401).json({ error: "Unauthorized" }); return false }
    const { data: row } = await admin.from("admin_users").select("role, is_active").eq("user_id", user.id).maybeSingle()
    const ROLES = new Set(["admin", "super_admin", "editor"])
    if (!row || row.is_active === false || !ROLES.has((row as { role?: string }).role || "")) {
      res.status(403).json({ error: "Forbidden" }); return false
    }
    return true
  }

function resolveCategoryImage(slug: string | null | undefined, imageUrl: string | null | undefined): string {
  const FALLBACKS: Record<string, string> = {
    "necklace-sets": "/images/products/necklaces/necklace-sets-category.jpeg",
  }
  if (imageUrl && !imageUrl.startsWith("/placeholder")) return imageUrl
  if (slug && FALLBACKS[slug]) return FALLBACKS[slug]
  return "/placeholder.svg?height=500&width=400"
}

router.get("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true })
  if (error) return res.status(500).json({ error: error.message })

  const { data: products } = await supabase.from("products").select("category_id")
  const countMap: Record<string, number> = {}
  for (const p of products || []) countMap[p.category_id] = (countMap[p.category_id] || 0) + 1

  const categories = (data || []).map((cat) => ({
    id: cat.id, name: cat.name, slug: cat.slug,
    image: resolveCategoryImage(cat.slug, cat.image_url),
    productCount: countMap[cat.id] || 0,
    isActive: cat.is_active, sortOrder: cat.sort_order,
  }))

  res.json(categories)
})

router.post("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: body.name, slug, image_url: body.image || null, is_active: true, sort_order: body.sortOrder || 0 })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body
  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  const { error } = await supabase
    .from("categories")
    .update({ name: body.name, slug, image_url: body.image || null, is_active: body.isActive ?? true })
    .eq("id", body.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })

  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/legacy-store.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (req, res) => {
  const store = createClient()
  const { data, error } = await store
    .from("gift_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const { data, error } = await store
    .from("gift_items")
    .insert({
      category: body.category, name: body.name,
      description: body.description || null, price: body.price,
      image_url: body.imageUrl || null, is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const { error } = await store
    .from("gift_items")
    .update({
      category: body.category, name: body.name,
      description: body.description || null, price: body.price,
      image_url: body.imageUrl || null, is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
    })
    .eq("id", body.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  const store = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })
  const { error } = await store.from("gift_items").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

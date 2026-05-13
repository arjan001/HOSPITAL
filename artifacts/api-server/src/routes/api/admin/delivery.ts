import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/legacy-store.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (req, res) => {
  const store = createClient()
  const { data, error } = await store
    .from("delivery_locations").select("*")
    .order("region", { ascending: true })
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const { data, error } = await store
    .from("delivery_locations")
    .insert({
      name: body.name, fee: body.fee,
      estimated_days: body.estimatedDays || "",
      type: body.type || "delivery", region: body.region || "nairobi",
      city: body.city || null, description: body.description || null,
      is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
    })
    .select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const { error } = await store
    .from("delivery_locations")
    .update({
      name: body.name, fee: body.fee,
      estimated_days: body.estimatedDays || "",
      type: body.type || "delivery", region: body.region || "nairobi",
      city: body.city || null, description: body.description || null,
      is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
    })
    .eq("id", body.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  const store = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })
  const { error } = await store.from("delivery_locations").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

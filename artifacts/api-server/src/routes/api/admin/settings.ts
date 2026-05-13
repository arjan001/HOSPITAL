import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/legacy-store.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (req, res) => {
  const store = createClient()
  const { data, error } = await store.from("site_settings").select("*").limit(1).single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  const store = createClient()
  const body = req.body
  const { data: current } = await store.from("site_settings").select("id").limit(1).single()
  if (!current) return res.status(404).json({ error: "No settings row found" })

  const updates: Record<string, unknown> = {}
  const allowed = [
    "store_name", "whatsapp_number", "whatsapp_order_number",
    "phone_number", "email", "address", "business_hours",
    "facebook_url", "instagram_url", "tiktok_url", "twitter_url",
    "free_shipping_threshold", "currency", "currency_symbol",
    "maintenance_mode", "show_out_of_stock", "allow_order_notes",
    "google_analytics_id", "facebook_pixel_id",
  ]
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await store.from("site_settings").update(updates).eq("id", current.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

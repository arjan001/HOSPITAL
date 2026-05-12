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

router.get("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body
  const { data: current } = await supabase.from("site_settings").select("id").limit(1).single()
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

  const { error } = await supabase.from("site_settings").update(updates).eq("id", current.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

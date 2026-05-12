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
  const { data } = await supabase.from("hero_banners").select("*").order("sort_order", { ascending: true })
  res.json(data || [])
})

router.post("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body

  const { error } = await supabase.from("hero_banners").insert({
    title: body.title, subtitle: body.subtitle || null,
    image_url: body.imageUrl || null, button_link: body.buttonLink || "/shop",
    button_text: body.buttonText || "Shop Now",
    is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
  })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.put("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const body = req.body

  const { error } = await supabase.from("hero_banners").update({
    title: body.title, subtitle: body.subtitle || null,
    image_url: body.imageUrl || null, button_link: body.buttonLink || "/shop",
    button_text: body.buttonText || "Shop Now",
    is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
  }).eq("id", body.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })

  const { error } = await supabase.from("hero_banners").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

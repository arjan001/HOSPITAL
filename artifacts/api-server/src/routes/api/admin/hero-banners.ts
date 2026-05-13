import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/legacy-store.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (req, res) => {
  const store = createClient()
  const { data } = await store.from("hero_banners").select("*").order("sort_order", { ascending: true })
  res.json(data || [])
})

router.post("/", async (req, res) => {
  const store = createClient()
  const body = req.body

  const { error } = await store.from("hero_banners").insert({
    title: body.title, subtitle: body.subtitle || null,
    image_url: body.imageUrl || null, button_link: body.buttonLink || "/shop",
    button_text: body.buttonText || "Shop Now",
    is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
  })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.put("/", async (req, res) => {
  const store = createClient()
  const body = req.body

  const { error } = await store.from("hero_banners").update({
    title: body.title, subtitle: body.subtitle || null,
    image_url: body.imageUrl || null, button_link: body.buttonLink || "/shop",
    button_text: body.buttonText || "Shop Now",
    is_active: body.isActive ?? true, sort_order: body.sortOrder || 0,
  }).eq("id", body.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  const store = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })

  const { error } = await store.from("hero_banners").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

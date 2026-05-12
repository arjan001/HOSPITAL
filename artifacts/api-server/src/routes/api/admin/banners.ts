import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/supabase.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (req, res) => {
  const supabase = createClient()

  const [bannersRes, navOffersRes, popupRes] = await Promise.all([
    supabase.from("banners").select("*").order("sort_order", { ascending: true }),
    supabase.from("navbar_offers").select("*").order("sort_order", { ascending: true }),
    supabase.from("popup_offers").select("*").order("created_at", { ascending: false }),
  ])

  res.json({
    banners: bannersRes.data || [],
    navbarOffers: navOffersRes.data || [],
    popupOffers: popupRes.data || [],
  })
})

router.post("/", async (req, res) => {
  const supabase = createClient()
  const body = req.body
  const type = body.type || "banner"

  if (type === "navbar_offer") {
    const { data, error } = await supabase
      .from("navbar_offers")
      .insert({ text: body.text, is_active: body.isActive ?? true, sort_order: body.sortOrder || 0 })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  if (type === "popup_offer") {
    const { data, error } = await supabase
      .from("popup_offers")
      .insert({
        title: body.title, description: body.description || "",
        discount_label: body.discountLabel || "", image_url: body.imageUrl || null,
        is_active: body.isActive ?? true, valid_until: body.validUntil || null,
      })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  const { data, error } = await supabase
    .from("banners")
    .insert({
      title: body.title, subtitle: body.subtitle || "",
      image_url: body.imageUrl || null, link: body.link || "/shop",
      position: body.position || "mid-page", is_active: body.isActive ?? true,
      sort_order: body.sortOrder || 0,
    })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.put("/", async (req, res) => {
  const supabase = createClient()
  const body = req.body
  const type = body.type || "banner"

  if (type === "navbar_offer") {
    const { error } = await supabase
      .from("navbar_offers")
      .update({ text: body.text, is_active: body.isActive ?? true, sort_order: body.sortOrder || 0 })
      .eq("id", body.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  if (type === "popup_offer") {
    const { error } = await supabase
      .from("popup_offers")
      .update({
        title: body.title, description: body.description || "",
        discount_label: body.discountLabel || "", image_url: body.imageUrl || null,
        is_active: body.isActive ?? true, valid_until: body.validUntil || null,
      })
      .eq("id", body.id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  const { error } = await supabase
    .from("banners")
    .update({
      title: body.title, subtitle: body.subtitle || "",
      image_url: body.imageUrl || null, link: body.link || "/shop",
      position: body.position || "mid-page", is_active: body.isActive ?? true,
      sort_order: body.sortOrder || 0,
    })
    .eq("id", body.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

router.delete("/", async (req, res) => {
  const supabase = createClient()
  const id = req.query.id as string
  const type = req.query.type as string || "banner"

  if (!id) return res.status(400).json({ error: "Missing ID" })

  const table = type === "navbar_offer" ? "navbar_offers" : type === "popup_offer" ? "popup_offers" : "banners"
  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

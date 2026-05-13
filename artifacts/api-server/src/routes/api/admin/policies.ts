import { Router } from "express"
import { createAdminClient } from "../../../lib/legacy-store.js"
import { requireAdmin } from "../../../middlewares/admin-auth.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (_req, res) => {
  try {
    const store = createAdminClient()
    const { data, error } = await store.from("policies").select("*").order("title")
    if (error) return res.status(500).json({ error: error.message })
    res.json(data || [])
  } catch { res.status(500).json({ error: "Failed to fetch policies" }) }
})

router.post("/", async (req, res) => {
  try {
    const store = createAdminClient()
    const body = req.body
    const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const { data, error } = await store
      .from("policies")
      .insert({ title: body.title, slug, content: body.content || "" })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch { res.status(500).json({ error: "Failed to create policy" }) }
})

router.put("/", async (req, res) => {
  try {
    const store = createAdminClient()
    const body = req.body
    const { error } = await store
      .from("policies")
      .update({ title: body.title, content: body.content || "", updated_at: new Date().toISOString() })
      .eq("id", body.id)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  } catch { res.status(500).json({ error: "Failed to update policy" }) }
})

export default router

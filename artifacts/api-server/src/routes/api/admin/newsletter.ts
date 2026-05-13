import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/legacy-store.js"

const router = Router()
router.use(requireAdmin)

router.get("/", async (req, res) => {
  const store = createClient()
  const { data, error } = await store
    .from("newsletter_subscribers").select("*").order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.delete("/", async (req, res) => {
  const store = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })
  const { error } = await store.from("newsletter_subscribers").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

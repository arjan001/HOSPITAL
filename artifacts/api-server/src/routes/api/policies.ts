import { Router } from "express"
import { createAdminClient } from "../../lib/supabase.js"

const router = Router()

router.get("/", async (_req, res, next) => {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("policies").select("*").order("title")
    if (error) return res.status(500).json({ error: error.message })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get("/:slug", async (req, res, next) => {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("slug", req.params.slug)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: "Policy not found" })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router

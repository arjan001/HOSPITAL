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
  const { data, error } = await supabase
    .from("newsletter_subscribers").select("*").order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.delete("/", async (req, res) => {
  if (!await requireAuth(req, res)) return
  const supabase = createClient()
  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "Missing ID" })
  const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

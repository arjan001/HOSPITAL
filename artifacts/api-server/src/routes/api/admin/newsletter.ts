import { Router } from "express"
import { createClient } from "../../../lib/supabase.js"

const router = Router()

async function requireAuth(req: import("express").Request, res: import("express").Response) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false }
    const token = authHeader.slice(7)
    let supabase, admin
    try {
      supabase = (await import("../../../lib/supabase.js")).createClient()
      admin = (await import("../../../lib/supabase.js")).createAdminClient()
    } catch {
      res.status(503).json({ error: "Backend not configured" }); return false
    }
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) { res.status(401).json({ error: "Unauthorized" }); return false }
    const { data: row } = await admin.from("admin_users").select("role, is_active").eq("user_id", user.id).maybeSingle()
    const ROLES = new Set(["admin", "super_admin", "editor"])
    if (!row || row.is_active === false || !ROLES.has((row as { role?: string }).role || "")) {
      res.status(403).json({ error: "Forbidden" }); return false
    }
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

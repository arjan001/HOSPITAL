import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createAdminClient } from "../../../lib/legacy-store.js"

const router = Router()

router.get("/", requireAdmin, async (_req, res) => {
  let admin
  try { admin = createAdminClient() } catch { return res.status(503).json([]) }
  const { data, error } = await admin.from("admin_users").select("*").order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post("/", requireAdmin, async (req, res) => {
  let admin
  try { admin = createAdminClient() } catch { return res.status(503).json({ error: "Backend not configured" }) }
  const { email, role, display_name } = req.body || {}
  if (!email || !role) return res.status(400).json({ error: "email and role are required" })
  const { data, error } = await admin.from("admin_users").insert({ email, role, display_name, is_active: true }).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete("/", requireAdmin, async (req, res) => {
  const id = req.query.id as string | undefined
  if (!id) return res.status(400).json({ error: "id query param required" })
  let admin
  try { admin = createAdminClient() } catch { return res.status(503).json({ error: "Backend not configured" }) }
  const { error } = await admin.from("admin_users").delete().eq("id", id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

router.post("/invite", requireAdmin, async (req, res) => {
  let admin
  try { admin = createAdminClient() } catch { return res.status(503).json({ error: "Backend not configured" }) }
  const { email, role } = req.body || {}
  if (!email) return res.status(400).json({ error: "email is required" })
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: role || "viewer" },
  })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ user: data.user })
})

export default router

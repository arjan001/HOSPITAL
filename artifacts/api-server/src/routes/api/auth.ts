import { Router } from "express"
import { createAdminClient, createClient } from "../../lib/supabase.js"
import { rateLimit, rateLimitResponse, isValidEmail, sanitize, validatePassword } from "../../lib/security.js"

const router = Router()

// GET /api/auth/me — returns the current authenticated user (or null when not
// signed in / backend not configured).
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return res.json({ user: null })
  }
  const token = authHeader.slice(7)

  let supabase
  try {
    supabase = createClient()
  } catch {
    return res.status(503).json({ user: null, error: "Backend not configured" })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.json({ user: null })

  res.json({ user: { id: user.id, email: user.email ?? null } })
})

// POST /api/auth/login-guard — per-IP brute-force throttle invoked by the
// login form before attempting Supabase sign-in. Fails open so a client
// network blip does not lock anyone out.
router.post("/login-guard", async (req, res) => {
  const rl = rateLimit(req, { limit: 8, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  const email = sanitize(req.body?.email, 320).toLowerCase()
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: "Valid email required" })

  res.json({ ok: true })
})

// GET /api/auth/check-setup — used by the registration page to determine
// whether the very first admin has been created. When Supabase is not
// configured we return `hasAdmin: false` so the registration form is shown.
router.get("/check-setup", async (_req, res) => {
  let admin
  try {
    admin = createAdminClient()
  } catch {
    return res.json({ hasAdmin: false })
  }

  const { count, error } = await admin
    .from("admin_users")
    .select("id", { count: "exact", head: true })

  if (error) return res.json({ hasAdmin: false })
  res.json({ hasAdmin: (count ?? 0) > 0 })
})

// POST /api/auth/register — creates the first admin record after Supabase
// auth signup completes on the client. Subsequent admin invitations should
// flow through the protected `/api/admin/users` endpoint instead.
router.post("/register", async (req, res, next) => {
  const rl = rateLimit(req, { limit: 5, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  try {
    const email = sanitize(req.body?.email, 320).toLowerCase()
    const displayName = sanitize(req.body?.displayName, 120)
    const role = sanitize(req.body?.role, 20) || "admin"
    const password = req.body?.password

    if (!email || !isValidEmail(email)) return res.status(400).json({ error: "Valid email required" })
    if (!displayName) return res.status(400).json({ error: "Display name required" })
    const pwCheck = validatePassword(password)
    if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })

    const admin = createAdminClient()

    // Lock the endpoint after the first admin exists. Further admins must
    // be added through the authenticated `/api/admin/users` flow.
    const { count } = await admin.from("admin_users").select("id", { count: "exact", head: true })
    if ((count ?? 0) > 0) {
      return res.status(403).json({ error: "Admin setup already complete" })
    }

    // Look up the freshly-signed-up Supabase user by email.
    const { data: usersList, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) return res.status(500).json({ error: listErr.message })
    const authUser = usersList.users.find((u) => (u.email || "").toLowerCase() === email)
    if (!authUser) return res.status(404).json({ error: "Auth user not found — please sign up first" })

    const finalRole = (count ?? 0) === 0 ? "super_admin" : role
    const { data, error } = await admin
      .from("admin_users")
      .insert({
        user_id: authUser.id,
        email,
        display_name: displayName,
        role: finalRole,
        is_active: true,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ user: data })
  } catch (err) {
    next(err)
  }
})

export default router

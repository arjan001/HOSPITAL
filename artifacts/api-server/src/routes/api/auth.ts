import { Router } from "express"
import { rateLimit, rateLimitResponse, isValidEmail, sanitize, validatePassword } from "../../lib/security.js"

/**
 * Auth routes — Supabase has been removed. The admin panel uses a hardcoded
 * local "super_admin" identity (see admin-shell.tsx) and persists settings
 * through cmsStore. Customer auth will be reintroduced via Clerk later.
 *
 * These endpoints exist only so existing client calls don't 404. They are
 * intentionally inert: `/me` returns the local admin, password rotation
 * validates the input shape but cannot actually change anything (no auth
 * backend), and registration is permanently closed.
 */

const router = Router()

const LOCAL_ADMIN = {
  id: "local-admin",
  email: "admin@shaniidrx.local",
  display_name: "Admin",
  role: "super_admin",
}

router.get("/me", async (_req, res) => {
  res.json({ user: LOCAL_ADMIN })
})

router.post("/login-guard", async (req, res) => {
  const rl = rateLimit(req, { limit: 8, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  const email = sanitize(req.body?.email, 320).toLowerCase()
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: "Valid email required" })

  res.json({ ok: true })
})

router.get("/check-setup", async (_req, res) => {
  // Setup is "complete" — registration is closed for the local admin.
  res.json({ hasAdmin: true })
})

router.post("/register", async (_req, res) => {
  res.status(410).json({ error: "Admin registration is disabled in this build" })
})

router.post("/change-password", async (req, res) => {
  const rl = rateLimit(req, { limit: 5, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : ""
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : ""

  if (!currentPassword) return res.status(400).json({ error: "Current password is required" })
  const pwCheck = validatePassword(newPassword)
  if (!pwCheck.ok) return res.status(400).json({ error: pwCheck.error })
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "New password must be different from the current one" })
  }

  // No real auth backend — the UI shows a clear "validated locally" message
  // when `degraded: true` is returned.
  res.json({ ok: true, degraded: true })
})

export default router

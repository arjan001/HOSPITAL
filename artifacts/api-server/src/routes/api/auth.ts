import { Router } from "express"
import { createClient } from "../../lib/supabase.js"

const router = Router()

// GET /api/auth/me — returns the current authenticated user (or null when not
// signed in / backend not configured). Frontend admin screens depend on this.
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

  res.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  })
})

export default router

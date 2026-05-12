import { Router } from "express"
import { createClient } from "../../lib/supabase.js"
import { rateLimit, rateLimitResponse, sanitize, isValidEmail } from "../../lib/security.js"

const router = Router()

router.post("/", async (req, res, next) => {
  const rl = rateLimit(req, { limit: 3, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  try {
    const { email } = req.body
    const cleanEmail = sanitize(email, 320).toLowerCase()

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Valid email required" })
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: cleanEmail }, { onConflict: "email" })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router

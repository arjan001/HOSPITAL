import { Router } from "express"
import { createClient } from "../../lib/legacy-store.js"
import { rateLimit, rateLimitResponse, sanitize, isValidEmail } from "../../lib/security.js"

const router = Router()

router.post("/", async (req, res) => {
  const rl = rateLimit(req, { limit: 3, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  try {
    const { email } = req.body
    const cleanEmail = sanitize(email, 320).toLowerCase()

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Valid email required" })
    }

    try {
      const store = createClient()
      const { error } = await store
        .from("newsletter_subscribers")
        .upsert({ email: cleanEmail }, { onConflict: "email" })

      if (error) {
        console.warn("[api/newsletter] DB upsert error:", error.message)
      }
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      if (!/Backend disabled/i.test(msg)) {
        console.error("[api/newsletter] DB exception:", dbErr)
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error("[api/newsletter] exception:", err)
    res.status(500).json({ error: "Server error" })
  }
})

export default router

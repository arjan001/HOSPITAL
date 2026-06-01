import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { buildAnalytics, buildRealtime } from "../../../lib/analytics.js"

const router = Router()

/* Full analytics payload for the admin dashboard. `days` selects the window
   (default 30, clamped 1..365). Sales/revenue are computed client-side from the
   real api-nest orders source; this payload covers the visitor/traffic pipeline. */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Math.round(Number(req.query.days) || 30)))
    const payload = await buildAnalytics(days)
    res.json(payload)
  } catch (err) {
    res.status(500).json({ error: "Failed to build analytics", detail: err instanceof Error ? err.message : String(err) })
  }
})

router.get("/realtime", requireAdmin, async (_req, res) => {
  try {
    res.json(await buildRealtime())
  } catch {
    res.json({ activeVisitors: 0, recentEvents: [] })
  }
})

export default router

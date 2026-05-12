import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"

const router = Router()

// Stubs — real analytics is backed by Supabase + a tracking pipeline that
// hasn't been ported yet. Returns empty payloads so the admin Analytics
// dashboard renders without crashing.
router.get("/", requireAdmin, async (_req, res) => {
  res.json({
    totals: { revenue: 0, orders: 0, customers: 0, conversionRate: 0 },
    revenueByDay: [],
    topProducts: [],
    topCategories: [],
    trafficSources: [],
  })
})

router.get("/realtime", requireAdmin, async (_req, res) => {
  res.json({ activeVisitors: 0, recentEvents: [] })
})

export default router

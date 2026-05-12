import { Router } from "express"
import { getDeliveryLocations } from "../../lib/supabase-data.js"

const router = Router()

router.get("/", async (_req, res) => {
  try {
    const locations = await getDeliveryLocations()
    res.json(locations)
  } catch (error) {
    console.error("Failed to fetch delivery locations:", error)
    res.status(500).json({ error: "Failed to fetch delivery locations" })
  }
})

export default router

import { Router } from "express"
import { getCategories } from "../../lib/supabase-data.js"

const router = Router()

router.get("/", async (_req, res) => {
  try {
    const categories = await getCategories()
    res.json(categories)
  } catch (error) {
    console.error("Failed to fetch categories:", error)
    res.status(500).json({ error: "Failed to fetch categories" })
  }
})

export default router

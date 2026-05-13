import { Router } from "express"
import { getHeroBanners } from "../../lib/dev-fixtures.js"

const router = Router()

router.get("/", async (_req, res) => {
  try {
    const banners = await getHeroBanners()
    res.json(banners)
  } catch {
    res.status(500).json([])
  }
})

export default router

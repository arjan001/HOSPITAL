import { Router } from "express"
import { getNavbarOffers, getPopupOffer, getSiteSettings, getMidPageBanners } from "../../lib/supabase-data.js"

const router = Router()

router.get("/", async (_req, res) => {
  try {
    const [navbarOffers, popupOffer, settings, midPageBanners] = await Promise.all([
      getNavbarOffers(),
      getPopupOffer(),
      getSiteSettings(),
      getMidPageBanners(),
    ])
    res.json({ navbarOffers, popupOffer, settings, midPageBanners })
  } catch (error) {
    console.error("Failed to fetch site data:", error)
    res.status(500).json({ error: "Failed to fetch site data" })
  }
})

export default router

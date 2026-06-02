import { Router } from "express"
import { eq } from "drizzle-orm"
import { db, cmsDocs } from "@workspace/db"
import { getNavbarOffers, getPopupOffer, getSiteSettings, getMidPageBanners } from "../../lib/dev-fixtures.js"

const router = Router()

// Admin-managed store settings live in Postgres `cms_docs` under the key
// `store-settings` (written by the storefront admin via cmsStore → api-nest).
// We read it here and merge it OVER the fixture defaults so the storefront
// consumes the saved values. Fails soft to the fixtures on any DB error.
async function getStoreSettingsOverrides(): Promise<Record<string, unknown>> {
  try {
    const rows = await db.select().from(cmsDocs).where(eq(cmsDocs.key, "store-settings")).limit(1)
    const value = rows[0]?.value
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  } catch (error) {
    console.error("site-data: failed to read store-settings from cms_docs:", error)
  }
  return {}
}

router.get("/", async (_req, res) => {
  try {
    const [navbarOffers, popupOffer, baseSettings, midPageBanners, overrides] = await Promise.all([
      getNavbarOffers(),
      getPopupOffer(),
      getSiteSettings(),
      getMidPageBanners(),
      getStoreSettingsOverrides(),
    ])
    const settings = { ...baseSettings, ...overrides }
    res.json({ navbarOffers, popupOffer, settings, midPageBanners })
  } catch (error) {
    console.error("Failed to fetch site data:", error)
    res.status(500).json({ error: "Failed to fetch site data" })
  }
})

export default router

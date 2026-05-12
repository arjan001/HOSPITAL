import { getMidPageBanners, getNavbarOffers, getPopupOffer, getSiteSettings } from "@/lib/supabase-data"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const [navbarOffers, popupOffer, settings, midPageBanners] = await Promise.all([
      getNavbarOffers(),
      getPopupOffer(),
      getSiteSettings(),
      getMidPageBanners(),
    ])

    return NextResponse.json({ navbarOffers, popupOffer, settings, midPageBanners })
  } catch (error) {
    console.error("Failed to fetch site data:", error)
    return NextResponse.json({ error: "Failed to fetch site data" }, { status: 500 })
  }
}

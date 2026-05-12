import { CheckoutPage } from "@/components/store/checkout-page"
import type { Metadata } from "next"
import { PAGE_SEO, SITE_SEO } from "@/lib/seo-data"

const siteUrl = SITE_SEO.siteUrl

export const metadata: Metadata = {
  title: "Checkout | Her Kingdom",
  description: "Complete your Her Kingdom jewelry order. Secure checkout with M-Pesa and cash on delivery options.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Checkout | Her Kingdom",
    description: "Complete your Her Kingdom jewelry order.",
    url: `${siteUrl}/checkout`,
    siteName: "Her Kingdom",
    locale: "en_KE",
    type: "website",
    images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Checkout" }],
  },
  twitter: {
    card: "summary",
    site: "@herkingdom_jewelry",
    creator: "@herkingdom_jewelry",
    title: "Checkout | Her Kingdom",
    description: "Complete your Her Kingdom jewelry order.",
    images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom" }],
  },
}

export default function Page() {
  return <CheckoutPage />
}

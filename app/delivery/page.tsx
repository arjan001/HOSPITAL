import { DeliveryPage } from "@/components/store/delivery-page"
import type { Metadata } from "next"
import { SITE_SEO, PAGE_SEO, PAGE_KEYWORDS } from "@/lib/seo-data"

const siteUrl = SITE_SEO.siteUrl

export const metadata: Metadata = {
  title: PAGE_SEO.delivery.title,
  description: PAGE_SEO.delivery.description,
  alternates: { canonical: `${siteUrl}/delivery` },
  keywords: PAGE_KEYWORDS.delivery,
  authors: [{ name: "Her Kingdom", url: siteUrl }],
  creator: "Her Kingdom",
  openGraph: {
    title: PAGE_SEO.delivery.title,
    description: PAGE_SEO.delivery.description,
    url: `${siteUrl}/delivery`,
    type: "website",
    siteName: "Her Kingdom",
    locale: "en_KE",
    images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Delivery" }],
  },
  twitter: {
    card: "summary",
    site: "@herkingdom_jewelry",
    creator: "@herkingdom_jewelry",
    title: PAGE_SEO.delivery.title,
    description: PAGE_SEO.delivery.description,
    images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom Delivery" }],
  },
}

export default function Page() {
  return <DeliveryPage />
}

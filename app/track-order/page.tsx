import { Suspense } from "react"
import type { Metadata } from "next"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { TrackOrderForm } from "@/components/store/track-order-form"
import { PAGE_SEO, SITE_SEO, PAGE_KEYWORDS } from "@/lib/seo-data"

export const metadata: Metadata = {
  title: PAGE_SEO.trackOrder.title,
  description: PAGE_SEO.trackOrder.description,
  robots: { index: PAGE_SEO.trackOrder.noindex ? false : true, follow: true },
  alternates: { canonical: `${SITE_SEO.siteUrl}/track-order` },
  keywords: PAGE_KEYWORDS.trackOrder,
  openGraph: {
    title: PAGE_SEO.trackOrder.title,
    description: PAGE_SEO.trackOrder.description,
    url: `${SITE_SEO.siteUrl}/track-order`,
    type: "website",
    siteName: SITE_SEO.siteName,
    locale: "en_KE",
    images: [{ url: `${SITE_SEO.siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Order Tracking" }],
  },
  twitter: {
    card: "summary",
    title: PAGE_SEO.trackOrder.title,
    description: PAGE_SEO.trackOrder.description,
    creator: `@${SITE_SEO.twitter}`,
  },
}

export default function TrackOrderPage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-balance">
              Track My Order
            </h1>
            <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto leading-relaxed">
              Enter your order number or the phone number you used when placing your order to check the status.
            </p>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-8">Loading...</div>}>
            <TrackOrderForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}


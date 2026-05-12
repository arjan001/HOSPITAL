"use client"

import useSWR from "swr"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Hero } from "./hero"
import { FeaturedProducts } from "./featured-products"
import { OfferBanner } from "./offer-banner"
import { NewArrivals } from "./new-arrivals"
import { OnOfferProducts } from "./on-offer-products"
import { Newsletter } from "./newsletter"
import { FaqSection, type Faq } from "./faq-section"

import { Footer } from "./footer"
import { OfferModal } from "./offer-modal"
import { RecentPurchase } from "./recent-purchase"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LandingPage({ faqs }: { faqs?: Faq[] }) {
  const { data } = useSWR<{ settings?: { show_newsletter?: boolean } }>("/api/site-data", fetcher)
  const showNewsletter = data?.settings?.show_newsletter ?? true

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeaturedProducts />
        <OfferBanner />
        <NewArrivals />
        <OnOfferProducts />
        {faqs && faqs.length > 0 && <FaqSection faqs={faqs} />}
        {showNewsletter && <Newsletter />}
      </main>
      <Footer />
      <OfferModal />
      <RecentPurchase />
    </div>
  )
}

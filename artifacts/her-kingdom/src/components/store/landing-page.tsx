"use client"

import useSWR from "swr"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { CtaCarousel } from "./cta-carousel"
import { ExploreCategories } from "./explore-categories"
import { HealthCategories } from "./health-categories"
import { FeaturedProducts } from "./featured-products"
import { OfferBanner } from "./offer-banner"
import { OnOfferProducts } from "./on-offer-products"
import { HowToOrder } from "./how-to-order"
import { PopularProducts } from "./popular-products"
import { Newsletter } from "./newsletter"
import type { Faq } from "./faq-section"

import { Footer } from "./footer"
import { OfferModal } from "./offer-modal"
import { QuickViewProvider } from "@/lib/quick-view-context"
import { QuickViewModal } from "./quick-view-modal"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const DEFAULT_FAQS: Faq[] = [
  {
    q: "Do I need a prescription to order medications?",
    a: "Prescription-only medications require you to upload a valid prescription at checkout. Over-the-counter products can be ordered without one. Our licensed pharmacist will review every prescription order before it ships.",
  },
  {
    q: "How long does delivery take?",
    a: "Same-day delivery is available across Nairobi for orders placed before 4pm. Orders to the rest of Kenya are delivered within 1–3 business days via our courier partners.",
  },
  {
    q: "Are your products authentic?",
    a: "Yes. Every product on Shaniid RX is sourced directly from licensed manufacturers and approved local distributors. Storage and cold-chain handling follow Pharmacy and Poisons Board guidelines.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept M-Pesa, all major debit and credit cards, and cash on delivery for orders within Nairobi.",
  },
  {
    q: "Can I return a product if I change my mind?",
    a: "For safety reasons, opened medications, supplements and personal-care products cannot be returned. Sealed medical devices can be returned within 7 days of delivery in their original packaging.",
  },
  {
    q: "Do you offer prescription refills?",
    a: "Yes. Upload your existing prescription once and we'll keep it on file for easy refills. We'll also send you a reminder when it's time to reorder.",
  },
]

export function LandingPage({ faqs = DEFAULT_FAQS }: { faqs?: Faq[] }) {
  const { data } = useSWR<{ settings?: { show_newsletter?: boolean } }>("/api/site-data", fetcher)
  const showNewsletter = data?.settings?.show_newsletter ?? true

  return (
    <QuickViewProvider>
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Navbar />
        <main className="flex-1">
          <CtaCarousel />
          <ExploreCategories />
          <HealthCategories />
          <FeaturedProducts />
          <OfferBanner />
          <OnOfferProducts />
          <HowToOrder />
          <PopularProducts />
          {/* Newsletter / "Stay Updated" hidden for now — kept for later use */}
          {false && showNewsletter && <Newsletter />}
        </main>
        <Footer />
        <OfferModal />
        <QuickViewModal />
      </div>
    </QuickViewProvider>
  )
}

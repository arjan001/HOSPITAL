import { useEffect, useState } from "react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { ChevronDown, MessageCircle, Phone, Mail } from "lucide-react"
import { Link } from "wouter"
import { useStoreContact } from "@/hooks/use-store-contact"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BORDER = "#F2DCC8"

const FALLBACK_FAQS = [
  { q: "How do I order medicines from Shaniid RX?", a: "Browse our shop, add items to your cart, and proceed to checkout. You can pay via M-PESA, Visa, Mastercard, or Equity Bank. For prescription medicines, upload your prescription during checkout." },
  { q: "Do you require a prescription for all medicines?", a: "No. Most OTC (over-the-counter) medicines are available without a prescription. Prescription-only medicines require a valid prescription from a licensed healthcare provider, which you can upload via our website or WhatsApp." },
  { q: "How fast will my order be delivered?", a: "We offer same-day delivery within Nairobi (orders placed before 2 PM) and 2–5 business day delivery to other counties across Kenya via our partner couriers." },
  { q: "Can I speak to a pharmacist before ordering?", a: "Yes! Click 'Speak to a Doctor' on our website or call/WhatsApp our pharmacy line. Our licensed pharmacists are available 8 AM – 10 PM, 7 days a week." },
  { q: "How do I track my order?", a: "Once your order is dispatched, you'll receive an SMS with a tracking link. You can also use the 'Track My Order' page on our website by entering your order number." },
  { q: "What is your return and refund policy?", a: "We accept returns within 7 days for sealed, unopened items. Prescription medicines and cold-chain products are non-returnable. Contact our support team to initiate a return." },
  { q: "Are your medicines genuine and regulated?", a: "Absolutely. Shaniid RX is licensed by the Pharmacy and Poisons Board of Kenya. All medicines are sourced directly from licensed manufacturers and distributors and verified for authenticity." },
  { q: "Do you offer care packs / subscription bundles?", a: "Yes! Our Care Packs are curated medication bundles for chronic and acute conditions (diabetes, hypertension, asthma, etc.). Visit our Care Packs page to explore and subscribe to monthly refill plans." },
  { q: "How do I upload a prescription?", a: "During checkout, you'll see an 'Upload Prescription' button. You can upload a photo or PDF of your prescription. Alternatively, send it via WhatsApp to our pharmacy team." },
  { q: "What payment methods do you accept?", a: "We accept M-PESA (Paybill & Till), Visa, Mastercard, American Express, JCB, Equity Bank, and Paystack online payments. All transactions are encrypted and secure." },
  { q: "Can I cancel my order?", a: "Orders can be cancelled within 1 hour of placement if not yet dispatched. Contact us immediately via WhatsApp or our support line. Orders already dispatched follow the returns process." },
  { q: "Do you deliver outside Nairobi?", a: "Yes — we deliver nationwide across Kenya via Sendy, G4S, and other courier partners. Delivery times and fees vary by location. Check our Delivery page for zone details." },
]

type Faq = { q: string; a: string }

function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div
      className="rounded-2xl overflow-hidden divide-y"
      style={{ border: `1px solid ${PEACH_BORDER}`, divideColor: PEACH_BORDER } as React.CSSProperties}
    >
      {faqs.map((faq, i) => {
        const isOpen = open === i
        return (
          <div key={i} style={{ borderColor: PEACH_BORDER }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-start justify-between gap-4 text-left px-5 py-4 transition-colors hover:bg-[#FFF6EE]"
            >
              <span className="font-semibold text-sm lg:text-base leading-snug" style={{ color: WINE }}>
                {faq.q}
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                style={{ color: ACCENT_RED }}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: WINE_SOFT }}>
                {faq.a}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function FaqPage() {
  const { phoneHref, phoneDisplay, waHref } = useStoreContact()
  const [faqs, setFaqs] = useState<Faq[]>(FALLBACK_FAQS)

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.faqs) && data.faqs.length > 0) setFaqs(data.faqs)
        else if (Array.isArray(data) && data.length > 0) setFaqs(data)
      })
      .catch(() => {})
  }, [])

  const categories = [
    { label: "Ordering & Checkout", items: faqs.slice(0, 3) },
    { label: "Prescriptions", items: faqs.slice(3, 5) },
    { label: "Delivery & Tracking", items: faqs.slice(5, 7) },
    { label: "Payments & Returns", items: faqs.slice(7, 9) },
    { label: "Products & Safety", items: faqs.slice(9) },
  ].filter((c) => c.items.length > 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(115deg, #FCE3CB 0%, #F8CDB1 50%, #F1B59A 100%)",
          }}
        >
          <div className="mx-auto max-w-4xl px-4 py-14 lg:py-20 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT_RED }}>
              Help Centre
            </p>
            <h1
              className="text-4xl lg:text-6xl font-black leading-tight"
              style={{ color: WINE, textShadow: "0 1px 0 rgba(255,255,255,0.4)" }}
            >
              Frequently Asked<br />Questions
            </h1>
            <p className="mt-4 text-sm lg:text-base max-w-xl mx-auto" style={{ color: WINE_SOFT }}>
              Everything you need to know about Shaniid RX — ordering, delivery, prescriptions and more.
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="mx-auto max-w-4xl px-4 py-10 lg:py-14">
          {/* Category sections */}
          <div className="space-y-10">
            {categories.map((cat) => (
              <section key={cat.label}>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-lg font-bold" style={{ color: WINE }}>{cat.label}</h2>
                  <div className="flex-1 h-px" style={{ background: PEACH_BORDER }} />
                </div>
                <FaqAccordion faqs={cat.items} />
              </section>
            ))}
          </div>

          {/* Still have questions */}
          <div
            className="mt-14 rounded-3xl p-8 lg:p-10 text-center"
            style={{
              background: "linear-gradient(135deg, #FEF0E4 0%, #FAE2CC 100%)",
              border: `1px solid ${PEACH_BORDER}`,
            }}
          >
            <h2 className="text-2xl font-bold mb-2" style={{ color: WINE }}>Still have questions?</h2>
            <p className="text-sm mb-6" style={{ color: WINE_SOFT }}>
              Our pharmacists are available 8 AM – 10 PM, 7 days a week.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 h-11 rounded-full font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Us
              </a>
              <a
                href={phoneHref}
                className="inline-flex items-center gap-2 px-6 h-11 rounded-full font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
              >
                <Phone className="h-4 w-4" />
                {phoneDisplay}
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 h-11 rounded-full font-semibold text-sm transition-colors"
                style={{ background: "white", color: WINE, border: `1.5px solid ${PEACH_BORDER}` }}
              >
                <Mail className="h-4 w-4" />
                Email Us
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

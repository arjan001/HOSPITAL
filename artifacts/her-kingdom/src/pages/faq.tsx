import { useEffect, useState } from "react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { ChevronDown, Truck, ShoppingCart, FileText, CreditCard, Heart, RotateCcw, MessageCircle, Phone, HelpCircle } from "lucide-react"
import { Link } from "wouter"
import { useStoreContact } from "@/hooks/use-store-contact"

const WINE        = "#3D0814"
const WINE_SOFT   = "#6B0F1A"
const ACCENT_RED  = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM       = "#FFFBF5"
const PEACH_BORDER= "#F2DCC8"

type Faq = { q: string; a: string }

const ALL_FAQS: Record<string, Faq[]> = {
  delivery: [
    { q: "How fast will my order be delivered?", a: "We offer same-day delivery within Nairobi for orders placed before 2 PM, and 2–5 business day delivery to other counties across Kenya via our partner couriers." },
    { q: "How do I track my order?", a: "Once your order is dispatched, you'll receive an SMS with a tracking link. You can also use the 'Track My Order' page on our website by entering your order number." },
    { q: "Do you deliver outside Nairobi?", a: "Yes — we deliver nationwide across Kenya via Sendy, G4S, and other courier partners. Delivery times and fees vary by location. Check our Delivery page for full zone details." },
    { q: "How much does delivery cost?", a: "Express same-day delivery within Nairobi costs KSh 250–300. Standard delivery to other counties costs KSh 100–150. Orders above KSh 5,000 get FREE delivery." },
    { q: "Can I send someone to collect my order on my behalf?", a: "Yes. Let us know at the time of ordering and provide their name and ID number. They'll need to show ID on collection." },
    { q: "How long does delivery take after ordering?", a: "Same-day delivery within Nairobi (orders before 2 PM). Upcountry delivery takes 2–5 business days depending on your location." },
  ],
  ordering: [
    { q: "How do I order medicines from Shaniid RX?", a: "Browse our shop, add items to your cart, and proceed to checkout. You can pay via M-PESA, Visa, Mastercard, or Equity Bank." },
    { q: "Can I cancel my order?", a: "Orders can be cancelled within 1 hour of placement if not yet dispatched. Contact us immediately via WhatsApp or our support line." },
    { q: "Can I speak to a pharmacist before ordering?", a: "Yes! Click 'Speak to a Doctor' on our website or call/WhatsApp our pharmacy line. Our licensed pharmacists are available 8 AM – 10 PM, 7 days a week." },
    { q: "Do you offer care packs / subscription bundles?", a: "Yes! Our Care Packs are curated medication bundles for chronic and acute conditions (diabetes, hypertension, asthma, etc.). Visit our Care Packs page to subscribe." },
  ],
  prescriptions: [
    { q: "Do you require a prescription for all medicines?", a: "No. Most OTC (over-the-counter) medicines are available without a prescription. Prescription-only medicines require a valid prescription from a licensed healthcare provider." },
    { q: "How do I upload a prescription?", a: "During checkout, you'll see an 'Upload Prescription' button. You can upload a photo or PDF of your prescription. Alternatively, send it via WhatsApp to our pharmacy team." },
    { q: "Do you keep my prescription on file for refills?", a: "Yes. Upload your prescription once and we'll keep it on file for easy one-tap reorders. We'll also send you a reminder when it's time to refill." },
  ],
  payments: [
    { q: "What payment methods do you accept?", a: "We accept M-PESA (Paybill & Till), Visa, Mastercard, American Express, JCB, Equity Bank, and Paystack online payments. All transactions are encrypted and secure." },
    { q: "What is your return and refund policy?", a: "We accept returns within 7 days for sealed, unopened items. Prescription medicines and cold-chain products are non-returnable. Contact our support team to initiate a return." },
    { q: "Is it safe to pay online on Shaniid RX?", a: "Absolutely. All payments are processed via PCI-DSS compliant payment gateways. We use 256-bit SSL encryption and never store your card details." },
  ],
  health: [
    { q: "Are your medicines genuine and regulated?", a: "Yes. Shaniid RX is licensed by the Pharmacy and Poisons Board of Kenya. All medicines are sourced directly from licensed manufacturers and verified for authenticity." },
    { q: "Can I get health advice from your pharmacists?", a: "Yes! Our licensed pharmacists are available 8 AM – 10 PM, 7 days a week via WhatsApp, phone, or our online chat. They can advise on dosage, interactions, and alternatives." },
    { q: "Do you stock cold-chain / refrigerated medicines?", a: "Yes. We maintain proper cold-chain storage and delivery for temperature-sensitive medicines such as insulin and certain vaccines." },
  ],
}

const CATEGORIES = [
  { id: "delivery",      label: "Delivery",         icon: Truck },
  { id: "ordering",      label: "How It Works",      icon: ShoppingCart },
  { id: "prescriptions", label: "Prescriptions",     icon: FileText },
  { id: "payments",      label: "Returns & Payments",icon: CreditCard },
  { id: "health",        label: "Health Advice",     icon: Heart },
]

function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y" style={{ borderColor: PEACH_BORDER }}>
      {faqs.map((faq, i) => {
        const isOpen = open === i
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 text-left px-0 py-4 transition-colors group"
            >
              <span
                className="font-semibold text-sm lg:text-base leading-snug group-hover:underline"
                style={{ color: isOpen ? ACCENT_RED : WINE }}
              >
                {faq.q}
              </span>
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full grid place-items-center transition-all"
                style={{
                  background: isOpen ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` : "#FFF1E2",
                  color: isOpen ? "white" : ACCENT_RED,
                }}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            {isOpen && (
              <div
                className="pb-5 text-sm leading-relaxed pl-0 pr-8"
                style={{ color: WINE_SOFT }}
              >
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
  const [activeCategory, setActiveCategory] = useState("delivery")
  const [apiLoaded, setApiLoaded] = useState(false)

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setApiLoaded(true) })
      .catch(() => {})
  }, [])

  const faqs = ALL_FAQS[activeCategory] ?? []

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">

        {/* ── Hero ── */}
        <div className="text-center px-4 pt-14 pb-10" style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0E0 100%)" }}>
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT_RED }}>
            Help Centre
          </p>
          <h1
            className="text-4xl lg:text-5xl font-black leading-tight max-w-2xl mx-auto"
            style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
          >
            What can we help you find?
          </h1>
          <p className="mt-3 text-sm lg:text-base max-w-lg mx-auto" style={{ color: WINE_SOFT }}>
            Welcome to the Shaniid RX Help Centre where we have answered the questions our customers ask us the most.
          </p>
        </div>

        {/* ── Category icon chips ── */}
        <div
          className="sticky top-0 z-20 border-b"
          style={{ background: "white", borderColor: PEACH_BORDER }}
        >
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-3 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl transition-all flex-shrink-0 min-w-[90px] sm:min-w-[110px]"
                    style={{
                      background: isActive ? "#FFF1E2" : "transparent",
                      border: `1.5px solid ${isActive ? PEACH_BORDER : "transparent"}`,
                      color: isActive ? WINE : "#9CA3AF",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`
                          : "#F3F4F6",
                      }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: isActive ? "white" : "#9CA3AF" }}
                        strokeWidth={1.8}
                      />
                    </div>
                    <span
                      className="text-[11px] sm:text-xs font-semibold text-center leading-tight"
                      style={{ color: isActive ? WINE : "#9CA3AF" }}
                    >
                      {cat.label}
                    </span>
                    {isActive && (
                      <div
                        className="w-5 h-0.5 rounded-full"
                        style={{ background: `linear-gradient(90deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── FAQ accordion panel ── */}
        <div className="mx-auto max-w-5xl px-4 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Left: section header */}
            <div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                  boxShadow: "0 10px 26px -10px rgba(185,28,28,0.45)",
                }}
              >
                {(() => {
                  const cat = CATEGORIES.find((c) => c.id === activeCategory)
                  const Icon = cat?.icon ?? HelpCircle
                  return <Icon className="h-7 w-7 text-white" strokeWidth={1.8} />
                })()}
              </div>
              <h2
                className="text-2xl font-extrabold mb-2"
                style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
              >
                {CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: WINE_SOFT }}>
                {faqs.length} question{faqs.length !== 1 ? "s" : ""} in this section.
              </p>

              {/* Quick contact sidebar */}
              <div className="mt-8 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: WINE_SOFT }}>
                  Still need help?
                </p>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 h-11 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02] w-full"
                  style={{ background: "#25D366" }}
                >
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                  Chat with us
                </a>
                <a
                  href={phoneHref}
                  className="flex items-center gap-3 px-4 h-11 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] w-full"
                  style={{
                    background: "#FFF1E2",
                    border: `1px solid ${PEACH_BORDER}`,
                    color: WINE,
                  }}
                >
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: ACCENT_RED }} />
                  {phoneDisplay}
                </a>
              </div>
            </div>

            {/* Right: accordion */}
            <div
              className="lg:col-span-2 rounded-2xl px-6 py-2"
              style={{
                background: "white",
                border: `1px solid ${PEACH_BORDER}`,
                boxShadow: "0 8px 28px -16px rgba(61,8,20,0.14)",
              }}
            >
              <FaqAccordion faqs={faqs} />
            </div>
          </div>

          {/* ── Bottom CTA row ── */}
          <div
            className="mt-14 rounded-3xl p-8 lg:p-10"
            style={{
              background: "linear-gradient(135deg, #FEF0E4 0%, #FAE2CC 100%)",
              border: `1px solid ${PEACH_BORDER}`,
            }}
          >
            <h2 className="text-xl font-extrabold mb-1 text-center" style={{ color: WINE }}>
              Still have questions?
            </h2>
            <p className="text-sm text-center mb-8" style={{ color: WINE_SOFT }}>
              Our pharmacists are available 8 AM – 10 PM, 7 days a week.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  ),
                  label: "Send a message",
                  href: "mailto:support@shaniid.co.ke",
                  bg: WINE,
                  external: false,
                },
                {
                  icon: (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                  ),
                  label: "Chat with us",
                  href: waHref,
                  bg: "#25D366",
                  external: true,
                },
                {
                  icon: <Heart className="h-5 w-5" />,
                  label: "Health & Advice",
                  href: "/services",
                  bg: ACCENT_RED,
                  external: false,
                },
                {
                  icon: <Phone className="h-5 w-5" />,
                  label: "Call Us",
                  href: phoneHref,
                  bg: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                  external: false,
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl text-white font-semibold text-sm text-center transition-transform hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: item.bg }}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

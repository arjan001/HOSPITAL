import { useMemo, useState } from "react"
import { Link } from "wouter"
import { ChevronRight, Search, Plus, Minus } from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useStoreContact } from "@/hooks/use-store-contact"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

const BRAND = "#3D0814"

type Faq = { q: string; a: string }
type Category = { id: string; label: string; description: string }

const CATEGORIES: Category[] = [
  { id: "delivery",      label: "Delivery",                 description: "Timing, zones, fees and tracking." },
  { id: "ordering",      label: "Ordering & Account",       description: "Placing, changing and cancelling orders." },
  { id: "prescriptions", label: "Prescriptions",            description: "Uploading, refills and validity." },
  { id: "payments",      label: "Payments & Returns",       description: "Accepted methods and refund timelines." },
  { id: "health",        label: "Health & Safety",          description: "Cold-chain, advice and authenticity." },
]

const ALL_FAQS: Record<string, Faq[]> = {
  delivery: [
    { q: "How fast will my order be delivered?", a: "We offer same-day delivery within Nairobi for orders placed before 2 PM, and 2–5 business day delivery to other counties across Kenya via our partner couriers." },
    { q: "How do I track my order?", a: "Once your order is dispatched, you will receive an SMS with a tracking link. You can also use the Track My Order page on our website by entering your order number." },
    { q: "Do you deliver outside Nairobi?", a: "Yes — we deliver nationwide across Kenya via Sendy, G4S and other courier partners. Delivery times and fees vary by location. See the Delivery page for full zone details." },
    { q: "How much does delivery cost?", a: "Express same-day delivery within Nairobi costs KSh 250–300. Standard delivery to other counties costs KSh 100–150. Orders above KSh 5,000 receive free delivery." },
    { q: "Can someone collect my order on my behalf?", a: "Yes. Let us know at the time of ordering and provide their name and ID number. They will need to show ID on collection." },
    { q: "How long does delivery take after I order?", a: "Same-day delivery within Nairobi for orders placed before 2 PM. Upcountry delivery takes 2–5 business days depending on your location." },
  ],
  ordering: [
    { q: "How do I place an order on Shaniid RX?", a: "Browse the shop, add items to your cart, and proceed to checkout. You can pay via M-PESA, Visa, Mastercard, Equity Bank or cash on delivery in supported areas." },
    { q: "Can I cancel my order?", a: "Orders can be cancelled within one hour of placement provided they have not yet been dispatched. Contact us immediately via WhatsApp or our support line." },
    { q: "Can I speak to a pharmacist before ordering?", a: "Yes. Choose Speak to a Doctor on our website or call our pharmacy line. Our licensed pharmacists are available 8 AM – 10 PM, seven days a week." },
    { q: "Do you offer care packs and subscription bundles?", a: "Yes. Our Care Packs are curated medication bundles for chronic and acute conditions (diabetes, hypertension, asthma and more). Visit the Care Packs page to subscribe." },
  ],
  prescriptions: [
    { q: "Do you require a prescription for every medicine?", a: "No. Most over-the-counter (OTC) medicines are available without a prescription. Prescription-only medicines require a valid prescription from a licensed healthcare provider." },
    { q: "How do I upload a prescription?", a: "At checkout you will see an Upload Prescription button. You can upload a photo or PDF of your prescription, or send it via WhatsApp to our pharmacy team." },
    { q: "Do you keep my prescription on file for refills?", a: "Yes. Upload your prescription once and we will keep it on file for easy one-tap reorders. We will also send you a reminder when it is time to refill." },
  ],
  payments: [
    { q: "What payment methods do you accept?", a: "We accept M-PESA (Paybill and Till), Visa, Mastercard, American Express, JCB, Equity Bank and Paystack online payments. All transactions are encrypted and secure." },
    { q: "What is your return and refund policy?", a: "We accept returns within 7 days for sealed, unopened items. Prescription medicines and cold-chain products are non-returnable. Contact our support team to initiate a return." },
    { q: "Is it safe to pay online on Shaniid RX?", a: "Yes. All payments are processed via PCI-DSS compliant payment gateways. We use 256-bit SSL encryption and never store your card details." },
  ],
  health: [
    { q: "Are your medicines genuine and regulated?", a: "Yes. Shaniid RX is licensed by the Pharmacy and Poisons Board of Kenya. All medicines are sourced directly from licensed manufacturers and verified for authenticity." },
    { q: "Can I get health advice from your pharmacists?", a: "Yes. Our licensed pharmacists are available 8 AM – 10 PM, seven days a week via WhatsApp, phone or our online chat. They can advise on dosage, interactions and alternatives." },
    { q: "Do you stock cold-chain medicines?", a: "Yes. We maintain proper cold-chain storage and delivery for temperature-sensitive medicines such as insulin and certain vaccines." },
  ],
}

export default function FaqPage() {
  const { phoneHref, phoneDisplay } = useStoreContact()
  const [activeCategory, setActiveCategory] = useState<string>("delivery")
  const [query, setQuery] = useState("")

  const visibleFaqs: { category: Category; faq: Faq }[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      const cat = CATEGORIES.find(c => c.id === activeCategory)
      if (!cat) return []
      return (ALL_FAQS[activeCategory] || []).map(faq => ({ category: cat, faq }))
    }
    const out: { category: Category; faq: Faq }[] = []
    for (const cat of CATEGORIES) {
      for (const faq of ALL_FAQS[cat.id] || []) {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          out.push({ category: cat, faq })
        }
      }
    }
    return out
  }, [activeCategory, query])

  const totalAnswers = useMemo(
    () => Object.values(ALL_FAQS).reduce((s, list) => s + list.length, 0),
    [],
  )

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Seo
        title="Frequently Asked Questions"
        description="Clear answers about Shaniid RX deliveries, prescriptions, payments, consultations and product authenticity. Calm, straightforward pharmacy guidance."
        keywords={["Shaniid RX FAQ","pharmacy questions Kenya","medicine delivery help","prescription upload"]}
        canonicalPath="/faq"
        jsonLd={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }])}
      />
      <TopBar />
      <Navbar />

      <main className="flex-1 bg-white">
        {/* Header */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-10 pb-8">
            <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6">
              <Link href="/" className="hover:text-neutral-900">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-neutral-900 font-medium">Help Centre</span>
            </nav>

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Help Centre
            </p>
            <h1
              className="font-serif text-3xl lg:text-4xl font-semibold leading-tight"
              style={{ color: BRAND, letterSpacing: "-0.01em" }}
            >
              Frequently asked questions
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 max-w-2xl">
              {totalAnswers} answers about ordering, prescriptions, delivery and pharmacist care at Shaniid RX.
              Can&rsquo;t find what you need? Email{" "}
              <a href="mailto:support@shaniidrx.co.ke" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                support@shaniidrx.co.ke
              </a>{" "}
              or call{" "}
              <a href={phoneHref} className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                {phoneDisplay}
              </a>.
            </p>

            {/* Search */}
            <div className="mt-6 relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions and answers"
                aria-label="Search frequently asked questions"
                className="w-full h-11 pl-10 pr-3 rounded-md bg-white border border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto max-w-5xl px-4 lg:px-6 py-10 lg:py-14">
          <div className="grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-14">
            {/* Sidebar categories */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-3">
                Categories
              </p>
              <nav className="border-l border-neutral-200">
                {CATEGORIES.map((cat) => {
                  const isActive = !query && activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setActiveCategory(cat.id); setQuery("") }}
                      className={`block w-full text-left pl-4 -ml-px py-2 border-l text-sm transition-colors ${
                        isActive
                          ? "border-neutral-900 text-neutral-900 font-semibold"
                          : "border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-400"
                      }`}
                    >
                      {cat.label}
                      <span className="block text-[11px] text-neutral-400 mt-0.5 leading-tight">
                        {(ALL_FAQS[cat.id] || []).length} answers
                      </span>
                    </button>
                  )
                })}
              </nav>
            </aside>

            {/* Content */}
            <section className="min-w-0">
              {!query && (
                <div className="mb-6">
                  <h2 className="font-serif text-xl lg:text-2xl font-semibold text-neutral-900">
                    {CATEGORIES.find(c => c.id === activeCategory)?.label}
                  </h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    {CATEGORIES.find(c => c.id === activeCategory)?.description}
                  </p>
                </div>
              )}

              {query && (
                <div className="mb-6">
                  <h2 className="font-serif text-xl lg:text-2xl font-semibold text-neutral-900">
                    Search results
                  </h2>
                  <p className="text-sm text-neutral-600 mt-1">
                    {visibleFaqs.length} answer{visibleFaqs.length !== 1 ? "s" : ""} match &ldquo;{query}&rdquo;.
                  </p>
                </div>
              )}

              {visibleFaqs.length === 0 ? (
                <p className="text-sm text-neutral-600 py-8">
                  No matching questions. Try a different search term or contact our team for help.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                  {visibleFaqs.map((entry, i) => (
                    <FaqItem
                      key={`${entry.faq.q}-${i}`}
                      faq={entry.faq}
                      categoryLabel={query ? entry.category.label : undefined}
                      defaultOpen={!query && i === 0}
                    />
                  ))}
                </ul>
              )}

              {/* Inline help line */}
              <div className="mt-12 pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-700">
                  Still need help?{" "}
                  <Link href="/contact" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                    Contact our pharmacy team
                  </Link>{" "}
                  &mdash; available 8 AM to 10 PM, seven days a week.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

let __faqPanelId = 0
function FaqItem({
  faq,
  categoryLabel,
  defaultOpen = false,
}: {
  faq: Faq
  categoryLabel?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [panelId] = useState(() => `faq-panel-${++__faqPanelId}`)
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      >
        <span className="min-w-0">
          {categoryLabel && (
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 mb-1">
              {categoryLabel}
            </span>
          )}
          <span className="block text-[15px] font-medium text-neutral-900 group-hover:text-black leading-snug">
            {faq.q}
          </span>
        </span>
        <span
          className="flex-shrink-0 w-7 h-7 rounded-md grid place-items-center border border-neutral-200 text-neutral-600 group-hover:border-neutral-400"
        >
          {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        hidden={!open}
        className="pb-6 pr-10 -mt-1 text-[15px] leading-relaxed text-neutral-600"
      >
        {faq.a}
      </div>
    </li>
  )
}


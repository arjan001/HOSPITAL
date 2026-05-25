"use client"

import { useState, useMemo, useRef } from "react"
import { Link } from "wouter"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import {
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Heart, ShoppingBag, Check,
  Activity, Stethoscope, Package2, Zap, Users, ShieldCheck, Cpu,
} from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { QuickViewProvider } from "@/lib/quick-view-context"
import { QuickViewModal } from "./quick-view-modal"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import type { Product } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const PEACH_BG = "#FFF6EE"
const CARD_PEACH = "linear-gradient(145deg, #FEF0E4 0%, #FAE2CC 100%)"
const GOLDEN = "#E8A44A"

type PackDef = {
  name: string
  description: string
  tags: RegExp
  slug: string
}

type Section = {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  packs: PackDef[]
}

const SECTIONS: Section[] = [
  {
    id: "chronic",
    label: "CHRONIC CARE PACKS",
    icon: Activity,
    packs: [
      { name: "Diabetes Care Packs", description: "A complete pack for reliable diabetes management.", tags: /diabet/i, slug: "diabetes-care" },
      { name: "Blood Pressure Care Packs", description: "Monitor and manage hypertension effectively.", tags: /blood.?pressure|hypertens/i, slug: "blood-pressure-care" },
      { name: "Asthma & Respiratory Packs", description: "Essential supplies for respiratory conditions.", tags: /asthma|respirat/i, slug: "asthma-care" },
      { name: "Kidney & Diabetes Care", description: "Dual-condition management pack.", tags: /kidney/i, slug: "kidney-care" },
      { name: "Arthritis Relief Pack", description: "Pain management for joint conditions.", tags: /arthritis|joint/i, slug: "arthritis-care" },
    ],
  },
  {
    id: "acute",
    label: "ACUTE & SHORT-TERM CARE PACKS",
    icon: Zap,
    packs: [
      { name: "Cold & Flu Pack", description: "Fast-relief essentials for colds and flu.", tags: /cold|flu/i, slug: "cold-flu" },
      { name: "Pain & Injury Pack", description: "Manage pain and support recovery.", tags: /pain|injury|wound/i, slug: "pain-injury" },
      { name: "Digestive Health Pack", description: "Ease stomach and gut discomfort.", tags: /digest|stomach|gut/i, slug: "digestive" },
      { name: "Infection Control Pack", description: "Antibiotics and antiseptic support.", tags: /infect|antibiotic|antisep/i, slug: "infection" },
      { name: "Wound Care Pack", description: "Sterile dressings and healing essentials.", tags: /wound|dressing|bandage/i, slug: "wound-care" },
    ],
  },
  {
    id: "family",
    label: "FAMILY & CAREGIVER PACKS",
    icon: Users,
    packs: [
      { name: "Family First Aid Pack", description: "Complete first aid for every household.", tags: /first.?aid|family/i, slug: "family-first-aid" },
      { name: "Elderly Care Pack", description: "Tailored essentials for senior wellness.", tags: /elderly|senior/i, slug: "elderly-care" },
      { name: "Child Care Essentials Pack", description: "Safe medicines for infants & toddlers.", tags: /child|infant|baby|toddler/i, slug: "child-care" },
      { name: "Home Care Pack", description: "Everything you need for home nursing.", tags: /home.?care|nursing/i, slug: "home-care" },
      { name: "Maternal Health Pack", description: "Pre & postnatal essentials for mothers.", tags: /maternal|pregnan|postnatal/i, slug: "maternal" },
    ],
  },
  {
    id: "wellness",
    label: "PREVENTIVE & WELLNESS PACKS",
    icon: ShieldCheck,
    packs: [
      { name: "Immunity Boost Pack", description: "Vitamins and supplements to strengthen immunity.", tags: /immun|vitamin.?c/i, slug: "immunity" },
      { name: "Men's Health Pack", description: "Targeted wellness support for men.", tags: /men.?s.?health|testosterone/i, slug: "mens-health" },
      { name: "Women's Health Pack", description: "Hormonal balance and feminine health.", tags: /women.?s.?health|hormonal/i, slug: "womens-health" },
      { name: "Nutrition Pack", description: "Essential vitamins and minerals pack.", tags: /nutrition|multivitamin/i, slug: "nutrition" },
      { name: "Weight Management Pack", description: "Safe, clinician-approved weight support.", tags: /weight|slim|fat.?burn/i, slug: "weight-management" },
    ],
  },
  {
    id: "devices",
    label: "DEVICES & MONITORING PACKS",
    icon: Cpu,
    packs: [
      { name: "Diabetes Monitoring Pack", description: "Glucometer and test strips bundle.", tags: /glucomet|glucose.?monitor/i, slug: "diabetes-monitor" },
      { name: "Blood Pressure Monitoring Pack", description: "Digital BP monitor + accessories.", tags: /bp.?monitor|blood.?pressure.?monitor/i, slug: "bp-monitor" },
      { name: "Pulse Oximetry Pack", description: "Oxygen saturation monitoring kit.", tags: /pulse.?ox|oximeter/i, slug: "pulse-ox" },
      { name: "Thermometer Pack", description: "Digital thermometer + fever strips.", tags: /thermometer|fever/i, slug: "thermometer" },
      { name: "Nebulizer Pack", description: "Nebulizer and medication starter set.", tags: /nebulizer/i, slug: "nebulizer" },
    ],
  },
]

const PACK_TYPE_FILTERS = [
  { id: "starter", label: "Starter Pack" },
  { id: "monthly", label: "Monthly Care Pack" },
  { id: "complete", label: "Complete Care" },
  { id: "monitoring", label: "Monitoring Pack" },
]

function findPackProduct(packDef: PackDef, products: Product[]): Product | null {
  const blob = (p: Product) => `${p.name} ${p.description} ${p.tags.join(" ")} ${p.category}`
  return products.find((p) => packDef.tags.test(blob(p))) ?? null
}

// ─── Pack Card ───────────────────────────────────────────────────────────────
function PackCard({ packDef, product }: { packDef: PackDef; product: Product | null }) {
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const [justAdded, setJustAdded] = useState(false)
  const [hover, setHover] = useState(false)
  const wishlisted = product ? isInWishlist(product.id) : false

  return (
    <div
      className="relative flex-shrink-0 w-48 lg:w-52 rounded-[20px] flex flex-col transition-transform hover:-translate-y-1"
      style={{
        background: CARD_PEACH,
        border: `1px solid ${PEACH_BORDER}`,
        boxShadow: "0 8px 22px -14px rgba(184,60,30,0.3)",
      }}
    >
      <Seo
        title="Care Packs — Curated Medicine Bundles"
        description="Thoughtfully curated medicine and wellness packs for families, chronic care and recovery. Verified ingredients, fair prices, delivered to your door."
        keywords={["care packs Kenya","medicine bundles","family health pack","chronic care pack","Shaniid RX"]}
        canonicalPath="/care-packs"
      />
      {/* Heart */}
      {product && (
        <button
          type="button"
          onClick={() => toggleItem(product)}
          className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 shadow-sm"
          style={{ border: `1px solid ${PEACH_BORDER}` }}
        >
          <Heart className="h-3.5 w-3.5" fill={wishlisted ? ACCENT_RED : "none"} style={{ color: ACCENT_RED }} />
        </button>
      )}

      {/* Image area */}
      <div className="p-3.5 pb-0">
        <Link href={product ? `/product/${product.slug}` : `/shop?tag=${packDef.slug}`}>
          <div
            className="w-full aspect-square rounded-[14px] flex items-center justify-center overflow-hidden"
            style={{ background: product ? "#FFF8F0" : `radial-gradient(circle, ${GOLDEN}88 0%, ${GOLDEN} 100%)` }}
          >
            {product?.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={packDef.name}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div
                className="w-[60%] h-[60%] rounded-xl"
                style={{ background: GOLDEN }}
              />
            )}
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="px-3.5 pt-3 pb-3.5 flex flex-col flex-1">
        <Link href={product ? `/product/${product.slug}` : `/shop?tag=${packDef.slug}`}>
          <h3 className="text-xs font-bold leading-snug line-clamp-2" style={{ color: WINE }}>
            {packDef.name}
          </h3>
        </Link>
        <p className="text-[11px] mt-1 leading-snug line-clamp-2" style={{ color: WINE_SOFT }}>
          {product?.description || packDef.description}
        </p>
        {product?.price && (
          <p className="text-xs font-bold mt-1" style={{ color: ACCENT_RED }}>
            KSh {product.price.toLocaleString()}
          </p>
        )}

        {/* Button */}
        {product ? (
          <button
            type="button"
            onClick={() => { addItem(product); setJustAdded(true); window.setTimeout(() => setJustAdded(false), 1400) }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="mt-auto pt-2.5 w-full flex items-center justify-center gap-1 h-8 rounded-full text-[11px] font-bold transition-all"
            style={
              justAdded
                ? { background: "#15803D", color: "white" }
                : hover
                  ? { background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`, color: "white" }
                  : { background: WINE, color: "white" }
            }
          >
            {justAdded ? <Check className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
            {justAdded ? "Added!" : "Add To Cart"}
          </button>
        ) : (
          <Link
            href={`/shop?tag=${packDef.slug}`}
            className="mt-auto pt-2.5 block w-full text-center h-8 leading-8 rounded-full text-[11px] font-bold transition-all"
            style={{ background: "#F2D4C4", color: WINE }}
          >
            Shop Now
          </Link>
        )}
      </div>
    </div>
  )
}

// ─── Section Row ─────────────────────────────────────────────────────────────
function PackSection({ section, products }: { section: Section; products: Product[] }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scroll = (dir: "l" | "r") => {
    if (!rowRef.current) return
    rowRef.current.scrollBy({ left: dir === "r" ? 220 : -220, behavior: "smooth" })
  }

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-sm lg:text-base font-black tracking-widest uppercase" style={{ color: WINE }}>
            {section.label}
          </h2>
          <div className="mt-1.5 flex gap-1.5">
            <div className="h-[3px] w-10 rounded-full" style={{ background: ACCENT_ORANGE }} />
            <div className="h-[3px] w-6 rounded-full" style={{ background: `${ACCENT_ORANGE}55` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll("l")}
            className="w-8 h-8 flex items-center justify-center rounded-full border transition-colors hover:bg-[#FFF1E6]"
            style={{ borderColor: PEACH_BORDER }}
          >
            <ChevronLeft className="h-4 w-4" style={{ color: WINE }} />
          </button>
          <button
            type="button"
            onClick={() => scroll("r")}
            className="w-8 h-8 flex items-center justify-center rounded-full border transition-colors hover:bg-[#FFF1E6]"
            style={{ borderColor: PEACH_BORDER }}
          >
            <ChevronRight className="h-4 w-4" style={{ color: WINE }} />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {section.packs.map((pack) => (
          <PackCard key={pack.slug} packDef={pack} product={findPackProduct(pack, products)} />
        ))}
      </div>
    </section>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function SidebarAccordion({ title, icon: Icon, children, defaultOpen = false }: {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 4px 14px -10px rgba(184,60,30,0.25)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[#FFF6EE] transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#FEF0E4" }}>
            <Icon className="h-3.5 w-3.5" style={{ color: ACCENT_RED }} />
          </span>
          <span className="text-sm font-semibold" style={{ color: WINE }}>{title}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 opacity-60" /> : <ChevronDown className="h-4 w-4 opacity-60" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function CarePacksInner() {
  const { data: productsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(productsData)

  const [selectedPackTypes, setSelectedPackTypes] = useState<string[]>([])
  const togglePackType = (id: string) =>
    setSelectedPackTypes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
          {/* Banner photo */}
          <img
            src="/care-pack-banner.png"
            alt="Care packs"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Gradient overlay — left-heavy so text is legible */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(100deg, rgba(61,8,20,0.82) 0%, rgba(61,8,20,0.55) 50%, rgba(61,8,20,0.15) 100%)",
            }}
          />
          {/* Content */}
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 flex items-center" style={{ minHeight: 280 }}>
            <div>
              <h1
                className="text-4xl lg:text-6xl font-black text-white leading-tight"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
              >
                Care Packs
              </h1>
              <p className="mt-3 text-sm lg:text-base max-w-md" style={{ color: "rgba(255,251,245,0.8)" }}>
                Curated medication bundles for chronic conditions, acute care, family wellness &amp; monitoring.
              </p>
            </div>
          </div>
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-10" style={{ background: "linear-gradient(to bottom, transparent, #ffffff)" }} />
        </div>

        {/* Body: sidebar + content */}
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">
          <div className="flex gap-6 lg:gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0 space-y-3">
              <SidebarAccordion title="Health Condition" icon={Activity} defaultOpen>
                <div className="space-y-1.5">
                  {["Diabetes", "Hypertension", "Asthma", "Arthritis", "Cardiac", "Kidney"].map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input type="checkbox" className="accent-[#B91C1C]" />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="Pack-Type" icon={Package2} defaultOpen>
                <div className="space-y-2">
                  {PACK_TYPE_FILTERS.map((f) => (
                    <label key={f.id} className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input
                        type="checkbox"
                        className="accent-[#B91C1C]"
                        checked={selectedPackTypes.includes(f.id)}
                        onChange={() => togglePackType(f.id)}
                      />
                      <span>{f.label}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="Prescription Required" icon={Stethoscope}>
                <div className="space-y-1.5">
                  {["Yes – Prescription needed", "No – OTC / No prescription"].map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input type="radio" name="rx" className="accent-[#B91C1C]" />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="Delivery Speed" icon={Zap}>
                <div className="space-y-1.5">
                  {["Same-day (Nairobi)", "Next-day", "2–5 days (Nationwide)"].map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input type="radio" name="delivery" className="accent-[#B91C1C]" />
                      <span className="text-xs">{o}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="Subscription" icon={ShieldCheck}>
                <div className="space-y-1.5">
                  {["One-Time Purchase", "Weekly", "Monthly Refill"].map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input type="radio" name="sub" className="accent-[#B91C1C]" />
                      <span className="text-xs">{o}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="Price" icon={Activity}>
                <div className="space-y-1.5">
                  {["Under KSh 500", "KSh 500 – 2,000", "KSh 2,000 – 5,000", "Above KSh 5,000"].map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input type="checkbox" className="accent-[#B91C1C]" />
                      <span className="text-xs">{o}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>

              <SidebarAccordion title="Discounts" icon={Activity}>
                <div className="space-y-1.5">
                  {["On Offer / Sale", "Bundle Deals", "Subscribe & Save"].map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: WINE }}>
                      <input type="checkbox" className="accent-[#B91C1C]" />
                      <span className="text-xs">{o}</span>
                    </label>
                  ))}
                </div>
              </SidebarAccordion>
            </aside>

            {/* Pack sections */}
            <div className="flex-1 min-w-0">
              {SECTIONS.map((section) => (
                <PackSection key={section.id} section={section} products={products} />
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export function CarePacksPage() {
  return (
    <QuickViewProvider>
      <CarePacksInner />
      <QuickViewModal />
    </QuickViewProvider>
  )
}

"use client"

/**
 * CarePackDetailPage — single care pack page with 3-tier pricing.
 * Route: /care-packs/:slug
 *
 * Assessment gate: if the user hasn't completed a care-pack assessment
 * (sessionStorage flag), a modal prompts them to do so first or skip.
 * After gate, three tiers are shown: Essential, Standard, Premium.
 */

import { useState, useMemo, useEffect } from "react"
import { Link, useRoute, useLocation } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import {
  ArrowLeft, ShieldCheck, CheckCircle2, ShoppingCart,
  ArrowRight, X, ClipboardList, Star, Pill,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart-context"
import type { Product } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

const WINE = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BG = "#FFF6EE"
const PEACH_BORDER = "#F2DCC8"
const CREAM = "#FFFBF5"

// ─── Pack definitions — must match care-packs-page.tsx ────────────────────

type PackDef = {
  name: string
  description: string
  tags: RegExp
  slug: string
  section: string
}

const ALL_PACKS: PackDef[] = [
  // Chronic
  { name: "Diabetes Care Packs", description: "A complete pack for reliable diabetes management.", tags: /diabet/i, slug: "diabetes-care", section: "chronic" },
  { name: "Blood Pressure Care Packs", description: "Monitor and manage hypertension effectively.", tags: /blood.?pressure|hypertens/i, slug: "blood-pressure-care", section: "chronic" },
  { name: "Asthma & Respiratory Packs", description: "Essential supplies for respiratory conditions.", tags: /asthma|respirat/i, slug: "asthma-care", section: "chronic" },
  { name: "Kidney & Diabetes Care", description: "Dual-condition management pack.", tags: /kidney/i, slug: "kidney-care", section: "chronic" },
  { name: "Arthritis Relief Pack", description: "Pain management for joint conditions.", tags: /arthritis|joint/i, slug: "arthritis-care", section: "chronic" },
  // Acute
  { name: "Cold & Flu Pack", description: "Fast-relief essentials for colds and flu.", tags: /cold|flu/i, slug: "cold-flu", section: "acute" },
  { name: "Pain & Injury Pack", description: "Manage pain and support recovery.", tags: /pain|injury|wound/i, slug: "pain-injury", section: "acute" },
  { name: "Digestive Health Pack", description: "Ease stomach and gut discomfort.", tags: /digest|stomach|gut/i, slug: "digestive", section: "acute" },
  { name: "Infection Control Pack", description: "Antibiotics and antiseptic support.", tags: /infect|antibiotic|antisep/i, slug: "infection", section: "acute" },
  { name: "Wound Care Pack", description: "Sterile dressings and healing essentials.", tags: /wound|dressing|bandage/i, slug: "wound-care", section: "acute" },
  // Family
  { name: "Family First Aid Pack", description: "Complete first aid for every household.", tags: /first.?aid|family/i, slug: "family-first-aid", section: "family" },
  { name: "Elderly Care Pack", description: "Tailored essentials for senior wellness.", tags: /elderly|senior/i, slug: "elderly-care", section: "family" },
  { name: "Child Care Essentials Pack", description: "Safe medicines for infants & toddlers.", tags: /child|infant|baby|toddler/i, slug: "child-care", section: "family" },
  { name: "Home Care Pack", description: "Everything you need for home nursing.", tags: /home.?care|nursing/i, slug: "home-care", section: "family" },
  { name: "Maternal Health Pack", description: "Pre & postnatal essentials for mothers.", tags: /maternal|pregnan|postnatal/i, slug: "maternal", section: "family" },
  // Wellness
  { name: "Immunity Boost Pack", description: "Vitamins and supplements to strengthen immunity.", tags: /immun|vitamin.?c/i, slug: "immunity", section: "wellness" },
  { name: "Men's Health Pack", description: "Targeted wellness support for men.", tags: /men.?s.?health|testosterone/i, slug: "mens-health", section: "wellness" },
  { name: "Women's Health Pack", description: "Hormonal balance and feminine health.", tags: /women.?s.?health|hormonal/i, slug: "womens-health", section: "wellness" },
  { name: "Nutrition Pack", description: "Essential vitamins and minerals pack.", tags: /nutrition|multivitamin/i, slug: "nutrition", section: "wellness" },
  { name: "Weight Management Pack", description: "Safe, clinician-approved weight support.", tags: /weight|slim|fat.?burn/i, slug: "weight-management", section: "wellness" },
  // Devices
  { name: "Diabetes Monitoring Pack", description: "Glucometer and test strips bundle.", tags: /glucomet|glucose.?monitor/i, slug: "diabetes-monitor", section: "devices" },
  { name: "Blood Pressure Monitoring Pack", description: "Digital BP monitor + accessories.", tags: /bp.?monitor|blood.?pressure.?monitor/i, slug: "bp-monitor", section: "devices" },
  { name: "Pulse Oximetry Pack", description: "Oxygen saturation monitoring kit.", tags: /pulse.?ox|oximeter/i, slug: "pulse-ox", section: "devices" },
  { name: "Thermometer Pack", description: "Digital thermometer + fever strips.", tags: /thermometer|fever/i, slug: "thermometer", section: "devices" },
  { name: "Nebulizer Pack", description: "Nebulizer and medication starter set.", tags: /nebulizer/i, slug: "nebulizer", section: "devices" },
]

// ─── Tier definitions ──────────────────────────────────────────────────────

type Tier = {
  id: "essential" | "standard" | "premium"
  label: string
  badge: string
  badgeColor: string
  priceKES: number
  supplyDuration: string
  tagline: string
  features: string[]
  highlight: boolean
}

function tiersForPack(pack: PackDef): Tier[] {
  const isDevice = pack.section === "devices"
  const isChronic = pack.section === "chronic"

  const base = isDevice ? 2800 : isChronic ? 1800 : 1500
  return [
    {
      id: "essential",
      label: "Essential",
      badge: "Starter",
      badgeColor: "#6B7280",
      priceKES: base,
      supplyDuration: "1-month supply",
      tagline: "Core medications to get started",
      features: [
        `Genuine ${pack.name} medications`,
        "Pharmacist-reviewed selection",
        "Standard dosage guidance leaflet",
        "Secure sealed packaging",
        "Free standard delivery",
      ],
      highlight: false,
    },
    {
      id: "standard",
      label: "Standard",
      badge: "Most Popular",
      badgeColor: ACCENT_RED,
      priceKES: Math.round(base * 1.85),
      supplyDuration: "1-month supply",
      tagline: "Full pack with monitoring support",
      features: [
        `Everything in Essential`,
        isDevice ? "Extended warranty included" : "Monitoring tool included",
        "Detailed care guide (printed)",
        "WhatsApp check-in (3×/month)",
        "Priority customer support",
        "Free express delivery",
      ],
      highlight: true,
    },
    {
      id: "premium",
      label: "Premium",
      badge: "Complete Care",
      badgeColor: WINE,
      priceKES: Math.round(base * 3.2),
      supplyDuration: "1-month supply",
      tagline: "Full pack + virtual consultation",
      features: [
        `Everything in Standard`,
        "1× virtual doctor consultation",
        "Personalised medication review",
        "Daily WhatsApp support",
        isDevice ? "Free replacement within 6 months" : "Adherence tracker app access",
        "Same-day delivery available",
      ],
      highlight: false,
    },
  ]
}

// Helper to resolve a tier image path. Falls back to placeholder when missing at runtime.
function tierImageFor(slug: string, tierId: Tier["id"]) {
  return `/images/care-packs/${slug}-${tierId}.jpg`
}

// ─── Assessment Gate Modal ────────────────────────────────────────────────

const ASSESSMENT_KEY = "shaniidrx.carepack.assessment_done"

function AssessmentGateModal({ packName, onComplete, onSkip }: {
  packName: string
  onComplete: () => void
  onSkip: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: PEACH_BG, border: `1px solid ${PEACH_BORDER}` }}
          >
            <ClipboardList className="h-5 w-5" style={{ color: ACCENT_RED }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: WINE }}>Care Pack Assessment</h2>
            <p className="text-xs text-muted-foreground">Get personalised recommendations</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-5 leading-relaxed">
          Take a short <strong>2-minute assessment</strong> so our pharmacist can verify this pack is right for you — and personalise the dosage if needed.
        </p>

        <div className="space-y-2 mb-5">
          {[
            "Personalised medication selection",
            "Clinician-verified dosage",
            "Faster processing time",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "#10B981" }} />
              {f}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href={`/care-packs/assessment?pack=${encodeURIComponent(packName)}`}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }}
            onClick={onComplete}
          >
            Take Assessment <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 h-10 rounded-full text-sm font-semibold border"
            style={{ color: WINE, borderColor: PEACH_BORDER }}
          >
            Skip — View Pricing
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tier Card ─────────────────────────────────────────────────────────────

function TierCard({ tier, selected, onSelect, onAddToCart }: {
  tier: Tier
  selected: boolean
  onSelect: () => void
  onAddToCart: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={[
        "relative rounded-2xl border-2 cursor-pointer transition-all p-5 flex flex-col",
        selected
          ? "shadow-xl"
          : "hover:shadow-md",
      ].join(" ")}
      style={{
        borderColor: selected ? ACCENT_RED : PEACH_BORDER,
        background: selected ? PEACH_BG : "#FFFFFF",
      }}
    >
      {/* Badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white"
          style={{ background: tier.badgeColor }}
        >
          {tier.badge}
        </span>
        {selected && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#ECFDF5", color: "#059669" }}
          >
            Selected
          </span>
        )}
      </div>

      {/* Tier name + tagline */}
      <h3 className="text-lg font-black mb-0.5" style={{ color: WINE }}>{tier.label}</h3>
      <p className="text-xs text-muted-foreground mb-3">{tier.tagline}</p>

      {/* Price */}
      <div className="mb-4">
        <span className="text-3xl font-black" style={{ color: WINE }}>
          KES {tier.priceKES.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground ml-1">/{tier.supplyDuration}</span>
      </div>

      {/* Features */}
      <ul className="space-y-1.5 mb-5 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
            <CheckCircle2
              className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
              style={{ color: selected ? ACCENT_RED : "#9CA3AF" }}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAddToCart() }}
        className={[
          "w-full h-10 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all",
          selected ? "text-white" : "border",
        ].join(" ")}
        style={selected
          ? { background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }
          : { color: WINE, borderColor: PEACH_BORDER }
        }
      >
        <ShoppingCart className="h-4 w-4" />
        Add to Cart
      </button>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export function CarePackDetailPage() {
  const [, params] = useRoute("/care-packs/:slug")
  const [, navigate] = useLocation()
  const slug = params?.slug ?? ""

  const pack = useMemo(() => ALL_PACKS.find((p) => p.slug === slug) ?? null, [slug])
  const tiers = useMemo(() => pack ? tiersForPack(pack) : [], [pack])

  const [selectedTier, setSelectedTier] = useState<Tier["id"]>("standard")
  const [showGate, setShowGate] = useState(false)
  const [gateChecked, setGateChecked] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const selectedTierObj = useMemo(() => tiers.find((t) => t.id === selectedTier) ?? null, [tiers, selectedTier])

  const { data: productsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(productsData)

  const matchingProducts = useMemo(() => {
    if (!pack) return []
    const blob = (p: Product) => `${p.name} ${p.description} ${(p.tags ?? []).join(" ")} ${p.category}`
    return products.filter((p) => pack.tags.test(blob(p))).slice(0, 6)
  }, [pack, products])

  const { addItem } = useCart()

  useEffect(() => {
    if (!gateChecked) {
      const done = sessionStorage.getItem(ASSESSMENT_KEY)
      if (!done) setShowGate(true)
      setGateChecked(true)
    }
  }, [gateChecked])

  if (!pack) {
    return (
      <>
        <TopBar />
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 py-24 px-4">
          <Pill className="h-10 w-10 opacity-20" />
          <h1 className="text-lg font-bold" style={{ color: WINE }}>Care pack not found</h1>
          <Link href="/care-packs">
            <Button variant="outline">Browse all care packs</Button>
          </Link>
        </div>
        <Footer />
      </>
    )
  }

  function handleAddToCart() {
    const tier = tiers.find((t) => t.id === selectedTier)
    if (!tier || !pack) return
    // Add as a virtual product matching the Product shape
    addItem({
      id: `carepack-${pack.slug}-${tier.id}`,
      name: `${pack.name} — ${tier.label}`,
      price: String(tier.priceKES),
      images: [],
      description: pack.description,
      category: "care-packs",
      tags: [pack.section],
      stock_quantity: 99,
      status: "active",
    } as unknown as Product, quantity)
    navigate("/cart")
  }

  return (
    <>
      <Seo
        title={`${pack.name} | Shaniid RX`}
        description={pack.description}
        type="product"
      />
      {showGate && (
        <AssessmentGateModal
          packName={pack.name}
          onComplete={() => {
            sessionStorage.setItem(ASSESSMENT_KEY, "1")
            setShowGate(false)
          }}
          onSkip={() => {
            sessionStorage.setItem(ASSESSMENT_KEY, "skipped")
            setShowGate(false)
          }}
        />
      )}

      <TopBar />
      <Navbar />

      {/* Hero band */}
      <div className="w-full py-8 px-4 lg:px-8" style={{ background: WINE }}>
        <div className="max-w-5xl mx-auto">
          <Link
            href="/care-packs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 opacity-75 hover:opacity-100 transition-opacity"
            style={{ color: "#FEF0E4" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All care packs
          </Link>
          <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight">{pack.name}</h1>
          <p className="mt-2 text-sm max-w-lg" style={{ color: "rgba(255,251,245,0.75)" }}>{pack.description}</p>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-4 lg:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Gallery */}
          <div className="lg:col-span-5">
            {/* Thumbnail / tier indicators (evenly distributed; no scrolling) */}
            <div className="flex gap-3 pb-2">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTier(t.id)}
                  className="flex-1 flex items-center gap-3 p-2 rounded-lg transition-all"
                  style={{ border: selectedTier === t.id ? `2px solid ${ACCENT_RED}` : `1px solid ${PEACH_BORDER}`, background: selectedTier === t.id ? PEACH_BG : "white" }}
                >
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center rounded-md bg-white" style={{ border: `1px solid ${PEACH_BORDER}` }}>
                    <img loading="lazy" src={tierImageFor(pack.slug, t.id)} alt={t.label} className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: WINE }}>{t.label}</div>
                    <div className="text-xs text-muted-foreground truncate">KES {t.priceKES.toLocaleString()}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="relative rounded-2xl overflow-hidden mt-3" style={{ border: `1px solid ${PEACH_BORDER}`, background: "#FFF6EE" }}>
              <div className="aspect-square flex items-center justify-center p-6">
                <img
                  src={tierImageFor(pack.slug, selectedTier)}
                  alt={`${pack.name} - ${selectedTier}`}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg" }}
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-4">
            <h2 className="text-2xl font-bold mb-2" style={{ color: WINE }}>{pack.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{pack.description}</p>

            <div className="mb-6">
              <h3 className="text-sm font-bold mb-2" style={{ color: WINE }}>Choose your tier</h3>
              <div>
                {selectedTierObj && (
                  <div className="rounded-2xl border p-4" style={{ borderColor: PEACH_BORDER, background: selectedTierObj.highlight ? PEACH_BG : '#FFF' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: selectedTierObj.badgeColor }}>{selectedTierObj.badge}</div>
                        <div>
                          <div className="text-lg font-black" style={{ color: WINE }}>{selectedTierObj.label}</div>
                          <div className="text-xs text-muted-foreground">{selectedTierObj.tagline}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold" style={{ color: WINE }}>KES {selectedTierObj.priceKES.toLocaleString()}</div>
                        <div className="text-xs text-neutral-400">{selectedTierObj.supplyDuration}</div>
                      </div>
                    </div>

                    <ul className="mb-3 text-sm space-y-1 text-gray-700">
                      {selectedTierObj.features.map((f) => (
                        <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: ACCENT_RED }} />{f}</li>
                      ))}
                    </ul>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedTier(selectedTierObj.id)} className="px-3 py-2 rounded-full text-sm font-semibold" style={{ border: `1px solid ${PEACH_BORDER}`, background: '#FFF' }}>Selected</button>
                      <button onClick={handleAddToCart} className="ml-auto px-4 py-2 rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }}>Add to Cart</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {matchingProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-3" style={{ color: WINE }}>Products included</h3>
                <div className="grid grid-cols-3 gap-3">
                  {matchingProducts.map((p) => (
                    <Link key={p.id} href={`/products/${p.id}`} className="text-xs text-neutral-700 hover:underline">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center" style={{ border: `1px solid ${PEACH_BORDER}` }}>
                          {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-contain" /> : <Pill className="h-6 w-6 opacity-30" />}
                        </div>
                        <div className="text-[11px] text-center">{p.name}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Purchase card */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-6">
              <div className="rounded-2xl p-5 lg:p-6" style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #FFF6EB 100%)", border: `1px solid ${PEACH_BORDER}` }}>
                <div className="relative">
                  <div className="mb-2 text-sm text-muted-foreground">{tiers.find((t) => t.id === selectedTier)?.label} tier</div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold" style={{ color: WINE }}>KES {tiers.find((t) => t.id === selectedTier)?.priceKES.toLocaleString()}</span>
                    <span className="text-sm text-neutral-400 line-through">KES {Math.round((tiers.find((t) => t.id === selectedTier)?.priceKES ?? 0) * 1.2).toLocaleString()}</span>
                  </div>

                  <div className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full" style={{ color: WINE, background: "#FFF1E2", border: `1px solid ${PEACH_BORDER}` }}>
                    <span className="mr-1">👍</span>
                    {((Array.from(pack.slug).reduce((s, c) => s + c.charCodeAt(0), 0) % 22) + 5)} sold in the last 7 days
                  </div>

                  <div className="mt-4">
                    <p className="font-semibold" style={{ color: WINE }}>Delivery within 4 hours</p>
                    <p className="text-sm text-neutral-500 mt-0.5">on all orders placed between <span className="font-semibold" style={{ color: "#0F8A65" }}>8:00 AM</span> &amp; <span className="font-semibold" style={{ color: "#0F8A65" }}>8:00 PM</span></p>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-semibold mb-1.5 text-neutral-500 uppercase tracking-wider">Quantity</p>
                    <div className="inline-flex items-center rounded-full overflow-hidden" style={{ border: `1px solid ${PEACH_BORDER}`, background: "white" }}>
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 grid place-items-center hover:bg-[#FFF1E2] transition-colors" aria-label="Decrease quantity">-</button>
                      <span className="w-10 h-9 grid place-items-center text-sm font-semibold" style={{ color: WINE }}>{quantity}</span>
                      <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 grid place-items-center hover:bg-[#FFF1E2] transition-colors" aria-label="Increase quantity">+</button>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={false}
                    className="mt-5 w-full h-11 rounded-full text-sm font-semibold transition-all inline-flex items-center justify-center gap-2"
                    style={{ background: '#F2D4C4', color: '#3D0814' }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Add To Cart
                  </button>

                  <button
                    type="button"
                    onClick={() => {}}
                    className="mt-2.5 w-full h-11 rounded-full text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50"
                    style={{ color: WINE, border: `1px solid #E5E7EB` }}
                  >
                    Add To Wish List
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t" style={{ borderColor: PEACH_BORDER }}>
                  <div className="text-[12px] text-center">Fast Delivery</div>
                  <div className="text-[12px] text-center">Verified</div>
                  <div className="text-[12px] text-center">24/7 Support</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Trust banner */}
        <div className="mt-8 rounded-2xl p-6 flex items-start gap-4" style={{ background: PEACH_BG, border: `1px solid ${PEACH_BORDER}` }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: WINE }}>
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold mb-0.5" style={{ color: WINE }}>Shaniid RX Trust Seal</p>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
              Every medicine in this pack is verified genuine by our in-house pharmacists.
            </p>
          </div>
        </div>

        <div className="pb-16 lg:pb-0">
          <Footer />
        </div>
      </main>
    </>
  )
}

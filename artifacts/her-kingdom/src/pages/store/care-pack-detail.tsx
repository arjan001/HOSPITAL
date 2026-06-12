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
    } as unknown as Product, 1)
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
          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" style={{ color: "#F97316" }} />
            <span className="text-xs font-semibold" style={{ color: "#FEF0E4" }}>
              Genuine medicines · Pharmacist-reviewed · Delivered to your door
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-10">

        {/* Tier picker */}
        <div className="mb-10">
          <h2 className="text-xl font-black mb-1" style={{ color: WINE }}>Choose your tier</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select the plan that matches your needs. You can change tiers any time.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier === tier.id}
                onSelect={() => setSelectedTier(tier.id)}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>

        {/* Matching products */}
        {matchingProducts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-black mb-5" style={{ color: WINE }}>
              Products included in this pack
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {matchingProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
                  style={{ borderColor: PEACH_BORDER }}
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Pill className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: WINE }}>{p.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      KES {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trust banner */}
        <div
          className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{ background: PEACH_BG, border: `1px solid ${PEACH_BORDER}` }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: WINE }}
          >
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold mb-0.5" style={{ color: WINE }}>Shaniid RX Trust Seal</p>
            <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
              Every medicine in this pack is verified genuine by our in-house pharmacists.
              We only source from licensed suppliers and all products are checked for quality before dispatch.
            </p>
          </div>
        </div>

        {/* Sticky CTA bar (bottom) */}
        <div
          className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-4 py-3 border-t lg:hidden"
          style={{ background: "#FFFFFFEE", backdropFilter: "blur(12px)", borderColor: PEACH_BORDER }}
        >
          <div>
            <p className="text-[11px] text-muted-foreground">
              {tiers.find((t) => t.id === selectedTier)?.label ?? ""} tier
            </p>
            <p className="text-base font-black" style={{ color: WINE }}>
              KES {(tiers.find((t) => t.id === selectedTier)?.priceKES ?? 0).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex items-center gap-2 h-10 px-5 rounded-full text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </button>
        </div>
      </main>

      <div className="pb-16 lg:pb-0">
        <Footer />
      </div>
    </>
  )
}

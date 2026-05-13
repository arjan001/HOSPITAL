"use client"

import { Link } from "wouter"
import { ArrowRight, Sparkles, Leaf } from "lucide-react"
import { useCmsCollection } from "@/lib/cms-store"
import {
  PROMO_BANNERS_KEY,
  PROMO_BANNERS_DEFAULTS,
  type PromoBanner,
} from "@/components/admin/banners"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"

const LIGHT_OVERLAY =
  "linear-gradient(260deg, rgba(255,251,245,0.96) 0%, rgba(255,224,204,0.85) 38%, rgba(255,140,66,0.15) 70%, rgba(255,140,66,0) 100%)"
const DARK_OVERLAY =
  "linear-gradient(100deg, rgba(61,8,20,0.85) 0%, rgba(110,20,40,0.55) 45%, rgba(255,200,180,0.05) 100%)"

const LIGHT_CTA = `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`
const DARK_CTA = "linear-gradient(135deg, #FFFBF5 0%, #FFE0CC 100%)"

function pickIcon(kicker: string) {
  const k = kicker.toLowerCase()
  if (k.includes("skin") || k.includes("beauty") || k.includes("glow")) {
    return <Sparkles className="h-3.5 w-3.5" />
  }
  return <Leaf className="h-3.5 w-3.5" />
}

export function OfferBanner() {
  const { items } = useCmsCollection<PromoBanner>(PROMO_BANNERS_KEY, PROMO_BANNERS_DEFAULTS)
  const active = items.filter((b) => b.isActive)
  if (active.length === 0) return null

  return (
    <section className="py-8 lg:py-10" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
          {active.slice(0, 2).map((b) => (
            <BannerCard key={b.id} banner={b} />
          ))}
        </div>
      </div>
    </section>
  )
}

function BannerCard({ banner }: { banner: PromoBanner }) {
  const isLight = banner.tone === "light"
  const titleColor = isLight ? TEXT_WINE : "#FFFFFF"
  const subColor = isLight ? TEXT_WINE_SOFT : "rgba(255,251,245,0.9)"
  const ctaTextColor = isLight ? "#FFFFFF" : TEXT_WINE
  const overlay = isLight ? LIGHT_OVERLAY : DARK_OVERLAY
  const ctaGradient = isLight ? LIGHT_CTA : DARK_CTA
  const kickerBg = isLight ? "rgba(61,8,20,0.08)" : "rgba(255,251,245,0.18)"
  const kickerColor = isLight ? TEXT_WINE : "#FFFBF5"

  return (
    <Link
      href={banner.link || "/shop"}
      className="group relative overflow-hidden rounded-2xl min-h-[170px] lg:min-h-[185px] flex items-center transition-transform hover:-translate-y-0.5"
      style={{
        border: `1px solid ${BORDER_PEACH}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65), 0 22px 45px -22px rgba(184,60,30,0.45)",
      }}
    >
      {banner.image && (
        <img
          src={banner.image}
          alt={banner.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      )}
      <div className="absolute inset-0" style={{ background: overlay }} />

      <div
        className={`relative z-10 px-5 py-4 lg:px-7 lg:py-5 max-w-[58%] ${
          banner.textSide === "right" ? "ml-auto text-right" : "text-left"
        }`}
      >
        {banner.kicker && (
          <span
            className={`inline-flex items-center gap-1.5 text-[9px] tracking-[0.22em] uppercase mb-2 font-bold px-2.5 py-0.5 rounded-full ${
              banner.textSide === "right" ? "flex-row-reverse" : ""
            }`}
            style={{
              color: kickerColor,
              background: kickerBg,
              border: `1px solid ${isLight ? "rgba(61,8,20,0.12)" : "rgba(255,251,245,0.3)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            {pickIcon(banner.kicker)}
            {banner.kicker}
          </span>
        )}
        <h3 className="text-base lg:text-lg font-bold leading-snug" style={{ color: titleColor }}>
          {banner.title}
        </h3>
        {banner.subtitle && (
          <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: subColor }}>
            {banner.subtitle}
          </p>
        )}
        <span
          className={`inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-full transition-transform group-hover:scale-[1.03] ${
            banner.textSide === "right" ? "flex-row-reverse" : ""
          }`}
          style={{
            background: ctaGradient,
            color: ctaTextColor,
            boxShadow: isLight
              ? "0 12px 24px -10px rgba(185,28,28,0.55)"
              : "0 12px 24px -10px rgba(0,0,0,0.4)",
          }}
        >
          {banner.cta || "Shop Now"}
          <ArrowRight
            className={`h-3 w-3 transition-transform ${
              banner.textSide === "right"
                ? "rotate-180 group-hover:-translate-x-0.5"
                : "group-hover:translate-x-0.5"
            }`}
          />
        </span>
      </div>
    </Link>
  )
}

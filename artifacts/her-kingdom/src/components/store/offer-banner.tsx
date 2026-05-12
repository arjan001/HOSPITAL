"use client"

import { Link } from "wouter"
import { ArrowRight, Sparkles, Leaf } from "lucide-react"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"

type Banner = {
  href: string
  image: string
  kicker: string
  kickerIcon: React.ReactNode
  title: string
  subtitle: string
  cta: string
  textSide: "left" | "right"
  overlay: string // gradient angle direction matching text side
  kickerBg: string
  kickerColor: string
  ctaGradient: string
}

const BANNERS: Banner[] = [
  {
    href: "/shop?category=wellness-supplements",
    image: "/banner-wellness.png",
    kicker: "Wellness & Supplements",
    kickerIcon: <Leaf className="h-3.5 w-3.5" />,
    title: "Daily Gummies for Glowing Health",
    subtitle: "Turmeric, collagen and tropical vitamins — fruit-flavoured, easy on the gut.",
    cta: "Shop Now",
    textSide: "right",
    overlay:
      "linear-gradient(260deg, rgba(255,251,245,0.96) 0%, rgba(255,224,204,0.85) 38%, rgba(255,140,66,0.15) 70%, rgba(255,140,66,0) 100%)",
    kickerBg: "rgba(61,8,20,0.08)",
    kickerColor: TEXT_WINE,
    ctaGradient: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
  },
  {
    href: "/shop?category=skincare-beauty",
    image: "/banner-skincare.png",
    kicker: "Skincare & Beauty",
    kickerIcon: <Sparkles className="h-3.5 w-3.5" />,
    title: "Glow Rituals — Up to 30% Off",
    subtitle: "Pharmacist-loved serums, creams and personal-care picks delivered to your door.",
    cta: "Discover",
    textSide: "left",
    overlay:
      "linear-gradient(100deg, rgba(61,8,20,0.85) 0%, rgba(110,20,40,0.55) 45%, rgba(255,200,180,0.05) 100%)",
    kickerBg: "rgba(255,251,245,0.18)",
    kickerColor: "#FFFBF5",
    ctaGradient: "linear-gradient(135deg, #FFFBF5 0%, #FFE0CC 100%)",
  },
]

export function OfferBanner() {
  return (
    <section className="py-14 lg:py-20" style={{ background: "#FFFBF5" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">
          {BANNERS.map((b) => (
            <BannerCard key={b.title} banner={b} />
          ))}
        </div>
      </div>
    </section>
  )
}

function BannerCard({ banner }: { banner: Banner }) {
  const isLight = banner.textSide === "right" // light banner has dark text
  const titleColor = isLight ? TEXT_WINE : "#FFFFFF"
  const subColor = isLight ? TEXT_WINE_SOFT : "rgba(255,251,245,0.9)"
  const ctaTextColor = isLight ? "#FFFFFF" : TEXT_WINE

  return (
    <Link
      href={banner.href}
      className="group relative overflow-hidden rounded-3xl min-h-[280px] lg:min-h-[320px] flex items-center transition-transform hover:-translate-y-1"
      style={{
        border: `1px solid ${BORDER_PEACH}`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.65), 0 22px 45px -22px rgba(184,60,30,0.45)",
      }}
    >
      <img
        src={banner.image}
        alt={banner.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
      <div
        className="absolute inset-0"
        style={{ background: banner.overlay }}
      />

      <div
        className={`relative z-10 p-7 lg:p-10 max-w-[58%] ${
          banner.textSide === "right" ? "ml-auto text-right" : "text-left"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase mb-3 font-bold px-3 py-1 rounded-full ${
            banner.textSide === "right" ? "flex-row-reverse" : ""
          }`}
          style={{
            color: banner.kickerColor,
            background: banner.kickerBg,
            border: `1px solid ${
              isLight ? "rgba(61,8,20,0.12)" : "rgba(255,251,245,0.3)"
            }`,
            backdropFilter: "blur(8px)",
          }}
        >
          {banner.kickerIcon}
          {banner.kicker}
        </span>
        <h3
          className="text-2xl lg:text-[28px] font-bold leading-tight"
          style={{ color: titleColor }}
        >
          {banner.title}
        </h3>
        <p
          className="text-sm mt-2.5 leading-relaxed"
          style={{ color: subColor }}
        >
          {banner.subtitle}
        </p>
        <span
          className={`inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-xs font-bold tracking-wider uppercase rounded-full transition-transform group-hover:scale-[1.03] ${
            banner.textSide === "right" ? "flex-row-reverse" : ""
          }`}
          style={{
            background: banner.ctaGradient,
            color: ctaTextColor,
            boxShadow: isLight
              ? "0 12px 24px -10px rgba(185,28,28,0.55)"
              : "0 12px 24px -10px rgba(0,0,0,0.4)",
          }}
        >
          {banner.cta}
          <ArrowRight
            className={`h-4 w-4 transition-transform ${
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

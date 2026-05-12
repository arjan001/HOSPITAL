"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { ArrowRight, MessageCircle, ShieldCheck, BadgeCheck, Truck, Headphones } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"

// Theme tokens (figma)
const TEXT_WINE = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_GRAD = "linear-gradient(135deg, #FFE0CC 0%, #F4BCA0 55%, #E8A07E 100%)"
const PEACH_GRAD_2 = "linear-gradient(135deg, #FFD9C2 0%, #F4A88A 50%, #E18269 100%)"
const PEACH_GRAD_3 = "linear-gradient(135deg, #FFE7D6 0%, #F1B294 55%, #D89779 100%)"

type Slide = {
  eyebrow: string
  headline: string[]
  subline: string
  primaryHref: string
  bg: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Clinically Approved",
    headline: ["Verified Medicines.", "Wholesale Value.", "Fast Delivery."],
    subline: "Sourced from licensed manufacturers, dispensed by registered pharmacists.",
    primaryHref: "/shop",
    bg: PEACH_GRAD,
  },
  {
    eyebrow: "Pharmacy Board Certified",
    headline: ["Authentic Brands.", "Trusted Pharmacists.", "Same-Day Dispatch."],
    subline: "Real-time stock from over 25,000 healthcare products across Kenya.",
    primaryHref: "/shop?filter=offers",
    bg: PEACH_GRAD_2,
  },
  {
    eyebrow: "Care That Comes To You",
    headline: ["Easy Refills.", "Free Delivery.", "24/7 Online Support."],
    subline: "Upload your prescription once — we keep it on file for one-tap reorders.",
    primaryHref: "/contact",
    bg: PEACH_GRAD_3,
  },
]

const COLS = 6
const ROWS = 4
const TOTAL_SHARDS = COLS * ROWS

type ShardOffset = { tx: number; ty: number; rot: number; delay: number }

function generateShardOffsets(): ShardOffset[] {
  return Array.from({ length: TOTAL_SHARDS }).map(() => ({
    tx: (Math.random() - 0.5) * 220,
    ty: (Math.random() - 0.5) * 180,
    rot: (Math.random() - 0.5) * 90,
    delay: Math.random() * 180,
  }))
}

export function CtaCarousel() {
  const { whatsappHref } = useStoreContact()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<"in" | "shatter">("in")
  const [shardOffsets, setShardOffsets] = useState<ShardOffset[]>(() => generateShardOffsets())

  // Auto-advance with shatter transition
  useEffect(() => {
    const dwell = setTimeout(() => {
      setShardOffsets(generateShardOffsets())
      setPhase("shatter")
    }, 5400)
    return () => clearTimeout(dwell)
  }, [index])

  useEffect(() => {
    if (phase !== "shatter") return
    const swap = setTimeout(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
      setShardOffsets(generateShardOffsets())
      setPhase("in")
    }, 900)
    return () => clearTimeout(swap)
  }, [phase])

  const goTo = (i: number) => {
    if (i === index) return
    setShardOffsets(generateShardOffsets())
    setPhase("shatter")
    setTimeout(() => {
      setIndex(i)
      setShardOffsets(generateShardOffsets())
      setPhase("in")
    }, 700)
  }

  const slide = SLIDES[index]

  // Pre-compute shard cells (background position per shard)
  const shards = useMemo(
    () =>
      Array.from({ length: TOTAL_SHARDS }).map((_, i) => {
        const r = Math.floor(i / COLS)
        const c = i % COLS
        return {
          row: r,
          col: c,
          // background-position to reveal each slice when bg-size is COLS*100% x ROWS*100%
          bgPosX: (c / (COLS - 1)) * 100,
          bgPosY: (r / (ROWS - 1)) * 100,
        }
      }),
    []
  )

  return (
    <section className="relative" style={{ background: "#FFFBF5" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        {/* Hero card */}
        <div
          className="relative overflow-hidden rounded-[28px] lg:rounded-[36px]"
          style={{
            minHeight: 380,
            boxShadow:
              "0 30px 80px -30px rgba(184, 60, 30, 0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        >
          {/* Shattering background — grid of shards each showing the same gradient slice */}
          <div className="absolute inset-0">
            <div
              className="grid w-full h-full"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
              }}
            >
              {shards.map((s, i) => {
                const o = shardOffsets[i]
                return (
                  <div
                    key={i}
                    style={{
                      backgroundImage: slide.bg,
                      backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                      backgroundPosition: `${s.bgPosX}% ${s.bgPosY}%`,
                      transform:
                        phase === "shatter"
                          ? `translate3d(${o.tx}px, ${o.ty}px, 0) rotate(${o.rot}deg) scale(0.85)`
                          : "translate3d(0,0,0) rotate(0deg) scale(1)",
                      opacity: phase === "shatter" ? 0 : 1,
                      transition: `transform 0.85s cubic-bezier(0.22, 0.8, 0.4, 1) ${o.delay}ms, opacity 0.85s ease ${o.delay}ms`,
                      willChange: "transform, opacity",
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* Glass overlay highlights */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%), radial-gradient(60% 60% at 0% 100%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)",
            }}
          />

          {/* Floating glass blobs (claymorphism accents) */}
          <div
            className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-60"
            style={{
              background: "radial-gradient(circle at 30% 30%, #FFE9D6, #F0A47C 75%)",
              filter: "blur(20px)",
            }}
          />
          <div
            className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full opacity-40"
            style={{
              background: "radial-gradient(circle at 50% 50%, #FFD0B0, #C26A4B 80%)",
              filter: "blur(28px)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[380px]">
            <div
              className="max-w-xl"
              style={{
                opacity: phase === "shatter" ? 0 : 1,
                transform: phase === "shatter" ? "translateY(12px)" : "translateY(0)",
                transition: "opacity 0.45s ease, transform 0.45s ease",
              }}
            >
              <p
                className="text-sm sm:text-base font-medium mb-3"
                style={{ color: TEXT_WINE }}
              >
                {slide.eyebrow}
              </p>
              <h1
                className="font-extrabold leading-[1.05] tracking-tight"
                style={{ color: ACCENT_RED, fontSize: "clamp(2rem, 4.6vw, 3.4rem)" }}
              >
                {slide.headline.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-5 text-sm sm:text-base max-w-md leading-relaxed" style={{ color: TEXT_WINE }}>
                {slide.subline}
              </p>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={slide.primaryHref}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold text-white transition-transform hover:scale-[1.03]"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                    boxShadow: "0 14px 30px -10px rgba(185, 28, 28, 0.55)",
                  }}
                >
                  Order Now <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold transition-transform hover:scale-[1.03]"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.85)",
                    color: TEXT_WINE,
                    boxShadow: "0 10px 24px -10px rgba(61,8,20,0.35)",
                  }}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#25D366] text-white">
                    <MessageCircle className="h-3.5 w-3.5" fill="currentColor" />
                  </span>
                  Chat On WhatsApp
                </a>
              </div>

              {/* Dots */}
              <div className="mt-8 flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => goTo(i)}
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: i === index ? 26 : 10,
                      background: i === index ? ACCENT_RED : "rgba(61,8,20,0.25)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Right side decorative glass tile */}
            <div
              className="hidden lg:flex justify-end"
              style={{
                opacity: phase === "shatter" ? 0 : 1,
                transition: "opacity 0.5s ease",
              }}
            >
              <div
                className="relative w-[360px] h-[300px] rounded-3xl flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.32)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.65), 0 24px 60px -25px rgba(184,60,30,0.55)",
                }}
              >
                <img
                  src="/newsletter-pills.png"
                  alt="Pharmacy products"
                  className="max-w-[88%] max-h-[88%] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <TrustItem icon={<ShieldCheck className="h-5 w-5" />} title="100% Genuine Medicines" />
          <TrustItem icon={<BadgeCheck className="h-5 w-5" />} title="Licensed Pharmacists" />
          <TrustItem icon={<Truck className="h-5 w-5" />} title="Wholesale Pricing" />
          <TrustItem icon={<Headphones className="h-5 w-5" />} title="Online Support" />
        </div>
      </div>
    </section>
  )
}

function TrustItem({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid #F2DCC8",
        boxShadow: "0 8px 24px -16px rgba(61,8,20,0.35)",
        color: TEXT_WINE,
      }}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
        style={{
          background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})`,
        }}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold leading-tight">{title}</span>
    </div>
  )
}

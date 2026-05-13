"use client"

import React, { useEffect, useState } from "react"
import { Link } from "wouter"
import { ArrowRight, MessageCircle, ShieldCheck, BadgeCheck, Truck, Headphones } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"

// Theme tokens
const TEXT_WINE = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"

// Each slide: a base peach gradient plus its own floating accent palette
const PEACH_GRAD_1 = "linear-gradient(135deg, #FFE0CC 0%, #F4BCA0 55%, #E8A07E 100%)"
const PEACH_GRAD_2 = "linear-gradient(135deg, #FFD9C2 0%, #F4A88A 50%, #E18269 100%)"
const PEACH_GRAD_3 = "linear-gradient(135deg, #FFE7D6 0%, #F1B294 55%, #D89779 100%)"

type Slide = {
  eyebrow: string
  headline: string[]
  subline: string
  primaryHref: string
  bg: string
  image: string
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Clinically Approved",
    headline: ["Verified Medicines.", "Wholesale Value.", "Fast Delivery."],
    subline: "Sourced from licensed manufacturers, dispensed by registered pharmacists.",
    primaryHref: "/shop",
    bg: PEACH_GRAD_1,
    image: "/hero-pills-transparent.png",
  },
  {
    eyebrow: "Pharmacy Board Certified",
    headline: ["Authentic Brands.", "Trusted Pharmacists.", "Same-Day Dispatch."],
    subline: "Real-time stock from over 25,000 healthcare products across Kenya.",
    primaryHref: "/shop?filter=offers",
    bg: PEACH_GRAD_2,
    image: "/devices-hero-transparent.png",
  },
  {
    eyebrow: "Care That Comes To You",
    headline: ["Easy Refills.", "Free Delivery.", "24/7 Online Support."],
    subline: "Upload your prescription once — we keep it on file for one-tap reorders.",
    primaryHref: "/contact",
    bg: PEACH_GRAD_3,
    image: "/hero-pills-transparent.png",
  },
]

const SLIDE_DURATION_MS = 10000
const FADE_MS = 900

export function CtaCarousel() {
  const { whatsappHref } = useStoreContact()
  const [index, setIndex] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)

  // Auto-advance with crossfade transition
  useEffect(() => {
    const dwell = setTimeout(() => {
      setContentVisible(false)
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % SLIDES.length)
        setContentVisible(true)
      }, FADE_MS / 2)
      return () => clearTimeout(swap)
    }, SLIDE_DURATION_MS)
    return () => clearTimeout(dwell)
  }, [index])

  const goTo = (i: number) => {
    if (i === index) return
    setContentVisible(false)
    setTimeout(() => {
      setIndex(i)
      setContentVisible(true)
    }, FADE_MS / 2)
  }

  const slide = SLIDES[index]

  return (
    <section className="relative" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
        {/* Hero card */}
        <div
          className="relative overflow-hidden rounded-[28px] lg:rounded-[36px]"
          style={{
            minHeight: 420,
            boxShadow:
              "0 30px 80px -30px rgba(184, 60, 30, 0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
          }}
        >
          {/* Layered gradient backgrounds — crossfade between slides */}
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity"
              style={{
                background: s.bg,
                opacity: i === index ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
              }}
            />
          ))}

          {/* Animated floating blobs (continuous drift) */}
          <div
            className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full pointer-events-none rx-blob-drift-a"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(255,233,214,0.95), rgba(240,164,124,0.55) 70%, rgba(240,164,124,0) 75%)",
              filter: "blur(30px)",
              mixBlendMode: "screen",
            }}
          />
          <div
            className="absolute top-10 -right-24 w-[380px] h-[380px] rounded-full pointer-events-none rx-blob-drift-b"
            style={{
              background: "radial-gradient(circle at 50% 50%, rgba(255,208,176,0.95), rgba(194,106,75,0.45) 70%, rgba(194,106,75,0) 78%)",
              filter: "blur(36px)",
              mixBlendMode: "screen",
            }}
          />
          <div
            className="absolute -bottom-32 left-1/3 w-[460px] h-[460px] rounded-full pointer-events-none rx-blob-drift-c"
            style={{
              background: "radial-gradient(circle at 50% 50%, rgba(255,221,196,0.85), rgba(216,151,121,0.5) 65%, rgba(216,151,121,0) 75%)",
              filter: "blur(40px)",
              mixBlendMode: "soft-light",
            }}
          />

          {/* Subtle floating dot particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { left: "12%", top: "22%", size: 8, delay: "0s", dur: "9s" },
              { left: "28%", top: "78%", size: 6, delay: "2s", dur: "11s" },
              { left: "44%", top: "18%", size: 10, delay: "1.2s", dur: "10s" },
              { left: "62%", top: "70%", size: 7, delay: "3s", dur: "12s" },
              { left: "78%", top: "26%", size: 9, delay: "0.6s", dur: "9.5s" },
              { left: "88%", top: "60%", size: 6, delay: "2.4s", dur: "10.5s" },
              { left: "36%", top: "48%", size: 5, delay: "1.8s", dur: "11.5s" },
            ].map((d, i) => (
              <span
                key={i}
                className="absolute rounded-full rx-particle-float"
                style={{
                  left: d.left,
                  top: d.top,
                  width: d.size,
                  height: d.size,
                  background: "rgba(255,255,255,0.85)",
                  boxShadow: "0 0 14px rgba(255,255,255,0.55)",
                  animationDelay: d.delay,
                  animationDuration: d.dur,
                }}
              />
            ))}
          </div>

          {/* Glass overlay highlights */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%), radial-gradient(60% 60% at 0% 100%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-6 sm:px-10 lg:px-16 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[420px]">
            <div
              className="max-w-xl"
              style={{
                opacity: contentVisible ? 1 : 0,
                transform: contentVisible ? "translateY(0)" : "translateY(14px)",
                transition: "opacity 0.55s ease, transform 0.55s ease",
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
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                  </span>
                  Chat On WhatsApp
                </a>
              </div>

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

            {/* Right side: floating product PNG (no card frame, blends with bg) */}
            <div className="hidden lg:flex justify-center items-center relative h-full min-h-[340px]">
              {/* Soft glow under the image */}
              <div
                className="absolute w-[420px] h-[260px] rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)",
                  filter: "blur(20px)",
                  bottom: "8%",
                }}
              />
              {SLIDES.map((s, i) => (
                <img
                  key={i}
                  src={s.image}
                  alt="Pharmacy products"
                  className="absolute max-w-[92%] max-h-[92%] object-contain rx-pill-float"
                  style={{
                    opacity: i === index && contentVisible ? 1 : 0,
                    transform:
                      i === index && contentVisible
                        ? "translateY(0) scale(1)"
                        : "translateY(20px) scale(0.96)",
                    transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
                    filter:
                      "drop-shadow(0 30px 30px rgba(184,60,30,0.35)) drop-shadow(0 6px 14px rgba(61,8,20,0.25))",
                    pointerEvents: i === index ? "auto" : "none",
                  }}
                />
              ))}
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

"use client"

import React from "react"
import { Link } from "wouter"
import { Eye, Plus, Star, ArrowRight } from "lucide-react"
import { ProductImage } from "./product-image"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"
const CARD_BG = "rgba(255, 251, 245, 0.65)"

// Soft pink-rose matching the figma reference for the sidebar
const SIDEBAR_GRAD =
  "linear-gradient(180deg, #F1DAD2 0%, #EAC9C0 55%, #E2B9AE 100%)"

type CarePack = {
  title: string
  description: string
  price: string
  href: string
  image: string
}

const CARE_PACKS: CarePack[] = [
  {
    title: "Diabetes Care Pack",
    description: "A complete pack for reliable diabetes management.",
    price: "KSH 6,500",
    href: "/shop?category=chronic-care",
    image: "/newsletter-pills.png",
  },
  {
    title: "Blood Pressure Care Packs",
    description: "Daily essentials for healthy blood pressure control.",
    price: "KSH 6,500",
    href: "/shop?category=chronic-care",
    image: "/newsletter-pills.png",
  },
  {
    title: "Asthma & Respiratory Packs",
    description: "Inhalers and rescue meds for breathing comfort.",
    price: "KSH 6,500",
    href: "/shop?category=chronic-care",
    image: "/newsletter-pills.png",
  },
  {
    title: "Kidney & Dialysis Support",
    description: "Renal-friendly support pack curated by clinicians.",
    price: "KSH 6,500",
    href: "/shop?category=chronic-care",
    image: "/newsletter-pills.png",
  },
  {
    title: "Cold & Flu Pack",
    description: "Everything to recover faster from seasonal flu.",
    price: "KSH 6,500",
    href: "/shop?category=acute-care",
    image: "/newsletter-pills.png",
  },
  {
    title: "Pain & Injury Pack",
    description: "Relief, dressings and braces for everyday injuries.",
    price: "KSH 6,500",
    href: "/shop?category=acute-care",
    image: "/newsletter-pills.png",
  },
]

type DeviceItem = {
  name: string
  price: string
  href: string
  image: string
}

const DEVICES: DeviceItem[] = [
  { name: "Glucometers", price: "KSH 2,000", href: "/shop?category=devices", image: "/devices-hero-transparent.png" },
  { name: "BP Monitors", price: "KSH 2,500", href: "/shop?category=devices", image: "/devices-hero-transparent.png" },
  { name: "Thermometers", price: "KSH 1,000", href: "/shop?category=devices", image: "/devices-hero-transparent.png" },
  { name: "Test Strips & Lancets", price: "KSH 800", href: "/shop?category=devices", image: "/devices-hero-transparent.png" },
]

export function ExploreCategories() {
  return (
    <section className="py-14 lg:py-20" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-10">
          <h2
            className="text-2xl lg:text-4xl font-bold tracking-tight"
            style={{ color: TEXT_WINE }}
          >
            Explore Featured Categories
          </h2>
          <p className="mt-2 text-sm lg:text-base" style={{ color: TEXT_WINE_SOFT }}>
            Hand-picked care packs curated by our pharmacists.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10 items-start">
          {/* Left: Care Packs */}
          <div>
            <h3
              className="text-lg lg:text-xl font-bold mb-5"
              style={{ color: TEXT_WINE }}
            >
              Care Packs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {CARE_PACKS.map((p) => (
                <CarePackCard key={p.title} pack={p} />
              ))}
            </div>
          </div>

          {/* Right: Devices & Monitoring sidebar — matches figma reference */}
          <aside className="lg:sticky lg:top-32">
            <div
              className="rounded-[28px] p-6 lg:p-7"
              style={{
                background: SIDEBAR_GRAD,
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.7), 0 24px 50px -25px rgba(184,60,30,0.35)",
              }}
            >
              <h3
                className="text-lg font-bold text-center mb-6"
                style={{ color: TEXT_WINE }}
              >
                Devices &amp; Monitoring
              </h3>

              <div className="flex flex-col gap-5">
                {DEVICES.map((d) => (
                  <DeviceRow key={d.name} item={d} />
                ))}
              </div>

              <Link
                href="/shop?category=devices"
                className="mt-7 flex items-center justify-center gap-2 h-11 rounded-full font-semibold text-sm transition-shadow hover:shadow-md"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.95)",
                  color: TEXT_WINE,
                }}
              >
                View More
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function CarePackCard({ pack }: { pack: CarePack }) {
  return (
    <div
      className="group relative rounded-2xl p-4 transition-transform hover:-translate-y-1"
      style={{
        background: CARD_BG,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${BORDER_PEACH}`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.65), 0 14px 30px -18px rgba(184,60,30,0.4)",
      }}
    >
      <div
        className="relative aspect-square rounded-xl overflow-hidden mb-3"
        style={{ background: "#FFF1E6" }}
      >
        <ProductImage src={pack.image} alt={pack.title} fill loaderSize="md" />
        <Link
          href={pack.href}
          aria-label={`Preview ${pack.title}`}
          title={`Preview ${pack.title}`}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-110 z-10"
          style={{ background: ACCENT_RED }}
        >
          <Eye className="h-4 w-4" />
        </Link>
      </div>

      <h4 className="text-sm font-bold text-center" style={{ color: TEXT_WINE }}>
        {pack.title}
      </h4>
      <p className="text-xs text-center mt-1.5 leading-snug" style={{ color: TEXT_WINE_SOFT }}>
        {pack.description}
      </p>
      <p className="text-sm font-bold text-center mt-2" style={{ color: TEXT_WINE }}>
        {pack.price}
      </p>

      <Link
        href={pack.href}
        className="mt-3 flex items-center justify-center gap-1.5 h-10 rounded-full font-semibold text-sm transition-transform hover:scale-[1.02] text-white"
        style={{
          background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
          boxShadow: "0 10px 22px -10px rgba(185, 28, 28, 0.55)",
        }}
      >
        <Plus className="h-4 w-4" />
        Add To Cart
      </Link>
    </div>
  )
}

function DeviceRow({ item }: { item: DeviceItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-4 group"
    >
      {/* White rounded image card matching figma reference */}
      <div
        className="relative w-[88px] h-[88px] rounded-2xl overflow-hidden shrink-0 flex items-center justify-center transition-transform group-hover:scale-[1.04]"
        style={{
          background: "#FFFFFF",
          boxShadow:
            "0 10px 22px -12px rgba(184,60,30,0.35), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}
      >
        <div className="relative w-[78%] h-[78%]">
          <ProductImage src={item.image} alt={item.name} fill loaderSize="sm" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold leading-tight" style={{ color: TEXT_WINE }}>
          {item.name}
        </p>
        <p className="text-base font-bold mt-0.5" style={{ color: TEXT_WINE }}>
          {item.price}
        </p>
        <div className="flex items-center gap-0.5 mt-1.5" aria-label="5 star rating">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5" fill={ACCENT_ORANGE} stroke={ACCENT_ORANGE} />
          ))}
        </div>
      </div>
    </Link>
  )
}

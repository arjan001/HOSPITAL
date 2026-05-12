"use client"

import React from "react"
import { Link } from "wouter"
import { Heart } from "lucide-react"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"

type HealthCard = {
  badge: string
  badgeBg: string
  badgeText: string
  badgeIcon?: React.ReactNode
  title: string
  titleColor: string
  description: string
  href: string
  image: string
  topBg: string // peach/cream top section background
}

const CARDS: HealthCard[] = [
  {
    badge: "Essentials",
    badgeBg: "linear-gradient(135deg, #E8A07E 0%, #C26A4B 100%)",
    badgeText: "#FFFBF5",
    title: "First Aid",
    titleColor: TEXT_WINE,
    description: "Emergency & daily care essentials",
    href: "/shop?category=first-aid",
    image: "/health-essentials.png",
    topBg: "linear-gradient(180deg, #FFE0CC 0%, #F4BCA0 100%)",
  },
  {
    badge: "Most Loved",
    badgeBg: "linear-gradient(135deg, #FF7AA8 0%, #E94B7A 100%)",
    badgeText: "#FFFFFF",
    badgeIcon: <Heart className="h-3.5 w-3.5" fill="#3D0814" stroke="#3D0814" />,
    title: "Women's Health",
    titleColor: "#E94B7A",
    description: "Cycle care, wellness & gift",
    href: "/shop?category=womens-health",
    image: "/health-womens.png",
    topBg: "linear-gradient(180deg, #FFE0CC 0%, #FBCBB6 100%)",
  },
  {
    badge: "New",
    badgeBg: "linear-gradient(135deg, #9DC3E6 0%, #5B9BD5 100%)",
    badgeText: "#FFFFFF",
    title: "Men's Health",
    titleColor: "#2E7AB8",
    description: "Wellness & daily support",
    href: "/shop?category=mens-health",
    image: "/health-mens.png",
    topBg: "linear-gradient(180deg, #FFE0CC 0%, #FBCBB6 100%)",
  },
]

export function HealthCategories() {
  return (
    <section className="py-14 lg:py-20" style={{ background: "#FFFBF5" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10">
          <h2
            className="text-2xl lg:text-4xl font-bold tracking-tight"
            style={{ color: TEXT_WINE }}
          >
            Explore Our Health Categories
          </h2>
          <p className="mt-2 text-sm lg:text-base" style={{ color: TEXT_WINE_SOFT }}>
            Curated bundles for every chapter of your health journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {CARDS.map((c) => (
            <HealthCard key={c.title} card={c} />
          ))}
        </div>
      </div>
    </section>
  )
}

function HealthCard({ card }: { card: HealthCard }) {
  return (
    <Link
      href={card.href}
      className="group relative block overflow-hidden rounded-[28px] transition-transform hover:-translate-y-1"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(244,188,160,0.5)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.65), 0 24px 50px -25px rgba(184,60,30,0.4)",
      }}
    >
      {/* Top peach panel with badge + product image */}
      <div
        className="relative px-6 pt-6 pb-4"
        style={{ background: card.topBg, minHeight: 320 }}
      >
        {/* Badge */}
        <span
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold"
          style={{
            background: card.badgeBg,
            color: card.badgeText,
            boxShadow: "0 8px 18px -10px rgba(61,8,20,0.4)",
          }}
        >
          {card.badge}
          {card.badgeIcon}
        </span>

        {/* Product image */}
        <div className="mt-4 flex items-end justify-center h-[230px]">
          <img
            src={card.image}
            alt={card.title}
            className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
            style={{
              filter:
                "drop-shadow(0 24px 24px rgba(184,60,30,0.32)) drop-shadow(0 4px 10px rgba(61,8,20,0.18))",
            }}
          />
        </div>
      </div>

      {/* Bottom info panel */}
      <div className="px-6 py-5 bg-white">
        <h3
          className="text-lg font-bold"
          style={{ color: card.titleColor }}
        >
          {card.title}
        </h3>
        <p className="text-sm mt-1" style={{ color: TEXT_WINE_SOFT }}>
          {card.description}
        </p>
      </div>
    </Link>
  )
}

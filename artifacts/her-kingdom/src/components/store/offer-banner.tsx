"use client"

import { Link } from "wouter"
import { ArrowRight } from "lucide-react"
import useSWR from "swr"
import type { Banner } from "@/lib/types"
import { safeFetcher, asArray } from "@/lib/fetcher"

const TEXT_WINE = "#3D0814"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"

const KICKERS = ["Flash Sale", "Free Delivery", "Just Landed", "Easy Refills"]

export function OfferBanner() {
  const { data } = useSWR("/api/site-data", safeFetcher)
  const banners = asArray<Banner>((data as { midPageBanners?: Banner[] } | undefined)?.midPageBanners)

  if (!banners.length) return null

  const visible = banners.slice(0, 4)
  const gridCols =
    visible.length === 1
      ? "grid-cols-1"
      : visible.length === 3
      ? "grid-cols-1 lg:grid-cols-3"
      : "grid-cols-1 lg:grid-cols-2"

  return (
    <section className="py-14 lg:py-20" style={{ background: "#FFFBF5" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className={`grid ${gridCols} gap-5 lg:gap-6`}>
          {visible.map((banner, idx) => (
            <Link
              key={banner.id}
              href={banner.link || "/shop"}
              className="group relative overflow-hidden rounded-3xl min-h-[280px] flex items-center transition-transform hover:-translate-y-1"
              style={{
                border: `1px solid ${BORDER_PEACH}`,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.65), 0 18px 38px -22px rgba(184,60,30,0.45)",
              }}
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Wine-tinted overlay matching theme */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(100deg, rgba(61,8,20,0.78) 0%, rgba(61,8,20,0.45) 55%, rgba(61,8,20,0.1) 100%)",
                }}
              />
              <div className="relative z-10 p-8 lg:p-10 max-w-md">
                <span
                  className="inline-block text-[10px] tracking-[0.3em] uppercase mb-3 font-bold px-3 py-1 rounded-full"
                  style={{
                    color: "#FFFBF5",
                    background: "rgba(255,251,245,0.18)",
                    border: "1px solid rgba(255,251,245,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {KICKERS[idx] ?? "Featured"}
                </span>
                <h3 className="text-white text-2xl lg:text-3xl font-bold leading-tight">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-white/85 text-sm mt-2.5 leading-relaxed">
                    {banner.subtitle}
                  </p>
                )}
                <span
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-xs font-bold tracking-wider uppercase rounded-full text-white transition-transform group-hover:scale-[1.03]"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                    boxShadow: "0 10px 22px -10px rgba(185,28,28,0.55)",
                  }}
                >
                  Shop Now
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

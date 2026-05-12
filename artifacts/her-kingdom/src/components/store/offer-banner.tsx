"use client"

import { Link } from "wouter"

import { ArrowRight } from "lucide-react"
import useSWR from "swr"
import type { Banner } from "@/lib/types"
import { safeFetcher, asArray } from "@/lib/fetcher"

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
    <section className="py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className={`grid ${gridCols} gap-4 lg:gap-6`}>
          {visible.map((banner, idx) => (
            <Link
              key={banner.id}
              href={banner.link || "/shop"}
              className="relative overflow-hidden rounded-sm min-h-[280px] flex items-center group"
            >
              <img
                src={banner.image}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
              <div className="relative z-10 p-8 lg:p-10">
                <p className="text-white/80 text-xs tracking-[0.3em] uppercase mb-2">
                  {idx === 0 ? "Flash Sale" : idx === 1 ? "Free Delivery" : idx === 2 ? "Just Landed" : "Easy Refills"}
                </p>
                <h3 className="text-white text-2xl lg:text-3xl font-serif font-bold leading-tight max-w-sm">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-white/80 text-sm mt-2 max-w-xs">
                    {banner.subtitle}
                  </p>
                )}
                <span className="inline-flex items-center gap-2 mt-5 bg-white/95 text-black px-5 py-2.5 text-xs font-semibold tracking-wider uppercase rounded-sm group-hover:bg-white transition-colors">
                  Shop Now
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

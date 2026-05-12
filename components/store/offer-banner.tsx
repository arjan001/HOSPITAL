"use client"

import Link from "next/link"
import Image from "next/image"
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
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                priority={idx === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
              <div className="relative z-10 p-8 lg:p-10">
                <p className="text-white/70 text-xs tracking-[0.3em] uppercase mb-2">
                  {idx === 0 ? "Limited Offer" : idx === 1 ? "Just Dropped" : idx === 2 ? "Featured" : "Explore"}
                </p>
                <h3 className="text-white text-2xl lg:text-3xl font-serif font-bold">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-white/70 text-sm mt-2 max-w-xs">
                    {banner.subtitle}
                  </p>
                )}
                <div className="inline-flex items-center gap-2 mt-4 text-white text-sm font-medium">
                  Shop Now
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

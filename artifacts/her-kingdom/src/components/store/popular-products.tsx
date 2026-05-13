"use client"

import { Link } from "wouter"
import { ArrowRight, Flame } from "lucide-react"
import { useMemo } from "react"
import useSWR from "swr"
import { ProductCard } from "./product-card"
import type { Product } from "@/lib/types"
import { safeFetcher, asArray } from "@/lib/fetcher"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"

const TARGET = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function PopularProducts() {
  const { data } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(data)

  const displayed = useMemo(() => {
    if (products.length === 0) return []

    const onOffer = shuffle(products.filter((p) => p.isOnOffer))
    const result: Product[] = onOffer.slice(0, TARGET)

    if (result.length < TARGET) {
      const usedIds = new Set(result.map((p) => p.id))
      const rest = shuffle(products.filter((p) => !usedIds.has(p.id)))
      for (const p of rest) {
        if (result.length >= TARGET) break
        result.push(p)
      }
    }

    return result
  }, [products])

  if (displayed.length === 0) return null

  return (
    <section className="py-14 lg:py-20" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase mb-2 font-semibold px-3 py-1 rounded-full"
              style={{
                color: ACCENT_RED,
                background: "rgba(185,28,28,0.08)",
                border: "1px solid rgba(185,28,28,0.18)",
              }}
            >
              <Flame className="h-3 w-3" />
              Customer Favourites
            </span>
            <h2
              className="text-2xl lg:text-4xl font-bold tracking-tight"
              style={{ color: TEXT_WINE }}
            >
              Popular Products
            </h2>
            <p className="mt-2 text-sm lg:text-base" style={{ color: TEXT_WINE_SOFT }}>
              Top-selling essentials our customers reorder again and again.
            </p>
          </div>
          <Link
            href="/shop"
            className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 rounded-full font-semibold text-sm text-white transition-transform hover:scale-[1.03]"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
              boxShadow: "0 10px 22px -10px rgba(185,28,28,0.55)",
            }}
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
          {displayed.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

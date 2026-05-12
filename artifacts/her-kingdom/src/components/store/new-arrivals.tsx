"use client"

import { Link } from "wouter"
import { ArrowRight, Sparkles } from "lucide-react"
import { useMemo } from "react"
import { ProductCard } from "./product-card"
import type { Product } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TARGET = 8

export function NewArrivals() {
  const { data } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(data)

  const displayed = useMemo(() => {
    if (products.length === 0) return []

    const newShuffled = shuffle(products.filter((p) => p.isNew))
    const result: Product[] = newShuffled.slice(0, TARGET)

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
    <section
      className="py-14 lg:py-20"
      style={{
        background:
          "linear-gradient(180deg, #FFFBF5 0%, #FFF1E6 60%, #FFFBF5 100%)",
      }}
    >
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
              <Sparkles className="h-3 w-3" />
              Just In
            </span>
            <h2
              className="text-2xl lg:text-4xl font-bold tracking-tight"
              style={{ color: TEXT_WINE }}
            >
              New Arrivals
            </h2>
            <p className="mt-2 text-sm lg:text-base" style={{ color: TEXT_WINE_SOFT }}>
              Fresh-stocked products from our trusted suppliers.
            </p>
          </div>
          <Link
            href="/shop?filter=new"
            className="hidden sm:inline-flex items-center gap-1.5 h-11 px-5 rounded-full font-semibold text-sm transition-shadow hover:shadow-md"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.9)",
              color: TEXT_WINE,
            }}
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {displayed.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

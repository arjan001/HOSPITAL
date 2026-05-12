"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useMemo } from "react"
import { ProductCard } from "./product-card"
import type { Product } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TARGET = 12

export function OnOfferProducts() {
  const { data } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(data)

  const displayed = useMemo(() => {
    if (products.length === 0) return []

    const offerShuffled = shuffle(products.filter((p) => p.isOnOffer))
    const result: Product[] = offerShuffled.slice(0, TARGET)

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
    <section className="py-14 lg:py-20 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
              Hot Deals
            </p>
            <h2 className="text-2xl lg:text-3xl font-serif font-bold">
              Products On Offer
            </h2>
          </div>
          <Link
            href="/shop?filter=offers"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium hover:text-muted-foreground transition-colors"
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

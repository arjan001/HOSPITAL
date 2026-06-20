"use client"

import { Link } from "wouter"
import { ArrowRight } from "lucide-react"
import { useMemo } from "react"
import { ProductCard } from "./product-card"
import type { Product } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"
import { CATALOG_PRODUCTS } from "@/lib/catalog-api"

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

function getMixedRandom(products: Product[], count: number): Product[] {
  const byCategory: Record<string, Product[]> = {}
  for (const p of products) {
    const cat = p.categorySlug || "other"
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  for (const cat of Object.keys(byCategory)) {
    byCategory[cat] = shuffle(byCategory[cat])
  }

  const categories = shuffle(Object.keys(byCategory))
  if (categories.length === 0) return []

  const result: Product[] = []
  const indices: Record<string, number> = {}
  for (const cat of categories) indices[cat] = 0

  while (result.length < count) {
    let added = false
    for (const cat of categories) {
      if (result.length >= count) break
      if (indices[cat] < byCategory[cat].length) {
        result.push(byCategory[cat][indices[cat]])
        indices[cat]++
        added = true
      }
    }
    if (!added) break
  }
  return result
}

export function FeaturedProducts() {
  const { data } = useSWR<Product[]>(CATALOG_PRODUCTS, safeFetcher)
  const products = asArray<Product>(data)

  const featured = useMemo(() => {
    if (products.length === 0) return []
    return getMixedRandom(products, 8)
  }, [products])

  if (featured.length === 0) return null

  return (
    <section className="py-14 lg:py-20" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p
              className="text-[10px] tracking-[0.3em] uppercase mb-2 font-semibold"
              style={{ color: ACCENT_RED }}
            >
              Curated For You
            </p>
            <h2
              className="text-2xl lg:text-4xl font-bold tracking-tight"
              style={{ color: TEXT_WINE }}
            >
              Featured Medicines
            </h2>
            <p className="mt-2 text-sm lg:text-base" style={{ color: TEXT_WINE_SOFT }}>
              Pharmacist-picked essentials, ready to ship today.
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
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

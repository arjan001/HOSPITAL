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

function getMixedRandom(products: Product[], count: number): Product[] {
  const byCategory: Record<string, Product[]> = {}
  for (const p of products) {
    const cat = p.categorySlug || "other"
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(p)
  }

  // Shuffle each category bucket so picks differ per load
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
  const { data } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(data)

  const featured = useMemo(() => {
    if (products.length === 0) return []
    return getMixedRandom(products, 8)
  }, [products])

  if (featured.length === 0) return null

  return (
    <section className="py-14 lg:py-20 bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
              Curated For You
            </p>
            <h2 className="text-2xl lg:text-3xl font-serif font-bold">
              Featured Products
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium hover:text-muted-foreground transition-colors"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import type { Category } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

const COLLECTIONS = [
  { name: "Women", slug: "women", image: "/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg", href: "/shop/women" },
  { name: "New In", slug: "new", image: "/images/products/earrings/amara-gemstone-drops.jpeg", href: "/shop?filter=new" },
]

const CATEGORY_IMAGES: Record<string, string> = {
  "women-watches": "/categories/women-watches.jpeg",
  "men-sunglasses": "/categories/men-sunglasses.jpeg",
  "men-watches": "/categories/men-watches.jpeg",
}

export function CategoriesSection() {
  const { data } = useSWR<Category[]>("/api/categories", safeFetcher)
  const categories = asArray<Category>(data)

  return (
    <section className="hidden md:block py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Collections -- hidden on mobile */}
        <div className="mb-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
                Collections
              </p>
              <h2 className="text-2xl lg:text-3xl font-serif font-bold">
                Shop By Collection
              </h2>
            </div>
            <Link
              href="/shop"
              className="flex items-center gap-1.5 text-sm font-medium hover:text-muted-foreground transition-colors"
            >
              Shop All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:gap-6">
            {COLLECTIONS.map((col) => (
              <Link key={col.slug} href={col.href} className="group">
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-secondary">
                  <Image
                    src={col.image}
                    alt={`${col.name} collection`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-white text-xl font-serif font-bold">{col.name}</h3>
                    <span className="inline-flex items-center gap-1.5 mt-2 text-white/80 text-xs font-medium tracking-wide uppercase group-hover:text-white transition-colors">
                      Shop {col.name}
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Categories - circular cards, 7 per row */}
        {categories.length > 0 && (
          <div>
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
                  Browse
                </p>
                <h2 className="text-2xl lg:text-3xl font-serif font-bold">
                  Shop By Category
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-6 lg:gap-x-8">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${category.slug}`}
                  className="group flex flex-col items-center"
                  style={{ width: "calc((100% - 6 * 2rem) / 7)", minWidth: "80px" }}
                >
                  <div className="relative w-20 h-20 lg:w-24 lg:h-24 overflow-hidden rounded-full bg-secondary ring-2 ring-border group-hover:ring-foreground transition-all">
                    <Image
                      src={CATEGORY_IMAGES[category.slug] || category.image || "/placeholder.svg"}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-foreground/10 group-hover:bg-foreground/20 transition-colors rounded-full" />
                  </div>
                  <h3 className="text-xs font-medium mt-2.5 text-center leading-tight">{category.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

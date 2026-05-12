import { useEffect, useState } from "react"
import type { Product } from "./types"

const KEY = "shaniid-rx:recently-viewed"
const MAX = 12

type StoredProduct = Pick<
  Product,
  "id" | "name" | "slug" | "price" | "originalPrice" | "images" | "category" | "categorySlug" | "isOnOffer" | "offerPercentage" | "inStock"
>

function read(): StoredProduct[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(items: StoredProduct[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)))
    window.dispatchEvent(new CustomEvent("shaniid-rx:recently-viewed-updated"))
  } catch {
    // ignore quota errors
  }
}

function toStored(p: Product): StoredProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    originalPrice: p.originalPrice,
    images: p.images?.slice(0, 1) ?? [],
    category: p.category,
    categorySlug: p.categorySlug,
    isOnOffer: p.isOnOffer,
    offerPercentage: p.offerPercentage,
    inStock: p.inStock,
  }
}

export function rememberProduct(product: Product) {
  const current = read()
  const filtered = current.filter((it) => it.id !== product.id)
  write([toStored(product), ...filtered])
}

export function useRecentlyViewed(excludeId?: string): StoredProduct[] {
  const [items, setItems] = useState<StoredProduct[]>([])

  useEffect(() => {
    const refresh = () => setItems(read())
    refresh()
    window.addEventListener("shaniid-rx:recently-viewed-updated", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener("shaniid-rx:recently-viewed-updated", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  return excludeId ? items.filter((it) => it.id !== excludeId) : items
}

export type { StoredProduct }

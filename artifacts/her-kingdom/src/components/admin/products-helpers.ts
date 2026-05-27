"use client"

import useSWR from "swr"
import { safeFetcher } from "@/lib/fetcher"
import { cmsStore, useCmsCollection } from "@/lib/cms-store"
import { CATEGORIES_KEY, CATEGORIES_DEFAULTS, type CmsCategory } from "./categories"
import type { Product } from "@/lib/types"

export interface CategoryOption {
  id: string
  name: string
  slug: string
}

/**
 * Returns the category dropdown options used by AdminProducts. Pulls from
 * the cmsStore "categories" key (admin-managed source of truth) and falls
 * back to the legacy `/api/categories` dev-fixture endpoint only when the
 * admin has never persisted any categories.
 */
export function useCategoryOptions(): CategoryOption[] {
  const { items } = useCmsCollection<CmsCategory>(CATEGORIES_KEY, CATEGORIES_DEFAULTS)
  const { data } = useSWR<CategoryOption[]>("/api/categories", safeFetcher)
  if (cmsStore.has(CATEGORIES_KEY)) {
    return items
      .filter((c) => c.isActive)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
  }
  return Array.isArray(data) ? data : []
}

/**
 * Storefront catalog hook (use this on storefront pages when you want the
 * admin's cmsStore products to take precedence over the dev-fixture API).
 * Returns the cmsStore products if any have been persisted, otherwise
 * falls back to the SWR-fetched legacy `/api/products` response.
 */
export function useStorefrontProducts(): Product[] {
  const { items } = useCmsCollection<Product>("products", [])
  const { data } = useSWR<Product[]>("/api/products", safeFetcher)
  if (cmsStore.has("products") && items.length > 0) {
    return items
  }
  return Array.isArray(data) ? data : []
}

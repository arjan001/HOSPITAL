/**
 * Public product catalogue — always targets api-nest `/api/v2`.
 * Use these paths in components and SWR keys (not legacy `/api/products`).
 */

export const CATALOG_PRODUCTS = "/api/v2/products"
export const CATALOG_CATEGORIES = "/api/v2/categories"

export function catalogProductPath(slug: string): string {
  return `${CATALOG_PRODUCTS}/${encodeURIComponent(slug)}`
}

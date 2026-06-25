/**
 * Deduct storefront catalog stock (cms_docs `products`) after branch POS sales.
 * Branch POS reads the same catalog API as the online shop — one shared stock ledger.
 */
import type { AdminCmsService } from "../modules/admin-cms.module"

type CatalogProduct = {
  id: string
  stockCount?: number
  inStock?: boolean
}

export type CatalogStockLine = { productId: string; qty: number }

export async function deductCatalogProductStock(
  cms: AdminCmsService,
  lines: CatalogStockLine[],
): Promise<{ updated: string[]; skipped: string[] }> {
  const wanted = new Map<string, number>()
  for (const line of lines) {
    const id = String(line.productId ?? "").trim()
    const qty = Math.max(1, Math.round(Number(line.qty) || 1))
    if (!id) continue
    wanted.set(id, (wanted.get(id) ?? 0) + qty)
  }
  if (wanted.size === 0) return { updated: [], skipped: [] }

  const entry = await cms.get("products")
  const products = Array.isArray(entry?.value) ? (entry.value as CatalogProduct[]) : []
  if (!products.length) return { updated: [], skipped: [...wanted.keys()] }

  const updated: string[] = []
  const skipped: string[] = []
  const next = products.map((p) => {
    const deduct = wanted.get(p.id)
    if (!deduct) return p
    const current = Math.max(0, Math.round(Number(p.stockCount) || 0))
    if (current < deduct) {
      skipped.push(p.id)
      return p
    }
    const stockCount = current - deduct
    updated.push(p.id)
    return { ...p, stockCount, inStock: stockCount > 0 }
  })

  if (updated.length > 0) {
    await cms.put("products", next)
  }
  for (const id of wanted.keys()) {
    if (!updated.includes(id) && !skipped.includes(id)) skipped.push(id)
  }
  return { updated, skipped }
}

/**
 * Demand forecasting — combines order history, prescription demand, and care-pack
 * assessments into SKU-level projections for sourcing.
 */
import { gte } from "drizzle-orm"
import { db, adminOrders, type AdminOrderRow } from "@workspace/db"
import type { CatalogService, StoreProduct } from "../modules/catalog.module"

export type DemandAggSnapshot = {
  bySku: Array<{ sku: string; quantity: number; sources: string[] }>
}

export type ForecastEntryDto = {
  id: string
  sku: string
  productName: string
  windowDays: number
  historicalDemand: number
  projectedDemand: number
  source: "manual" | "trend" | "prescription_predict" | "refill_predict"
  notes?: string
  updatedAt: string
  trendPct?: number
  orderQty?: number
  rxQty?: number
  assessmentQty?: number
}

const SALE_STATUSES = new Set(["confirmed", "dispatched", "delivered"])

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function productIndex(products: StoreProduct[]): Map<string, { sku: string; name: string }> {
  const map = new Map<string, { sku: string; name: string }>()
  for (const p of products) {
    const sku = (p.slug || p.id || "").trim()
    if (!sku) continue
    const name = p.name.trim()
    map.set(norm(name), { sku, name })
    map.set(norm(sku), { sku, name })
    for (const tag of p.tags ?? []) {
      const t = norm(String(tag))
      if (t) map.set(t, { sku, name })
    }
  }
  return map
}

function resolveSku(
  label: string,
  index: Map<string, { sku: string; name: string }>,
): { sku: string; productName: string } | null {
  const n = norm(label)
  if (!n) return null
  const direct = index.get(n)
  if (direct) return { sku: direct.sku, productName: direct.name }
  for (const [key, hit] of index) {
    if (key.length < 3) continue
    if (n.includes(key) || key.includes(n)) return { sku: hit.sku, productName: hit.name }
  }
  return null
}

function orderSkuQty(
  orders: AdminOrderRow[],
  index: Map<string, { sku: string; name: string }>,
): Map<string, { sku: string; productName: string; qty: number }> {
  const out = new Map<string, { sku: string; productName: string; qty: number }>()
  for (const o of orders) {
    if (!SALE_STATUSES.has(o.status)) continue
    for (const item of o.items ?? []) {
      const hit = resolveSku(item.name, index)
      const sku = hit?.sku ?? norm(item.name).replace(/\s+/g, "-").slice(0, 48)
      if (!sku) continue
      const slot = out.get(sku) ?? { sku, productName: hit?.productName ?? item.name, qty: 0 }
      slot.qty += Math.max(0, Number(item.qty) || 0)
      out.set(sku, slot)
    }
  }
  return out
}

export async function buildDemandForecast(
  agg: DemandAggSnapshot,
  catalog: CatalogService,
  windowDays = 30,
): Promise<{
  windowDays: number
  generatedAt: string
  entries: ForecastEntryDto[]
  summary: { skuCount: number; totalProjected: number; risingSkus: number }
}> {
  const days = Math.min(365, Math.max(7, Number(windowDays) || 30))
  const now = Date.now()
  const since = new Date(now - days * 86400000)
  const prevSince = new Date(now - days * 2 * 86400000)

  const [products, orderRows] = await Promise.all([
    catalog.list().catch(() => [] as StoreProduct[]),
    db
      .select()
      .from(adminOrders)
      .where(gte(adminOrders.createdAt, prevSince)),
  ])

  const index = productIndex(products)
  const currentOrders = orderRows.filter((o) => o.createdAt >= since)
  const prevOrders = orderRows.filter((o) => o.createdAt >= prevSince && o.createdAt < since)

  const currentSales = orderSkuQty(currentOrders, index)
  const prevSales = orderSkuQty(prevOrders, index)

  const skuMap = new Map<
    string,
    {
      sku: string
      productName: string
      orderQty: number
      prevOrderQty: number
      rxQty: number
      assessmentQty: number
    }
  >()

  const ensure = (sku: string, productName: string) => {
    const key = sku.trim()
    if (!key) return null
    const slot = skuMap.get(key) ?? {
      sku: key,
      productName: productName || key,
      orderQty: 0,
      prevOrderQty: 0,
      rxQty: 0,
      assessmentQty: 0,
    }
    skuMap.set(key, slot)
    return slot
  }

  for (const row of agg.bySku) {
    const slot = ensure(row.sku, row.sku)!
    if (row.sources.includes("prescription")) slot.rxQty += row.quantity
    if (row.sources.includes("assessment")) slot.assessmentQty += row.quantity
    if (!row.sources.includes("prescription") && !row.sources.includes("assessment")) {
      slot.rxQty += row.quantity
    }
  }

  for (const [sku, row] of currentSales) {
    const slot = ensure(sku, row.productName)!
    slot.orderQty += row.qty
  }
  for (const [sku, row] of prevSales) {
    const slot = ensure(sku, row.productName)!
    slot.prevOrderQty += row.qty
  }

  const generatedAt = new Date().toISOString()
  const entries: ForecastEntryDto[] = []

  for (const slot of skuMap.values()) {
    const historicalDemand = slot.orderQty + slot.rxQty + slot.assessmentQty
    if (historicalDemand <= 0 && slot.prevOrderQty <= 0) continue

    const demandSignal = slot.rxQty + slot.assessmentQty
    const prevComparable = slot.prevOrderQty + demandSignal * 0.85
    const trendPct =
      prevComparable > 0
        ? Math.round(((historicalDemand - prevComparable) / prevComparable) * 1000) / 10
        : historicalDemand > 0
          ? 15
          : 0

    let source: ForecastEntryDto["source"] = "trend"
    if (slot.rxQty > slot.orderQty && slot.rxQty >= slot.assessmentQty) source = "prescription_predict"
    else if (slot.assessmentQty > slot.orderQty) source = "refill_predict"
    else if (slot.orderQty > 0 && demandSignal === 0) source = "trend"

    const growth = Math.max(-0.25, Math.min(0.5, trendPct / 100))
    const projectedDemand = Math.max(0, Math.ceil(historicalDemand * (1 + growth)))

    entries.push({
      id: `fc_${slot.sku.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 40)}`,
      sku: slot.sku,
      productName: slot.productName,
      windowDays: days,
      historicalDemand,
      projectedDemand,
      source,
      trendPct,
      orderQty: slot.orderQty,
      rxQty: slot.rxQty,
      assessmentQty: slot.assessmentQty,
      notes: `Orders ${slot.orderQty}, Rx ${slot.rxQty}, assessments ${slot.assessmentQty} (${days}d window).`,
      updatedAt: generatedAt,
    })
  }

  entries.sort((a, b) => b.projectedDemand - a.projectedDemand)

  return {
    windowDays: days,
    generatedAt,
    entries,
    summary: {
      skuCount: entries.length,
      totalProjected: entries.reduce((s, e) => s + e.projectedDemand, 0),
      risingSkus: entries.filter((e) => (e.trendPct ?? 0) > 5).length,
    },
  }
}

/** Map prescription drug names to catalogue SKUs for demand aggregation. */
export function drugNameToSku(
  drugName: string,
  index: Map<string, { sku: string; name: string }>,
): string | null {
  return resolveSku(drugName, index)?.sku ?? null
}

export function buildProductSkuIndex(products: StoreProduct[]): Map<string, { sku: string; name: string }> {
  return productIndex(products)
}

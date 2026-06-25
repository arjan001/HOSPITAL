/**
 * Enhanced demand forecasting — ensemble of trend + exponential smoothing (Stage 5.3).
 * Falls back to the baseline `buildDemandForecast` projection when history is thin.
 */
import { gte } from "drizzle-orm"
import { db, adminOrders } from "@workspace/db"
import type { CatalogService } from "../modules/catalog.module"
import { buildProductSkuIndex, type ForecastEntryDto } from "./demand-forecast"

const SALE_STATUSES = new Set(["confirmed", "dispatched", "delivered"])

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function resolveSkuFromIndex(
  label: string,
  index: Map<string, { sku: string; name: string }>,
): string | null {
  const n = norm(label)
  if (!n) return null
  const direct = index.get(n)
  if (direct) return direct.sku
  for (const [key, hit] of index) {
    if (key.length < 3) continue
    if (n.includes(key) || key.includes(n)) return hit.sku
  }
  return norm(label).replace(/\s+/g, "-").slice(0, 48) || null
}

/** Weekly order qty per SKU for ensemble models. */
export async function buildWeeklySkuOrderSeries(
  catalog: CatalogService,
  windowDays: number,
): Promise<Map<string, SeriesPoint[]>> {
  const days = Math.min(365, Math.max(7, Number(windowDays) || 30))
  const since = new Date(Date.now() - days * 86400000)
  const products = await catalog.list().catch(() => [])
  const index = buildProductSkuIndex(products)
  const orders = await db.select().from(adminOrders).where(gte(adminOrders.createdAt, since))

  const buckets = new Map<string, Map<number, number>>()

  for (const order of orders) {
    if (!SALE_STATUSES.has(order.status)) continue
    const weekIdx = Math.floor((order.createdAt.getTime() - since.getTime()) / (7 * 86400000))
    for (const item of order.items ?? []) {
      const sku = resolveSkuFromIndex(item.name, index)
      if (!sku) continue
      const qty = Math.max(0, Number(item.qty) || 0)
      const byWeek = buckets.get(sku) ?? new Map<number, number>()
      byWeek.set(weekIdx, (byWeek.get(weekIdx) ?? 0) + qty)
      buckets.set(sku, byWeek)
    }
  }

  const out = new Map<string, SeriesPoint[]>()
  for (const [sku, weeks] of buckets) {
    const points = [...weeks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, qty]) => ({ qty, weight: 1 }))
    out.set(sku, points)
  }
  return out
}

type SeriesPoint = { qty: number; weight: number }

function exponentialSmooth(series: number[], alpha = 0.35): number {
  if (series.length === 0) return 0
  let level = series[0]!
  for (let i = 1; i < series.length; i++) {
    level = alpha * series[i]! + (1 - alpha) * level
  }
  return level
}

function holtLinear(series: number[], alpha = 0.35, beta = 0.15): number {
  if (series.length === 0) return 0
  if (series.length === 1) return series[0]!
  let level = series[0]!
  let trend = series[1]! - series[0]!
  for (let i = 1; i < series.length; i++) {
    const value = series[i]!
    const prevLevel = level
    level = alpha * value + (1 - alpha) * (level + trend)
    trend = beta * (level - prevLevel) + (1 - beta) * trend
  }
  return Math.max(0, level + trend)
}

export type EnhancedForecastEntry = ForecastEntryDto & {
  baselineProjected: number
  mlProjected: number
  confidence: "low" | "medium" | "high"
  modelNotes: string
}

export function enhanceForecastEntries(
  baseline: ForecastEntryDto[],
  historicalSeries: Map<string, SeriesPoint[]>,
): {
  entries: EnhancedForecastEntry[]
  model: string
  summary: { skuCount: number; highConfidence: number; avgLiftPct: number }
} {
  const entries: EnhancedForecastEntry[] = []

  for (const row of baseline) {
    const points = historicalSeries.get(row.sku) ?? []
    const values = points.map((p) => p.qty)
    const totalWeight = points.reduce((s, p) => s + p.weight, 0)

    let mlProjected = row.projectedDemand
    let confidence: EnhancedForecastEntry["confidence"] = "low"
    let modelNotes = "Baseline trend only"

    if (values.length >= 4) {
      const es = exponentialSmooth(values)
      const holt = holtLinear(values)
      const weightedMean = totalWeight > 0 ? points.reduce((s, p) => s + p.qty * p.weight, 0) / totalWeight : es
      mlProjected = Math.round(es * 0.35 + holt * 0.45 + weightedMean * 0.2)
      confidence = values.length >= 8 ? "high" : "medium"
      modelNotes = `Ensemble ES=${es.toFixed(1)} Holt=${holt.toFixed(1)} weighted=${weightedMean.toFixed(1)}`
    } else if (values.length >= 2) {
      mlProjected = Math.round(exponentialSmooth(values))
      confidence = "medium"
      modelNotes = `Exponential smoothing (${values.length} points)`
    }

    mlProjected = Math.max(0, mlProjected)

    entries.push({
      ...row,
      projectedDemand: mlProjected,
      baselineProjected: row.projectedDemand,
      mlProjected,
      confidence,
      modelNotes,
    })
  }

  entries.sort((a, b) => b.projectedDemand - a.projectedDemand)

  const lifts = entries
    .filter((e) => e.baselineProjected > 0)
    .map((e) => ((e.mlProjected - e.baselineProjected) / e.baselineProjected) * 100)
  const avgLiftPct =
    lifts.length > 0 ? Math.round((lifts.reduce((a, b) => a + b, 0) / lifts.length) * 10) / 10 : 0

  return {
    entries,
    model: "ensemble-es-holt-v1",
    summary: {
      skuCount: entries.length,
      highConfidence: entries.filter((e) => e.confidence === "high").length,
      avgLiftPct,
    },
  }
}

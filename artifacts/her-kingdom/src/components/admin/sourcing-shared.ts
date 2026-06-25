export const SOURCING_KEYS = {
  suppliers: "sourcing-suppliers",
  requests: "sourcing-requests",
  quotes: "sourcing-quotes",
  pos: "sourcing-pos",
  inventory: "sourcing-inventory",
  forecast: "sourcing-forecast",
  scoreOverrides: "sourcing-score-overrides",
  priceHistory: "sourcing-price-history",
  competitorPrices: "sourcing-competitor-prices",
  automation: "sourcing-automation-rules",
  automationLog: "sourcing-automation-log",
} as const

export type InventoryType = "medication" | "device" | "consumable" | "packaging"

export interface InventoryItem {
  id: string
  sku: string
  productName: string
  type: InventoryType
  onHand: number
  safetyStock: number
  reorderPoint: number
  unitCost?: number
  batchExpiry?: string
  location?: string
  notes?: string
  updatedAt: string
}

export interface ForecastEntry {
  id: string
  sku: string
  productName: string
  windowDays: number
  historicalDemand: number
  projectedDemand: number
  source: "manual" | "trend" | "prescription_predict" | "refill_predict"
  notes?: string
  updatedAt: string
}

export interface SupplierScoreOverride {
  supplierId: string
  qualityScore?: number
  complaints?: number
  notes?: string
  updatedAt: string
}

export interface PriceHistoryEntry {
  id: string
  sku: string
  productName?: string
  supplierId: string
  unitCost: number
  currency: string
  source: "quote" | "po" | "manual"
  capturedAt: string
}

export interface CompetitorPrice {
  id: string
  sku: string
  productName: string
  competitor: string
  unitPrice: number
  currency: string
  url?: string
  capturedAt: string
}

export type AutomationTrigger = "low_stock" | "expiry_soon" | "refill_prediction" | "manual_scan" | "forecast_shortfall"
export type AutomationAction = "create_request" | "create_rfq"

export interface AutomationRule {
  id: string
  name: string
  trigger: AutomationTrigger
  isActive: boolean
  conditions: {
    minTier?: "preferred" | "approved" | "trial"
    expiryWindowDays?: number
    onHandRatio?: number
    types?: InventoryType[]
  }
  action: AutomationAction
  defaultPriority: "low" | "normal" | "high" | "urgent"
  defaultQty?: number
  shortfallThreshold?: number
  autoDraftPo?: boolean
  createdAt: string
  lastRunAt?: string
  lastRunSummary?: string
}

export interface AutomationLogEntry {
  id: string
  ruleId: string
  ruleName: string
  ranAt: string
  matched: number
  created: number
  details: string[]
}

export const INVENTORY_TYPE_LABEL: Record<InventoryType, string> = {
  medication: "Medication",
  device: "Device",
  consumable: "Consumable",
  packaging: "Packaging",
}

export const INVENTORY_TYPE_STYLE: Record<InventoryType, string> = {
  medication: "bg-violet-100 text-violet-800",
  device: "bg-sky-100 text-sky-800",
  consumable: "bg-emerald-100 text-emerald-800",
  packaging: "bg-amber-100 text-amber-800",
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return null
  return Math.ceil((d - Date.now()) / 86_400_000)
}

export function inventoryHealth(item: InventoryItem): {
  state: "ok" | "watch" | "low" | "critical" | "expiring" | "expired"
  label: string
  className: string
} {
  const days = daysUntil(item.batchExpiry)
  if (days !== null && days < 0) return { state: "expired", label: "Expired", className: "bg-rose-200 text-rose-900" }
  if (item.onHand <= 0) return { state: "critical", label: "Out of stock", className: "bg-rose-100 text-rose-800" }
  if (item.onHand < item.safetyStock) return { state: "low", label: "Below safety", className: "bg-rose-100 text-rose-800" }
  if (days !== null && days <= 90) return { state: "expiring", label: `Expires in ${days}d`, className: "bg-amber-100 text-amber-800" }
  if (item.onHand < item.reorderPoint) return { state: "watch", label: "Watch", className: "bg-amber-100 text-amber-800" }
  return { state: "ok", label: "Healthy", className: "bg-emerald-100 text-emerald-800" }
}

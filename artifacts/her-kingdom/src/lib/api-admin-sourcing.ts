/**
 * Postgres-backed sourcing admin API (/api/v2/admin/sourcing/*, supplier POs).
 */
import { nestFetch } from "./api-nest"
import type { InventoryItem, InventoryType } from "@/components/admin/sourcing-shared"
import type {
  AutomationLogEntry,
  AutomationRule,
  CompetitorPrice,
  PriceHistoryEntry,
} from "@/components/admin/sourcing-shared"
import type {
  PurchaseOrder,
  POStatus,
  RequestPriority,
  RequestSource,
  RequestStatus,
  SourcingRequest,
} from "@/components/admin/sourcing"

export type SourcingInventoryDto = InventoryItem

export type AutomationRuleDto = AutomationRule
export type SupplierPerformanceDto = {
  supplierId: string
  supplierName: string
  country: string
  tier: string
  verification: string
  totalPos: number
  receivedPos: number
  fillRate: number
  onTimeRate: number
  avgUnitCost: number
  priceIndex: number
  totalSpend: number
  qualityScore: number
  complaints: number
  composite: number
  suggestedTier: string
  notes: string
}

export type SourcingRequestRow = {
  id: string
  sku: string
  productName: string
  currentStock: number
  reorderPoint: number
  quantityNeeded: number
  urgency: string
  status: string
  notes: string | null
  assignedSupplierId: string | null
  expectedDeliveryAt: string | null
  fulfilledAt: string | null
  createdAt: string
  updatedAt: string
}

export type PurchaseOrderDto = {
  id: string
  supplierId: string
  poNumber: string
  status: string
  total: number
  expectedDate: string | null
  notes: string | null
  createdBy: string | null
  items: Array<{ id: string; name: string; qty: number; unitPrice: number }>
  createdAt: string
  updatedAt: string
}

function urgencyToPriority(urgency: string): RequestPriority {
  if (urgency === "critical") return "urgent"
  if (urgency === "high") return "high"
  if (urgency === "low") return "low"
  return "normal"
}

function priorityToUrgency(priority: RequestPriority): string {
  if (priority === "urgent") return "critical"
  if (priority === "high") return "high"
  if (priority === "low") return "low"
  return "normal"
}

function inferSource(notes: string | null | undefined): RequestSource {
  const n = (notes ?? "").toLowerCase()
  if (n.includes("forecast")) return "refill_prediction"
  if (n.includes("prescription")) return "prescription_gap"
  if (n.includes("expir")) return "expiry_replacement"
  if (n.includes("inventory") || n.includes("low stock") || n.includes("on-hand")) return "low_stock"
  return "manual"
}

export function mapRequestRow(row: SourcingRequestRow): SourcingRequest {
  return {
    id: row.id,
    productName: row.productName,
    sku: row.sku,
    qty: row.quantityNeeded,
    priority: urgencyToPriority(row.urgency),
    source: inferSource(row.notes),
    status: row.status as RequestStatus,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

const PO_STATUS_FROM_API: Record<string, POStatus> = {
  draft: "draft",
  sent: "sent",
  confirmed: "sent",
  dispatched: "in_transit",
  in_transit: "in_transit",
  received: "received",
  cancelled: "cancelled",
  disputed: "cancelled",
}

const PO_STATUS_TO_API: Record<POStatus, string> = {
  draft: "draft",
  sent: "sent",
  in_transit: "dispatched",
  received: "received",
  cancelled: "cancelled",
}

export function mapPurchaseOrderDto(dto: PurchaseOrderDto): PurchaseOrder {
  const first = dto.items[0]
  const qty = dto.items.reduce((s, l) => s + l.qty, 0)
  const unitCost = first?.unitPrice ?? (qty > 0 ? Math.round(dto.total / qty) : 0)
  return {
    id: dto.id,
    poNumber: dto.poNumber,
    requestId: "",
    supplierId: dto.supplierId,
    quoteId: "",
    qty: qty || first?.qty || 0,
    unitCost,
    currency: "USD",
    status: PO_STATUS_FROM_API[dto.status] ?? "draft",
    expectedAt: dto.expectedDate ?? undefined,
    receivedAt: dto.status === "received" ? dto.updatedAt : undefined,
    notes: dto.notes ?? undefined,
    createdAt: dto.createdAt,
  }
}

export const apiAdminSourcing = {
  listInventory: () => nestFetch<SourcingInventoryDto[]>("/admin/sourcing/inventory"),
  replaceInventory: (items: SourcingInventoryDto[]) =>
    nestFetch<SourcingInventoryDto[]>("/admin/sourcing/inventory", {
      method: "PUT",
      body: JSON.stringify(items),
    }),

  listRequests: () => nestFetch<SourcingRequestRow[]>("/admin/sourcing/requests"),
  createOpenRequest: (body: {
    sku: string
    productName: string
    quantityNeeded: number
    urgency?: string
    priority?: RequestPriority
    notes?: string
    currentStock?: number
    reorderPoint?: number
  }) =>
    nestFetch<SourcingRequestRow>("/admin/sourcing/requests/open", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        urgency: body.urgency ?? (body.priority ? priorityToUrgency(body.priority) : undefined),
      }),
    }),
  patchRequest: (id: string, patch: { status?: RequestStatus; notes?: string }) =>
    nestFetch<SourcingRequestRow>(`/admin/sourcing/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteRequest: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/sourcing/requests/${id}`, { method: "DELETE" }),

  listPurchaseOrders: (supplierId?: string) => {
    const q = supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : ""
    return nestFetch<PurchaseOrderDto[]>(`/admin/supplier-purchase-orders${q}`)
  },
  createPurchaseOrder: (body: {
    supplierId: string
    items: Array<{ name: string; qty: number; unitPrice: number }>
    expectedDate?: string | null
    notes?: string
    status?: string
  }) =>
    nestFetch<PurchaseOrderDto>("/admin/supplier-purchase-orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePurchaseOrderStatus: (id: string, status: POStatus) =>
    nestFetch<PurchaseOrderDto>(`/admin/supplier-purchase-orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: PO_STATUS_TO_API[status] ?? status }),
    }),

  listPriceHistory: () => nestFetch<PriceHistoryEntry[]>("/admin/sourcing/price-history"),
  addPriceHistory: (body: Omit<PriceHistoryEntry, "id" | "capturedAt">) =>
    nestFetch<PriceHistoryEntry>("/admin/sourcing/price-history", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deletePriceHistory: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/sourcing/price-history/${id}`, { method: "DELETE" }),

  listCompetitorPrices: () => nestFetch<CompetitorPrice[]>("/admin/sourcing/competitor-prices"),
  addCompetitorPrice: (body: Omit<CompetitorPrice, "id" | "capturedAt">) =>
    nestFetch<CompetitorPrice>("/admin/sourcing/competitor-prices", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteCompetitorPrice: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/sourcing/competitor-prices/${id}`, { method: "DELETE" }),

  listAutomationRules: () => nestFetch<AutomationRuleDto[]>("/admin/sourcing/automation/rules"),
  replaceAutomationRules: (rules: AutomationRuleDto[]) =>
    nestFetch<AutomationRuleDto[]>("/admin/sourcing/automation/rules", {
      method: "PUT",
      body: JSON.stringify(rules),
    }),
  listAutomationLog: () => nestFetch<AutomationLogEntry[]>("/admin/sourcing/automation/log"),
  clearAutomationLog: () =>
    nestFetch<{ ok: true }>("/admin/sourcing/automation/log", { method: "DELETE" }),
  runAutomationScan: () =>
    nestFetch<{ rulesEvaluated: number; requestsCreated: number; flagged: unknown[] }>(
      "/admin/sourcing/automation/run-scan",
      { method: "POST" },
    ),
  runForecastAutomation: (windowDays = 30) =>
    nestFetch<{
      rulesEvaluated: number
      requestsCreated: number
      posCreated: number
      flagged: unknown[]
    }>("/admin/sourcing/automation/run-forecast", {
      method: "POST",
      body: JSON.stringify({ windowDays }),
    }),
  runProcurementPipeline: (body?: {
    windowDays?: number
    autoApprove?: boolean
    shortfallThreshold?: number
  }) =>
    nestFetch<{
      model: string
      windowDays: number
      autoApprove: boolean
      shortfallThreshold: number
      flagged: unknown[]
      posCreated: number
      skipped: number
      createdPos: Array<{ poNumber: string; supplierId: string; sku: string; qty: number }>
      details: string[]
    }>("/admin/sourcing/automation/run-procurement-pipeline", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  listPerformance: () => nestFetch<SupplierPerformanceDto[]>("/admin/sourcing/performance"),
  upsertScoreOverride: (
    supplierId: string,
    body: { qualityScore?: number; complaints?: number; notes?: string },
  ) =>
    nestFetch<unknown>(`/admin/sourcing/performance/${encodeURIComponent(supplierId)}/override`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
}

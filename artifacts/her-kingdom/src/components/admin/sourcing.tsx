"use client"

import { useMemo, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Globe,
  Truck,
  PackageSearch,
  ClipboardList,
  Building2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  FileSpreadsheet,
  Star,
  StarOff,
  TrendingUp,
  Boxes,
  Gauge,
  LineChart,
  Bot,
  CalendarClock,
} from "lucide-react"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { apiAdminSourcing } from "@/lib/api-admin-sourcing"
import { useSourcingInventory, useSourcingRequests, usePurchaseOrders, useSourcingPerformance } from "@/lib/use-sourcing-store"
import { AdminShell } from "./admin-shell"
import { SourcingForecastTab } from "./sourcing-forecast"
import { SourcingInventoryTab } from "./sourcing-inventory"
import { SourcingPerformanceTab } from "./sourcing-performance"
import { SourcingPricingTab } from "./sourcing-pricing"
import { SourcingAutomationTab } from "./sourcing-automation"
import type { InventoryItem } from "./sourcing-shared"
import { SOURCING_KEYS } from "./sourcing-shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/format"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type SupplierTier = "preferred" | "approved" | "trial" | "blocked"
export type SupplierVerification = "verified" | "pending" | "unverified"

export interface Supplier {
  id: string
  name: string
  country: string
  city?: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  tier: SupplierTier
  verification: SupplierVerification
  leadTimeDays: number
  moq: number
  currency: string
  rating: number // 0..5
  notes?: string
  categories: string[]
  createdAt: string
}

export type RequestPriority = "low" | "normal" | "high" | "urgent"
export type RequestStatus = "draft" | "open" | "quoting" | "ordered" | "received" | "cancelled"
export type RequestSource = "low_stock" | "customer_request" | "prescription_gap" | "refill_prediction" | "expiry_replacement" | "manual"

export interface SourcingRequest {
  id: string
  productName: string
  sku?: string
  category?: string
  qty: number
  priority: RequestPriority
  source: RequestSource
  status: RequestStatus
  targetUnitCost?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Quote {
  id: string
  requestId: string
  supplierId: string
  unitCost: number
  currency: string
  moq: number
  leadTimeDays: number
  validUntil?: string
  notes?: string
  isWinner: boolean
  createdAt: string
}

export type POStatus = "draft" | "sent" | "in_transit" | "received" | "cancelled"

export interface PurchaseOrder {
  id: string
  poNumber: string
  requestId: string
  supplierId: string
  quoteId: string
  qty: number
  unitCost: number
  currency: string
  status: POStatus
  expectedAt?: string
  receivedAt?: string
  notes?: string
  createdAt: string
}

/* -------------------------------------------------------------------------- */
/*  Defaults                                                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: "sup_cipla",
    name: "Cipla Quality Chemicals",
    country: "Uganda",
    city: "Kampala",
    contactName: "Procurement Desk",
    email: "procurement@example.com",
    phone: "+256 700 000 000",
    tier: "preferred",
    verification: "verified",
    leadTimeDays: 7,
    moq: 100,
    currency: "USD",
    rating: 4.8,
    categories: ["Anti-malarials", "Antibiotics"],
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "sup_dawa",
    name: "Dawa Pharmaceuticals",
    country: "Kenya",
    city: "Nairobi",
    contactName: "Wholesale Team",
    email: "wholesale@example.com",
    phone: "+254 700 000 000",
    tier: "approved",
    verification: "verified",
    leadTimeDays: 3,
    moq: 50,
    currency: "KES",
    rating: 4.5,
    categories: ["OTC", "Vitamins"],
    createdAt: new Date(0).toISOString(),
  },
]

const DEFAULT_REQUESTS: SourcingRequest[] = [
  {
    id: "req_demo_1",
    productName: "Paracetamol 500mg (1000 tab pack)",
    sku: "PARA-500-1000",
    category: "OTC",
    qty: 200,
    priority: "high",
    source: "low_stock",
    status: "open",
    targetUnitCost: 4.5,
    notes: "Stock fell below 30 units last week. Confirm batch expiry > 18 months.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

export const TIER_LABEL: Record<SupplierTier, string> = {
  preferred: "Preferred",
  approved: "Approved",
  trial: "On Trial",
  blocked: "Blocked",
}

export const TIER_STYLE: Record<SupplierTier, string> = {
  preferred: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  approved: "bg-sky-100 text-sky-800 border border-sky-200",
  trial: "bg-amber-100 text-amber-800 border border-amber-200",
  blocked: "bg-rose-100 text-rose-800 border border-rose-200",
}

export const VERIFICATION_STYLE: Record<SupplierVerification, string> = {
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  unverified: "bg-gray-100 text-gray-700 border border-gray-200",
}

export const REQUEST_STATUS_STYLE: Record<RequestStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-sky-100 text-sky-800",
  quoting: "bg-amber-100 text-amber-800",
  ordered: "bg-violet-100 text-violet-800",
  received: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
}

export const PRIORITY_STYLE: Record<RequestPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-sky-100 text-sky-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-rose-100 text-rose-800",
}

export const PO_STATUS_STYLE: Record<POStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-sky-100 text-sky-800",
  in_transit: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
}

export const SOURCE_LABEL: Record<RequestSource, string> = {
  low_stock: "Low stock alert",
  customer_request: "Customer requested",
  prescription_gap: "Prescription gap",
  refill_prediction: "Refill prediction",
  expiry_replacement: "Expiry replacement",
  manual: "Manual entry",
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type Tab = "overview" | "requests" | "suppliers" | "quotes" | "pos" | "forecast" | "inventory" | "performance" | "pricing" | "automation"

export function AdminSourcing() {
  const [tab, setTab] = useState<Tab>("overview")

  const [suppliers, setSuppliers] = useCmsDoc<Supplier[]>(SOURCING_KEYS.suppliers, DEFAULT_SUPPLIERS)
  const { requests, createOpen, patchStatus, remove: removeRequest, refresh: refreshRequests } = useSourcingRequests(DEFAULT_REQUESTS)
  const [quotes, setQuotes] = useCmsDoc<Quote[]>(SOURCING_KEYS.quotes, [])
  const { pos, createFromQuote, updateStatus: updatePoStatus } = usePurchaseOrders([])
  const [inventory, setInventory] = useSourcingInventory([])

  /* ---- modal state ------------------------------------------------------- */
  const [supplierModal, setSupplierModal] = useState<{ open: boolean; editing: Supplier | null }>({ open: false, editing: null })
  const [requestModal, setRequestModal] = useState<{ open: boolean; editing: SourcingRequest | null }>({ open: false, editing: null })
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; requestId: string | null; editing: Quote | null }>({ open: false, requestId: null, editing: null })
  const [drawerRequest, setDrawerRequest] = useState<SourcingRequest | null>(null)

  /* ---- KPIs -------------------------------------------------------------- */
  const kpis = useMemo(() => {
    const openReq = requests.filter((r) => r.status === "open" || r.status === "quoting").length
    const urgent = requests.filter((r) => r.priority === "urgent" && r.status !== "received" && r.status !== "cancelled").length
    const inTransit = pos.filter((p) => p.status === "in_transit" || p.status === "sent").length
    const verified = suppliers.filter((s) => s.verification === "verified").length
    const openValue = pos
      .filter((p) => p.status !== "received" && p.status !== "cancelled")
      .reduce((sum, p) => sum + p.qty * p.unitCost, 0)
    const belowSafety = inventory.filter((i) => i.onHand < i.safetyStock).length
    const expiringSoon = inventory.filter((i) => {
      if (!i.batchExpiry) return false
      const d = Math.ceil((new Date(i.batchExpiry).getTime() - Date.now()) / 86_400_000)
      return d >= 0 && d <= 90
    }).length
    return { openReq, urgent, inTransit, verified, openValue, belowSafety, expiringSoon }
  }, [requests, pos, suppliers, inventory])

  /* ---------------------------------------------------------------------- */
  /*  Supplier handlers                                                     */
  /* ---------------------------------------------------------------------- */

  const handleSaveSupplier = (s: Supplier) => {
    setSuppliers((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id)
      if (idx === -1) return [...prev, s]
      const next = prev.slice(); next[idx] = s; return next
    })
    setSupplierModal({ open: false, editing: null })
  }

  const handleDeleteSupplier = (id: string) => {
    if (!confirm("Remove this supplier? Existing quotes and POs will keep their reference but lose details.")) return
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
  }

  /* ---------------------------------------------------------------------- */
  /*  Request handlers                                                      */
  /* ---------------------------------------------------------------------- */

  const handleSaveRequest = async (r: SourcingRequest) => {
    const existing = requests.find((x) => x.id === r.id)
    if (!existing) {
      await createOpen({
        sku: r.sku ?? "",
        productName: r.productName,
        quantityNeeded: r.qty,
        priority: r.priority,
        notes: r.notes,
      })
    } else {
      await apiAdminSourcing.patchRequest(r.id, { status: r.status, notes: r.notes })
      refreshRequests()
    }
    setRequestModal({ open: false, editing: null })
  }

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Delete this sourcing request and all its quotes?")) return
    await removeRequest(id)
    setQuotes((prev) => prev.filter((q) => q.requestId !== id))
  }

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    await patchStatus(id, status)
  }

  /* ---------------------------------------------------------------------- */
  /*  Quote handlers                                                        */
  /* ---------------------------------------------------------------------- */

  const handleSaveQuote = (q: Quote) => {
    setQuotes((prev) => {
      const idx = prev.findIndex((x) => x.id === q.id)
      if (idx === -1) return [...prev, q]
      const next = prev.slice(); next[idx] = q; return next
    })
    if (requests.find((r) => r.id === q.requestId)?.status === "open") {
      void patchStatus(q.requestId, "quoting")
    }

    // Record price history snapshot for the price-intel tab.
    const req = requests.find((r) => r.id === q.requestId)
    if (req?.sku) {
      void apiAdminSourcing.addPriceHistory({
        sku: req.sku,
        productName: req.productName,
        supplierId: q.supplierId,
        unitCost: q.unitCost,
        currency: q.currency,
        source: "quote",
      })
    }

    setQuoteModal({ open: false, requestId: null, editing: null })
  }

  const handleDeleteQuote = (id: string) => {
    if (!confirm("Remove this quote?")) return
    setQuotes((prev) => prev.filter((q) => q.id !== id))
  }

  const handlePickWinner = (q: Quote) => {
    setQuotes((prev) => prev.map((x) => x.requestId === q.requestId ? { ...x, isWinner: x.id === q.id } : x))
  }

  /* ---------------------------------------------------------------------- */
  /*  PO handlers                                                           */
  /* ---------------------------------------------------------------------- */

  const handleConvertToPO = async (q: Quote) => {
    const req = requests.find((r) => r.id === q.requestId)
    if (!req) return
    try {
      await createFromQuote({
        supplierId: q.supplierId,
        productName: req.productName,
        qty: req.qty,
        unitCost: q.unitCost,
        notes: `From quote ${q.id} / request ${req.id}`,
      })
      await patchStatus(req.id, "ordered")
      setQuotes((prev) => prev.map((x) => x.requestId === q.requestId ? { ...x, isWinner: x.id === q.id } : x))
      setTab("pos")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not create purchase order")
    }
  }

  const handlePOStatusChange = async (id: string, status: POStatus) => {
    const prevPo = pos.find((p) => p.id === id)
    const transitionToReceived = status === "received" && prevPo?.status !== "received"

    try {
      await updatePoStatus(id, status)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update PO status")
      return
    }

    if (transitionToReceived && prevPo) {
      const req = requests.find((r) => r.id === prevPo.requestId)
      if (req?.id) void patchStatus(req.id, "received")

      if (req?.sku) {
        setInventory((prev) => {
          const idx = prev.findIndex((i) => i.sku === req.sku)
          if (idx === -1) return prev
          const next = prev.slice()
          next[idx] = { ...next[idx], onHand: next[idx].onHand + prevPo.qty, updatedAt: new Date().toISOString() }
          return next
        })
      }
    }
  }

  const handleDeletePO = async (id: string) => {
    if (!confirm("Cancel this purchase order?")) return
    try {
      await updatePoStatus(id, "cancelled")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not cancel PO")
    }
  }

  /* ---------------------------------------------------------------------- */
  /*  CSV export                                                            */
  /* ---------------------------------------------------------------------- */

  const exportRequestsCsv = () => {
    const rows = [
      ["Product", "SKU", "Qty", "Priority", "Status", "Source", "Target Cost", "Created"],
      ...requests.map((r) => [
        r.productName, r.sku || "", String(r.qty), r.priority, r.status, r.source,
        r.targetUnitCost ? String(r.targetUnitCost) : "",
        new Date(r.createdAt).toISOString().split("T")[0],
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `sourcing-requests-${new Date().toISOString().split("T")[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  const supplierById = (id: string) => suppliers.find((s) => s.id === id)

  return (
    <AdminShell title="Sourcing">
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold">Sourcing</h1>
              <Badge variant="outline" className="text-[10px] gap-1 border-[#3D0814] text-[#3D0814]">
                <ShieldCheck className="h-3 w-3" /> Trust layer
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Source genuine, fairly-priced medicine from verified suppliers — request, quote, order, and receive.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportRequestsCsv} className="bg-transparent gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              onClick={() => setRequestModal({ open: true, editing: null })}
              className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New sourcing request
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="Open requests" value={kpis.openReq} hint="Awaiting quote / decision" icon={ClipboardList} />
          <KpiCard label="Urgent" value={kpis.urgent} hint="Need action this week" icon={AlertTriangle} accent="rose" />
          <KpiCard label="In transit" value={kpis.inTransit} hint="POs sent or shipping" icon={Truck} />
          <KpiCard label="Verified suppliers" value={kpis.verified} hint={`of ${suppliers.length} total`} icon={ShieldCheck} accent="emerald" />
          <KpiCard label="Below safety" value={kpis.belowSafety} hint="SKUs needing reorder" icon={Boxes} accent="rose" />
          <KpiCard label="Expiring < 90d" value={kpis.expiringSoon} hint="Plan replacements" icon={CalendarClock} accent="amber" />
          <KpiCard label="Open PO value" value={formatPrice(kpis.openValue)} hint="Sum of unreceived POs" icon={Building2} />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {([
              ["overview", "Overview"],
              ["forecast", "Forecast"],
              ["inventory", `Inventory (${inventory.length})`],
              ["requests", `Requests (${requests.length})`],
              ["suppliers", `Suppliers (${suppliers.length})`],
              ["quotes", `Quotes (${quotes.length})`],
              ["pos", `POs (${pos.length})`],
              ["performance", "Performance"],
              ["pricing", "Price intel"],
              ["automation", "Automation"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === k
                    ? "border-[#3D0814] text-[#3D0814]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >{label}</button>
            ))}
          </div>
        </div>

        {tab === "overview" && (
          <OverviewTab
            requests={requests}
            quotes={quotes}
            pos={pos}
            supplierById={supplierById}
            onOpenRequest={(r) => setDrawerRequest(r)}
            onJump={setTab}
          />
        )}

        {tab === "requests" && (
          <RequestsTab
            requests={requests}
            quotes={quotes}
            onNew={() => setRequestModal({ open: true, editing: null })}
            onEdit={(r) => setRequestModal({ open: true, editing: r })}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            onAddQuote={(r) => setQuoteModal({ open: true, requestId: r.id, editing: null })}
            onOpen={(r) => setDrawerRequest(r)}
          />
        )}

        {tab === "suppliers" && (
          <SuppliersTab
            suppliers={suppliers}
            onNew={() => setSupplierModal({ open: true, editing: null })}
            onEdit={(s) => setSupplierModal({ open: true, editing: s })}
            onDelete={handleDeleteSupplier}
          />
        )}

        {tab === "quotes" && (
          <QuotesTab
            quotes={quotes}
            requests={requests}
            supplierById={supplierById}
            onPickWinner={handlePickWinner}
            onConvert={handleConvertToPO}
            onDelete={handleDeleteQuote}
          />
        )}

        {tab === "pos" && (
          <PoTab
            pos={pos}
            supplierById={supplierById}
            onStatusChange={handlePOStatusChange}
            onDelete={handleDeletePO}
          />
        )}

        {tab === "forecast" && <SourcingForecastTab />}
        {tab === "inventory" && <SourcingInventoryTab />}
        {tab === "performance" && <SourcingPerformanceTab />}
        {tab === "pricing" && <SourcingPricingTab />}
        {tab === "automation" && <SourcingAutomationTab />}
      </div>

      {/* Modals */}
      <SupplierModal
        open={supplierModal.open}
        editing={supplierModal.editing}
        onClose={() => setSupplierModal({ open: false, editing: null })}
        onSave={handleSaveSupplier}
      />

      <RequestModal
        open={requestModal.open}
        editing={requestModal.editing}
        onClose={() => setRequestModal({ open: false, editing: null })}
        onSave={handleSaveRequest}
      />

      <QuoteModal
        open={quoteModal.open}
        requestId={quoteModal.requestId}
        editing={quoteModal.editing}
        suppliers={suppliers}
        onClose={() => setQuoteModal({ open: false, requestId: null, editing: null })}
        onSave={handleSaveQuote}
      />

      <RequestDrawer
        request={drawerRequest}
        quotes={quotes.filter((q) => q.requestId === drawerRequest?.id)}
        supplierById={supplierById}
        onClose={() => setDrawerRequest(null)}
        onAddQuote={() => drawerRequest && setQuoteModal({ open: true, requestId: drawerRequest.id, editing: null })}
        onPickWinner={handlePickWinner}
        onConvert={handleConvertToPO}
      />
    </AdminShell>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function KpiCard({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string | number; hint?: string;
  icon: typeof ShieldCheck; accent?: "rose" | "emerald" | "amber"
}) {
  const tone =
    accent === "rose" ? "text-rose-700 bg-rose-50" :
    accent === "emerald" ? "text-emerald-700 bg-emerald-50" :
    accent === "amber" ? "text-amber-700 bg-amber-50" :
    "text-[#3D0814] bg-[#3D0814]/5"
  return (
    <div className="border border-border rounded-sm p-4 bg-background">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
        <span className={`p-1.5 rounded-sm ${tone}`}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function OverviewTab({ requests, quotes, pos, supplierById, onOpenRequest, onJump }: {
  requests: SourcingRequest[]; quotes: Quote[]; pos: PurchaseOrder[];
  supplierById: (id: string) => Supplier | undefined;
  onOpenRequest: (r: SourcingRequest) => void;
  onJump: (t: Tab) => void;
}) {
  const urgent = requests.filter((r) => (r.priority === "urgent" || r.priority === "high") && r.status !== "received" && r.status !== "cancelled").slice(0, 5)
  const recentPos = pos.slice(0, 5)
  const pendingQuotes = quotes.filter((q) => !q.isWinner).slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Panel title="Needs your attention" subtitle="High and urgent requests" cta="View all" onCta={() => onJump("requests")}>
        {urgent.length === 0 ? <Empty hint="Nothing urgent. Calm shift." /> : (
          <ul className="divide-y divide-border">
            {urgent.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpenRequest(r)} className="w-full text-left py-2.5 px-1 hover:bg-secondary/50 transition-colors flex items-center gap-3">
                  <Badge className={`text-[10px] ${PRIORITY_STYLE[r.priority]} border-0`}>{r.priority}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.productName}</p>
                    <p className="text-[11px] text-muted-foreground">Qty {r.qty} · {SOURCE_LABEL[r.source]}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Quotes awaiting decision" subtitle="Pick a winner to issue a PO" cta="View all" onCta={() => onJump("quotes")}>
        {pendingQuotes.length === 0 ? <Empty hint="No open quotes." /> : (
          <ul className="divide-y divide-border">
            {pendingQuotes.map((q) => {
              const sup = supplierById(q.supplierId)
              const req = requests.find((r) => r.id === q.requestId)
              return (
                <li key={q.id} className="py-2.5 px-1 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{req?.productName || "—"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{sup?.name || "Unknown supplier"} · {q.currency} {q.unitCost.toFixed(2)} / unit</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{q.leadTimeDays}d</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Latest purchase orders" subtitle="Track shipments" cta="View all" onCta={() => onJump("pos")}>
        {recentPos.length === 0 ? <Empty hint="No POs yet." /> : (
          <ul className="divide-y divide-border">
            {recentPos.map((p) => {
              const sup = supplierById(p.supplierId)
              return (
                <li key={p.id} className="py-2.5 px-1 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.poNumber}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{sup?.name || "—"} · {p.currency} {(p.qty * p.unitCost).toFixed(2)}</p>
                  </div>
                  <Badge className={`text-[10px] ${PO_STATUS_STYLE[p.status]} border-0`}>{p.status.replace("_", " ")}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Panel({ title, subtitle, cta, onCta, children }: {
  title: string; subtitle?: string; cta?: string; onCta?: () => void; children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-sm bg-background p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {cta && (
          <button type="button" onClick={onCta} className="text-[11px] font-medium text-[#3D0814] hover:underline">{cta}</button>
        )}
      </div>
      {children}
    </div>
  )
}

function Empty({ hint }: { hint: string }) {
  return <p className="text-xs text-muted-foreground py-6 text-center">{hint}</p>
}

function RequestsTab({ requests, quotes, onNew, onEdit, onDelete, onStatusChange, onAddQuote, onOpen }: {
  requests: SourcingRequest[]; quotes: Quote[];
  onNew: () => void; onEdit: (r: SourcingRequest) => void;
  onDelete: (id: string) => void; onStatusChange: (id: string, s: RequestStatus) => void;
  onAddQuote: (r: SourcingRequest) => void; onOpen: (r: SourcingRequest) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all")
  const [search, setSearch] = useState("")

  const filtered = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (search && !`${r.productName} ${r.sku || ""}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search product or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="quoting">Quoting</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={onNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New request
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Source</th>
              <th className="text-left px-4 py-3 font-medium">Qty</th>
              <th className="text-left px-4 py-3 font-medium">Priority</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Quotes</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const qCount = quotes.filter((q) => q.requestId === r.id).length
              return (
                <tr key={r.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onOpen(r)} className="text-left">
                      <p className="font-medium">{r.productName}</p>
                      {r.sku && <p className="text-[11px] text-muted-foreground">SKU: {r.sku}</p>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{SOURCE_LABEL[r.source]}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.qty}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] capitalize ${PRIORITY_STYLE[r.priority]} border-0`}>{r.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={r.status} onValueChange={(v) => onStatusChange(r.id, v as RequestStatus)}>
                      <SelectTrigger className={`h-7 w-[110px] text-[11px] capitalize border-0 ${REQUEST_STATUS_STYLE[r.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="quoting">Quoting</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {qCount === 0 ? <span className="text-[11px] text-muted-foreground">No quotes</span>
                      : <Badge variant="outline" className="text-[10px]">{qCount} quote{qCount > 1 ? "s" : ""}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-[11px] bg-transparent gap-1" onClick={() => onAddQuote(r)}>
                        <Plus className="h-3 w-3" /> Quote
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <PackageSearch className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No sourcing requests match this filter.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SuppliersTab({ suppliers, onNew, onEdit, onDelete }: {
  suppliers: Supplier[]; onNew: () => void;
  onEdit: (s: Supplier) => void; onDelete: (id: string) => void;
}) {
  const { scoreBySupplier } = useSourcingPerformance()
  const [tierFilter, setTierFilter] = useState<SupplierTier | "all">("all")
  const filtered = suppliers.filter((s) => tierFilter === "all" || s.tier === tierFilter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as typeof tierFilter)}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="preferred">Preferred</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="trial">On Trial</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={onNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add supplier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="border border-border rounded-sm p-4 bg-background">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold truncate">{s.name}</h3>
                  {s.verification === "verified" && <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Globe className="h-3 w-3" /> {s.city ? `${s.city}, ` : ""}{s.country}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {scoreBySupplier(s.id) && (
                  <span className="text-lg font-bold text-[#3D0814] leading-none" title="Performance score">
                    {scoreBySupplier(s.id)!.composite}
                  </span>
                )}
                <Badge className={`text-[10px] ${TIER_STYLE[s.tier]} border-0`}>{TIER_LABEL[s.tier]}</Badge>
                <Badge variant="outline" className={`text-[10px] capitalize ${VERIFICATION_STYLE[s.verification]}`}>
                  {s.verification}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-border">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lead</p>
                <p className="text-sm font-semibold">{s.leadTimeDays}d</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">MOQ</p>
                <p className="text-sm font-semibold">{s.moq}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rating</p>
                <p className="text-sm font-semibold flex items-center justify-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {s.rating.toFixed(1)}
                </p>
              </div>
            </div>

            {s.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {s.categories.slice(0, 4).map((c) => (
                  <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground">{c}</span>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => onEdit(s)}>
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] text-destructive" onClick={() => onDelete(s.id)}>
                <Trash2 className="h-3 w-3 mr-1" /> Remove
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full border border-dashed border-border rounded-sm py-12 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No suppliers in this tier yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function QuotesTab({ quotes, requests, supplierById, onPickWinner, onConvert, onDelete }: {
  quotes: Quote[]; requests: SourcingRequest[];
  supplierById: (id: string) => Supplier | undefined;
  onPickWinner: (q: Quote) => void;
  onConvert: (q: Quote) => void;
  onDelete: (id: string) => void;
}) {
  if (quotes.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-sm py-16 text-center">
        <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No quotes captured yet. Add a quote from any sourcing request.</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Request</th>
            <th className="text-left px-4 py-3 font-medium">Supplier</th>
            <th className="text-left px-4 py-3 font-medium">Unit cost</th>
            <th className="text-left px-4 py-3 font-medium">MOQ</th>
            <th className="text-left px-4 py-3 font-medium">Lead</th>
            <th className="text-left px-4 py-3 font-medium">Winner</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {quotes.map((q) => {
            const sup = supplierById(q.supplierId)
            const req = requests.find((r) => r.id === q.requestId)
            return (
              <tr key={q.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium truncate max-w-[220px]">{req?.productName || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{sup?.name || "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground">{sup?.country || ""}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{q.currency} {q.unitCost.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-xs">{q.moq}</td>
                <td className="px-4 py-3 font-mono text-xs">{q.leadTimeDays}d</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onPickWinner(q)}
                    className={`inline-flex items-center gap-1 text-xs ${q.isWinner ? "text-emerald-700 font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {q.isWinner ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
                    {q.isWinner ? "Winner" : "Pick"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] bg-transparent gap-1"
                      onClick={() => onConvert(q)}>
                      Convert to PO <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(q.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PoTab({ pos, supplierById, onStatusChange, onDelete }: {
  pos: PurchaseOrder[];
  supplierById: (id: string) => Supplier | undefined;
  onStatusChange: (id: string, s: POStatus) => void;
  onDelete: (id: string) => void;
}) {
  if (pos.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-sm py-16 text-center">
        <Truck className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No purchase orders yet. Convert a winning quote to create one.</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-secondary">
          <tr>
            <th className="text-left px-4 py-3 font-medium">PO #</th>
            <th className="text-left px-4 py-3 font-medium">Supplier</th>
            <th className="text-left px-4 py-3 font-medium">Qty</th>
            <th className="text-left px-4 py-3 font-medium">Unit cost</th>
            <th className="text-left px-4 py-3 font-medium">Total</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Created</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pos.map((p) => {
            const sup = supplierById(p.supplierId)
            return (
              <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{p.poNumber}</td>
                <td className="px-4 py-3">{sup?.name || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.qty}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.currency} {p.unitCost.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold">{p.currency} {(p.qty * p.unitCost).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Select value={p.status} onValueChange={(v) => onStatusChange(p.id, v as POStatus)}>
                    <SelectTrigger className={`h-7 w-[120px] text-[11px] capitalize border-0 ${PO_STATUS_STYLE[p.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="in_transit">In transit</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Modals                                                                    */
/* -------------------------------------------------------------------------- */

function SupplierModal({ open, editing, onClose, onSave }: {
  open: boolean; editing: Supplier | null;
  onClose: () => void; onSave: (s: Supplier) => void;
}) {
  const [form, setForm] = useState<Supplier>(() => editing || blankSupplier())

  // Reset form when modal opens
  useState(() => undefined)
  if (open && form.id !== (editing?.id || form.id) && !editing) {
    // first open
  }

  const reset = () => setForm(editing || blankSupplier())

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-2xl bg-background text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
          <DialogDescription>Suppliers feed your sourcing pipeline. Verified suppliers carry the trust seal at quote time.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Field label="Company name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Contact person">
            <Input value={form.contactName || ""} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="Country *">
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Kenya, Uganda, India..." />
          </Field>
          <Field label="City">
            <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Website">
            <Input value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} placeholder="KES" />
          </Field>
          <Field label="Tier">
            <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v as SupplierTier })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="preferred">Preferred</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="trial">On Trial</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Verification">
            <Select value={form.verification} onValueChange={(v) => setForm({ ...form, verification: v as SupplierVerification })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending review</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Lead time (days)">
            <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="MOQ (units)">
            <Input type="number" min={0} value={form.moq} onChange={(e) => setForm({ ...form, moq: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Rating (0-5)">
            <Input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: Math.min(5, Math.max(0, Number(e.target.value) || 0)) })} />
          </Field>
          <Field label="Categories (comma separated)">
            <Input value={form.categories.join(", ")} onChange={(e) => setForm({ ...form, categories: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.country}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white"
          >{editing ? "Save changes" : "Add supplier"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function blankSupplier(): Supplier {
  return {
    id: newId("sup"),
    name: "",
    country: "",
    tier: "approved",
    verification: "pending",
    leadTimeDays: 7,
    moq: 1,
    currency: "KES",
    rating: 0,
    categories: [],
    createdAt: new Date().toISOString(),
  }
}

function RequestModal({ open, editing, onClose, onSave }: {
  open: boolean; editing: SourcingRequest | null;
  onClose: () => void; onSave: (r: SourcingRequest) => void;
}) {
  const [form, setForm] = useState<SourcingRequest>(() => editing || blankRequest())
  const reset = () => setForm(editing || blankRequest())

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-xl bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Edit sourcing request" : "New sourcing request"}</DialogTitle>
          <DialogDescription>Capture what you need to source. Add quotes once suppliers respond.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="sm:col-span-2">
            <Field label="Product name *">
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
            </Field>
          </div>
          <Field label="SKU">
            <Input value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </Field>
          <Field label="Category">
            <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Quantity *">
            <Input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Target unit cost">
            <Input type="number" min={0} step={0.01} value={form.targetUnitCost ?? ""} onChange={(e) => setForm({ ...form, targetUnitCost: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as RequestPriority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Source">
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as RequestSource })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low_stock">Low stock alert</SelectItem>
                <SelectItem value="customer_request">Customer requested</SelectItem>
                <SelectItem value="prescription_gap">Prescription gap</SelectItem>
                <SelectItem value="manual">Manual entry</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Batch requirements, expiry minimums, regulatory notes..." />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.productName || form.qty < 1}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white"
          >{editing ? "Save changes" : "Create request"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function blankRequest(): SourcingRequest {
  const now = new Date().toISOString()
  return {
    id: newId("req"),
    productName: "",
    qty: 1,
    priority: "normal",
    source: "manual",
    status: "open",
    createdAt: now,
    updatedAt: now,
  }
}

function QuoteModal({ open, requestId, editing, suppliers, onClose, onSave }: {
  open: boolean; requestId: string | null; editing: Quote | null;
  suppliers: Supplier[]; onClose: () => void; onSave: (q: Quote) => void;
}) {
  const [form, setForm] = useState<Quote>(() => editing || blankQuote(requestId || ""))
  const reset = () => setForm(editing || blankQuote(requestId || ""))

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-lg bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Edit quote" : "Add supplier quote"}</DialogTitle>
          <DialogDescription>Compare offers side-by-side, then crown a winner to convert into a PO.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <Field label="Supplier *">
            <Select value={form.supplierId} onValueChange={(v) => {
              const s = suppliers.find((x) => x.id === v)
              setForm({ ...form, supplierId: v, currency: s?.currency || form.currency, leadTimeDays: s?.leadTimeDays || form.leadTimeDays, moq: s?.moq || form.moq })
            }}>
              <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 ? (
                  <SelectItem value="__none" disabled>No suppliers yet — add one first</SelectItem>
                ) : suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} {s.verification === "verified" ? "•" : ""} {s.country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit cost *">
              <Input type="number" min={0} step={0.01} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase().slice(0, 3) })} />
            </Field>
            <Field label="MOQ">
              <Input type="number" min={0} value={form.moq} onChange={(e) => setForm({ ...form, moq: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Lead time (days)">
              <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label="Valid until">
            <Input type="date" value={form.validUntil || ""} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Payment terms, batch info, expiry..." />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.supplierId || !form.unitCost}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white"
          >{editing ? "Save changes" : "Add quote"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function blankQuote(requestId: string): Quote {
  return {
    id: newId("qt"),
    requestId,
    supplierId: "",
    unitCost: 0,
    currency: "KES",
    moq: 1,
    leadTimeDays: 7,
    isWinner: false,
    createdAt: new Date().toISOString(),
  }
}

function RequestDrawer({ request, quotes, supplierById, onClose, onAddQuote, onPickWinner, onConvert }: {
  request: SourcingRequest | null;
  quotes: Quote[];
  supplierById: (id: string) => Supplier | undefined;
  onClose: () => void;
  onAddQuote: () => void;
  onPickWinner: (q: Quote) => void;
  onConvert: (q: Quote) => void;
}) {
  if (!request) return null
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-background text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            {request.productName}
            <Badge className={`text-[10px] capitalize ${REQUEST_STATUS_STYLE[request.status]} border-0`}>{request.status}</Badge>
          </DialogTitle>
          <DialogDescription>
            {request.sku ? `SKU: ${request.sku} · ` : ""}Qty {request.qty} · {SOURCE_LABEL[request.source]}
          </DialogDescription>
        </DialogHeader>

        {request.notes && (
          <div className="bg-secondary/50 border border-border rounded-sm p-3 text-xs text-muted-foreground">
            {request.notes}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 mb-2">
          <h3 className="text-sm font-semibold">Quotes ({quotes.length})</h3>
          <Button size="sm" onClick={onAddQuote} className="h-7 text-[11px] bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1">
            <Plus className="h-3 w-3" /> Add quote
          </Button>
        </div>

        {quotes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-sm">
            No quotes yet for this request.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => {
              const s = supplierById(q.supplierId)
              return (
                <div key={q.id} className={`border rounded-sm p-3 ${q.isWinner ? "border-emerald-300 bg-emerald-50/40" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{s?.name || "Unknown supplier"}</p>
                        {s?.verification === "verified" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />}
                        {q.isWinner && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-0">Winner</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{s?.country || ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono">{q.currency} {q.unitCost.toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">MOQ {q.moq} · {q.leadTimeDays}d lead</p>
                    </div>
                  </div>
                  {q.notes && <p className="text-[11px] text-muted-foreground mt-2 border-t border-border pt-2">{q.notes}</p>}
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] bg-transparent gap-1" onClick={() => onPickWinner(q)}>
                      {q.isWinner ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3" />}
                      {q.isWinner ? "Selected" : "Pick winner"}
                    </Button>
                    <Button size="sm" className="h-7 text-[11px] bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1" onClick={() => onConvert(q)}>
                      Convert to PO <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium mb-1.5 block">{label}</Label>
      {children}
    </div>
  )
}

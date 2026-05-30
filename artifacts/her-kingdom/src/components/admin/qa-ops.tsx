"use client"

/**
 * QA Operations — functional implementation of the green QA flow chart
 * (Untitled_(1)_1778959965543.png):
 *
 *   Top  : Device / Consumables / Medication Inventory → Stock Level
 *          Tracking → Stock Levels · Expiry Monitoring · Safety Stock Alerts
 *   Lower: Dispatch Preparation → Medication Batch Verification →
 *          Expiry Validation → Prescription Matching → Storage Compliance
 *          → Final Pack Inspection → QA Approved
 *
 * All persisted via cmsStore so the NestJS swap is one file later.
 */

import { useMemo, useState } from "react"
import {
  ShieldCheck, Boxes, Pill, Wrench, PackageSearch, AlertTriangle,
  CalendarX, ClipboardCheck, Plus, Pencil, Trash2, CheckCircle2,
  Activity, Settings2, Search,
} from "lucide-react"
import { useCmsDoc, newId } from "@/lib/cms-store"
import { useAdminOrders, type AdminOrderRecord } from "@/lib/orders-store"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

const WINE = "#3D0814"

// =====================================================================
// Types
// =====================================================================

type ItemKind = "medication" | "device" | "consumable"

interface InventoryItem {
  id: string
  kind: ItemKind
  name: string
  sku: string
  stock: number
  safetyStock: number          // re-order point
  unit: string                 // "tablets", "boxes", "units"
  expiryDate?: string          // ISO date (yyyy-mm-dd) — only meaningful for meds/consumables
  batchRef?: string
  location: string             // "Main warehouse · Shelf A2"
  notes?: string
}

type StepKey =
  | "dispatch_prep" | "batch_verification" | "expiry_validation"
  | "prescription_match" | "storage_compliance" | "final_pack" | "qa_approved"

const STEP_ORDER: StepKey[] = [
  "dispatch_prep", "batch_verification", "expiry_validation",
  "prescription_match", "storage_compliance", "final_pack", "qa_approved",
]

const STEP_LABEL: Record<StepKey, string> = {
  dispatch_prep:        "Dispatch preparation",
  batch_verification:   "Medication batch verification",
  expiry_validation:    "Expiry validation",
  prescription_match:   "Prescription matching",
  storage_compliance:   "Storage compliance",
  final_pack:           "Final pack inspection",
  qa_approved:          "QA approved",
}

interface DispatchCheck {
  id: string
  batchRef: string             // links to logistics batch ref
  orderRef?: string            // optional specific order
  steps: Record<StepKey, boolean>
  notes: string
  checkedBy: string
  createdAt: string
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
}

interface QaConfig {
  expiryWarningDays: number    // days before expiry to start warning
  expiryCriticalDays: number   // days before expiry to flag critical
  requireAllStepsForApproval: boolean
  blockExpiredFromDispatch: boolean
}

// =====================================================================
// CMS keys + defaults
// =====================================================================

const KEYS = {
  inventory: "qa.inventory",
  dispatch: "qa.dispatch-checks",
  config: "qa.config",
} as const

const today = () => new Date().toISOString().slice(0, 10)
const daysFromNow = (d: number) => {
  const t = new Date(); t.setDate(t.getDate() + d)
  return t.toISOString().slice(0, 10)
}

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "inv_paracetamol", kind: "medication", name: "Paracetamol 500mg", sku: "MED-PCM-500", stock: 240, safetyStock: 100, unit: "tablets", expiryDate: daysFromNow(180), batchRef: "BAT-2026-0001", location: "Main warehouse · Shelf A2" },
  { id: "inv_amox", kind: "medication", name: "Amoxicillin 250mg", sku: "MED-AMX-250", stock: 30, safetyStock: 80, unit: "capsules", expiryDate: daysFromNow(45), batchRef: "BAT-2026-0002", location: "Main warehouse · Shelf B1" },
  { id: "inv_insulin", kind: "medication", name: "Insulin (cold-chain)", sku: "MED-INS-100", stock: 60, safetyStock: 40, unit: "vials", expiryDate: daysFromNow(15), batchRef: "BAT-2026-0003", location: "Cold room · Rack 1" },
  { id: "inv_bplus", kind: "device", name: "BP Monitor (digital)", sku: "DEV-BP-01", stock: 8, safetyStock: 5, unit: "units", location: "Devices cage" },
  { id: "inv_glucose", kind: "device", name: "Glucose meter", sku: "DEV-GLU-01", stock: 3, safetyStock: 10, unit: "units", location: "Devices cage" },
  { id: "inv_gloves", kind: "consumable", name: "Surgical gloves (M)", sku: "CON-GLV-M", stock: 1200, safetyStock: 400, unit: "pairs", expiryDate: daysFromNow(800), location: "Consumables · Rack 4" },
  { id: "inv_syringe", kind: "consumable", name: "Disposable syringe 5ml", sku: "CON-SYR-5", stock: 220, safetyStock: 500, unit: "units", expiryDate: daysFromNow(400), location: "Consumables · Rack 2" },
]

const DEFAULT_CONFIG: QaConfig = {
  expiryWarningDays: 90,
  expiryCriticalDays: 30,
  requireAllStepsForApproval: true,
  blockExpiredFromDispatch: true,
}

function blankSteps(): Record<StepKey, boolean> {
  return STEP_ORDER.reduce((acc, k) => { acc[k] = false; return acc }, {} as Record<StepKey, boolean>)
}

// =====================================================================
// Helpers
// =====================================================================

const KIND_LABEL: Record<ItemKind, string> = {
  medication: "Medication", device: "Device", consumable: "Consumable",
}

const KIND_ICON: Record<ItemKind, typeof Pill> = {
  medication: Pill, device: Wrench, consumable: Boxes,
}

const KIND_STYLE: Record<ItemKind, string> = {
  medication: "bg-rose-100 text-rose-800",
  device: "bg-violet-100 text-violet-800",
  consumable: "bg-sky-100 text-sky-800",
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

function expiryBucket(days: number | null, cfg: QaConfig): "none" | "ok" | "warn" | "critical" | "expired" {
  if (days === null) return "none"
  if (days < 0) return "expired"
  if (days <= cfg.expiryCriticalDays) return "critical"
  if (days <= cfg.expiryWarningDays) return "warn"
  return "ok"
}

const EXP_STYLE: Record<"none" | "ok" | "warn" | "critical" | "expired", string> = {
  none: "bg-gray-100 text-gray-600",
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-900",
  critical: "bg-orange-100 text-orange-800",
  expired: "bg-rose-100 text-rose-800",
}

// =====================================================================
// Tiny UI primitives (mirror logistics-ops)
// =====================================================================

function KpiCard({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string | number; hint?: string; icon: typeof Boxes
  accent?: "rose" | "emerald" | "amber" | "sky"
}) {
  const accentMap = {
    rose: "text-rose-700 bg-rose-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    sky: "text-sky-700 bg-sky-50",
  } as const
  const iconBg = accent ? accentMap[accent] : "text-[#3D0814] bg-[#3D0814]/10"
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${iconBg}`}><Icon className="h-3.5 w-3.5" /></div>
      </div>
      <p className="text-xl font-semibold mt-2">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function EmptyState({ icon: Icon, title, blurb }: { icon: typeof Boxes; title: string; blurb: string }) {
  return (
    <div className="border border-dashed border-border rounded-sm py-16 text-center">
      <Icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{blurb}</p>
    </div>
  )
}

function SectionHeader({ title, blurb, action }: { title: string; blurb?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0 max-w-2xl">
        <h2 className="text-base font-semibold">{title}</h2>
        {blurb && <p className="text-xs text-muted-foreground mt-1">{blurb}</p>}
      </div>
      {action}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

// =====================================================================
// Main module
// =====================================================================

type TabKey = "overview" | "inventory" | "stock-alerts" | "expiry" | "dispatch" | "settings"

const TABS: { key: TabKey; label: string; icon: typeof Boxes }[] = [
  { key: "overview",     label: "Overview",            icon: Activity },
  { key: "inventory",    label: "Stock-level tracking", icon: PackageSearch },
  { key: "stock-alerts", label: "Safety-stock alerts", icon: AlertTriangle },
  { key: "expiry",       label: "Expiry monitoring",   icon: CalendarX },
  { key: "dispatch",     label: "Dispatch QA",         icon: ClipboardCheck },
  { key: "settings",     label: "Settings",            icon: Settings2 },
]

export function AdminQaOps() {
  const [tab, setTab] = useState<TabKey>("overview")
  const [inventory, setInventory] = useCmsDoc<InventoryItem[]>(KEYS.inventory, DEFAULT_INVENTORY)
  const [checks, setChecks] = useCmsDoc<DispatchCheck[]>(KEYS.dispatch, [])
  const [config, setConfig] = useCmsDoc<QaConfig>(KEYS.config, DEFAULT_CONFIG)
  const { items: orders } = useAdminOrders()

  const kpis = useMemo(() => {
    const lowStock = inventory.filter((i) => i.stock <= i.safetyStock).length
    const expiringSoon = inventory.filter((i) => {
      const d = daysUntil(i.expiryDate)
      return d !== null && d >= 0 && d <= config.expiryWarningDays
    }).length
    const expired = inventory.filter((i) => {
      const d = daysUntil(i.expiryDate)
      return d !== null && d < 0
    }).length
    const totalSkus = inventory.length
    const approvedToday = checks.filter((c) => c.approvedAt && c.approvedAt.slice(0, 10) === today()).length
    const pending = checks.filter((c) => !c.approvedAt && !c.rejectedAt).length
    const approvedAll = checks.filter((c) => c.approvedAt).length
    const passRate = checks.length > 0 ? (approvedAll / checks.length) * 100 : 0
    return { lowStock, expiringSoon, expired, totalSkus, approvedToday, pending, passRate }
  }, [inventory, checks, config])

  return (
    <AdminShell title="QA · Operations">
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: WINE }}>
            Pipeline · QA &amp; Assurance
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <ShieldCheck className="h-5 w-5" />
            Stock &amp; dispatch QA
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Track stock levels, expiry windows and safety-stock alerts across devices, consumables
            and medication — then sign-off every outbound batch through the 7-step QA checklist.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const { pipelineClient } = await import("@/lib/pipeline-client")
                  const r = await pipelineClient.qa.scanExpiry()
                  alert(`QA scan complete\n\nExpired: ${r.expired}\nCritical: ${r.critical}\nWarning: ${r.warning}\nTotal flags: ${r.flags.length}`)
                } catch (e) {
                  alert(`Scan failed: ${e instanceof Error ? e.message : String(e)}`)
                }
              }}
              className="text-[12px] px-3 py-1.5 rounded-sm border border-border bg-background hover:bg-muted inline-flex items-center gap-1.5"
              style={{ color: WINE }}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Run server expiry scan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="SKUs tracked" value={kpis.totalSkus} icon={PackageSearch} />
          <KpiCard label="Low stock" value={kpis.lowStock} hint="At / below safety stock" icon={AlertTriangle} accent={kpis.lowStock > 0 ? "amber" : "emerald"} />
          <KpiCard label="Expiring soon" value={kpis.expiringSoon} hint={`Within ${config.expiryWarningDays}d`} icon={CalendarX} accent={kpis.expiringSoon > 0 ? "amber" : "emerald"} />
          <KpiCard label="Expired" value={kpis.expired} hint="Pull from sellable stock" icon={CalendarX} accent={kpis.expired > 0 ? "rose" : "emerald"} />
          <KpiCard label="QA pending" value={kpis.pending} hint="Awaiting sign-off" icon={ClipboardCheck} accent={kpis.pending > 0 ? "amber" : "emerald"} />
          <KpiCard label="Approved today" value={kpis.approvedToday} icon={CheckCircle2} accent="emerald" />
          <KpiCard label="QA pass rate" value={`${kpis.passRate.toFixed(0)}%`} hint={`${checks.length} checks total`} icon={ShieldCheck} accent={kpis.passRate >= 90 ? "emerald" : kpis.passRate >= 70 ? "amber" : "rose"} />
        </div>

        <div className="border-b border-border">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                    tab === t.key ? "border-[#3D0814] text-[#3D0814]" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {tab === "overview" && <OverviewTab inventory={inventory} checks={checks} config={config} onJump={setTab} />}
        {tab === "inventory" && <InventoryTab inventory={inventory} setInventory={setInventory} config={config} />}
        {tab === "stock-alerts" && <StockAlertsTab inventory={inventory} setInventory={setInventory} />}
        {tab === "expiry" && <ExpiryTab inventory={inventory} config={config} />}
        {tab === "dispatch" && <DispatchTab checks={checks} setChecks={setChecks} inventory={inventory} config={config} orders={orders} />}
        {tab === "settings" && <SettingsTab config={config} setConfig={setConfig} />}
      </div>
    </AdminShell>
  )
}

// =====================================================================
// Overview
// =====================================================================

function OverviewTab({
  inventory, checks, config, onJump,
}: {
  inventory: InventoryItem[]
  checks: DispatchCheck[]
  config: QaConfig
  onJump: (t: TabKey) => void
}) {
  const lowStock = inventory.filter((i) => i.stock <= i.safetyStock).slice(0, 6)
  const expiringSoon = inventory
    .filter((i) => {
      const d = daysUntil(i.expiryDate)
      return d !== null && d <= config.expiryWarningDays
    })
    .sort((a, b) => (daysUntil(a.expiryDate)! - daysUntil(b.expiryDate)!))
    .slice(0, 6)
  const pendingChecks = checks.filter((c) => !c.approvedAt && !c.rejectedAt).slice(0, 6)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <OverviewCard title="Safety-stock alerts" onJump={() => onJump("stock-alerts")} empty={lowStock.length === 0 ? "Every SKU is above safety stock." : null}>
        {lowStock.map((i) => (
          <li key={i.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{i.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{i.sku}</p>
            </div>
            <Badge className="text-[10px] border-0 bg-rose-100 text-rose-800 flex-shrink-0">{i.stock} / {i.safetyStock} {i.unit}</Badge>
          </li>
        ))}
      </OverviewCard>

      <OverviewCard title="Expiring soon" onJump={() => onJump("expiry")} empty={expiringSoon.length === 0 ? "Nothing expiring inside the warning window." : null}>
        {expiringSoon.map((i) => {
          const d = daysUntil(i.expiryDate)!
          const bucket = expiryBucket(d, config)
          return (
            <li key={i.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{i.name}</p>
                <p className="text-[11px] text-muted-foreground">{i.expiryDate}</p>
              </div>
              <Badge className={`text-[10px] border-0 flex-shrink-0 ${EXP_STYLE[bucket]}`}>{d < 0 ? `Expired ${-d}d ago` : `${d}d left`}</Badge>
            </li>
          )
        })}
      </OverviewCard>

      <OverviewCard title="QA checks pending" onJump={() => onJump("dispatch")} empty={pendingChecks.length === 0 ? "No outstanding QA checks." : null}>
        {pendingChecks.map((c) => {
          const done = STEP_ORDER.filter((k) => c.steps[k]).length
          return (
            <li key={c.id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium font-mono text-xs">{c.batchRef}</p>
                <p className="text-[11px] text-muted-foreground">{c.checkedBy || "Unassigned"}</p>
              </div>
              <Badge className="text-[10px] border-0 bg-amber-100 text-amber-900 flex-shrink-0">{done}/{STEP_ORDER.length}</Badge>
            </li>
          )
        })}
      </OverviewCard>
    </div>
  )
}

function OverviewCard({ title, onJump, empty, children }: { title: string; onJump: () => void; empty: string | null; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">{title}</p>
        <button type="button" onClick={onJump} className="text-xs text-[#3D0814] hover:underline">Open</button>
      </div>
      {empty ? (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </div>
  )
}

// =====================================================================
// Inventory (Stock-Level Tracking)
// =====================================================================

function InventoryTab({
  inventory, setInventory, config,
}: {
  inventory: InventoryItem[]
  setInventory: (next: InventoryItem[] | ((p: InventoryItem[]) => InventoryItem[])) => void
  config: QaConfig
}) {
  const [kindFilter, setKindFilter] = useState<ItemKind | "all">("all")
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [open, setOpen] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return inventory.filter((i) => {
      if (kindFilter !== "all" && i.kind !== kindFilter) return false
      if (q && !i.name.toLowerCase().includes(q) && !i.sku.toLowerCase().includes(q)) return false
      return true
    })
  }, [inventory, kindFilter, query])

  const startNew = () => {
    setEditing({ id: newId("inv"), kind: "medication", name: "", sku: "", stock: 0, safetyStock: 0, unit: "units", location: "", expiryDate: "" })
    setOpen(true)
  }
  const save = () => {
    if (!editing || !editing.name.trim() || !editing.sku.trim()) return
    const normalized = { ...editing, expiryDate: editing.expiryDate || undefined }
    setInventory((prev) => {
      const idx = prev.findIndex((i) => i.id === editing.id)
      return idx === -1 ? [normalized, ...prev] : prev.map((i) => i.id === editing.id ? normalized : i)
    })
    setOpen(false); setEditing(null)
  }
  const remove = (id: string) => {
    if (!confirm("Remove this item from inventory?")) return
    setInventory((prev) => prev.filter((i) => i.id !== id))
  }
  const adjust = (id: string, delta: number) => {
    setInventory((prev) => prev.map((i) => i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Stock-level tracking"
        blurb="Single ledger across Device, Consumables and Medication inventory. Safety-stock and expiry windows are derived from these rows."
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU" className="h-9 w-[200px] pl-8" />
            </div>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> Add item</Button>
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No items match" blurb="Adjust filters or add a new SKU." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-left px-4 py-3 font-medium">Kind</th>
                <th className="text-left px-4 py-3 font-medium">Stock</th>
                <th className="text-left px-4 py-3 font-medium">Safety</th>
                <th className="text-left px-4 py-3 font-medium">Expiry</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((i) => {
                const low = i.stock <= i.safetyStock
                const d = daysUntil(i.expiryDate)
                const bucket = expiryBucket(d, config)
                const KindIcon = KIND_ICON[i.kind]
                return (
                  <tr key={i.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{i.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{i.sku} {i.batchRef && <>· {i.batchRef}</>}</p>
                    </td>
                    <td className="px-4 py-3"><Badge className={`text-[10px] border-0 inline-flex items-center gap-1 ${KIND_STYLE[i.kind]}`}><KindIcon className="h-3 w-3" /> {KIND_LABEL[i.kind]}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[11px]" onClick={() => adjust(i.id, -1)}>−</Button>
                        <span className={`font-mono text-xs w-12 text-center ${low ? "text-rose-700 font-semibold" : ""}`}>{i.stock}</span>
                        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[11px]" onClick={() => adjust(i.id, +1)}>+</Button>
                        <span className="text-[10px] text-muted-foreground ml-1">{i.unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{i.safetyStock}</td>
                    <td className="px-4 py-3 text-xs">
                      {i.expiryDate ? (
                        <Badge className={`text-[10px] border-0 ${EXP_STYLE[bucket]}`}>
                          {d! < 0 ? `Expired ${-d!}d` : `${d}d · ${i.expiryDate}`}
                        </Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{i.location || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(i); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && inventory.some((i) => i.id === editing.id) ? "Edit item" : "Add inventory item"}</DialogTitle>
            <DialogDescription>Device, consumable or medication. Safety stock drives the low-stock alert; expiry drives the expiry monitor.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kind">
                  <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as ItemKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="SKU"><Input value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} placeholder="MED-XYZ-100" /></Field>
              </div>
              <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Stock"><Input type="number" min={0} value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) || 0 })} /></Field>
                <Field label="Safety stock"><Input type="number" min={0} value={editing.safetyStock} onChange={(e) => setEditing({ ...editing, safetyStock: Number(e.target.value) || 0 })} /></Field>
                <Field label="Unit"><Input value={editing.unit} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="tablets" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiry date (optional)"><Input type="date" value={editing.expiryDate ?? ""} onChange={(e) => setEditing({ ...editing, expiryDate: e.target.value })} /></Field>
                <Field label="Batch ref (optional)"><Input value={editing.batchRef ?? ""} onChange={(e) => setEditing({ ...editing, batchRef: e.target.value })} /></Field>
              </div>
              <Field label="Storage location"><Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Main warehouse · Shelf A2" /></Field>
              <Field label="Notes"><Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={save} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================================
// Stock alerts (derived)
// =====================================================================

function StockAlertsTab({
  inventory, setInventory,
}: {
  inventory: InventoryItem[]
  setInventory: (next: InventoryItem[] | ((p: InventoryItem[]) => InventoryItem[])) => void
}) {
  const low = inventory.filter((i) => i.stock <= i.safetyStock).slice().sort((a, b) => (a.stock / Math.max(1, a.safetyStock)) - (b.stock / Math.max(1, b.safetyStock)))
  const bump = (id: string) => {
    const item = inventory.find((i) => i.id === id)
    if (!item) return
    const v = prompt(`Restock ${item.name} by how many ${item.unit}?`, "100")
    if (!v) return
    const n = Number(v); if (!Number.isFinite(n) || n <= 0) return
    setInventory((prev) => prev.map((i) => i.id === id ? { ...i, stock: i.stock + n } : i))
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Safety-stock alerts" blurb="Every SKU at or below its safety-stock threshold. Sorted by severity." />
      {low.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="All stock above safety thresholds" blurb="Set safety stock per item in the Inventory tab." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-left px-4 py-3 font-medium">Current</th>
                <th className="text-left px-4 py-3 font-medium">Safety</th>
                <th className="text-left px-4 py-3 font-medium">Gap</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {low.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{i.sku} · {KIND_LABEL[i.kind]}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-rose-700 font-semibold">{i.stock}</td>
                  <td className="px-4 py-3 font-mono text-xs">{i.safetyStock}</td>
                  <td className="px-4 py-3 font-mono text-xs">{i.safetyStock - i.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => bump(i.id)}>Restock</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// =====================================================================
// Expiry monitoring (derived)
// =====================================================================

function ExpiryTab({ inventory, config }: { inventory: InventoryItem[]; config: QaConfig }) {
  const withExpiry = inventory.filter((i) => i.expiryDate).slice().sort((a, b) => (daysUntil(a.expiryDate)! - daysUntil(b.expiryDate)!))
  const buckets = {
    expired: withExpiry.filter((i) => daysUntil(i.expiryDate)! < 0),
    critical: withExpiry.filter((i) => { const d = daysUntil(i.expiryDate)!; return d >= 0 && d <= config.expiryCriticalDays }),
    warn: withExpiry.filter((i) => { const d = daysUntil(i.expiryDate)!; return d > config.expiryCriticalDays && d <= config.expiryWarningDays }),
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Expiry monitoring"
        blurb={`Items by expiry window. Critical = within ${config.expiryCriticalDays}d, warning = within ${config.expiryWarningDays}d. Adjust under Settings.`}
      />
      <ExpirySection title="Expired" items={buckets.expired} bucket="expired" emptyText="No expired stock." />
      <ExpirySection title={`Critical (≤ ${config.expiryCriticalDays} days)`} items={buckets.critical} bucket="critical" emptyText="No items in the critical window." />
      <ExpirySection title={`Warning (≤ ${config.expiryWarningDays} days)`} items={buckets.warn} bucket="warn" emptyText="No items in the warning window." />
    </div>
  )
}

function ExpirySection({ title, items, bucket, emptyText }: { title: string; items: InventoryItem[]; bucket: "expired" | "critical" | "warn"; emptyText: string }) {
  return (
    <div className="border border-border rounded-sm">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Badge className={`text-[10px] border-0 ${EXP_STYLE[bucket]}`}>{items.length} item{items.length === 1 ? "" : "s"}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Item</th>
              <th className="text-left px-4 py-2 font-medium">Expiry</th>
              <th className="text-left px-4 py-2 font-medium">Stock</th>
              <th className="text-left px-4 py-2 font-medium">Batch</th>
              <th className="text-left px-4 py-2 font-medium">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((i) => {
              const d = daysUntil(i.expiryDate)!
              return (
                <tr key={i.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{i.sku}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">{i.expiryDate} <span className="text-muted-foreground">({d < 0 ? `${-d}d ago` : `${d}d`})</span></td>
                  <td className="px-4 py-2 font-mono text-xs">{i.stock} {i.unit}</td>
                  <td className="px-4 py-2 font-mono text-xs">{i.batchRef ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{i.location || "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// =====================================================================
// Dispatch QA (7-step checklist)
// =====================================================================

function DispatchTab({
  checks, setChecks, inventory, config, orders,
}: {
  checks: DispatchCheck[]
  setChecks: (next: DispatchCheck[] | ((p: DispatchCheck[]) => DispatchCheck[])) => void
  inventory: InventoryItem[]
  config: QaConfig
  orders: AdminOrderRecord[]
}) {
  const [editing, setEditing] = useState<DispatchCheck | null>(null)
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")

  // Confirmed (paid) orders that don't yet have a QA gate opened against them.
  const awaitingQa = useMemo(() => {
    // A check references an order via orderRef, or (for manual checks with no
    // orderRef) via a batchRef that equals the order number — dedupe on both.
    const referenced = new Set<string>()
    for (const c of checks) {
      if (c.orderRef) referenced.add(c.orderRef)
      if (c.batchRef) referenced.add(c.batchRef)
    }
    return orders
      .filter((o) => o.status === "confirmed" && !referenced.has(o.orderNo))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [orders, checks])

  // Open a 7-step QA gate for a specific confirmed order (mirrors the logistics queue pattern).
  const startForOrder = (order: AdminOrderRecord) => {
    setChecks((prev) =>
      prev.some((c) => c.orderRef === order.orderNo)
        ? prev
        : [{
            id: newId("qac"),
            batchRef: order.orderNo,
            orderRef: order.orderNo,
            steps: blankSteps(),
            notes: "",
            checkedBy: "",
            createdAt: new Date().toISOString(),
          }, ...prev],
    )
  }

  const list = checks.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((c) => {
    if (statusFilter === "pending") return !c.approvedAt && !c.rejectedAt
    if (statusFilter === "approved") return !!c.approvedAt
    if (statusFilter === "rejected") return !!c.rejectedAt
    return true
  })

  const startNew = () => {
    setEditing({
      id: newId("qac"), batchRef: "", orderRef: "",
      steps: blankSteps(), notes: "", checkedBy: "",
      createdAt: new Date().toISOString(),
    })
    setOpen(true)
  }
  const save = () => {
    if (!editing || !editing.batchRef.trim()) return
    setChecks((prev) => {
      const idx = prev.findIndex((c) => c.id === editing.id)
      return idx === -1 ? [editing, ...prev] : prev.map((c) => c.id === editing.id ? editing : c)
    })
    setOpen(false); setEditing(null)
  }
  const toggleStep = (id: string, step: StepKey) => {
    setChecks((prev) => prev.map((c) => c.id === id ? { ...c, steps: { ...c.steps, [step]: !c.steps[step] } } : c))
  }
  const approve = (c: DispatchCheck) => {
    if (config.requireAllStepsForApproval) {
      const allDone = STEP_ORDER.every((k) => c.steps[k])
      if (!allDone) { alert("Cannot approve — all 7 QA steps must be checked first."); return }
    }
    if (config.blockExpiredFromDispatch) {
      const expired = inventory.filter((i) => i.batchRef && i.batchRef === c.batchRef && i.expiryDate && daysUntil(i.expiryDate)! < 0)
      if (expired.length > 0) { alert(`Cannot approve — ${expired.length} SKU(s) in this batch are expired.`); return }
    }
    setChecks((prev) => prev.map((x) => x.id === c.id ? { ...x, approvedAt: new Date().toISOString(), rejectedAt: undefined, rejectionReason: undefined } : x))
  }
  const reject = (c: DispatchCheck) => {
    const reason = prompt("Reason for rejection:")
    if (!reason) return
    setChecks((prev) => prev.map((x) => x.id === c.id ? { ...x, rejectedAt: new Date().toISOString(), rejectionReason: reason, approvedAt: undefined } : x))
  }
  const remove = (id: string) => {
    if (!confirm("Delete this QA check?")) return
    setChecks((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Dispatch QA checklist"
        blurb="The 7-step gate before any batch goes out: prep → batch verification → expiry → prescription match → storage → final pack → QA approved."
        action={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> New QA check</Button>
          </div>
        }
      />

      {awaitingQa.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/60 rounded-sm">
          <div className="px-4 py-2.5 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">Paid orders awaiting QA ({awaitingQa.length})</p>
            <span className="text-[11px] text-amber-700/80">Confirmed orders must clear the 7-step gate before dispatch.</span>
          </div>
          <ul className="divide-y divide-amber-100">
            {awaitingQa.map((o) => (
              <li key={o.orderNo} className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{o.orderNo}</p>
                  <p className="text-[11px] text-muted-foreground">{o.customer || "—"} · {o.items?.length ?? 0} item(s) · confirmed {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" onClick={() => startForOrder(o)} className="h-8 bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" /> Start QA</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No QA checks yet" blurb="Open a check against an outbound batch to start the 7-step sign-off, or start one from a paid order above." />
      ) : (
        <ul className="space-y-3">
          {list.map((c) => {
            const done = STEP_ORDER.filter((k) => c.steps[k]).length
            const status = c.approvedAt ? "approved" : c.rejectedAt ? "rejected" : "pending"
            const statusStyle = status === "approved" ? "bg-emerald-100 text-emerald-800" : status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"
            return (
              <li key={c.id} className="border border-border rounded-sm bg-background">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="min-w-0">
                    <p className="font-medium font-mono text-sm">{c.batchRef} {c.orderRef && <span className="text-muted-foreground font-normal text-xs">· {c.orderRef}</span>}</p>
                    <p className="text-[11px] text-muted-foreground">By {c.checkedBy || "—"} · {new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] border-0 ${statusStyle} capitalize`}>{status}</Badge>
                    <Badge className="text-[10px] border-0 bg-secondary text-foreground">{done}/{STEP_ORDER.length} steps</Badge>
                    {status !== "approved" && <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => approve(c)}>Approve <CheckCircle2 className="h-3 w-3" /></Button>}
                    {status === "pending" && <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-rose-700 border-rose-200" onClick={() => reject(c)}>Reject</Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <ol className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
                  {STEP_ORDER.map((k, idx) => {
                    const isDone = c.steps[k]
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          onClick={() => toggleStep(c.id, k)}
                          disabled={status === "approved"}
                          className={`w-full text-left rounded-sm border px-3 py-2 transition-colors ${
                            isDone
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-border bg-background hover:bg-secondary/40"
                          } ${status === "approved" ? "opacity-70 cursor-default" : ""}`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white" style={{ background: isDone ? "#059669" : WINE }}>{idx + 1}</span>
                            Step {idx + 1}
                          </div>
                          <p className="text-xs font-medium mt-1 leading-tight">{STEP_LABEL[k]}</p>
                          {isDone && <p className="text-[10px] text-emerald-700 mt-0.5 inline-flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Done</p>}
                        </button>
                      </li>
                    )
                  })}
                </ol>
                {c.notes && <p className="px-4 pb-3 text-xs text-muted-foreground"><strong>Notes:</strong> {c.notes}</p>}
                {c.rejectionReason && <p className="px-4 pb-3 text-xs text-rose-700"><strong>Rejection:</strong> {c.rejectionReason}</p>}
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && checks.some((c) => c.id === editing.id) ? "Edit QA check" : "New QA check"}</DialogTitle>
            <DialogDescription>Open a 7-step QA gate for a specific outbound batch (and optionally an order).</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Batch ref"><Input value={editing.batchRef} onChange={(e) => setEditing({ ...editing, batchRef: e.target.value })} placeholder="BAT-2026-0014" /></Field>
                <Field label="Order ref (optional)"><Input value={editing.orderRef ?? ""} onChange={(e) => setEditing({ ...editing, orderRef: e.target.value })} placeholder="ORD-1042" /></Field>
              </div>
              <Field label="Checked by"><Input value={editing.checkedBy} onChange={(e) => setEditing({ ...editing, checkedBy: e.target.value })} placeholder="Pharmacist name" /></Field>
              <Field label="Notes"><Textarea rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={save} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================================
// Settings
// =====================================================================

function SettingsTab({
  config, setConfig,
}: {
  config: QaConfig
  setConfig: (next: QaConfig | ((p: QaConfig) => QaConfig)) => void
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <SectionHeader title="QA settings" blurb="Expiry windows and approval gates." />
      <div className="border border-border rounded-sm p-5 space-y-4 bg-background">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Expiry critical window (days)"><Input type="number" min={1} value={config.expiryCriticalDays} onChange={(e) => setConfig({ ...config, expiryCriticalDays: Number(e.target.value) || 1 })} /></Field>
          <Field label="Expiry warning window (days)"><Input type="number" min={1} value={config.expiryWarningDays} onChange={(e) => setConfig({ ...config, expiryWarningDays: Number(e.target.value) || 1 })} /></Field>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label className="text-sm font-medium">Require all 7 steps for approval</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">Block QA approval until every step is checked.</p>
            </div>
            <Switch checked={config.requireAllStepsForApproval} onCheckedChange={(v) => setConfig({ ...config, requireAllStepsForApproval: v })} />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label className="text-sm font-medium">Block expired stock from dispatch</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">If any SKU in the batch is expired, refuse the QA sign-off.</p>
            </div>
            <Switch checked={config.blockExpiredFromDispatch} onCheckedChange={(v) => setConfig({ ...config, blockExpiredFromDispatch: v })} />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Saved to <code>cmsStore["{KEYS.config}"]</code>. Migrates to the NestJS QA module without UI changes.</p>
    </div>
  )
}

// Re-export under the existing AdminQa name so App.tsx works unchanged.
export { AdminQaOps as AdminQa }

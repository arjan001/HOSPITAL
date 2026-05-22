"use client"

/**
 * Logistics Operations — functional implementation of every node in the
 * delivery flow diagram (Untitled_1778958446224.png):
 *
 *   Delivery Route Assignment → Batch Dispatch Scheduling → Last-Mile
 *   Tracking → (Delivery Success?) → Delivery Confirmation
 *                                  → Failed Delivery Handling
 *   plus Zoning Strategy, Cold Chain Prep, Batch Planning, Rider Model,
 *   Fulfillment Time, Only Left Turn rule, Orders per Batch, Address
 *   Resolution, SLA & Exceptions, Cost Control.
 *
 * One CMS module — all entities persist via `cmsStore` so the NestJS port
 * is a one-file swap (see `cms-store.ts`).
 */

import { useMemo, useState } from "react"
import {
  Truck, MapPin, Route, Boxes, Snowflake, Users, AlertTriangle,
  CheckCircle2, XCircle, Plus, Pencil, Trash2, ArrowRight, Settings2,
  Timer, Wallet, Activity, Layers, ClipboardCheck, PackageCheck,
} from "lucide-react"
import { useCmsDoc, newId } from "@/lib/cms-store"
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

type VehicleType = "motorcycle" | "bicycle" | "van" | "cold_van"
type BatchStatus = "planned" | "dispatched" | "in_progress" | "completed" | "cancelled"
type DeliveryStatus =
  | "pending" | "assigned" | "dispatched"
  | "out_for_delivery" | "delivered" | "failed"
type ExceptionType = "failed_delivery" | "address" | "sla" | "cost"

interface Zone {
  id: string
  name: string
  areas: string         // free-text: "Westlands, Parklands, Kileleshwa"
  slaHours: number      // target time-to-deliver
  surcharge: number     // KES additive to delivery fee
  coldChainCapable: boolean
  active: boolean
}

interface Rider {
  id: string
  name: string
  phone: string
  vehicle: VehicleType
  capacity: number      // max orders per batch
  zoneId: string | null
  coldChainCapable: boolean
  active: boolean
  notes?: string
}

interface Batch {
  id: string
  ref: string           // human-readable e.g. "BAT-2026-0014"
  zoneId: string | null
  riderId: string | null
  scheduledAt: string   // ISO
  status: BatchStatus
  orderIds: string[]    // free-text order refs
  coldChain: boolean
  notes?: string
  createdAt: string
  dispatchedAt?: string
  completedAt?: string
}

interface Delivery {
  id: string
  orderRef: string
  customerName: string
  customerPhone: string
  address: string
  zoneId: string | null
  batchId: string | null
  riderId: string | null
  status: DeliveryStatus
  attempts: number
  codAmount: number
  estimatedCost: number   // for Cost Control
  failureReason?: string
  createdAt: string
  dispatchedAt?: string
  deliveredAt?: string
  slaHours?: number       // captured at dispatch
}

interface ColdChainCheck {
  id: string
  batchId: string
  tempBefore: number     // °C
  tempAfter: number      // °C — at handoff
  packagedBy: string
  packagedAt: string     // ISO
  passed: boolean
  notes?: string
}

interface ExceptionItem {
  id: string
  deliveryId: string | null
  type: ExceptionType
  summary: string
  resolution: string
  cost?: number
  createdAt: string
  resolvedAt?: string
}

interface LogisticsConfig {
  targetOrdersPerBatch: number
  targetSlaHours: number
  costCapPerDelivery: number
  onlyLeftTurnRule: boolean      // routing rule (UPS-style)
  autoAssignRiders: boolean
  smsCustomerOnDispatch: boolean
  smsCustomerOnDelivery: boolean
}

// =====================================================================
// CMS keys + defaults
// =====================================================================

const KEYS = {
  zones: "logistics.zones",
  riders: "logistics.riders",
  batches: "logistics.batches",
  deliveries: "logistics.deliveries",
  coldChecks: "logistics.cold-chain-checks",
  exceptions: "logistics.exceptions",
  config: "logistics.config",
} as const

const DEFAULT_ZONES: Zone[] = [
  { id: "zn_cbd", name: "Nairobi CBD", areas: "CBD, Upper Hill", slaHours: 4, surcharge: 0, coldChainCapable: true, active: true },
  { id: "zn_west", name: "Westlands & Parklands", areas: "Westlands, Parklands, Kileleshwa", slaHours: 6, surcharge: 50, coldChainCapable: true, active: true },
  { id: "zn_east", name: "Eastlands", areas: "Donholm, Buruburu, Embakasi", slaHours: 8, surcharge: 100, coldChainCapable: false, active: true },
  { id: "zn_outer", name: "Outside Nairobi", areas: "Kiambu, Thika, Athi River", slaHours: 48, surcharge: 250, coldChainCapable: false, active: true },
]

const DEFAULT_RIDERS: Rider[] = [
  { id: "rdr_amani", name: "Amani K.", phone: "+254700000001", vehicle: "motorcycle", capacity: 8, zoneId: "zn_cbd", coldChainCapable: false, active: true },
  { id: "rdr_zahra", name: "Zahra M.", phone: "+254700000002", vehicle: "motorcycle", capacity: 8, zoneId: "zn_west", coldChainCapable: false, active: true },
  { id: "rdr_juma", name: "Juma O.", phone: "+254700000003", vehicle: "cold_van", capacity: 20, zoneId: "zn_cbd", coldChainCapable: true, active: true },
]

const DEFAULT_CONFIG: LogisticsConfig = {
  targetOrdersPerBatch: 8,
  targetSlaHours: 6,
  costCapPerDelivery: 350,
  onlyLeftTurnRule: false,
  autoAssignRiders: true,
  smsCustomerOnDispatch: true,
  smsCustomerOnDelivery: true,
}

// =====================================================================
// Helpers
// =====================================================================

const VEHICLE_LABEL: Record<VehicleType, string> = {
  motorcycle: "Motorcycle", bicycle: "Bicycle", van: "Van", cold_van: "Cold-chain van",
}

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  assigned: "bg-sky-100 text-sky-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-amber-100 text-amber-900",
  delivered: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
}

const BATCH_STYLE: Record<BatchStatus, string> = {
  planned: "bg-gray-100 text-gray-700",
  dispatched: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-amber-100 text-amber-900",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
}

const EXC_STYLE: Record<ExceptionType, string> = {
  failed_delivery: "bg-rose-100 text-rose-800",
  address: "bg-amber-100 text-amber-900",
  sla: "bg-orange-100 text-orange-800",
  cost: "bg-violet-100 text-violet-800",
}

const EXC_LABEL: Record<ExceptionType, string> = {
  failed_delivery: "Failed delivery",
  address: "Address resolution",
  sla: "SLA breach",
  cost: "Cost control",
}

function nextBatchRef(existing: Batch[]): string {
  const year = new Date().getFullYear()
  const seq = existing.filter((b) => b.ref.startsWith(`BAT-${year}`)).length + 1
  return `BAT-${year}-${String(seq).padStart(4, "0")}`
}

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
}

// =====================================================================
// Tiny UI primitives
// =====================================================================

function KpiCard({ label, value, hint, icon: Icon, accent }: {
  label: string
  value: string | number
  hint?: string
  icon: typeof Truck
  accent?: "rose" | "emerald" | "amber" | "sky"
}) {
  const accentMap = {
    rose: "text-rose-700 bg-rose-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    sky: "text-sky-700 bg-sky-50",
  } as const
  const wineCls = "text-[#3D0814] bg-[#3D0814]/10"
  const iconBg = accent ? accentMap[accent] : wineCls
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-xl font-semibold mt-2">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function EmptyState({ icon: Icon, title, blurb }: { icon: typeof Truck; title: string; blurb: string }) {
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

// =====================================================================
// Main module
// =====================================================================

type TabKey =
  | "overview" | "zones" | "riders" | "batches" | "routing"
  | "tracking" | "cold-chain" | "exceptions" | "settings"

const TABS: { key: TabKey; label: string; icon: typeof Truck }[] = [
  { key: "overview",   label: "Overview",          icon: Activity },
  { key: "zones",      label: "Zoning",            icon: MapPin },
  { key: "riders",     label: "Riders",            icon: Users },
  { key: "batches",    label: "Batches & dispatch", icon: Boxes },
  { key: "routing",    label: "Route assignment",  icon: Route },
  { key: "tracking",   label: "Last-mile tracking", icon: Truck },
  { key: "cold-chain", label: "Cold chain",        icon: Snowflake },
  { key: "exceptions", label: "Exceptions",        icon: AlertTriangle },
  { key: "settings",   label: "Settings",          icon: Settings2 },
]

export function AdminLogisticsOps() {
  const [tab, setTab] = useState<TabKey>("overview")
  const [zones, setZones] = useCmsDoc<Zone[]>(KEYS.zones, DEFAULT_ZONES)
  const [riders, setRiders] = useCmsDoc<Rider[]>(KEYS.riders, DEFAULT_RIDERS)
  const [batches, setBatches] = useCmsDoc<Batch[]>(KEYS.batches, [])
  const [deliveries, setDeliveries] = useCmsDoc<Delivery[]>(KEYS.deliveries, [])
  const [coldChecks, setColdChecks] = useCmsDoc<ColdChainCheck[]>(KEYS.coldChecks, [])
  const [exceptions, setExceptions] = useCmsDoc<ExceptionItem[]>(KEYS.exceptions, [])
  const [config, setConfig] = useCmsDoc<LogisticsConfig>(KEYS.config, DEFAULT_CONFIG)

  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones])
  const riderById = useMemo(() => new Map(riders.map((r) => [r.id, r])), [riders])
  const batchById = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches])

  const runAutoAssign = async () => {
    try {
      const { pipelineClient } = await import("@/lib/pipeline-client")
      const r = await pipelineClient.logistics.autoAssign()
      alert(`Auto-assign complete\n\nAssigned: ${r.assigned}\nSkipped: ${r.skipped}\nSLA at risk: ${r.slaAtRisk}${r.notes.length > 0 ? "\n\n" + r.notes.join("\n") : ""}`)
    } catch (e) {
      alert(`Auto-assign failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ---- KPIs (Fulfillment Time, Orders per Batch, SLA %, Cost) ----
  const kpis = useMemo(() => {
    const delivered = deliveries.filter((d) => d.status === "delivered" && d.deliveredAt && d.createdAt)
    const fulfillment = delivered.length > 0
      ? delivered.reduce((s, d) => s + hoursBetween(d.createdAt, d.deliveredAt!), 0) / delivered.length
      : 0
    const ordersPerBatch = batches.length > 0
      ? batches.reduce((s, b) => s + b.orderIds.length, 0) / batches.length
      : 0
    const slaMet = delivered.filter((d) => {
      const sla = d.slaHours ?? config.targetSlaHours
      return hoursBetween(d.createdAt, d.deliveredAt!) <= sla
    }).length
    const slaPct = delivered.length > 0 ? (slaMet / delivered.length) * 100 : 0
    const costSum = deliveries.reduce((s, d) => s + (d.estimatedCost || 0), 0)
    const overCap = deliveries.filter((d) => d.estimatedCost > config.costCapPerDelivery).length
    return {
      fulfillment, ordersPerBatch, slaPct, costSum, overCap,
      activeRiders: riders.filter((r) => r.active).length,
      openBatches: batches.filter((b) => b.status !== "completed" && b.status !== "cancelled").length,
      inFlight: deliveries.filter((d) => ["dispatched", "out_for_delivery", "assigned"].includes(d.status)).length,
      failed: deliveries.filter((d) => d.status === "failed").length,
    }
  }, [deliveries, batches, riders, config])

  return (
    <AdminShell title="Logistics · Operations">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: WINE }}>
            Pipeline · Logistics
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <Truck className="h-5 w-5" />
            Delivery operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            From zoning → batch planning → rider assignment → last-mile tracking → confirmation or
            exception handling. Everything below persists locally and will migrate to the NestJS
            logistics module in one step.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={runAutoAssign}
              className="text-[12px] px-3 py-1.5 rounded-sm border border-border bg-background hover:bg-muted inline-flex items-center gap-1.5"
              style={{ color: WINE }}
            >
              <Truck className="h-3.5 w-3.5" /> Run server auto-assign
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiCard label="Open batches" value={kpis.openBatches} hint="Planned / dispatched / in progress" icon={Boxes} />
          <KpiCard label="In flight" value={kpis.inFlight} hint="Assigned, dispatched or out for delivery" icon={Truck} accent="sky" />
          <KpiCard label="Active riders" value={`${kpis.activeRiders}/${riders.length}`} hint="Available for dispatch" icon={Users} accent="emerald" />
          <KpiCard label="Fulfillment time" value={kpis.fulfillment > 0 ? `${kpis.fulfillment.toFixed(1)}h` : "—"} hint={`Target ${config.targetSlaHours}h`} icon={Timer} accent={kpis.fulfillment > config.targetSlaHours ? "rose" : "emerald"} />
          <KpiCard label="Orders / batch" value={kpis.ordersPerBatch > 0 ? kpis.ordersPerBatch.toFixed(1) : "—"} hint={`Target ${config.targetOrdersPerBatch}`} icon={Layers} />
          <KpiCard label="SLA met" value={`${kpis.slaPct.toFixed(0)}%`} hint={`${kpis.failed} failed`} icon={CheckCircle2} accent={kpis.slaPct >= 90 ? "emerald" : kpis.slaPct >= 70 ? "amber" : "rose"} />
          <KpiCard label="Cost over cap" value={kpis.overCap} hint={`Cap KES ${config.costCapPerDelivery}`} icon={Wallet} accent={kpis.overCap > 0 ? "amber" : "emerald"} />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                    tab === t.key
                      ? "border-[#3D0814] text-[#3D0814]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {tab === "overview" && (
          <OverviewTab
            deliveries={deliveries}
            batches={batches}
            exceptions={exceptions}
            zoneById={zoneById}
            riderById={riderById}
            onJump={setTab}
          />
        )}
        {tab === "zones" && <ZonesTab zones={zones} setZones={setZones} />}
        {tab === "riders" && <RidersTab riders={riders} setRiders={setRiders} zones={zones} />}
        {tab === "batches" && (
          <BatchesTab
            batches={batches} setBatches={setBatches}
            zones={zones} riders={riders} riderById={riderById} zoneById={zoneById}
            deliveries={deliveries} setDeliveries={setDeliveries}
            config={config}
          />
        )}
        {tab === "routing" && (
          <RoutingTab
            batches={batches} setBatches={setBatches}
            deliveries={deliveries}
            zoneById={zoneById} riderById={riderById}
            config={config}
          />
        )}
        {tab === "tracking" && (
          <TrackingTab
            deliveries={deliveries} setDeliveries={setDeliveries}
            zoneById={zoneById} riderById={riderById} batchById={batchById}
            exceptions={exceptions} setExceptions={setExceptions}
            config={config}
          />
        )}
        {tab === "cold-chain" && (
          <ColdChainTab
            checks={coldChecks} setChecks={setColdChecks}
            batches={batches}
          />
        )}
        {tab === "exceptions" && (
          <ExceptionsTab
            exceptions={exceptions} setExceptions={setExceptions}
            deliveries={deliveries}
          />
        )}
        {tab === "settings" && <SettingsTab config={config} setConfig={setConfig} />}
      </div>
    </AdminShell>
  )
}

// =====================================================================
// Overview
// =====================================================================

function OverviewTab({
  deliveries, batches, exceptions, zoneById, riderById, onJump,
}: {
  deliveries: Delivery[]
  batches: Batch[]
  exceptions: ExceptionItem[]
  zoneById: Map<string, Zone>
  riderById: Map<string, Rider>
  onJump: (t: TabKey) => void
}) {
  const recent = deliveries.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
  const openBatches = batches.filter((b) => b.status !== "completed" && b.status !== "cancelled")
  const openExc = exceptions.filter((e) => !e.resolvedAt)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="border border-border rounded-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Recent deliveries</p>
            <button type="button" onClick={() => onJump("tracking")} className="text-xs text-[#3D0814] hover:underline inline-flex items-center gap-1">
              Open tracking <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No deliveries yet. Create a batch and assign orders to it.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Order</th>
                  <th className="text-left px-4 py-2 font-medium">Zone</th>
                  <th className="text-left px-4 py-2 font-medium">Rider</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((d) => (
                  <tr key={d.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-2">
                      <p className="font-medium">{d.orderRef}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">{d.address}</p>
                    </td>
                    <td className="px-4 py-2 text-xs">{d.zoneId ? zoneById.get(d.zoneId)?.name ?? "—" : "—"}</td>
                    <td className="px-4 py-2 text-xs">{d.riderId ? riderById.get(d.riderId)?.name ?? "—" : "—"}</td>
                    <td className="px-4 py-2"><Badge className={`text-[10px] border-0 ${STATUS_STYLE[d.status]}`}>{d.status.replace(/_/g, " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-border rounded-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Open batches</p>
            <button type="button" onClick={() => onJump("batches")} className="text-xs text-[#3D0814] hover:underline inline-flex items-center gap-1">
              Batches & dispatch <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {openBatches.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No open batches.</div>
          ) : (
            <ul className="divide-y divide-border">
              {openBatches.slice(0, 6).map((b) => (
                <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{b.ref} <span className="text-[11px] text-muted-foreground font-normal">· {b.orderIds.length} orders</span></p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.zoneId ? zoneById.get(b.zoneId)?.name ?? "—" : "No zone"} ·{" "}
                      {b.riderId ? riderById.get(b.riderId)?.name ?? "—" : "Unassigned"} ·{" "}
                      {new Date(b.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={`text-[10px] border-0 ${BATCH_STYLE[b.status]}`}>{b.status.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="border border-border rounded-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Open exceptions</p>
            <button type="button" onClick={() => onJump("exceptions")} className="text-xs text-[#3D0814] hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {openExc.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">All clear — no open exceptions.</div>
          ) : (
            <ul className="divide-y divide-border">
              {openExc.slice(0, 8).map((e) => (
                <li key={e.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-[10px] border-0 ${EXC_STYLE[e.type]}`}>{EXC_LABEL[e.type]}</Badge>
                    <span className="text-[11px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs">{e.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Zones
// =====================================================================

function ZonesTab({ zones, setZones }: { zones: Zone[]; setZones: (next: Zone[] | ((p: Zone[]) => Zone[])) => void }) {
  const [editing, setEditing] = useState<Zone | null>(null)
  const [open, setOpen] = useState(false)

  const startNew = () => {
    setEditing({ id: newId("zn"), name: "", areas: "", slaHours: 6, surcharge: 0, coldChainCapable: false, active: true })
    setOpen(true)
  }
  const startEdit = (z: Zone) => { setEditing(z); setOpen(true) }
  const save = () => {
    if (!editing || !editing.name.trim()) return
    setZones((prev) => {
      const idx = prev.findIndex((z) => z.id === editing.id)
      return idx === -1 ? [...prev, editing] : prev.map((z) => z.id === editing.id ? editing : z)
    })
    setOpen(false); setEditing(null)
  }
  const remove = (id: string) => {
    if (!confirm("Remove this zone?")) return
    setZones((prev) => prev.filter((z) => z.id !== id))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Zoning strategy"
        blurb="Group neighbourhoods into delivery zones with their own SLA and surcharge. Riders and batches anchor on zones."
        action={<Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> Add zone</Button>}
      />

      {zones.length === 0 ? (
        <EmptyState icon={MapPin} title="No zones yet" blurb="Add at least one zone to start planning batches." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Zone</th>
                <th className="text-left px-4 py-3 font-medium">Areas</th>
                <th className="text-left px-4 py-3 font-medium">SLA</th>
                <th className="text-left px-4 py-3 font-medium">Surcharge</th>
                <th className="text-left px-4 py-3 font-medium">Cold chain</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zones.map((z) => (
                <tr key={z.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{z.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px] truncate">{z.areas}</td>
                  <td className="px-4 py-3 font-mono text-xs">{z.slaHours}h</td>
                  <td className="px-4 py-3 font-mono text-xs">KES {z.surcharge}</td>
                  <td className="px-4 py-3 text-xs">{z.coldChainCapable ? <Badge className="text-[10px] border-0 bg-sky-100 text-sky-800">Capable</Badge> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3"><Badge className={`text-[10px] border-0 ${z.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{z.active ? "Active" : "Paused"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(z)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(z.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && zones.some((z) => z.id === editing.id) ? "Edit zone" : "Add zone"}</DialogTitle>
            <DialogDescription>Zones power SLA targets, rider assignment, and the delivery-fee surcharge at checkout.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Zone name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Westlands & Parklands" /></Field>
              <Field label="Areas covered"><Textarea rows={2} value={editing.areas} onChange={(e) => setEditing({ ...editing, areas: e.target.value })} placeholder="Westlands, Parklands, Kileleshwa" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SLA (hours)"><Input type="number" min={1} value={editing.slaHours} onChange={(e) => setEditing({ ...editing, slaHours: Number(e.target.value) || 0 })} /></Field>
                <Field label="Surcharge (KES)"><Input type="number" min={0} value={editing.surcharge} onChange={(e) => setEditing({ ...editing, surcharge: Number(e.target.value) || 0 })} /></Field>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Cold-chain capable</Label>
                <Switch checked={editing.coldChainCapable} onCheckedChange={(v) => setEditing({ ...editing, coldChainCapable: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Active</Label>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

// =====================================================================
// Riders
// =====================================================================

function RidersTab({ riders, setRiders, zones }: { riders: Rider[]; setRiders: (next: Rider[] | ((p: Rider[]) => Rider[])) => void; zones: Zone[] }) {
  const [editing, setEditing] = useState<Rider | null>(null)
  const [open, setOpen] = useState(false)
  const startNew = () => {
    setEditing({ id: newId("rdr"), name: "", phone: "", vehicle: "motorcycle", capacity: 8, zoneId: null, coldChainCapable: false, active: true })
    setOpen(true)
  }
  const save = () => {
    if (!editing || !editing.name.trim()) return
    setRiders((prev) => {
      const idx = prev.findIndex((r) => r.id === editing.id)
      return idx === -1 ? [...prev, editing] : prev.map((r) => r.id === editing.id ? editing : r)
    })
    setOpen(false); setEditing(null)
  }
  const remove = (id: string) => {
    if (!confirm("Remove this rider?")) return
    setRiders((prev) => prev.filter((r) => r.id !== id))
  }
  const toggleActive = (id: string) => setRiders((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r))

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Rider model"
        blurb="The fleet that does the last mile. Vehicle + capacity + zone determine batch eligibility; cold-chain riders unlock cold-chain batches."
        action={<Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> Add rider</Button>}
      />
      {riders.length === 0 ? (
        <EmptyState icon={Users} title="No riders yet" blurb="Add your first rider to start dispatching batches." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Rider</th>
                <th className="text-left px-4 py-3 font-medium">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium">Capacity</th>
                <th className="text-left px-4 py-3 font-medium">Home zone</th>
                <th className="text-left px-4 py-3 font-medium">Cold chain</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {riders.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{r.phone || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{VEHICLE_LABEL[r.vehicle]}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.capacity}</td>
                  <td className="px-4 py-3 text-xs">{r.zoneId ? zones.find((z) => z.id === r.zoneId)?.name ?? "—" : <span className="text-muted-foreground">Any</span>}</td>
                  <td className="px-4 py-3 text-xs">{r.coldChainCapable ? <Badge className="text-[10px] border-0 bg-sky-100 text-sky-800">Yes</Badge> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleActive(r.id)}>
                      <Badge className={`text-[10px] border-0 cursor-pointer ${r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>{r.active ? "Active" : "Paused"}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && riders.some((r) => r.id === editing.id) ? "Edit rider" : "Add rider"}</DialogTitle>
            <DialogDescription>Riders are the units that batches are assigned to. Capacity caps the orders per batch.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                <Field label="Phone"><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+2547..." /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vehicle">
                  <Select value={editing.vehicle} onValueChange={(v) => setEditing({ ...editing, vehicle: v as VehicleType, coldChainCapable: v === "cold_van" ? true : editing.coldChainCapable })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map((v) => <SelectItem key={v} value={v}>{VEHICLE_LABEL[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Capacity (orders/batch)"><Input type="number" min={1} value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) || 1 })} /></Field>
              </div>
              <Field label="Home zone">
                <Select value={editing.zoneId ?? "__any"} onValueChange={(v) => setEditing({ ...editing, zoneId: v === "__any" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Any zone</SelectItem>
                    {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Cold-chain capable</Label>
                <Switch checked={editing.coldChainCapable} onCheckedChange={(v) => setEditing({ ...editing, coldChainCapable: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Active</Label>
                <Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
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
// Batches & Dispatch
// =====================================================================

function BatchesTab({
  batches, setBatches, zones, riders, riderById, zoneById,
  deliveries, setDeliveries, config,
}: {
  batches: Batch[]
  setBatches: (next: Batch[] | ((p: Batch[]) => Batch[])) => void
  zones: Zone[]
  riders: Rider[]
  riderById: Map<string, Rider>
  zoneById: Map<string, Zone>
  deliveries: Delivery[]
  setDeliveries: (next: Delivery[] | ((p: Delivery[]) => Delivery[])) => void
  config: LogisticsConfig
}) {
  const [editing, setEditing] = useState<Batch | null>(null)
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "all">("all")

  const list = batches.filter((b) => statusFilter === "all" || b.status === statusFilter)

  const startNew = () => {
    setEditing({
      id: newId("bat"),
      ref: nextBatchRef(batches),
      zoneId: zones[0]?.id ?? null,
      riderId: null,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      status: "planned",
      orderIds: [],
      coldChain: false,
      createdAt: new Date().toISOString(),
    })
    setOpen(true)
  }
  const save = () => {
    if (!editing) return
    const normalized = { ...editing, scheduledAt: new Date(editing.scheduledAt).toISOString() }
    setBatches((prev) => {
      const idx = prev.findIndex((b) => b.id === editing.id)
      return idx === -1 ? [normalized, ...prev] : prev.map((b) => b.id === editing.id ? normalized : b)
    })
    setOpen(false); setEditing(null)
  }
  const remove = (id: string) => {
    if (!confirm("Cancel and remove this batch? Linked deliveries will be unassigned.")) return
    setBatches((prev) => prev.filter((b) => b.id !== id))
    setDeliveries((prev) => prev.map((d) => d.batchId === id ? { ...d, batchId: null, riderId: null, status: d.status === "delivered" ? d.status : "pending" } : d))
  }
  const dispatch = (b: Batch) => {
    if (!b.riderId) { alert("Assign a rider before dispatching."); return }
    if (b.orderIds.length === 0) { alert("Batch is empty. Add at least one order."); return }
    const now = new Date().toISOString()
    const slaHours = b.zoneId ? zoneById.get(b.zoneId)?.slaHours ?? config.targetSlaHours : config.targetSlaHours
    setBatches((prev) => prev.map((x) => x.id === b.id ? { ...x, status: "dispatched", dispatchedAt: now } : x))
    setDeliveries((prev) => prev.map((d) => b.orderIds.includes(d.orderRef)
      ? { ...d, batchId: b.id, riderId: b.riderId, status: "dispatched", dispatchedAt: now, slaHours }
      : d))
  }
  const complete = (b: Batch) => {
    setBatches((prev) => prev.map((x) => x.id === b.id ? { ...x, status: "completed", completedAt: new Date().toISOString() } : x))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Batch planning & dispatch scheduling"
        blurb="Group orders going to the same zone into a single batch, assign a rider with capacity, and dispatch when ready."
        action={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(BATCH_STYLE) as BatchStatus[]).map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> New batch</Button>
          </div>
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={Boxes} title="No batches" blurb="Create a batch to start grouping orders for dispatch." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Batch</th>
                <th className="text-left px-4 py-3 font-medium">Zone</th>
                <th className="text-left px-4 py-3 font-medium">Rider</th>
                <th className="text-left px-4 py-3 font-medium">Scheduled</th>
                <th className="text-left px-4 py-3 font-medium">Orders</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((b) => {
                const overCap = b.riderId && riderById.get(b.riderId)
                  ? b.orderIds.length > (riderById.get(b.riderId)!.capacity)
                  : false
                return (
                  <tr key={b.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <p className="font-medium font-mono text-xs">{b.ref}</p>
                      {b.coldChain && <Badge className="text-[9px] border-0 bg-sky-100 text-sky-800 mt-1">Cold chain</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs">{b.zoneId ? zoneById.get(b.zoneId)?.name ?? "—" : "—"}</td>
                    <td className="px-4 py-3 text-xs">{b.riderId ? riderById.get(b.riderId)?.name ?? "—" : <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className="px-4 py-3 text-xs">{new Date(b.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={overCap ? "text-rose-700 font-medium" : ""}>{b.orderIds.length}</span>
                      {overCap && <span className="text-[10px] text-rose-700 ml-1">over capacity</span>}
                    </td>
                    <td className="px-4 py-3"><Badge className={`text-[10px] border-0 ${BATCH_STYLE[b.status]}`}>{b.status.replace(/_/g, " ")}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {b.status === "planned" && (
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => dispatch(b)}>
                            Dispatch <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                        {(b.status === "dispatched" || b.status === "in_progress") && (
                          <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => complete(b)}>
                            Complete <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(b); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing && batches.some((b) => b.id === editing.id) ? `Edit ${editing.ref}` : `New batch · ${editing?.ref ?? ""}`}</DialogTitle>
            <DialogDescription>Group orders headed for the same zone and assign a rider. Dispatch sends them out and flips every order's tracking status.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Zone">
                  <Select value={editing.zoneId ?? ""} onValueChange={(v) => setEditing({ ...editing, zoneId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a zone" /></SelectTrigger>
                    <SelectContent>{zones.filter((z) => z.active).map((z) => <SelectItem key={z.id} value={z.id}>{z.name} · SLA {z.slaHours}h</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Rider">
                  <Select value={editing.riderId ?? "__none"} onValueChange={(v) => setEditing({ ...editing, riderId: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
                      {riders.filter((r) => r.active && (!editing.coldChain || r.coldChainCapable) && (!editing.zoneId || !r.zoneId || r.zoneId === editing.zoneId)).map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name} · {VEHICLE_LABEL[r.vehicle]} · cap {r.capacity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Scheduled at">
                <Input type="datetime-local" value={editing.scheduledAt.slice(0, 16)} onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value })} />
              </Field>
              <Field label="Order refs (comma-separated)">
                <Textarea
                  rows={3}
                  placeholder="ORD-1042, ORD-1043, ORD-1051"
                  value={editing.orderIds.join(", ")}
                  onChange={(e) => setEditing({ ...editing, orderIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
                <p className="text-[11px] text-muted-foreground">Tip: refs that already exist as deliveries get auto-linked on dispatch.</p>
              </Field>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Cold-chain batch</Label>
                <Switch checked={editing.coldChain} onCheckedChange={(v) => setEditing({ ...editing, coldChain: v })} />
              </div>
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
// Route assignment (per batch order sequencing)
// =====================================================================

function RoutingTab({
  batches, setBatches, deliveries, zoneById, riderById, config,
}: {
  batches: Batch[]
  setBatches: (next: Batch[] | ((p: Batch[]) => Batch[])) => void
  deliveries: Delivery[]
  zoneById: Map<string, Zone>
  riderById: Map<string, Rider>
  config: LogisticsConfig
}) {
  const plannable = batches.filter((b) => b.status === "planned" || b.status === "dispatched")
  const [selectedId, setSelectedId] = useState<string | null>(plannable[0]?.id ?? null)
  const selected = plannable.find((b) => b.id === selectedId) ?? null

  const move = (idx: number, dir: -1 | 1) => {
    if (!selectedId) return
    const target = idx + dir
    // Functional update reads the freshest batch — no stale closure on rapid clicks.
    setBatches((prev) => prev.map((b) => {
      if (b.id !== selectedId) return b
      if (target < 0 || target >= b.orderIds.length) return b
      const list = [...b.orderIds]
      ;[list[idx], list[target]] = [list[target]!, list[idx]!]
      return { ...b, orderIds: list }
    }))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Delivery route assignment"
        blurb='Sequence the stops within a batch. "Only left turn rule" (when enabled in settings) prefers routes that minimise right-turn crossings.'
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Pick a batch to sequence</p>
          {plannable.length === 0 ? (
            <EmptyState icon={Route} title="Nothing to route" blurb="Create a planned or dispatched batch first." />
          ) : (
            <ul className="border border-border rounded-sm divide-y divide-border">
              {plannable.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm ${selectedId === b.id ? "bg-[#3D0814]/5" : "hover:bg-secondary/40"}`}
                  >
                    <p className="font-mono text-xs font-medium">{b.ref}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.zoneId ? zoneById.get(b.zoneId)?.name : "—"} · {b.orderIds.length} stops · {b.riderId ? riderById.get(b.riderId)?.name ?? "—" : "Unassigned"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="md:col-span-2">
          {!selected ? (
            <EmptyState icon={Route} title="Select a batch" blurb="Pick one from the list to drag-reorder stops." />
          ) : (
            <div className="border border-border rounded-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold">{selected.ref} · {selected.orderIds.length} stops</p>
                <Badge className={`text-[10px] border-0 ${BATCH_STYLE[selected.status]}`}>{selected.status}</Badge>
              </div>
              {config.onlyLeftTurnRule && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900">
                  <strong>Only-left-turn rule</strong> is on — sequence stops so the rider primarily turns left (or straight) when possible. Reduces left-side crossings and idle time.
                </div>
              )}
              {selected.orderIds.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">No stops. Add order refs to this batch first.</div>
              ) : (
                <ol className="divide-y divide-border">
                  {selected.orderIds.map((ref, idx) => {
                    const d = deliveries.find((x) => x.orderRef === ref)
                    return (
                      <li key={ref + idx} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: WINE }}>{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium font-mono text-xs">{ref}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{d?.address ?? "Address pending"}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={idx === 0} onClick={() => move(idx, -1)}>↑</Button>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" disabled={idx === selected.orderIds.length - 1} onClick={() => move(idx, 1)}>↓</Button>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Tracking (last-mile)
// =====================================================================

function TrackingTab({
  deliveries, setDeliveries, zoneById, riderById, batchById,
  exceptions, setExceptions, config,
}: {
  deliveries: Delivery[]
  setDeliveries: (next: Delivery[] | ((p: Delivery[]) => Delivery[])) => void
  zoneById: Map<string, Zone>
  riderById: Map<string, Rider>
  batchById: Map<string, Batch>
  exceptions: ExceptionItem[]
  setExceptions: (next: ExceptionItem[] | ((p: ExceptionItem[]) => ExceptionItem[])) => void
  config: LogisticsConfig
}) {
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all")
  const [editing, setEditing] = useState<Delivery | null>(null)
  const [open, setOpen] = useState(false)
  const [failingId, setFailingId] = useState<string | null>(null)
  const [failReason, setFailReason] = useState("")

  const list = deliveries
    .filter((d) => statusFilter === "all" || d.status === statusFilter)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const startNew = () => {
    setEditing({
      id: newId("dlv"),
      orderRef: "",
      customerName: "",
      customerPhone: "",
      address: "",
      zoneId: null,
      batchId: null,
      riderId: null,
      status: "pending",
      attempts: 0,
      codAmount: 0,
      estimatedCost: 200,
      createdAt: new Date().toISOString(),
    })
    setOpen(true)
  }
  const save = () => {
    if (!editing || !editing.orderRef.trim()) return
    setDeliveries((prev) => {
      const idx = prev.findIndex((d) => d.id === editing.id)
      return idx === -1 ? [editing, ...prev] : prev.map((d) => d.id === editing.id ? editing : d)
    })
    setOpen(false); setEditing(null)
  }
  const remove = (id: string) => {
    if (!confirm("Remove this delivery?")) return
    setDeliveries((prev) => prev.filter((d) => d.id !== id))
  }
  const setStatus = (d: Delivery, status: DeliveryStatus) => {
    const patch: Partial<Delivery> = { status }
    if (status === "out_for_delivery" && !d.dispatchedAt) patch.dispatchedAt = new Date().toISOString()
    if (status === "delivered") patch.deliveredAt = new Date().toISOString()
    if (status === "failed") patch.attempts = (d.attempts || 0) + 1
    setDeliveries((prev) => prev.map((x) => x.id === d.id ? { ...x, ...patch } : x))
  }
  const confirmDelivery = (d: Delivery) => setStatus(d, "delivered")
  const openFail = (d: Delivery) => { setFailingId(d.id); setFailReason("") }
  const submitFail = () => {
    if (!failingId) return
    const d = deliveries.find((x) => x.id === failingId)
    if (!d) return
    // Single setState — avoid the queued-update merge ordering trap.
    setDeliveries((prev) => prev.map((x) => x.id === failingId
      ? { ...x, status: "failed" as DeliveryStatus, attempts: (x.attempts || 0) + 1, failureReason: failReason }
      : x))
    setExceptions((prev) => [{
      id: newId("exc"),
      deliveryId: failingId,
      type: "failed_delivery",
      summary: `Order ${d.orderRef} failed: ${failReason || "no reason given"}`,
      resolution: "",
      createdAt: new Date().toISOString(),
    }, ...prev])
    setFailingId(null); setFailReason("")
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Last-mile tracking"
        blurb="Every order in flight. Move statuses forward (Pending → Out for delivery → Delivered) or mark failed to spawn an exception."
        action={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_STYLE) as DeliveryStatus[]).map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> Add delivery</Button>
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState icon={Truck} title="No deliveries" blurb="Add a delivery manually here, or have one auto-created from a paid order in future." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Order</th>
                <th className="text-left px-4 py-3 font-medium">Zone / Batch</th>
                <th className="text-left px-4 py-3 font-medium">Rider</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Attempts</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <p className="font-medium font-mono text-xs">{d.orderRef}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">{d.customerName} · {d.address}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{d.zoneId ? zoneById.get(d.zoneId)?.name ?? "—" : "—"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{d.batchId ? batchById.get(d.batchId)?.ref ?? "—" : "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{d.riderId ? riderById.get(d.riderId)?.name ?? "—" : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">
                    <Select value={d.status} onValueChange={(v) => setStatus(d, v as DeliveryStatus)}>
                      <SelectTrigger className={`h-7 w-[150px] text-[11px] capitalize border-0 ${STATUS_STYLE[d.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_STYLE) as DeliveryStatus[]).map((s) => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{d.attempts}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {d.status !== "delivered" && (
                        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => confirmDelivery(d)}>
                          Confirm <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                      {d.status !== "failed" && d.status !== "delivered" && (
                        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-rose-700 border-rose-200" onClick={() => openFail(d)}>
                          Fail <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(d); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Failure dialog */}
      <Dialog open={!!failingId} onOpenChange={(o) => { if (!o) setFailingId(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark delivery failed</DialogTitle>
            <DialogDescription>Logs a Failed Delivery exception you can resolve under the Exceptions tab.</DialogDescription>
          </DialogHeader>
          <Field label="Reason">
            <Textarea rows={3} value={failReason} onChange={(e) => setFailReason(e.target.value)} placeholder="Customer unreachable, wrong address, refused on door…" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setFailingId(null)}>Cancel</Button>
            <Button size="sm" onClick={submitFail} className="bg-rose-600 hover:bg-rose-700 text-white">Mark failed</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && deliveries.some((d) => d.id === editing.id) ? "Edit delivery" : "Add delivery"}</DialogTitle>
            <DialogDescription>Manual entry. Eventually these come from the orders module on the NestJS backend.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Order ref"><Input value={editing.orderRef} onChange={(e) => setEditing({ ...editing, orderRef: e.target.value })} placeholder="ORD-1042" /></Field>
                <Field label="Zone">
                  <Select value={editing.zoneId ?? "__none"} onValueChange={(v) => setEditing({ ...editing, zoneId: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No zone</SelectItem>
                      {Array.from(zoneById.values()).map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Customer name"><Input value={editing.customerName} onChange={(e) => setEditing({ ...editing, customerName: e.target.value })} /></Field>
                <Field label="Phone"><Input value={editing.customerPhone} onChange={(e) => setEditing({ ...editing, customerPhone: e.target.value })} /></Field>
              </div>
              <Field label="Address"><Textarea rows={2} value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="COD amount (KES)"><Input type="number" min={0} value={editing.codAmount} onChange={(e) => setEditing({ ...editing, codAmount: Number(e.target.value) || 0 })} /></Field>
                <Field label="Est. cost (KES)"><Input type="number" min={0} value={editing.estimatedCost} onChange={(e) => setEditing({ ...editing, estimatedCost: Number(e.target.value) || 0 })} /></Field>
              </div>
              <p className="text-[11px] text-muted-foreground">Cost cap: KES {config.costCapPerDelivery}. Anything above flags Cost Control.</p>
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
// Cold Chain
// =====================================================================

function ColdChainTab({
  checks, setChecks, batches,
}: {
  checks: ColdChainCheck[]
  setChecks: (next: ColdChainCheck[] | ((p: ColdChainCheck[]) => ColdChainCheck[])) => void
  batches: Batch[]
}) {
  const coldBatches = batches.filter((b) => b.coldChain)
  const [editing, setEditing] = useState<ColdChainCheck | null>(null)
  const [open, setOpen] = useState(false)

  const startNew = () => {
    setEditing({
      id: newId("cck"),
      batchId: coldBatches[0]?.id ?? "",
      tempBefore: 4,
      tempAfter: 6,
      packagedBy: "",
      packagedAt: new Date().toISOString().slice(0, 16),
      passed: true,
    })
    setOpen(true)
  }
  const save = () => {
    if (!editing || !editing.batchId) return
    const normalized = { ...editing, packagedAt: new Date(editing.packagedAt).toISOString(), passed: editing.tempAfter >= 2 && editing.tempAfter <= 8 }
    setChecks((prev) => {
      const idx = prev.findIndex((c) => c.id === editing.id)
      return idx === -1 ? [normalized, ...prev] : prev.map((c) => c.id === editing.id ? normalized : c)
    })
    setOpen(false); setEditing(null)
  }
  const remove = (id: string) => {
    if (!confirm("Remove this cold-chain check?")) return
    setChecks((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Cold-chain prep"
        blurb="Temperature log for cold-chain batches. Acceptable range 2–8 °C at handoff — anything outside auto-flags as failed."
        action={<Button size="sm" onClick={startNew} disabled={coldBatches.length === 0} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> Log check</Button>}
      />
      {coldBatches.length === 0 && (
        <div className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          No cold-chain batches yet. Flag a batch as "cold chain" under Batches & dispatch first.
        </div>
      )}
      {checks.length === 0 ? (
        <EmptyState icon={Snowflake} title="No cold-chain checks logged" blurb="Every cold-chain batch should have a temperature check before dispatch." />
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Batch</th>
                <th className="text-left px-4 py-3 font-medium">Before</th>
                <th className="text-left px-4 py-3 font-medium">After</th>
                <th className="text-left px-4 py-3 font-medium">Packaged by</th>
                <th className="text-left px-4 py-3 font-medium">At</th>
                <th className="text-left px-4 py-3 font-medium">Result</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {checks.map((c) => {
                const b = batches.find((x) => x.id === c.batchId)
                return (
                  <tr key={c.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3 text-xs font-mono">{b?.ref ?? c.batchId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.tempBefore}°C</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.tempAfter}°C</td>
                    <td className="px-4 py-3 text-xs">{c.packagedBy || "—"}</td>
                    <td className="px-4 py-3 text-xs">{new Date(c.packagedAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge className={`text-[10px] border-0 ${c.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{c.passed ? "Pass" : "Fail"}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && checks.some((c) => c.id === editing.id) ? "Edit check" : "Log cold-chain check"}</DialogTitle>
            <DialogDescription>Acceptable handoff window is 2–8 °C.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Batch">
                <Select value={editing.batchId} onValueChange={(v) => setEditing({ ...editing, batchId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{coldBatches.map((b) => <SelectItem key={b.id} value={b.id}>{b.ref}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Temp before (°C)"><Input type="number" value={editing.tempBefore} onChange={(e) => setEditing({ ...editing, tempBefore: Number(e.target.value) || 0 })} /></Field>
                <Field label="Temp at handoff (°C)"><Input type="number" value={editing.tempAfter} onChange={(e) => setEditing({ ...editing, tempAfter: Number(e.target.value) || 0 })} /></Field>
              </div>
              <Field label="Packaged by"><Input value={editing.packagedBy} onChange={(e) => setEditing({ ...editing, packagedBy: e.target.value })} placeholder="Pharmacist name" /></Field>
              <Field label="Packaged at"><Input type="datetime-local" value={editing.packagedAt.slice(0, 16)} onChange={(e) => setEditing({ ...editing, packagedAt: e.target.value })} /></Field>
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
// Exceptions
// =====================================================================

function ExceptionsTab({
  exceptions, setExceptions, deliveries,
}: {
  exceptions: ExceptionItem[]
  setExceptions: (next: ExceptionItem[] | ((p: ExceptionItem[]) => ExceptionItem[])) => void
  deliveries: Delivery[]
}) {
  const [editing, setEditing] = useState<ExceptionItem | null>(null)
  const [open, setOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<ExceptionType | "all">("all")

  const list = exceptions
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const startNew = () => {
    setEditing({
      id: newId("exc"),
      deliveryId: null,
      type: "address",
      summary: "",
      resolution: "",
      createdAt: new Date().toISOString(),
    })
    setOpen(true)
  }
  const save = () => {
    if (!editing || !editing.summary.trim()) return
    setExceptions((prev) => {
      const idx = prev.findIndex((x) => x.id === editing.id)
      return idx === -1 ? [editing, ...prev] : prev.map((x) => x.id === editing.id ? editing : x)
    })
    setOpen(false); setEditing(null)
  }
  const resolve = (id: string) => setExceptions((prev) => prev.map((x) => x.id === id ? { ...x, resolvedAt: new Date().toISOString() } : x))
  const remove = (id: string) => { if (!confirm("Remove this exception?")) return; setExceptions((prev) => prev.filter((x) => x.id !== id)) }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Exceptions"
        blurb="Failed deliveries, address resolution requests, SLA breaches, and cost-control flags — one queue."
        action={
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(Object.keys(EXC_LABEL) as ExceptionType[]).map((t) => <SelectItem key={t} value={t}>{EXC_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"><Plus className="h-3.5 w-3.5" /> Log exception</Button>
          </div>
        }
      />
      {list.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="All clear" blurb="No exceptions logged in the current filter." />
      ) : (
        <ul className="space-y-2">
          {list.map((e) => {
            const d = e.deliveryId ? deliveries.find((x) => x.id === e.deliveryId) : null
            return (
              <li key={e.id} className="border border-border rounded-sm p-4 bg-background">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] border-0 ${EXC_STYLE[e.type]}`}>{EXC_LABEL[e.type]}</Badge>
                      {e.resolvedAt
                        ? <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-800">Resolved</Badge>
                        : <Badge className="text-[10px] border-0 bg-amber-100 text-amber-900">Open</Badge>}
                      <span className="text-[11px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                      {d && <span className="text-[11px] text-muted-foreground font-mono">· {d.orderRef}</span>}
                    </div>
                    <p className="text-sm">{e.summary}</p>
                    {e.resolution && <p className="text-xs text-muted-foreground mt-1"><strong>Resolution:</strong> {e.resolution}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!e.resolvedAt && <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={() => resolve(e.id)}>Resolve <CheckCircle2 className="h-3 w-3" /></Button>}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(e); setOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && exceptions.some((x) => x.id === editing.id) ? "Edit exception" : "Log exception"}</DialogTitle>
            <DialogDescription>One queue for failed deliveries, address fixes, SLA breaches, and cost flags.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as ExceptionType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(EXC_LABEL) as ExceptionType[]).map((t) => <SelectItem key={t} value={t}>{EXC_LABEL[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Delivery (optional)">
                  <Select value={editing.deliveryId ?? "__none"} onValueChange={(v) => setEditing({ ...editing, deliveryId: v === "__none" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {deliveries.slice(0, 50).map((d) => <SelectItem key={d.id} value={d.id}>{d.orderRef} · {d.customerName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Summary"><Textarea rows={2} value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></Field>
              <Field label="Resolution"><Textarea rows={2} value={editing.resolution} onChange={(e) => setEditing({ ...editing, resolution: e.target.value })} placeholder="What did we do about it?" /></Field>
              {editing.type === "cost" && (
                <Field label="Cost incurred (KES)"><Input type="number" min={0} value={editing.cost ?? 0} onChange={(e) => setEditing({ ...editing, cost: Number(e.target.value) || 0 })} /></Field>
              )}
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
// Settings (Only Left Turn rule, SLA targets, cost cap)
// =====================================================================

function SettingsTab({
  config, setConfig,
}: {
  config: LogisticsConfig
  setConfig: (next: LogisticsConfig | ((p: LogisticsConfig) => LogisticsConfig)) => void
}) {
  return (
    <div className="space-y-4 max-w-2xl">
      <SectionHeader title="Operations settings" blurb="Rule toggles and targets that govern routing, dispatch, and cost control." />

      <div className="border border-border rounded-sm p-5 space-y-4 bg-background">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Target orders / batch"><Input type="number" min={1} value={config.targetOrdersPerBatch} onChange={(e) => setConfig({ ...config, targetOrdersPerBatch: Number(e.target.value) || 1 })} /></Field>
          <Field label="Target SLA (hours)"><Input type="number" min={1} value={config.targetSlaHours} onChange={(e) => setConfig({ ...config, targetSlaHours: Number(e.target.value) || 1 })} /></Field>
          <Field label="Cost cap / delivery (KES)"><Input type="number" min={0} value={config.costCapPerDelivery} onChange={(e) => setConfig({ ...config, costCapPerDelivery: Number(e.target.value) || 0 })} /></Field>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <ToggleRow
            label="Only-left-turn rule (routing)"
            blurb="Prefer routes with minimal right-turns at intersections — reduces wait time at crossings (UPS-style)."
            checked={config.onlyLeftTurnRule}
            onChange={(v) => setConfig({ ...config, onlyLeftTurnRule: v })}
          />
          <ToggleRow
            label="Auto-assign riders"
            blurb="When a batch is created, pick the first active rider whose zone and cold-chain capability matches."
            checked={config.autoAssignRiders}
            onChange={(v) => setConfig({ ...config, autoAssignRiders: v })}
          />
          <ToggleRow
            label="SMS customer on dispatch"
            blurb="Send a tracking SMS when a delivery flips to dispatched."
            checked={config.smsCustomerOnDispatch}
            onChange={(v) => setConfig({ ...config, smsCustomerOnDispatch: v })}
          />
          <ToggleRow
            label="SMS customer on delivery"
            blurb="Send the confirmation receipt when a delivery is marked delivered."
            checked={config.smsCustomerOnDelivery}
            onChange={(v) => setConfig({ ...config, smsCustomerOnDelivery: v })}
          />
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
        <PackageCheck className="h-3 w-3" />
        Saved automatically to <code>cmsStore["{KEYS.config}"]</code>. Will migrate to the NestJS logistics module without UI changes.
      </div>
    </div>
  )
}

function ToggleRow({ label, blurb, checked, onChange }: { label: string; blurb: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{blurb}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

// Re-export under the existing AdminLogistics name so App.tsx routing
// works without a wiring change.
export { AdminLogisticsOps as AdminLogistics }

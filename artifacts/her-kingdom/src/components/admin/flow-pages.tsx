"use client"

import { useState, useMemo } from "react"
import { AdminShell } from "./admin-shell"
import {
  useTradingBids,
  useTradingDeals,
  useTradingNegotiations,
  useTradingSettlements,
} from "@/lib/use-trading-store"
import { usePurchaseOrders } from "@/lib/use-sourcing-store"
import { apiAdminTrading } from "@/lib/api-admin-trading"
import type {
  TradingBidDto,
  TradingDealDto,
  TradingNegotiationDto,
  TradingSettlementDto,
} from "@/lib/api-admin-trading"
import { pipelineClient, type MarginRecommendation } from "@/lib/pipeline-client"
import {
  Handshake, Receipt, TrendingUp, Wallet,
  ShieldCheck, ClipboardList, HeartHandshake, AlertCircle,
  Truck, Warehouse, Timer, Plus, Trash2, Check, X,
  ChevronDown, MoreHorizontal, RefreshCw,
} from "lucide-react"
import type { ReactNode } from "react"

const WINE   = "#3D0814"
const BORDER = "#e5e7eb"
const fmt    = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ─── tiny shared atoms ─────────────────────────────────────── */

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:      "bg-blue-50 text-blue-700 border-blue-200",
    bidding:   "bg-purple-50 text-purple-700 border-purple-200",
    awarded:   "bg-amber-50 text-amber-700 border-amber-200",
    settled:   "bg-green-50 text-green-700 border-green-200",
    pending:   "bg-gray-100 text-gray-600 border-gray-200",
    matched:   "bg-green-50 text-green-700 border-green-200",
    disputed:  "bg-red-50 text-red-700 border-red-200",
    paid:      "bg-green-50 text-green-700 border-green-200",
    unpaid:    "bg-gray-100 text-gray-600 border-gray-200",
    overdue:   "bg-red-50 text-red-700 border-red-200",
    accepted:  "bg-green-50 text-green-700 border-green-200",
    rejected:  "bg-red-50 text-red-700 border-red-200",
    expired:   "bg-gray-100 text-gray-500 border-gray-200",
    shortlisted:"bg-indigo-50 text-indigo-700 border-indigo-200",
  }
  const cls = map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls} capitalize`}>
      {status}
    </span>
  )
}

function EmptyState({ icon: Icon, label }: { icon: typeof Plus; label: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="h-8 w-8 mx-auto mb-3 opacity-20" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function SectionHead({ eyebrow, title, icon: Icon, blurb }: {
  eyebrow: string; title: string; icon: typeof Handshake; blurb: string
}) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: WINE }}>{eyebrow}</p>
      <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
        <Icon className="h-5 w-5" />{title}
      </h1>
      <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{blurb}</p>
    </div>
  )
}

/* FlowStage — only used for the QA + Logistics placeholder sub-pages */
function FlowStage({
  title, eyebrow, blurb, icon: Icon, steps,
}: {
  title: string; eyebrow: string; blurb: string; icon: typeof Handshake
  steps: { label: string; detail: string }[]
}) {
  return (
    <AdminShell title={title}>
      <div className="space-y-5 max-w-5xl">
        <SectionHead eyebrow={eyebrow} title={title} icon={Icon} blurb={blurb} />
        <div className="rounded-lg border border-dashed border-border bg-background/60 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline steps</p>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: WINE }}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Notice>
          This stage is wired into the sidebar pipeline (<strong>Sourcing → Trading → QA &amp; Assurance → Logistics</strong>).
          Backend service ships with the next NestJS module — trading data now persists in Postgres via <code>/admin/trading/*</code>.
        </Notice>
      </div>
    </AdminShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRADING — DEAL PIPELINE
════════════════════════════════════════════════════════════════ */

type Deal = TradingDealDto
type Bid = TradingBidDto
type NegRound = TradingNegotiationDto
type Settlement = TradingSettlementDto

function useDeals() {
  const { deals, add, update, remove } = useTradingDeals()
  return { deals, add, update, remove }
}

function useBids() {
  const { bids, add, update, remove } = useTradingBids()
  return { bids, add, update, remove }
}

function useNeg() {
  const { rounds, add, update, remove } = useTradingNegotiations()
  return { rounds, add, update, remove }
}

function useSettlements() {
  const { settlements, add, update, remove } = useTradingSettlements()
  return { settlements, add, update, remove }
}

/* removed CMS stores — trading data now in Postgres via /admin/trading/* */

export function AdminTrading() {
  const { deals, add, update, remove, refresh: refreshDeals } = useTradingDeals()
  const [open, setOpen] = useState(false)
  const [marginLoading, setMarginLoading] = useState(false)
  const [marginRecs, setMarginRecs] = useState<MarginRecommendation[]>([])
  const [marginSummary, setMarginSummary] = useState<{ above: number; below: number } | null>(null)
  const [creatingSku, setCreatingSku] = useState<string | null>(null)
  const [form, setForm] = useState({
    ref: "", product: "", supplier: "", qty: "1", unit: "packs",
    targetPrice: "", currency: "KES", notes: "",
  })

  const STATUS_FLOW: Deal["status"][] = ["open", "bidding", "awarded", "settled"]

  function submit() {
    if (!form.ref || !form.product || !form.supplier) return
    void add({
      ref: form.ref, product: form.product, supplier: form.supplier,
      qty: Number(form.qty) || 1, unit: form.unit,
      targetPrice: parseFloat(form.targetPrice) || 0, awardedPrice: 0,
      currency: form.currency, status: "open", notes: form.notes,
    })
    setForm({ ref: "", product: "", supplier: "", qty: "1", unit: "packs", targetPrice: "", currency: "KES", notes: "" })
    setOpen(false)
  }

  function nextStatus(d: Deal) {
    const i = STATUS_FLOW.indexOf(d.status)
    if (i < STATUS_FLOW.length - 1) void update(d.id, { status: STATUS_FLOW[i + 1] })
  }

  const summary = {
    open:    deals.filter(d => d.status === "open").length,
    bidding: deals.filter(d => d.status === "bidding").length,
    awarded: deals.filter(d => d.status === "awarded").length,
    settled: deals.filter(d => d.status === "settled").length,
  }

  async function runMarginScan() {
    setMarginLoading(true)
    try {
      const result = await pipelineClient.trading.recomputeMargins(25)
      setMarginRecs(result.recommendations)
      setMarginSummary({ above: result.aboveMarket, below: result.belowMarket })
    } finally {
      setMarginLoading(false)
    }
  }

  async function createDealFromRec(rec: MarginRecommendation) {
    setCreatingSku(rec.sku)
    try {
      await apiAdminTrading.createDealFromMargin({
        sku: rec.sku,
        recommendedPrice: rec.recommendedPrice,
        targetMarginPct: rec.targetMarginPct,
        notes: `Margin scan: ${rec.status}, market avg ${rec.marketAvg}`,
      })
      await refreshDeals()
    } finally {
      setCreatingSku(null)
    }
  }

  return (
    <AdminShell title="Deal Pipeline">
      <div className="max-w-6xl space-y-6">
        <SectionHead
          eyebrow="Pipeline · Trading"
          title="Deal Pipeline"
          icon={Handshake}
          blurb="All active and historical trade deals — RFQ → bidding → award → settlement."
        />

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {(["open","bidding","awarded","settled"] as const).map(s => (
            <div key={s} className="rounded-xl border p-4 bg-white" style={{ borderColor: BORDER }}>
              <p className="text-xs font-semibold text-muted-foreground capitalize">{s}</p>
              <p className="text-2xl font-bold mt-1">{summary[s]}</p>
            </div>
          ))}
        </div>

        {/* Margin scan → create deal */}
        <div className="rounded-xl border bg-white p-5 space-y-3" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Margin recommendations
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recompute vs competitor prices, then promote a SKU into an open trade deal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runMarginScan()}
              disabled={marginLoading}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border disabled:opacity-50"
              style={{ borderColor: BORDER }}
            >
              <RefreshCw className={`h-4 w-4 ${marginLoading ? "animate-spin" : ""}`} />
              {marginLoading ? "Scanning…" : "Recompute margins"}
            </button>
          </div>
          {marginSummary && (
            <p className="text-xs text-muted-foreground">
              {marginRecs.length} SKU(s) — {marginSummary.above} above market, {marginSummary.below} below market.
            </p>
          )}
          {marginRecs.length > 0 && (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: BORDER }}>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b" style={{ borderColor: BORDER }}>
                  <tr>
                    {["SKU", "Our cost", "Market", "Target", "Status", ""].map(h => (
                      <th key={h || "act"} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marginRecs.slice(0, 12).map(rec => (
                    <tr key={rec.sku} className="border-b last:border-0" style={{ borderColor: BORDER }}>
                      <td className="px-3 py-2 font-mono">{rec.sku}</td>
                      <td className="px-3 py-2">KES {fmt(rec.ourCost)}</td>
                      <td className="px-3 py-2">{rec.marketAvg > 0 ? `KES ${fmt(rec.marketAvg)}` : "—"}</td>
                      <td className="px-3 py-2 font-semibold">KES {fmt(rec.recommendedPrice)}</td>
                      <td className="px-3 py-2 capitalize">{rec.status.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={creatingSku === rec.sku}
                          onClick={() => void createDealFromRec(rec)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white disabled:opacity-50"
                          style={{ background: WINE }}
                        >
                          {creatingSku === rec.sku ? "…" : "Create deal"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{deals.length} deal{deals.length !== 1 ? "s" : ""}</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full text-white"
            style={{ background: WINE }}
          >
            <Plus className="h-4 w-4" /> New Deal
          </button>
        </div>

        {/* New Deal form */}
        {open && (
          <div className="rounded-xl border bg-white p-5 space-y-4" style={{ borderColor: BORDER }}>
            <p className="font-semibold text-sm">New Trade Deal</p>
            <div className="grid grid-cols-2 gap-3">
              {(["ref","product","supplier"] as const).map(k => (
                <input key={k} placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: BORDER }}
                />
              ))}
              <div className="flex gap-2">
                <input type="number" placeholder="Qty" value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm w-24" style={{ borderColor: BORDER }}
                />
                <input placeholder="Unit" value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="Target price" value={form.targetPrice}
                  onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
                <select value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="border rounded-lg px-2 py-2 text-sm" style={{ borderColor: BORDER }}
                >
                  {["KES","USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <textarea placeholder="Notes (optional)" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: BORDER }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-full border" style={{ borderColor: BORDER }}>Cancel</button>
              <button onClick={submit} className="text-sm px-5 py-2 rounded-full text-white font-semibold" style={{ background: WINE }}>Create</button>
            </div>
          </div>
        )}

        {/* Table */}
        {deals.length === 0
          ? <EmptyState icon={Handshake} label="No deals yet — create your first trade deal above." />
          : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: BORDER }}>
                  <tr>
                    {["Ref","Product","Supplier","Qty","Target","Status","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: BORDER }}>
                      <td className="px-4 py-3 font-mono text-xs">{d.ref}</td>
                      <td className="px-4 py-3 font-medium">{d.product}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.supplier}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.qty} {d.unit}</td>
                      <td className="px-4 py-3 font-mono">{d.currency} {fmt(d.targetPrice)}</td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {d.status !== "settled" && (
                            <button
                              onClick={() => nextStatus(d)}
                              title="Advance status"
                              className="text-xs px-2 py-1 rounded border font-medium hover:bg-gray-50"
                              style={{ borderColor: BORDER }}
                            >
                              → {STATUS_FLOW[STATUS_FLOW.indexOf(d.status) + 1]}
                            </button>
                          )}
                          <button onClick={() => void remove(d.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </AdminShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRADING — BIDS & QUOTES
════════════════════════════════════════════════════════════════ */

export function AdminTradingBids() {
  const { deals } = useDeals()
  const { bids, add, update, remove } = useBids()
  const [open, setOpen] = useState(false)
  const [filterDeal, setFilterDeal] = useState("all")
  const [form, setForm] = useState({
    dealRef: "", supplier: "", unitPrice: "", currency: "KES",
    moq: "100", leadDays: "14", note: "",
  })

  const visible = filterDeal === "all" ? bids : bids.filter(b => b.dealRef === filterDeal)

  function submit() {
    if (!form.dealRef || !form.supplier || !form.unitPrice) return
    void add({
      dealRef: form.dealRef, supplier: form.supplier,
      unitPrice: parseFloat(form.unitPrice),
      currency: form.currency,
      moq: parseInt(form.moq) || 0,
      leadDays: parseInt(form.leadDays) || 0,
      note: form.note,
      status: "pending",
    })
    setForm({ dealRef: "", supplier: "", unitPrice: "", currency: "KES", moq: "100", leadDays: "14", note: "" })
    setOpen(false)
  }

  const lowest = visible.length
    ? Math.min(...visible.map(b => b.unitPrice))
    : 0

  return (
    <AdminShell title="Bids & Quotes">
      <div className="max-w-6xl space-y-6">
        <SectionHead
          eyebrow="Pipeline · Trading"
          title="Bids & Quotes"
          icon={Receipt}
          blurb="Live quote book — compare prices, MOQs, lead times, and supplier trust scores side-by-side."
        />

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">Deal</label>
            <select
              value={filterDeal}
              onChange={e => setFilterDeal(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
            >
              <option value="all">All deals</option>
              {deals.map(d => <option key={d.id} value={d.ref}>{d.ref} — {d.product}</option>)}
            </select>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full text-white"
            style={{ background: WINE }}
          >
            <Plus className="h-4 w-4" /> Add Quote
          </button>
        </div>

        {/* Add form */}
        {open && (
          <div className="rounded-xl border bg-white p-5 space-y-4" style={{ borderColor: BORDER }}>
            <p className="font-semibold text-sm">New Supplier Quote</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.dealRef}
                onChange={e => setForm(f => ({ ...f, dealRef: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              >
                <option value="">Select deal…</option>
                {deals.map(d => <option key={d.id} value={d.ref}>{d.ref} — {d.product}</option>)}
              </select>
              <input placeholder="Supplier name" value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <div className="flex gap-2">
                <input type="number" placeholder="Unit price" value={form.unitPrice}
                  onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
                <select value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="border rounded-lg px-2 py-2 text-sm" style={{ borderColor: BORDER }}
                >
                  {["KES","USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="MOQ" value={form.moq}
                  onChange={e => setForm(f => ({ ...f, moq: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
                <input type="number" placeholder="Lead (days)" value={form.leadDays}
                  onChange={e => setForm(f => ({ ...f, leadDays: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <input placeholder="Note (optional)" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: BORDER }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-full border" style={{ borderColor: BORDER }}>Cancel</button>
              <button onClick={submit} className="text-sm px-5 py-2 rounded-full text-white font-semibold" style={{ background: WINE }}>Submit</button>
            </div>
          </div>
        )}

        {visible.length === 0
          ? <EmptyState icon={Receipt} label="No quotes yet — add your first supplier quote above." />
          : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: BORDER }}>
                  <tr>
                    {["Deal Ref","Supplier","Unit Price","MOQ","Lead","Note","Status",""].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map(b => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: BORDER }}>
                      <td className="px-4 py-3 font-mono text-xs">{b.dealRef}</td>
                      <td className="px-4 py-3 font-medium">{b.supplier}</td>
                      <td className={`px-4 py-3 font-mono font-semibold ${b.unitPrice === lowest && visible.length > 1 ? "text-green-700" : ""}`}>
                        {b.currency} {fmt(b.unitPrice)}
                        {b.unitPrice === lowest && visible.length > 1 && (
                          <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">lowest</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.moq.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.leadDays}d</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[140px] truncate">{b.note || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {b.status === "pending" && (
                            <>
                              <button onClick={() => void update(b.id, { status: "shortlisted" })}
                                title="Shortlist" className="text-indigo-500 hover:text-indigo-700">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button onClick={() => void update(b.id, { status: "awarded" })}
                                title="Award" className="text-green-500 hover:text-green-700">
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={() => void update(b.id, { status: "rejected" })}
                                title="Reject" className="text-red-400 hover:text-red-600">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {b.status === "shortlisted" && (
                            <button onClick={() => void update(b.id, { status: "awarded" })}
                              title="Award" className="text-green-500 hover:text-green-700">
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => void remove(b.id)} className="text-red-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </AdminShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRADING — PRICE NEGOTIATION
════════════════════════════════════════════════════════════════ */

export function AdminTradingNegotiation() {
  const { deals } = useDeals()
  const { rounds, add, update, remove } = useNeg()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    dealRef: "", supplier: "", round: "1" as "1"|"2",
    ourOffer: "", theirCounter: "", currency: "KES",
    floor: "", notes: "",
  })

  function submit() {
    if (!form.dealRef || !form.supplier || !form.ourOffer) return
    void add({
      dealRef: form.dealRef, supplier: form.supplier,
      round: parseInt(form.round) as 1|2,
      ourOffer: parseFloat(form.ourOffer),
      theirCounter: parseFloat(form.theirCounter) || 0,
      currency: form.currency,
      floor: parseFloat(form.floor) || 0,
      status: "pending",
      notes: form.notes,
    })
    setForm({ dealRef: "", supplier: "", round: "1", ourOffer: "", theirCounter: "", currency: "KES", floor: "", notes: "" })
    setOpen(false)
  }

  function margin(r: NegRound) {
    if (!r.floor || !r.theirCounter) return null
    return (((r.theirCounter - r.floor) / r.theirCounter) * 100).toFixed(1)
  }

  return (
    <AdminShell title="Price Negotiation">
      <div className="max-w-6xl space-y-6">
        <SectionHead
          eyebrow="Pipeline · Trading"
          title="Price Negotiation"
          icon={TrendingUp}
          blurb="Counter-offer workspace. Two structured rounds — our offer vs their counter. Margin floor enforced."
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{rounds.length} negotiation round{rounds.length !== 1 ? "s" : ""}</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full text-white"
            style={{ background: WINE }}
          >
            <Plus className="h-4 w-4" /> New Round
          </button>
        </div>

        {open && (
          <div className="rounded-xl border bg-white p-5 space-y-4" style={{ borderColor: BORDER }}>
            <p className="font-semibold text-sm">New Negotiation Round</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.dealRef}
                onChange={e => setForm(f => ({ ...f, dealRef: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              >
                <option value="">Select deal…</option>
                {deals.map(d => <option key={d.id} value={d.ref}>{d.ref} — {d.product}</option>)}
              </select>
              <input placeholder="Supplier" value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <select value={form.round}
                onChange={e => setForm(f => ({ ...f, round: e.target.value as "1"|"2" }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              >
                <option value="1">Round 1</option>
                <option value="2">Round 2</option>
              </select>
              <select value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              >
                {["KES","USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Our offer" value={form.ourOffer}
                onChange={e => setForm(f => ({ ...f, ourOffer: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <input type="number" placeholder="Their counter (0 if pending)" value={form.theirCounter}
                onChange={e => setForm(f => ({ ...f, theirCounter: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <input type="number" placeholder="Margin floor" value={form.floor}
                onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <input placeholder="Notes" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-full border" style={{ borderColor: BORDER }}>Cancel</button>
              <button onClick={submit} className="text-sm px-5 py-2 rounded-full text-white font-semibold" style={{ background: WINE }}>Save</button>
            </div>
          </div>
        )}

        {rounds.length === 0
          ? <EmptyState icon={TrendingUp} label="No negotiation rounds yet." />
          : (
            <div className="space-y-3">
              {rounds.map(r => {
                const m = margin(r)
                const belowFloor = r.theirCounter > 0 && r.floor > 0 && r.theirCounter < r.floor
                return (
                  <div key={r.id} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rd {r.round}</span>
                          <span className="font-mono text-xs">{r.dealRef}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="font-semibold text-sm">{r.supplier}</p>
                        {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                      </div>
                      <div className="text-right space-y-1 flex-shrink-0">
                        <div className="text-xs text-muted-foreground">Our offer</div>
                        <div className="font-mono font-semibold text-sm">{r.currency} {fmt(r.ourOffer)}</div>
                        {r.theirCounter > 0 && (
                          <>
                            <div className="text-xs text-muted-foreground mt-1">Their counter</div>
                            <div className={`font-mono font-semibold text-sm ${belowFloor ? "text-red-600" : ""}`}>
                              {r.currency} {fmt(r.theirCounter)}
                              {belowFloor && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded">below floor</span>}
                            </div>
                          </>
                        )}
                        {m && <div className="text-xs text-muted-foreground">Margin: {m}%</div>}
                      </div>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
                        <button onClick={() => void update(r.id, { status: "accepted" })}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-semibold border border-green-200">
                          <Check className="h-3 w-3" /> Accept
                        </button>
                        <button onClick={() => void update(r.id, { status: "rejected" })}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-semibold border border-red-200">
                          <X className="h-3 w-3" /> Reject
                        </button>
                        <button onClick={() => void update(r.id, { status: "expired" })}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 font-semibold border border-gray-200">
                          <RefreshCw className="h-3 w-3" /> Expire
                        </button>
                        <div className="flex-1" />
                        <button onClick={() => void remove(r.id)} className="text-red-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {r.status !== "pending" && (
                      <div className="flex justify-end mt-3">
                        <button onClick={() => void remove(r.id)} className="text-red-300 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </AdminShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRADING — SETTLEMENTS
════════════════════════════════════════════════════════════════ */

export function AdminTradingSettlements() {
  const { deals } = useDeals()
  const { pos } = usePurchaseOrders([])
  const { settlements, add, update, remove } = useSettlements()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    dealRef: "", supplier: "", poNumber: "", linkedPurchaseOrderId: "",
    invoiceNumber: "",
    poValue: "", invoiceValue: "", currency: "KES",
    dueDate: "", notes: "",
  })

  function linkPo(poId: string) {
    const po = pos.find(p => p.id === poId)
    if (!po) {
      setForm(f => ({ ...f, linkedPurchaseOrderId: poId, poNumber: f.poNumber }))
      return
    }
    setForm(f => ({
      ...f,
      linkedPurchaseOrderId: po.id,
      poNumber: po.poNumber || f.poNumber,
      poValue: String((po.qty * po.unitCost) || f.poValue),
      supplier: f.supplier || po.supplierId,
    }))
  }

  function submit() {
    if (!form.dealRef || !form.poNumber) return
    void add({
      dealRef: form.dealRef, supplier: form.supplier,
      poNumber: form.poNumber,
      linkedPurchaseOrderId: form.linkedPurchaseOrderId || undefined,
      invoiceNumber: form.invoiceNumber,
      poValue: parseFloat(form.poValue) || 0,
      invoiceValue: parseFloat(form.invoiceValue) || 0,
      currency: form.currency,
      matchStatus: "pending", paymentStatus: "unpaid",
      dueDate: form.dueDate, settledAt: "", notes: form.notes,
    })
    setForm({
      dealRef: "", supplier: "", poNumber: "", linkedPurchaseOrderId: "",
      invoiceNumber: "", poValue: "", invoiceValue: "", currency: "KES",
      dueDate: "", notes: "",
    })
    setOpen(false)
  }

  const totals = {
    unpaid:  settlements.filter(s => s.paymentStatus === "unpaid").reduce((a, s) => a + s.invoiceValue, 0),
    overdue: settlements.filter(s => s.paymentStatus === "overdue").reduce((a, s) => a + s.invoiceValue, 0),
    paid:    settlements.filter(s => s.paymentStatus === "paid").reduce((a, s) => a + s.invoiceValue, 0),
  }

  return (
    <AdminShell title="Settlements">
      <div className="max-w-6xl space-y-6">
        <SectionHead
          eyebrow="Pipeline · Trading"
          title="Settlements"
          icon={Wallet}
          blurb="Closed deals, supplier invoices, and payment status — feeds the ledger and supplier performance score."
        />

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border p-4 bg-white" style={{ borderColor: BORDER }}>
            <p className="text-xs font-semibold text-muted-foreground">Unpaid</p>
            <p className="text-xl font-bold mt-1">KES {fmt(totals.unpaid)}</p>
          </div>
          <div className="rounded-xl border p-4 bg-red-50 border-red-100">
            <p className="text-xs font-semibold text-red-600">Overdue</p>
            <p className="text-xl font-bold text-red-700 mt-1">KES {fmt(totals.overdue)}</p>
          </div>
          <div className="rounded-xl border p-4 bg-green-50 border-green-100">
            <p className="text-xs font-semibold text-green-700">Paid</p>
            <p className="text-xl font-bold text-green-700 mt-1">KES {fmt(totals.paid)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{settlements.length} settlement{settlements.length !== 1 ? "s" : ""}</p>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full text-white"
            style={{ background: WINE }}
          >
            <Plus className="h-4 w-4" /> New Settlement
          </button>
        </div>

        {open && (
          <div className="rounded-xl border bg-white p-5 space-y-4" style={{ borderColor: BORDER }}>
            <p className="font-semibold text-sm">New Settlement</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.dealRef}
                onChange={e => setForm(f => ({ ...f, dealRef: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              >
                <option value="">Select deal…</option>
                {deals.map(d => <option key={d.id} value={d.ref}>{d.ref} — {d.product}</option>)}
              </select>
              <input placeholder="Supplier" value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <input placeholder="PO number" value={form.poNumber}
                onChange={e => setForm(f => ({ ...f, poNumber: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <select
                value={form.linkedPurchaseOrderId}
                onChange={e => linkPo(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              >
                <option value="">Link supplier PO (optional)…</option>
                {pos.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — KES {fmt(po.qty * po.unitCost)} ({po.status})
                  </option>
                ))}
              </select>
              <input placeholder="Invoice number" value={form.invoiceNumber}
                onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" style={{ borderColor: BORDER }}
              />
              <div className="flex gap-2">
                <input type="number" placeholder="PO value" value={form.poValue}
                  onChange={e => setForm(f => ({ ...f, poValue: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
                <input type="number" placeholder="Invoice value" value={form.invoiceValue}
                  onChange={e => setForm(f => ({ ...f, invoiceValue: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
              </div>
              <div className="flex gap-2">
                <select value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="border rounded-lg px-2 py-2 text-sm" style={{ borderColor: BORDER }}
                >
                  {["KES","USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="border rounded-lg px-3 py-2 text-sm flex-1" style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <input placeholder="Notes (optional)" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: BORDER }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-full border" style={{ borderColor: BORDER }}>Cancel</button>
              <button onClick={submit} className="text-sm px-5 py-2 rounded-full text-white font-semibold" style={{ background: WINE }}>Create</button>
            </div>
          </div>
        )}

        {settlements.length === 0
          ? <EmptyState icon={Wallet} label="No settlements yet — create one above." />
          : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: BORDER }}>
                  <tr>
                    {["Deal Ref","PO #","Linked PO","Invoice #","PO Value","Invoice Value","Match","Payment","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settlements.map(s => {
                    const mismatch = s.invoiceValue > 0 && s.poValue > 0 && Math.abs(s.invoiceValue - s.poValue) / s.poValue > 0.02
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: BORDER }}>
                        <td className="px-4 py-3 font-mono text-xs">{s.dealRef}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.poNumber}</td>
                        <td className="px-4 py-3 text-xs">
                          {s.linkedPurchaseOrderId ? (
                            <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                              {pos.find(p => p.id === s.linkedPurchaseOrderId)?.poNumber ?? s.linkedPurchaseOrderId.slice(0, 8)}
                            </span>
                          ) : (
                            <select
                              value=""
                              onChange={e => {
                                const po = pos.find(p => p.id === e.target.value)
                                if (!po) return
                                void update(s.id, {
                                  linkedPurchaseOrderId: po.id,
                                  poNumber: s.poNumber || po.poNumber,
                                  poValue: s.poValue || po.qty * po.unitCost,
                                })
                              }}
                              className="text-[10px] border rounded px-1 py-0.5 max-w-[120px]"
                              style={{ borderColor: BORDER }}
                            >
                              <option value="">Link PO…</option>
                              {pos.map(po => (
                                <option key={po.id} value={po.id}>{po.poNumber}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{s.invoiceNumber || "—"}</td>
                        <td className="px-4 py-3 font-mono">{s.currency} {fmt(s.poValue)}</td>
                        <td className={`px-4 py-3 font-mono ${mismatch ? "text-red-600 font-semibold" : ""}`}>
                          {s.currency} {fmt(s.invoiceValue)}
                          {mismatch && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">Δ {(Math.abs(s.invoiceValue - s.poValue) / s.poValue * 100).toFixed(1)}%</span>}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.matchStatus}
                            onChange={e => void update(s.id, { matchStatus: e.target.value as Settlement["matchStatus"] })}
                            className="text-xs border rounded px-1.5 py-1" style={{ borderColor: BORDER }}
                          >
                            <option value="pending">pending</option>
                            <option value="matched">matched</option>
                            <option value="disputed">disputed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={s.paymentStatus}
                            onChange={e => void update(s.id, {
                              paymentStatus: e.target.value as Settlement["paymentStatus"],
                              settledAt: e.target.value === "paid" ? new Date().toISOString() : s.settledAt,
                            })}
                            className="text-xs border rounded px-1.5 py-1" style={{ borderColor: BORDER }}
                          >
                            <option value="unpaid">unpaid</option>
                            <option value="paid">paid</option>
                            <option value="overdue">overdue</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => void remove(s.id)} className="text-red-300 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </AdminShell>
  )
}

/* ═══════════════════════════════════════════════════════════════
   QA & ASSURANCE — placeholder sub-pages (functional ops in qa-ops.tsx)
════════════════════════════════════════════════════════════════ */

export function AdminQaBatches() {
  return (
    <FlowStage
      title="Batch Verification"
      eyebrow="Pipeline · QA & Assurance"
      icon={ClipboardList}
      blurb="Per-batch traceability: supplier, manufacture / expiry date, lab report, QR/blockchain anchor."
      steps={[
        { label: "Batch profile", detail: "Lot #, expiry, CoA on file." },
        { label: "Anchor", detail: "QR + blockchain hash for end-customer verification." },
        { label: "Release", detail: "Searchable under Trust Seal Registry." },
      ]}
    />
  )
}

export function AdminQaTrustSeal() {
  return (
    <FlowStage
      title="Trust Seal Registry"
      eyebrow="Pipeline · QA & Assurance"
      icon={HeartHandshake}
      blurb="Verified medicines / suppliers carry the Shaniid RX shield. This registry powers the PDP badge."
      steps={[
        { label: "Eligibility", detail: "Supplier audit + batch lineage + lab report." },
        { label: "Issue seal", detail: "Surfaces on the storefront PDP." },
        { label: "Revoke", detail: "Auto-revoke on QC fail or recall." },
      ]}
    />
  )
}

export function AdminQaRecalls() {
  return (
    <FlowStage
      title="Recalls & Compliance"
      eyebrow="Pipeline · QA & Assurance"
      icon={AlertCircle}
      blurb="Initiate, track and notify on regulator and supplier-driven recalls. Touches customer comms automatically."
      steps={[
        { label: "Open recall", detail: "Reference batch / lot." },
        { label: "Notify customers", detail: "SMS + WhatsApp + Email templates (Communications)." },
        { label: "Reconcile", detail: "Returned units, refund posting, regulator report." },
      ]}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   LOGISTICS — placeholder sub-pages (operational hub in logistics-ops.tsx)
════════════════════════════════════════════════════════════════ */

export function AdminLogisticsInventory() {
  return (
    <FlowStage
      title="Inventory Optimization"
      eyebrow="Pipeline · Logistics"
      icon={Warehouse}
      blurb="Min/max levels, ABC classification, slow-mover detection — all tied back to Demand Forecast."
      steps={[
        { label: "Snapshot", detail: "Daily stock-on-hand across hubs." },
        { label: "Reorder points", detail: "Computed from forecast + lead time." },
        { label: "Action", detail: "Push reorder to Sourcing automation." },
      ]}
    />
  )
}

export function AdminLogisticsLeadTime() {
  return (
    <FlowStage
      title="Lead Time Monitoring"
      eyebrow="Pipeline · Logistics"
      icon={Timer}
      blurb="Track promised vs actual lead times per supplier and per route. Feeds supplier performance scoring."
      steps={[
        { label: "Promised", detail: "From PO / award." },
        { label: "Actual", detail: "From dispatch + delivery events." },
        { label: "Variance", detail: "Penalties flow to supplier scorecard." },
      ]}
    />
  )
}

export function AdminLogisticsFallback() {
  return (
    <FlowStage
      title="Retail Emergency Fallback"
      eyebrow="Pipeline · Logistics"
      icon={Truck}
      blurb="When demand spikes or a supplier misses, pull from the nearest verified retail pharmacy partner."
      steps={[
        { label: "Trigger", detail: "Stockout risk detected by inventory + forecast." },
        { label: "Match", detail: "Find nearest partner with stock + Trust Seal." },
        { label: "Fulfil", detail: "Partner ships under Shaniid RX trust seal." },
      ]}
    />
  )
}

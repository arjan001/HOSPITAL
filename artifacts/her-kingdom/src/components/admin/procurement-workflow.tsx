"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { AdminShell } from "./admin-shell"
import {
  apiAdminProcurement,
  type ProcurementDecisionRow,
  type ProcurementSummary,
  type SupplierSuggestionRow,
} from "@/lib/api-nest"
import { cmsStore } from "@/lib/cms-store"
import { SOURCING_KEYS } from "./sourcing-shared"
import type { InventoryItem } from "./sourcing-shared"
import type { Quote, Supplier } from "./sourcing"
import {
  OpsPanel,
  OPS_BORDER,
  OPS_ORANGE,
  OPS_WINE,
  PRIORITY_STYLE,
  DECISION_STATUS_STYLE,
} from "./operations-shared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Truck,
  ClipboardCheck,
  AlertCircle,
  ChevronRight,
  Package,
} from "lucide-react"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "pending" | "approved" | "ordered" | "rejected"

function formatKes(n: number | null | undefined) {
  if (n == null || n <= 0) return "—"
  return `KSh ${n.toLocaleString()}`
}

export function AdminProcurementWorkflow() {
  const [summary, setSummary] = useState<ProcurementSummary | null>(null)
  const [decisions, setDecisions] = useState<ProcurementDecisionRow[]>([])
  const [suggestions, setSuggestions] = useState<SupplierSuggestionRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [windowDays, setWindowDays] = useState("30")

  const [loadingList, setLoadingList] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const selected = useMemo(
    () => decisions.find((d) => d.id === selectedId) ?? null,
    [decisions, selectedId],
  )

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4000)
  }

  const loadDecisions = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      const [sum, list] = await Promise.all([
        apiAdminProcurement.summary(),
        apiAdminProcurement.listDecisions(statusFilter === "all" ? undefined : statusFilter),
      ])
      setSummary(sum)
      setDecisions(list)
      setSelectedId((cur) => {
        if (cur && list.some((d) => d.id === cur)) return cur
        return list[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load procurement queue")
      setDecisions([])
    } finally {
      setLoadingList(false)
    }
  }, [statusFilter])

  const loadSuggestions = useCallback(async (decisionId: string) => {
    setLoadingSuggestions(true)
    try {
      const rows = await apiAdminProcurement.listSuggestions(decisionId)
      setSuggestions(rows)
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  useEffect(() => {
    void loadDecisions()
  }, [loadDecisions])

  useEffect(() => {
    if (!selectedId) {
      setSuggestions([])
      return
    }
    void loadSuggestions(selectedId)
  }, [selectedId, loadSuggestions])

  const cmsContext = useCallback(() => {
    const suppliers = cmsStore.get<Supplier[]>(SOURCING_KEYS.suppliers, [])
    const quotes = cmsStore.get<Quote[]>(SOURCING_KEYS.quotes, [])
    const inventory = cmsStore.get<InventoryItem[]>(SOURCING_KEYS.inventory, [])
    return {
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        tier: s.tier,
        verification: s.verification,
        leadTimeDays: s.leadTimeDays,
        moq: s.moq,
        rating: s.rating,
        categories: s.categories,
      })),
      quotes: quotes.map((q) => ({
        supplierId: q.supplierId,
        unitCost: q.unitCost,
        sku: decisions.find((d) => d.id === selectedId)?.sku,
      })),
      inventory: inventory.map((i) => ({
        sku: i.sku,
        productName: i.productName,
        onHand: i.onHand,
        safetyStock: i.safetyStock,
        unitCost: i.unitCost,
      })),
    }
  }, [decisions, selectedId])

  const handleGenerate = async () => {
    setBusy("generate")
    setError(null)
    try {
      const { inventory } = cmsContext()
      const res = await apiAdminProcurement.generateFromDemand({
        windowDays: Number(windowDays) || 30,
        inventory,
      })
      showToast(`Queue updated: ${res.created} new, ${res.updated} refreshed`)
      await loadDecisions()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed")
    } finally {
      setBusy(null)
    }
  }

  const patchStatus = async (id: string, status: string) => {
    setBusy(`patch-${id}`)
    setError(null)
    try {
      const row = await apiAdminProcurement.patchDecision(id, { status })
      setDecisions((prev) => prev.map((d) => (d.id === id ? row : d)))
      showToast(`Marked ${status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setBusy(null)
    }
  }

  const handleSuggest = async () => {
    if (!selectedId) return
    setBusy("suggest")
    setError(null)
    try {
      const ctx = cmsContext()
      if (ctx.suppliers.length === 0) {
        setError("Add suppliers under Sourcing → Supplier Registry first.")
        return
      }
      const rows = await apiAdminProcurement.suggestSuppliers(selectedId, ctx)
      setSuggestions(rows)
      await loadDecisions()
      showToast(`Ranked ${rows.length} suppliers`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Supplier ranking failed")
    } finally {
      setBusy(null)
    }
  }

  const handleSelectSupplier = async (suggestionId: string) => {
    if (!selectedId || !selected) return
    setBusy(`select-${suggestionId}`)
    setError(null)
    try {
      const { inventory } = cmsContext()
      const { decision, suggestion, sourcingRequest } = await apiAdminProcurement.selectSupplier(
        selectedId,
        suggestionId,
        inventory,
      )
      setDecisions((prev) => prev.map((d) => (d.id === selectedId ? decision : d)))
      setSuggestions((prev) =>
        prev.map((s) => ({
          ...s,
          status: s.id === suggestionId ? "selected" : "rejected",
        })),
      )
      showToast(
        `Selected ${suggestion.supplierName} · Postgres sourcing request ${sourcingRequest.id.slice(-8)}`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not select supplier")
    } finally {
      setBusy(null)
    }
  }

  const canSuggest = selected?.status === "approved"
  const canApprove = selected?.status === "pending"
  const canSelect = selected?.status === "approved" && suggestions.length > 0

  return (
    <AdminShell title="Procurement & Suppliers">
      <div className="space-y-4 max-w-[1400px]">
        {toast && (
          <div
            className="text-sm rounded-xl border px-4 py-3 flex items-center gap-2 bg-emerald-50 text-emerald-900 border-emerald-200"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {toast}
          </div>
        )}

        {error && (
          <div
            className="text-sm rounded-xl border px-4 py-3 flex items-start gap-2 bg-red-50 text-red-800 border-red-200"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button type="button" className="ml-auto text-xs underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground max-w-2xl">
            Business logic #6–7: turn aggregated demand into buy decisions, then rank suppliers from your registry.
            <Link href="/admin/operations/demand" className="ml-1 underline font-medium" style={{ color: OPS_WINE }}>
              Demand aggregation →
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={windowDays} onValueChange={setWindowDays}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7d demand</SelectItem>
                <SelectItem value="30">30d demand</SelectItem>
                <SelectItem value="90">90d demand</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={busy === "generate"}
              onClick={() => void handleGenerate()}
              className="gap-1.5"
              style={{ background: `linear-gradient(135deg, ${OPS_ORANGE} 0%, #B91C1C 100%)` }}
            >
              {busy === "generate" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Build from demand
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadDecisions()} disabled={loadingList}>
              <RefreshCw className={cn("h-3.5 w-3.5", loadingList && "animate-spin")} />
            </Button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(
              [
                ["Pending", summary.pending, "pending"],
                ["Approved", summary.approved, "approved"],
                ["Ordered", summary.ordered, "ordered"],
                ["Rejected", summary.rejected, "rejected"],
                ["Total", summary.total, "all"],
              ] as const
            ).map(([label, n, key]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  statusFilter === key ? "ring-2 ring-offset-1" : "hover:bg-muted/40",
                )}
                style={statusFilter === key ? { borderColor: OPS_ORANGE } : undefined}
              >
                <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: OPS_WINE }}>
                  {n}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="grid xl:grid-cols-2 gap-4 items-start">
          {/* BL #6 — Procurement decisions */}
          <OpsPanel
            badge="Business logic #6"
            title="Procurement decisions"
            subtitle="Approve, reject, or defer each SKU line before sourcing."
            actions={
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            {loadingList ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading queue…</p>
            ) : decisions.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Package className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">No decisions yet.</p>
                <p className="text-xs text-muted-foreground">Run “Build from demand” after demand aggregation has data.</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {decisions.map((d) => {
                  const active = d.id === selectedId
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(d.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-all",
                          active ? "shadow-md" : "hover:border-orange-200",
                        )}
                        style={
                          active
                            ? { borderColor: OPS_ORANGE, background: "#FFF6EE" }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{d.productName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{d.sku}</p>
                          </div>
                          <ChevronRight
                            className={cn("h-4 w-4 shrink-0 transition-transform", active && "rotate-90")}
                            style={{ color: OPS_WINE }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className={cn("text-[10px] border", DECISION_STATUS_STYLE[d.status])}>
                            {d.status}
                          </Badge>
                          <Badge variant="outline" className={cn("text-[10px] border", PRIORITY_STYLE[d.priority])}>
                            {d.priority}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">Qty {d.suggestedQty}</span>
                        </div>
                        {d.reason && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{d.reason}</p>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {selected && (
              <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: OPS_BORDER }}>
                <p className="text-xs font-bold uppercase text-muted-foreground">Actions · {selected.sku}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm"
                      value={selected.suggestedQty}
                      onChange={(e) => {
                        const qty = Number(e.target.value) || 1
                        setDecisions((prev) =>
                          prev.map((d) => (d.id === selected.id ? { ...d, suggestedQty: qty } : d)),
                        )
                      }}
                      onBlur={() => {
                        void apiAdminProcurement
                          .patchDecision(selected.id, { suggestedQty: selected.suggestedQty })
                          .catch(() => {})
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Priority</Label>
                    <Select
                      value={selected.priority}
                      onValueChange={(v) => {
                        void apiAdminProcurement.patchDecision(selected.id, { priority: v }).then((row) => {
                          setDecisions((prev) => prev.map((d) => (d.id === row.id ? row : d)))
                        })
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["urgent", "high", "normal", "low"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canApprove && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1"
                        disabled={!!busy}
                        onClick={() => void patchStatus(selected.id, "approved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve buy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!busy}
                        onClick={() => void patchStatus(selected.id, "rejected")}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {selected.status === "ordered" && selected.selectedSupplierName && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-violet-100 text-violet-900">
                        {selected.selectedSupplierName}
                      </Badge>
                      {selected.sourcingRequestId && (
                        <Link
                          href="/admin/sourcing"
                          className="text-[11px] font-mono underline text-violet-800"
                        >
                          SR-{selected.sourcingRequestId.slice(-8)}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </OpsPanel>

          {/* BL #7 — Supplier suggestions */}
          <OpsPanel
            badge="Business logic #7"
            title="Supplier suggestions"
            subtitle={
              selected
                ? `Ranked options for ${selected.productName}`
                : "Select a procurement line to rank suppliers."
            }
            actions={
              selected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canSuggest || busy === "suggest"}
                  onClick={() => void handleSuggest()}
                  className="gap-1.5"
                >
                  {busy === "suggest" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Truck className="h-3.5 w-3.5" />
                  )}
                  Rank suppliers
                </Button>
              ) : null
            }
          >
            {!selected ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Choose a line on the left to run supplier selection.
              </p>
            ) : selected.status === "pending" ? (
              <div className="py-10 text-center space-y-2">
                <ClipboardCheck className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm font-medium">Approve this line first</p>
                <p className="text-xs text-muted-foreground">
                  Supplier ranking runs after the procurement decision is approved.
                </p>
              </div>
            ) : loadingSuggestions ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading suggestions…</p>
            ) : suggestions.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <Truck className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">
                  No rankings yet. Uses suppliers, quotes, and inventory from Sourcing CMS.
                </p>
                {canSuggest && (
                  <Button type="button" size="sm" onClick={() => void handleSuggest()} disabled={busy === "suggest"}>
                    Rank suppliers now
                  </Button>
                )}
              </div>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      "rounded-xl border p-4",
                      s.status === "selected" && "border-violet-300 bg-violet-50/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center text-white"
                            style={{ background: OPS_WINE }}
                          >
                            {s.rank}
                          </span>
                          <p className="font-semibold text-sm">{s.supplierName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{s.rationale}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold tabular-nums" style={{ color: OPS_WINE }}>
                          {s.score}
                        </p>
                        <p className="text-[10px] text-muted-foreground">score</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-muted-foreground">
                      <span>{formatKes(s.unitCostEstimate)} / unit</span>
                      {s.leadTimeDays != null && <span>· {s.leadTimeDays}d lead</span>}
                      {s.moq != null && <span>· MOQ {s.moq}</span>}
                    </div>
                    {s.status === "selected" ? (
                      <Badge className="mt-2 bg-violet-100 text-violet-900">Selected</Badge>
                    ) : canSelect && selected.status === "approved" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        disabled={busy === `select-${s.id}`}
                        onClick={() => void handleSelectSupplier(s.id)}
                      >
                        Select supplier
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t">
              <Link href="/admin/suppliers" className="underline">
                Supplier registry
              </Link>
              {" · "}
              <Link href="/admin/sourcing" className="underline">
                Sourcing & POs
              </Link>
            </p>
          </OpsPanel>
        </div>
      </div>
    </AdminShell>
  )
}

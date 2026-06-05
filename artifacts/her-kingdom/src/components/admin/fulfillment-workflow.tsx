"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { AdminShell } from "./admin-shell"
import {
  apiAdminAssembly,
  apiAdminInventory,
  type AssemblyJobDetail,
  type AvailabilityLine,
  type CarePackAssemblyJobRow,
  type InventoryAllocationRow,
  type StockLinePayload,
} from "@/lib/api-nest"
import { cmsStore } from "@/lib/cms-store"
import { SOURCING_KEYS } from "./sourcing-shared"
import type { InventoryItem } from "./sourcing-shared"
import {
  OpsPanel,
  OPS_BORDER,
  OPS_ORANGE,
  OPS_WINE,
  PRIORITY_STYLE,
  ALLOCATION_STATUS_STYLE,
  ASSEMBLY_STATUS_STYLE,
} from "./operations-shared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Package,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Warehouse,
} from "lucide-react"
import { cn } from "@/lib/utils"

type AllocFilter = "all" | "reserved" | "committed" | "released"
type JobFilter = "all" | "queued" | "allocating" | "picking" | "assembled" | "ready" | "dispatched" | "cancelled"

function stockFromCms(): StockLinePayload[] {
  return cmsStore.get<InventoryItem[]>(SOURCING_KEYS.inventory, []).map((i) => ({
    sku: i.sku,
    productName: i.productName,
    onHand: i.onHand,
    safetyStock: i.safetyStock,
    location: i.location,
    unitCost: i.unitCost,
  }))
}

function refLabel(type: string) {
  if (type === "procurement_decision") return "Procurement"
  if (type === "care_pack_assembly") return "Care pack"
  return type.replace(/_/g, " ")
}

export function AdminFulfillmentWorkflow() {
  const [allocSummary, setAllocSummary] = useState<{
    reserved: { count: number; units: number }
    committed: { count: number; units: number }
    released: { count: number; units: number }
  } | null>(null)
  const [allocations, setAllocations] = useState<InventoryAllocationRow[]>([])
  const [allocFilter, setAllocFilter] = useState<AllocFilter>("all")
  const [selectedAllocId, setSelectedAllocId] = useState<string | null>(null)
  const [availability, setAvailability] = useState<AvailabilityLine[]>([])

  const [assemblySummary, setAssemblySummary] = useState<Record<string, number> | null>(null)
  const [jobs, setJobs] = useState<CarePackAssemblyJobRow[]>([])
  const [jobFilter, setJobFilter] = useState<JobFilter>("all")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [jobDetail, setJobDetail] = useState<AssemblyJobDetail | null>(null)
  const [pendingAssessments, setPendingAssessments] = useState<
    Array<{
      id: string
      createdAt: string
      recommendedPacks: Array<{ packSlug: string; packName: string; productSkus: string[] }>
      riskLevel: string | null
    }>
  >([])

  const [loadingAlloc, setLoadingAlloc] = useState(true)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const selectedAlloc = useMemo(
    () => allocations.find((a) => a.id === selectedAllocId) ?? null,
    [allocations, selectedAllocId],
  )

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  )

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4000)
  }

  const refreshAvailability = useCallback(async () => {
    const stock = stockFromCms()
    if (stock.length === 0) {
      setAvailability([])
      return
    }
    try {
      const res = await apiAdminInventory.availability(stock)
      setAvailability(res.lines)
    } catch {
      setAvailability([])
    }
  }, [])

  const loadAllocations = useCallback(async () => {
    setLoadingAlloc(true)
    setError(null)
    try {
      const [sum, list] = await Promise.all([
        apiAdminInventory.summary(),
        apiAdminInventory.listAllocations(allocFilter === "all" ? undefined : { status: allocFilter }),
      ])
      setAllocSummary(sum)
      setAllocations(list)
      setSelectedAllocId((cur) => {
        if (cur && list.some((a) => a.id === cur)) return cur
        return list[0]?.id ?? null
      })
      await refreshAvailability()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory allocations")
      setAllocations([])
    } finally {
      setLoadingAlloc(false)
    }
  }, [allocFilter, refreshAvailability])

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    try {
      const [sum, list, pending] = await Promise.all([
        apiAdminAssembly.summary(),
        apiAdminAssembly.listJobs(jobFilter === "all" ? undefined : jobFilter),
        apiAdminAssembly.pendingAssessments(),
      ])
      setAssemblySummary(sum)
      setJobs(list)
      setPendingAssessments(pending)
      setSelectedJobId((cur) => {
        if (cur && list.some((j) => j.id === cur)) return cur
        return list[0]?.id ?? null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assembly queue")
      setJobs([])
    } finally {
      setLoadingJobs(false)
    }
  }, [jobFilter])

  const loadJobDetail = useCallback(async (jobId: string) => {
    setLoadingDetail(true)
    try {
      const detail = await apiAdminAssembly.getJob(jobId)
      setJobDetail(detail)
      setJobs((prev) => prev.map((j) => (j.id === jobId ? detail.job : j)))
    } catch {
      setJobDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    void loadAllocations()
  }, [loadAllocations])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null)
      return
    }
    void loadJobDetail(selectedJobId)
  }, [selectedJobId, loadJobDetail])

  const handleSyncProcurement = async () => {
    const stock = stockFromCms()
    if (stock.length === 0) {
      setError("Add inventory under Sourcing → Inventory before reserving stock.")
      return
    }
    setBusy("sync-proc")
    setError(null)
    try {
      const res = await apiAdminInventory.syncProcurement(stock)
      showToast(
        `Procurement sync: ${res.created} reserved · ${res.scanned} ordered lines scanned` +
          (res.skipped.length ? ` · ${res.skipped.length} short` : ""),
      )
      await loadAllocations()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Procurement sync failed")
    } finally {
      setBusy(null)
    }
  }

  const patchAllocation = async (id: string, status: "reserved" | "committed" | "released") => {
    setBusy(`alloc-${id}`)
    setError(null)
    try {
      const row = await apiAdminInventory.patchAllocation(id, status)
      setAllocations((prev) => prev.map((a) => (a.id === id ? row : a)))
      await loadAllocations()
      showToast(`Allocation ${status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update allocation")
    } finally {
      setBusy(null)
    }
  }

  const handleCreateFromAssessment = async (assessmentId: string) => {
    setBusy(`assess-${assessmentId}`)
    setError(null)
    try {
      const detail = await apiAdminAssembly.createFromAssessment(assessmentId)
      showToast(`Assembly job queued · ${detail.job.packName}`)
      await loadJobs()
      setSelectedJobId(detail.job.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create assembly job")
    } finally {
      setBusy(null)
    }
  }

  const handleAllocateJob = async () => {
    if (!selectedJobId) return
    const stock = stockFromCms()
    if (stock.length === 0) {
      setError("Sourcing inventory required to allocate SKUs.")
      return
    }
    setBusy("allocate-job")
    setError(null)
    try {
      const res = await apiAdminAssembly.allocateJob(selectedJobId, stock)
      setJobDetail(res)
      setJobs((prev) => prev.map((j) => (j.id === res.job.id ? res.job : j)))
      showToast(`Reserved stock for ${res.allocationsCreated} line(s)`)
      await loadAllocations()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Allocation failed")
    } finally {
      setBusy(null)
    }
  }

  const patchJobStatus = async (status: string) => {
    if (!selectedJobId) return
    setBusy(`job-${status}`)
    setError(null)
    try {
      const detail = await apiAdminAssembly.patchJob(selectedJobId, { status })
      setJobDetail(detail)
      setJobs((prev) => prev.map((j) => (j.id === detail.job.id ? detail.job : j)))
      showToast(`Job marked ${status}`)
      if (status === "assembled" || status === "cancelled") await loadAllocations()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Job update failed")
    } finally {
      setBusy(null)
    }
  }

  const canAllocateJob =
    selectedJob &&
    !["assembled", "ready", "dispatched", "cancelled"].includes(selectedJob.status)

  const allLinesAllocated =
    (jobDetail?.lines.length ?? 0) > 0 &&
    jobDetail!.lines.every((l) => l.quantityAllocated >= l.quantityRequired)

  const canMarkAssembled =
    selectedJob &&
    !["assembled", "ready", "dispatched", "cancelled"].includes(selectedJob.status) &&
    (selectedJob.status === "picking" || allLinesAllocated)

  const lowStock = availability.filter((l) => !l.canAllocate || l.available < (l.safetyStock ?? 0))

  const allocStatusClass = (status: string) =>
    ALLOCATION_STATUS_STYLE[status] ?? "bg-slate-100 text-slate-700 border-slate-200"
  const assemblyStatusClass = (status: string) =>
    ASSEMBLY_STATUS_STYLE[status] ?? "bg-slate-100 text-slate-700 border-slate-200"

  return (
    <AdminShell title="Inventory & Care Pack Assembly">
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
            Business logic #8–9: reserve stock against procurement and care packs, then pick and assemble bundles.
            <Link href="/admin/operations/procurement" className="ml-1 underline font-medium" style={{ color: OPS_WINE }}>
              Procurement →
            </Link>
            <Link href="/admin/operations/demand" className="ml-2 underline font-medium" style={{ color: OPS_WINE }}>
              Demand →
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy === "sync-proc"}
              onClick={() => void handleSyncProcurement()}
              className="gap-1.5"
              style={{ background: `linear-gradient(135deg, ${OPS_ORANGE} 0%, #B91C1C 100%)` }}
            >
              {busy === "sync-proc" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Reserve ordered procurement
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void loadAllocations()
                void loadJobs()
              }}
              disabled={loadingAlloc || loadingJobs}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", (loadingAlloc || loadingJobs) && "animate-spin")} />
            </Button>
          </div>
        </div>

        {lowStock.length > 0 && (
          <p className="text-xs rounded-lg border px-3 py-2 bg-amber-50 text-amber-900 border-amber-200">
            {lowStock.length} SKU(s) below safety or fully reserved — update{" "}
            <Link href="/admin/sourcing/inventory" className="underline font-medium">
              Sourcing inventory
            </Link>{" "}
            before allocating.
          </p>
        )}

        <div className="grid xl:grid-cols-2 gap-4 items-start">
          {/* BL #8 */}
          <OpsPanel
            badge="Business logic #8"
            title="Inventory allocation"
            subtitle="Soft reservations against on-hand stock (CMS snapshot). Commit on assembly complete; release on cancel."
            actions={
              <Select value={allocFilter} onValueChange={(v) => setAllocFilter(v as AllocFilter)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="committed">Committed</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            {allocSummary && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(
                  [
                    ["Reserved", allocSummary.reserved],
                    ["Committed", allocSummary.committed],
                    ["Released", allocSummary.released],
                  ] as const
                ).map(([label, bucket]) => (
                  <div key={label} className="rounded-lg border p-2.5" style={{ borderColor: OPS_BORDER }}>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: OPS_WINE }}>
                      {bucket.count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{bucket.units} units</p>
                  </div>
                ))}
              </div>
            )}

            {loadingAlloc ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading allocations…</p>
            ) : allocations.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Warehouse className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">No allocations yet.</p>
                <p className="text-xs text-muted-foreground">
                  Run “Reserve ordered procurement” after lines are marked ordered, or allocate a care pack job.
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {allocations.map((a) => {
                  const active = a.id === selectedAllocId
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedAllocId(a.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-all",
                          active ? "shadow-md" : "hover:border-orange-200",
                        )}
                        style={active ? { borderColor: OPS_ORANGE, background: "#FFF6EE" } : undefined}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{a.productName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{a.sku}</p>
                          </div>
                          <ChevronRight
                            className={cn("h-4 w-4 shrink-0", active && "rotate-90")}
                            style={{ color: OPS_WINE }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] border", allocStatusClass(a.status))}
                          >
                            {a.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">Qty {a.quantity}</span>
                          <span className="text-[11px] text-muted-foreground">
                            · {refLabel(a.referenceType)}
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {selectedAlloc && (
              <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: OPS_BORDER }}>
                <p className="text-xs font-bold uppercase text-muted-foreground">Actions</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {selectedAlloc.referenceType} / {selectedAlloc.referenceId}
                </p>
                {selectedAlloc.status === "reserved" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void patchAllocation(selectedAlloc.id, "committed")}
                    >
                      Commit stock
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => void patchAllocation(selectedAlloc.id, "released")}
                    >
                      Release
                    </Button>
                  </div>
                )}
              </div>
            )}

            {availability.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: OPS_BORDER }}>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Boxes className="h-3.5 w-3.5" /> Availability (CMS)
                </p>
                <ul className="space-y-1 max-h-[140px] overflow-y-auto text-[11px]">
                  {availability.slice(0, 12).map((l) => (
                    <li key={l.sku} className="flex justify-between gap-2">
                      <span className="truncate font-mono">{l.sku}</span>
                      <span className={cn("tabular-nums shrink-0", l.canAllocate ? "text-emerald-700" : "text-rose-700")}>
                        {l.available} avail / {l.onHand} on-hand
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </OpsPanel>

          {/* BL #9 */}
          <OpsPanel
            badge="Business logic #9"
            title="Care pack assembly"
            subtitle="Build jobs from assessments, allocate SKUs, then mark assembled when the bundle is complete."
            actions={
              <Select value={jobFilter} onValueChange={(v) => setJobFilter(v as JobFilter)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="allocating">Allocating</SelectItem>
                  <SelectItem value="picking">Picking</SelectItem>
                  <SelectItem value="assembled">Assembled</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            {assemblySummary && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {(
                  [
                    ["Queued", assemblySummary.queued ?? 0],
                    ["Picking", (assemblySummary.allocating ?? 0) + (assemblySummary.picking ?? 0)],
                    ["Done", (assemblySummary.assembled ?? 0) + (assemblySummary.ready ?? 0)],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label} className="rounded-lg border p-2.5" style={{ borderColor: OPS_BORDER }}>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: OPS_WINE }}>
                      {n}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {pendingAssessments.length > 0 && (
              <div className="mb-4 rounded-xl border p-3 bg-muted/30" style={{ borderColor: OPS_BORDER }}>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
                  Assessments without a job ({pendingAssessments.length})
                </p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  New storefront assessments auto-queue a job when the API is running.
                </p>
                <ul className="space-y-2 max-h-[120px] overflow-y-auto">
                  {pendingAssessments.slice(0, 5).map((a) => {
                    const pack = a.recommendedPacks[0]
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{pack?.packName ?? "Care pack"}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          disabled={busy === `assess-${a.id}`}
                          onClick={() => void handleCreateFromAssessment(a.id)}
                        >
                          Queue job
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {loadingJobs ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading assembly queue…</p>
            ) : jobs.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Package className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm text-muted-foreground">No assembly jobs yet.</p>
                <p className="text-xs text-muted-foreground">
                  Queue from a completed{" "}
                  <Link href="/care-packs/assessment" className="underline">
                    care pack assessment
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {jobs.map((j) => {
                  const active = j.id === selectedJobId
                  return (
                    <li key={j.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(j.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-all",
                          active ? "shadow-md" : "hover:border-orange-200",
                        )}
                        style={active ? { borderColor: OPS_ORANGE, background: "#FFF6EE" } : undefined}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{j.packName}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{j.packSlug}</p>
                          </div>
                          <ChevronRight
                            className={cn("h-4 w-4 shrink-0", active && "rotate-90")}
                            style={{ color: OPS_WINE }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] border", assemblyStatusClass(j.status))}
                          >
                            {j.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] border", PRIORITY_STYLE[j.priority] ?? PRIORITY_STYLE.normal)}
                          >
                            {j.priority}
                          </Badge>
                          {j.patientLabel && (
                            <span className="text-[11px] text-muted-foreground truncate">{j.patientLabel}</span>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {selectedJob && (
              <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: OPS_BORDER }}>
                <p className="text-xs font-bold uppercase text-muted-foreground">Pick list · {selectedJob.packName}</p>
                {loadingDetail ? (
                  <p className="text-sm text-muted-foreground">Loading lines…</p>
                ) : jobDetail ? (
                  <ul className="space-y-1.5 text-sm">
                    {jobDetail.lines.map((line) => (
                      <li
                        key={line.id}
                        className="flex justify-between gap-2 rounded-lg border px-2 py-1.5"
                        style={{ borderColor: OPS_BORDER }}
                      >
                        <span className="font-mono text-xs truncate">{line.sku}</span>
                        <span className="text-xs tabular-nums shrink-0">
                          {line.quantityAllocated}/{line.quantityRequired}
                          <Badge variant="outline" className="ml-1 text-[9px]">
                            {line.status}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {canAllocateJob && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy === "allocate-job"}
                      onClick={() => void handleAllocateJob()}
                      className="gap-1"
                    >
                      {busy === "allocate-job" ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Package className="h-3.5 w-3.5" />
                      )}
                      Allocate from stock
                    </Button>
                  )}
                  {canMarkAssembled && (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={!!busy}
                      onClick={() => void patchJobStatus("assembled")}
                      className="gap-1"
                    >
                      <PackageCheck className="h-3.5 w-3.5" /> Mark assembled
                    </Button>
                  )}
                  {selectedJob.status === "assembled" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => void patchJobStatus("ready")}
                    >
                      Ready for dispatch
                    </Button>
                  )}
                  {canAllocateJob && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => void patchJobStatus("cancelled")}
                    >
                      Cancel job
                    </Button>
                  )}
                </div>
                {jobDetail && jobDetail.allocations.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {jobDetail.allocations.length} linked reservation(s) — commit on assemble, release on cancel.
                  </p>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t">
              <Link href="/admin/operations/care-packs" className="underline">
                Care pack mapping
              </Link>
              {" · "}
              <Link href="/admin/sourcing/inventory" className="underline">
                Sourcing inventory
              </Link>
            </p>
          </OpsPanel>
        </div>
      </div>
    </AdminShell>
  )
}

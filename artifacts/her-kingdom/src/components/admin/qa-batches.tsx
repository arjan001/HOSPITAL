"use client"

/**
 * Batch verification & assessment (BL pipeline · QA).
 * Links logistics batch refs to the 7-step dispatch QA gate before last-mile dispatch.
 */

import { useCallback, useMemo, useState } from "react"
import { Link } from "wouter"
import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react"
import { newId } from "@/lib/cms-store"
import {
  useLogisticsBatches,
  useQaConfig,
  useQaDispatchChecks,
  useQaInventory,
} from "@/lib/use-qa-logistics-store"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  QA_DEFAULT_CONFIG,
  QA_STEP_LABEL,
  QA_STEP_ORDER,
  blankQaSteps,
  batchHasQaApproval,
  findChecksForBatch,
  qaCheckStatus,
  stepsCompleted,
  summarizeBatchQa,
  validateQaApproval,
  type QaDispatchCheck,
  type QaStepKey,
} from "./qa-shared"
import { OPS_BORDER, OPS_ORANGE, OPS_WINE, OpsPanel } from "./operations-shared"
import { cn } from "@/lib/utils"

const WINE = OPS_WINE

type LogisticsBatch = {
  id: string
  ref: string
  zoneId: string | null
  riderId: string | null
  scheduledAt: string
  status: string
  orderIds: string[]
  coldChain: boolean
  notes?: string
  createdAt: string
}

const BATCH_STATUS_STYLE: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700 border-slate-200",
  dispatched: "bg-indigo-50 text-indigo-900 border-indigo-200",
  in_progress: "bg-amber-50 text-amber-900 border-amber-200",
  completed: "bg-emerald-50 text-emerald-900 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
}

const QA_STATUS_STYLE: Record<string, string> = {
  none: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-900 border-amber-200",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
}

export function AdminQaBatches() {
  const { toast } = useToast()
  const [batches] = useLogisticsBatches([])
  const [checks, setChecks] = useQaDispatchChecks([])
  const [inventory] = useQaInventory([])
  const [config] = useQaConfig(QA_DEFAULT_CONFIG)

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const openBatches = useMemo(
    () =>
      batches
        .filter((b) => b.status !== "cancelled" && b.status !== "completed")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [batches],
  )

  const selectedBatch = useMemo(
    () => openBatches.find((b) => b.id === selectedBatchId) ?? openBatches[0] ?? null,
    [openBatches, selectedBatchId],
  )

  const activeCheck = useMemo(() => {
    if (!selectedBatch) return null
    if (activeCheckId) {
      const hit = checks.find((c) => c.id === activeCheckId)
      if (hit) return hit
    }
    const related = findChecksForBatch(selectedBatch.ref, selectedBatch.orderIds, checks)
    return related[0] ?? null
  }, [selectedBatch, checks, activeCheckId])

  const summary = useMemo(() => {
    let approved = 0
    let pending = 0
    let blocked = 0
    for (const b of openBatches) {
      const s = summarizeBatchQa(b.ref, b.orderIds, checks)
      if (s.status === "approved") approved++
      else if (s.status === "rejected") blocked++
      else pending++
    }
    return { approved, pending, blocked, total: openBatches.length }
  }, [openBatches, checks])

  const ensureCheckForBatch = useCallback(
    (batch: LogisticsBatch): QaDispatchCheck => {
      const existing = findChecksForBatch(batch.ref, batch.orderIds, checks).find(
        (c) => !c.rejectedAt,
      )
      if (existing) return existing
      const created: QaDispatchCheck = {
        id: newId("qac"),
        batchRef: batch.ref,
        orderRef: batch.orderIds[0],
        steps: blankQaSteps(),
        notes: "",
        checkedBy: "",
        createdAt: new Date().toISOString(),
      }
      setChecks((prev) => [created, ...prev])
      return created
    },
    [checks, setChecks],
  )

  const updateCheck = (id: string, patch: Partial<QaDispatchCheck>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const toggleStep = (checkId: string, step: QaStepKey) => {
    const c = checks.find((x) => x.id === checkId)
    if (!c || c.approvedAt) return
    updateCheck(checkId, { steps: { ...c.steps, [step]: !c.steps[step] } })
  }

  const handleApprove = async (check: QaDispatchCheck) => {
    const validation = validateQaApproval(check, inventory, config)
    if (!validation.ok) {
      toast({ title: "Cannot approve", description: validation.message, variant: "destructive" })
      return
    }
    setBusy("approve")
    try {
      updateCheck(check.id, {
        approvedAt: new Date().toISOString(),
        rejectedAt: undefined,
        rejectionReason: undefined,
      })
      toast({
        title: "Batch QA approved",
        description: `${check.batchRef} cleared for dispatch.`,
      })
    } finally {
      setBusy(null)
    }
  }

  const handleReject = () => {
    if (!activeCheck || !rejectReason.trim()) {
      toast({ title: "Reason required", description: "Enter a rejection reason.", variant: "destructive" })
      return
    }
    updateCheck(activeCheck.id, {
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejectReason.trim(),
      approvedAt: undefined,
    })
    setRejectOpen(false)
    setRejectReason("")
    toast({ title: "Batch QA rejected", description: activeCheck.batchRef, variant: "destructive" })
  }

  const startAssessment = (batch: LogisticsBatch) => {
    const check = ensureCheckForBatch(batch)
    setSelectedBatchId(batch.id)
    setActiveCheckId(check.id)
    toast({ title: "Assessment opened", description: `7-step gate for ${batch.ref}` })
  }

  return (
    <AdminShell title="Batch verification">
      <div className="space-y-4 max-w-[1200px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: WINE }}>
            Pipeline · QA &amp; Assurance
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <ClipboardList className="h-5 w-5" />
            Batch assessment
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Per-batch traceability and the 7-step sign-off before{" "}
            <Link href="/admin/logistics" className="underline font-medium" style={{ color: WINE }}>
              last-mile dispatch
            </Link>
            . Logistics batches sync from{" "}
            <Link href="/admin/logistics" className="underline">
              Delivery Operations
            </Link>
            ; inventory expiry rules come from{" "}
            <Link href="/admin/qa" className="underline">
              Stock &amp; Dispatch QA
            </Link>
            .
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(
            [
              ["Open batches", summary.total],
              ["QA approved", summary.approved],
              ["Awaiting sign-off", summary.pending],
              ["Rejected", summary.blocked],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="rounded-xl border p-3" style={{ borderColor: OPS_BORDER }}>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
              <p className="text-xl font-bold tabular-nums mt-1" style={{ color: WINE }}>
                {n}
              </p>
            </div>
          ))}
        </div>

        {openBatches.length === 0 ? (
          <OpsPanel
            badge="Batch assessment"
            title="No open logistics batches"
            subtitle="Plan batches under Delivery Operations, then return here to verify stock and sign off."
          >
            <div className="py-12 text-center space-y-3">
              <Truck className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm text-muted-foreground">
                Confirmed orders → auto-plan → batch ref → assess here → dispatch.
              </p>
              <Button asChild size="sm" style={{ background: OPS_ORANGE }}>
                <Link href="/admin/logistics">Open delivery operations</Link>
              </Button>
            </div>
          </OpsPanel>
        ) : (
          <div className="grid lg:grid-cols-5 gap-4 items-start">
            <OpsPanel
              badge="Queue"
              title="Logistics batches"
              subtitle="Select a batch to run or continue assessment."
              actions={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setSelectedBatchId(openBatches[0]?.id ?? null)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              }
            >
              <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {openBatches.map((b) => {
                  const qa = summarizeBatchQa(b.ref, b.orderIds, checks)
                  const active = selectedBatch?.id === b.id
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBatchId(b.id)
                          setActiveCheckId(null)
                        }}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-all",
                          active && "shadow-md",
                        )}
                        style={
                          active
                            ? { borderColor: OPS_ORANGE, background: "#FFF6EE" }
                            : { borderColor: OPS_BORDER }
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-sm font-semibold">{b.ref}</p>
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] capitalize", BATCH_STATUS_STYLE[b.status] ?? "")}
                          >
                            {b.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {b.orderIds.length} order{b.orderIds.length !== 1 ? "s" : ""}
                          {b.coldChain ? " · cold chain" : ""}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] mt-2", QA_STATUS_STYLE[qa.status])}
                        >
                          QA: {qa.status === "none" ? "not started" : qa.status}
                          {qa.status === "pending" && ` · ${qa.stepsDone}/7`}
                        </Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </OpsPanel>

            <div className="lg:col-span-3">
              {selectedBatch && (
                <OpsPanel
                  badge="7-step assessment"
                  title={selectedBatch.ref}
                  subtitle={`Orders: ${selectedBatch.orderIds.join(", ") || "—"}`}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      {!activeCheck && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => startAssessment(selectedBatch)}
                          style={{ background: `linear-gradient(135deg, ${OPS_ORANGE} 0%, #B91C1C 100%)` }}
                        >
                          Start assessment
                        </Button>
                      )}
                      {batchHasQaApproval(
                        selectedBatch.ref,
                        selectedBatch.orderIds,
                        checks,
                      ) && (
                        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200">
                          <PackageCheck className="h-3 w-3 mr-1" /> Cleared for dispatch
                        </Badge>
                      )}
                    </div>
                  }
                >
                  {!activeCheck ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Start assessment to open the checklist for this batch.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize",
                            QA_STATUS_STYLE[qaCheckStatus(activeCheck)],
                          )}
                        >
                          {qaCheckStatus(activeCheck)}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {stepsCompleted(activeCheck)}/{QA_STEP_ORDER.length} steps
                        </span>
                      </div>

                      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {QA_STEP_ORDER.map((k, idx) => {
                          const done = activeCheck.steps[k]
                          return (
                            <li key={k}>
                              <button
                                type="button"
                                disabled={!!activeCheck.approvedAt}
                                onClick={() => toggleStep(activeCheck.id, k)}
                                className={cn(
                                  "w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
                                  done
                                    ? "border-emerald-300 bg-emerald-50"
                                    : "hover:bg-muted/50",
                                )}
                                style={{ borderColor: done ? undefined : OPS_BORDER }}
                              >
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  Step {idx + 1}
                                </span>
                                <p className="text-xs font-medium mt-0.5">{QA_STEP_LABEL[k]}</p>
                                {done && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 mt-1" />
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ol>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Checked by</Label>
                          <Input
                            value={activeCheck.checkedBy}
                            disabled={!!activeCheck.approvedAt}
                            onChange={(e) =>
                              updateCheck(activeCheck.id, { checkedBy: e.target.value })
                            }
                            placeholder="Pharmacist name"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Notes</Label>
                          <Textarea
                            rows={2}
                            value={activeCheck.notes}
                            disabled={!!activeCheck.approvedAt}
                            onChange={(e) =>
                              updateCheck(activeCheck.id, { notes: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      {activeCheck.rejectionReason && (
                        <p className="text-xs text-rose-800 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                          Rejected: {activeCheck.rejectionReason}
                        </p>
                      )}

                      {!activeCheck.approvedAt && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: OPS_BORDER }}>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy === "approve"}
                            onClick={() => void handleApprove(activeCheck)}
                            className="gap-1"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Approve batch
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-rose-700 border-rose-200"
                            onClick={() => setRejectOpen(true)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </OpsPanel>
              )}
            </div>

            <div className="space-y-3 text-[11px] text-muted-foreground">
              <p className="font-bold uppercase tracking-wide text-foreground">Flow</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Auto-plan orders in Logistics</li>
                <li>Assess batch here (7 steps)</li>
                <li>Dispatch batch when QA approved</li>
                <li>Track last-mile → delivered</li>
              </ol>
              <Link
                href="/admin/logistics"
                className="inline-flex items-center gap-1 underline font-medium"
                style={{ color: WINE }}
              >
                Last-mile tracking <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject batch QA</DialogTitle>
            <DialogDescription>
              {activeCheck?.batchRef} will be blocked from dispatch until re-assessed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (required)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

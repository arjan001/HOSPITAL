"use client"

import { useMemo, useState } from "react"
import { Gauge, ShieldCheck, Star, TrendingUp, TrendingDown, Pencil } from "lucide-react"
import { useCmsDoc } from "@/lib/cms-store"
import { usePurchaseOrders, useSourcingPerformance } from "@/lib/use-sourcing-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { SOURCING_KEYS } from "./sourcing-shared"
import {
  TIER_LABEL,
  TIER_STYLE,
  type Supplier,
  type SupplierTier,
} from "./sourcing"
import type { SupplierPerformanceDto } from "@/lib/api-admin-sourcing"

type ComputedScore = SupplierPerformanceDto & { supplier: Supplier }

function suggestTier(composite: number): SupplierTier {
  if (composite >= 80) return "preferred"
  if (composite >= 60) return "approved"
  if (composite >= 40) return "trial"
  return "blocked"
}

export function SourcingPerformanceTab() {
  const [suppliers] = useCmsDoc<Supplier[]>(SOURCING_KEYS.suppliers, [])
  const { pos } = usePurchaseOrders([])
  const { scores, saveOverride, loading } = useSourcingPerformance()
  const [editTarget, setEditTarget] = useState<ComputedScore | null>(null)

  const merged: ComputedScore[] = useMemo(() => {
    const byId = new Map(scores.map((s) => [s.supplierId, s]))
    return suppliers
      .map((supplier) => {
        const row = byId.get(supplier.id)
        if (row) return { ...row, supplier }
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          country: supplier.country,
          tier: supplier.tier,
          verification: supplier.verification,
          totalPos: pos.filter((p) => p.supplierId === supplier.id).length,
          receivedPos: 0,
          fillRate: 0,
          onTimeRate: 0,
          avgUnitCost: 0,
          priceIndex: 1,
          totalSpend: 0,
          qualityScore: 80,
          complaints: 0,
          composite: 50,
          suggestedTier: suggestTier(50),
          notes: "",
          supplier,
        }
      })
      .sort((a, b) => b.composite - a.composite)
  }, [suppliers, scores, pos])

  if (loading && scores.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading performance scores…</p>
  }

  if (suppliers.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-sm py-16 text-center">
        <Gauge className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Add suppliers first to see performance scorecards.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground max-w-2xl">
        Composite score blends fill rate (30%), on-time rate (25%), price index (25%), and quality (20%), minus complaints — computed from Postgres POs and quotes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {merged.map((sc) => {
          const downgrade = sc.suggestedTier !== sc.supplier.tier
          return (
            <div key={sc.supplier.id} className="border border-border rounded-sm p-4 bg-background">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{sc.supplier.name}</h3>
                    {sc.supplier.verification === "verified" && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{sc.supplier.country} · {sc.totalPos} POs · KES {sc.totalSpend.toFixed(2)} spend</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tracking-tight leading-none text-[#3D0814]">{sc.composite}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Score</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-3 border-t border-border">
                <Metric label="Fill" value={`${(sc.fillRate * 100).toFixed(0)}%`} />
                <Metric label="On time" value={`${(sc.onTimeRate * 100).toFixed(0)}%`} />
                <Metric label="Price idx" value={sc.priceIndex.toFixed(2)} hint={sc.priceIndex < 1 ? "below market" : "above market"} />
                <Metric label="Quality" value={`${sc.qualityScore}`} />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Current tier:</span>
                  <Badge className={`text-[10px] ${TIER_STYLE[sc.supplier.tier]} border-0`}>{TIER_LABEL[sc.supplier.tier]}</Badge>
                </div>
                {downgrade && (
                  <div className="flex items-center gap-1.5">
                    {sc.composite > 60 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                    <span className="text-[11px] text-muted-foreground">Suggested:</span>
                    <Badge className={`text-[10px] ${TIER_STYLE[sc.suggestedTier as SupplierTier]} border-0`}>{TIER_LABEL[sc.suggestedTier as SupplierTier]}</Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
                <span>Complaints: <strong>{sc.complaints}</strong></span>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => setEditTarget(sc)}>
                  <Pencil className="h-3 w-3" /> Manual override
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {editTarget && (
        <OverrideModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(patch) => {
            void saveOverride(editTarget.supplier.id, patch)
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {hint && <p className="text-[9px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

function OverrideModal({ target, onClose, onSave }: {
  target: ComputedScore;
  onClose: () => void;
  onSave: (patch: { qualityScore?: number; complaints?: number; notes?: string }) => void;
}) {
  const [quality, setQuality] = useState<number>(target.qualityScore)
  const [complaints, setComplaints] = useState<number>(target.complaints)
  const [notes, setNotes] = useState<string>(target.notes || "")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Score override — {target.supplier.name}</DialogTitle>
          <DialogDescription>Manually capture quality audits and complaint counts that the system can't infer from POs alone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Quality score (0–100)</Label>
            <Input type="number" min={0} max={100} value={quality} onChange={(e) => setQuality(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Complaints (count)</Label>
            <Input type="number" min={0} value={complaints} onChange={(e) => setComplaints(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Audit findings, corrective actions..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={() => onSave({ qualityScore: quality, complaints, notes })} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

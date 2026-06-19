"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Pencil, Trash2, TrendingUp, ArrowRight, RefreshCw, Sparkles } from "lucide-react"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { apiAdminDemand } from "@/lib/api-nest"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  SOURCING_KEYS,
  type ForecastEntry,
  type InventoryItem,
} from "./sourcing-shared"
import type { SourcingRequest } from "./sourcing"

function blank(): ForecastEntry {
  return {
    id: newId("fc"),
    sku: "",
    productName: "",
    windowDays: 30,
    historicalDemand: 0,
    projectedDemand: 0,
    source: "manual",
    updatedAt: new Date().toISOString(),
  }
}

export function SourcingForecastTab() {
  const [entries, setEntries] = useCmsDoc<ForecastEntry[]>(SOURCING_KEYS.forecast, [])
  const [inventory] = useCmsDoc<InventoryItem[]>(SOURCING_KEYS.inventory, [])
  const [modal, setModal] = useState<{ open: boolean; editing: ForecastEntry | null }>({ open: false, editing: null })
  const [windowDays, setWindowDays] = useState("30")
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)

  const enriched = useMemo(() => entries.map((f) => {
    const inv = inventory.find((i) => i.sku === f.sku)
    const onHand = inv?.onHand ?? 0
    const safety = inv?.safetyStock ?? 0
    const trend = f.historicalDemand > 0 ? (f.projectedDemand - f.historicalDemand) / f.historicalDemand : 0
    const suggested = Math.max(0, f.projectedDemand + safety - onHand)
    return { ...f, onHand, safety, trend, suggested, inv }
  }), [entries, inventory])

  const handleSave = (e: ForecastEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((x) => x.id === e.id)
      const updated = { ...e, updatedAt: new Date().toISOString() }
      return idx === -1 ? [updated, ...prev] : prev.map((x, i) => i === idx ? updated : x)
    })
    setModal({ open: false, editing: null })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this forecast entry?")) return
    setEntries((prev) => prev.filter((x) => x.id !== id))
  }

  const generateFromLiveData = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const result = await apiAdminDemand.forecast(Number(windowDays))
      const mapped: ForecastEntry[] = result.entries.map((e) => ({
        id: e.id,
        sku: e.sku,
        productName: e.productName,
        windowDays: e.windowDays,
        historicalDemand: e.historicalDemand,
        projectedDemand: e.projectedDemand,
        source: e.source,
        notes: e.notes,
        updatedAt: e.updatedAt,
      }))
      setEntries((prev) => {
        const bySku = new Map(prev.map((p) => [p.sku, p]))
        for (const row of mapped) {
          const existing = bySku.get(row.sku)
          bySku.set(row.sku, existing ? { ...existing, ...row, id: existing.id } : row)
        }
        return [...bySku.values()].sort((a, b) => b.projectedDemand - a.projectedDemand)
      })
      setLastGenerated(result.generatedAt)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not generate forecast")
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateRequest = (f: typeof enriched[number]) => {
    if (f.suggested <= 0) {
      alert("No reorder needed — projected demand is covered by current stock + safety.")
      return
    }
    const requests = cmsStore.get<SourcingRequest[]>(SOURCING_KEYS.requests, [])
    const newReq: SourcingRequest = {
      id: newId("req"),
      productName: f.productName,
      sku: f.sku,
      qty: f.suggested,
      priority: f.onHand < f.safety ? "urgent" : f.trend > 0.2 ? "high" : "normal",
      source: f.source === "refill_predict" ? "refill_prediction" : f.source === "prescription_predict" ? "prescription_gap" : "low_stock",
      status: "open",
      notes: `Auto-derived from forecast: projected ${f.projectedDemand}/${f.windowDays}d, on-hand ${f.onHand}, safety ${f.safety}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    cmsStore.set(SOURCING_KEYS.requests, [newReq, ...requests])
    alert(`Sourcing request created (qty ${f.suggested}).`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground flex-1 max-w-xl">
          Project demand from confirmed orders, prescriptions, and care-pack assessments. Suggested reorder = projected + safety − on-hand.
        </p>
        <Select value={windowDays} onValueChange={setWindowDays}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={generating}
          onClick={() => void generateFromLiveData()}
          className="gap-1.5"
        >
          {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate from live data
        </Button>
        <Button size="sm" onClick={() => setModal({ open: true, editing: null })} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add manual
        </Button>
      </div>

      {genError && (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{genError}</p>
      )}
      {lastGenerated && (
        <p className="text-[11px] text-muted-foreground">
          Last generated {new Date(lastGenerated).toLocaleString()} from orders, Rx, and assessments.
        </p>
      )}

      <div className="border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium">Window</th>
              <th className="text-left px-4 py-3 font-medium">Historical</th>
              <th className="text-left px-4 py-3 font-medium">Projected</th>
              <th className="text-left px-4 py-3 font-medium">Trend</th>
              <th className="text-left px-4 py-3 font-medium">On hand</th>
              <th className="text-left px-4 py-3 font-medium">Suggested</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Source</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enriched.map((f) => (
              <tr key={f.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <p className="font-medium">{f.productName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{f.sku}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{f.windowDays}d</td>
                <td className="px-4 py-3 font-mono text-xs">{f.historicalDemand}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold">{f.projectedDemand}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-[10px] border-0 ${f.trend > 0.05 ? "bg-amber-100 text-amber-800" : f.trend < -0.05 ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-700"}`}>
                    {f.trend > 0 ? "+" : ""}{(f.trend * 100).toFixed(0)}%
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{f.onHand}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#3D0814]">{f.suggested}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden md:table-cell">{f.source.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] bg-transparent gap-1" disabled={f.suggested <= 0} onClick={() => handleCreateRequest(f)}>
                      Request <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ open: true, editing: f })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {enriched.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center">
                <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No forecast entries yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Click &quot;Generate from live data&quot; to build projections from orders and prescriptions.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ForecastModal
        open={modal.open}
        editing={modal.editing}
        inventory={inventory}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  )
}

function ForecastModal({ open, editing, inventory, onClose, onSave }: {
  open: boolean; editing: ForecastEntry | null;
  inventory: InventoryItem[];
  onClose: () => void; onSave: (e: ForecastEntry) => void
}) {
  const [form, setForm] = useState<ForecastEntry>(() => editing || blank())
  useEffect(() => { if (open) setForm(editing || blank()) }, [open, editing])
  const reset = () => setForm(editing || blank())

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-lg bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Edit forecast" : "Add demand forecast"}</DialogTitle>
          <DialogDescription>Tie this to an inventory SKU to compute reorder suggestions automatically.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {!editing && inventory.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Pick from inventory (optional)</Label>
              <Select onValueChange={(v) => {
                const inv = inventory.find((i) => i.id === v)
                if (inv) setForm({ ...form, sku: inv.sku, productName: inv.productName })
              }}>
                <SelectTrigger><SelectValue placeholder="Choose SKU..." /></SelectTrigger>
                <SelectContent>
                  {inventory.map((i) => <SelectItem key={i.id} value={i.id}>{i.productName} ({i.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Window (days)</Label>
              <Input type="number" min={1} value={form.windowDays} onChange={(e) => setForm({ ...form, windowDays: Number(e.target.value) || 30 })} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Product name *</Label>
            <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Historical demand</Label>
              <Input type="number" min={0} value={form.historicalDemand} onChange={(e) => setForm({ ...form, historicalDemand: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Projected demand *</Label>
              <Input type="number" min={0} value={form.projectedDemand} onChange={(e) => setForm({ ...form, projectedDemand: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as ForecastEntry["source"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="trend">Sales trend</SelectItem>
                <SelectItem value="prescription_predict">Prescription prediction</SelectItem>
                <SelectItem value="refill_predict">Refill prediction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.productName || !form.sku}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">
            {editing ? "Save changes" : "Add forecast"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useMemo, useState, useEffect } from "react"
import { Plus, Trash2, LineChart as LineChartIcon, AlertTriangle, ExternalLink } from "lucide-react"
import { useSourcingCompetitorPrices, useSourcingPriceHistory } from "@/lib/use-sourcing-store"
import { useCmsDoc } from "@/lib/cms-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  SOURCING_KEYS,
  type PriceHistoryEntry,
  type CompetitorPrice,
} from "./sourcing-shared"
import type { Supplier } from "./sourcing"
import { newId } from "@/lib/cms-store"

export function SourcingPricingTab() {
  const { history, remove: removeHistory } = useSourcingPriceHistory()
  const { competitors, add: addCompetitor, remove: removeCompetitor } = useSourcingCompetitorPrices()
  const [suppliers] = useCmsDoc<Supplier[]>(SOURCING_KEYS.suppliers, [])
  const [tab, setTab] = useState<"history" | "competitors">("history")
  const [compModal, setCompModal] = useState(false)

  // Group history by SKU
  const skuRollup = useMemo(() => {
    const map = new Map<string, { sku: string; productName: string; entries: PriceHistoryEntry[]; min: number; max: number; latest: number; bestSupplierId: string }>()
    history.forEach((h) => {
      const cur = map.get(h.sku)
      if (!cur) {
        map.set(h.sku, { sku: h.sku, productName: h.productName || h.sku, entries: [h], min: h.unitCost, max: h.unitCost, latest: h.unitCost, bestSupplierId: h.supplierId })
      } else {
        cur.entries.push(h)
        if (h.unitCost < cur.min) { cur.min = h.unitCost; cur.bestSupplierId = h.supplierId }
        if (h.unitCost > cur.max) cur.max = h.unitCost
      }
    })
    map.forEach((v) => {
      v.entries.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
      v.latest = v.entries[v.entries.length - 1].unitCost
    })
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [history])

  const competitorBySku = useMemo(() => {
    const map = new Map<string, CompetitorPrice[]>()
    competitors.forEach((c) => {
      const list = map.get(c.sku) || []
      list.push(c)
      map.set(c.sku, list)
    })
    return map
  }, [competitors])

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name || "Unknown"

  const handleDelete = (id: string) => {
    if (!confirm("Delete this price record?")) return
    void removeHistory(id)
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-border">
        <div className="flex gap-1 -mb-px">
          {([
            ["history", `Price history (${history.length})`],
            ["competitors", `Competitor watch (${competitors.length})`],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tab === k ? "border-[#3D0814] text-[#3D0814]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "history" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Every quote captured automatically lands here. Use it to spot price creep, identify the cheapest supplier per SKU, and benchmark against competitors.
          </p>

          {skuRollup.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm py-16 text-center">
              <LineChartIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No price history yet. Add a supplier quote and it'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {skuRollup.map((row) => {
                const competitorList = competitorBySku.get(row.sku) || []
                const competitorMin = competitorList.length > 0 ? Math.min(...competitorList.map((c) => c.unitPrice)) : null
                const cheaperOutThere = competitorMin !== null && competitorMin < row.min
                return (
                  <div key={row.sku} className="border border-border rounded-sm p-4 bg-background">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{row.productName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{row.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Best so far</p>
                        <p className="text-sm font-semibold text-[#3D0814]">{row.entries[0].currency} {row.min.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">{supplierName(row.bestSupplierId)}</p>
                      </div>
                    </div>

                    <Sparkline values={row.entries.map((e) => e.unitCost)} />

                    <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                      <div><span className="text-muted-foreground">Min:</span> <strong>{row.min.toFixed(2)}</strong></div>
                      <div><span className="text-muted-foreground">Max:</span> <strong>{row.max.toFixed(2)}</strong></div>
                      <div><span className="text-muted-foreground">Latest:</span> <strong className={row.latest > row.min * 1.05 ? "text-amber-700" : ""}>{row.latest.toFixed(2)}</strong></div>
                    </div>

                    {cheaperOutThere && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-sm text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        Competitor cheaper at <strong>{competitorMin!.toFixed(2)}</strong> — consider retail emergency fallback or renegotiate.
                      </div>
                    )}

                    <details className="mt-3">
                      <summary className="text-[11px] cursor-pointer text-muted-foreground hover:text-foreground">Full history ({row.entries.length})</summary>
                      <table className="w-full text-xs mt-2">
                        <thead className="text-muted-foreground">
                          <tr><th className="text-left py-1">Date</th><th className="text-left">Supplier</th><th className="text-left">Cost</th><th className="text-left">Source</th><th></th></tr>
                        </thead>
                        <tbody>
                          {row.entries.slice().reverse().map((e) => (
                            <tr key={e.id} className="border-t border-border">
                              <td className="py-1.5 font-mono">{new Date(e.capturedAt).toISOString().split("T")[0]}</td>
                              <td>{supplierName(e.supplierId)}</td>
                              <td className="font-mono">{e.currency} {e.unitCost.toFixed(2)}</td>
                              <td><Badge variant="outline" className="text-[9px]">{e.source}</Badge></td>
                              <td className="text-right"><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-3 w-3" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === "competitors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground max-w-2xl">
              Track what other pharmacies and online retailers charge for the same SKU. Used by the price-intel engine to flag when our best supplier is more expensive than the open market.
            </p>
            <Button size="sm" onClick={() => setCompModal(true)} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Capture price
            </Button>
          </div>

          {competitors.length === 0 ? (
            <div className="border border-dashed border-border rounded-sm py-16 text-center">
              <LineChartIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No competitor prices captured yet.</p>
            </div>
          ) : (
            <div className="border border-border rounded-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">SKU / Product</th>
                    <th className="text-left px-4 py-3 font-medium">Competitor</th>
                    <th className="text-left px-4 py-3 font-medium">Price</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Captured</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {competitors.slice().sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()).map((c) => (
                    <tr key={c.id} className="hover:bg-secondary/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.productName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c.sku}</p>
                      </td>
                      <td className="px-4 py-3">
                        {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[#3D0814] hover:underline inline-flex items-center gap-1">{c.competitor} <ExternalLink className="h-3 w-3" /></a> : c.competitor}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{c.currency} {c.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground hidden md:table-cell">{new Date(c.capturedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          if (!confirm("Delete this competitor price?")) return
                          void removeCompetitor(c.id)
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CompetitorModal
        open={compModal}
        onClose={() => setCompModal(false)}
        onSave={(c) => {
          void addCompetitor({
            sku: c.sku,
            productName: c.productName,
            competitor: c.competitor,
            unitPrice: c.unitPrice,
            currency: c.currency,
            url: c.url,
          })
          setCompModal(false)
        }}
      />
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="h-10 flex items-center text-[11px] text-muted-foreground">Need 2+ data points to chart trend.</div>
  }
  const w = 600, h = 40, pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = (w - pad * 2) / (values.length - 1)
  const points = values.map((v, i) => {
    const x = pad + i * step
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#3D0814" strokeWidth={1.5} />
    </svg>
  )
}

function CompetitorModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void; onSave: (c: CompetitorPrice) => void
}) {
  const [form, setForm] = useState<CompetitorPrice>(() => blankComp())
  useEffect(() => { if (open) setForm(blankComp()) }, [open])
  const reset = () => setForm(blankComp())

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-md bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif">Capture competitor price</DialogTitle>
          <DialogDescription>Record what someone else is charging for the same SKU.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Field label="SKU *" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
          <Field label="Product name *" value={form.productName} onChange={(v) => setForm({ ...form, productName: v })} />
          <Field label="Competitor *" value={form.competitor} onChange={(v) => setForm({ ...form, competitor: v })} placeholder="MyDawa, Goodlife, ..." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Unit price *</Label>
              <Input type="number" min={0} step={0.01} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="UGX">UGX</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Field label="URL (optional)" value={form.url || ""} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.sku || !form.productName || !form.competitor || !form.unitPrice}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs font-medium mb-1.5 block">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function blankComp(): CompetitorPrice {
  return { id: newId("comp"), sku: "", productName: "", competitor: "", unitPrice: 0, currency: "KES", capturedAt: new Date().toISOString() }
}

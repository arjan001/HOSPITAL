"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Bot, Play, Power, ChevronDown, ChevronRight } from "lucide-react"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  SOURCING_KEYS,
  daysUntil,
  INVENTORY_TYPE_LABEL,
  type AutomationRule,
  type AutomationLogEntry,
  type InventoryItem,
  type InventoryType,
  type ForecastEntry,
} from "./sourcing-shared"
import type { SourcingRequest, RequestPriority, RequestSource, Supplier } from "./sourcing"

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "rule_low_stock",
    name: "Auto-source items below safety stock",
    trigger: "low_stock",
    isActive: true,
    conditions: { onHandRatio: 1.0 },
    action: "create_request",
    defaultPriority: "high",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rule_expiry",
    name: "Replace medications expiring in 60 days",
    trigger: "expiry_soon",
    isActive: false,
    conditions: { expiryWindowDays: 60, types: ["medication"] },
    action: "create_request",
    defaultPriority: "normal",
    createdAt: new Date().toISOString(),
  },
]

function blank(): AutomationRule {
  return {
    id: newId("rule"),
    name: "",
    trigger: "low_stock",
    isActive: true,
    conditions: { onHandRatio: 1.0 },
    action: "create_request",
    defaultPriority: "normal",
    createdAt: new Date().toISOString(),
  }
}

const TRIGGER_LABEL: Record<AutomationRule["trigger"], string> = {
  low_stock: "Low stock",
  expiry_soon: "Expiry soon",
  refill_prediction: "Refill prediction",
  manual_scan: "Manual scan",
}

const TRIGGER_TO_SOURCE: Record<AutomationRule["trigger"], RequestSource> = {
  low_stock: "low_stock",
  expiry_soon: "expiry_replacement",
  refill_prediction: "refill_prediction",
  manual_scan: "manual",
}

export function SourcingAutomationTab() {
  const [rules, setRules] = useCmsDoc<AutomationRule[]>(SOURCING_KEYS.automation, DEFAULT_RULES)
  const [log, setLog] = useCmsDoc<AutomationLogEntry[]>(SOURCING_KEYS.automationLog, [])
  const [modal, setModal] = useState<{ open: boolean; editing: AutomationRule | null }>({ open: false, editing: null })
  const [logOpen, setLogOpen] = useState(true)

  const handleSave = (r: AutomationRule) => {
    setRules((prev) => {
      const idx = prev.findIndex((x) => x.id === r.id)
      return idx === -1 ? [...prev, r] : prev.map((x, i) => i === idx ? r : x)
    })
    setModal({ open: false, editing: null })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this automation rule?")) return
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const handleToggle = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r))
  }

  const handleRunNow = (rule: AutomationRule) => {
    const inventory = cmsStore.get<InventoryItem[]>(SOURCING_KEYS.inventory, [])
    const requests = cmsStore.get<SourcingRequest[]>(SOURCING_KEYS.requests, [])
    const suppliers = cmsStore.get<Supplier[]>(SOURCING_KEYS.suppliers, [])
    const forecasts = cmsStore.get<ForecastEntry[]>(SOURCING_KEYS.forecast, [])

    // Build candidate set per trigger. Each candidate carries the SKU, name,
    // suggested qty, optional inventory row (for type filter + unit cost).
    type Candidate = { sku: string; productName: string; suggestedQty: number; inv?: InventoryItem; reason: string }
    const invBySku = new Map(inventory.map((i) => [i.sku, i]))

    let candidates: Candidate[] = []

    if (rule.trigger === "low_stock") {
      candidates = inventory
        .filter((i) => {
          const ratio = i.safetyStock > 0 ? i.onHand / i.safetyStock : 0
          return ratio <= (rule.conditions.onHandRatio ?? 1.0)
        })
        .map((i) => ({
          sku: i.sku, productName: i.productName, inv: i,
          suggestedQty: Math.max(i.reorderPoint, i.safetyStock * 2) - i.onHand,
          reason: `on-hand ${i.onHand} / safety ${i.safetyStock}`,
        }))
    } else if (rule.trigger === "expiry_soon") {
      const window = rule.conditions.expiryWindowDays ?? 60
      candidates = inventory
        .filter((i) => {
          const d = daysUntil(i.batchExpiry)
          return d !== null && d >= 0 && d <= window
        })
        .map((i) => ({
          sku: i.sku, productName: i.productName, inv: i,
          suggestedQty: Math.max(i.onHand, i.reorderPoint, i.safetyStock * 2),
          reason: `expires in ${daysUntil(i.batchExpiry)}d`,
        }))
    } else if (rule.trigger === "refill_prediction") {
      // Scan forecasts derived from prescription / refill prediction signals.
      candidates = forecasts
        .filter((f) => f.source === "refill_predict" || f.source === "prescription_predict")
        .map((f) => {
          const inv = invBySku.get(f.sku)
          const onHand = inv?.onHand ?? 0
          const safety = inv?.safetyStock ?? 0
          const qty = Math.max(0, f.projectedDemand + safety - onHand)
          return {
            sku: f.sku, productName: f.productName, inv, suggestedQty: qty,
            reason: `forecast ${f.projectedDemand}/${f.windowDays}d, on-hand ${onHand}`,
          }
        })
        .filter((c) => c.suggestedQty > 0)
    } else if (rule.trigger === "manual_scan") {
      // Sweep both low-stock and expiry-soon as a single comprehensive run.
      const window = rule.conditions.expiryWindowDays ?? 60
      const seen = new Set<string>()
      inventory.forEach((i) => {
        const ratio = i.safetyStock > 0 ? i.onHand / i.safetyStock : 0
        const d = daysUntil(i.batchExpiry)
        const lowStock = ratio <= (rule.conditions.onHandRatio ?? 1.0)
        const expiring = d !== null && d >= 0 && d <= window
        if ((lowStock || expiring) && !seen.has(i.sku)) {
          seen.add(i.sku)
          candidates.push({
            sku: i.sku, productName: i.productName, inv: i,
            suggestedQty: Math.max(i.reorderPoint, i.safetyStock * 2) - i.onHand,
            reason: lowStock && expiring ? "low stock + expiring" : lowStock ? "low stock" : `expires in ${d}d`,
          })
        }
      })
    }

    // Apply type filter.
    if (rule.conditions.types && rule.conditions.types.length > 0) {
      candidates = candidates.filter((c) => c.inv && rule.conditions.types!.includes(c.inv.type))
    }

    const eligibleSupplier = rule.conditions.minTier
      ? suppliers.some((s) => s.verification === "verified" && (s.tier === rule.conditions.minTier || (rule.conditions.minTier === "trial" && (s.tier === "preferred" || s.tier === "approved")) || (rule.conditions.minTier === "approved" && s.tier === "preferred")))
      : true

    let created = 0
    const details: string[] = []
    const newRequests: SourcingRequest[] = []

    if (!eligibleSupplier && rule.conditions.minTier) {
      details.push(`Skipped — no verified supplier at tier ${rule.conditions.minTier}+ available.`)
    } else {
      candidates.forEach((c) => {
        const alreadyOpen = requests.some((r) => r.sku === c.sku && (r.status === "open" || r.status === "quoting" || r.status === "ordered"))
        if (alreadyOpen) {
          details.push(`Skipped ${c.sku}: open request already exists.`)
          return
        }
        const reqQty = rule.defaultQty || c.suggestedQty
        if (reqQty <= 0) {
          details.push(`Skipped ${c.sku}: computed qty ≤ 0.`)
          return
        }
        const req: SourcingRequest = {
          id: newId("req"),
          productName: c.productName,
          sku: c.sku,
          qty: reqQty,
          priority: rule.defaultPriority,
          source: TRIGGER_TO_SOURCE[rule.trigger],
          status: "open",
          targetUnitCost: c.inv?.unitCost,
          notes: `Auto-created by rule "${rule.name}" — ${c.reason}.`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        newRequests.push(req)
        details.push(`Created request for ${c.sku} qty ${reqQty} (${c.reason}).`)
        created++
      })
    }
    const matchedCount = candidates.length

    if (newRequests.length > 0) {
      cmsStore.set(SOURCING_KEYS.requests, [...newRequests, ...requests])
    }

    const entry: AutomationLogEntry = {
      id: newId("alog"),
      ruleId: rule.id,
      ruleName: rule.name,
      ranAt: new Date().toISOString(),
      matched: matchedCount,
      created,
      details: details.length > 0 ? details : ["No items matched the trigger conditions."],
    }
    setLog((prev) => [entry, ...prev].slice(0, 50))
    setRules((prev) => prev.map((r) => r.id === rule.id
      ? { ...r, lastRunAt: entry.ranAt, lastRunSummary: `${created} request${created === 1 ? "" : "s"} created from ${matchedCount} match${matchedCount === 1 ? "" : "es"}` }
      : r))
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground max-w-2xl">
        Rules scan inventory and create sourcing requests automatically. Run them manually for now — when the backend ports to NestJS, these become scheduled jobs.
      </p>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setModal({ open: true, editing: null })} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm py-16 text-center">
          <Bot className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No automation rules yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className={`border rounded-sm p-4 bg-background ${r.isActive ? "border-border" : "border-dashed border-border opacity-70"}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#3D0814] flex-shrink-0" />
                    <h3 className="text-sm font-semibold truncate">{r.name || "Untitled rule"}</h3>
                    <Badge className={`text-[10px] border-0 ${r.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                      {r.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">Trigger: {TRIGGER_LABEL[r.trigger]}</Badge>
                    <Badge variant="outline" className="text-[10px]">Priority: {r.defaultPriority}</Badge>
                    {r.conditions.types && r.conditions.types.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">Types: {r.conditions.types.map((t) => INVENTORY_TYPE_LABEL[t]).join(", ")}</Badge>
                    )}
                    {r.conditions.expiryWindowDays && (
                      <Badge variant="outline" className="text-[10px]">Window: {r.conditions.expiryWindowDays}d</Badge>
                    )}
                    {r.conditions.onHandRatio !== undefined && r.trigger === "low_stock" && (
                      <Badge variant="outline" className="text-[10px]">When on-hand ≤ {r.conditions.onHandRatio.toFixed(1)} × safety</Badge>
                    )}
                  </div>
                  {r.lastRunSummary && (
                    <p className="text-[11px] text-muted-foreground mt-2">Last run: {r.lastRunSummary} · {r.lastRunAt && new Date(r.lastRunAt).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-[11px] bg-transparent gap-1" onClick={() => handleRunNow(r)}>
                    <Play className="h-3 w-3" /> Run now
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggle(r.id)} title={r.isActive ? "Pause" : "Activate"}>
                    <Power className={`h-3.5 w-3.5 ${r.isActive ? "text-emerald-600" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ open: true, editing: r })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border border-border rounded-sm bg-background">
        <button type="button" onClick={() => setLogOpen((o) => !o)} className="w-full flex items-center justify-between p-3 text-left">
          <div className="flex items-center gap-2">
            {logOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <h3 className="text-sm font-semibold">Activity log</h3>
            <Badge variant="outline" className="text-[10px]">{log.length}</Badge>
          </div>
          {log.length > 0 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); if (confirm("Clear automation activity log?")) setLog([]) }}
              className="text-[11px] text-muted-foreground hover:text-destructive">Clear</button>
          )}
        </button>
        {logOpen && (
          <div className="border-t border-border max-h-80 overflow-y-auto">
            {log.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No automation runs yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {log.map((e) => (
                  <li key={e.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium">{e.ruleName}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(e.ranAt).toLocaleString()}</p>
                      </div>
                      <Badge className={`text-[10px] border-0 ${e.created > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                        {e.created} created · {e.matched} matched
                      </Badge>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      {e.details.slice(0, 5).map((d, i) => <li key={i}>· {d}</li>)}
                      {e.details.length > 5 && <li className="italic">…and {e.details.length - 5} more</li>}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <RuleModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  )
}

function RuleModal({ open, editing, onClose, onSave }: {
  open: boolean; editing: AutomationRule | null;
  onClose: () => void; onSave: (r: AutomationRule) => void;
}) {
  const [form, setForm] = useState<AutomationRule>(() => editing || blank())
  useEffect(() => { if (open) setForm(editing || blank()) }, [open, editing])
  const reset = () => setForm(editing || blank())

  const toggleType = (t: InventoryType) => {
    const cur = form.conditions.types || []
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    setForm({ ...form, conditions: { ...form.conditions, types: next } })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-lg bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Edit rule" : "New automation rule"}</DialogTitle>
          <DialogDescription>Define when the system should auto-create sourcing requests.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Rule name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto-source antibiotics below safety" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Trigger</Label>
              <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v as AutomationRule["trigger"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low_stock">Low stock</SelectItem>
                  <SelectItem value="expiry_soon">Expiry soon</SelectItem>
                  <SelectItem value="refill_prediction">Refill prediction</SelectItem>
                  <SelectItem value="manual_scan">Manual scan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Default priority</Label>
              <Select value={form.defaultPriority} onValueChange={(v) => setForm({ ...form, defaultPriority: v as RequestPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.trigger === "low_stock" && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">When on-hand ≤ × safety stock</Label>
              <Input type="number" min={0} step={0.1} value={form.conditions.onHandRatio ?? 1} onChange={(e) => setForm({ ...form, conditions: { ...form.conditions, onHandRatio: Number(e.target.value) || 1 } })} />
            </div>
          )}

          {form.trigger === "expiry_soon" && (
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Expiry window (days)</Label>
              <Input type="number" min={1} value={form.conditions.expiryWindowDays ?? 60} onChange={(e) => setForm({ ...form, conditions: { ...form.conditions, expiryWindowDays: Number(e.target.value) || 60 } })} />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium mb-1.5 block">Limit to inventory types</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(INVENTORY_TYPE_LABEL) as InventoryType[]).map((t) => (
                <button key={t} type="button" onClick={() => toggleType(t)}
                  className={`px-3 py-1 rounded-sm text-xs border ${form.conditions.types?.includes(t) ? "bg-[#3D0814] text-white border-[#3D0814]" : "bg-transparent border-border text-foreground"}`}>
                  {INVENTORY_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Leave none selected to apply to all types.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Min supplier tier</Label>
              <Select value={form.conditions.minTier || "any"} onValueChange={(v) => setForm({ ...form, conditions: { ...form.conditions, minTier: v === "any" ? undefined : v as "preferred" | "approved" | "trial" } })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="preferred">Preferred only</SelectItem>
                  <SelectItem value="approved">Approved+</SelectItem>
                  <SelectItem value="trial">Trial+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Default qty (optional)</Label>
              <Input type="number" min={0} value={form.defaultQty ?? ""} onChange={(e) => setForm({ ...form, defaultQty: e.target.value ? Number(e.target.value) : undefined })} placeholder="Auto-compute" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">
            {editing ? "Save changes" : "Create rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

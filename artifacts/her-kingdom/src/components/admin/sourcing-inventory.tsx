"use client"

import { useState, useMemo, useEffect } from "react"
import { Plus, Pencil, Trash2, Boxes, AlertTriangle, CalendarClock, ArrowRight } from "lucide-react"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  SOURCING_KEYS,
  INVENTORY_TYPE_LABEL,
  INVENTORY_TYPE_STYLE,
  inventoryHealth,
  daysUntil,
  type InventoryItem,
  type InventoryType,
} from "./sourcing-shared"
import type { SourcingRequest } from "./sourcing"

const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: "inv_para",
    sku: "PARA-500-1000",
    productName: "Paracetamol 500mg (1000 tab pack)",
    type: "medication",
    onHand: 18,
    safetyStock: 50,
    reorderPoint: 80,
    unitCost: 4.5,
    batchExpiry: new Date(Date.now() + 120 * 86_400_000).toISOString().split("T")[0],
    location: "Aisle A1",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "inv_amox",
    sku: "AMOX-250",
    productName: "Amoxicillin 250mg (100 caps)",
    type: "medication",
    onHand: 45,
    safetyStock: 30,
    reorderPoint: 60,
    unitCost: 8.2,
    batchExpiry: new Date(Date.now() + 60 * 86_400_000).toISOString().split("T")[0],
    location: "Aisle A2",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "inv_bp",
    sku: "DEV-BP-OMRON",
    productName: "Omron BP Monitor",
    type: "device",
    onHand: 12,
    safetyStock: 4,
    reorderPoint: 8,
    unitCost: 38,
    location: "Devices shelf",
    updatedAt: new Date().toISOString(),
  },
]

function blankItem(): InventoryItem {
  return {
    id: newId("inv"),
    sku: "",
    productName: "",
    type: "medication",
    onHand: 0,
    safetyStock: 10,
    reorderPoint: 20,
    updatedAt: new Date().toISOString(),
  }
}

export function SourcingInventoryTab() {
  const [items, setItems] = useCmsDoc<InventoryItem[]>(SOURCING_KEYS.inventory, DEFAULT_INVENTORY)
  const [typeFilter, setTypeFilter] = useState<InventoryType | "all">("all")
  const [healthFilter, setHealthFilter] = useState<"all" | "issues">("all")
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState<{ open: boolean; editing: InventoryItem | null }>({ open: false, editing: null })

  const stats = useMemo(() => {
    const below = items.filter((i) => i.onHand < i.safetyStock).length
    const expiring = items.filter((i) => {
      const d = daysUntil(i.batchExpiry)
      return d !== null && d >= 0 && d <= 90
    }).length
    const expired = items.filter((i) => {
      const d = daysUntil(i.batchExpiry)
      return d !== null && d < 0
    }).length
    return { below, expiring, expired }
  }, [items])

  const filtered = items.filter((i) => {
    if (typeFilter !== "all" && i.type !== typeFilter) return false
    if (healthFilter === "issues") {
      const h = inventoryHealth(i).state
      if (h === "ok") return false
    }
    if (search && !`${i.sku} ${i.productName}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleSave = (item: InventoryItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === item.id)
      const next = idx === -1 ? [...prev, { ...item, updatedAt: new Date().toISOString() }]
        : prev.map((x, i) => i === idx ? { ...item, updatedAt: new Date().toISOString() } : x)
      return next
    })
    setModal({ open: false, editing: null })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Remove this inventory item?")) return
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  const handleTriggerRequest = (item: InventoryItem) => {
    const reqQty = Math.max(item.reorderPoint, item.safetyStock * 2) - item.onHand
    const requests = cmsStore.get<SourcingRequest[]>(SOURCING_KEYS.requests, [])
    const newReq: SourcingRequest = {
      id: newId("req"),
      productName: item.productName,
      sku: item.sku,
      qty: Math.max(reqQty, 1),
      priority: item.onHand <= 0 ? "urgent" : "high",
      source: "low_stock",
      status: "open",
      targetUnitCost: item.unitCost,
      notes: `Triggered from inventory: on-hand ${item.onHand} vs safety ${item.safetyStock}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    cmsStore.set(SOURCING_KEYS.requests, [newReq, ...requests])
    alert(`Sourcing request created for ${item.productName} (qty ${newReq.qty}).`)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Below safety stock" value={stats.below} icon={AlertTriangle} accent="rose" />
        <MiniStat label="Expiring < 90 days" value={stats.expiring} icon={CalendarClock} accent="amber" />
        <MiniStat label="Expired" value={stats.expired} icon={CalendarClock} accent="rose" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input placeholder="Search SKU or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-xs" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="medication">Medications</SelectItem>
            <SelectItem value="device">Devices</SelectItem>
            <SelectItem value="consumable">Consumables</SelectItem>
            <SelectItem value="packaging">Packaging</SelectItem>
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as typeof healthFilter)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            <SelectItem value="issues">Issues only</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setModal({ open: true, editing: null })} className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add SKU
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">SKU / Product</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">On hand</th>
              <th className="text-left px-4 py-3 font-medium">Safety</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Reorder pt</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Expiry</th>
              <th className="text-left px-4 py-3 font-medium">Health</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((i) => {
              const h = inventoryHealth(i)
              const days = daysUntil(i.batchExpiry)
              return (
                <tr key={i.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{i.productName || "—"}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{i.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] ${INVENTORY_TYPE_STYLE[i.type]} border-0`}>{INVENTORY_TYPE_LABEL[i.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{i.onHand}</td>
                  <td className="px-4 py-3 font-mono text-xs">{i.safetyStock}</td>
                  <td className="px-4 py-3 font-mono text-xs hidden md:table-cell">{i.reorderPoint}</td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">
                    {i.batchExpiry ? <span className={days !== null && days < 0 ? "text-rose-700 font-medium" : days !== null && days <= 90 ? "text-amber-700" : ""}>{i.batchExpiry}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] ${h.className} border-0`}>{h.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {(h.state === "low" || h.state === "critical" || h.state === "expired") && (
                        <Button variant="outline" size="sm" className="h-7 text-[11px] bg-transparent gap-1" onClick={() => handleTriggerRequest(i)}>
                          Source <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModal({ open: true, editing: i })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(i.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <Boxes className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No inventory items match this filter.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <InventoryModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={handleSave}
      />
    </div>
  )
}

function MiniStat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof AlertTriangle; accent: "rose" | "amber" }) {
  const tone = accent === "rose" ? "text-rose-700 bg-rose-50" : "text-amber-700 bg-amber-50"
  return (
    <div className="border border-border rounded-sm p-3 bg-background flex items-center gap-3">
      <span className={`p-2 rounded-sm ${tone}`}><Icon className="h-4 w-4" /></span>
      <div>
        <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  )
}

function InventoryModal({ open, editing, onClose, onSave }: {
  open: boolean; editing: InventoryItem | null; onClose: () => void; onSave: (i: InventoryItem) => void
}) {
  const [form, setForm] = useState<InventoryItem>(() => editing || blankItem())
  useEffect(() => { if (open) setForm(editing || blankItem()) }, [open, editing])
  const reset = () => setForm(editing || blankItem())

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else reset() }}>
      <DialogContent className="max-w-xl bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="font-serif">{editing ? "Edit inventory item" : "Add inventory item"}</DialogTitle>
          <DialogDescription>Inventory powers low-stock triggers, expiry alerts, and procurement automation.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <Label className="text-xs font-medium mb-1.5 block">Product name *</Label>
            <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">SKU *</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as InventoryType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medication">Medication</SelectItem>
                <SelectItem value="device">Device</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="packaging">Packaging</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">On hand</Label>
            <Input type="number" min={0} value={form.onHand} onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Safety stock</Label>
            <Input type="number" min={0} value={form.safetyStock} onChange={(e) => setForm({ ...form, safetyStock: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Reorder point</Label>
            <Input type="number" min={0} value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Unit cost</Label>
            <Input type="number" min={0} step={0.01} value={form.unitCost ?? ""} onChange={(e) => setForm({ ...form, unitCost: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Batch expiry</Label>
            <Input type="date" value={form.batchExpiry || ""} onChange={(e) => setForm({ ...form, batchExpiry: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs font-medium mb-1.5 block">Location</Label>
            <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Aisle / Shelf" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium mb-1.5 block">Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onClose} className="bg-transparent">Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.productName || !form.sku}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white">
            {editing ? "Save changes" : "Add item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

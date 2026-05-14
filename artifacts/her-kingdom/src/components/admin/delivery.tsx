"use client"

import { useMemo, useState } from "react"
import { Plus, Pencil, Trash2, MapPin, Package, Truck } from "lucide-react"
import { useCmsDoc, newId } from "@/lib/cms-store"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"
import { AdminShell } from "./admin-shell"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type LocationType = "delivery" | "pickup"
type LocationRegion = "nairobi" | "outside_nairobi"

interface AdminDelivery {
  id: string
  name: string
  fee: number
  estimatedDays: string
  isActive: boolean
  type: LocationType
  region: LocationRegion
  city?: string
  description?: string
  sortOrder?: number
}

interface FormState {
  name: string
  fee: string
  estimatedDays: string
  type: LocationType
  region: LocationRegion
  city: string
  description: string
  sortOrder: string
  isActive: boolean
}

const DEFAULT_FORM: FormState = {
  name: "",
  fee: "",
  estimatedDays: "",
  type: "delivery",
  region: "nairobi",
  city: "",
  description: "",
  sortOrder: "50",
  isActive: true,
}

const DEFAULT_LOCATIONS: AdminDelivery[] = [
  { id: "loc_nairobi_cbd", name: "Nairobi CBD", fee: 200, estimatedDays: "Same day", isActive: true, type: "delivery", region: "nairobi", sortOrder: 10 },
  { id: "loc_westlands", name: "Westlands / Parklands", fee: 250, estimatedDays: "Same day", isActive: true, type: "delivery", region: "nairobi", sortOrder: 20 },
  { id: "loc_outside", name: "Outside Nairobi (Courier)", fee: 450, estimatedDays: "1-3 days", isActive: true, type: "delivery", region: "outside_nairobi", sortOrder: 60 },
]

export function AdminDelivery() {
  const [locations, setLocations] = useCmsDoc<AdminDelivery[]>("delivery-locations", DEFAULT_LOCATIONS)
  const [isOpen, setIsOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [activeTab, setActiveTab] = useState<"all" | "delivery" | "pickup">("all")

  const filtered = useMemo(() => {
    if (activeTab === "all") return locations
    return locations.filter((l) => (l.type || "delivery") === activeTab)
  }, [locations, activeTab])

  const counts = useMemo(() => {
    const delivery = locations.filter((l) => (l.type || "delivery") === "delivery").length
    const pickup = locations.filter((l) => l.type === "pickup").length
    return { delivery, pickup, all: locations.length }
  }, [locations])

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage } =
    usePagination(filtered, { defaultPerPage: 10 })

  const openNew = () => { setEditId(null); setForm(DEFAULT_FORM); setIsOpen(true) }

  const openEdit = (loc: AdminDelivery) => {
    setEditId(loc.id)
    setForm({
      name: loc.name,
      fee: loc.fee.toString(),
      estimatedDays: loc.estimatedDays,
      type: (loc.type as LocationType) || "delivery",
      region: (loc.region as LocationRegion) || "nairobi",
      city: loc.city || "",
      description: loc.description || "",
      sortOrder: String(loc.sortOrder ?? 50),
      isActive: loc.isActive ?? true,
    })
    setIsOpen(true)
  }

  const handleSave = () => {
    const record: AdminDelivery = {
      id: editId || newId("loc"),
      name: form.name,
      fee: Number.parseFloat(form.fee) || 0,
      estimatedDays: form.estimatedDays,
      type: form.type,
      region: form.region,
      city: form.city,
      description: form.description,
      sortOrder: Number.parseInt(form.sortOrder, 10) || 50,
      isActive: form.isActive,
    }
    setLocations((prev) => {
      const idx = prev.findIndex((l) => l.id === record.id)
      if (idx === -1) return [...prev, record]
      const next = prev.slice(); next[idx] = record; return next
    })
    setIsOpen(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this location? This cannot be undone.")) return
    setLocations((prev) => prev.filter((l) => l.id !== id))
  }

  const toggleActive = (loc: AdminDelivery) => {
    setLocations((prev) => prev.map((l) => l.id === loc.id ? { ...l, isActive: !l.isActive } : l))
  }

  return (
    <AdminShell title="Delivery & Pickup Locations">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">Delivery & Pickup Locations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {counts.all} total — {counts.delivery} delivery, {counts.pickup} pickup stations
            </p>
          </div>
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4 mr-2" /> Add Location
          </Button>
        </div>

        <div className="flex gap-1 p-1 rounded-sm bg-secondary w-fit">
          {(["all", "delivery", "pickup"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs uppercase tracking-wide rounded-sm transition-colors ${
                activeTab === tab ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"
              }`}>
              {tab === "all" ? `All (${counts.all})` : tab === "delivery" ? `Delivery (${counts.delivery})` : `Pickup (${counts.pickup})`}
            </button>
          ))}
        </div>

        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Region</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">City</th>
                <th className="text-left px-4 py-3 font-medium">Fee</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">ETA</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedItems.map((loc) => {
                const isPickup = loc.type === "pickup"
                return (
                  <tr key={loc.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isPickup ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {isPickup ? <Package className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                        {isPickup ? "Pickup" : "Delivery"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium">{loc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">
                      {(loc.region || "nairobi").replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{loc.city || "—"}</td>
                    <td className="px-4 py-3">{loc.fee > 0 ? formatPrice(loc.fee) : <span className="text-muted-foreground">Free</span>}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{loc.estimatedDays}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleActive(loc)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-opacity hover:opacity-80 ${
                          loc.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                        {loc.isActive ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(loc)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(loc.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No locations match this filter. Add one with the button above.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
          itemsPerPage={itemsPerPage} onPageChange={goToPage} onItemsPerPageChange={changePerPage}
          perPageOptions={[10, 20, 50]}
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">{editId ? "Edit" : "Add"} Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LocationType })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery (door-to-door)</SelectItem>
                    <SelectItem value="pickup">Pickup / Matatu station</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Region *</Label>
                <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v as LocationRegion })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nairobi">Within Nairobi</SelectItem>
                    <SelectItem value="outside_nairobi">Outside Nairobi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Location Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.type === "pickup" ? "e.g. Pickup: Afya Centre Matatu Stage" : "e.g. Westlands / Parklands"} />
            </div>

            {form.region === "outside_nairobi" && (
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Town / City *</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Mombasa, Kisumu, Nakuru" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Delivery Fee (KSh) *</Label>
                <Input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="200" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Estimated Days *</Label>
                <Input value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} placeholder="1-2 days" />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description / Notes</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Sort order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-border" />
                  Show at checkout
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={handleSave}
                disabled={!form.name || !form.fee || !form.estimatedDays}
                className="bg-foreground text-background hover:bg-foreground/90">
                {editId ? "Update" : "Add"} Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

"use client"

/**
 * AdminSuppliers — full supplier relationship management.
 *
 * Features:
 *   - Supplier list with search / filter by status & category
 *   - Onboard supplier modal (business info, KYC docs, portal code)
 *   - Supplier drawer with tabs: Profile, Purchase Orders, Performance, KYC Docs
 *   - KYC approval / suspension workflow
 *   - Auto-generated portal codes that suppliers use to log in at /portal/supplier
 *
 * All data persists via Postgres partner_directory (Nest /api/v2/admin/partner-directory/suppliers).
 */

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import {
  Building2, Plus, Search, CheckCircle2, XCircle, AlertTriangle,
  Star, Truck, FileText, Eye, MoreHorizontal, Shield,
  ShieldCheck, Clock, Pencil, Trash2, Copy, RefreshCw,
  PackageSearch, BarChart3, ArrowRight, Download, Users,
  Award, Globe, Phone, Mail, MapPin, Hash, CreditCard,
} from "lucide-react"
import { newId } from "@/lib/cms-store"
import { usePartnerDirectoryDoc } from "@/lib/partners-directory-client"
import { adminAuthHeaders } from "@/lib/api-client"
import { apiSupplierPurchaseOrders, type SupplierPurchaseOrder } from "@/lib/api-nest"
import { AdminShell } from "./admin-shell"
import { PartnerPortalPanel } from "./partner-portal-panel"
import {
  PartnerOrgActionButton,
  type PartnerOrgActionConfig,
} from "./partner-org-action-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { TrustSeal } from "@/components/ui/trust-seal"

const WINE = "#3D0814"
const ORANGE = "#F97316"

/* ─── Types ──────────────────────────────────────────────────── */

type SupplierStatus = "pending" | "verified" | "suspended" | "blacklisted"
type SupplierCategory =
  | "pharmaceutical" | "medical_devices" | "consumables"
  | "cold_chain" | "otc" | "vitamins" | "veterinary"

export interface Supplier {
  id: string
  companyName: string
  tradingName: string
  registrationNumber: string
  taxId: string
  portalCode: string
  email: string
  phone: string
  country: string
  city: string
  address: string
  contactPerson: string
  contactPhone: string
  contactEmail: string
  categories: SupplierCategory[]
  paymentTerms: string
  creditLimit: number
  status: SupplierStatus
  kycScore: number
  kycNotes: string
  hasLicense: boolean
  hasFdaCert: boolean
  hasInsurance: boolean
  activePoCount: number
  totalPoValue: number
  onTimeDeliveryRate: number
  qualityScore: number
  notes: string
  joinedAt: string
  verifiedAt?: string
}

interface PurchaseOrder {
  id: string
  supplierId: string
  items: { name: string; qty: number; unitPrice: number }[]
  total: number
  status: "draft" | "sent" | "confirmed" | "dispatched" | "received" | "disputed"
  expectedDate: string
  createdAt: string
}

const SUPPLIER_ORG_ACTIONS: PartnerOrgActionConfig = {
  directoryKey: "suppliers",
  partnerType: "supplier",
  entityLabel: "Supplier",
  activeStatus: "verified",
  suspendedStatus: "suspended",
  getDisplayName: (p) => String(p.companyName ?? p.tradingName ?? p.id),
  kycFields: [
    { key: "hasLicense", label: "Pharmacy / wholesale license" },
    { key: "hasFdaCert", label: "PPB / regulatory certification" },
    { key: "hasInsurance", label: "Product liability insurance" },
  ],
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function generatePortalCode(prefix = "SUP"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code.slice(0, 4)}-${code.slice(4)}`
}

function StatusBadge({ status }: { status: SupplierStatus }) {
  const map: Record<SupplierStatus, string> = {
    pending:    "bg-amber-50 text-amber-700 border-amber-200",
    verified:   "bg-green-50 text-green-700 border-green-200",
    suspended:  "bg-red-50 text-red-700 border-red-200",
    blacklisted:"bg-gray-100 text-gray-600 border-gray-300",
  }
  const icons: Record<SupplierStatus, typeof Clock> = {
    pending: Clock, verified: ShieldCheck, suspended: XCircle, blacklisted: XCircle,
  }
  const Icon = icons[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${map[status]}`}>
      <Icon className="h-3 w-3" />{status}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color = WINE }: {
  icon: typeof Building2; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: WINE }}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Add / Edit Modal ────────────────────────────────────────── */

function SupplierModal({
  open, onClose, existing, onSave,
}: {
  open: boolean
  onClose: () => void
  existing?: Supplier | null
  onSave: (s: Supplier) => void
}) {
  const blank: Omit<Supplier, "id" | "joinedAt" | "activePoCount" | "totalPoValue" | "onTimeDeliveryRate" | "qualityScore" | "kycScore"> = {
    companyName: "", tradingName: "", registrationNumber: "", taxId: "",
    portalCode: generatePortalCode(), email: "", phone: "", country: "Kenya",
    city: "", address: "", contactPerson: "", contactPhone: "", contactEmail: "",
    categories: [], paymentTerms: "Net 30", creditLimit: 500000,
    status: "pending", kycNotes: "", hasLicense: false, hasFdaCert: false,
    hasInsurance: false, notes: "",
  }
  const [form, setForm] = useState<typeof blank>(existing ? { ...existing } : blank)
  const [errors, setErrors] = useState<{ companyName?: string; email?: string }>({})
  const set = (k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === "companyName" || k === "email") setErrors(e => ({ ...e, [k]: undefined }))
  }

  const toggleCat = (c: SupplierCategory) => {
    set("categories", form.categories.includes(c)
      ? form.categories.filter(x => x !== c)
      : [...form.categories, c])
  }

  const handleSave = () => {
    const next: { companyName?: string; email?: string } = {}
    if (!form.companyName.trim()) next.companyName = "Company name is required"
    if (!form.email.trim()) next.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Enter a valid email address"
    setErrors(next)
    if (Object.keys(next).length > 0) return
    const now = new Date().toISOString()
    onSave({
      ...form,
      id: existing?.id ?? newId("sup"),
      joinedAt: existing?.joinedAt ?? now,
      activePoCount: existing?.activePoCount ?? 0,
      totalPoValue: existing?.totalPoValue ?? 0,
      onTimeDeliveryRate: existing?.onTimeDeliveryRate ?? 100,
      qualityScore: existing?.qualityScore ?? 5,
      kycScore: existing?.kycScore ?? 0,
    } as Supplier)
    onClose()
  }

  const cats: SupplierCategory[] = ["pharmaceutical", "medical_devices", "consumables", "cold_chain", "otc", "vitamins", "veterinary"]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: WINE }}>{existing ? "Edit Supplier" : "Onboard New Supplier"}</DialogTitle>
          <DialogDescription>Fill in supplier details and KYC information</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Business info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Business Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Company Name *</Label>
                <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="MediSupply Ltd" aria-invalid={!!errors.companyName} className={errors.companyName ? "border-red-400 focus-visible:ring-red-400" : ""} />
                {errors.companyName && <p className="text-[11px] text-red-600 mt-1">{errors.companyName}</p>}
              </div>
              <div>
                <Label className="text-xs">Trading Name</Label>
                <Input value={form.tradingName} onChange={e => set("tradingName", e.target.value)} placeholder="MediSupply" />
              </div>
              <div>
                <Label className="text-xs">Registration Number</Label>
                <Input value={form.registrationNumber} onChange={e => set("registrationNumber", e.target.value)} placeholder="CPR/2024/12345" />
              </div>
              <div>
                <Label className="text-xs">Tax ID / KRA PIN</Label>
                <Input value={form.taxId} onChange={e => set("taxId", e.target.value)} placeholder="A001234567X" />
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Select value={form.country} onValueChange={v => set("country", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Kenya", "Uganda", "Tanzania", "Ethiopia", "India", "China", "UAE"].map(c =>
                      <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Nairobi" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Physical Address</Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Industrial Area, Enterprise Road" />
              </div>
            </div>
          </div>

          {/* Primary contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Primary Contact</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contact Person *</Label>
                <Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} placeholder="John Kamau" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="john@medisupply.co.ke" aria-invalid={!!errors.email} className={errors.email ? "border-red-400 focus-visible:ring-red-400" : ""} />
                {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+254 700 000000" />
              </div>
              <div>
                <Label className="text-xs">Contact Email</Label>
                <Input value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="procurement@medisupply.co.ke" />
              </div>
            </div>
          </div>

          {/* Supply categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Supply Categories</h4>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button key={c} type="button" onClick={() => toggleCat(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.categories.includes(c)
                    ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
                  style={form.categories.includes(c) ? { background: WINE } : {}}>
                  {c.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Commercial terms */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Commercial Terms</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Payment Terms</Label>
                <Select value={form.paymentTerms} onValueChange={v => set("paymentTerms", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Advance", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90"].map(t =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Credit Limit (KSH)</Label>
                <Input type="number" value={form.creditLimit} onChange={e => set("creditLimit", Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* KYC docs */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">KYC & Compliance</h4>
            <div className="flex gap-4 mb-3">
              {[
                { key: "hasLicense", label: "Business License" },
                { key: "hasFdaCert", label: "FDA / KEBS Cert" },
                { key: "hasInsurance", label: "Liability Insurance" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean}
                    onChange={e => set(key, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <Textarea value={form.kycNotes} onChange={e => set("kycNotes", e.target.value)}
              placeholder="KYC review notes, compliance remarks..." rows={2} />
          </div>

          {/* Portal access */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Portal Access</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs">Portal Code (shared with supplier)</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.portalCode} readOnly className="font-mono text-sm bg-gray-50" />
                  <Button variant="outline" size="sm" onClick={() => set("portalCode", generatePortalCode())}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(form.portalCode)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Supplier uses this code + their email to log in at <span className="font-mono">/portal/supplier</span></p>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Internal Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any additional notes for this supplier..." rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} style={{ background: WINE }} className="text-white hover:opacity-90">
            {existing ? "Save Changes" : "Onboard Supplier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Supplier PO tab (Postgres via Nest) ─────────────────────── */

const PO_STATUSES = ["draft", "sent", "confirmed", "dispatched", "received", "disputed", "cancelled"] as const

function PoStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sent: "bg-blue-50 text-blue-700",
    confirmed: "bg-indigo-50 text-indigo-700",
    dispatched: "bg-purple-50 text-purple-700",
    received: "bg-green-50 text-green-700",
    disputed: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-700",
  }
  return (
    <Badge variant="outline" className={`text-xs capitalize ${colors[status] ?? "bg-gray-50"}`}>
      {status}
    </Badge>
  )
}

function SupplierOrdersTab({
  supplier,
  onUpdate,
}: {
  supplier: Supplier
  onUpdate: (s: Supplier) => void
}) {
  const { data: pos, mutate, isLoading } = useSWR(
    `supplier-pos-${supplier.id}`,
    () => apiSupplierPurchaseOrders.list(supplier.id),
  )
  const [showForm, setShowForm] = useState(false)
  const [itemName, setItemName] = useState("")
  const [qty, setQty] = useState("1")
  const [unitPrice, setUnitPrice] = useState("")
  const [notes, setNotes] = useState("")
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState("")

  const refreshStats = async () => {
    try {
      const stats = await apiSupplierPurchaseOrders.stats(supplier.id)
      onUpdate({
        ...supplier,
        activePoCount: stats.activePoCount,
        totalPoValue: stats.totalPoValue,
      })
    } catch {
      /* stats optional when migration pending */
    }
  }

  useEffect(() => {
    void refreshStats()
  }, [supplier.id])

  const createPo = async () => {
    setErr("")
    if (!itemName.trim()) {
      setErr("Item name is required")
      return
    }
    setCreating(true)
    try {
      await apiSupplierPurchaseOrders.create({
        supplierId: supplier.id,
        items: [{
          name: itemName.trim(),
          qty: Math.max(1, Number(qty) || 1),
          unitPrice: Math.max(0, Number(unitPrice) || 0),
        }],
        notes: notes.trim() || undefined,
        status: "sent",
      })
      setItemName("")
      setQty("1")
      setUnitPrice("")
      setNotes("")
      setShowForm(false)
      await mutate()
      await refreshStats()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create PO")
    } finally {
      setCreating(false)
    }
  }

  const changeStatus = async (po: SupplierPurchaseOrder, status: string) => {
    await apiSupplierPurchaseOrders.updateStatus(po.id, status)
    await mutate()
    await refreshStats()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">Purchase Orders</p>
        <Button
          size="sm"
          style={{ background: WINE }}
          className="text-white text-xs"
          onClick={() => setShowForm(s => !s)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {showForm ? "Cancel" : "New PO"}
        </Button>
      </div>

      {err && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>
      )}

      {showForm && (
        <div className="border rounded-xl p-4 space-y-3 bg-gray-50/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-3">
              <Label className="text-xs">Item</Label>
              <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Product name" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Qty</Label>
              <Input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Unit price (KES)</Label>
              <Input type="number" min={0} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="mt-1 h-9" />
            </div>
            <div className="flex items-end">
              <Button onClick={createPo} disabled={creating} className="w-full h-9 text-white text-xs" style={{ background: WINE }}>
                {creating ? "Creating…" : "Create & send"}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1 text-sm" />
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading purchase orders…</p>
      ) : !pos?.length ? (
        <div className="text-center py-12 text-gray-400">
          <PackageSearch className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No purchase orders yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pos.map(po => (
            <div key={po.id} className="border rounded-xl p-3 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-800">{po.poNumber}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(po.createdAt).toLocaleDateString()}
                    {po.expectedDate ? ` · Expected ${new Date(po.expectedDate).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PoStatusBadge status={po.status} />
                  <span className="text-sm font-semibold" style={{ color: WINE }}>
                    KES {Number(po.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5 mb-2">
                {po.items.map(it => (
                  <li key={it.id}>
                    {it.name} × {it.qty} @ KES {Number(it.unitPrice).toLocaleString()}
                  </li>
                ))}
              </ul>
              {po.notes && <p className="text-xs text-gray-500 italic mb-2">{po.notes}</p>}
              <Select value={po.status} onValueChange={v => void changeStatus(po, v)}>
                <SelectTrigger className="h-8 text-xs w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {PO_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Supplier Drawer ─────────────────────────────────────────── */

function SupplierDrawer({ supplier, open, onClose, onUpdate }: {
  supplier: Supplier | null
  open: boolean
  onClose: () => void
  onUpdate: (s: Supplier) => void
}) {
  const [tab, setTab] = useState<"profile" | "orders" | "performance" | "kyc">("profile")
  if (!supplier) return null

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "orders", label: "Purchase Orders" },
    { id: "performance", label: "Performance" },
    { id: "kyc", label: "KYC & Docs" },
  ] as const

  const setStatus = (status: SupplierStatus) => onUpdate({ ...supplier, status, verifiedAt: status === "verified" ? new Date().toISOString() : supplier.verifiedAt })

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: WINE }}>
                {supplier.companyName[0]}
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: WINE }}>{supplier.companyName}</p>
                <p className="text-xs text-gray-400 font-normal">{supplier.city}, {supplier.country}</p>
              </div>
              <StatusBadge status={supplier.status} />
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: WINE }}>{supplier.activePoCount}</p>
            <p className="text-xs text-gray-500">Active POs</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: WINE }}>
              {(supplier.totalPoValue / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-gray-500">Total PO Value</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: WINE }}>{supplier.onTimeDeliveryRate}%</p>
            <p className="text-xs text-gray-500">On-Time Rate</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {supplier.status !== "verified" && (
            <Button size="sm" onClick={() => setStatus("verified")} className="text-white text-xs" style={{ background: "#15803D" }}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />Approve KYC
            </Button>
          )}
          {supplier.status === "verified" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("suspended")} className="text-red-600 border-red-200 text-xs">
              <XCircle className="h-3.5 w-3.5 mr-1" />Suspend
            </Button>
          )}
          {supplier.status !== "verified" && supplier.status !== "pending" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("pending")} className="text-xs">
              Reactivate
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs ml-auto"
            onClick={() => navigator.clipboard.writeText(supplier.portalCode)}>
            <Copy className="h-3.5 w-3.5 mr-1" />Copy Portal Code
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${tab === t.id ? "border-b-2 border-[#3D0814] text-[#3D0814]" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {tab === "profile" && (
            <div className="space-y-3 text-sm">
              {[
                { icon: Hash, label: "Reg. Number", value: supplier.registrationNumber || "—" },
                { icon: Hash, label: "Tax ID", value: supplier.taxId || "—" },
                { icon: Mail, label: "Email", value: supplier.email },
                { icon: Phone, label: "Phone", value: supplier.phone || "—" },
                { icon: MapPin, label: "Address", value: `${supplier.address}, ${supplier.city}` },
                { icon: Users, label: "Contact", value: `${supplier.contactPerson} (${supplier.contactEmail || supplier.contactPhone || "—"})` },
                { icon: CreditCard, label: "Payment Terms", value: supplier.paymentTerms },
                { icon: CreditCard, label: "Credit Limit", value: `KSH ${supplier.creditLimit.toLocaleString()}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-700">{value}</p>
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Categories</p>
                <div className="flex flex-wrap gap-1">
                  {supplier.categories.map(c => (
                    <span key={c} className="px-2 py-0.5 text-xs rounded-full border font-medium capitalize"
                      style={{ background: `${WINE}10`, color: WINE, borderColor: `${WINE}30` }}>
                      {c.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
              {supplier.notes && (
                <div className="mt-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                  <strong>Notes:</strong> {supplier.notes}
                </div>
              )}
            </div>
          )}

          {tab === "orders" && (
            <SupplierOrdersTab supplier={supplier} onUpdate={onUpdate} />
          )}

          {tab === "performance" && (
            <div className="space-y-4">
              {[
                { label: "On-Time Delivery Rate", value: supplier.onTimeDeliveryRate, suffix: "%", color: "#15803D" },
                { label: "Quality Score", value: supplier.qualityScore * 20, suffix: `% (${supplier.qualityScore}/5)`, color: ORANGE },
                { label: "KYC Completeness", value: supplier.kycScore, suffix: "%", color: WINE },
              ].map(({ label, value, suffix, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold" style={{ color }}>{value}{suffix}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "kyc" && (
            <div className="space-y-3">
              {[
                { key: "hasLicense", label: "Business License / Certificate of Incorporation" },
                { key: "hasFdaCert", label: "FDA / KEBS / Pharmacy Board Certificate" },
                { key: "hasInsurance", label: "Product Liability Insurance" },
              ].map(({ key, label }) => {
                const has = (supplier as unknown as Record<string, unknown>)[key] as boolean
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${has ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                    {has ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm font-medium ${has ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                  </div>
                )
              })}
              {supplier.kycNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-700 mb-1">Review Notes</p>
                  <p className="text-sm text-amber-800">{supplier.kycNotes}</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Portal Code</p>
                <p className="font-mono font-bold text-gray-700">{supplier.portalCode}</p>
                <p className="text-xs text-gray-400 mt-1">Share with supplier for portal access at /portal/supplier</p>
              </div>
              {supplier.verifiedAt && (
                <p className="text-xs text-gray-400">Verified: {new Date(supplier.verifiedAt).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */

export function AdminSuppliers() {
  const [suppliers, setSuppliers, { refresh: refreshSuppliers }] = usePartnerDirectoryDoc<Supplier>("suppliers", [])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [catFilter, setCatFilter] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [viewing, setViewing] = useState<Supplier | null>(null)

  const filtered = useMemo(() => {
    let s = suppliers
    if (search) {
      const q = search.toLowerCase()
      s = s.filter(x => x.companyName.toLowerCase().includes(q) || x.email.toLowerCase().includes(q) || x.portalCode.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") s = s.filter(x => x.status === statusFilter)
    if (catFilter !== "all") s = s.filter(x => x.categories.includes(catFilter as SupplierCategory))
    return s
  }, [suppliers, search, statusFilter, catFilter])

  const kpis = useMemo(() => ({
    total: suppliers.length,
    verified: suppliers.filter(s => s.status === "verified").length,
    pending: suppliers.filter(s => s.status === "pending").length,
    suspended: suppliers.filter(s => s.status === "suspended").length,
  }), [suppliers])

  const saveSupplier = (sup: Supplier) => {
    const isNew = !suppliers.find(s => s.id === sup.id)
    setSuppliers(prev => {
      const idx = prev.findIndex(s => s.id === sup.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = sup; return next }
      return [...prev, sup]
    })
    if (isNew && sup.email) {
      fetch("/api/v2/partners/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
        body: JSON.stringify({ partnerType: "supplier", partnerId: sup.id, email: sup.email, displayName: sup.companyName }),
      }).catch(() => undefined)
    }
  }

  const patchSupplier = (id: string, patch: Record<string, unknown>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } as Supplier : s)))
    void refreshSuppliers()
  }

  const removeSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    void refreshSuppliers()
  }

  return (
    <AdminShell title="Suppliers">
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Building2} label="Total Suppliers" value={kpis.total} />
          <KpiCard icon={ShieldCheck} label="Verified" value={kpis.verified} color="#15803D" />
          <KpiCard icon={Clock} label="Pending KYC" value={kpis.pending} color={ORANGE} />
          <KpiCard icon={XCircle} label="Suspended" value={kpis.suspended} color="#B91C1C" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search by name, email or portal code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {["pharmaceutical", "medical_devices", "consumables", "cold_chain", "otc", "vitamins", "veterinary"].map(c =>
                <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setShowAdd(true) }} style={{ background: WINE }} className="text-white hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />Add Supplier
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No suppliers found</p>
              <p className="text-sm mt-1">Add your first supplier to get started</p>
              <Button onClick={() => setShowAdd(true)} className="mt-4 text-white" style={{ background: WINE }}>
                <Plus className="h-4 w-4 mr-2" />Onboard Supplier
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Supplier</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Categories</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Portal Code</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">KYC</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const kycPct = ((s.hasLicense ? 33 : 0) + (s.hasFdaCert ? 34 : 0) + (s.hasInsurance ? 33 : 0))
                  return (
                    <tr key={s.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: WINE }}>
                            {s.companyName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                              {s.companyName}
                              {/* Trust Seal — shown for verified suppliers. */}
                              {s.status === "verified" && <TrustSeal size="xs" label="Verified" />}
                            </p>
                            <p className="text-xs text-gray-400">{s.city}, {s.country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {s.categories.slice(0, 2).map(c => (
                            <span key={c} className="px-1.5 py-0.5 text-[10px] rounded font-medium capitalize" style={{ background: `${WINE}12`, color: WINE }}>
                              {c.replace("_", " ")}
                            </span>
                          ))}
                          {s.categories.length > 2 && <span className="text-xs text-gray-400">+{s.categories.length - 2}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="font-mono text-xs text-gray-600">{s.portalCode}</span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${kycPct}%`, background: kycPct === 100 ? "#15803D" : ORANGE }} />
                          </div>
                          <span className="text-xs text-gray-500">{kycPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewing(s)} className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setShowAdd(true) }} className="h-7 w-7 p-0">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <PartnerOrgActionButton
                            partner={s as unknown as Record<string, unknown> & { id: string }}
                            config={SUPPLIER_ORG_ACTIONS}
                            onPatched={(patch) => patchSupplier(s.id, patch)}
                            onDeleted={() => removeSupplier(s.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Portal access</h2>
          <PartnerPortalPanel type="supplier" />
        </div>
      </div>

      <SupplierModal
        key={showAdd ? (editing?.id ?? "new") : "closed"}
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditing(null) }}
        existing={editing}
        onSave={saveSupplier}
      />
      <SupplierDrawer
        supplier={viewing}
        open={!!viewing}
        onClose={() => setViewing(null)}
        onUpdate={saveSupplier}
      />
    </AdminShell>
  )
}

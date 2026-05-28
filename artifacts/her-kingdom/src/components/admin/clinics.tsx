"use client"

/**
 * AdminClinics — clinic/hospital onboarding, KYC review, and trade-on-behalf.
 *
 * Features:
 *   - Onboard clinics with full KYC form (license, NHIF, directors)
 *   - KYC review workflow (pending → approved / on_hold / rejected)
 *   - Clinic detail drawer with: Profile, KYC Docs, Orders, Trade on Behalf
 *   - "Trade on behalf" — admin can place a medicine order sourced from
 *     the supplier network on behalf of the clinic, charged to their credit line
 *   - Credit limit management per clinic
 *
 * All data persists via cmsStore("clinics").
 */

import { useState, useMemo } from "react"
import {
  Stethoscope, Plus, Search, CheckCircle2, XCircle, Clock,
  AlertTriangle, Building2, FileText, Eye, Pencil, Trash2,
  CreditCard, ShieldCheck, Copy, RefreshCw, ShoppingCart,
  Users, Phone, Mail, MapPin, Hash, Award, Activity,
  ClipboardList, Package, ChevronRight,
} from "lucide-react"
import { useCmsDoc, newId } from "@/lib/cms-store"
import { AdminShell } from "./admin-shell"
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

const WINE = "#3D0814"
const ORANGE = "#F97316"
const GREEN = "#15803D"

/* ─── Types ──────────────────────────────────────────────────── */

type ClinicStatus = "pending_kyc" | "approved" | "on_hold" | "rejected"
type ClinicType = "hospital" | "clinic" | "pharmacy" | "dispensary" | "health_centre" | "specialist"

export interface Clinic {
  id: string
  clinicName: string
  clinicType: ClinicType
  licenseNumber: string
  nhifNumber: string
  kraPin: string
  portalCode: string
  email: string
  phone: string
  county: string
  town: string
  address: string
  medicalDirector: string
  procurementContact: string
  procurementPhone: string
  procurementEmail: string
  specialties: string[]
  patientCapacity: number
  creditLimit: number
  creditUsed: number
  paymentTerms: string
  status: ClinicStatus
  tier: "standard" | "partner" | "preferred"
  hasLicense: boolean
  hasNhifCert: boolean
  hasPinCert: boolean
  hasDirectorId: boolean
  kycNotes: string
  orderCount: number
  totalOrderValue: number
  notes: string
  joinedAt: string
  approvedAt?: string
}

interface TradeOrder {
  clinicId: string
  items: { name: string; qty: number; unitPrice: number }[]
  notes: string
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function generatePortalCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `CLN-${code.slice(0, 4)}-${code.slice(4)}`
}

function StatusBadge({ status }: { status: ClinicStatus }) {
  const map: Record<ClinicStatus, string> = {
    pending_kyc: "bg-amber-50 text-amber-700 border-amber-200",
    approved:    "bg-green-50 text-green-700 border-green-200",
    on_hold:     "bg-orange-50 text-orange-700 border-orange-200",
    rejected:    "bg-red-50 text-red-700 border-red-200",
  }
  const labels: Record<ClinicStatus, string> = {
    pending_kyc: "Pending KYC", approved: "Approved",
    on_hold: "On Hold", rejected: "Rejected",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}>
      {labels[status]}
    </span>
  )
}

function TierBadge({ tier }: { tier: Clinic["tier"] }) {
  const map = {
    standard:  { cls: "bg-gray-100 text-gray-600 border-gray-200", icon: "◆" },
    partner:   { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: "★" },
    preferred: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: "♛" },
  }
  const { cls, icon } = map[tier]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${cls}`}>
      {icon} {tier}
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

/* ─── Trade-on-behalf Modal ───────────────────────────────────── */

function TradeOnBehalfModal({ clinic, open, onClose }: {
  clinic: Clinic | null; open: boolean; onClose: () => void
}) {
  const [items, setItems] = useState([{ name: "", qty: 1, unitPrice: 0 }])
  const [notes, setNotes] = useState("")
  if (!clinic) return null

  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const creditAvailable = clinic.creditLimit - clinic.creditUsed
  const canPlace = total > 0 && total <= creditAvailable && items.every(i => i.name)

  const addLine = () => setItems(p => [...p, { name: "", qty: 1, unitPrice: 0 }])
  const updateLine = (idx: number, k: string, v: string | number) =>
    setItems(p => p.map((item, i) => i === idx ? { ...item, [k]: v } : item))
  const removeLine = (idx: number) => setItems(p => p.filter((_, i) => i !== idx))

  const placeOrder = () => {
    alert(`Order of KSH ${total.toLocaleString()} placed on behalf of ${clinic.clinicName}. Credit used: ${total.toLocaleString()} / ${clinic.creditLimit.toLocaleString()}.`)
    onClose()
    setItems([{ name: "", qty: 1, unitPrice: 0 }])
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle style={{ color: WINE }}>Trade on Behalf — {clinic.clinicName}</DialogTitle>
          <DialogDescription>
            Place a medicine order sourced from the supplier network on behalf of this clinic.
            Charged to their credit line (Available: KSH {creditAvailable.toLocaleString()}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
            <strong>Credit line:</strong> KSH {clinic.creditUsed.toLocaleString()} used of KSH {clinic.creditLimit.toLocaleString()} total
            <div className="h-1.5 bg-blue-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(clinic.creditUsed / clinic.creditLimit) * 100}%` }} />
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-400">Order Lines</Label>
            <div className="space-y-2 mt-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                  <Input value={item.name} onChange={e => updateLine(idx, "name", e.target.value)}
                    placeholder="Medicine / product name" className="text-sm" />
                  <Input type="number" min={1} value={item.qty} onChange={e => updateLine(idx, "qty", Number(e.target.value))}
                    placeholder="Qty" className="text-sm text-center" />
                  <Input type="number" min={0} value={item.unitPrice} onChange={e => updateLine(idx, "unitPrice", Number(e.target.value))}
                    placeholder="Unit price" className="text-sm" />
                  <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine} className="text-xs gap-1">
                <Plus className="h-3 w-3" />Add line
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 border-t font-bold text-base" style={{ color: WINE }}>
            <span>Total</span>
            <span>KSH {total.toLocaleString()}</span>
          </div>
          {total > creditAvailable && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />Exceeds available credit (KSH {creditAvailable.toLocaleString()})
            </p>
          )}

          <div>
            <Label className="text-xs">Order Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Delivery instructions, urgency, notes for supplier…" rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={placeOrder} disabled={!canPlace} style={{ background: WINE }} className="text-white gap-2">
            <ShoppingCart className="h-4 w-4" />Place Order on Behalf
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Onboard Modal ───────────────────────────────────────────── */

function ClinicModal({ open, onClose, existing, onSave }: {
  open: boolean; onClose: () => void; existing?: Clinic | null; onSave: (c: Clinic) => void
}) {
  const blank = {
    clinicName: "", clinicType: "clinic" as ClinicType, licenseNumber: "", nhifNumber: "",
    kraPin: "", portalCode: generatePortalCode(), email: "", phone: "", county: "", town: "",
    address: "", medicalDirector: "", procurementContact: "", procurementPhone: "",
    procurementEmail: "", specialties: [] as string[], patientCapacity: 100,
    creditLimit: 200000, creditUsed: 0, paymentTerms: "Net 30",
    status: "pending_kyc" as ClinicStatus, tier: "standard" as Clinic["tier"],
    hasLicense: false, hasNhifCert: false, hasPinCert: false, hasDirectorId: false,
    kycNotes: "", orderCount: 0, totalOrderValue: 0, notes: "",
  }
  const [form, setForm] = useState(existing ? { ...existing } : blank)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const SPECIALTIES = ["General Practice", "Paediatrics", "Obstetrics", "Oncology", "Orthopaedics", "Cardiology", "Dentistry", "Ophthalmology"]

  const toggleSpec = (s: string) => set("specialties", form.specialties.includes(s)
    ? form.specialties.filter(x => x !== s) : [...form.specialties, s])

  const handleSave = () => {
    if (!form.clinicName || !form.email) return
    onSave({
      ...form,
      id: existing?.id ?? newId("cln"),
      joinedAt: existing?.joinedAt ?? new Date().toISOString(),
    } as Clinic)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: WINE }}>{existing ? "Edit Clinic" : "Onboard New Clinic"}</DialogTitle>
          <DialogDescription>Enter clinic details and KYC information for onboarding</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Clinic Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Clinic / Hospital Name *</Label>
                <Input value={form.clinicName} onChange={e => set("clinicName", e.target.value)} placeholder="Nairobi Women's Hospital" />
              </div>
              <div>
                <Label className="text-xs">Facility Type</Label>
                <Select value={form.clinicType} onValueChange={v => set("clinicType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["hospital", "clinic", "pharmacy", "dispensary", "health_centre", "specialist"].map(t =>
                      <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">License Number</Label>
                <Input value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} placeholder="MED/2024/12345" />
              </div>
              <div>
                <Label className="text-xs">NHIF / SHIF Number</Label>
                <Input value={form.nhifNumber} onChange={e => set("nhifNumber", e.target.value)} placeholder="NHIF-2024-12345" />
              </div>
              <div>
                <Label className="text-xs">KRA PIN</Label>
                <Input value={form.kraPin} onChange={e => set("kraPin", e.target.value)} placeholder="P000000000X" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Location</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">County</Label>
                <Input value={form.county} onChange={e => set("county", e.target.value)} placeholder="Nairobi" />
              </div>
              <div>
                <Label className="text-xs">Town / Sub-county</Label>
                <Input value={form.town} onChange={e => set("town", e.target.value)} placeholder="Westlands" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Physical Address</Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Argwings Kodhek Road, Off Ring Road" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Contacts</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Medical Director</Label>
                <Input value={form.medicalDirector} onChange={e => set("medicalDirector", e.target.value)} placeholder="Dr. Jane Wanjiku" />
              </div>
              <div>
                <Label className="text-xs">Procurement Contact</Label>
                <Input value={form.procurementContact} onChange={e => set("procurementContact", e.target.value)} placeholder="John Mwangi" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="procurement@clinic.co.ke" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+254 700 000000" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Specialties</h4>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button key={s} type="button" onClick={() => toggleSpec(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.specialties.includes(s) ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200"}`}
                  style={form.specialties.includes(s) ? { background: WINE } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Credit & Terms</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Credit Limit (KSH)</Label>
                <Input type="number" value={form.creditLimit} onChange={e => set("creditLimit", Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Payment Terms</Label>
                <Select value={form.paymentTerms} onValueChange={v => set("paymentTerms", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Advance", "Net 7", "Net 14", "Net 30", "Net 60"].map(t =>
                      <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tier</Label>
                <Select value={form.tier} onValueChange={v => set("tier", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">KYC Documents</h4>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { key: "hasLicense", label: "Facility License" },
                { key: "hasNhifCert", label: "NHIF / SHIF Certificate" },
                { key: "hasPinCert", label: "KRA PIN Certificate" },
                { key: "hasDirectorId", label: "Medical Director ID" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean}
                    onChange={e => set(key, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <Textarea value={form.kycNotes} onChange={e => set("kycNotes", e.target.value)}
              placeholder="KYC review notes…" rows={2} />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Portal Access</h4>
            <div className="flex items-center gap-2">
              <Input value={form.portalCode} readOnly className="font-mono text-sm bg-gray-50 flex-1" />
              <Button variant="outline" size="sm" onClick={() => set("portalCode", generatePortalCode())}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(form.portalCode)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Clinic logs in at <span className="font-mono">/portal/clinic</span> using this code</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} style={{ background: WINE }} className="text-white hover:opacity-90">
            {existing ? "Save Changes" : "Onboard Clinic"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Clinic Drawer ───────────────────────────────────────────── */

function ClinicDrawer({ clinic, open, onClose, onUpdate, onTrade }: {
  clinic: Clinic | null; open: boolean; onClose: () => void
  onUpdate: (c: Clinic) => void; onTrade: (c: Clinic) => void
}) {
  const [tab, setTab] = useState<"profile" | "kyc" | "orders" | "trade">("profile")
  if (!clinic) return null

  const setStatus = (s: ClinicStatus) => onUpdate({ ...clinic, status: s, approvedAt: s === "approved" ? new Date().toISOString() : clinic.approvedAt })
  const creditUsedPct = Math.min(100, (clinic.creditUsed / clinic.creditLimit) * 100)
  const kycDocs = ["hasLicense", "hasNhifCert", "hasPinCert", "hasDirectorId"]
  const kycPct = kycDocs.filter(k => (clinic as unknown as Record<string, unknown>)[k]).length / kycDocs.length * 100

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: WINE }}>
                <Stethoscope className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate" style={{ color: WINE }}>{clinic.clinicName}</p>
                <p className="text-xs text-gray-400 font-normal">{clinic.town}, {clinic.county}</p>
              </div>
              <StatusBadge status={clinic.status} />
              <TierBadge tier={clinic.tier} />
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: WINE }}>{clinic.orderCount}</p>
            <p className="text-xs text-gray-500">Orders</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: WINE }}>{(clinic.totalOrderValue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-500">Total Spend</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold" style={{ color: creditUsedPct > 80 ? "#B91C1C" : WINE }}>
              {(100 - creditUsedPct).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">Credit Available</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {clinic.status !== "approved" && (
            <Button size="sm" onClick={() => setStatus("approved")} className="text-white text-xs" style={{ background: GREEN }}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
            </Button>
          )}
          <Button size="sm" onClick={() => onTrade(clinic)} className="text-white text-xs" style={{ background: ORANGE }}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />Trade on Behalf
          </Button>
          {clinic.status === "approved" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("on_hold")} className="text-orange-600 border-orange-200 text-xs">
              Hold
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs ml-auto"
            onClick={() => navigator.clipboard.writeText(clinic.portalCode)}>
            <Copy className="h-3.5 w-3.5 mr-1" />Copy Code
          </Button>
        </div>

        <div className="flex gap-1 mt-5 border-b">
          {(["profile", "kyc", "orders", "trade"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${tab === t ? "border-b-2 border-[#3D0814] text-[#3D0814]" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "trade" ? "Trade on Behalf" : t}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {tab === "profile" && (
            <div className="space-y-3 text-sm">
              {[
                { icon: Hash, label: "License", value: clinic.licenseNumber || "—" },
                { icon: Hash, label: "NHIF Number", value: clinic.nhifNumber || "—" },
                { icon: Hash, label: "KRA PIN", value: clinic.kraPin || "—" },
                { icon: Mail, label: "Email", value: clinic.email },
                { icon: Phone, label: "Phone", value: clinic.phone || "—" },
                { icon: MapPin, label: "Address", value: `${clinic.address}, ${clinic.town}, ${clinic.county}` },
                { icon: Users, label: "Medical Director", value: clinic.medicalDirector || "—" },
                { icon: Users, label: "Procurement", value: `${clinic.procurementContact} (${clinic.procurementEmail || "—"})` },
                { icon: CreditCard, label: "Credit Limit", value: `KSH ${clinic.creditLimit.toLocaleString()} (${clinic.paymentTerms})` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-700">{value}</p>
                  </div>
                </div>
              ))}
              {clinic.specialties.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {clinic.specialties.map(s => (
                      <span key={s} className="px-2 py-0.5 text-xs rounded-full border font-medium" style={{ background: `${WINE}10`, color: WINE, borderColor: `${WINE}30` }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "kyc" && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">KYC Completeness</span>
                  <span className="font-bold" style={{ color: WINE }}>{kycPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
                </div>
              </div>
              {[
                { key: "hasLicense", label: "Facility License" },
                { key: "hasNhifCert", label: "NHIF / SHIF Certificate" },
                { key: "hasPinCert", label: "KRA PIN Certificate" },
                { key: "hasDirectorId", label: "Medical Director ID" },
              ].map(({ key, label }) => {
                const has = (clinic as unknown as Record<string, unknown>)[key] as boolean
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${has ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                    {has ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                    <span className={`text-sm font-medium ${has ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                  </div>
                )
              })}
              {clinic.kycNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-bold text-amber-700 mb-1">Review Notes</p>
                  <p className="text-sm text-amber-800">{clinic.kycNotes}</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Portal Code</p>
                <p className="font-mono font-bold text-gray-700">{clinic.portalCode}</p>
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-700">{clinic.orderCount} total orders</p>
                <Button size="sm" onClick={() => { setTab("trade") }} style={{ background: ORANGE }} className="text-white text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />New Order
                </Button>
              </div>
              {clinic.orderCount === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No orders yet</p>
                  <p className="text-xs mt-1">Use "Trade on Behalf" to place the first order</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Full order history available with Phase 2 database integration.</p>
              )}
            </div>
          )}

          {tab === "trade" && (
            <div className="text-center py-10">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-700 mb-2">Trade on Behalf</p>
              <p className="text-sm text-gray-500 mb-4">Source medicines from the supplier network and charge to {clinic.clinicName}'s credit line.</p>
              <Button onClick={() => onTrade(clinic)} style={{ background: WINE }} className="text-white gap-2">
                <ShoppingCart className="h-4 w-4" />Place Order on Behalf
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */

export function AdminClinics() {
  const [clinics, setClinics] = useCmsDoc<Clinic[]>("clinics", [])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Clinic | null>(null)
  const [viewing, setViewing] = useState<Clinic | null>(null)
  const [tradeTarget, setTradeTarget] = useState<Clinic | null>(null)

  const filtered = useMemo(() => {
    let s = clinics
    if (search) {
      const q = search.toLowerCase()
      s = s.filter(c => c.clinicName.toLowerCase().includes(q) || c.county.toLowerCase().includes(q) || c.portalCode.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") s = s.filter(c => c.status === statusFilter)
    return s
  }, [clinics, search, statusFilter])

  const kpis = useMemo(() => ({
    total: clinics.length,
    approved: clinics.filter(c => c.status === "approved").length,
    pending: clinics.filter(c => c.status === "pending_kyc").length,
    totalCredit: clinics.reduce((s, c) => s + c.creditUsed, 0),
  }), [clinics])

  const saveClinic = (c: Clinic) => {
    const isNew = !clinics.find(x => x.id === c.id)
    setClinics(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = c; return n }
      return [...prev, c]
    })
    if (isNew && c.email) {
      fetch("/api/v2/partners/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clinic", name: c.clinicName, email: c.email, portalCode: c.portalCode }),
      }).catch(() => undefined)
    }
  }

  return (
    <AdminShell title="Clinics & Partners">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Stethoscope} label="Total Clinics" value={kpis.total} />
          <KpiCard icon={CheckCircle2} label="Approved" value={kpis.approved} color={GREEN} />
          <KpiCard icon={Clock} label="Pending KYC" value={kpis.pending} color={ORANGE} />
          <KpiCard icon={CreditCard} label="Credit Deployed" value={`KSH ${(kpis.totalCredit / 1000).toFixed(0)}K`} color={WINE} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search by name, county or code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_kyc">Pending KYC</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setShowAdd(true) }} style={{ background: WINE }} className="text-white hover:opacity-90 gap-2">
            <Plus className="h-4 w-4" />Onboard Clinic
          </Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No clinics yet</p>
              <Button onClick={() => setShowAdd(true)} className="mt-4 text-white" style={{ background: WINE }}>
                <Plus className="h-4 w-4 mr-2" />Onboard First Clinic
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Clinic</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Type</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">County</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">Tier</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Credit</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b last:border-0 hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${WINE}15` }}>
                          <Stethoscope className="h-4 w-4" style={{ color: WINE }} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{c.clinicName}</p>
                          <p className="text-xs text-gray-400 font-mono">{c.portalCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell capitalize text-gray-600">{c.clinicType.replace("_", " ")}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-gray-600">{c.county}</td>
                    <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3 px-4 hidden sm:table-cell"><TierBadge tier={c.tier} /></td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(c.creditUsed / c.creditLimit) * 100}%`, background: WINE }} />
                        </div>
                        <span className="text-xs text-gray-500">{((c.creditUsed / c.creditLimit) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(c)} className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setShowAdd(true) }} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setTradeTarget(c)} className="h-7 w-7 p-0 text-orange-500 hover:text-orange-700"><ShoppingCart className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remove this clinic?")) setClinics(prev => prev.filter(x => x.id !== c.id)) }} className="h-7 w-7 p-0 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ClinicModal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }} existing={editing} onSave={saveClinic} />
      <ClinicDrawer clinic={viewing} open={!!viewing} onClose={() => setViewing(null)} onUpdate={saveClinic} onTrade={c => { setViewing(null); setTradeTarget(c) }} />
      <TradeOnBehalfModal clinic={tradeTarget} open={!!tradeTarget} onClose={() => setTradeTarget(null)} />
    </AdminShell>
  )
}

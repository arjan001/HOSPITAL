"use client"

/**
 * AdminLogisticsPartners — onboard and manage logistics delivery companies.
 *
 * Features:
 *   - Onboard partners with full KYC (company, fleet, insurance, coverage)
 *   - Vehicle fleet management per partner
 *   - Coverage zones — counties and routes they service
 *   - Performance tracking (on-time rate, success rate, SLA score)
 *   - Portal code for partner dashboard access at /portal/logistics
 *
 * All data persists via cmsStore("logistics-partners").
 */

import { useState, useMemo } from "react"
import {
  Truck, Plus, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
  Building2, Eye, Pencil, Trash2, Copy, RefreshCw, MapPin,
  Phone, Mail, Hash, Package, Activity, Star, ChevronRight,
  Shield, Gauge, Timer, Warehouse, Users, Car, Bike,
} from "lucide-react"
import { newId } from "@/lib/cms-store"
import { usePartnerDirectoryDoc } from "@/lib/partners-directory-client"
import { adminAuthHeaders } from "@/lib/api-client"
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
const GREEN = "#15803D"
const PURPLE = "#7C3AED"

/* ─── Types ──────────────────────────────────────────────────── */

type PartnerStatus = "pending" | "active" | "suspended" | "inactive"
type VehicleType = "motorcycle" | "bicycle" | "tuktuk" | "van" | "cold_van" | "truck"

export interface LogisticsVehicle {
  id: string
  type: VehicleType
  plateNumber: string
  capacity: string
  driver: string
  driverPhone: string
  status: "available" | "on_delivery" | "maintenance" | "offline"
}

export interface LogisticsPartner {
  id: string
  companyName: string
  registrationNumber: string
  taxId: string
  insuranceNumber: string
  portalCode: string
  email: string
  phone: string
  county: string
  address: string
  contactPerson: string
  contactPhone: string
  coverageCounties: string[]
  specializations: string[]
  vehicles: LogisticsVehicle[]
  status: PartnerStatus
  hasInsurance: boolean
  hasRegistration: boolean
  hasDriverLicenses: boolean
  hasSafetyTraining: boolean
  hasVehicleInsurance: boolean
  hasDriverInsurance: boolean
  hasGoodsInTransitCover: boolean
  hasCommercialVehicleCover: boolean
  vehicleInsuranceExpiry: string
  vehicleInsuranceProvider: string
  kycNotes: string
  onTimeRate: number
  successRate: number
  slaScore: number
  activeDeliveries: number
  totalDeliveries: number
  avgDeliveryTime: number
  ratePerKm: number
  ratePerDelivery: number
  notes: string
  joinedAt: string
  activatedAt?: string
}

const LOGISTICS_ORG_ACTIONS: PartnerOrgActionConfig = {
  directoryKey: "logistics-partners",
  partnerType: "logistics",
  entityLabel: "Logistics partner",
  activeStatus: "active",
  suspendedStatus: "suspended",
  getDisplayName: (p) => String(p.companyName ?? p.name ?? p.id),
  kycFields: [
    { key: "hasRegistration", label: "Company registration" },
    { key: "hasInsurance", label: "Public liability insurance" },
    { key: "hasVehicleInsurance", label: "Vehicle / fleet insurance" },
    { key: "hasDriverInsurance", label: "Driver personal accident cover" },
    { key: "hasGoodsInTransitCover", label: "Goods-in-transit cover" },
    { key: "hasCommercialVehicleCover", label: "Commercial vehicle cover" },
    { key: "hasDriverLicenses", label: "Valid driver licences (all drivers)" },
    { key: "hasSafetyTraining", label: "Cold-chain / safety training" },
  ],
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function generatePortalCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `LOG-${code.slice(0, 4)}-${code.slice(4)}`
}

function StatusBadge({ status }: { status: PartnerStatus }) {
  const map: Record<PartnerStatus, string> = {
    pending:   "bg-amber-50 text-amber-700 border-amber-200",
    active:    "bg-green-50 text-green-700 border-green-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    inactive:  "bg-gray-100 text-gray-500 border-gray-200",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${map[status]}`}>
      {status}
    </span>
  )
}

function VehicleIcon({ type }: { type: VehicleType }) {
  const icons: Record<VehicleType, typeof Truck> = {
    motorcycle: Bike, bicycle: Bike, tuktuk: Car, van: Truck, cold_van: Truck, truck: Truck,
  }
  const Icon = icons[type]
  return <Icon className="h-4 w-4" />
}

function KpiCard({ icon: Icon, label, value, sub, color = WINE }: {
  icon: typeof Truck; label: string; value: string | number; sub?: string; color?: string
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

/* ─── Partner Modal ───────────────────────────────────────────── */

function PartnerModal({ open, onClose, existing, onSave }: {
  open: boolean; onClose: () => void; existing?: LogisticsPartner | null; onSave: (p: LogisticsPartner) => void
}) {
  const blank = {
    companyName: "", registrationNumber: "", taxId: "", insuranceNumber: "",
    portalCode: generatePortalCode(), email: "", phone: "", county: "", address: "",
    contactPerson: "", contactPhone: "", coverageCounties: [] as string[],
    specializations: [] as string[], vehicles: [] as LogisticsVehicle[],
    status: "pending" as PartnerStatus, hasInsurance: false, hasRegistration: false,
    hasDriverLicenses: false, hasSafetyTraining: false,
    hasVehicleInsurance: false, hasDriverInsurance: false,
    hasGoodsInTransitCover: false, hasCommercialVehicleCover: false,
    vehicleInsuranceExpiry: "", vehicleInsuranceProvider: "",
    kycNotes: "",
    onTimeRate: 100, successRate: 100, slaScore: 5,
    activeDeliveries: 0, totalDeliveries: 0, avgDeliveryTime: 45,
    ratePerKm: 50, ratePerDelivery: 200, notes: "",
    newVehicleType: "motorcycle" as VehicleType,
    newVehiclePlate: "", newVehicleDriver: "", newVehiclePhone: "", newVehicleCapacity: "",
  }
  const [form, setForm] = useState(existing ? { ...existing, newVehicleType: "motorcycle" as VehicleType, newVehiclePlate: "", newVehicleDriver: "", newVehiclePhone: "", newVehicleCapacity: "" } : blank)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Malindi", "Kilifi", "Machakos", "Kajiado", "Kiambu", "Muranga", "Meru", "Embu"]
  const SPECS = ["Pharmaceutical", "Cold Chain", "Medical Devices", "General Cargo", "Express / Same-Day", "Last-Mile", "Inter-county"]

  const toggleCounty = (c: string) => set("coverageCounties", form.coverageCounties.includes(c)
    ? form.coverageCounties.filter(x => x !== c) : [...form.coverageCounties, c])

  const toggleSpec = (s: string) => set("specializations", form.specializations.includes(s)
    ? form.specializations.filter(x => x !== s) : [...form.specializations, s])

  const addVehicle = () => {
    if (!form.newVehiclePlate) return
    const v: LogisticsVehicle = {
      id: newId("veh"),
      type: form.newVehicleType,
      plateNumber: form.newVehiclePlate,
      capacity: form.newVehicleCapacity,
      driver: form.newVehicleDriver,
      driverPhone: form.newVehiclePhone,
      status: "available",
    }
    set("vehicles", [...form.vehicles, v])
    set("newVehiclePlate", ""); set("newVehicleDriver", ""); set("newVehiclePhone", ""); set("newVehicleCapacity", "")
  }

  const removeVehicle = (id: string) => set("vehicles", form.vehicles.filter(v => v.id !== id))

  const handleSave = () => {
    if (!form.companyName || !form.email) return
    const { newVehicleType, newVehiclePlate, newVehicleDriver, newVehiclePhone, newVehicleCapacity, ...rest } = form
    onSave({
      ...rest,
      id: existing?.id ?? newId("log"),
      joinedAt: existing?.joinedAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: WINE }}>{existing ? "Edit Partner" : "Onboard Logistics Partner"}</DialogTitle>
          <DialogDescription>Register a delivery company to the Shaniid RX network</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Company Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Company Name *</Label>
                <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Swift Delivery Kenya Ltd" />
              </div>
              <div>
                <Label className="text-xs">Registration Number</Label>
                <Input value={form.registrationNumber} onChange={e => set("registrationNumber", e.target.value)} placeholder="CPR/2024/34567" />
              </div>
              <div>
                <Label className="text-xs">Insurance Number</Label>
                <Input value={form.insuranceNumber} onChange={e => set("insuranceNumber", e.target.value)} placeholder="INS-2024-67890" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="ops@swiftdelivery.co.ke" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+254 700 000000" />
              </div>
              <div>
                <Label className="text-xs">HQ County</Label>
                <Input value={form.county} onChange={e => set("county", e.target.value)} placeholder="Nairobi" />
              </div>
              <div>
                <Label className="text-xs">Contact Person</Label>
                <Input value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} placeholder="Operations Manager" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Industrial Area, Nairobi" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Coverage Counties</h4>
            <div className="flex flex-wrap gap-1.5">
              {COUNTIES.map(c => (
                <button key={c} type="button" onClick={() => toggleCounty(c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${form.coverageCounties.includes(c) ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200"}`}
                  style={form.coverageCounties.includes(c) ? { background: PURPLE } : {}}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Specializations</h4>
            <div className="flex flex-wrap gap-1.5">
              {SPECS.map(s => (
                <button key={s} type="button" onClick={() => toggleSpec(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${form.specializations.includes(s) ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200"}`}
                  style={form.specializations.includes(s) ? { background: WINE } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Fleet ({form.vehicles.length} vehicles)</h4>
            {form.vehicles.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.vehicles.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg text-sm">
                    <VehicleIcon type={v.type} />
                    <span className="font-mono font-medium flex-1">{v.plateNumber}</span>
                    <span className="text-gray-500 capitalize">{v.type.replace("_", " ")}</span>
                    <span className="text-gray-500">{v.driver}</span>
                    <button onClick={() => removeVehicle(v.id)} className="text-red-400 hover:text-red-600">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-[120px_1fr_1fr_1fr_36px] gap-2 items-end">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.newVehicleType} onValueChange={v => set("newVehicleType", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["motorcycle", "bicycle", "tuktuk", "van", "cold_van", "truck"] as VehicleType[]).map(t =>
                      <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Plate Number</Label>
                <Input className="h-9" value={form.newVehiclePlate} onChange={e => set("newVehiclePlate", e.target.value)} placeholder="KCA 123A" />
              </div>
              <div>
                <Label className="text-xs">Driver Name</Label>
                <Input className="h-9" value={form.newVehicleDriver} onChange={e => set("newVehicleDriver", e.target.value)} placeholder="John Otieno" />
              </div>
              <div>
                <Label className="text-xs">Driver Phone</Label>
                <Input className="h-9" value={form.newVehiclePhone} onChange={e => set("newVehiclePhone", e.target.value)} placeholder="+254 7xx" />
              </div>
              <Button type="button" onClick={addVehicle} className="h-9 w-9 p-0 mt-5 text-white" style={{ background: WINE }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Rates</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Rate per km (KSH)</Label>
                <Input type="number" value={form.ratePerKm} onChange={e => set("ratePerKm", Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Rate per delivery (KSH)</Label>
                <Input type="number" value={form.ratePerDelivery} onChange={e => set("ratePerDelivery", Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">KYC & Compliance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {[
                { key: "hasRegistration", label: "Company registration" },
                { key: "hasInsurance", label: "Public liability insurance" },
                { key: "hasVehicleInsurance", label: "Vehicle / fleet insurance" },
                { key: "hasDriverInsurance", label: "Driver personal accident cover" },
                { key: "hasGoodsInTransitCover", label: "Goods-in-transit cover" },
                { key: "hasCommercialVehicleCover", label: "Commercial vehicle cover" },
                { key: "hasDriverLicenses", label: "Valid driver licences (all drivers)" },
                { key: "hasSafetyTraining", label: "Cold-chain / safety training" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form as Record<string, unknown>)[key] as boolean}
                    onChange={e => set(key, e.target.checked)} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs">Vehicle insurance provider</Label>
                <Input value={form.vehicleInsuranceProvider} onChange={e => set("vehicleInsuranceProvider", e.target.value)} placeholder="e.g. APA, Jubilee" />
              </div>
              <div>
                <Label className="text-xs">Fleet insurance expiry</Label>
                <Input type="date" value={form.vehicleInsuranceExpiry?.slice(0, 10) ?? ""} onChange={e => set("vehicleInsuranceExpiry", e.target.value)} />
              </div>
            </div>
            <Textarea value={form.kycNotes} onChange={e => set("kycNotes", e.target.value)} placeholder="KYC notes, policy numbers, licence refs…" rows={2} />
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Portal Code</h4>
            <div className="flex items-center gap-2">
              <Input value={form.portalCode} readOnly className="font-mono text-sm bg-gray-50 flex-1" />
              <Button variant="outline" size="sm" onClick={() => set("portalCode", generatePortalCode())}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(form.portalCode)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Partner logs in at <span className="font-mono">/portal/logistics</span></p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} style={{ background: WINE }} className="text-white">
            {existing ? "Save Changes" : "Onboard Partner"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Partner Drawer ──────────────────────────────────────────── */

function PartnerDrawer({ partner, open, onClose, onUpdate }: {
  partner: LogisticsPartner | null; open: boolean; onClose: () => void; onUpdate: (p: LogisticsPartner) => void
}) {
  const [tab, setTab] = useState<"profile" | "fleet" | "performance" | "kyc">("profile")
  if (!partner) return null

  const setStatus = (s: PartnerStatus) => onUpdate({ ...partner, status: s, activatedAt: s === "active" ? new Date().toISOString() : partner.activatedAt })
  const kycDocs = [
    "hasRegistration", "hasInsurance", "hasVehicleInsurance", "hasDriverInsurance",
    "hasGoodsInTransitCover", "hasCommercialVehicleCover", "hasDriverLicenses", "hasSafetyTraining",
  ]
  const kycPct = kycDocs.filter(k => (partner as unknown as Record<string, unknown>)[k]).length / kycDocs.length * 100

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ background: PURPLE }}>
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate" style={{ color: WINE }}>{partner.companyName}</p>
                <p className="text-xs text-gray-400 font-normal">{partner.county}</p>
              </div>
              <StatusBadge status={partner.status} />
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: "Fleet", value: partner.vehicles.length },
            { label: "Active", value: partner.activeDeliveries },
            { label: "On-Time", value: `${partner.onTimeRate}%` },
            { label: "Counties", value: partner.coverageCounties.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-base font-bold" style={{ color: WINE }}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          {partner.status !== "active" && (
            <Button size="sm" onClick={() => setStatus("active")} className="text-white text-xs" style={{ background: GREEN }}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Activate
            </Button>
          )}
          {partner.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("suspended")} className="text-red-600 border-red-200 text-xs">
              <XCircle className="h-3.5 w-3.5 mr-1" />Suspend
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs ml-auto"
            onClick={() => navigator.clipboard.writeText(partner.portalCode)}>
            <Copy className="h-3.5 w-3.5 mr-1" />Copy Code
          </Button>
        </div>

        <div className="flex gap-1 mt-5 border-b">
          {(["profile", "fleet", "performance", "kyc"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-semibold capitalize transition-colors ${tab === t ? "border-b-2 border-[#3D0814] text-[#3D0814]" : "text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "profile" && (
            <div className="space-y-3 text-sm">
              {[
                { icon: Mail, label: "Email", value: partner.email },
                { icon: Phone, label: "Phone", value: partner.phone || "—" },
                { icon: MapPin, label: "HQ", value: `${partner.address}, ${partner.county}` },
                { icon: Users, label: "Contact", value: partner.contactPerson || "—" },
                { icon: Hash, label: "Rate", value: `KSH ${partner.ratePerKm}/km · KSH ${partner.ratePerDelivery}/delivery` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="font-medium text-gray-700">{value}</p>
                  </div>
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 mb-1">Coverage</p>
                <div className="flex flex-wrap gap-1">
                  {partner.coverageCounties.map(c => (
                    <span key={c} className="px-2 py-0.5 text-xs rounded-full border font-medium" style={{ background: `${PURPLE}10`, color: PURPLE, borderColor: `${PURPLE}30` }}>{c}</span>
                  ))}
                </div>
              </div>
              {partner.specializations.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Specializations</p>
                  <div className="flex flex-wrap gap-1">
                    {partner.specializations.map(s => (
                      <span key={s} className="px-2 py-0.5 text-xs rounded-full border font-medium" style={{ background: `${WINE}10`, color: WINE, borderColor: `${WINE}30` }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "fleet" && (
            <div className="space-y-2">
              {partner.vehicles.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No vehicles registered</p>
                </div>
              ) : (
                partner.vehicles.map(v => {
                  const statusColor = { available: GREEN, on_delivery: ORANGE, maintenance: "#F59E0B", offline: "#9CA3AF" }[v.status]
                  return (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${PURPLE}15` }}>
                        <VehicleIcon type={v.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-sm">{v.plateNumber}</p>
                        <p className="text-xs text-gray-500 capitalize">{v.type.replace("_", " ")} · {v.driver}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: statusColor, background: `${statusColor}15` }}>
                        {v.status.replace("_", " ")}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === "performance" && (
            <div className="space-y-4">
              {[
                { label: "On-Time Delivery Rate", value: partner.onTimeRate, color: GREEN },
                { label: "Delivery Success Rate", value: partner.successRate, color: ORANGE },
                { label: "SLA Compliance Score", value: partner.slaScore * 20, color: WINE },
                { label: "KYC Completeness", value: kycPct, color: PURPLE },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold" style={{ color }}>{value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold" style={{ color: WINE }}>{partner.totalDeliveries}</p>
                  <p className="text-xs text-gray-500">Total Deliveries</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold" style={{ color: WINE }}>{partner.avgDeliveryTime} min</p>
                  <p className="text-xs text-gray-500">Avg Delivery Time</p>
                </div>
              </div>
            </div>
          )}

          {tab === "kyc" && (
            <div className="space-y-3">
              {[
                { key: "hasRegistration", label: "Company registration" },
                { key: "hasInsurance", label: "Public liability insurance" },
                { key: "hasVehicleInsurance", label: "Vehicle / fleet insurance" },
                { key: "hasDriverInsurance", label: "Driver personal accident cover" },
                { key: "hasGoodsInTransitCover", label: "Goods-in-transit cover" },
                { key: "hasCommercialVehicleCover", label: "Commercial vehicle cover" },
                { key: "hasDriverLicenses", label: "Valid driver licences (all drivers)" },
                { key: "hasSafetyTraining", label: "Cold-chain / safety training" },
              ].map(({ key, label }) => {
                const has = (partner as unknown as Record<string, unknown>)[key] as boolean
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-lg border ${has ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                    {has ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                    <span className={`text-sm font-medium ${has ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                  </div>
                )
              })}
              {partner.vehicleInsuranceProvider && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="text-xs text-gray-400">Fleet insurance</p>
                  <p className="font-medium">{partner.vehicleInsuranceProvider}</p>
                  {partner.vehicleInsuranceExpiry && (
                    <p className="text-xs text-gray-500 mt-0.5">Expires {partner.vehicleInsuranceExpiry.slice(0, 10)}</p>
                  )}
                </div>
              )}
              {partner.kycNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <strong>Notes:</strong> {partner.kycNotes}
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Portal Code</p>
                <p className="font-mono font-bold text-gray-700">{partner.portalCode}</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */

export function AdminLogisticsPartners() {
  const [partners, setPartners, { refresh: refreshPartners }] = usePartnerDirectoryDoc<LogisticsPartner>("logistics-partners", [])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<LogisticsPartner | null>(null)
  const [viewing, setViewing] = useState<LogisticsPartner | null>(null)

  const filtered = useMemo(() => {
    let s = partners
    if (search) {
      const q = search.toLowerCase()
      s = s.filter(p => p.companyName.toLowerCase().includes(q) || p.county.toLowerCase().includes(q) || p.portalCode.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") s = s.filter(p => p.status === statusFilter)
    return s
  }, [partners, search, statusFilter])

  const kpis = useMemo(() => ({
    total: partners.length,
    active: partners.filter(p => p.status === "active").length,
    fleet: partners.reduce((s, p) => s + p.vehicles.length, 0),
    activeDeliveries: partners.reduce((s, p) => s + p.activeDeliveries, 0),
  }), [partners])

  const savePartner = (p: LogisticsPartner) => {
    const isNew = !partners.find(x => x.id === p.id)
    setPartners(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
      return [...prev, p]
    })
    if (isNew && p.email) {
      fetch("/api/v2/partners/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
        body: JSON.stringify({ partnerType: "logistics", partnerId: p.id, email: p.email, displayName: p.companyName }),
      }).catch(() => undefined)
    }
  }

  return (
    <AdminShell title="Logistics Partners">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Building2} label="Total Partners" value={kpis.total} color={PURPLE} />
          <KpiCard icon={CheckCircle2} label="Active" value={kpis.active} color={GREEN} />
          <KpiCard icon={Truck} label="Total Fleet" value={kpis.fleet} color={ORANGE} />
          <KpiCard icon={Activity} label="Active Deliveries" value={kpis.activeDeliveries} color={WINE} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search by name, county or code…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setShowAdd(true) }} style={{ background: WINE }} className="text-white gap-2">
            <Plus className="h-4 w-4" />Add Partner
          </Button>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No logistics partners yet</p>
              <Button onClick={() => setShowAdd(true)} className="mt-4 text-white" style={{ background: WINE }}>
                <Plus className="h-4 w-4 mr-2" />Onboard First Partner
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="text-left py-3 px-4">Company</th>
                  <th className="text-left py-3 px-4 hidden md:table-cell">Fleet</th>
                  <th className="text-left py-3 px-4 hidden lg:table-cell">Coverage</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">On-Time</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${PURPLE}15` }}>
                          <Truck className="h-4 w-4" style={{ color: PURPLE }} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                            {p.companyName}
                            {/* Trust Seal — shown for active (vetted) partners. */}
                            {p.status === "active" && <TrustSeal size="xs" label="Verified" />}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">{p.portalCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="text-sm font-medium text-gray-700">{p.vehicles.length} vehicles</span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.coverageCounties.slice(0, 3).map(c => (
                          <span key={c} className="px-1.5 py-0.5 text-[10px] rounded font-medium" style={{ background: `${PURPLE}12`, color: PURPLE }}>{c}</span>
                        ))}
                        {p.coverageCounties.length > 3 && <span className="text-xs text-gray-400">+{p.coverageCounties.length - 3}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-sm font-semibold" style={{ color: p.onTimeRate >= 90 ? GREEN : ORANGE }}>{p.onTimeRate}%</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(p)} className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setShowAdd(true) }} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                        <PartnerOrgActionButton
                          partner={p as unknown as Record<string, unknown> & { id: string }}
                          config={LOGISTICS_ORG_ACTIONS}
                          onPatched={(patch) => {
                            setPartners((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } as LogisticsPartner : x)))
                            void refreshPartners()
                          }}
                          onDeleted={() => {
                            void refreshPartners()
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Portal access</h2>
          <PartnerPortalPanel type="logistics" />
        </div>
      </div>

      <PartnerModal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null) }} existing={editing} onSave={savePartner} />
      <PartnerDrawer partner={viewing} open={!!viewing} onClose={() => setViewing(null)} onUpdate={savePartner} />
    </AdminShell>
  )
}

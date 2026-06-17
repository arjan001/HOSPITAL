"use client"

/**
 * AdminPharmacyBranches — Manage physical pharmacy branches, shifts, and employees.
 *
 * Data persists via api-nest /api/v2/pharmacy/branches (Drizzle/Postgres).
 * Tabs: Branches | Shifts | Employees
 */

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import {
  Building2, Plus, Search, Pencil, Trash2, Clock, Users,
  MapPin, Phone, Mail, ChevronRight, CheckCircle2,
  AlertTriangle, XCircle, RefreshCw, X, Save,
} from "lucide-react"
import { adminAuthHeaders } from "@/lib/api-client"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const WINE = "#3D0814"
const ACCENT_RED = "#B91C1C"
const PEACH_BG = "#FFF6EE"
const PEACH_BORDER = "#F2DCC8"
const BASE = "/api/v2/pharmacy"

type PharmacyEntity = {
  id: string
  name: string
  legalName: string
  licenseNumber: string
  email: string
  phone?: string
  address: string
  city: string
  status: string
  clerkOrgId?: string | null
  adminUserId?: string | null
  kyc?: Record<string, unknown>
  createdAt: string
}

type Branch = {
  id: string
  pharmacyId?: string | null
  branchCode: string
  name: string
  address: string
  city: string
  phone?: string
  latitude?: string
  longitude?: string
  status: string
  managerName?: string
  managerEmail?: string
  operatingHours?: Record<string, string>
  maxCapacity: number
  notes?: string
  createdAt: string
}

type Shift = {
  id: string
  branchId: string
  name: string
  startTime: string
  endTime: string
  daysOfWeek: number[]
  maxStaff: number
  active: boolean
}

type Employee = {
  id: string
  branchId: string
  shiftId?: string
  displayName: string
  email?: string
  phone?: string
  role: string
  status: string
  assignedAt: string
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const ROLES = ["pharmacist", "cashier", "manager", "technician", "intern"]
const STATUS_COLORS: Record<string, string> = {
  active: "#059669",
  inactive: "#6B7280",
  temporarily_closed: "#F97316",
}

function authFetcher(url: string) {
  return fetch(url, { headers: adminAuthHeaders() }).then((r) => {
    if (!r.ok) throw new Error("fetch failed")
    return r.json()
  })
}

async function apiFetch(path: string, method: string, body?: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...adminAuthHeaders(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

function PharmacyFormModal({ initial, onClose, onSaved }: {
  initial?: Partial<PharmacyEntity>
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial?.id
  const kyc = (initial?.kyc ?? {}) as Record<string, string>
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    legalName: initial?.legalName ?? "",
    licenseNumber: initial?.licenseNumber ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    status: initial?.status ?? "pending",
    clerkOrgId: initial?.clerkOrgId ?? "",
    ppbContact: kyc.ppbContact ?? "",
    premisesLicense: kyc.premisesLicense ?? "",
    superintendent: kyc.superintendent ?? "",
    notes: kyc.notes ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  async function save() {
    setSaving(true)
    setErr("")
    try {
      const payload = {
        name: form.name,
        legalName: form.legalName || form.name,
        licenseNumber: form.licenseNumber,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        status: form.status,
        kyc: {
          ppbContact: form.ppbContact,
          premisesLicense: form.premisesLicense,
          superintendent: form.superintendent,
          notes: form.notes,
        },
      }
      if (isEdit) {
        await apiFetch(`/pharmacies/${initial!.id}`, "PATCH", payload)
      } else {
        await apiFetch("/pharmacies", "POST", payload)
      }
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold" style={{ color: WINE }}>
            {isEdit ? "Edit pharmacy" : "Register pharmacy"}
          </h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5 opacity-50" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Internal pharmacy legal entity. Super admin registers the pharmacy and assigns a Pharmacy Admin.
          A Clerk organization is created automatically for staff invitations when Clerk is configured.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Trading name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Shaniid RX Westlands" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Registered legal name</label>
              <Input value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">PPB license no.</label>
              <Input value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} placeholder="PPB/RX/..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full h-9 rounded-md border border-input px-3 text-sm">
                <option value="pending">Pending KYC</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: PEACH_BORDER, background: PEACH_BG }}>
            <p className="text-xs font-bold" style={{ color: WINE }}>KYC & compliance (update anytime)</p>
            <Input value={form.premisesLicense} onChange={(e) => setForm((f) => ({ ...f, premisesLicense: e.target.value }))} placeholder="Premises license ref" />
            <Input value={form.superintendent} onChange={(e) => setForm((f) => ({ ...f, superintendent: e.target.value }))} placeholder="Superintendent pharmacist" />
            <Input value={form.ppbContact} onChange={(e) => setForm((f) => ({ ...f, ppbContact: e.target.value }))} placeholder="PPB contact / inspection notes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Contact email</label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Head office address</label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          {isEdit && initial?.clerkOrgId && (
            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Clerk org (staff invites): <span className="font-mono">{initial.clerkOrgId}</span>
            </div>
          )}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name} className="flex-1">
            {saving ? "Saving…" : isEdit ? "Save pharmacy" : "Create pharmacy"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Branch Form Modal ────────────────────────────────────────────────────

function BranchFormModal({ initial, pharmacies, onClose, onSaved }: {
  initial?: Partial<Branch>
  pharmacies: PharmacyEntity[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({
    pharmacyId: initial?.pharmacyId ?? "",
    branchCode: initial?.branchCode ?? "",
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    phone: initial?.phone ?? "",
    latitude: initial?.latitude ?? "",
    longitude: initial?.longitude ?? "",
    status: initial?.status ?? "active",
    managerName: initial?.managerName ?? "",
    managerEmail: initial?.managerEmail ?? "",
    maxCapacity: String(initial?.maxCapacity ?? 0),
    notes: initial?.notes ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  async function save() {
    setSaving(true)
    setErr("")
    try {
      if (isEdit) {
        await apiFetch(`/branches/${initial!.id}`, "PATCH", form)
      } else {
        await apiFetch("/branches", "POST", { ...form, maxCapacity: Number(form.maxCapacity) })
      }
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: WINE }}>{isEdit ? "Edit Branch" : "Add Branch"}</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5 opacity-50" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Parent pharmacy *</label>
            <select
              value={form.pharmacyId}
              onChange={(e) => setForm((f) => ({ ...f, pharmacyId: e.target.value }))}
              className="w-full h-9 rounded-md border border-input px-3 text-sm"
            >
              <option value="">Select pharmacy…</option>
              {pharmacies.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Branch Code</label>
              <Input value={form.branchCode} onChange={(e) => setForm((f) => ({ ...f, branchCode: e.target.value }))} placeholder="e.g. BR-001" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Branch name" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Address *</label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">City</label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Nairobi" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Latitude</label>
              <Input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="-1.2921" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Longitude</label>
              <Input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="36.8219" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="temporarily_closed">Temporarily closed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Max Capacity</label>
              <Input type="number" value={form.maxCapacity} onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Manager name</label>
              <Input value={form.managerName} onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Manager email</label>
              <Input value={form.managerEmail} onChange={(e) => setForm((f) => ({ ...f, managerEmail: e.target.value }))} placeholder="manager@..." />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.pharmacyId} className="flex-1">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create branch"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Shift Form Modal ─────────────────────────────────────────────────────

function ShiftFormModal({ branchId, onClose, onSaved }: {
  branchId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: "",
    startTime: "08:00",
    endTime: "16:00",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    maxStaff: "0",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d],
    }))
  }

  async function save() {
    setSaving(true)
    setErr("")
    try {
      await apiFetch(`/branches/${branchId}/shifts`, "POST", {
        ...form,
        maxStaff: Number(form.maxStaff),
      })
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: WINE }}>Add Shift</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5 opacity-50" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Shift name *</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning shift" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Start time</label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">End time</label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Days of week</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
                  style={form.daysOfWeek.includes(i)
                    ? { background: WINE, color: "#fff", borderColor: WINE }
                    : { background: "#fff", color: WINE, borderColor: PEACH_BORDER }
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Max staff per shift</label>
            <Input type="number" value={form.maxStaff} onChange={(e) => setForm((f) => ({ ...f, maxStaff: e.target.value }))} placeholder="0" />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name} className="flex-1">
            {saving ? "Saving…" : "Create shift"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Employee Form Modal ──────────────────────────────────────────────────

function EmployeeFormModal({ branchId, shifts, initial, onClose, onSaved }: {
  branchId: string
  shifts: Shift[]
  initial?: Partial<Employee>
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({
    displayName: initial?.displayName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    role: initial?.role ?? "pharmacist",
    shiftId: initial?.shiftId ?? "",
    status: initial?.status ?? "active",
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  async function save() {
    setSaving(true)
    setErr("")
    try {
      if (isEdit) {
        await apiFetch(`/employees/${initial!.id}`, "PATCH", form)
      } else {
        await apiFetch(`/branches/${branchId}/employees`, "POST", form)
      }
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: WINE }}>{isEdit ? "Edit Employee" : "Assign Employee"}</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5 opacity-50" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full name *</label>
            <Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Employee name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 text-sm"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Shift</label>
              <select
                value={form.shiftId}
                onChange={(e) => setForm((f) => ({ ...f, shiftId: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 text-sm"
              >
                <option value="">No shift</option>
                {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full h-9 rounded-md border border-input px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} disabled={saving || !form.displayName} className="flex-1">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Branch Detail Panel ──────────────────────────────────────────────────

function BranchDetailPanel({ branch, onClose, onEdit }: {
  branch: Branch
  onClose: () => void
  onEdit: (b: Branch) => void
}) {
  const { data: shifts = [], mutate: mutShifts } = useSWR<Shift[]>(
    `${BASE}/branches/${branch.id}/shifts`,
    authFetcher,
  )
  const { data: employees = [], mutate: mutEmployees } = useSWR<Employee[]>(
    `${BASE}/branches/${branch.id}/employees`,
    authFetcher,
  )
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)

  async function deleteShift(id: string) {
    if (!confirm("Delete this shift?")) return
    await apiFetch(`/shifts/${id}`, "DELETE")
    void mutShifts()
  }

  async function removeEmployee(id: string) {
    if (!confirm("Remove this employee from the branch?")) return
    await apiFetch(`/employees/${id}`, "DELETE")
    void mutEmployees()
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto">
        {showShiftForm && (
          <ShiftFormModal
            branchId={branch.id}
            onClose={() => setShowShiftForm(false)}
            onSaved={() => { setShowShiftForm(false); void mutShifts() }}
          />
        )}
        {(showEmpForm || editEmp) && (
          <EmployeeFormModal
            branchId={branch.id}
            shifts={shifts}
            initial={editEmp ?? undefined}
            onClose={() => { setShowEmpForm(false); setEditEmp(null) }}
            onSaved={() => { setShowEmpForm(false); setEditEmp(null); void mutEmployees() }}
          />
        )}

        <div className="sticky top-0 bg-white border-b flex items-center justify-between px-5 py-4 z-10" style={{ borderColor: PEACH_BORDER }}>
          <div>
            <p className="text-base font-bold" style={{ color: WINE }}>{branch.name}</p>
            <p className="text-xs text-muted-foreground">{branch.branchCode}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(branch)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Branch info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{branch.address}{branch.city ? `, ${branch.city}` : ""}</span>
            </div>
            {branch.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{branch.phone}</span>
              </div>
            )}
            {branch.managerName && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>{branch.managerName}{branch.managerEmail ? ` · ${branch.managerEmail}` : ""}</span>
              </div>
            )}
            {(branch.latitude && branch.longitude) && (
              <a
                href={`https://maps.google.com/?q=${branch.latitude},${branch.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold"
                style={{ color: ACCENT_RED }}
              >
                View on map ↗
              </a>
            )}
          </div>

          {/* Shifts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: WINE }}>Shifts</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowShiftForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {shifts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No shifts configured.</p>
            ) : (
              <div className="space-y-2">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ borderColor: PEACH_BORDER }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: WINE }}>{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.startTime} – {s.endTime} · {s.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}
                      </p>
                    </div>
                    <button type="button" onClick={() => void deleteShift(s.id)}>
                      <Trash2 className="h-4 w-4 opacity-40 hover:opacity-80 transition-opacity" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employees */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: WINE }}>Employees</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEmpForm(true)}>
                <Plus className="h-4 w-4 mr-1" /> Assign
              </Button>
            </div>
            {employees.length === 0 ? (
              <p className="text-xs text-muted-foreground">No employees assigned.</p>
            ) : (
              <div className="space-y-2">
                {employees.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ borderColor: PEACH_BORDER }}
                  >
                    <div>
                      <p className="text-xs font-semibold" style={{ color: WINE }}>{e.displayName}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {e.role} · {shifts.find((s) => s.id === e.shiftId)?.name ?? "No shift"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditEmp(e)}>
                        <Pencil className="h-3.5 w-3.5 opacity-40 hover:opacity-80" />
                      </button>
                      <button type="button" onClick={() => void removeEmployee(e.id)}>
                        <Trash2 className="h-3.5 w-3.5 opacity-40 hover:opacity-80" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

export function AdminPharmacyBranches() {
  const { data: pharmacyList = [], mutate: mutPharmacies } = useSWR<PharmacyEntity[]>(`${BASE}/pharmacies`, authFetcher)
  const { data: branches = [], mutate: mutBranches } = useSWR<Branch[]>(`${BASE}/branches`, authFetcher)
  const [section, setSection] = useState<"pharmacies" | "branches">("pharmacies")
  const [search, setSearch] = useState("")
  const [showPharmForm, setShowPharmForm] = useState(false)
  const [editPharmacy, setEditPharmacy] = useState<PharmacyEntity | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return branches.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.branchCode.toLowerCase().includes(q),
    )
  }, [branches, search])

  async function deleteBranch(id: string) {
    if (!confirm("Delete this branch and all its shifts/employees?")) return
    await apiFetch(`/branches/${id}`, "DELETE")
    void mutBranches()
    if (activeBranch?.id === id) setActiveBranch(null)
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, inactive: 0 }
    for (const b of branches) counts[b.status] = (counts[b.status] ?? 0) + 1
    return counts
  }, [branches])

  return (
    <AdminShell title="Pharmacy Network">
      {(showPharmForm || editPharmacy) && (
        <PharmacyFormModal
          initial={editPharmacy ?? undefined}
          onClose={() => { setShowPharmForm(false); setEditPharmacy(null) }}
          onSaved={() => { setShowPharmForm(false); setEditPharmacy(null); void mutPharmacies() }}
        />
      )}
      {(showForm || editBranch) && (
        <BranchFormModal
          initial={editBranch ?? undefined}
          pharmacies={pharmacyList}
          onClose={() => { setShowForm(false); setEditBranch(null) }}
          onSaved={() => { setShowForm(false); setEditBranch(null); void mutBranches() }}
        />
      )}
      {activeBranch && (
        <BranchDetailPanel
          branch={activeBranch}
          onClose={() => setActiveBranch(null)}
          onEdit={(b) => { setActiveBranch(null); setEditBranch(b) }}
        />
      )}

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="rounded-xl border p-4 md:p-5" style={{ borderColor: PEACH_BORDER, background: PEACH_BG }}>
          <h2 className="text-sm font-bold" style={{ color: WINE }}>How this module works</h2>
          <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
            <li><strong className="text-foreground">Pharmacies</strong> — legal entities & KYC (super admin registers, assigns Pharmacy Admin).</li>
            <li><strong className="text-foreground">Branches</strong> — physical stores under a pharmacy, with shifts and local managers.</li>
            <li><strong className="text-foreground">Staff</strong> — invite via Clerk email (when org ID is set) or assign manually per branch.</li>
          </ol>
          <p className="text-[11px] text-muted-foreground mt-2">
            Pharmacy Admins see only modules their role allows (dispensing, POS, logistics, etc.). This is internal — not a public partner portal.
          </p>
        </div>

        <Tabs value={section} onValueChange={(v) => setSection(v as "pharmacies" | "branches")}>
          <TabsList>
            <TabsTrigger value="pharmacies">Pharmacies & KYC</TabsTrigger>
            <TabsTrigger value="branches">Branches & Shifts</TabsTrigger>
          </TabsList>

          <TabsContent value="pharmacies" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowPharmForm(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Register pharmacy
              </Button>
            </div>
            {pharmacyList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No pharmacies yet. Register your first legal pharmacy entity before adding branches.
              </div>
            ) : (
              <div className="space-y-2">
                {pharmacyList.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border bg-white" style={{ borderColor: PEACH_BORDER }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: WINE }}>{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.licenseNumber || "License pending"} · {p.city || "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">Status: {p.status.replace("_", " ")}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditPharmacy(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="branches" className="mt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total branches", value: branches.length, color: WINE },
            { label: "Active", value: statusCounts.active ?? 0, color: "#059669" },
            { label: "Inactive", value: (statusCounts.inactive ?? 0) + (statusCounts.temporarily_closed ?? 0), color: "#6B7280" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border p-4 text-center"
              style={{ borderColor: PEACH_BORDER, background: "#FFFFFF" }}
            >
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches…"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Branch
          </Button>
        </div>

        {/* Branch list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto opacity-20 mb-3" />
            <p className="text-sm">No branches found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-4 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow cursor-pointer"
                style={{ borderColor: PEACH_BORDER }}
                onClick={() => setActiveBranch(b)}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: PEACH_BG }}
                >
                  <Building2 className="h-5 w-5" style={{ color: WINE }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: WINE }}>{b.name}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{b.branchCode}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: STATUS_COLORS[b.status] ?? "#6B7280" }}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {b.address}{b.city ? `, ${b.city}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditBranch(b) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void deleteBranch(b.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

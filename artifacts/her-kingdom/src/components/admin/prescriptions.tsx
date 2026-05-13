"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId } from "@/lib/cms-store"
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  User,
  Phone,
  X,
  Plus,
  Stethoscope,
} from "lucide-react"

export type PrescriptionStatus = "pending" | "verified" | "dispensed" | "rejected"

export type Prescription = {
  id: string
  patientName: string
  phone: string
  dob?: string
  imageUrl?: string
  notes: string
  status: PrescriptionStatus
  pharmacistNote: string
  recommendedDrugs: { name: string; dosage: string; instructions: string }[]
  createdAt: string
  updatedAt: string
}

const SEED: Prescription[] = [
  {
    id: "rx-001",
    patientName: "Aisha M.",
    phone: "+254 712 000 111",
    dob: "1991-04-12",
    imageUrl: "",
    notes: "Refill for hypertension medication. Existing patient.",
    status: "pending",
    pharmacistNote: "",
    recommendedDrugs: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "rx-002",
    patientName: "Brian K.",
    phone: "+254 720 555 234",
    imageUrl: "",
    notes: "First-time prescription, antibiotic course for chest infection.",
    status: "verified",
    pharmacistNote: "Verified script from Dr. Wanjiku, Aga Khan. OK to dispense.",
    recommendedDrugs: [
      { name: "Amoxicillin 500mg", dosage: "1 capsule", instructions: "3x daily for 7 days, after meals" },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "rx-003",
    patientName: "Faith O.",
    phone: "+254 733 884 901",
    imageUrl: "",
    notes: "Image is blurry, asked patient to resubmit clearer copy.",
    status: "rejected",
    pharmacistNote: "Image illegible. Requested clearer scan.",
    recommendedDrugs: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
  },
]

const STATUS_META: Record<PrescriptionStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "#92400E", bg: "#FEF3C7", icon: Clock },
  verified: { label: "Verified", color: "#166534", bg: "#DCFCE7", icon: CheckCircle2 },
  dispensed: { label: "Dispensed", color: "#1E40AF", bg: "#DBEAFE", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "#991B1B", bg: "#FEE2E2", icon: XCircle },
}

export function AdminPrescriptions() {
  const [items, setItems] = useCmsDoc<Prescription[]>("prescriptions", SEED)
  const [filter, setFilter] = useState<PrescriptionStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [active, setActive] = useState<Prescription | null>(null)

  const filtered = useMemo(() => {
    return items
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => {
        if (!search.trim()) return true
        const s = search.toLowerCase()
        return (
          p.patientName.toLowerCase().includes(s) ||
          p.phone.toLowerCase().includes(s) ||
          p.id.toLowerCase().includes(s)
        )
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [items, filter, search])

  const counts = useMemo(() => {
    const out: Record<PrescriptionStatus | "all", number> = {
      all: items.length,
      pending: 0,
      verified: 0,
      dispensed: 0,
      rejected: 0,
    }
    items.forEach((p) => {
      out[p.status]++
    })
    return out
  }, [items])

  const updateActive = (patch: Partial<Prescription>) => {
    if (!active) return
    const updated = { ...active, ...patch, updatedAt: new Date().toISOString() }
    setActive(updated)
    setItems((arr) => arr.map((p) => (p.id === updated.id ? updated : p)))
  }

  const setStatus = (status: PrescriptionStatus) => updateActive({ status })

  const addRecommendation = () =>
    updateActive({
      recommendedDrugs: [...(active?.recommendedDrugs || []), { name: "", dosage: "", instructions: "" }],
    })

  const updateRec = (idx: number, patch: Partial<Prescription["recommendedDrugs"][number]>) => {
    if (!active) return
    const recs = active.recommendedDrugs.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    updateActive({ recommendedDrugs: recs })
  }

  const removeRec = (idx: number) => {
    if (!active) return
    updateActive({ recommendedDrugs: active.recommendedDrugs.filter((_, i) => i !== idx) })
  }

  const newDraft = () => {
    const draft: Prescription = {
      id: newId("rx"),
      patientName: "",
      phone: "",
      imageUrl: "",
      notes: "",
      status: "pending",
      pharmacistNote: "",
      recommendedDrugs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setItems((arr) => [draft, ...arr])
    setActive(draft)
  }

  return (
    <AdminShell title="Prescriptions">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Prescriptions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review uploaded prescriptions, verify or reject them, and capture pharmacist notes plus recommended drugs.
            </p>
          </div>
          <button
            onClick={newDraft}
            className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New entry
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "pending", "verified", "dispensed", "rejected"] as const).map((k) => {
            const isActive = filter === k
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${
                  isActive ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary border-border"
                }`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)} <span className="opacity-60 ml-1">({counts[k]})</span>
              </button>
            )
          })}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search by name, phone, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-full border border-border bg-background text-xs w-64"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Patient</th>
                <th className="text-left px-4 py-2.5 font-medium">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Notes</th>
                <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-12">
                    No prescriptions match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const meta = STATUS_META[p.status]
                const Icon = meta.icon
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{p.patientName || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{p.phone}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[260px] truncate">{p.notes}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => setActive(p)}
                        className="text-xs font-semibold text-foreground hover:underline"
                      >
                        Review →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setActive(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Prescription</p>
                <h2 className="text-lg font-bold font-mono">{active.id}</h2>
              </div>
              <button onClick={() => setActive(null)} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Patient */}
              <section className="space-y-3">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Patient</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" icon={<User className="h-3.5 w-3.5" />}>
                    <input className="rxinput" value={active.patientName} onChange={(e) => updateActive({ patientName: e.target.value })} />
                  </Field>
                  <Field label="Phone" icon={<Phone className="h-3.5 w-3.5" />}>
                    <input className="rxinput" value={active.phone} onChange={(e) => updateActive({ phone: e.target.value })} />
                  </Field>
                  <Field label="Date of birth">
                    <input type="date" className="rxinput" value={active.dob || ""} onChange={(e) => updateActive({ dob: e.target.value })} />
                  </Field>
                  <Field label="Image URL" icon={<FileText className="h-3.5 w-3.5" />}>
                    <input className="rxinput" placeholder="/uploads/rx-001.jpg" value={active.imageUrl || ""} onChange={(e) => updateActive({ imageUrl: e.target.value })} />
                  </Field>
                </div>
                {active.imageUrl && (
                  <img
                    src={active.imageUrl}
                    alt="Prescription"
                    className="rounded-md border border-border w-full max-h-72 object-contain bg-muted/30"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
                <Field label="Patient note">
                  <textarea rows={2} className="rxinput" value={active.notes} onChange={(e) => updateActive({ notes: e.target.value })} />
                </Field>
              </section>

              {/* Status */}
              <section className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_META) as PrescriptionStatus[]).map((s) => {
                    const meta = STATUS_META[s]
                    const isOn = active.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={`px-3 h-8 rounded-md text-xs font-semibold border transition-colors ${isOn ? "border-foreground" : "border-border hover:bg-secondary"}`}
                        style={isOn ? { background: meta.bg, color: meta.color, borderColor: meta.color } : {}}
                      >
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Pharmacist note */}
              <section className="space-y-2">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" /> Pharmacist note
                </h3>
                <textarea
                  rows={3}
                  className="rxinput"
                  placeholder="Verification source, dispense instructions, follow-ups…"
                  value={active.pharmacistNote}
                  onChange={(e) => updateActive({ pharmacistNote: e.target.value })}
                />
              </section>

              {/* Recommendations */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recommended drugs</h3>
                  <button onClick={addRecommendation} className="text-xs font-semibold inline-flex items-center gap-1 text-foreground hover:underline">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {active.recommendedDrugs.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-md">
                    No drugs recommended yet.
                  </p>
                )}
                {active.recommendedDrugs.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <input className="rxinput col-span-4" placeholder="Drug" value={r.name} onChange={(e) => updateRec(i, { name: e.target.value })} />
                    <input className="rxinput col-span-3" placeholder="Dosage" value={r.dosage} onChange={(e) => updateRec(i, { dosage: e.target.value })} />
                    <input className="rxinput col-span-4" placeholder="Instructions" value={r.instructions} onChange={(e) => updateRec(i, { instructions: e.target.value })} />
                    <button onClick={() => removeRec(i)} className="col-span-1 h-9 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </div>
      )}

      <style>{`.rxinput{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;}
        textarea.rxinput{height:auto;padding:0.5rem 0.75rem;font-family:inherit;}`}</style>
    </AdminShell>
  )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium block inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

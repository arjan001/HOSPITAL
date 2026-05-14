"use client"

import { useMemo, useState } from "react"
import { Link } from "wouter"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { usePermission } from "@/lib/permissions"
import { notify } from "@/lib/notify"
import type { Consultation } from "./consultations"
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
  Trash2,
  Eye,
  Maximize2,
  Calendar,
  Pill,
  ShieldCheck,
  AlertTriangle,
  Send,
  Lock,
  Video,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"

export type PrescriptionStatus = "pending" | "verified" | "dispensed" | "rejected"

export type VerificationCheck = {
  imageClear: boolean
  signaturePresent: boolean
  patientIdMatches: boolean
  drugsLegible: boolean
  refillStatusChecked: boolean
}

export const EMPTY_VERIFICATION: VerificationCheck = {
  imageClear: false,
  signaturePresent: false,
  patientIdMatches: false,
  drugsLegible: false,
  refillStatusChecked: false,
}

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
  verification?: VerificationCheck
  consultationId?: string  // backref when this Rx was issued from a consultation
  createdAt: string
  updatedAt: string
}

const VERIFICATION_ITEMS: Array<{ key: keyof VerificationCheck; label: string; help: string }> = [
  { key: "imageClear",          label: "Prescription image is clear and legible",     help: "Reject if blurry or cropped." },
  { key: "signaturePresent",    label: "Prescriber signature / stamp is present",     help: "Required for controlled substances." },
  { key: "patientIdMatches",    label: "Patient name & phone match the order",        help: "Match against the order shipping details." },
  { key: "drugsLegible",        label: "Drug names, dosages and quantities are clear", help: "All recommended drugs must match the script." },
  { key: "refillStatusChecked", label: "Refill / repeat status checked",              help: "Confirm with prescriber if unclear." },
]

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
  pending:   { label: "Awaiting review",  color: "#92400E", bg: "#FEF3C7", icon: Clock },
  verified:  { label: "Verified",          color: "#166534", bg: "#DCFCE7", icon: ShieldCheck },
  dispensed: { label: "Dispensed",         color: "#1E40AF", bg: "#DBEAFE", icon: CheckCircle2 },
  rejected:  { label: "Rejected",          color: "#991B1B", bg: "#FEE2E2", icon: XCircle },
}

export function AdminPrescriptions() {
  const [items, setItems] = useCmsDoc<Prescription[]>("prescriptions", SEED)
  const [filter, setFilter] = useState<PrescriptionStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [active, setActive] = useState<Prescription | null>(null)
  const [zoomImage, setZoomImage] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [imageBroken, setImageBroken] = useState(false)
  const canVerify = usePermission("rx.verify")
  const canConsult = usePermission("consult.handle")
  const closeModal = () => {
    setZoomImage(false)
    setConfirmDelete(false)
    setImageBroken(false)
    setActive(null)
  }

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
      all: items.length, pending: 0, verified: 0, dispensed: 0, rejected: 0,
    }
    items.forEach((p) => { out[p.status]++ })
    return out
  }, [items])

  const updateActive = (patch: Partial<Prescription>) => {
    if (!active) return
    const updated = { ...active, ...patch, updatedAt: new Date().toISOString() }
    setActive(updated)
    setItems((arr) => arr.map((p) => (p.id === updated.id ? updated : p)))
  }

  const verification = active?.verification || EMPTY_VERIFICATION
  const verifiedCount = Object.values(verification).filter(Boolean).length
  const fullyChecked = verifiedCount === VERIFICATION_ITEMS.length
  const toggleCheck = (key: keyof VerificationCheck) =>
    updateActive({ verification: { ...verification, [key]: !verification[key] } })

  const setStatus = (status: PrescriptionStatus) => {
    if (status === "verified" && !fullyChecked) {
      notify.warning("Complete the verification checklist before approving.")
      return
    }
    if ((status === "verified" || status === "dispensed" || status === "rejected") && !canVerify) {
      notify.warning("You don't have permission to change this status.")
      return
    }
    updateActive({ status })
  }

  // Cross-module: spin up a video consultation pre-filled with this Rx so the
  // pharmacist can clarify with the patient before dispensing.
  const openConsultation = () => {
    if (!active) return
    const list = cmsStore.get<Consultation[]>("consultations", [])
    const existing = list.find((c) => c.phone === active.phone && c.status !== "completed" && c.status !== "missed")
    if (existing) {
      notify.info(`Existing ${existing.status} consultation for this patient — opening it.`)
      window.location.assign("/admin/consultations")
      return
    }
    const c: Consultation = {
      id: newId("c"),
      patientName: active.patientName || "Patient",
      phone: active.phone,
      doctorName: "Dr. on call",
      mode: "video",
      status: "queued",
      topic: `Clarify Rx ${active.id}`,
      startedAt: new Date().toISOString(),
      messages: [
        { id: newId("m"), from: "system", text: `Opened from prescription ${active.id} for clarification.`, at: new Date().toISOString() },
      ],
      doctorNote: active.pharmacistNote,
      recommendedDrugs: active.recommendedDrugs.map((r) => ({ ...r })),
    }
    cmsStore.set("consultations", [c, ...list])
    // Backref so the prescription card can deep-link to the clarifying call.
    updateActive({ consultationId: c.id })
    notify.saved(`Consultation ${c.id} created — opening`)
    window.location.assign("/admin/consultations")
  }

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

  const deleteActive = () => {
    if (!active) return
    setItems((arr) => arr.filter((p) => p.id !== active.id))
    setActive(null)
    setConfirmDelete(false)
  }

  const fmtAge = (dob?: string) => {
    if (!dob) return null
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return null
    const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000))
    return years > 0 ? `${years} yrs` : null
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
            className="px-4 h-9 rounded-md text-sm font-semibold text-white inline-flex items-center gap-2"
            style={{ background: WINE }}
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
                        className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-white hover:opacity-90 transition-opacity"
                        style={{ background: WINE }}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: review prescription ── */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={closeModal}>
          <div
            className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 flex items-center justify-between text-white" style={{ background: WINE }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider opacity-80">Prescription review</p>
                  <h2 className="text-lg font-bold font-mono truncate">{active.id}</h2>
                </div>
                <span
                  className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
                  style={{ background: STATUS_META[active.status].bg, color: STATUS_META[active.status].color }}
                >
                  {(() => { const I = STATUS_META[active.status].icon; return <I className="h-3 w-3" /> })()}
                  {STATUS_META[active.status].label}
                </span>
              </div>
              <button onClick={closeModal} className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-0 flex-1 overflow-hidden">
              {/* Left — Image + patient note */}
              <div className="bg-gray-50 border-r p-5 overflow-y-auto" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <div className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="relative" style={{ minHeight: 280 }}>
                    {active.imageUrl && !imageBroken ? (
                      <>
                        <img
                          key={active.imageUrl}
                          src={active.imageUrl}
                          alt="Prescription"
                          className="w-full max-h-[420px] object-contain bg-white"
                          onError={() => setImageBroken(true)}
                          onLoad={() => setImageBroken(false)}
                        />
                        <button
                          onClick={() => setZoomImage(true)}
                          className="absolute top-3 right-3 h-8 px-2.5 rounded-md bg-black/70 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/85"
                        >
                          <Maximize2 className="h-3.5 w-3.5" /> Zoom
                        </button>
                      </>
                    ) : (
                      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2 px-6 text-center">
                        <FileText className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">No prescription image uploaded</p>
                        <p className="text-xs">Paste an image URL below to preview it here.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Image URL</label>
                    <input
                      className="mt-1 w-full h-9 px-3 rounded-md border bg-white text-xs font-mono"
                      style={{ borderColor: "rgba(0,0,0,0.1)" }}
                      placeholder="/uploads/rx-001.jpg"
                      value={active.imageUrl || ""}
                      onChange={(e) => updateActive({ imageUrl: e.target.value })}
                    />
                  </div>
                </div>

                {/* Patient note */}
                <div className="mt-4 rounded-xl bg-white border p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Patient note
                  </div>
                  <textarea
                    rows={3}
                    className="w-full text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-2"
                    style={{ borderColor: "rgba(0,0,0,0.1)" }}
                    value={active.notes}
                    placeholder="What did the patient say about this script?"
                    onChange={(e) => updateActive({ notes: e.target.value })}
                  />
                </div>
              </div>

              {/* Right — Patient + status + recommendations */}
              <div className="overflow-y-auto p-5 space-y-5">
                {/* Patient summary card */}
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: ACCENT }}
                    >
                      {(active.patientName || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?"}
                    </div>
                    <input
                      className="flex-1 h-9 px-3 rounded-md border text-sm font-semibold"
                      style={{ borderColor: "rgba(0,0,0,0.1)" }}
                      value={active.patientName}
                      placeholder="Patient name"
                      onChange={(e) => updateActive({ patientName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field icon={<Phone className="h-3 w-3" />} label="Phone">
                      <input className="rxinput" value={active.phone} onChange={(e) => updateActive({ phone: e.target.value })} />
                    </Field>
                    <Field icon={<Calendar className="h-3 w-3" />} label={`Date of birth${fmtAge(active.dob) ? ` · ${fmtAge(active.dob)}` : ""}`}>
                      <input type="date" className="rxinput" value={active.dob || ""} onChange={(e) => updateActive({ dob: e.target.value })} />
                    </Field>
                  </div>
                </div>

                {/* Status pills */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(STATUS_META) as PrescriptionStatus[]).map((s) => {
                      const meta = STATUS_META[s]
                      const Icon = meta.icon
                      const isOn = active.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => setStatus(s)}
                          className={`h-9 px-3 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                            isOn ? "shadow-sm scale-[1.02]" : "hover:bg-secondary"
                          }`}
                          style={isOn
                            ? { background: meta.bg, color: meta.color, borderColor: meta.color }
                            : { borderColor: "rgba(0,0,0,0.1)" }}
                        >
                          <Icon className="h-3.5 w-3.5" />{meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Verification checklist */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verification checklist
                    <span
                      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={fullyChecked
                        ? { background: "#DCFCE7", color: "#166534" }
                        : { background: "#FEF3C7", color: "#92400E" }}
                    >
                      {verifiedCount}/{VERIFICATION_ITEMS.length}
                    </span>
                  </h3>
                  <div className="space-y-1.5 rounded-md border p-2.5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                    {VERIFICATION_ITEMS.map((it) => {
                      const on = !!verification[it.key]
                      return (
                        <label
                          key={it.key}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                            on ? "bg-emerald-50" : "hover:bg-muted/40"
                          } ${!canVerify ? "opacity-60 cursor-not-allowed" : ""}`}
                          title={canVerify ? it.help : "Requires rx.verify permission"}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!canVerify}
                            onChange={() => toggleCheck(it.key)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-medium ${on ? "text-emerald-800" : ""}`}>{it.label}</p>
                            <p className="text-[10px] text-muted-foreground">{it.help}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <button
                    onClick={openConsultation}
                    disabled={!canConsult}
                    className="mt-2 w-full h-8 rounded-md text-[11px] font-semibold border border-dashed inline-flex items-center justify-center gap-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "#3D0814", color: "#3D0814" }}
                    title={canConsult ? "Open a video consultation with this patient" : "Requires consult.handle permission"}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Clarify with patient (video)
                  </button>
                  {active.consultationId && (
                    <Link
                      href="/admin/consultations"
                      className="mt-1 block text-[11px] text-center text-muted-foreground hover:text-foreground underline"
                    >
                      Open source consultation {active.consultationId} →
                    </Link>
                  )}
                </div>

                {/* Pharmacist note */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" /> Pharmacist note
                  </h3>
                  <textarea
                    rows={3}
                    className="rxinput"
                    placeholder="Verification source, dispense instructions, follow-ups…"
                    value={active.pharmacistNote}
                    onChange={(e) => updateActive({ pharmacistNote: e.target.value })}
                  />
                </div>

                {/* Recommended drugs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5" /> Recommended drugs
                    </h3>
                    <button
                      onClick={addRecommendation}
                      className="text-xs font-semibold inline-flex items-center gap-1 hover:underline"
                      style={{ color: ACCENT }}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  {active.recommendedDrugs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md" style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                      No drugs recommended yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {active.recommendedDrugs.map((r, i) => (
                        <div key={i} className="rounded-md border p-2.5 space-y-1.5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                          <div className="flex items-center gap-2">
                            <input className="rxinput flex-1" placeholder="Drug name" value={r.name} onChange={(e) => updateRec(i, { name: e.target.value })} />
                            <input className="rxinput w-24" placeholder="Dosage" value={r.dosage} onChange={(e) => updateRec(i, { dosage: e.target.value })} />
                            <button onClick={() => removeRec(i)} className="w-8 h-8 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <input className="rxinput" placeholder="Instructions (e.g. 1 tab, 3x daily after meals)" value={r.instructions} onChange={(e) => updateRec(i, { instructions: e.target.value })} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer action bar */}
            <div className="border-t bg-white px-5 py-3 flex items-center justify-between gap-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-10 px-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!canVerify && (
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mr-2" title="Requires rx.verify permission">
                    <Lock className="h-3 w-3" /> Read-only
                  </span>
                )}
                <button
                  onClick={() => setStatus("rejected")}
                  disabled={!canVerify}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border inline-flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: "#FCA5A5", color: "#991B1B" }}
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => setStatus("dispensed")}
                  disabled={!canVerify}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border inline-flex items-center gap-1.5 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: "#93C5FD", color: "#1E40AF" }}
                >
                  <Send className="h-4 w-4" /> Mark dispensed
                </button>
                <button
                  onClick={() => setStatus("verified")}
                  disabled={!canVerify || !fullyChecked}
                  title={!fullyChecked ? "Complete every verification check first" : undefined}
                  className="h-10 px-5 rounded-lg text-sm font-bold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: WINE }}
                >
                  <ShieldCheck className="h-4 w-4" /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image zoom overlay */}
      {active && zoomImage && active.imageUrl && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomImage(false)}>
          <button onClick={() => setZoomImage(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <img src={active.imageUrl} alt="Prescription full" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Delete confirm */}
      {active && confirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">Delete this prescription?</h3>
                <p className="text-xs text-muted-foreground">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Patient <strong>{active.patientName || "—"}</strong> · {active.id}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmDelete(false)} className="h-9 px-4 rounded-md text-sm font-semibold border hover:bg-secondary" style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                Cancel
              </button>
              <button onClick={deleteActive} className="h-9 px-4 rounded-md text-sm font-bold text-white bg-red-600 hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.rxinput{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid rgba(0,0,0,0.1);background:#fff;font-size:0.8125rem;}
        textarea.rxinput{height:auto;padding:0.5rem 0.75rem;font-family:inherit;line-height:1.4;}
        .rxinput:focus{outline:none;border-color:${WINE};box-shadow:0 0 0 3px rgba(61,8,20,0.1);}`}</style>
    </AdminShell>
  )
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium block uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        {icon}{label}
      </label>
      {children}
    </div>
  )
}

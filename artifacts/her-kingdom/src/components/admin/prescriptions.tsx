"use client"

/**
 * AdminPrescriptions — pharmacist review surface, wired to the REAL api-nest
 * backend (`/api/v2/admin/prescriptions`), NOT a cmsStore mockup.
 *
 * This screen and the patient's `/account/prescriptions` page now read and
 * write the same records, so a status the pharmacist sets here reflects on the
 * patient's panel (and fires the patient's bell + SMS/WhatsApp).
 *
 * Key rules:
 *  - Patient-owned fields (name, phone, dob, email, the patient note, uploaded
 *    files) are READ-ONLY here — they come from the patient's upload.
 *  - Drug price is AUTO-FILLED from the product catalogue when a drug is picked
 *    and is NOT manually editable; only quantity is editable.
 *  - Every status action (Approve / Mark dispensed / Reject) persists to the
 *    backend and CLOSES the modal.
 *  - There is no "New entry" / "Delete": prescriptions originate from patients
 *    and are an auditable record — the backend exposes no create/delete.
 */

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { newId, cmsStore } from "@/lib/cms-store"
import { usePermission } from "@/lib/permissions"
import { notify } from "@/lib/notify"
import type { Consultation } from "./consultations"
import { DrugPicker, SuggestFromNotesButton } from "./drug-picker"
import {
  useAdminPrescriptions,
  apiAdminPrescriptions,
  adminRxFileUrl,
  DEFAULT_DRUG_PRICE,
  type AccountPrescription,
  type ApprovedDrug,
  type RxStatus,
} from "@/lib/api-nest"
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Phone,
  Mail,
  X,
  Stethoscope,
  Eye,
  Maximize2,
  Calendar,
  Pill,
  ShieldCheck,
  Send,
  Lock,
  Video,
  Sparkles,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"

/**
 * Legacy cmsStore prescription record shape. The admin panel now reads real
 * patient uploads from the api-nest backend (`useAdminPrescriptions`), so this
 * type only exists for the two remaining writers into the `cmsStore`
 * "prescriptions" key: the storefront upload page and the consultation
 * "push to pharmacist" action. Those writes are not read back by this panel.
 */
export type Prescription = {
  id: string
  patientName: string
  phone: string
  dob?: string
  imageUrl: string
  notes: string
  status: RxStatus
  pharmacistNote: string
  recommendedDrugs: { name: string; dosage: string; instructions: string }[]
  consultationId?: string
  createdAt: string
  updatedAt: string
}

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

const VERIFICATION_ITEMS: Array<{ key: keyof VerificationCheck; label: string; help: string }> = [
  { key: "imageClear",          label: "Prescription image is clear and legible",     help: "Reject if blurry or cropped." },
  { key: "signaturePresent",    label: "Prescriber signature / stamp is present",     help: "Required for controlled substances." },
  { key: "patientIdMatches",    label: "Patient name & phone match the order",        help: "Match against the order shipping details." },
  { key: "drugsLegible",        label: "Drug names, dosages and quantities are clear", help: "All recommended drugs must match the script." },
  { key: "refillStatusChecked", label: "Refill / repeat status checked",              help: "Confirm with prescriber if unclear." },
]

const STATUS_META: Record<RxStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:   { label: "Awaiting review",  color: "#92400E", bg: "#FEF3C7", icon: Clock },
  verified:  { label: "Verified",          color: "#166534", bg: "#DCFCE7", icon: ShieldCheck },
  dispensed: { label: "Dispensed",         color: "#1E40AF", bg: "#DBEAFE", icon: CheckCircle2 },
  rejected:  { label: "Rejected",          color: "#991B1B", bg: "#FEE2E2", icon: XCircle },
}

const isImageFile = (f: AccountPrescription["files"][number]) =>
  (f.type?.startsWith("image/") ?? false) || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(f.name || "")
const isPdfFile = (f: AccountPrescription["files"][number]) =>
  f.type === "application/pdf" || /\.pdf$/i.test(f.name || "")

const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`
const drugQty = (d: ApprovedDrug) => (typeof d.quantity === "number" && d.quantity >= 1 ? d.quantity : 1)
const drugUnit = (d: ApprovedDrug) => (typeof d.price === "number" && d.price >= 0 ? d.price : DEFAULT_DRUG_PRICE)

export function AdminPrescriptions() {
  const { data, isLoading, mutate } = useAdminPrescriptions()
  const items = useMemo<AccountPrescription[]>(() => data ?? [], [data])

  const [filter, setFilter] = useState<RxStatus | "all">("all")
  const [search, setSearch] = useState("")
  // `active` is an editable working copy of the selected record. Notes + drugs
  // are edited locally and only persisted on Save or a status action.
  const [active, setActive] = useState<AccountPrescription | null>(null)
  const [verification, setVerification] = useState<VerificationCheck>(EMPTY_VERIFICATION)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)
  const [imageBroken, setImageBroken] = useState(false)
  const [saving, setSaving] = useState(false)

  const canVerify = usePermission("rx.verify")
  const canConsult = usePermission("consult.handle")

  const openRow = (p: AccountPrescription) => {
    setActive({ ...p, approvedDrugs: p.approvedDrugs.map((d) => ({ ...d })) })
    setVerification(EMPTY_VERIFICATION)
    setImageBroken(false)
  }

  const closeModal = () => {
    setZoomUrl(null)
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
          (p.recipient || "").toLowerCase().includes(s) ||
          (p.patientName || "").toLowerCase().includes(s) ||
          (p.phone || "").toLowerCase().includes(s) ||
          (p.rxNumber || "").toLowerCase().includes(s) ||
          p.id.toLowerCase().includes(s)
        )
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [items, filter, search])

  const counts = useMemo(() => {
    const out: Record<RxStatus | "all", number> = {
      all: items.length, pending: 0, verified: 0, dispensed: 0, rejected: 0,
    }
    items.forEach((p) => { out[p.status]++ })
    return out
  }, [items])

  const updateActive = (patch: Partial<AccountPrescription>) =>
    setActive((a) => (a ? { ...a, ...patch } : a))

  const verifiedCount = Object.values(verification).filter(Boolean).length
  const fullyChecked = verifiedCount === VERIFICATION_ITEMS.length
  const toggleCheck = (key: keyof VerificationCheck) =>
    setVerification((v) => ({ ...v, [key]: !v[key] }))

  const updateDrug = (idx: number, patch: Partial<ApprovedDrug>) => {
    if (!active) return
    const drugs = active.approvedDrugs.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    updateActive({ approvedDrugs: drugs })
  }
  const removeDrug = (idx: number) => {
    if (!active) return
    updateActive({ approvedDrugs: active.approvedDrugs.filter((_, i) => i !== idx) })
  }
  const addDrug = (row: { name: string; dosage: string; instructions: string }, price: number | null) => {
    if (!active) return
    updateActive({
      approvedDrugs: [
        ...active.approvedDrugs,
        { name: row.name, dosage: row.dosage, instructions: row.instructions, price, quantity: 1 },
      ],
    })
  }

  /**
   * Persist the local edits (notes + approved drugs) plus any status change to
   * the backend, then revalidate. `close` ends the review (used by every status
   * action so the modal closes on approve / dispense / reject).
   */
  const persist = async (
    extra: { status?: RxStatus; rejectedReason?: string } = {},
    opts: { close?: boolean; successMessage?: string } = {},
  ) => {
    if (!active || saving) return
    setSaving(true)
    try {
      const updated = await apiAdminPrescriptions.patch(active.id, {
        pharmacistNote: active.pharmacistNote,
        doctorNote: active.doctorNote,
        approvedDrugs: active.approvedDrugs,
        ...extra,
      })
      await mutate()
      notify.saved(opts.successMessage ?? "Prescription updated")
      if (opts.close) closeModal()
      else setActive({ ...updated, approvedDrugs: updated.approvedDrugs.map((d) => ({ ...d })) })
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not save — please retry.")
    } finally {
      setSaving(false)
    }
  }

  const approve = () => {
    if (!canVerify) { notify.warning("You don't have permission to approve."); return }
    if (!fullyChecked) { notify.warning("Complete the verification checklist before approving."); return }
    if (active && active.approvedDrugs.length === 0) {
      notify.warning("Add at least one approved drug before verifying.")
      return
    }
    void persist({ status: "verified" }, { close: true, successMessage: "Prescription verified" })
  }
  const dispense = () => {
    if (!canVerify) { notify.warning("You don't have permission to change this status."); return }
    void persist({ status: "dispensed" }, { close: true, successMessage: "Marked dispensed" })
  }
  const reject = () => {
    if (!canVerify) { notify.warning("You don't have permission to reject."); return }
    const reason = (active?.rejectedReason || active?.pharmacistNote || "").trim()
    if (!reason) { notify.warning("Add a reason (pharmacist note or rejection reason) before rejecting."); return }
    void persist({ status: "rejected", rejectedReason: reason }, { close: true, successMessage: "Prescription rejected" })
  }

  // Cross-module: spin up a video consultation pre-filled with this Rx so the
  // pharmacist can clarify with the patient before dispensing. Consultations
  // still live in cmsStore; the prescription record itself is backend-owned.
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
      patientName: active.recipient || active.patientName || "Patient",
      phone: active.phone,
      doctorName: "Dr. on call",
      mode: "video",
      status: "queued",
      topic: `Clarify Rx-${active.rxNumber}`,
      startedAt: new Date().toISOString(),
      messages: [
        { id: newId("m"), from: "system", text: `Opened from prescription Rx-${active.rxNumber} for clarification.`, at: new Date().toISOString() },
      ],
      doctorNote: active.pharmacistNote,
      recommendedDrugs: active.approvedDrugs.map((r) => ({ ...r })),
    }
    cmsStore.set("consultations", [c, ...list])
    notify.saved(`Consultation ${c.id} created — opening`)
    window.location.assign("/admin/consultations")
  }

  const fmtAge = (dob?: string) => {
    if (!dob) return null
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return null
    const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000))
    return years > 0 ? `${years} yrs` : null
  }

  const primaryImageIndex = active ? active.files.findIndex(isImageFile) : -1
  const drugsTotal = active ? active.approvedDrugs.reduce((s, d) => s + drugUnit(d) * drugQty(d), 0) : 0

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
              Review prescriptions patients upload, verify or reject them, and capture pharmacist notes plus
              approved drugs. Status changes are reflected on the patient's account instantly.
            </p>
          </div>
          <button
            onClick={() => { void mutate() }}
            className="px-4 h-9 rounded-md text-sm font-semibold inline-flex items-center gap-2 border hover:bg-secondary"
            style={{ borderColor: "rgba(0,0,0,0.12)", color: WINE }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
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
                {k === "pending" ? "Awaiting" : k.charAt(0).toUpperCase() + k.slice(1)}
                <span className="opacity-60 ml-1">({counts[k]})</span>
              </button>
            )
          })}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search by name, phone, or Rx…"
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
                <th className="text-left px-4 py-2.5 font-medium">Drugs</th>
                <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-12">
                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Loading prescriptions…
                  </td>
                </tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-12">
                    {items.length === 0 ? "No prescriptions have been uploaded yet." : "No prescriptions match this filter."}
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const meta = STATUS_META[p.status]
                const Icon = meta.icon
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{p.recipient || p.patientName || "—"}</p>
                      <p className="text-xs text-muted-foreground font-mono">Rx-{p.rxNumber}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{p.phone || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {p.approvedDrugs.length > 0
                        ? `${p.approvedDrugs.length} drug${p.approvedDrugs.length === 1 ? "" : "s"}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(p.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openRow(p)}
                        className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-white hover:opacity-90 transition-opacity"
                        style={{ background: WINE }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Review
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
            {/* Header — wine gradient, shield watermark, status pill. */}
            <div
              className="relative px-5 sm:px-6 py-5 text-white overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 55%, #8A1226 100%)` }}
            >
              <ShieldCheck aria-hidden className="absolute -right-6 -bottom-10 h-44 w-44 text-white/[0.06] pointer-events-none" />
              <div aria-hidden className="absolute left-0 top-0 h-full w-1" style={{ background: ACCENT }} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/80 inline-flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-white/70" />
                      Trust layer · Prescription review
                    </p>
                    <h2 className="text-xl font-bold font-mono truncate mt-0.5 leading-tight">Rx-{active.rxNumber}</h2>
                    {(active.recipient || active.patientName) && (
                      <p className="text-[11px] text-white/75 mt-0.5 truncate">
                        {active.recipient || active.patientName}{active.phone ? ` · ${active.phone}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm"
                    style={{ background: STATUS_META[active.status].bg, color: STATUS_META[active.status].color }}
                  >
                    {(() => { const I = STATUS_META[active.status].icon; return <I className="h-3 w-3" /> })()}
                    {STATUS_META[active.status].label}
                  </span>
                  <button
                    onClick={closeModal}
                    className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
                    title="Close (Esc)"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Verification progress bar. */}
              <div className="relative mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(verifiedCount / VERIFICATION_ITEMS.length) * 100}%`,
                      background: fullyChecked ? "#34D399" : ACCENT,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-white/90 tracking-wide flex-shrink-0">
                  {verifiedCount}/{VERIFICATION_ITEMS.length} verified
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-0 flex-1 overflow-hidden">
              {/* Left — uploaded files + patient note */}
              <div className="bg-gray-50 border-r p-5 overflow-y-auto" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <div className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="relative" style={{ minHeight: 280 }}>
                    {primaryImageIndex >= 0 && !imageBroken ? (
                      <>
                        <img
                          key={active.files[primaryImageIndex].key || primaryImageIndex}
                          src={adminRxFileUrl(active.id, primaryImageIndex)}
                          alt="Prescription"
                          className="w-full max-h-[420px] object-contain bg-white"
                          onError={() => setImageBroken(true)}
                          onLoad={() => setImageBroken(false)}
                        />
                        <button
                          onClick={() => setZoomUrl(adminRxFileUrl(active.id, primaryImageIndex))}
                          className="absolute top-3 right-3 h-8 px-2.5 rounded-md bg-black/70 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/85"
                        >
                          <Maximize2 className="h-3.5 w-3.5" /> Zoom
                        </button>
                      </>
                    ) : (
                      <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2 px-6 text-center">
                        <FileText className="h-10 w-10 opacity-30" />
                        <p className="text-sm font-medium">
                          {imageBroken ? "Couldn't load the image" : active.files.length === 0 ? "No files uploaded" : "No image preview"}
                        </p>
                        <p className="text-xs">
                          {active.files.length === 0
                            ? "The patient didn't attach any files."
                            : "Open the attached file(s) below."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attached files list */}
                  {active.files.length > 0 && (
                    <div className="p-3 border-t space-y-1.5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Attached files ({active.files.length})
                      </p>
                      {active.files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate" style={{ color: WINE }}>{f.name || `File ${i + 1}`}</span>
                          {typeof f.size === "number" && (
                            <span className="ml-auto text-[10px] text-muted-foreground">{Math.round(f.size / 1024)} KB</span>
                          )}
                          <a
                            href={adminRxFileUrl(active.id, i)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold hover:bg-secondary ${typeof f.size === "number" ? "" : "ml-auto"}`}
                            style={{ borderColor: "rgba(0,0,0,0.12)", color: WINE }}
                          >
                            {isImageFile(f) ? <Eye className="h-3 w-3" /> : isPdfFile(f) ? <ExternalLink className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                            {isImageFile(f) ? "View" : "Open"}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patient note (read-only — patient-owned) */}
                <div className="mt-4 rounded-xl bg-white border p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Patient note
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-foreground/90">
                    {active.notes?.trim() ? active.notes : <span className="text-muted-foreground italic">No note from the patient.</span>}
                  </p>
                </div>

                {/* Payment (read-only) */}
                {active.payment && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">Payment received</span>
                      <span className="font-bold">{ksh(active.payment.amount)}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-800">
                      {active.payment.receipt ? `M-PESA ${active.payment.receipt} · ` : ""}
                      {new Date(active.payment.at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — patient summary + verification + notes + drugs */}
              <div className="overflow-y-auto p-5 space-y-5">
                {/* Patient summary (read-only) */}
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: ACCENT }}
                    >
                      {(active.recipient || active.patientName || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{active.recipient || active.patientName || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">Uploaded {new Date(active.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ReadField icon={<Phone className="h-3 w-3" />} label="Phone" value={active.phone || "—"} />
                    <ReadField
                      icon={<Calendar className="h-3 w-3" />}
                      label={`Date of birth${fmtAge(active.dob) ? ` · ${fmtAge(active.dob)}` : ""}`}
                      value={active.dob ? new Date(active.dob).toLocaleDateString() : "—"}
                    />
                    <ReadField icon={<Mail className="h-3 w-3" />} label="Email" value={active.email || "—"} />
                    <ReadField
                      icon={<FileText className="h-3 w-3" />}
                      label="Payment method"
                      value={active.paymentMethod === "insurance" ? "Insurance" : active.paymentMethod === "cash" ? "Cash" : "—"}
                    />
                  </div>
                </div>

                {/* Verification checklist (client-side gate before approval) */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5 w-full">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verification checklist
                    <span
                      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={fullyChecked ? { background: "#DCFCE7", color: "#166534" } : { background: "#FEF3C7", color: "#92400E" }}
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
                </div>

                {/* Doctor's note */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" /> Doctor's note
                  </h3>
                  <textarea
                    rows={2}
                    className="rxinput"
                    placeholder="Clinical note from the prescriber / doctor (shown to patient)…"
                    value={active.doctorNote}
                    onChange={(e) => updateActive({ doctorNote: e.target.value })}
                  />
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

                {/* Rejection reason */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> Reason for rejection
                  </h3>
                  <textarea
                    rows={2}
                    className="rxinput"
                    placeholder="Only used when rejecting — shown to the patient (e.g. image blurry, resubmit a clearer scan)."
                    value={active.rejectedReason || ""}
                    onChange={(e) => updateActive({ rejectedReason: e.target.value })}
                  />
                </div>

                {/* Approved drugs — price auto from catalogue (read-only) */}
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5" /> Approved drugs
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <SuggestFromNotesButton
                        clinicalContext={`${active.notes} ${active.pharmacistNote} ${active.doctorNote}`}
                        existingNames={active.approvedDrugs.map((r) => r.name)}
                        onAdd={(rows) => rows.forEach((r) => addDrug(r, null))}
                      />
                      <DrugPicker
                        clinicalContext={`${active.notes} ${active.pharmacistNote} ${active.doctorNote}`}
                        onPick={(row, source) =>
                          addDrug(row, typeof source?.price === "number" ? source.price : null)
                        }
                      />
                    </div>
                  </div>
                  {active.approvedDrugs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md" style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                      No drugs approved yet. <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Use Suggest or Add drug.</span>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {active.approvedDrugs.map((r, i) => {
                        const priced = typeof r.price === "number" && r.price >= 0
                        return (
                          <div key={i} className="rounded-md border p-2.5 space-y-1.5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                            <div className="flex items-center gap-2">
                              <input className="rxinput flex-1" placeholder="Drug name" value={r.name} onChange={(e) => updateDrug(i, { name: e.target.value })} />
                              <input className="rxinput w-24" placeholder="Dosage" value={r.dosage} onChange={(e) => updateDrug(i, { dosage: e.target.value })} />
                              <button onClick={() => removeDrug(i)} className="w-8 h-8 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0" title="Remove">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <input className="rxinput" placeholder="Instructions (e.g. 1 tab, 3x daily after meals)" value={r.instructions} onChange={(e) => updateDrug(i, { instructions: e.target.value })} />
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Price is auto-filled from the product catalogue and NOT editable. */}
                              <span className="inline-flex items-center gap-1.5 text-[11px]">
                                <span className="font-semibold text-muted-foreground">Price</span>
                                {priced ? (
                                  <span className="font-semibold" style={{ color: WINE }}>{ksh(r.price as number)}</span>
                                ) : (
                                  <span className="font-semibold text-amber-600">{ksh(DEFAULT_DRUG_PRICE)} est.</span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Lock className="h-2.5 w-2.5" /> from catalogue
                                </span>
                              </span>
                              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
                                <span className="font-semibold">Qty</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="rxinput w-20"
                                  placeholder="1"
                                  value={typeof r.quantity === "number" ? r.quantity : ""}
                                  onChange={(e) => {
                                    const v = e.target.value.trim()
                                    updateDrug(i, { quantity: v === "" ? 1 : Math.max(1, Math.round(Number(v))) })
                                  }}
                                />
                              </label>
                              <span className="text-[11px] font-bold" style={{ color: WINE }}>
                                {ksh(drugUnit(r) * drugQty(r))}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/30" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                        <span className="text-sm font-bold" style={{ color: WINE }}>{ksh(drugsTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer action bar */}
            <div className="border-t bg-white px-5 py-3 flex items-center justify-between gap-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <button
                onClick={() => void persist({}, { close: false, successMessage: "Changes saved" })}
                disabled={saving || !canVerify}
                className="h-10 px-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "rgba(0,0,0,0.15)", color: WINE }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Save changes
              </button>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!canVerify && (
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mr-2" title="Requires rx.verify permission">
                    <Lock className="h-3 w-3" /> Read-only
                  </span>
                )}
                <button
                  onClick={reject}
                  disabled={!canVerify || saving}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border inline-flex items-center gap-1.5 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: "#FCA5A5", color: "#991B1B" }}
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={dispense}
                  disabled={!canVerify || saving}
                  className="h-10 px-4 rounded-lg text-sm font-semibold border inline-flex items-center gap-1.5 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: "#93C5FD", color: "#1E40AF" }}
                >
                  <Send className="h-4 w-4" /> Mark dispensed
                </button>
                <button
                  onClick={approve}
                  disabled={!canVerify || !fullyChecked || saving}
                  title={!fullyChecked ? "Complete every verification check first" : undefined}
                  className="h-10 px-5 rounded-lg text-sm font-bold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: WINE }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image zoom overlay */}
      {zoomUrl && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomUrl(null)}>
          <button onClick={() => setZoomUrl(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <img src={zoomUrl} alt="Prescription full" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <style>{`.rxinput{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid rgba(0,0,0,0.1);background:#fff;font-size:0.8125rem;}
        textarea.rxinput{height:auto;padding:0.5rem 0.75rem;font-family:inherit;line-height:1.4;}
        .rxinput:focus{outline:none;border-color:${WINE};box-shadow:0 0 0 3px rgba(61,8,20,0.1);}`}</style>
    </AdminShell>
  )
}

function ReadField({ label, icon, value }: { label: string; icon?: React.ReactNode; value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium block uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
        {icon}{label}
      </label>
      <p className="text-sm font-semibold truncate" style={{ color: WINE }}>{value}</p>
    </div>
  )
}

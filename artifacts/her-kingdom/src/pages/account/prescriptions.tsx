import { useMemo, useState } from "react"
import { Link } from "wouter"
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Pill,
  FileText,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  ShieldCheck,
} from "lucide-react"
import { useCmsCollection } from "@/lib/cms-store"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import type { Prescription, PrescriptionStatus } from "@/components/admin/prescriptions"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const CREAM = "#FFFBF5"

// Mirrors the row written by /upload-prescription. We can't import it (it's
// declared inline in that page), so we keep a structural copy here.
type UserPrescriptionRow = {
  id: string
  rxNumber: string
  name: string
  date: string
  total: number
  recipient: string
  status: "Pending" | "Verified" | "Dispensed" | "Cancelled"
}

const STATUS_META: Record<PrescriptionStatus | "cancelled", {
  label: string
  color: string
  bg: string
  Icon: typeof Clock
  blurb: string
}> = {
  pending:   { label: "Awaiting review",  color: "#92400E", bg: "#FEF3C7", Icon: Clock,        blurb: "A pharmacist will review your prescription shortly." },
  verified:  { label: "Verified",         color: "#166534", bg: "#DCFCE7", Icon: ShieldCheck,  blurb: "Your prescription has been verified and approved medication is listed below." },
  dispensed: { label: "Dispensed",        color: "#1E40AF", bg: "#DBEAFE", Icon: CheckCircle2, blurb: "Your medication has been dispensed and is on its way." },
  rejected:  { label: "Action required",  color: "#991B1B", bg: "#FEE2E2", Icon: XCircle,      blurb: "We couldn't accept this prescription. Please see the pharmacist note." },
  cancelled: { label: "Cancelled",        color: "#374151", bg: "#F3F4F6", Icon: XCircle,      blurb: "This prescription was cancelled." },
}

function statusKey(row: UserPrescriptionRow, adminRx?: Prescription): PrescriptionStatus | "cancelled" {
  if (adminRx) return adminRx.status
  switch (row.status) {
    case "Verified":  return "verified"
    case "Dispensed": return "dispensed"
    case "Cancelled": return "cancelled"
    default:          return "pending"
  }
}

function StatusPill({ k }: { k: PrescriptionStatus | "cancelled" }) {
  const meta = STATUS_META[k]
  const Icon = meta.Icon
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ background: meta.bg, color: meta.color }}
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  )
}

export default function AccountPrescriptionsPage() {
  // The customer's local upload history (one record per upload, this browser).
  const { items: userItems } = useCmsCollection<UserPrescriptionRow>("user-prescriptions", [])
  // The pharmacy-side record — same `id` is written when the upload happens,
  // so we can join the two and surface the pharmacist note + approved drugs.
  const { items: adminItems } = useCmsCollection<Prescription>("prescriptions", [])
  const adminById = useMemo(() => {
    const m = new Map<string, Prescription>()
    adminItems.forEach((p) => m.set(p.id, p))
    return m
  }, [adminItems])

  const [openId, setOpenId] = useState<string | null>(null)
  const open = openId ? userItems.find((x) => x.id === openId) : null
  const openAdmin = open ? adminById.get(open.id) : undefined

  const counts = useMemo(() => {
    const c = { all: userItems.length, pending: 0, verified: 0, dispensed: 0, rejected: 0 }
    userItems.forEach((r) => {
      const k = statusKey(r, adminById.get(r.id))
      if (k === "pending") c.pending++
      else if (k === "verified") c.verified++
      else if (k === "dispensed") c.dispensed++
      else if (k === "rejected") c.rejected++
    })
    return c
  }, [userItems, adminById])

  return (
    <>
      <TopBar />
      <Navbar />
      <div className="min-h-screen" style={{ background: CREAM }}>
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to account
            </Link>
            <Link
              href="/upload-prescription"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #B91C1C 100%)` }}
            >
              Upload new prescription
            </Link>
          </div>

          <div
            className="rounded-2xl p-6 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
              <ClipboardList className="h-3.5 w-3.5" /> My prescriptions
            </div>
            <h1 className="mt-1 text-2xl font-bold">Prescription status</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Follow each prescription from upload to delivery. Once a pharmacist has
              reviewed it, you'll see the approved medication, dosage and any notes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard label="All" value={counts.all} tone="#3D0814" />
            <SummaryCard label="Awaiting review" value={counts.pending} tone="#92400E" />
            <SummaryCard label="Verified" value={counts.verified} tone="#166534" />
            <SummaryCard label="Dispensed" value={counts.dispensed} tone="#1E40AF" />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: WINE }}>Your uploads</h2>
            </div>
            {userItems.length === 0 ? (
              <div className="space-y-3 py-10 text-center">
                <div
                  className="mx-auto grid h-12 w-12 place-items-center rounded-full"
                  style={{ background: `${ACCENT}1a`, color: ACCENT }}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold" style={{ color: WINE }}>No prescriptions yet</p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  Upload a prescription and a verified pharmacist will review it. You'll see
                  approved medication and pharmacist notes here as soon as it's reviewed.
                </p>
                <Link
                  href="/upload-prescription"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #B91C1C 100%)` }}
                >
                  Upload prescription
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {userItems.map((row) => {
                  const adminRx = adminById.get(row.id)
                  const k = statusKey(row, adminRx)
                  const drugs = adminRx?.recommendedDrugs ?? []
                  return (
                    <li key={row.id}>
                      <button
                        onClick={() => setOpenId(row.id)}
                        className="flex w-full items-center justify-between gap-3 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: WINE }}>
                              Rx-{row.rxNumber}
                            </span>
                            <StatusPill k={k} />
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {row.name} · for {row.recipient} ·{" "}
                            {new Date(row.date).toLocaleDateString()}
                          </div>
                          {drugs.length > 0 && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: ACCENT }}>
                              <Pill className="h-3 w-3" /> {drugs.length} approved medication{drugs.length === 1 ? "" : "s"}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 text-white"
              style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
            >
              <div className="text-[11px] uppercase tracking-widest text-white/70">Prescription</div>
              <div className="mt-0.5 text-lg font-bold">Rx-{open.rxNumber}</div>
              <div className="mt-2"><StatusPill k={statusKey(open, openAdmin)} /></div>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="text-sm">
                <p className="text-muted-foreground">{STATUS_META[statusKey(open, openAdmin)].blurb}</p>
              </div>

              <DetailRow label="File" value={open.name} />
              <DetailRow label="For" value={open.recipient} />
              <DetailRow label="Uploaded" value={new Date(open.date).toLocaleString()} />

              <div>
                <div className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: WINE }}>
                  Approved medication
                </div>
                {!openAdmin || openAdmin.recommendedDrugs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    The pharmacist hasn't added approved medication yet. Once verified, it
                    will appear here with dosage and instructions.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {openAdmin.recommendedDrugs.map((d, i) => (
                      <li key={i} className="rounded-lg border border-border bg-white p-3">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4" style={{ color: ACCENT }} />
                          <span className="text-sm font-semibold" style={{ color: WINE }}>{d.name}</span>
                          {d.dosage && (
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {d.dosage}
                            </span>
                          )}
                        </div>
                        {d.instructions && (
                          <p className="mt-1 text-xs text-muted-foreground">{d.instructions}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {openAdmin?.pharmacistNote && (
                <div>
                  <div className="mb-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: WINE }}>
                    Pharmacist note
                  </div>
                  <div className="rounded-lg border-l-4 bg-amber-50/60 p-3 text-xs text-amber-900" style={{ borderColor: "#F59E0B" }}>
                    <div className="flex items-start gap-2">
                      <Stethoscope className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <p className="whitespace-pre-wrap">{openAdmin.pharmacistNote}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setOpenId(null)}
                  className="h-9 rounded-md border border-border px-4 text-xs font-semibold"
                  style={{ color: WINE }}
                >
                  Close
                </button>
                <Link
                  href="/account/chat"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #B91C1C 100%)` }}
                >
                  Message pharmacist
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: tone }}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium" style={{ color: WINE }}>{value}</div>
    </div>
  )
}

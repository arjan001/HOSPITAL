import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import {
  Clock,
  XCircle,
  Pill,
  FileText,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  ShieldCheck,
  Upload,
  Sparkles,
  RefreshCw,
  Loader2,
  MessageCircle,
  Calendar,
  User as UserIcon,
  CheckCheck,
} from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import {
  useMyPrescriptions,
  refreshMyPrescriptions,
  type AccountPrescription,
  type RxStatus,
} from "@/lib/api-nest"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"

const STATUS_META: Record<RxStatus, {
  label: string
  color: string
  bg: string
  ring: string
  Icon: typeof Clock
  blurb: string
}> = {
  pending:   { label: "Awaiting review",  color: "#92400E", bg: "#FEF3C7", ring: "#FCD34D", Icon: Clock,        blurb: "A pharmacist will review your prescription shortly. You'll get a notification the moment they're done." },
  verified:  { label: "Verified",         color: "#166534", bg: "#DCFCE7", ring: "#86EFAC", Icon: ShieldCheck,  blurb: "Your prescription has been verified. The approved medication and pharmacist instructions are below." },
  dispensed: { label: "Dispensed",        color: "#1E40AF", bg: "#DBEAFE", ring: "#93C5FD", Icon: CheckCheck,   blurb: "Your medication has been dispensed and is on its way. Track delivery from your orders." },
  rejected:  { label: "Action required",  color: "#991B1B", bg: "#FEE2E2", ring: "#FCA5A5", Icon: XCircle,      blurb: "We couldn't accept this prescription as-is. See the pharmacist's note for next steps." },
}

function StatusPill({ k, size = "sm" }: { k: RxStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[k]
  const Icon = meta.Icon
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${pad}`}
      style={{ background: meta.bg, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.ring}` }}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} /> {meta.label}
    </span>
  )
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = (now - d.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

export default function AccountPrescriptionsPage() {
  const { data, isLoading, mutate } = useMyPrescriptions()
  const items = useMemo<AccountPrescription[]>(() => data ?? [], [data])

  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<RxStatus | "all">("all")
  const open = openId ? items.find((x) => x.id === openId) ?? null : null

  const counts = useMemo(() => {
    const c = { all: items.length, pending: 0, verified: 0, dispensed: 0, rejected: 0 }
    items.forEach((r) => { c[r.status]++ })
    return c
  }, [items])

  const filtered = useMemo(
    () => filter === "all" ? items : items.filter((r) => r.status === filter),
    [items, filter],
  )

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => { void mutate() }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
                style={{ color: WINE }}
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
              <Link
                href="/upload-prescription"
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
              >
                <Upload className="h-3.5 w-3.5" /> Upload prescription
              </Link>
            </div>
          </div>

          {/* Hero card with brand language and the trust seal motif. */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
          >
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 65%)` }}
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                  <ShieldCheck className="h-3.5 w-3.5" /> Trust seal · Verified care
                </div>
                <h1 className="mt-1 text-2xl font-bold">My prescriptions</h1>
                <p className="mt-1 max-w-xl text-sm text-white/80">
                  Follow each prescription from upload through verification to delivery. Approved
                  medication, dosage and pharmacist instructions appear here as soon as your
                  pharmacist signs off.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <KpiChip label="Total" value={counts.all} tone="rgba(255,255,255,0.95)" />
                <KpiChip label="Verified" value={counts.verified + counts.dispensed} tone="#86EFAC" />
              </div>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill label={`All (${counts.all})`}                active={filter === "all"}       onClick={() => setFilter("all")} />
            <FilterPill label={`Awaiting (${counts.pending})`}       active={filter === "pending"}   onClick={() => setFilter("pending")} />
            <FilterPill label={`Verified (${counts.verified})`}      active={filter === "verified"}  onClick={() => setFilter("verified")} />
            <FilterPill label={`Dispensed (${counts.dispensed})`}    active={filter === "dispensed"} onClick={() => setFilter("dispensed")} />
            {counts.rejected > 0 && (
              <FilterPill label={`Action required (${counts.rejected})`} active={filter === "rejected"} onClick={() => setFilter("rejected")} />
            )}
          </div>

          {/* List */}
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            {isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your prescriptions…
              </div>
            ) : filtered.length === 0 ? (
              <div className="space-y-3 px-6 py-14 text-center">
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-full"
                  style={{ background: `${ACCENT}1a`, color: ACCENT }}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold" style={{ color: WINE }}>
                  {items.length === 0 ? "No prescriptions yet" : "No prescriptions in this filter"}
                </p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  {items.length === 0
                    ? "Upload a prescription and a verified pharmacist will review it. You'll see approved medication and notes here as soon as it's reviewed."
                    : "Try a different filter or upload a new prescription."}
                </p>
                <Link
                  href="/upload-prescription"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-5 text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                >
                  <Upload className="h-4 w-4" /> Upload prescription
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((rx) => (
                  <li key={rx.id}>
                    <button
                      onClick={() => setOpenId(rx.id)}
                      type="button"
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-muted/40"
                    >
                      <div
                        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl"
                        style={{ background: STATUS_META[rx.status].bg, color: STATUS_META[rx.status].color }}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: WINE }}>
                            Rx-{rx.rxNumber}
                          </span>
                          <StatusPill k={rx.status} />
                          {rx.approvedDrugs.length > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: `${ACCENT}1a`, color: ACCENT }}
                            >
                              <Pill className="h-2.5 w-2.5" />
                              {rx.approvedDrugs.length} medication{rx.approvedDrugs.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          For {rx.recipient} · {rx.files[0]?.name || "Prescription"}
                          {rx.files.length > 1 ? ` +${rx.files.length - 1}` : ""}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Updated {fmtTime(rx.updatedAt)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {open && <RxDetailModal rx={open} onClose={() => setOpenId(null)} />}

      <Footer />
    </>
  )
}

function KpiChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 text-center backdrop-blur" style={{ minWidth: 72 }}>
      <div className="text-[10px] uppercase tracking-widest text-white/70">{label}</div>
      <div className="text-lg font-bold" style={{ color: tone }}>{value}</div>
    </div>
  )
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider transition"
      style={
        active
          ? { background: WINE, color: "#fff" }
          : { background: "#fff", color: WINE, boxShadow: "inset 0 0 0 1px #E5E7EB" }
      }
    >
      {label}
    </button>
  )
}

function RxDetailModal({ rx, onClose }: { rx: AccountPrescription; onClose: () => void }) {
  const meta = STATUS_META[rx.status]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-detail-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative overflow-hidden px-6 py-5 text-white"
          style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
        >
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 60%)` }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/70">Prescription</div>
              <div id="rx-detail-title" className="mt-0.5 text-xl font-bold">Rx-{rx.rxNumber}</div>
              <div className="mt-2"><StatusPill k={rx.status} size="md" /></div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Status blurb */}
          <div
            className="flex items-start gap-3 rounded-xl border p-3 text-sm"
            style={{ background: meta.bg, borderColor: meta.ring, color: meta.color }}
          >
            <meta.Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs font-medium leading-relaxed">{meta.blurb}</p>
          </div>

          {/* Approved medication */}
          <section>
            <SectionHeading icon={Pill} title="Approved medication" />
            {rx.approvedDrugs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
                <Sparkles className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  The pharmacist hasn't added approved medication yet. Once verified, it
                  will appear here with dosage and instructions.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {rx.approvedDrugs.map((d, i) => (
                  <li key={i} className="rounded-xl border border-border bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
                        style={{ background: `${ACCENT}1a`, color: ACCENT }}
                      >
                        <Pill className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-bold" style={{ color: WINE }}>{d.name}</span>
                          {d.dosage && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: "#F3F4F6", color: "#4B5563" }}
                            >
                              {d.dosage}
                            </span>
                          )}
                        </div>
                        {d.instructions && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d.instructions}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pharmacist note */}
          {rx.pharmacistNote && (
            <section>
              <SectionHeading icon={Stethoscope} title="Pharmacist note" />
              <div
                className="rounded-xl border-l-4 bg-amber-50/70 p-3 text-xs text-amber-900"
                style={{ borderColor: "#F59E0B" }}
              >
                <p className="whitespace-pre-wrap">{rx.pharmacistNote}</p>
              </div>
            </section>
          )}

          {/* Rejected reason */}
          {rx.status === "rejected" && rx.rejectedReason && (
            <section>
              <SectionHeading icon={XCircle} title="Why this was declined" />
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                <p className="whitespace-pre-wrap">{rx.rejectedReason}</p>
              </div>
            </section>
          )}

          {/* Details */}
          <section>
            <SectionHeading icon={UserIcon} title="Details" />
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailRow label="For" value={rx.recipient} />
              <DetailRow label="Date of birth" value={rx.dob ? new Date(rx.dob).toLocaleDateString() : "—"} />
              <DetailRow label="Payment" value={rx.paymentMethod === "insurance" ? "Insurance" : rx.paymentMethod === "cash" ? "Cash" : "—"} />
              <DetailRow label="Uploaded" value={new Date(rx.createdAt).toLocaleString()} />
            </dl>
          </section>

          {/* Files */}
          {rx.files.length > 0 && (
            <section>
              <SectionHeading icon={FileText} title="Attached files" />
              <ul className="space-y-1.5">
                {rx.files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate" style={{ color: WINE }}>{f.name}</span>
                    {typeof f.size === "number" && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {Math.round(f.size / 1024)} KB
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Timeline */}
          <section>
            <SectionHeading icon={Calendar} title="Timeline" />
            <ol className="relative space-y-3 border-l border-border pl-4">
              {rx.timeline.map((ev, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full"
                    style={{ background: i === rx.timeline.length - 1 ? ACCENT : "#D1D5DB" }}
                  />
                  <p className="text-xs font-medium" style={{ color: WINE }}>{ev.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtTime(ev.at)} {ev.by ? `· ${ev.by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <button
            onClick={() => { void refreshMyPrescriptions() }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
            style={{ color: WINE }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <div className="flex items-center gap-2">
            <Link
              href="/account/chat"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
              style={{ color: WINE }}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Message pharmacist
            </Link>
            <button
              onClick={onClose}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ icon: Icon, title }: { icon: typeof Pill; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" style={{ color: ACCENT }} />
      <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: WINE }}>
        {title}
      </h3>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs font-semibold" style={{ color: WINE }}>{value}</dd>
    </div>
  )
}


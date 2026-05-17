import { useMemo, useState } from "react"
import { Link } from "wouter"
import {
  Pill,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Upload,
  Loader2,
  RefreshCw,
  Eye,
  ChevronRight,
} from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import {
  useMyPrescriptions,
  type AccountPrescription,
  type RxStatus,
} from "@/lib/api-nest"
import { RxDetailModal, StatusPill, STATUS_META, fmtTime } from "@/components/account/rx-detail-modal"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"

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
      <Seo
        title="My Prescriptions — Shaniid RX"
        description="View, refill and track the status of your prescriptions on Shaniid RX."
        canonicalPath="/account/prescriptions"
        noindex
      />
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


"use client"

/**
 * Logistics Partner Portal — /portal/logistics
 *
 * Backed by the real partner API via @/lib/partners-client (HttpOnly cookie
 * auth, credentials: "include"). No portal codes, no localStorage auth.
 *
 * Tabs: Overview · Jobs · Proof of Delivery · Earnings · Profile
 * Also mounted at /portal/logistics/accept for invite acceptance.
 */

import { useState } from "react"
import { Link, useLocation } from "wouter"
import {
  partnerAcceptInvite, partnerSignout,
  usePartnerMe, refreshPartnerMe,
  useLogisticsJobs, useLogisticsEarnings, updateDeliveryStatus, submitDeliveryPod,
  type PartnerAccount, type DeliveryJob,
} from "@/lib/partners-client"
import { PartnerPortalAuthScreen } from "@/components/portal/partner-portal-auth"
import { PartnerTeamPanel } from "@/components/portal/partner-team-panel"
import {
  Truck, LogOut, Package, MapPin, BarChart3, User,
  AlertTriangle, CheckCircle2, ArrowRight, Eye, EyeOff,
  Clock, Navigation, Snowflake, Phone, Mail, Hash,
  TrendingUp, Wallet, CheckSquare, ExternalLink,
  ChevronLeft, ChevronRight, Menu, X, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const WINE     = "#3D0814"
const WINE_2   = "#6B0F1A"
const ORANGE   = "#F97316"
const RED       = "#B91C1C"
const GREEN    = "#15803D"
const BLUE     = "#1D4ED8"
const S_TEXT   = "rgba(255,255,255,0.88)"
const S_MUTED  = "rgba(255,255,255,0.45)"
const S_BORDER = "rgba(255,255,255,0.10)"

const PARTNER_TYPE = "logistics" as const

function ksh(n: number): string {
  return `KSh ${Math.round(n).toLocaleString()}`
}

/* ─── Status helpers ─────────────────────────────────────────── */

type StatusMeta = { label: string; color: string; bg: string }

const STATUS_CONFIG: Record<string, StatusMeta> = {
  assigned:   { label: "Assigned",   color: BLUE,     bg: "#EFF6FF" },
  picked_up:  { label: "Picked Up",  color: ORANGE,   bg: "#FFF7ED" },
  in_transit: { label: "In Transit", color: "#7C3AED",bg: "#F5F3FF" },
  delivered:  { label: "Delivered",  color: GREEN,    bg: "#F0FDF4" },
  failed:     { label: "Failed",     color: RED,      bg: "#FEF2F2" },
  cancelled:  { label: "Cancelled",  color: "#6B7280",bg: "#F3F4F6" },
}

function statusMeta(status: string): StatusMeta {
  return STATUS_CONFIG[status] ?? { label: status, color: "#6B7280", bg: "#F3F4F6" }
}

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  assigned:   { next: "picked_up",  label: "Mark Picked Up" },
  picked_up:  { next: "in_transit", label: "Mark In Transit" },
  in_transit: { next: "delivered",  label: "Mark Delivered" },
}

const ACTIVE_STATUSES = ["assigned", "picked_up", "in_transit"]

/* ─── Brand panel (shared by auth + accept) ──────────────────── */

function BrandPanel({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="hidden lg:flex w-1/2 flex-col justify-between p-12"
      style={{ background: `linear-gradient(160deg, ${WINE} 0%, ${WINE_2} 100%)` }}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <img src="/logo-rx.png" alt="Shaniid RX" className="h-12 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
          <span className="text-white font-bold text-xl tracking-tight">Shaniid RX</span>
        </div>
        <p className="text-white/60 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="space-y-8">
        {[
          { icon: Navigation, title: "Live delivery jobs", desc: "Every job assigned to you in real time — pickup, drop-off, recipient and cold-chain requirements." },
          { icon: CheckSquare, title: "Proof of delivery", desc: "Capture a proof-of-delivery link and notes to confirm each completed drop." },
          { icon: Wallet, title: "Transparent earnings", desc: "A clear rate per delivery, running totals and a record of every paid job." },
          { icon: Truck, title: "Built for fleets", desc: "Move jobs through their lifecycle with a single tap — assigned to delivered." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{title}</p>
              <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-xs">"Real Medicine, Right to Your Door." — Shaniid RX Logistics</p>
    </div>
  )
}

/* ─── Auth screen (Clerk only) ───────────────────────────────── */

function AuthScreen() {
  return (
    <PartnerPortalAuthScreen
      type="logistics"
      redirectPath="/portal/logistics"
      title="Logistics portal"
      subtitle="Sign in with your Clerk account. New partners are approved by Shaniid RX before portal access."
      brandPanel={<BrandPanel subtitle="Logistics Partner Portal" />}
    />
  )
}

/* ─── Accept invite (set password) ───────────────────────────── */

function AcceptInviteScreen({ token }: { token: string }) {
  const [, setLocation] = useLocation()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return }
    if (password !== confirm) { setErr("Passwords do not match."); return }
    setBusy(true)
    try {
      await partnerAcceptInvite(token, password)
      await refreshPartnerMe()
      setLocation(`/portal/${PARTNER_TYPE}`)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "We couldn't accept this invite. The link may have expired.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#faf9f8" }}>
      <BrandPanel subtitle="Accept your invitation" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">Set your password</h1>
          <p className="text-gray-500 text-sm mb-8">Create a password to activate your logistics partner account.</p>

          {err && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />{err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">New password</Label>
              <div className="relative mt-1">
                <Input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Confirm password</Label>
              <Input type={showPw ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" className="mt-1 h-11" />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 text-white font-semibold gap-2" style={{ background: ORANGE }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Activate account <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── Shared small UI ────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color = WINE }: {
  icon: typeof Package; label: string; value: string | number; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: WINE }}>{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const m = statusMeta(status)
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center" style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <Loader2 className="h-7 w-7 mx-auto mb-3 animate-spin opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-8 text-center">
      <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: RED }} />
      <p className="font-medium text-gray-700">Something went wrong</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{message}</p>
      <Button onClick={onRetry} className="mt-4 h-10 px-5 text-white font-semibold" style={{ background: WINE }}>Try again</Button>
    </div>
  )
}

function EmptyBlock({ icon: Icon, title, desc }: { icon: typeof Package; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p className="font-medium text-gray-600">{title}</p>
      <p className="text-sm mt-1 max-w-xs mx-auto">{desc}</p>
    </div>
  )
}

/* ─── Job card ───────────────────────────────────────────────── */

function JobCard({ job, onAdvance, busy }: {
  job: DeliveryJob; onAdvance: (id: string, status: string) => void; busy: boolean
}) {
  const flow = STATUS_FLOW[job.status]
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm text-gray-800">{job.jobRef}</span>
            <StatusBadge status={job.status} />
            {job.coldChain && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ color: BLUE, background: "#EFF6FF" }}>
                <Snowflake className="h-3 w-3" /> Cold chain
              </span>
            )}
          </div>
          {job.recipientName && <p className="text-sm font-medium text-gray-700 mt-1">{job.recipientName}</p>}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-1.5">
          <Navigation className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Pickup</p>
            <p className="text-xs text-gray-600">{job.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Delivery</p>
            <p className="text-xs text-gray-600">{job.deliveryAddress}</p>
          </div>
        </div>
      </div>

      {job.recipientPhone && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <Phone className="h-3.5 w-3.5" />{job.recipientPhone}
        </div>
      )}

      {job.proofOfDeliveryUrl && (
        <a href={job.proofOfDeliveryUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium mb-3" style={{ color: WINE }}>
          <ExternalLink className="h-3.5 w-3.5" /> View proof of delivery
        </a>
      )}

      {flow && (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => onAdvance(job.id, flow.next)}
            className="flex-1 text-xs font-semibold py-2 rounded-lg text-white transition-opacity disabled:opacity-60"
            style={{ background: ORANGE }}
          >
            {busy ? "Updating…" : flow.label}
          </button>
          <button
            disabled={busy}
            onClick={() => onAdvance(job.id, "failed")}
            className="px-3 text-xs font-semibold py-2 rounded-lg border transition-colors disabled:opacity-60"
            style={{ borderColor: "#FCA5A5", color: RED }}
          >
            Report Failed
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── POD card ───────────────────────────────────────────────── */

function PodCard({ job, onSubmit, busy }: {
  job: DeliveryJob; onSubmit: (id: string, url: string, notes: string) => Promise<void>; busy: boolean
}) {
  const [url, setUrl] = useState(job.proofOfDeliveryUrl ?? "")
  const [notes, setNotes] = useState(job.notes ?? "")

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-sm text-gray-800">{job.jobRef}</span>
          <StatusBadge status={job.status} />
        </div>
        <span className="text-xs text-gray-400">{job.recipientName ?? "—"}</span>
      </div>
      <div className="flex items-start gap-1.5 mb-3">
        <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600">{job.deliveryAddress}</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-gray-700">Proof of delivery URL</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…/photo-or-signature" className="mt-1 h-10 text-sm" />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Delivered to recipient, signed at gate…" className="mt-1 min-h-[64px] text-sm" />
        </div>
        <Button
          disabled={busy || !url.trim()}
          onClick={() => onSubmit(job.id, url.trim(), notes.trim())}
          className="w-full h-10 text-white font-semibold gap-2 text-sm"
          style={{ background: GREEN }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckSquare className="h-4 w-4" /> Submit & mark delivered</>}
        </Button>
      </div>
    </div>
  )
}

/* ─── Dashboard ──────────────────────────────────────────────── */

type LogTab = "overview" | "jobs" | "pod" | "earnings" | "profile"

const LOG_TABS: { id: LogTab; label: string; icon: typeof Truck }[] = [
  { id: "overview", label: "Overview",          icon: BarChart3   },
  { id: "jobs",     label: "Jobs",              icon: Package      },
  { id: "pod",      label: "Proof of Delivery", icon: CheckSquare  },
  { id: "earnings", label: "Earnings",          icon: Wallet       },
  { id: "profile",  label: "Profile",           icon: User         },
]

function LogisticsDashboard({ partner, memberRole, onLogout }: {
  partner: PartnerAccount; memberRole?: string; onLogout: () => void
}) {
  const [tab, setTab] = useState<LogTab>("overview")
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("shaniidrx.logistics.sidebar") === "collapsed" } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState("")

  const jobsQ = useLogisticsJobs()
  const earningsQ = useLogisticsEarnings()

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem("shaniidrx.logistics.sidebar", next ? "collapsed" : "expanded") } catch {}
      return next
    })
  }

  const advanceJob = async (id: string, status: string) => {
    setActionErr("")
    setActionBusyId(id)
    try {
      await updateDeliveryStatus(id, status)
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Could not update the job status.")
    } finally {
      setActionBusyId(null)
    }
  }

  const submitPod = async (id: string, url: string, notes: string) => {
    setActionErr("")
    setActionBusyId(id)
    try {
      await submitDeliveryPod(id, url, notes || undefined)
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Could not submit proof of delivery.")
    } finally {
      setActionBusyId(null)
    }
  }

  const jobs = jobsQ.data ?? []
  const activeJobs = jobs.filter(j => ACTIVE_STATUSES.includes(j.status))
  const completedJobs = jobs.filter(j => !ACTIVE_STATUSES.includes(j.status))
  const podJobs = jobs.filter(j => ACTIVE_STATUSES.includes(j.status))
  const podDone = jobs.filter(j => j.proofOfDeliveryUrl)

  const totals = earningsQ.data?.totals

  const statusBadge = partner.status === "active"
    ? { label: "Active", cls: "text-green-300 bg-green-900/40" }
    : partner.status === "suspended"
      ? { label: "Suspended", cls: "text-red-300 bg-red-900/40" }
      : { label: "Invited", cls: "text-amber-300 bg-amber-900/40" }

  const sidebarHead = (
    <>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.15)" }}>
        <Truck className="h-5 w-5" style={{ color: ORANGE }} />
      </div>
      <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{partner.displayName}</p>
      <p className="text-xs mt-0.5 truncate" style={{ color: S_MUTED }}>{partner.email}</p>
      <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
    </>
  )

  return (
    <div className="min-h-screen flex" style={{ background: "#f8f7f5" }}>

      {/* ── Mobile overlay sidebar ─────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col overflow-y-auto shadow-2xl" style={{ background: WINE }}>
            <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                  <span className="font-bold text-sm" style={{ color: S_TEXT }}>Shaniid RX</span>
                </div>
                <p className="text-xs" style={{ color: S_MUTED }}>Logistics Portal</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: S_MUTED }}><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>{sidebarHead}</div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {LOG_TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setTab(id); setMobileOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative hover:bg-white/10"
                  style={tab === id ? { background: "rgba(255,255,255,0.12)", color: ORANGE } : { color: S_TEXT }}>
                  {tab === id && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r" style={{ background: ORANGE }} />}
                  <Icon className="h-4 w-4 flex-shrink-0" />{label}
                </button>
              ))}
            </nav>
            <div className="px-5 py-4" style={{ borderTop: `1px solid ${S_BORDER}` }}>
              <button onClick={onLogout} className="flex items-center gap-2 text-sm transition-colors hover:text-orange-400" style={{ color: S_MUTED }}>
                <LogOut className="h-4 w-4" />Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop collapsible sidebar ────────────────────────── */}
      <aside
        className="hidden md:flex flex-shrink-0 flex-col transition-all duration-200"
        style={{ width: collapsed ? 64 : 256, background: WINE, borderRight: `1px solid ${S_BORDER}` }}
      >
        <div className="flex items-center overflow-hidden" style={{ borderBottom: `1px solid ${S_BORDER}`, minHeight: 64 }}>
          {collapsed ? (
            <div className="flex-1 flex items-center justify-center py-5">
              <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
          ) : (
            <div className="flex-1 px-5 py-4">
              <div className="flex items-center gap-2 mb-0.5">
                <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                <span className="font-bold text-sm" style={{ color: S_TEXT }}>Shaniid RX</span>
              </div>
              <p className="text-xs" style={{ color: S_MUTED }}>Logistics Portal</p>
            </div>
          )}
        </div>

        {collapsed ? (
          <div className="flex items-center justify-center py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Truck className="h-4 w-4" style={{ color: ORANGE }} />
            </div>
          </div>
        ) : (
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>{sidebarHead}</div>
        )}

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {LOG_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} title={collapsed ? label : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all relative hover:bg-white/10 ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
              style={tab === id ? { background: "rgba(255,255,255,0.12)", color: ORANGE } : { color: S_TEXT }}>
              {tab === id && !collapsed && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r" style={{ background: ORANGE }} />}
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${S_BORDER}` }}>
          <div className={`py-3 flex items-center ${collapsed ? "flex-col gap-2 px-2" : "px-5 justify-between"}`}>
            <button onClick={onLogout} title="Sign out" className="flex items-center gap-2 text-sm transition-colors hover:text-orange-400" style={{ color: S_MUTED }}>
              <LogOut className="h-4 w-4" />{!collapsed && <span>Sign out</span>}
            </button>
            <button onClick={toggleSidebar} title={collapsed ? "Expand" : "Collapse"}
              className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/10 transition-colors" style={{ color: S_MUTED }}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto min-w-0">
        <div className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 -ml-1">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-lg text-gray-800">{LOG_TABS.find(t => t.id === tab)?.label}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{partner.displayName}</p>
            </div>
          </div>
          {partner.status === "invited" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-amber-700 bg-amber-50">
              <Clock className="h-3 w-3" /><span className="hidden sm:inline">Pending activation</span>
            </span>
          )}
        </div>

        <div className="p-4 md:p-8">
          {actionErr && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />{actionErr}
            </div>
          )}

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              {earningsQ.isLoading ? (
                <LoadingBlock label="Loading your overview…" />
              ) : earningsQ.error ? (
                <ErrorBlock message={earningsQ.error instanceof Error ? earningsQ.error.message : "Failed to load overview."} onRetry={() => earningsQ.mutate()} />
              ) : totals ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Package}     label="Delivered"   value={totals.deliveredCount}    color={GREEN}  />
                    <StatCard icon={Navigation}  label="In Progress" value={totals.inProgressCount}   color={ORANGE} />
                    <StatCard icon={Wallet}      label="Total Earned" value={ksh(totals.totalEarned)} color={WINE}   />
                    <StatCard icon={TrendingUp}  label="Projected"   value={ksh(totals.projected)}    color={BLUE}   />
                  </div>

                  {partner.status === "active" && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-800">Your account is active</p>
                        <p className="text-sm text-green-700 mt-0.5">
                          You're receiving delivery jobs. Rate: {ksh(earningsQ.data?.ratePerDelivery ?? 0)} per delivery.
                        </p>
                      </div>
                    </div>
                  )}
                  {partner.status === "invited" && (
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                      <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800">Activation pending</p>
                        <p className="text-sm text-amber-700 mt-0.5">Our team is finalising your onboarding. You'll begin receiving jobs once activated.</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 text-sm mb-4">Quick actions</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { icon: Package,    label: "View jobs",         action: () => setTab("jobs") },
                        { icon: CheckSquare,label: "Proof of delivery", action: () => setTab("pod") },
                        { icon: Wallet,     label: "Earnings",          action: () => setTab("earnings") },
                      ] as const).map(({ icon: Icon, label, action }) => (
                        <button key={label} onClick={action}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all">
                          <Icon className="h-6 w-6" style={{ color: WINE }} />
                          <span className="text-xs font-medium text-gray-700">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <EmptyBlock icon={BarChart3} title="No data yet" desc="Your delivery stats will appear here once you start receiving jobs." />
              )}
            </div>
          )}

          {/* JOBS */}
          {tab === "jobs" && (
            <div className="space-y-5">
              {jobsQ.isLoading ? (
                <LoadingBlock label="Loading your jobs…" />
              ) : jobsQ.error ? (
                <ErrorBlock message={jobsQ.error instanceof Error ? jobsQ.error.message : "Failed to load jobs."} onRetry={() => jobsQ.mutate()} />
              ) : jobs.length === 0 ? (
                <EmptyBlock icon={Package} title="No jobs yet" desc="Delivery jobs will appear here once orders are routed to you." />
              ) : (
                <>
                  {activeJobs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Active jobs ({activeJobs.length})</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {activeJobs.map(job => (
                          <JobCard key={job.id} job={job} onAdvance={advanceJob} busy={actionBusyId === job.id} />
                        ))}
                      </div>
                    </div>
                  )}

                  {completedJobs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">History ({completedJobs.length})</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {completedJobs.map(job => (
                          <JobCard key={job.id} job={job} onAdvance={advanceJob} busy={actionBusyId === job.id} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PROOF OF DELIVERY */}
          {tab === "pod" && (
            <div className="space-y-6">
              {jobsQ.isLoading ? (
                <LoadingBlock label="Loading deliveries…" />
              ) : jobsQ.error ? (
                <ErrorBlock message={jobsQ.error instanceof Error ? jobsQ.error.message : "Failed to load deliveries."} onRetry={() => jobsQ.mutate()} />
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Awaiting proof ({podJobs.length})</h3>
                    {podJobs.length === 0 ? (
                      <EmptyBlock icon={CheckSquare} title="Nothing awaiting proof" desc="Jobs in progress will appear here so you can submit proof of delivery." />
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {podJobs.map(job => (
                          <PodCard key={job.id} job={job} onSubmit={submitPod} busy={actionBusyId === job.id} />
                        ))}
                      </div>
                    )}
                  </div>

                  {podDone.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Submitted ({podDone.length})</h3>
                      <div className="space-y-2">
                        {podDone.map(job => (
                          <div key={job.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${GREEN}15` }}>
                              <CheckSquare className="h-4 w-4" style={{ color: GREEN }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs font-bold text-gray-700">{job.jobRef}</p>
                              <p className="text-xs text-gray-500 truncate">{job.deliveryAddress}</p>
                            </div>
                            {job.proofOfDeliveryUrl && (
                              <a href={job.proofOfDeliveryUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium flex-shrink-0" style={{ color: WINE }}>
                                <ExternalLink className="h-3.5 w-3.5" /> Proof
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* EARNINGS */}
          {tab === "earnings" && (
            <div className="space-y-5">
              {earningsQ.isLoading ? (
                <LoadingBlock label="Loading earnings…" />
              ) : earningsQ.error ? (
                <ErrorBlock message={earningsQ.error instanceof Error ? earningsQ.error.message : "Failed to load earnings."} onRetry={() => earningsQ.mutate()} />
              ) : earningsQ.data ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Wallet}     label="Rate / Delivery" value={ksh(earningsQ.data.ratePerDelivery)} color={WINE}  />
                    <StatCard icon={Package}    label="Delivered"       value={earningsQ.data.totals.deliveredCount} color={GREEN} />
                    <StatCard icon={TrendingUp} label="Total Earned"    value={ksh(earningsQ.data.totals.totalEarned)} color={ORANGE} />
                    <StatCard icon={Navigation} label="Projected"       value={ksh(earningsQ.data.totals.projected)} color={BLUE} />
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 text-sm mb-4">Recent deliveries</h3>
                    {earningsQ.data.recent.length === 0 ? (
                      <p className="text-sm text-gray-400 py-6 text-center">No completed deliveries yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-400 border-b">
                              <th className="py-2 pr-3 font-semibold">Job</th>
                              <th className="py-2 pr-3 font-semibold">Delivered</th>
                              <th className="py-2 pr-3 font-semibold">Address</th>
                              <th className="py-2 pl-3 font-semibold text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {earningsQ.data.recent.map((r, i) => (
                              <tr key={`${r.jobRef}-${i}`} className="border-b border-gray-50 last:border-0">
                                <td className="py-2.5 pr-3 font-mono font-semibold text-gray-700">{r.jobRef}</td>
                                <td className="py-2.5 pr-3 text-gray-500">
                                  {r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                </td>
                                <td className="py-2.5 pr-3 text-gray-600 max-w-[220px] truncate">{r.deliveryAddress}</td>
                                <td className="py-2.5 pl-3 font-bold text-right" style={{ color: GREEN }}>{ksh(r.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <EmptyBlock icon={Wallet} title="No earnings yet" desc="Your earnings will appear here once you complete deliveries." />
              )}
            </div>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: `${WINE}10` }}>
                    <Truck className="h-7 w-7" style={{ color: WINE }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">{partner.displayName}</h2>
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">{partner.partnerType} partner · {partner.status}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {([
                    { icon: Mail,  label: "Email",        value: partner.email },
                    { icon: Hash,  label: "Account ID",   value: partner.partnerId },
                    { icon: User,  label: "Display name", value: partner.displayName },
                    { icon: Clock, label: "Last login",   value: partner.lastLoginAt ? new Date(partner.lastLoginAt).toLocaleString("en-GB") : "—" },
                    { icon: Clock, label: "Member since",  value: new Date(partner.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
                  ]).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-700 break-words">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <PartnerTeamPanel type={PARTNER_TYPE} memberRole={memberRole} />

              <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Sign out</p>
                  <p className="text-xs text-gray-500 mt-0.5">End your session on this device.</p>
                </div>
                <Button onClick={onLogout} className="h-10 px-5 text-white font-semibold gap-2" style={{ background: RED }}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main export ────────────────────────────────────────────── */

export default function LogisticsPortal() {
  const [location] = useLocation()
  const isAcceptRoute = location.endsWith("/accept")
  const inviteToken = isAcceptRoute
    ? new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("token")
    : null

  const me = usePartnerMe(!(isAcceptRoute && inviteToken))

  const handleLogout = async () => {
    try { await partnerSignout(PARTNER_TYPE) } catch { /* ignore */ }
    await refreshPartnerMe()
  }

  if (isAcceptRoute && inviteToken) {
    return <AcceptInviteScreen token={inviteToken} />
  }

  if (me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f8" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: WINE }} />
      </div>
    )
  }

  if (me.error || !me.data?.ok || !me.data.partner) {
    return <AuthScreen />
  }

  return (
    <LogisticsDashboard
      partner={me.data.partner}
      memberRole={me.data.memberRole}
      onLogout={handleLogout}
    />
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import { useEffectivePermissions } from "@/lib/permissions"
import { useDoctors } from "@/lib/doctors-store"
import { useAdminNotifications } from "@/lib/notifications-client"
import { useCmsDoc } from "@/lib/cms-store"
import type { Consultation } from "@/components/admin/consultations"
import {
  Stethoscope, ClipboardList, Users, CalendarClock, NotebookPen, ShieldCheck,
  ArrowRight, Bell, Activity, CheckCircle2, Hourglass,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"

/**
 * Doctor Panel — landing surface for the doctor role.
 *
 * Gating is intentionally permissive at this stage: anyone with the
 * `consult.handle` or `rx.recommend` permission lands here. Patients who
 * stumble in get a friendly "this isn't for you" view.
 */
export default function DoctorPanelPage() {
  const eff = useEffectivePermissions()
  const allowed = eff.permissions.has("*")
    || eff.permissions.has("consult.handle")
    || eff.permissions.has("rx.recommend")
    || eff.isSuperAdmin

  const { items: doctors } = useDoctors()
  const me = useMemo(
    () => doctors.find((d) => d.email && eff.user?.email && d.email.toLowerCase() === eff.user.email.toLowerCase())
      ?? doctors[0]
      ?? null,
    [doctors, eff.user?.email],
  )

  const { items: notifs, unread, markAllRead } = useAdminNotifications("doctor")

  const [consults] = useCmsDoc<Consultation[]>("consultations", [])
  const consultStats = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    let queued = 0, live = 0, completedToday = 0
    for (const c of consults) {
      if (c.status === "queued") queued++
      else if (c.status === "live") live++
      else if (c.status === "completed" && new Date(c.endedAt || c.startedAt) >= startOfDay) completedToday++
    }
    return { queued, live, completedToday }
  }, [consults])

  if (!allowed) {
    return (
      <>
        <Seo title="Doctor Panel — Shaniid RX" description="Restricted clinician area." noindex />
        <TopBar /><Navbar />
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: CREAM }}>
          <div className="rounded-2xl bg-white border border-border max-w-md p-8 text-center shadow-sm">
            <ShieldCheck className="h-8 w-8 mx-auto mb-3" style={{ color: WINE }} />
            <h1 className="text-xl font-bold" style={{ color: WINE }}>Restricted area</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The doctor panel is reserved for verified Shaniid RX clinicians.
              If you're staff and you've just been onboarded, ask an admin to attach the Doctor role to your account.
            </p>
            <Link href="/account" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: ACCENT_RED }}>
              Back to account <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Seo title="Doctor Panel — Shaniid RX" description="Shaniid RX clinician workspace: patients, sticky notes, and prescriptions." canonicalPath="/doctor" noindex />
      <TopBar /><Navbar />
      <div className="min-h-screen" style={{ background: CREAM }}>
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
          {/* Hero */}
          <div
            className="rounded-2xl p-6 shadow-lg relative overflow-hidden text-white"
            style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
              <Stethoscope className="h-3.5 w-3.5" /> Doctor Panel
            </div>
            <h1 className="mt-1 text-2xl font-bold">
              {me ? `Welcome back, ${me.name}` : "Welcome, Doctor"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              Review consultations, sign off prescriptions and keep your patients' clinical notes up to date.
              Pay-before-call is enforced — patients who book you have already authorised payment.
            </p>
            {me && (
              <p className="mt-3 text-[11px] uppercase tracking-widest text-white/70">
                {me.specialization} · License {me.licenseNumber || "—"} · KSh {me.consultationRateKES.toLocaleString()} / session
              </p>
            )}
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Hourglass} label="In queue" value={consultStats.queued} />
            <StatTile icon={Activity} label="Live now" value={consultStats.live} live={consultStats.live > 0} />
            <StatTile icon={CheckCircle2} label="Done today" value={consultStats.completedToday} />
          </div>

          {/* Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <PanelCard icon={ClipboardList} title="Prescriptions inbox" desc="Verify uploaded prescriptions and write dosing notes." href="/admin/prescriptions" />
            <PanelCard icon={CalendarClock} title="My consultations" desc="Upcoming and past consultations with notes." href="/admin/consultations" />
            <PanelCard icon={Users} title="My patients" desc="Search patients and open sticky-note threads." href="/admin/customers" />
            <PanelCard icon={NotebookPen} title="Sticky notes" desc="Shared clinical memory per patient." href="/admin/customers" />
            <PanelCard icon={Bell} title={`Notifications${unread ? ` · ${unread} unread` : ""}`} desc="Pings about consultations and prescription approvals." onAction={() => { void markAllRead() }} actionLabel="Mark read" />
          </div>

          {/* Recent notifications */}
          <section className="rounded-2xl border border-border bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: WINE }}>Recent activity</h2>
              {unread > 0 && (
                <button onClick={() => { void markAllRead() }} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                  Mark all read
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-muted-foreground">No activity yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {notifs.slice(0, 8).map((n) => (
                  <li key={n.id} className="px-5 py-3">
                    <p className="text-sm font-semibold" style={{ color: WINE }}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{n.module} · {new Date(n.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}

function StatTile({ icon: Icon, label, value, live }: {
  icon: typeof Stethoscope; label: string; value: number; live?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center text-white flex-shrink-0 relative"
        style={{ background: live ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` : WINE }}
      >
        <Icon className="h-5 w-5" />
        {live && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none" style={{ color: WINE }}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  )
}

function PanelCard({ icon: Icon, title, desc, href, onAction, actionLabel }: {
  icon: typeof Stethoscope; title: string; desc: string
  href?: string; onAction?: () => void; actionLabel?: string
}) {
  const inner = (
    <article className="rounded-xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: WINE }}>{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onAction() }}
          className="mt-4 text-[11px] font-semibold inline-flex items-center gap-1"
          style={{ color: ACCENT_RED }}
        >
          {actionLabel} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </article>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

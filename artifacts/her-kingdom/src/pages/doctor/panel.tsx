"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import { useEffectivePermissions } from "@/lib/permissions"
import { useDoctors } from "@/lib/doctors-store"
import { useDoctorMe, useDoctorPatients, doctorSignout } from "@/lib/doctors-client"
import { useAdminNotifications } from "@/lib/notifications-client"
import {
  Stethoscope, ClipboardList, Users, CalendarClock, NotebookPen, ShieldCheck,
  ArrowRight, Bell, Activity, CheckCircle2, Hourglass, MessageSquare,
  DollarSign, User, Calendar, Home, ChevronDown, ChevronUp, Mail,
  Phone, Clock, Star, FilePlus, LogOut, Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"
const PEACH_BG = "#FFF6EE"
const PEACH_BORDER = "#F2DCC8"

type DoctorTab = "home" | "schedule" | "appointments" | "consultations" | "patients" | "prescriptions" | "messages" | "earnings" | "profile"

const TABS: { id: DoctorTab; label: string; icon: typeof Stethoscope; perm?: string }[] = [
  { id: "home",          label: "Home",          icon: Home },
  { id: "schedule",      label: "Schedule",      icon: Calendar,       perm: "consult.handle" },
  { id: "appointments",  label: "Appointments",  icon: CalendarClock,  perm: "consult.handle" },
  { id: "consultations", label: "Consultations", icon: Stethoscope,    perm: "consult.handle" },
  { id: "patients",      label: "Patients",      icon: Users,          perm: "consult.handle" },
  { id: "prescriptions", label: "Prescriptions", icon: ClipboardList,  perm: "rx.recommend" },
  { id: "messages",      label: "Messages",      icon: MessageSquare,  perm: "chat.respond" },
  { id: "earnings",      label: "Earnings",      icon: DollarSign },
  { id: "profile",       label: "Profile",       icon: User },
]

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const AVAILABILITY_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"]

export default function DoctorPanelPage() {
  const eff = useEffectivePermissions()
  const allowed = eff.permissions.has("*")
    || eff.permissions.has("consult.handle")
    || eff.permissions.has("rx.recommend")
    || eff.isSuperAdmin

  const { data: portalMe } = useDoctorMe(true)
  const { items: doctors } = useDoctors()
  const me = useMemo(() => {
    if (portalMe?.doctor) return portalMe.doctor
    return doctors.find((d) => d.email && eff.user?.email && d.email.toLowerCase() === eff.user.email.toLowerCase()) ?? null
  }, [portalMe, doctors, eff.user?.email])

  const { items: notifs, unread, markAllRead } = useAdminNotifications("doctor")

  const { data: myPatients } = useDoctorPatients(!!portalMe?.doctor)

  const consultStats = useMemo(() => ({
    queued: unread,
    live: 0,
    completedToday: myPatients?.length ?? 0,
  }), [unread, myPatients])

  const myConsults = useMemo(() =>
    consults.filter((c) => !me || c.doctorName === me.name),
    [consults, me],
  )
  const upcoming = useMemo(() => myConsults.filter((c) => c.status === "queued" || c.status === "live"), [myConsults])
  const completed = useMemo(() => myConsults.filter((c) => c.status === "completed"), [myConsults])

  const [activeTab, setActiveTab] = useState<DoctorTab>("home")
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [availableSlots, setAvailableSlots] = useState<string[]>(["09:00", "10:00", "11:00", "14:00", "15:00"])

  // Compute earnings from completed consultations
  const totalEarnings = useMemo(() => {
    return completed.reduce((sum) => sum + (me?.consultationRateKES ?? 2500), 0)
  }, [completed, me])

  const visibleTabs = TABS.filter((t) =>
    !t.perm || eff.permissions.has("*") || eff.permissions.has(t.perm) || eff.isSuperAdmin,
  )

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
      <Seo title="Doctor Panel — Shaniid RX" description="Shaniid RX clinician workspace." canonicalPath="/doctor" noindex />
      <TopBar />

      <div className="min-h-screen" style={{ background: CREAM }}>
        {/* Top header */}
        <div
          className="sticky top-0 z-30 border-b"
          style={{ background: WINE, borderColor: "#5A0F1E" }}
        >
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center gap-4 h-14">
              <div className="flex items-center gap-2 text-white/80">
                <Stethoscope className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">Doctor Panel</span>
              </div>
              <div className="flex-1" />
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => { setActiveTab("home"); void markAllRead() }}
                  className="relative text-white/80 hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-0.5"
                    style={{ background: ACCENT_RED }}
                  >
                    {unread}
                  </span>
                </button>
              )}
              <div className="text-xs text-white/80 hidden sm:block">
                {me?.name ?? eff.user?.email ?? "Doctor"}
              </div>
              {portalMe && (
                <button
                  type="button"
                  onClick={() => { void doctorSignout().then(() => window.location.reload()) }}
                  className="text-xs font-semibold text-white/70 hover:text-white flex items-center gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex overflow-x-auto gap-1 pb-0" style={{ scrollbarWidth: "none" }}>
              {visibleTabs.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                      active
                        ? "text-white border-white"
                        : "text-white/60 border-transparent hover:text-white/80",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.id === "messages" && unread > 0 && (
                      <span className="ml-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                        {unread}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="mx-auto max-w-6xl px-4 py-6">

          {/* ── HOME ─────────────────────────────────────────────────────── */}
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Hero welcome */}
              <div
                className="rounded-2xl p-6 shadow-lg relative overflow-hidden text-white"
                style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
              >
                <h1 className="text-2xl font-bold">
                  {me ? `Welcome back, Dr. ${me.name}` : "Welcome, Doctor"}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-white/80">
                  Review consultations, sign off prescriptions and keep your patients' records up to date.
                </p>
                {me && (
                  <p className="mt-3 text-[11px] uppercase tracking-widest text-white/70">
                    {me.specialization} · License {me.licenseNumber || "—"} · KES {(me.consultationRateKES ?? 2500).toLocaleString()} / session
                  </p>
                )}
                {!portalMe && (
                  <Link
                    href="/doctor/login"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 underline hover:text-white/90"
                  >
                    Sign in with your portal password for full access
                  </Link>
                )}
              </div>

              {/* Live stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatTile icon={Hourglass} label="In queue" value={consultStats.queued} />
                <StatTile icon={Activity} label="Live now" value={consultStats.live} live={consultStats.live > 0} />
                <StatTile icon={CheckCircle2} label="Done today" value={consultStats.completedToday} />
              </div>

              {/* Quick actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <PanelCard icon={ClipboardList} title="Prescriptions inbox" desc="Verify uploaded prescriptions and write dosing notes." href="/admin/prescriptions" />
                <PanelCard icon={CalendarClock} title="My consultations" desc="Upcoming and past consultations with notes." onAction={() => setActiveTab("consultations")} actionLabel="View all" />
                <PanelCard icon={Users} title="My patients" desc="Consultations assigned to you." href="/doctor/patients" />
                <PanelCard icon={NotebookPen} title="Sticky notes" desc="Shared clinical notes per patient." href="/admin/customers" />
                <PanelCard icon={Bell} title={`Notifications${unread ? ` · ${unread} unread` : ""}`} desc="Pings about consultations and prescription approvals." onAction={() => { void markAllRead() }} actionLabel="Mark all read" />
                <PanelCard icon={DollarSign} title="Earnings" desc={`KES ${totalEarnings.toLocaleString()} from ${completed.length} sessions.`} onAction={() => setActiveTab("earnings")} actionLabel="View details" />
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
                  <div className="px-5 py-10 text-center text-xs text-muted-foreground">No recent activity.</div>
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
          )}

          {/* ── SCHEDULE ──────────────────────────────────────────────────── */}
          {activeTab === "schedule" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black" style={{ color: WINE }}>My Schedule</h2>
                  <p className="text-sm text-muted-foreground">Set your weekly availability for consultations.</p>
                </div>
                <Button size="sm" onClick={() => {}}>Save availability</Button>
              </div>

              <div
                className="rounded-2xl border p-5 bg-white"
                style={{ borderColor: PEACH_BORDER }}
              >
                <h3 className="text-sm font-bold mb-3" style={{ color: WINE }}>Available days</h3>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAvailableDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                      style={availableDays.includes(i)
                        ? { background: WINE, color: "#fff", borderColor: WINE }
                        : { color: WINE, borderColor: PEACH_BORDER }
                      }
                    >
                      {d}
                    </button>
                  ))}
                </div>

                <h3 className="text-sm font-bold mb-3 mt-5" style={{ color: WINE }}>Available time slots</h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setAvailableSlots((prev) => prev.includes(slot) ? prev.filter((x) => x !== slot) : [...prev, slot])}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1"
                      style={availableSlots.includes(slot)
                        ? { background: WINE, color: "#fff", borderColor: WINE }
                        : { color: WINE, borderColor: PEACH_BORDER }
                      }
                    >
                      <Clock className="h-3 w-3" />{slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly calendar view */}
              <div
                className="rounded-2xl border p-5 bg-white"
                style={{ borderColor: PEACH_BORDER }}
              >
                <h3 className="text-sm font-bold mb-3" style={{ color: WINE }}>This week's slots</h3>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_LABELS.map((d, i) => (
                    <div key={d}>
                      <p
                        className="text-[10px] font-bold text-center mb-1 uppercase"
                        style={{ color: availableDays.includes(i) ? WINE : "#9CA3AF" }}
                      >
                        {d}
                      </p>
                      <div className="space-y-1">
                        {availableDays.includes(i)
                          ? availableSlots.slice(0, 4).map((s) => (
                            <div
                              key={s}
                              className="rounded text-[9px] text-center py-0.5 font-medium"
                              style={{ background: PEACH_BG, color: WINE }}
                            >
                              {s}
                            </div>
                          ))
                          : (
                            <div className="text-[9px] text-center text-muted-foreground py-1">Off</div>
                          )
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── APPOINTMENTS ──────────────────────────────────────────────── */}
          {activeTab === "appointments" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black" style={{ color: WINE }}>Appointments</h2>
                <p className="text-sm text-muted-foreground">Upcoming and scheduled appointments.</p>
              </div>
              {upcoming.length === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center"
                  style={{ borderColor: PEACH_BORDER, background: "#FFFFFF" }}
                >
                  <CalendarClock className="h-10 w-10 mx-auto opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                  <p className="text-xs text-muted-foreground mt-1">New consultations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((c) => (
                    <ConsultRow key={c.id} consult={c} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CONSULTATIONS ─────────────────────────────────────────────── */}
          {activeTab === "consultations" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black" style={{ color: WINE }}>Consultations</h2>
                <p className="text-sm text-muted-foreground">{myConsults.length} total · {upcoming.length} active</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatTile icon={Hourglass} label="Queued" value={upcoming.filter((c) => c.status === "queued").length} />
                <StatTile icon={Activity} label="Live" value={upcoming.filter((c) => c.status === "live").length} live={consultStats.live > 0} />
                <StatTile icon={CheckCircle2} label="Completed" value={completed.length} />
              </div>

              {myConsults.length === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center"
                  style={{ borderColor: PEACH_BORDER, background: "#FFFFFF" }}
                >
                  <Stethoscope className="h-10 w-10 mx-auto opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">No consultations yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myConsults.slice(0, 20).map((c) => (
                    <ConsultRow key={c.id} consult={c} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PATIENTS ──────────────────────────────────────────────────── */}
          {activeTab === "patients" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black" style={{ color: WINE }}>Patients</h2>
                  <p className="text-sm text-muted-foreground">Patients who have had consultations with you.</p>
                </div>
                <Link href="/doctor/patients">
                  <Button size="sm">Full patient list</Button>
                </Link>
              </div>

              {(() => {
                const seen = new Set<string>()
                const patients: Consultation[] = []
                for (const c of myConsults) {
                  const key = c.phone || c.patientName || c.id
                  if (!seen.has(key)) { seen.add(key); patients.push(c) }
                }
                return patients.length === 0 ? (
                  <div className="rounded-2xl border p-10 text-center" style={{ borderColor: PEACH_BORDER }}>
                    <Users className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    <p className="text-sm text-muted-foreground">No patients yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {patients.slice(0, 15).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-white"
                        style={{ borderColor: PEACH_BORDER }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ background: WINE }}
                        >
                          {(c.patientName || "P")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: WINE }}>{c.patientName || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">{c.phone || ""}</p>
                        </div>
                        <Link href={`/admin/patients/${c.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── PRESCRIPTIONS ─────────────────────────────────────────────── */}
          {activeTab === "prescriptions" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black" style={{ color: WINE }}>Prescriptions Inbox</h2>
                  <p className="text-sm text-muted-foreground">Review and verify prescription submissions.</p>
                </div>
                <Link href="/admin/prescriptions">
                  <Button size="sm">
                    <FilePlus className="h-4 w-4 mr-1.5" /> Open full inbox
                  </Button>
                </Link>
              </div>
              <div
                className="rounded-2xl border p-10 text-center"
                style={{ borderColor: PEACH_BORDER, background: "#FFFFFF" }}
              >
                <ClipboardList className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm text-muted-foreground">Open the full prescription inbox to review submissions.</p>
                <Link href="/admin/prescriptions">
                  <Button className="mt-4">Go to Prescriptions</Button>
                </Link>
              </div>
            </div>
          )}

          {/* ── MESSAGES ──────────────────────────────────────────────────── */}
          {activeTab === "messages" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black" style={{ color: WINE }}>Messages</h2>
                  <p className="text-sm text-muted-foreground">Patient chat and consultation messages.</p>
                </div>
                <Link href="/admin/chat">
                  <Button size="sm">
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Open chat
                  </Button>
                </Link>
              </div>

              {notifs.filter((n) => n.module === "chat").length === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center"
                  style={{ borderColor: PEACH_BORDER, background: "#FFFFFF" }}
                >
                  <MessageSquare className="h-10 w-10 mx-auto opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">No new messages.</p>
                  <Link href="/admin/chat">
                    <Button className="mt-4">Open full chat</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifs.filter((n) => n.module === "chat").slice(0, 10).map((n) => (
                    <Link key={n.id} href="/admin/chat">
                      <div
                        className="flex items-start gap-3 p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow cursor-pointer"
                        style={{ borderColor: PEACH_BORDER }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                          style={{ background: WINE }}
                        >
                          P
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: WINE }}>{n.title}</p>
                          {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EARNINGS ──────────────────────────────────────────────────── */}
          {activeTab === "earnings" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black" style={{ color: WINE }}>Earnings</h2>
                <p className="text-sm text-muted-foreground">Your consultation earnings summary.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border p-5 text-center bg-white" style={{ borderColor: PEACH_BORDER }}>
                  <p className="text-3xl font-black" style={{ color: WINE }}>KES {totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total earnings</p>
                </div>
                <div className="rounded-2xl border p-5 text-center bg-white" style={{ borderColor: PEACH_BORDER }}>
                  <p className="text-3xl font-black" style={{ color: WINE }}>{completed.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sessions completed</p>
                </div>
                <div className="rounded-2xl border p-5 text-center bg-white" style={{ borderColor: PEACH_BORDER }}>
                  <p className="text-3xl font-black" style={{ color: WINE }}>
                    KES {(me?.consultationRateKES ?? 2500).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Rate per session</p>
                </div>
              </div>

              {completed.length > 0 ? (
                <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: PEACH_BORDER }}>
                  <div className="px-5 py-4 border-b" style={{ borderColor: PEACH_BORDER }}>
                    <h3 className="text-sm font-bold" style={{ color: WINE }}>Recent paid sessions</h3>
                  </div>
                  <div className="divide-y" style={{ borderColor: PEACH_BORDER }}>
                    {completed.slice(0, 10).map((c) => (
                      <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: WINE }}>{c.patientName || "Patient"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(c.startedAt).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm font-bold" style={{ color: "#059669" }}>
                          + KES {(me?.consultationRateKES ?? 2500).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-10 text-center" style={{ borderColor: PEACH_BORDER }}>
                  <DollarSign className="h-10 w-10 mx-auto opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">No completed sessions yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILE ───────────────────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-5 max-w-xl">
              <div>
                <h2 className="text-lg font-black" style={{ color: WINE }}>My Profile</h2>
                <p className="text-sm text-muted-foreground">Your clinician profile as shown to patients.</p>
              </div>

              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: PEACH_BORDER }}>
                {me ? (
                  <div className="space-y-4">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-4">
                      {me.avatarUrl ? (
                        <img src={me.avatarUrl} alt={me.name} className="w-16 h-16 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black"
                          style={{ background: WINE }}
                        >
                          {me.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-black" style={{ color: WINE }}>
                          {me.title ? `${me.title} ` : ""}{me.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{me.specialization}</p>
                        <p className="text-xs text-muted-foreground">License: {me.licenseNumber || "—"}</p>
                      </div>
                    </div>

                    <hr style={{ borderColor: PEACH_BORDER }} />

                    {/* Details */}
                    <div className="space-y-3 text-sm">
                      {me.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span>{me.email}</span>
                        </div>
                      )}
                      {me.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{me.phone}</span>
                        </div>
                      )}
                      {me.bio && (
                        <p className="text-sm leading-relaxed text-gray-600">{me.bio}</p>
                      )}
                      {me.languages && me.languages.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Languages:</span>
                          <div className="flex flex-wrap gap-1">
                            {me.languages.map((l) => (
                              <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{l}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-semibold" style={{ color: WINE }}>
                          KES {(me.consultationRateKES ?? 2500).toLocaleString()} / consultation
                        </span>
                      </div>
                    </div>

                    <hr style={{ borderColor: PEACH_BORDER }} />

                    <div className="flex gap-2">
                      <Link href="/admin/doctors">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1.5" /> Edit in admin
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-10 w-10 mx-auto opacity-20 mb-3" />
                    <p className="text-sm text-muted-foreground">No profile found.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ask an admin to create your doctor profile.
                    </p>
                    <Link href="/admin/doctors">
                      <Button className="mt-4" size="sm">Go to Doctors admin</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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

function ConsultRow({ consult: c }: { consult: Consultation }) {
  const STATUS_COLORS: Record<string, string> = {
    queued: "#F97316",
    live: "#10B981",
    completed: "#6B7280",
    cancelled: "#EF4444",
  }
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border bg-white"
      style={{ borderColor: PEACH_BORDER }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: WINE }}
      >
        {(c.patientName || "P")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: WINE }}>{c.patientName || "Anonymous"}</p>
        <p className="text-xs text-muted-foreground">
          {c.topic ? c.topic.slice(0, 60) : "General consultation"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {new Date(c.startedAt).toLocaleString()}
        </p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0 capitalize"
        style={{ background: STATUS_COLORS[c.status] ?? "#6B7280" }}
      >
        {c.status}
      </span>
    </div>
  )
}

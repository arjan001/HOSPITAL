"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "wouter"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { DailyCall } from "@/components/video/daily-call"
import { usePermission } from "@/lib/permissions"
import { notify } from "@/lib/notify"
import type { Prescription } from "./prescriptions"
import { DrugPicker, SuggestFromNotesButton } from "./drug-picker"
import {
  MessageSquare,
  Phone,
  Video,
  Send,
  Plus,
  Stethoscope,
  Pill,
  X,
  Search,
  Clock,
  CheckCircle2,
  PhoneCall,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  History,
  Lock,
} from "lucide-react"

export type ConsultStatus = "queued" | "live" | "completed" | "missed"
export type ConsultMode = "chat" | "voice" | "video"

export type ConsultMessage = {
  id: string
  from: "patient" | "doctor" | "system"
  text: string
  at: string
}

export type Consultation = {
  id: string
  patientName: string
  phone: string
  doctorName: string
  mode: ConsultMode
  status: ConsultStatus
  topic: string
  startedAt: string
  endedAt?: string
  durationSec?: number
  messages: ConsultMessage[]
  doctorNote: string
  recommendedDrugs: { name: string; dosage: string; instructions: string }[]
}

const SEED: Consultation[] = [
  {
    id: "c-101",
    patientName: "Aisha M.",
    phone: "+254 712 000 111",
    doctorName: "Dr. Wanjiku",
    mode: "chat",
    status: "queued",
    topic: "Persistent migraine for 3 days",
    startedAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    messages: [
      { id: "m1", from: "patient", text: "Hi, I've had a really bad migraine since Monday. Painkillers aren't working.", at: new Date(Date.now() - 1000 * 60 * 6).toISOString() },
      { id: "m2", from: "system", text: "Patient is in the queue. Click 'Start' to join.", at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    ],
    doctorNote: "",
    recommendedDrugs: [],
  },
  {
    id: "c-100",
    patientName: "Brian K.",
    phone: "+254 720 555 234",
    doctorName: "Dr. Wanjiku",
    mode: "video",
    status: "completed",
    topic: "Follow-up on antibiotic course",
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    endedAt: new Date(Date.now() - 1000 * 60 * 60 * 27.7).toISOString(),
    durationSec: 18 * 60,
    messages: [
      { id: "m1", from: "patient", text: "Hi doctor, day 4 of antibiotics, feeling much better.", at: "" },
      { id: "m2", from: "doctor", text: "Glad to hear. Complete the full 7-day course as prescribed.", at: "" },
    ],
    doctorNote:
      "Patient responding well to amoxicillin. Recommended completion of course and OTC pain relief if cough persists.",
    recommendedDrugs: [
      { name: "Amoxicillin 500mg", dosage: "1 capsule", instructions: "3x daily, complete course" },
      { name: "Bromhexine syrup", dosage: "10ml", instructions: "3x daily for 5 days" },
    ],
  },
]

const STATUS_META: Record<ConsultStatus, { label: string; color: string; bg: string }> = {
  queued: { label: "Queued", color: "#92400E", bg: "#FEF3C7" },
  live: { label: "Live", color: "#166534", bg: "#DCFCE7" },
  completed: { label: "Completed", color: "#1E40AF", bg: "#DBEAFE" },
  missed: { label: "Missed", color: "#991B1B", bg: "#FEE2E2" },
}

const MODE_ICON = { chat: MessageSquare, voice: Phone, video: Video }

type LiveSession = {
  name: string
  url: string
  patientName: string
  doctorName: string
  topic: string
  mode: "video" | "voice"
  startedAt: number
  doctorJoined: boolean
}

function liveAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}:${String(rs).padStart(2, "0")}`
}

export function AdminConsultations() {
  const [items, setItems] = useCmsDoc<Consultation[]>("consultations", SEED)
  const [filter, setFilter] = useState<ConsultStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id || null)
  const [videoOpen, setVideoOpen] = useState(false)
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [liveWatch, setLiveWatch] = useState<LiveSession | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  // Poll the active-sessions registry every 5s while the page is mounted.
  // Cheap (in-memory map on the api-server) and lets the doctor watch any
  // live consultation in real time.
  useEffect(() => {
    let cancelled = false
    const apiBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "")
    const load = async () => {
      try {
        const r = await fetch(`${apiBase}/api/video/active`, { credentials: "include" })
        if (!r.ok) return
        const data = (await r.json()) as { sessions: LiveSession[] }
        if (!cancelled) setLiveSessions(data.sessions || [])
      } catch { /* noop */ }
    }
    void load()
    const t = window.setInterval(load, 5_000)
    return () => { cancelled = true; window.clearInterval(t) }
  }, [])

  const canHandle = usePermission("consult.handle")
  const canHostVideo = usePermission("video.host")
  const canRecommend = usePermission("rx.recommend")

  const filtered = useMemo(() => {
    return items
      .filter((c) => filter === "all" || c.status === filter)
      .filter((c) => {
        if (!search.trim()) return true
        const s = search.toLowerCase()
        return c.patientName.toLowerCase().includes(s) || c.topic.toLowerCase().includes(s)
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }, [items, filter, search])

  const active = items.find((c) => c.id === activeId) || filtered[0] || null

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [active?.id, active?.messages.length])

  const update = (patch: Partial<Consultation>) => {
    if (!active) return
    setItems((arr) => arr.map((c) => (c.id === active.id ? { ...c, ...patch } : c)))
  }

  const sendDoctor = (text: string) => {
    if (!active || !text.trim()) return
    const msg: ConsultMessage = { id: newId("m"), from: "doctor", text: text.trim(), at: new Date().toISOString() }
    update({ messages: [...active.messages, msg] })
  }

  const startCall = () => {
    update({ status: "live" })
    if (active && (active.mode === "video" || active.mode === "voice") && canHostVideo) {
      setVideoOpen(true)
    }
  }
  const endCall = () =>
    update({
      status: "completed",
      endedAt: new Date().toISOString(),
      durationSec:
        Math.round((Date.now() - new Date(active?.startedAt || Date.now()).getTime()) / 1000) || 0,
    })

  const addRec = () =>
    update({ recommendedDrugs: [...(active?.recommendedDrugs || []), { name: "", dosage: "", instructions: "" }] })

  const updateRec = (idx: number, patch: Partial<Consultation["recommendedDrugs"][number]>) => {
    if (!active) return
    update({
      recommendedDrugs: active.recommendedDrugs.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    })
  }

  const removeRec = (idx: number) => {
    if (!active) return
    update({ recommendedDrugs: active.recommendedDrugs.filter((_, i) => i !== idx) })
  }

  const newConsult = () => {
    const c: Consultation = {
      id: newId("c"),
      patientName: "New patient",
      phone: "",
      doctorName: "Dr. Wanjiku",
      mode: "chat",
      status: "queued",
      topic: "",
      startedAt: new Date().toISOString(),
      messages: [{ id: newId("m"), from: "system", text: "New consultation created.", at: new Date().toISOString() }],
      doctorNote: "",
      recommendedDrugs: [],
    }
    setItems((arr) => [c, ...arr])
    setActiveId(c.id)
  }

  const counts = useMemo(() => {
    const out = { all: items.length, queued: 0, live: 0, completed: 0, missed: 0 }
    items.forEach((c) => out[c.status]++)
    return out
  }, [items])

  // Cross-module: turn the active consultation's recommendations into a
  // pending prescription record so the pharmacist can verify and dispense.
  const pushToPrescriptions = () => {
    if (!active) return
    if (active.recommendedDrugs.length === 0) {
      notify.warning("Add at least one recommended drug before pushing to the pharmacist.")
      return
    }
    const list = cmsStore.get<Prescription[]>("prescriptions", [])
    const rx: Prescription = {
      id: newId("rx"),
      patientName: active.patientName,
      phone: active.phone,
      imageUrl: "",
      notes: `From consultation ${active.id} (${active.topic || "no topic"}).`,
      status: "pending",
      pharmacistNote: `Issued by ${active.doctorName} during a ${active.mode} consultation. ${active.doctorNote || ""}`.trim(),
      recommendedDrugs: active.recommendedDrugs.map((r) => ({ ...r })),
      consultationId: active.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    cmsStore.set("prescriptions", [rx, ...list])
    notify.saved(`Sent to pharmacist queue · ${rx.id}`)
  }

  // Quick patient context — uses prior consultations + linked prescriptions.
  const patientHistory = useMemo(() => {
    if (!active) return null
    const prior = items.filter(
      (c) => c.id !== active.id && c.phone === active.phone && c.status === "completed",
    )
    const allRx = cmsStore.get<Prescription[]>("prescriptions", [])
    const linkedRx = allRx.filter((r) => r.phone === active.phone)
    return {
      visits: prior.length,
      lastVisit: prior[0]?.startedAt,
      pendingRx: linkedRx.filter((r) => r.status === "pending").length,
      verifiedRx: linkedRx.filter((r) => r.status === "verified" || r.status === "dispensed").length,
    }
  }, [active, items])

  return (
    <AdminShell title="Consultations">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Consultations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Doctor's command center. Handle patient chat, voice and video consultations, then leave a clinical note and recommend drugs.
            </p>
          </div>
          <button
            onClick={newConsult}
            className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> New consultation
          </button>
        </div>

        {/* Live sessions monitor — auto-updates every 5s. */}
        {liveSessions.length > 0 && (
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#3D0814" }}>
                  Live now · {liveSessions.length}
                </h2>
              </div>
              <p className="text-[11px] text-muted-foreground">Watching any session below joins as the doctor.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {liveSessions.map((s) => {
                const ModeIcon = s.mode === "voice" ? Phone : Video
                return (
                  <div
                    key={s.name}
                    className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{s.patientName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.topic || "Live consultation"}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                        style={{
                          background: s.doctorJoined ? "#DCFCE7" : "#FEF3C7",
                          color: s.doctorJoined ? "#166534" : "#92400E",
                        }}
                      >
                        <ModeIcon className="h-3 w-3" />
                        {s.doctorJoined ? "In session" : "Awaiting doctor"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {liveAgo(s.startedAt)} elapsed
                      </span>
                      {s.doctorName && <span className="truncate">Dr. {s.doctorName}</span>}
                    </div>
                    <button
                      onClick={() => {
                        if (!canHostVideo) {
                          notify.warning("You don't have permission to host video consultations.")
                          return
                        }
                        setLiveWatch(s)
                      }}
                      className="h-8 rounded-md text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
                      style={{ background: "linear-gradient(135deg, #F97316, #B91C1C)" }}
                    >
                      <Video className="h-3.5 w-3.5" /> Watch live
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Queue */}
          <aside className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search patients or topics…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-background text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "queued", "live", "completed", "missed"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
                      filter === k ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary border-border"
                    }`}
                  >
                    {k.charAt(0).toUpperCase() + k.slice(1)} ({counts[k]})
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background overflow-hidden divide-y divide-border max-h-[70vh] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No consultations.</p>
              )}
              {filtered.map((c) => {
                const meta = STATUS_META[c.status]
                const Icon = MODE_ICON[c.mode]
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      active?.id === c.id ? "bg-foreground/5 border-l-2 border-l-foreground" : "hover:bg-muted/30 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.patientName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.topic || "No topic"}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {c.mode}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(c.startedAt)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Active session */}
          <div className="rounded-lg border border-border bg-background flex flex-col min-h-[70vh]">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a consultation to view.
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-700 text-white flex items-center justify-center font-bold">
                      {active.patientName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{active.patientName}</p>
                      <p className="text-[11px] text-muted-foreground">{active.phone} · with {active.doctorName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {active.status === "queued" && canHandle && (
                      <button
                        onClick={startCall}
                        className="h-8 px-3 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90"
                        style={{ background: active.mode === "chat" ? "#3D0814" : "#B91C1C" }}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        {active.mode === "video" ? "Start video" : active.mode === "voice" ? "Start voice" : "Start"}
                      </button>
                    )}
                    {active.status === "live" && canHandle && (
                      <>
                        {(active.mode === "video" || active.mode === "voice") && canHostVideo && !videoOpen && (
                          <button
                            onClick={() => setVideoOpen(true)}
                            className="h-8 px-3 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90"
                            style={{ background: "#B91C1C" }}
                          >
                            <PhoneCall className="h-3.5 w-3.5" /> Re-open call
                          </button>
                        )}
                        <button onClick={endCall} className="h-8 px-3 rounded-md text-xs font-semibold bg-red-600 text-white inline-flex items-center gap-1.5">
                          End call
                        </button>
                      </>
                    )}
                    {active.status === "completed" && (
                      <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {active.durationSec ? `${Math.round(active.durationSec / 60)} min` : "Completed"}
                      </span>
                    )}
                    {!canHandle && active.status !== "completed" && (
                      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1" title="Requires consult.handle permission">
                        <Lock className="h-3 w-3" /> View only
                      </span>
                    )}
                  </div>
                </div>

                {/* Patient context strip */}
                {patientHistory && (
                  <div className="px-5 py-2.5 border-b border-border bg-muted/20 flex items-center gap-3 flex-wrap text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <History className="h-3 w-3" />
                      <strong className="text-foreground">{patientHistory.visits}</strong> prior visit{patientHistory.visits === 1 ? "" : "s"}
                    </span>
                    {patientHistory.lastVisit && (
                      <span className="text-muted-foreground">
                        Last: <strong className="text-foreground">{timeAgo(patientHistory.lastVisit)}</strong>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <ClipboardList className="h-3 w-3" />
                      <strong className="text-foreground">{patientHistory.pendingRx}</strong> pending Rx · <strong className="text-foreground">{patientHistory.verifiedRx}</strong> verified
                    </span>
                    {active.recommendedDrugs.length > 0 && canRecommend && (
                      <button
                        onClick={pushToPrescriptions}
                        className="ml-auto h-7 px-3 rounded-full text-[11px] font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90"
                        style={{ background: "#3D0814" }}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Push to pharmacist queue
                      </button>
                    )}
                  </div>
                )}

                {/* Body: chat + side panel */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-0">
                  {/* Chat */}
                  <div className="flex flex-col border-r border-border min-h-0">
                    {active.mode !== "chat" && active.status === "live" && (
                      <div className="bg-emerald-600/10 border-b border-emerald-600/30 px-4 py-3 flex items-center justify-between gap-2">
                        <span className="text-emerald-700 text-xs font-semibold inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                          {active.mode === "video" ? "Video" : "Voice"} consultation ready
                          {!canHostVideo && (
                            <span className="text-amber-700 inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Hosting requires video.host
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => setVideoOpen(true)}
                          disabled={!canHostVideo}
                          className="h-8 px-3 rounded-full text-xs font-bold text-white inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "#B91C1C" }}
                        >
                          {active.mode === "video" ? "Join video call" : "Start voice call"}
                        </button>
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10 max-h-[55vh]">
                      {active.messages.map((m) => (
                        <MessageBubble key={m.id} msg={m} />
                      ))}
                      <div ref={messageEndRef} />
                    </div>
                    <Composer onSend={sendDoctor} disabled={!canHandle || active.status === "completed" || active.status === "missed"} />
                  </div>

                  {/* Side panel: notes + recommendations */}
                  <aside className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                    <Field label="Topic">
                      <input className="cinput" value={active.topic} onChange={(e) => update({ topic: e.target.value })} />
                    </Field>
                    <Field label="Doctor's note">
                      <textarea
                        rows={5}
                        className="cinput"
                        placeholder="Symptoms, clinical impression / diagnosis, recommendation, follow-ups…"
                        value={active.doctorNote}
                        onChange={(e) => update({ doctorNote: e.target.value })}
                        disabled={!canHandle}
                      />
                      <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Saved automatically · visible to the care team
                      </p>
                    </Field>
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5" />
                          Recommended drugs
                        </label>
                        {canRecommend && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <SuggestFromNotesButton
                              clinicalContext={`${active.topic} ${active.doctorNote}`}
                              existingNames={active.recommendedDrugs.map((r) => r.name)}
                              onAdd={(rows) =>
                                update({ recommendedDrugs: [...active.recommendedDrugs, ...rows] })
                              }
                            />
                            <DrugPicker
                              clinicalContext={`${active.topic} ${active.doctorNote}`}
                              onPick={(row) =>
                                update({ recommendedDrugs: [...active.recommendedDrugs, row] })
                              }
                            />
                          </div>
                        )}
                      </div>
                      {active.recommendedDrugs.length > 0 && canRecommend && (
                        <button
                          onClick={pushToPrescriptions}
                          className="w-full mb-2 h-8 rounded-md text-xs font-semibold border border-dashed inline-flex items-center justify-center gap-1.5 hover:bg-secondary"
                          style={{ borderColor: "#3D0814", color: "#3D0814" }}
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          Send to pharmacist as Rx
                        </button>
                      )}
                      <Link
                        href="/admin/prescriptions"
                        className="block text-[11px] text-center text-muted-foreground hover:text-foreground underline mb-2"
                      >
                        Open prescription queue →
                      </Link>
                      {active.recommendedDrugs.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-3 border border-dashed border-border rounded-md">
                          None yet.
                        </p>
                      )}
                      <div className="space-y-2">
                        {active.recommendedDrugs.map((r, i) => (
                          <div key={i} className="rounded-md border border-border p-2 space-y-1.5 relative">
                            <button onClick={() => removeRec(i)} className="absolute top-1 right-1 w-5 h-5 rounded hover:bg-destructive/10 text-destructive flex items-center justify-center">
                              <X className="h-3 w-3" />
                            </button>
                            <input className="cinput" placeholder="Drug name" value={r.name} onChange={(e) => updateRec(i, { name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-1.5">
                              <input className="cinput" placeholder="Dosage" value={r.dosage} onChange={(e) => updateRec(i, { dosage: e.target.value })} />
                              <input className="cinput" placeholder="Instructions" value={r.instructions} onChange={(e) => updateRec(i, { instructions: e.target.value })} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`.cinput{width:100%;height:2rem;padding:0 0.6rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.8125rem;}
        textarea.cinput{height:auto;padding:0.4rem 0.6rem;font-family:inherit;}`}</style>
    {videoOpen && active && (
        <DailyCall
          roomName={`consult-${active.id}`}
          userName={active.doctorName || "Doctor"}
          isOwner
          title={`Patient: ${active.patientName}`}
          subtitle={active.topic || "Live consultation"}
          consultationKind="video"
          patientName={active.patientName}
          doctorName={active.doctorName}
          topic={active.topic || "Live consultation"}
          onLeave={() => setVideoOpen(false)}
        />
      )}
      {liveWatch && (
        <DailyCall
          roomName={liveWatch.name}
          userName={liveWatch.doctorName || "Doctor"}
          isOwner
          title={`Live: ${liveWatch.patientName}`}
          subtitle={liveWatch.topic || "Watching live consultation"}
          consultationKind={liveWatch.mode}
          patientName={liveWatch.patientName}
          doctorName={liveWatch.doctorName}
          topic={liveWatch.topic}
          onLeave={() => setLiveWatch(null)}
        />
      )}
    </AdminShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function MessageBubble({ msg }: { msg: ConsultMessage }) {
  if (msg.from === "system") {
    return <p className="text-center text-[11px] text-muted-foreground italic">{msg.text}</p>
  }
  const isDoctor = msg.from === "doctor"
  return (
    <div className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isDoctor ? "bg-foreground text-background rounded-br-sm" : "bg-background border border-border rounded-bl-sm"
        }`}
      >
        {msg.text}
      </div>
    </div>
  )
}

function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("")
  return (
    <div className="border-t border-border p-3 flex items-end gap-2 bg-background">
      <textarea
        rows={1}
        disabled={disabled}
        placeholder={disabled ? "Consultation has ended." : "Type a reply…"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (text.trim()) {
              onSend(text)
              setText("")
            }
          }
        }}
        className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
      />
      <button
        onClick={() => {
          if (text.trim()) {
            onSend(text)
            setText("")
          }
        }}
        disabled={disabled || !text.trim()}
        className="h-9 px-3 rounded-md bg-foreground text-background text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
      >
        <Send className="h-4 w-4" />
        Send
      </button>
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

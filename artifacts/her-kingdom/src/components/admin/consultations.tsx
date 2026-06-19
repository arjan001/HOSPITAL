"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import useSWR from "swr"
import { AdminShell } from "./admin-shell"
import { DailyCall } from "@/components/video/daily-call"
import { usePermission } from "@/lib/permissions"
import { notify } from "@/lib/notify"
import { ChatWindow } from "@/components/chat/chat-window"
import {
  apiChat,
  useAdminConsultations,
  type ChatMessage,
  type ChatPrescriptionDrug,
  type ConsultationSummary,
} from "@/lib/api-nest"
import { useAdminDoctors, type DoctorRecord } from "@/lib/doctors-client"
import { mutate as globalMutate } from "swr"
import {
  MessageSquare,
  Phone,
  Video,
  Stethoscope,
  Pill,
  Search,
  Clock,
  CheckCircle2,
  ShieldCheck,
  History,
  RefreshCw,
} from "lucide-react"

const WINE = "#3D0814"
const WINE_2 = "#6B0F1A"
const ACCENT_ORG = "#F97316"
const ACCENT_RED = "#B91C1C"

/**
 * Legacy consultation shape — retained for the cmsStore-backed seams in the
 * prescriptions panel and doctor dashboard. The admin Consultations page no
 * longer uses it (it is driven by live api-nest data below).
 */
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

type LiveSession = {
  name: string
  patientName: string
  doctorName?: string
  topic?: string
  mode: "voice" | "video"
  startedAt: number
  doctorJoined?: boolean
}

function liveAgo(ms: number): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function timeAgo(iso: string | null): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

function isLive(c: ConsultationSummary): boolean {
  return c.threadStatus === "active" && c.status !== "completed"
}

/** Pull prescribed drugs out of a transcript's prescription-card messages. */
function rxDrugsFromMessages(messages: ChatMessage[]): ChatPrescriptionDrug[] {
  const out: ChatPrescriptionDrug[] = []
  for (const m of messages) {
    const meta = m.meta as { kind?: string; drugs?: ChatPrescriptionDrug[] } | null | undefined
    if (meta && meta.kind === "prescription" && Array.isArray(meta.drugs)) {
      out.push(...meta.drugs)
    }
  }
  return out
}

/* ─────────────────────────────────────────────────────────────────────────
   Consultation detail — live transcript (read-only) + prescribed drugs.
   ──────────────────────────────────────────────────────────────────────── */
function ConsultationDetail({ consultation }: { consultation: ConsultationSummary }) {
  const { data: messages, isLoading } = useSWR<ChatMessage[]>(
    `/chat/admin/consultations/${consultation.id}/messages`,
    () => apiChat.adminConsultationMessages(consultation.id),
    { refreshInterval: isLive(consultation) ? 10_000 : 0 },
  )
  const msgs = messages || []
  const drugs = useMemo(() => rxDrugsFromMessages(msgs), [msgs])
  const apiBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "")
  const live = isLive(consultation)
  const { records: doctorList } = useAdminDoctors()
  const [assignSaving, setAssignSaving] = useState(false)

  async function handleAssignDoctor(doctorId: string | null) {
    setAssignSaving(true)
    try {
      await apiChat.assignDoctorToConsultation(consultation.id, doctorId)
      await globalMutate("/chat/admin/consultations")
    } catch {
      // silent — UI stays unchanged
    } finally {
      setAssignSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold"
            style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${ACCENT_RED})` }}>
            {(consultation.patientName || "P").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{consultation.patientName || "Patient"}</p>
            <p className="text-[11px] text-muted-foreground">
              {consultation.patientPhone || "No phone"} ·{" "}
              <span className="font-mono">{consultation.id}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1"
            style={{
              background: live ? "#DCFCE7" : "#F1F5F9",
              color: live ? "#166534" : "#475569",
            }}
          >
            {live ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" /> Completed
              </>
            )}
          </span>
          {live && consultation.threadId && (
            <Link
              href="/admin/chat"
              className="h-8 px-3 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1.5 hover:opacity-90"
              style={{ background: WINE }}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Open live chat
            </Link>
          )}
        </div>
      </div>

      {/* Assign doctor sub-band */}
      {doctorList && doctorList.length > 0 && (
        <div className="px-5 py-2 border-b border-border flex items-center gap-3 flex-wrap bg-muted/20">
          <Stethoscope className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Attending doctor:</span>
          <select
            value={consultation.doctorId ?? ""}
            disabled={assignSaving}
            onChange={(e) => handleAssignDoctor(e.target.value || null)}
            className="h-7 px-2 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 disabled:opacity-50"
          >
            <option value="">— unassigned —</option>
            {doctorList.map((d: DoctorRecord) => (
              <option key={d.id} value={d.id}>
                {d.title} {d.name} · {d.specialization}
              </option>
            ))}
          </select>
          {assignSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>
          )}
        </div>
      )}

      {/* Body: transcript + prescribed drugs */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-0">
        <div className="flex flex-col border-r border-border min-h-0 h-[60vh]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-7 w-7 rounded-full border-2 animate-spin"
                style={{ borderColor: WINE, borderTopColor: "transparent" }} />
            </div>
          ) : (
            <ChatWindow
              messages={msgs}
              perspective="staff"
              onSend={() => {}}
              composerDisabled
              composerHint={
                live
                  ? "Open the live chat to reply. This view is read-only."
                  : "This consultation is completed — transcript is read-only."
              }
              showStatus={false}
              emptyState={<p className="text-sm text-muted-foreground">No messages in this consultation.</p>}
            />
          )}
        </div>

        <aside className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
          <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: WINE }}>
            <Pill className="h-4 w-4" /> Prescribed drugs
          </h3>
          {drugs.length === 0 ? (
            <p className="text-xs text-muted-foreground border border-dashed border-border rounded-md py-3 text-center">
              No drugs prescribed in this consultation.
            </p>
          ) : (
            <ul className="space-y-2">
              {drugs.map((d, i) => (
                <li key={i} className="rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{d.name}</p>
                    {typeof d.price === "number" && (
                      <span className="text-xs font-semibold" style={{ color: ACCENT_ORG }}>
                        KSh {d.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {(d.dosage || d.instructions) && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {[d.dosage, d.instructions].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {d.productSlug && (
                    <Link
                      href={`${apiBase}/product/${d.productSlug}`}
                      className="text-[11px] font-semibold inline-flex items-center gap-1 mt-1"
                      style={{ color: WINE_2 }}
                    >
                      View product →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/prescriptions"
            className="block text-[11px] text-center text-muted-foreground hover:text-foreground underline pt-1"
          >
            Open prescription queue →
          </Link>
        </aside>
      </div>
    </div>
  )
}

export function AdminConsultations() {
  const { data: consultations, isLoading, mutate } = useAdminConsultations()
  const [filter, setFilter] = useState<"all" | "live" | "completed">("all")
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [liveWatch, setLiveWatch] = useState<LiveSession | null>(null)

  const canHostVideo = usePermission("video.host")

  // Poll the in-memory active-sessions registry (voice/video) every 5s.
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

  const list = consultations || []

  const filtered = useMemo(() => {
    return list
      .filter((c) => filter === "all" || (filter === "live" ? isLive(c) : !isLive(c)))
      .filter((c) => {
        if (!search.trim()) return true
        const s = search.toLowerCase()
        return (
          (c.patientName || "").toLowerCase().includes(s) ||
          (c.patientPhone || "").toLowerCase().includes(s) ||
          (c.lastMessage || "").toLowerCase().includes(s)
        )
      })
      .sort((a, b) =>
        (b.lastMessageAt || b.createdAt).localeCompare(a.lastMessageAt || a.createdAt),
      )
  }, [list, filter, search])

  const active = list.find((c) => c.id === activeId) || filtered[0] || null

  const counts = useMemo(() => {
    let live = 0
    list.forEach((c) => { if (isLive(c)) live++ })
    return { all: list.length, live, completed: list.length - live }
  }, [list])

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
              Live and completed patient consultations, pulled straight from the chat backend.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="px-3 h-9 rounded-md text-sm font-semibold border border-border inline-flex items-center gap-2 hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Live sessions monitor — voice/video, auto-updates every 5s. */}
        {liveSessions.length > 0 && (
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: WINE }}>
                  Live now · {liveSessions.length}
                </h2>
              </div>
              <p className="text-[11px] text-muted-foreground">Watching any session below joins as the doctor.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {liveSessions.map((s) => {
                const ModeIcon = s.mode === "voice" ? Phone : Video
                return (
                  <div key={s.name} className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2">
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
                      style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${ACCENT_RED})` }}
                    >
                      <Video className="h-3.5 w-3.5" /> Watch live
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* List */}
          <aside className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search patients, phone or messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-background text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "live", "completed"] as const).map((k) => (
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
              {isLoading && (
                <p className="text-xs text-muted-foreground text-center py-8">Loading consultations…</p>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="text-center py-12 px-4">
                  <History className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No consultations yet.</p>
                </div>
              )}
              {filtered.map((c) => {
                const live = isLive(c)
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
                        <p className="text-sm font-semibold truncate">{c.patientName || "Patient"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage || "No messages"}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 flex-shrink-0"
                        style={{
                          background: live ? "#DCFCE7" : "#F1F5F9",
                          color: live ? "#166534" : "#475569",
                        }}
                      >
                        {live ? "Active" : "Done"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {c.messageCount}
                        {c.prescriptionCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5" style={{ color: ACCENT_ORG }}>
                            <Pill className="h-3 w-3" /> {c.prescriptionCount}
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(c.lastMessageAt || c.createdAt)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Detail */}
          <div className="rounded-lg border border-border bg-background flex flex-col min-h-[70vh]">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a consultation to view its transcript.
              </div>
            ) : (
              <ConsultationDetail key={active.id} consultation={active} />
            )}
          </div>
        </div>
      </div>

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

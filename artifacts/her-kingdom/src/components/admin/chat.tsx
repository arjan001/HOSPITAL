"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { mutate as globalMutate } from "swr"
import { AdminShell } from "./admin-shell"
import { ChatWindow } from "@/components/chat/chat-window"
import {
  apiChat,
  apiUploads,
  chatStreamUrl,
  foldChatMessage,
  refreshChatAdmin,
  useAdminMessages,
  useAdminThreads,
  type ChatMessage,
  type ChatThread,
} from "@/lib/api-nest"
import { MessagesSquare, Search, Trash2, Stethoscope, Phone, Circle, Video, Wifi, CheckCheck, Volume2, VolumeX, Bell, Timer, Pill, X, Plus, ShieldCheck } from "lucide-react"
import { DailyCall } from "@/components/video/daily-call"
import { DrugPicker, type DrugRow } from "./drug-picker"
import { playChime, isChatSoundEnabled, setChatSoundEnabled } from "@/lib/notify-sound"
import { useConsultationSettings } from "@/lib/consultation-settings"
import type { Product } from "@/lib/types"
import type { ChatPrescriptionDrug } from "@/lib/api-nest"

type Presence = { online: boolean; lastSeen: string | null }

// Documented reasons a doctor may close a consultation without prescribing.
const END_REASONS = [
  { key: "no-medication", label: "No medication required" },
  { key: "referred", label: "Referred to a specialist / facility" },
  { key: "follow-up", label: "Follow-up booked" },
  { key: "other", label: "Other (add a note)" },
] as const

function fmtClock(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return "Yesterday"
  return d.toLocaleDateString([], { day: "2-digit", month: "short" })
}

function fmtLastSeen(iso: string | null): string {
  if (!iso) return "last seen recently"
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return "last seen just now"
  if (diffMin < 60) return `last seen ${diffMin}m ago`
  if (d.toDateString() === now.toDateString())
    return `last seen at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  return `last seen ${d.toLocaleDateString([], { day: "numeric", month: "short" })}`
}

function avatarInitials(name: string) {
  return (name || "G")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "G"
}

export function AdminChat() {
  const { data: threads } = useAdminThreads()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [callMode, setCallMode] = useState<"video" | "voice" | null>(null)
  const { data: messages } = useAdminMessages(activeId)

  // Prescribe-from-chat panel state
  const [prescribeOpen, setPrescribeOpen] = useState(false)
  const [rxDrugs, setRxDrugs] = useState<ChatPrescriptionDrug[]>([])
  const [rxNote, setRxNote] = useState("")
  const [issuing, setIssuing] = useState(false)
  const [rxError, setRxError] = useState<string | null>(null)

  // End-session guard state
  const [endOpen, setEndOpen] = useState(false)
  const [endReason, setEndReason] = useState("")
  const [endNote, setEndNote] = useState("")
  const [ending, setEnding] = useState(false)

  // Per-thread patient presence + typing
  const [presence, setPresence] = useState<Record<string, Presence>>({})
  const [typingThreads, setTypingThreads] = useState<Record<string, boolean>>({})
  const typingClearRef = useRef<Record<string, number>>({})

  // Notification sound + "new patient started a chat" alert.
  const [soundOn, setSoundOn] = useState(true)
  useEffect(() => { setSoundOn(isChatSoundEnabled()) }, [])
  const [newPatientAlert, setNewPatientAlert] = useState<string | null>(null)
  const alertClearRef = useRef<number | null>(null)
  const knownThreadIdsRef = useRef<Set<string> | null>(null)

  // Outbound (staff) typing throttle for the active thread
  const lastTypingSentRef = useRef(0)
  const typingStopRef = useRef<number | null>(null)

  // Auto-select first thread
  useEffect(() => {
    if (!activeId && threads && threads.length > 0) setActiveId(threads[0].id)
  }, [threads, activeId])

  // SSE: live updates for the whole admin
  useEffect(() => {
    if (typeof window === "undefined") return
    // withCredentials so the HttpOnly admin-token cookie rides along — the SSE
    // stream is AdminGuard-protected and EventSource cannot set custom headers.
    const es = new EventSource(chatStreamUrl("admin"), { withCredentials: true })
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data)
        if (p.type === "message") {
          globalMutate(
            `/chat/admin/threads/${p.threadId}/messages`,
            (prev: ChatMessage[] | undefined) => foldChatMessage(prev, p.message),
            { revalidate: false },
          )
          globalMutate("/chat/admin/threads")
          // Chime for inbound patient messages. Brand-new threads are handled by
          // the new-thread effect below (a brighter alert), so skip them here to
          // avoid a double sound.
          if (
            p.message?.sender === "patient" &&
            knownThreadIdsRef.current?.has(p.threadId)
          ) {
            playChime("message")
          }
        }
        if (p.type === "thread") {
          globalMutate("/chat/admin/threads")
        }
        if (p.type === "deleted") {
          globalMutate("/chat/admin/threads")
        }
        if (p.type === "read" && p.by === "patient") {
          globalMutate(
            `/chat/admin/threads/${p.threadId}/messages`,
            (prev: ChatMessage[] | undefined) =>
              prev ? prev.map(m => m.sender === "staff" ? { ...m, status: "read" as const } : m) : prev,
            { revalidate: false },
          )
        }
        if (p.type === "typing" && p.who === "patient") {
          const tid = p.threadId as string
          setTypingThreads((prev) => ({ ...prev, [tid]: !!p.isTyping }))
          if (typingClearRef.current[tid]) window.clearTimeout(typingClearRef.current[tid])
          if (p.isTyping) {
            typingClearRef.current[tid] = window.setTimeout(
              () => setTypingThreads((prev) => ({ ...prev, [tid]: false })),
              5000,
            )
          }
        }
        if (p.type === "presence" && p.presence?.who === "patient") {
          const { threadId, online, lastSeen } = p.presence
          setPresence((prev) => ({ ...prev, [threadId]: { online: !!online, lastSeen: lastSeen ?? null } }))
        }
      } catch { /* ping */ }
    }
    es.onerror = () => { /* auto-reconnect */ }
    return () => {
      es.close()
      Object.values(typingClearRef.current).forEach((t) => window.clearTimeout(t))
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
    }
  }, [])

  // Detect a brand-new patient conversation → bright alert + transient banner.
  useEffect(() => {
    if (!threads) return
    const ids = new Set(threads.map((t) => t.id))
    if (knownThreadIdsRef.current === null) {
      knownThreadIdsRef.current = ids
      return
    }
    const prev = knownThreadIdsRef.current
    const fresh = threads.filter((t) => !prev.has(t.id))
    knownThreadIdsRef.current = ids
    if (fresh.length > 0) {
      playChime("newchat")
      setNewPatientAlert(fresh[0].patientName || "A patient")
      if (alertClearRef.current) window.clearTimeout(alertClearRef.current)
      alertClearRef.current = window.setTimeout(() => setNewPatientAlert(null), 8000)
    }
  }, [threads])

  useEffect(() => () => { if (alertClearRef.current) window.clearTimeout(alertClearRef.current) }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setChatSoundEnabled(next)
    if (next) playChime("message")
  }

  // Mark active thread as read whenever it changes / new msg arrives
  useEffect(() => {
    if (!activeId) return
    const t = threads?.find((x) => x.id === activeId)
    if (!t || t.unreadByStaff === 0) return
    apiChat.markStaffRead(activeId).then(() => refreshChatAdmin(activeId)).catch(() => {})
  }, [activeId, threads, messages?.length])

  const filtered = useMemo(() => {
    const list = threads || []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((t) =>
      t.patientName.toLowerCase().includes(q) ||
      t.patientPhone.toLowerCase().includes(q) ||
      t.lastMessage.toLowerCase().includes(q),
    )
  }, [threads, search])

  const active = threads?.find((t) => t.id === activeId) || null
  const activePresence = activeId ? presence[activeId] : undefined
  const activeTyping = activeId ? !!typingThreads[activeId] : false

  // Doctor-side conversation timer — mirrors the patient's countdown so the
  // clinician can see how much consultation time is left. Read-only: no overage
  // prompts on the staff side.
  const [consultSettings] = useConsultationSettings()
  const [nowTs, setNowTs] = useState(() => Date.now())
  useEffect(() => {
    if (!active || active.status === "archived") return
    const id = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active?.id, active?.status])

  const timer = useMemo(() => {
    if (!active || active.status === "archived") return null
    const startMs = new Date(active.createdAt).getTime()
    if (Number.isNaN(startMs)) return null
    const totalSec = Math.max(60, consultSettings.chatDurationMin * 60)
    const elapsedSec = Math.max(0, Math.floor((nowTs - startMs) / 1000))
    const leftSec = totalSec - elapsedSec
    const over = leftSec < 0
    const abs = Math.abs(leftSec)
    const mm = String(Math.floor(abs / 60)).padStart(2, "0")
    const ss = String(abs % 60).padStart(2, "0")
    const warn = !over && leftSec <= consultSettings.warnSecondsLeft
    return { label: `${over ? "+" : ""}${mm}:${ss}`, over, warn }
  }, [active?.id, active?.status, active?.createdAt, nowTs, consultSettings])

  const send = async (text: string) => {
    if (!activeId) return
    await apiChat.sendAsStaff(activeId, text)
    await refreshChatAdmin(activeId)
  }

  const sendAttachment = async (file: File) => {
    if (!activeId) return
    const up = await apiUploads.putFile(file, "consultations")
    await apiChat.sendAsStaff(activeId, "", "Pharmacist", {
      attachmentUrl: up.url,
      attachmentName: file.name,
      attachmentType: file.type.startsWith("image/") ? "image" : "file",
    })
    await refreshChatAdmin(activeId)
  }

  const handleTyping = (isTyping: boolean) => {
    if (!activeId) return
    const tid = activeId
    if (isTyping) {
      const now = Date.now()
      if (now - lastTypingSentRef.current > 1800) {
        lastTypingSentRef.current = now
        apiChat.setStaffTyping(tid, true).catch(() => {})
      }
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      typingStopRef.current = window.setTimeout(() => {
        apiChat.setStaffTyping(tid, false).catch(() => {})
        lastTypingSentRef.current = 0
      }, 3000)
    } else {
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      lastTypingSentRef.current = 0
      apiChat.setStaffTyping(tid, false).catch(() => {})
    }
  }

  const sendTest = async () => {
    if (!activeId) return
    await apiChat.testAsStaff(activeId)
    await refreshChatAdmin(activeId)
  }

  const remove = async () => {
    if (!activeId) return
    if (!confirm("Delete this conversation? This cannot be undone.")) return
    await apiChat.deleteThread(activeId)
    setActiveId(null)
    await refreshChatAdmin()
  }

  // Has a prescription already been issued in this thread? Used to gate the
  // "End & save" action — a doctor must either prescribe a drug or document a
  // reason before closing the consultation.
  const hasPrescription = useMemo(
    () =>
      (messages || []).some(
        (m) => m.meta && (m.meta as { kind?: string }).kind === "prescription",
      ),
    [messages],
  )

  // Drug picker → editable Rx rows. The picker hands us a DrugRow plus the
  // source Product so we can capture the product slug + price for the card.
  const addDrug = (row: DrugRow, source?: Product) => {
    setRxError(null)
    setRxDrugs((prev) => [
      ...prev,
      {
        name: row.name,
        dosage: row.dosage || "",
        instructions: row.instructions || "",
        productSlug: source?.slug ?? null,
        price: typeof source?.price === "number" ? source.price : null,
      },
    ])
  }
  const updateDrug = (i: number, patch: Partial<ChatPrescriptionDrug>) =>
    setRxDrugs((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  const removeDrug = (i: number) =>
    setRxDrugs((prev) => prev.filter((_, idx) => idx !== i))

  const resetPrescribe = () => {
    setPrescribeOpen(false)
    setRxDrugs([])
    setRxNote("")
    setRxError(null)
  }

  const issuePrescription = async () => {
    if (!activeId) return
    const drugs = rxDrugs
      .map((d) => ({ ...d, name: d.name.trim() }))
      .filter((d) => d.name.length > 0)
    if (drugs.length === 0) {
      setRxError("Add at least one medicine before issuing.")
      return
    }
    setIssuing(true)
    setRxError(null)
    try {
      await apiChat.prescribe(activeId, { drugs, doctorNote: rxNote.trim() || undefined })
      await refreshChatAdmin(activeId)
      resetPrescribe()
    } catch {
      setRxError("Could not issue the prescription. Please try again.")
    } finally {
      setIssuing(false)
    }
  }

  // End the consultation and keep the transcript as a saved record (archived).
  // Guarded: requires a prescribed drug OR a documented reason.
  const endAndSave = async () => {
    if (!activeId) return
    if (hasPrescription) {
      await apiChat.closeThread(activeId)
      await refreshChatAdmin(activeId)
      return
    }
    // No prescription — require a documented reason.
    setEndReason("")
    setEndNote("")
    setEndOpen(true)
  }

  const confirmEndWithReason = async () => {
    if (!activeId || !endReason) return
    const label =
      END_REASONS.find((r) => r.key === endReason)?.label || endReason
    const note = endNote.trim()
    if (endReason === "other" && !note) return
    setEnding(true)
    try {
      // Document the clinical reason as a staff message so it lives in the
      // saved transcript, then archive the thread.
      await apiChat.sendAsStaff(
        activeId,
        `Consultation closed — ${label}${note ? `: ${note}` : ""}`,
      )
      await apiChat.closeThread(activeId)
      await refreshChatAdmin(activeId)
      setEndOpen(false)
    } finally {
      setEnding(false)
    }
  }

  const totalUnread = (threads || []).reduce((s, t) => s + t.unreadByStaff, 0)

  return (
    <AdminShell title="Live chat">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessagesSquare className="h-5 w-5" /> Live chat
              {totalUnread > 0 && (
                <span className="ml-1 text-[11px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
                  {totalUnread} new
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Realtime conversations with patients. Messages stream live via Server-Sent Events.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-semibold hover:bg-muted/40 transition-colors"
            title={soundOn ? "Notification sounds on — click to mute" : "Notification sounds muted — click to enable"}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            {soundOn ? "Sound on" : "Muted"}
          </button>
        </div>

        {newPatientAlert && (
          <div
            className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ background: "#3D0814" }}
            role="status"
          >
            <Bell className="h-4 w-4 flex-shrink-0" style={{ color: "#F97316" }} />
            New patient started a chat: {newPatientAlert}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-0 rounded-xl border border-border overflow-hidden bg-background h-[72vh] min-h-[520px]">
          {/* Thread list */}
          <aside className="border-r border-border flex flex-col bg-background">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search patients…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-background text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(filtered || []).length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-10 px-4">
                  No conversations yet. When a patient sends a message, it'll appear here in realtime.
                </div>
              )}
              {filtered.map((t) => {
                const isActive = t.id === activeId
                const initials = avatarInitials(t.patientName)
                const isOnline = presence[t.id]?.online
                const isTyping = !!typingThreads[t.id]
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left px-3 py-3 border-b border-border flex items-start gap-3 transition-colors ${
                      isActive ? "bg-secondary" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "#3D0814" }}
                      >
                        {initials}
                      </div>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate">{t.patientName}</p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {fmtClock(t.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">
                          {isTyping ? (
                            <span className="italic text-emerald-600">typing…</span>
                          ) : (
                            <>
                              {t.lastSender === "staff" && <span className="opacity-70">You: </span>}
                              {t.lastMessage || <em className="opacity-60">No messages yet</em>}
                            </>
                          )}
                        </p>
                        {t.unreadByStaff > 0 && (
                          <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {t.unreadByStaff}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Conversation */}
          <section className="flex flex-col min-w-0">
            {active ? (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-background">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "#3D0814" }}
                  >
                    {avatarInitials(active.patientName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{active.patientName}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      {activeTyping ? (
                        <span className="italic text-emerald-600">typing…</span>
                      ) : activePresence?.online ? (
                        <>
                          <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                          Online
                        </>
                      ) : (
                        <span>{fmtLastSeen(activePresence?.lastSeen ?? null)}</span>
                      )}
                      {active.patientPhone && (
                        <>
                          <span className="opacity-40">·</span>
                          <Phone className="h-3 w-3" /> {active.patientPhone}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={sendTest}
                    className="text-xs font-semibold inline-flex items-center gap-1 px-2 h-8 rounded-md hover:bg-secondary"
                    style={{ color: "#3D0814" }}
                    title="Send a test message to confirm the chat is connected"
                  >
                    <Wifi className="h-3.5 w-3.5" />
                  </button>
                  {/* Voice/video escalation is gated by what the patient paid
                      for: a chat-only consultation can never be switched to a
                      call. Voice needs "call" or "video"; video needs "video". */}
                  {(active.consultationType === "call" || active.consultationType === "video") && (
                    <button
                      onClick={() => setCallMode("voice")}
                      className="text-xs font-semibold inline-flex items-center gap-1 px-2 h-8 rounded-md hover:bg-secondary"
                      style={{ color: "#3D0814" }}
                      title="Start voice call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {active.consultationType === "video" && (
                    <button
                      onClick={() => setCallMode("video")}
                      className="text-xs font-semibold text-white inline-flex items-center gap-1.5 px-3 h-8 rounded-md hover:opacity-90"
                      style={{ background: "#B91C1C" }}
                      title="Start video call"
                    >
                      <Video className="h-3.5 w-3.5" /> Video call
                    </button>
                  )}
                  {active.consultationType !== "call" && active.consultationType !== "video" && (
                    <span
                      className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 h-7 rounded-full"
                      style={{ background: "#F3E8EB", color: "#6B0F1A" }}
                      title="The patient paid for a chat consultation. Voice and video calls are not available for this session."
                    >
                      <MessagesSquare className="h-3 w-3" /> Chat only
                    </span>
                  )}
                  {timer && (
                    <span
                      className="text-[11px] font-semibold tabular-nums inline-flex items-center gap-1 px-2.5 h-7 rounded-full"
                      style={
                        timer.over
                          ? { background: "#FEF2F2", color: "#B91C1C" }
                          : timer.warn
                            ? { background: "#FFF7ED", color: "#C2410C" }
                            : { background: "#F3E8EB", color: "#6B0F1A" }
                      }
                      title={timer.over ? "Consultation time exceeded" : "Time left in this consultation"}
                    >
                      <Timer className="h-3 w-3" />
                      {timer.over ? `Over ${timer.label.slice(1)}` : timer.label}
                    </span>
                  )}
                  {active.status !== "archived" && (
                    <button
                      onClick={() => { setRxError(null); setPrescribeOpen(true) }}
                      className="text-xs font-semibold text-white inline-flex items-center gap-1.5 px-3 h-8 rounded-md hover:opacity-90"
                      style={{ background: "#F97316" }}
                      title="Prescribe a medicine from the catalogue"
                    >
                      <Pill className="h-3.5 w-3.5" /> Prescribe
                    </button>
                  )}
                  {active.status !== "archived" && (
                    <button
                      onClick={endAndSave}
                      className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 h-8 rounded-md hover:bg-secondary"
                      style={{ color: "#3D0814" }}
                      title="End the consultation and save the transcript"
                    >
                      <CheckCheck className="h-3.5 w-3.5" /> End &amp; save
                    </button>
                  )}
                  {active.status === "archived" && (
                    <span
                      className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 h-7 rounded-full"
                      style={{ background: "#F3E8EB", color: "#6B0F1A" }}
                      title={active.closedAt ? `Ended ${fmtLastSeen(active.closedAt)}` : "Consultation ended"}
                    >
                      Saved
                    </span>
                  )}
                  <button
                    onClick={remove}
                    className="text-xs font-semibold text-destructive inline-flex items-center gap-1 px-2 h-8 rounded-md hover:bg-destructive/10"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatWindow
                    messages={messages || []}
                    perspective="staff"
                    onSend={send}
                    onSendAttachment={sendAttachment}
                    onTyping={handleTyping}
                    typing={activeTyping}
                    typingLabel="Patient is typing"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center px-6">
                <div className="max-w-xs space-y-2">
                  <div
                    className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: "rgba(61,8,20,0.08)", color: "#3D0814" }}
                  >
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">Select a conversation</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a patient on the left to view their messages and reply in realtime.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {callMode && active && (
        <DailyCall
          roomName={`chat-${active.id}`}
          userName="Pharmacist"
          isOwner
          title={`Patient: ${active.patientName}`}
          subtitle={callMode === "video" ? "Live video call" : "Live voice call"}
          consultationKind={callMode === "video" ? "video" : "voice"}
          patientName={active.patientName}
          doctorName="Pharmacist"
          topic={callMode === "video" ? "Live video call" : "Live voice call"}
          onLeave={() => setCallMode(null)}
          onSwitchToChat={() => setCallMode(null)}
        />
      )}

      {/* Prescribe panel */}
      {prescribeOpen && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) resetPrescribe() }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-5 py-4 flex items-center gap-3 text-white" style={{ background: "#3D0814" }}>
              <span
                className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(249,115,22,0.18)" }}
              >
                <Pill className="h-4.5 w-4.5" style={{ color: "#F97316" }} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">New prescription</p>
                <p className="text-[11px] opacity-80 truncate">For {active.patientName}</p>
              </div>
              {rxDrugs.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold px-2.5 h-6 rounded-full inline-flex items-center" style={{ background: "rgba(255,255,255,0.16)" }}>
                  {rxDrugs.length} {rxDrugs.length === 1 ? "medicine" : "medicines"}
                </span>
              )}
              <button onClick={resetPrescribe} className={`${rxDrugs.length > 0 ? "ml-2" : "ml-auto"} opacity-80 hover:opacity-100`} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3" style={{ background: "#FAFAFA" }}>
              {rxDrugs.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-white px-6 py-9 text-center">
                  <span
                    className="h-12 w-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "rgba(61,8,20,0.06)", color: "#3D0814" }}
                  >
                    <Pill className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold" style={{ color: "#3D0814" }}>No medicines added yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Search the catalogue below to add one or more medicines. You can set the dosage and instructions for each.
                  </p>
                </div>
              )}
              {rxDrugs.map((d, i) => (
                <div key={i} className="rounded-xl border border-border bg-white p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                      style={{ background: "#F3E8EB", color: "#6B0F1A" }}
                    >
                      {i + 1}
                    </span>
                    <input
                      value={d.name}
                      onChange={(e) => updateDrug(i, { name: e.target.value })}
                      placeholder="Medicine name"
                      className="flex-1 text-sm font-semibold h-9 px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#3D0814]/15"
                    />
                    {d.productSlug && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "#F3E8EB", color: "#6B0F1A" }}>
                        <ShieldCheck className="h-3 w-3" /> Linked
                      </span>
                    )}
                    <button onClick={() => removeDrug(i)} className="text-destructive hover:bg-destructive/10 rounded-md p-1.5" aria-label="Remove medicine">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-8">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Dosage</label>
                      <input
                        value={d.dosage ?? ""}
                        onChange={(e) => updateDrug(i, { dosage: e.target.value })}
                        placeholder="e.g. 1 tablet"
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#3D0814]/15"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">Instructions</label>
                      <input
                        value={d.instructions ?? ""}
                        onChange={(e) => updateDrug(i, { instructions: e.target.value })}
                        placeholder="e.g. 3x daily after meals"
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#3D0814]/15"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-1">
                <DrugPicker onPick={addDrug} clinicalContext={messages?.map((m) => m.text).join(" ")} triggerLabel="Add medicine" align="start" />
              </div>

              <div className="rounded-xl border border-border bg-white p-3.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
                  Doctor's note <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={rxNote}
                  onChange={(e) => setRxNote(e.target.value)}
                  placeholder="Diagnosis or guidance to record with the prescription…"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-[#3D0814]/15"
                />
              </div>

              {rxError && (
                <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#B91C1C" }}>
                  <X className="h-3.5 w-3.5" /> {rxError}
                </p>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-border bg-white flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {rxDrugs.length === 0
                  ? "Add at least one medicine to issue"
                  : `${rxDrugs.length} ${rxDrugs.length === 1 ? "medicine" : "medicines"} ready`}
              </span>
              <button onClick={resetPrescribe} className="ml-auto text-xs font-semibold px-4 h-9 rounded-lg hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={issuePrescription}
                disabled={issuing || rxDrugs.length === 0}
                className="text-xs font-semibold text-white inline-flex items-center gap-1.5 px-4 h-9 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ background: "#B91C1C" }}
              >
                <Plus className="h-3.5 w-3.5" /> {issuing ? "Issuing…" : "Issue prescription"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End-session guard: require a documented reason when no Rx was issued */}
      {endOpen && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setEndOpen(false) }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 flex items-center gap-2 text-white" style={{ background: "#3D0814" }}>
              <CheckCheck className="h-4 w-4" style={{ color: "#F97316" }} />
              <p className="font-semibold text-sm">End consultation</p>
              <button onClick={() => setEndOpen(false)} className="ml-auto opacity-80 hover:opacity-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                No prescription was issued. Document a reason before closing so the consultation has a clinical record.
              </p>
              <div className="space-y-1.5">
                {END_REASONS.map((r) => (
                  <label
                    key={r.key}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors"
                    style={{
                      borderColor: endReason === r.key ? "#3D0814" : "rgba(0,0,0,0.1)",
                      background: endReason === r.key ? "#F3E8EB" : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name="end-reason"
                      checked={endReason === r.key}
                      onChange={() => setEndReason(r.key)}
                      className="accent-[#3D0814]"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
              {endReason === "other" && (
                <textarea
                  rows={2}
                  value={endNote}
                  onChange={(e) => setEndNote(e.target.value)}
                  placeholder="Add a brief note…"
                  className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background resize-none"
                />
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => setEndOpen(false)} className="text-xs font-semibold px-3 h-9 rounded-md hover:bg-secondary">
                Cancel
              </button>
              <button
                onClick={confirmEndWithReason}
                disabled={ending || !endReason || (endReason === "other" && !endNote.trim())}
                className="text-xs font-semibold text-white inline-flex items-center gap-1.5 px-4 h-9 rounded-md hover:opacity-90 disabled:opacity-40"
                style={{ background: "#B91C1C" }}
              >
                <CheckCheck className="h-3.5 w-3.5" /> {ending ? "Saving…" : "End & save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

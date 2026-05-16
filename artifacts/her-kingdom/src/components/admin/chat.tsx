"use client"

import { useEffect, useMemo, useState } from "react"
import { mutate as globalMutate } from "swr"
import { AdminShell } from "./admin-shell"
import { ChatWindow } from "@/components/chat/chat-window"
import {
  apiChat,
  chatStreamUrl,
  refreshChatAdmin,
  useAdminMessages,
  useAdminThreads,
  type ChatMessage,
  type ChatThread,
} from "@/lib/api-nest"
import { MessagesSquare, Search, Trash2, Stethoscope, Phone, Circle, Video } from "lucide-react"
import { DailyCall } from "@/components/video/daily-call"

function fmtClock(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === yest.toDateString()) return "Yesterday"
  return d.toLocaleDateString([], { day: "2-digit", month: "short" })
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

  // Auto-select first thread
  useEffect(() => {
    if (!activeId && threads && threads.length > 0) setActiveId(threads[0].id)
  }, [threads, activeId])

  // SSE: live updates for the whole admin
  useEffect(() => {
    if (typeof window === "undefined") return
    const es = new EventSource(chatStreamUrl("admin"))
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data)
        if (p.type === "message") {
          globalMutate(
            `/chat/admin/threads/${p.threadId}/messages`,
            (prev: ChatMessage[] | undefined) =>
              prev ? [...prev.filter(m => m.id !== p.message.id), p.message] : [p.message],
            { revalidate: false },
          )
          globalMutate("/chat/admin/threads")
        }
        if (p.type === "thread") {
          globalMutate("/chat/admin/threads")
        }
        if (p.type === "deleted") {
          globalMutate("/chat/admin/threads")
        }
      } catch { /* ping */ }
    }
    es.onerror = () => { /* auto-reconnect */ }
    return () => es.close()
  }, [])

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

  const send = async (text: string) => {
    if (!activeId) return
    await apiChat.sendAsStaff(activeId, text)
    await refreshChatAdmin(activeId)
  }

  const remove = async () => {
    if (!activeId) return
    if (!confirm("Delete this conversation? This cannot be undone.")) return
    await apiChat.deleteThread(activeId)
    setActiveId(null)
    await refreshChatAdmin()
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 rounded-xl border border-border overflow-hidden bg-background h-[72vh] min-h-[520px]">
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
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left px-3 py-3 border-b border-border flex items-start gap-3 transition-colors ${
                      isActive ? "bg-secondary" : "hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "#3D0814" }}
                    >
                      {initials}
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
                          {t.lastSender === "staff" && <span className="opacity-70">You: </span>}
                          {t.lastMessage || <em className="opacity-60">No messages yet</em>}
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
                      <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500" />
                      Active chat
                      {active.patientPhone && (
                        <>
                          <span className="opacity-40">·</span>
                          <Phone className="h-3 w-3" /> {active.patientPhone}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setCallMode("voice")}
                    className="text-xs font-semibold inline-flex items-center gap-1 px-2 h-8 rounded-md hover:bg-secondary"
                    style={{ color: "#3D0814" }}
                    title="Start voice call"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCallMode("video")}
                    className="text-xs font-semibold text-white inline-flex items-center gap-1.5 px-3 h-8 rounded-md hover:opacity-90"
                    style={{ background: "#B91C1C" }}
                    title="Start video call"
                  >
                    <Video className="h-3.5 w-3.5" /> Video call
                  </button>
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
          onLeave={() => setCallMode(null)}
          onSwitchToChat={() => setCallMode(null)}
        />
      )}
    </AdminShell>
  )
}

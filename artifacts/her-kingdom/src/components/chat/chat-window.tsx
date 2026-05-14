"use client"

import { useEffect, useRef, useState } from "react"
import { Send, Check, CheckCheck, Stethoscope, User as UserIcon } from "lucide-react"
import type { ChatMessage, ChatSender } from "@/lib/api-nest"

const WINE = "#3D0814"
const ACCENT = "#F97316"

const PATIENT_BUBBLE = "#FAE0BE"   // peach
const STAFF_BUBBLE = "#FFFFFF"     // white card
const CHAT_BG = "#FFFBF5"          // cream
const TIME_COLOR = "rgba(0,0,0,0.45)"

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function fmtDay(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yest.toDateString()) return "Yesterday"
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })
}

export function ChatWindow({
  messages,
  perspective,
  onSend,
  composerDisabled,
  composerHint,
  emptyState,
  showStatus = true,
}: {
  messages: ChatMessage[]
  perspective: ChatSender                       // who is "me" in this view
  onSend: (text: string) => Promise<void> | void
  composerDisabled?: boolean
  composerHint?: string
  emptyState?: React.ReactNode
  showStatus?: boolean
}) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onSend(t)
      setText("")
    } finally {
      setSending(false)
    }
  }

  // Group messages by day
  const groups: Array<{ day: string; items: ChatMessage[] }> = []
  messages.forEach((m) => {
    const day = fmtDay(m.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(m)
    else groups.push({ day, items: [m] })
  })

  return (
    <div className="flex flex-col h-full" style={{ background: CHAT_BG }}>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4"
        style={{
          backgroundImage:
            "radial-gradient(rgba(61,8,20,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            {emptyState || (
              <div className="text-center text-sm text-muted-foreground max-w-xs">
                No messages yet. Say hello — a pharmacist will reply shortly.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {groups.map((g, gi) => (
              <div key={gi} className="space-y-2">
                <div className="flex justify-center">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ background: "rgba(61,8,20,0.08)", color: WINE }}
                  >
                    {g.day}
                  </span>
                </div>
                {g.items.map((m) => {
                  const mine = m.sender === perspective
                  const bubbleBg = mine ? PATIENT_BUBBLE : STAFF_BUBBLE
                  // For staff perspective: their own bubble = wine accent
                  const myStaff = mine && perspective === "staff"
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {!mine && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: m.sender === "staff" ? WINE : ACCENT }}
                          title={m.sender === "staff" ? (m.authorName || "Pharmacist") : "Patient"}
                        >
                          {m.sender === "staff" ? <Stethoscope className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                        </div>
                      )}
                      <div
                        className="max-w-[78%] sm:max-w-[60%] rounded-2xl px-3.5 py-2 shadow-sm"
                        style={{
                          background: myStaff ? WINE : bubbleBg,
                          color: myStaff ? "#fff" : "#1A1A1A",
                          borderTopRightRadius: mine ? 4 : 16,
                          borderTopLeftRadius: !mine ? 4 : 16,
                          border: !myStaff && !mine ? "1px solid rgba(0,0,0,0.04)" : "none",
                        }}
                      >
                        {!mine && m.authorName && m.sender === "staff" && (
                          <div className="text-[11px] font-semibold mb-0.5" style={{ color: WINE }}>
                            {m.authorName}
                          </div>
                        )}
                        <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                          {m.text}
                        </p>
                        <div
                          className="flex items-center justify-end gap-1 mt-1 text-[10px]"
                          style={{ color: myStaff ? "rgba(255,255,255,0.7)" : TIME_COLOR }}
                        >
                          <span>{fmtTime(m.createdAt)}</span>
                          {mine && showStatus && (
                            m.status === "read"
                              ? <CheckCheck className="h-3 w-3" style={{ color: myStaff ? "#FFD7A6" : ACCENT }} />
                              : m.status === "delivered"
                                ? <CheckCheck className="h-3 w-3 opacity-70" />
                                : <Check className="h-3 w-3 opacity-70" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={submit}
        className="border-t bg-white px-3 sm:px-4 py-2.5 flex items-center gap-2"
        style={{ borderColor: "rgba(61,8,20,0.1)" }}
      >
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder={composerDisabled ? composerHint || "Sign in to chat" : "Type a message…"}
          disabled={composerDisabled || sending}
          className="flex-1 resize-none px-4 py-2 rounded-2xl border bg-white text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderColor: "rgba(61,8,20,0.15)",
            maxHeight: 120,
          }}
        />
        <button
          type="submit"
          disabled={composerDisabled || sending || !text.trim()}
          className="h-10 w-10 rounded-full flex items-center justify-center text-white shadow-sm disabled:opacity-40 transition-opacity"
          style={{ background: text.trim() ? WINE : "#9CA3AF" }}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

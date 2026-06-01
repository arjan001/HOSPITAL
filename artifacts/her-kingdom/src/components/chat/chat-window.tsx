"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "wouter"
import { Send, Check, CheckCheck, Stethoscope, User as UserIcon, Paperclip, FileText, Loader2, ChevronDown, Pill, ShieldCheck, ChevronRight } from "lucide-react"
import { isSafeAttachmentUrl, type ChatMessage, type ChatPrescriptionDrug, type ChatSender } from "@/lib/api-nest"
import { playChime } from "@/lib/notify-sound"

const WINE = "#3D0814"
const ACCENT = "#F97316"

const PATIENT_BUBBLE = "#FAE0BE"   // peach
const STAFF_BUBBLE = "#FFFFFF"     // white card
const CHAT_BG = "#FFFBF5"          // cream
const TIME_COLOR = "rgba(0,0,0,0.45)"

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024 // 8MB

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

/** Slugify a drug name for the /shop search fallback when no productSlug. */
function searchHref(name: string) {
  return `/shop?search=${encodeURIComponent(name)}`
}

/**
 * Rich prescription card rendered in-thread when a doctor issues a prescription.
 * Each drug links to its product page (or a /shop search fallback) so the
 * patient can tap straight through to buy. Shown to both perspectives.
 */
function PrescriptionCard({
  rxNumber,
  drugs,
  mine,
}: {
  rxNumber?: string
  drugs: ChatPrescriptionDrug[]
  mine: boolean
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm w-full"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(61,8,20,0.12)",
        borderTopRightRadius: mine ? 4 : 16,
        borderTopLeftRadius: !mine ? 4 : 16,
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2"
        style={{ background: WINE, color: "#fff" }}
      >
        <ShieldCheck className="h-4 w-4 flex-shrink-0" style={{ color: "#FFD7A6" }} />
        <span className="text-xs font-bold tracking-wide">Prescription issued</span>
        {rxNumber && (
          <span className="ml-auto text-[10px] font-semibold tabular-nums opacity-90">
            {rxNumber}
          </span>
        )}
      </div>
      <ul className="divide-y" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        {drugs.map((d, i) => {
          const href = d.productSlug ? `/product/${d.productSlug}` : searchHref(d.name)
          return (
            <li key={`${d.name}-${i}`}>
              <Link
                href={href}
                className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-secondary/50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(61,8,20,0.06)" }}
                >
                  <Pill className="h-4 w-4" style={{ color: WINE }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate" style={{ color: "#1A1A1A" }}>
                    {d.name}
                  </p>
                  {(d.dosage || d.instructions) && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[d.dosage, d.instructions].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {typeof d.price === "number" && d.price > 0 && (
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: ACCENT }}>
                    KSh {d.price.toLocaleString()}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="px-3.5 py-2 text-[10px] text-muted-foreground" style={{ background: "#FFFBF5" }}>
        Tap a medicine to view it and add to your cart.
      </div>
    </div>
  )
}

export function ChatWindow({
  messages,
  perspective,
  onSend,
  onSendAttachment,
  onTyping,
  typing = false,
  typingLabel,
  composerDisabled,
  composerHint,
  emptyState,
  showStatus = true,
  soundOnIncoming = false,
}: {
  messages: ChatMessage[]
  perspective: ChatSender                       // who is "me" in this view
  onSend: (text: string) => Promise<void> | void
  onSendAttachment?: (file: File) => Promise<void> | void
  onTyping?: (isTyping: boolean) => void
  typing?: boolean                              // is the OTHER party typing?
  typingLabel?: string
  composerDisabled?: boolean
  composerHint?: string
  emptyState?: React.ReactNode
  showStatus?: boolean
  /** Play a chime when a new message arrives from the other party. */
  soundOnIncoming?: boolean
}) {
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [showJump, setShowJump] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const atBottomRef = useRef(true)
  const lastCountRef = useRef(messages.length)

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
    atBottomRef.current = true
    setShowJump(false)
  }

  // WhatsApp-style scroll: only the message list scrolls. We auto-stick to the
  // bottom when the reader is already there; if they've scrolled up to read
  // history, a new message surfaces a "jump to latest" pill instead of yanking
  // them down.
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = distance < 120
    atBottomRef.current = near
    if (near) setShowJump(false)
  }

  useEffect(() => {
    const grew = messages.length > lastCountRef.current
    lastCountRef.current = messages.length
    if (atBottomRef.current) {
      scrollToBottom()
    } else if (grew) {
      const last = messages[messages.length - 1]
      if (last && last.sender !== perspective) setShowJump(true)
    }
  }, [messages.length, perspective])

  useEffect(() => {
    if (typing && atBottomRef.current) scrollToBottom()
  }, [typing])

  // Chime on a newly-arrived message from the other party. We gate on the
  // component mount time rather than "first non-empty render" so that an
  // initially-empty thread still rings on its first live message, while
  // history hydration (older timestamps) stays silent.
  const lastChimeIdRef = useRef<string | null>(null)
  const mountedAtRef = useRef<number>(Date.now())
  useEffect(() => {
    if (!soundOnIncoming) return
    const last = messages[messages.length - 1]
    if (!last) return
    if (last.id === lastChimeIdRef.current) return
    lastChimeIdRef.current = last.id
    if (last.sender === perspective) return
    // Only ring for messages that arrived after this view mounted; history
    // loaded on open carries older timestamps and must not chime.
    const t = new Date(last.createdAt).getTime()
    if (Number.isFinite(t) && t < mountedAtRef.current - 1000) return
    playChime("message")
  }, [messages, soundOnIncoming, perspective])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      await onSend(t)
      setText("")
      onTyping?.(false)
    } finally {
      setSending(false)
    }
  }

  const pickFile = () => {
    if (composerDisabled || uploading) return
    fileRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file || !onSendAttachment) return
    setAttachError(null)
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError("File is too large (max 8MB).")
      return
    }
    setUploading(true)
    try {
      await onSendAttachment(file)
    } catch {
      setAttachError("Upload failed. Please try again.")
    } finally {
      setUploading(false)
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
    <div className="flex flex-col h-full min-h-0 relative" style={{ background: CHAT_BG }}>
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4"
        style={{
          backgroundImage:
            "radial-gradient(rgba(61,8,20,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {messages.length === 0 && !typing ? (
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
                  const safeUrl = isSafeAttachmentUrl(m.attachmentUrl) ? m.attachmentUrl : undefined
                  const hasImage = !!safeUrl && m.attachmentType === "image"
                  const hasFile = !!safeUrl && m.attachmentType !== "image"
                  const rx =
                    m.meta && (m.meta as { kind?: string }).kind === "prescription"
                      ? (m.meta as { rxNumber?: string; drugs?: ChatPrescriptionDrug[] })
                      : null
                  if (rx && Array.isArray(rx.drugs) && rx.drugs.length > 0) {
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"} items-end gap-2`}
                      >
                        {!mine && (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: WINE }}
                            title={m.authorName || "Pharmacist"}
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="max-w-[88%] sm:max-w-[68%] w-full">
                          <PrescriptionCard rxNumber={rx.rxNumber} drugs={rx.drugs} mine={mine} />
                          <div
                            className="flex items-center justify-end gap-1 mt-1 text-[10px] px-1"
                            style={{ color: TIME_COLOR }}
                          >
                            <span>{fmtTime(m.createdAt)}</span>
                            {mine && showStatus && (
                              m.status === "read"
                                ? <CheckCheck className="h-3 w-3" style={{ color: ACCENT }} />
                                : m.status === "delivered"
                                  ? <CheckCheck className="h-3 w-3 opacity-70" />
                                  : <Check className="h-3 w-3 opacity-70" />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
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
                        {hasImage && (
                          <a href={safeUrl} target="_blank" rel="noreferrer" className="block mb-1">
                            <img
                              src={safeUrl}
                              alt={m.attachmentName || "Image attachment"}
                              className="rounded-lg max-h-64 w-auto object-cover"
                              style={{ maxWidth: "100%" }}
                            />
                          </a>
                        )}
                        {hasFile && (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg"
                            style={{
                              background: myStaff ? "rgba(255,255,255,0.12)" : "rgba(61,8,20,0.06)",
                              color: myStaff ? "#fff" : WINE,
                            }}
                          >
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-xs font-medium truncate">{m.attachmentName || "Attachment"}</span>
                          </a>
                        )}
                        {m.text && (
                          <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                            {m.text}
                          </p>
                        )}
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

            {/* Typing indicator (other party) */}
            {typing && (
              <div className="flex justify-start items-end gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: perspective === "patient" ? WINE : ACCENT }}
                >
                  {perspective === "patient" ? <Stethoscope className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                </div>
                <div
                  className="rounded-2xl px-3.5 py-2.5 shadow-sm flex items-center gap-1"
                  style={{ background: STAFF_BUBBLE, borderTopLeftRadius: 4, border: "1px solid rgba(0,0,0,0.04)" }}
                  aria-label={typingLabel || "Typing"}
                >
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute left-1/2 -translate-x-1/2 bottom-20 z-20 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-white text-xs font-semibold shadow-lg transition-opacity hover:opacity-90"
          style={{ background: WINE }}
        >
          <ChevronDown className="h-3.5 w-3.5" /> New messages
        </button>
      )}

      {attachError && (
        <div className="px-4 py-1.5 text-[11px] text-center" style={{ color: "#B91C1C", background: "#FEF2F2" }}>
          {attachError}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={submit}
        className="border-t bg-white px-3 sm:px-4 py-2.5 flex items-center gap-2"
        style={{ borderColor: "rgba(61,8,20,0.1)" }}
      >
        {onSendAttachment && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              onClick={pickFile}
              disabled={composerDisabled || uploading}
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:bg-gray-100 transition-colors"
              style={{ color: WINE }}
              aria-label="Attach a file"
              title="Attach an image or PDF"
            >
              {uploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Paperclip className="h-4.5 w-4.5" />}
            </button>
          </>
        )}
        <textarea
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onTyping?.(e.target.value.trim().length > 0)
          }}
          onBlur={() => onTyping?.(false)}
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

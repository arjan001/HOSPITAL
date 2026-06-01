"use client"

import { useEffect, useRef, useState } from "react"
import { mutate as globalMutate } from "swr"
import { AccountShell } from "@/components/account/account-shell"
import { ChatWindow } from "@/components/chat/chat-window"
import { Seo } from "@/components/seo"
import {
  apiChat,
  apiUploads,
  chatStreamUrl,
  foldChatMessage,
  refreshChatPatient,
  useMyMessages,
  useMyThread,
  type ChatMessage,
  type ChatThread,
} from "@/lib/api-nest"
import { useUser } from "@clerk/react"
import { ShieldCheck, Stethoscope, MessageCircle, Wifi, Info } from "lucide-react"
import { SessionTimer } from "@/components/consultation/session-timer"
import {
  useConsultationSettings,
  formatOverageLabel,
  logOverageCharge,
} from "@/lib/consultation-settings"

const WINE = "#3D0814"

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

export default function AccountChatPage() {
  const { user, isSignedIn } = useUser()
  const { data: thread } = useMyThread()
  const { data: messages } = useMyMessages()

  // Presence + typing of the pharmacy team (staff)
  const [staffOnline, setStaffOnline] = useState(false)
  const [staffLastSeen, setStaffLastSeen] = useState<string | null>(null)
  const [staffTyping, setStaffTyping] = useState(false)
  const typingClearRef = useRef<number | null>(null)

  // Outbound typing throttle
  const lastTypingSentRef = useRef(0)
  const typingStopRef = useRef<number | null>(null)
  // True briefly while the patient ends their own session, so the archived
  // thread event it triggers isn't mislabelled as "the pharmacist ended it".
  const closingByPatientRef = useRef(false)

  // Consultation timer (chat window). Starts when the patient opens the page;
  // a hard "confirm overage or end" modal fires when it expires.
  const [consultSettings] = useConsultationSettings()
  const [elapsed, setElapsed] = useState(0)
  const [extensionsSec, setExtensionsSec] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [endedByDoctor, setEndedByDoctor] = useState(false)
  const startMsRef = useRef<number>(Date.now())
  useEffect(() => {
    if (sessionEnded) return
    // Wall-clock arithmetic — survives background-tab throttling.
    const tick = () => setElapsed(Math.floor((Date.now() - startMsRef.current) / 1000))
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [sessionEnded])
  const chatMaxSec = consultSettings.chatDurationMin * 60 + extensionsSec

  // SSE for true realtime push
  useEffect(() => {
    if (typeof window === "undefined") return
    const es = new EventSource(chatStreamUrl("me"), { withCredentials: true })
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload.type === "message") {
          globalMutate("/chat/me/messages", (prev: ChatMessage[] | undefined) =>
            foldChatMessage(prev, payload.message), { revalidate: false })
        }
        if (payload.type === "thread") {
          globalMutate("/chat/me", payload.thread, { revalidate: false })
          if (payload.thread?.status === "archived") {
            // Only call it a pharmacist-ended session if the patient didn't
            // close it themselves (their own close also archives the thread).
            if (!closingByPatientRef.current) setEndedByDoctor(true)
            setSessionEnded(true)
            setStaffTyping(false)
          }
        }
        if (payload.type === "read" && payload.by === "staff") {
          // Pharmacist read the conversation → advance my ticks to read.
          globalMutate("/chat/me/messages", (prev: ChatMessage[] | undefined) =>
            prev ? prev.map(m => m.sender === "patient" ? { ...m, status: "read" as const } : m) : prev,
          { revalidate: false })
        }
        if (payload.type === "typing" && payload.who === "staff") {
          setStaffTyping(!!payload.isTyping)
          if (typingClearRef.current) window.clearTimeout(typingClearRef.current)
          if (payload.isTyping) {
            typingClearRef.current = window.setTimeout(() => setStaffTyping(false), 5000)
          }
        }
        if (payload.type === "presence" && payload.presence?.who === "staff") {
          setStaffOnline(!!payload.presence.online)
          setStaffLastSeen(payload.presence.lastSeen ?? null)
        }
      } catch { /* ignore ping or parse error */ }
    }
    es.onerror = () => { /* browser will auto-reconnect */ }
    return () => {
      es.close()
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current)
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
    }
  }, [])

  // Mark as read when patient opens the page
  useEffect(() => {
    if (!thread || thread.unreadByPatient === 0) return
    apiChat.markPatientRead().then(() => refreshChatPatient()).catch(() => {})
  }, [thread?.id, thread?.unreadByPatient])

  // If the thread is already archived when the page loads (doctor ended it
  // while the patient was away), lock the composer immediately so they can't
  // type into — and silently reopen — an ended consultation.
  useEffect(() => {
    if (thread?.status === "archived") setSessionEnded(true)
  }, [thread?.status])

  const userName = user?.fullName || user?.firstName || "Patient"
  const userPhone = user?.primaryPhoneNumber?.phoneNumber || ""

  const send = async (text: string) => {
    await apiChat.sendAsPatient(text, { name: userName, phone: userPhone })
    await refreshChatPatient()
  }

  const sendAttachment = async (file: File) => {
    const up = await apiUploads.putFile(file, "consultations")
    await apiChat.sendAsPatient(
      "",
      { name: userName, phone: userPhone },
      {
        attachmentUrl: up.url,
        attachmentName: file.name,
        attachmentType: file.type.startsWith("image/") ? "image" : "file",
      },
    )
    await refreshChatPatient()
  }

  const handleTyping = (isTyping: boolean) => {
    if (!isSignedIn || sessionEnded) return
    if (isTyping) {
      const now = Date.now()
      if (now - lastTypingSentRef.current > 1800) {
        lastTypingSentRef.current = now
        apiChat.setPatientTyping(true).catch(() => {})
      }
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      typingStopRef.current = window.setTimeout(() => {
        apiChat.setPatientTyping(false).catch(() => {})
        lastTypingSentRef.current = 0
      }, 3000)
    } else {
      if (typingStopRef.current) window.clearTimeout(typingStopRef.current)
      lastTypingSentRef.current = 0
      apiChat.setPatientTyping(false).catch(() => {})
    }
  }

  const sendTest = async () => {
    await apiChat.testAsPatient({ name: userName, phone: userPhone })
    await refreshChatPatient()
  }

  const userInfo = {
    name: userName,
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: userPhone,
  }

  return (
    <AccountShell title="Talk to a pharmacist" subtitle="Live chat with our verified pharmacy team" user={userInfo}>
      <Seo
        title="Chat with a Pharmacist — Shaniid RX"
        description="Private, real-time chat with the Shaniid RX pharmacy team."
        canonicalPath="/account/chat"
        noindex
      />
      <div className="rounded-2xl overflow-hidden border bg-white" style={{ borderColor: "#F2DCC8" }}>
        <ChatHeader
          online={staffOnline}
          lastSeen={staffLastSeen}
          typing={staffTyping}
          thread={thread}
          timerSlot={
            isSignedIn && !sessionEnded ? (
              <SessionTimer
                maxDurationSec={chatMaxSec}
                elapsedSec={elapsed}
                warnAtSecondsLeft={consultSettings.warnSecondsLeft}
                overageLabel={formatOverageLabel(consultSettings)}
                overageBlockMin={consultSettings.overageBlockMin}
                onConfirmOverage={() => {
                  setExtensionsSec((e) => e + consultSettings.overageBlockMin * 60)
                  logOverageCharge({
                    kind: "chat",
                    roomOrThread: thread?.id || "patient-chat",
                    blockMin: consultSettings.overageBlockMin,
                    amountKes: consultSettings.overageRateKes,
                    patient: userName,
                  })
                }}
                onEnd={() => {
                  setSessionEnded(true)
                  closingByPatientRef.current = true
                  // Preserve the transcript as a saved consultation record.
                  apiChat.closeMyThread().catch(() => {})
                }}
                compact
              />
            ) : null
          }
        />
        {endedByDoctor && (
          <div
            className="px-4 py-3 border-t flex items-start gap-2 text-sm"
            style={{ background: "#FEF2F2", borderColor: "#F2DCC8", color: "#B91C1C" }}
          >
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              The pharmacist has ended this consultation. Your conversation is saved — you can
              start a new chat anytime.
            </span>
          </div>
        )}
        <div className="h-[60vh] min-h-[480px]">
          <ChatWindow
            messages={messages || []}
            perspective="patient"
            onSend={send}
            onSendAttachment={isSignedIn && !sessionEnded ? sendAttachment : undefined}
            onTyping={handleTyping}
            typing={staffTyping}
            typingLabel="Pharmacist is typing"
            soundOnIncoming
            composerDisabled={!isSignedIn || sessionEnded}
            composerHint={
              endedByDoctor
                ? "The pharmacist has ended this consultation. Start a new chat to continue."
                : sessionEnded
                ? "Consultation ended. Start a new chat to continue."
                : "Sign in to start chatting"
            }
            emptyState={<EmptyState />}
          />
        </div>
        {isSignedIn && !sessionEnded && (
          <div className="px-4 py-2 border-t bg-white flex items-center justify-end" style={{ borderColor: "#F2DCC8" }}>
            <button
              onClick={sendTest}
              className="text-[11px] font-semibold inline-flex items-center gap-1.5 px-3 h-7 rounded-full transition-colors hover:bg-gray-50"
              style={{ color: WINE, border: "1px solid rgba(61,8,20,0.15)" }}
              title="Send a test message to confirm the chat is connected"
            >
              <Wifi className="h-3 w-3" /> Send test message
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        <Tip icon={<ShieldCheck className="h-4 w-4" />} title="Private & secure">
          Your conversation stays between you and our pharmacy team.
        </Tip>
        <Tip icon={<Stethoscope className="h-4 w-4" />} title="Verified pharmacists">
          Replies come from licensed staff, not bots.
        </Tip>
        <Tip icon={<MessageCircle className="h-4 w-4" />} title="Reply anytime">
          We typically respond within minutes during 8am–10pm EAT.
        </Tip>
      </div>
    </AccountShell>
  )
}

function ChatHeader({
  thread,
  timerSlot,
  online,
  lastSeen,
  typing,
}: {
  thread: ChatThread | undefined
  timerSlot?: React.ReactNode
  online: boolean
  lastSeen: string | null
  typing: boolean
}) {
  const statusText = typing
    ? "typing…"
    : online
      ? "Online · usually replies within minutes"
      : fmtLastSeen(lastSeen)
  return (
    <div className="px-4 sm:px-5 py-3 flex items-center gap-3 border-b" style={{ background: WINE, color: "white", borderColor: "rgba(0,0,0,0.06)" }}>
      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">Shaniid RX Pharmacy</p>
        <p className="text-[11px] opacity-80 flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: online ? "#34d399" : "rgba(255,255,255,0.4)" }}
          />
          {statusText}
        </p>
      </div>
      {timerSlot}
      {thread?.unreadByPatient ? (
        <span className="text-[11px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
          {thread.unreadByPatient} new
        </span>
      ) : null}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center max-w-sm space-y-2">
      <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(61,8,20,0.08)", color: WINE }}>
        <Stethoscope className="h-6 w-6" />
      </div>
      <p className="font-semibold" style={{ color: WINE }}>Start a conversation</p>
      <p className="text-sm text-muted-foreground">
        Ask about a prescription, side effects, dosage, refills — anything. A licensed pharmacist will reply.
      </p>
    </div>
  )
}

function Tip({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3.5 bg-white" style={{ borderColor: "#F2DCC8" }}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: WINE }}>
        {icon}{title}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">{children}</p>
    </div>
  )
}

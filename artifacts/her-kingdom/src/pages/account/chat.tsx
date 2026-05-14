"use client"

import { useEffect, useState } from "react"
import { mutate as globalMutate } from "swr"
import { AccountShell } from "@/components/account/account-shell"
import { ChatWindow } from "@/components/chat/chat-window"
import {
  apiChat,
  chatStreamUrl,
  refreshChatPatient,
  useMyMessages,
  useMyThread,
  type ChatMessage,
  type ChatThread,
} from "@/lib/api-nest"
import { useUser } from "@clerk/react"
import { ShieldCheck, Stethoscope, MessageCircle } from "lucide-react"

const WINE = "#3D0814"

export default function AccountChatPage() {
  const { user, isSignedIn } = useUser()
  const { data: thread } = useMyThread()
  const { data: messages } = useMyMessages()

  // SSE for true realtime push
  useEffect(() => {
    if (typeof window === "undefined") return
    const es = new EventSource(chatStreamUrl("me"), { withCredentials: true })
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload.type === "message") {
          globalMutate("/chat/me/messages", (prev: ChatMessage[] | undefined) =>
            prev ? [...prev.filter(m => m.id !== payload.message.id), payload.message] : [payload.message],
          { revalidate: false })
        }
        if (payload.type === "thread") {
          globalMutate("/chat/me", payload.thread, { revalidate: false })
        }
      } catch { /* ignore ping or parse error */ }
    }
    es.onerror = () => { /* browser will auto-reconnect */ }
    return () => es.close()
  }, [])

  // Mark as read when patient opens the page
  useEffect(() => {
    if (!thread || thread.unreadByPatient === 0) return
    apiChat.markPatientRead().then(() => refreshChatPatient()).catch(() => {})
  }, [thread?.id, thread?.unreadByPatient])

  const userName = user?.fullName || user?.firstName || "Patient"
  const userPhone = user?.primaryPhoneNumber?.phoneNumber || ""

  const send = async (text: string) => {
    await apiChat.sendAsPatient(text, { name: userName, phone: userPhone })
    await refreshChatPatient()
  }

  const userInfo = {
    name: userName,
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: userPhone,
  }

  return (
    <AccountShell title="Talk to a pharmacist" subtitle="Live chat with our verified pharmacy team" user={userInfo}>
      <div className="rounded-2xl overflow-hidden border bg-white" style={{ borderColor: "#F2DCC8" }}>
        <ChatHeader thread={thread} />
        <div className="h-[60vh] min-h-[480px]">
          <ChatWindow
            messages={messages || []}
            perspective="patient"
            onSend={send}
            composerDisabled={!isSignedIn}
            composerHint="Sign in to start chatting"
            emptyState={<EmptyState />}
          />
        </div>
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

function ChatHeader({ thread }: { thread: ChatThread | undefined }) {
  return (
    <div className="px-4 sm:px-5 py-3 flex items-center gap-3 border-b" style={{ background: WINE, color: "white", borderColor: "rgba(0,0,0,0.06)" }}>
      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">Shaniid RX Pharmacy</p>
        <p className="text-[11px] opacity-80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Online · usually replies within minutes
        </p>
      </div>
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

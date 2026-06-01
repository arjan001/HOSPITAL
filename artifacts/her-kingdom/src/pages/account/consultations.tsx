"use client"

import { useState } from "react"
import { Link } from "wouter"
import useSWR from "swr"
import { AccountShell } from "@/components/account/account-shell"
import { ChatWindow } from "@/components/chat/chat-window"
import { Seo } from "@/components/seo"
import {
  apiChat,
  useMyConsultations,
  type ChatMessage,
  type ConsultationSummary,
} from "@/lib/api-nest"
import { useUser } from "@clerk/react"
import {
  MessagesSquare,
  ChevronRight,
  ChevronLeft,
  Pill,
  Clock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT_ORG = "#F97316"
const ACCENT_RED = "#B91C1C"
const PEACH_BORDER = "#F2DCC8"
const PEACH_TINT = "#FFF1E6"

function fmtDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
}
function fmtTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

/** Friendly label + colour for a consultation's lifecycle state. */
function statusBadge(c: ConsultationSummary): { label: string; bg: string; fg: string } {
  const live = c.threadStatus === "active" && c.status !== "completed"
  if (live) return { label: "Active", bg: "#DCFCE7", fg: "#166534" }
  return { label: "Completed", bg: "#F1F5F9", fg: "#475569" }
}

function TranscriptView({ consultationId }: { consultationId: string }) {
  const { data, isLoading } = useSWR<ChatMessage[]>(
    `/chat/me/consultations/${consultationId}/messages`,
    () => apiChat.myConsultationMessages(consultationId),
  )
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: WINE, borderTopColor: "transparent" }}
        />
      </div>
    )
  }
  return (
    <div className="h-[60vh] min-h-[420px]">
      <ChatWindow
        messages={data || []}
        perspective="patient"
        onSend={() => {}}
        composerDisabled
        composerHint="This is a saved transcript. Start a new consultation to chat again."
        showStatus={false}
        emptyState={
          <div className="text-center text-sm text-muted-foreground py-10">
            No messages were exchanged in this consultation.
          </div>
        }
      />
    </div>
  )
}

function ConsultationRow({
  c,
  onOpen,
}: {
  c: ConsultationSummary
  onOpen: () => void
}) {
  const badge = statusBadge(c)
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border bg-white px-4 py-4 transition-shadow hover:shadow-md"
      style={{ borderColor: PEACH_BORDER }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: PEACH_TINT, color: WINE }}
        >
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: WINE }}>
              {c.type === "chat" ? "Chat consultation" : "Consultation"}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
            {c.prescriptionCount > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "#FEF3C7", color: "#92400E" }}
              >
                <Pill className="h-3 w-3" />
                {c.prescriptionCount} prescribed
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {c.lastMessage || "No messages yet"}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtDate(c.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessagesSquare className="h-3 w-3" />
              {c.messageCount} {c.messageCount === 1 ? "message" : "messages"}
            </span>
            <span className="font-mono opacity-70">{c.id}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </button>
  )
}

export default function AccountConsultationsPage() {
  const { user } = useUser()
  const { data: consultations, isLoading } = useMyConsultations()
  const [active, setActive] = useState<ConsultationSummary | null>(null)

  const userInfo = {
    name: user?.fullName || user?.firstName || "Patient",
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: user?.primaryPhoneNumber?.phoneNumber || "",
  }

  return (
    <AccountShell
      title="Past consultations"
      subtitle="Every conversation with our pharmacy team — saved for your records"
      user={userInfo}
    >
      <Seo
        title="Past Consultations — Shaniid RX"
        description="Review your previous chat consultations and any prescriptions issued."
        canonicalPath="/account/consultations"
        noindex
      />

      {active ? (
        <div className="rounded-2xl overflow-hidden border bg-white" style={{ borderColor: PEACH_BORDER }}>
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${PEACH_BORDER}` }}
          >
            <button
              onClick={() => setActive(null)}
              className="inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: WINE }}
            >
              <ChevronLeft className="h-4 w-4" /> All consultations
            </button>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold font-mono"
              style={{ background: PEACH_TINT, color: WINE }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {active.id}
            </span>
          </div>
          <TranscriptView consultationId={active.id} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {consultations?.length
                ? `${consultations.length} consultation${consultations.length === 1 ? "" : "s"}`
                : ""}
            </p>
            <Link
              href="/speak-to-a-doctor"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)` }}
            >
              <MessagesSquare className="h-4 w-4" /> Start new consultation
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: WINE, borderTopColor: "transparent" }}
              />
            </div>
          ) : consultations && consultations.length > 0 ? (
            <div className="space-y-3">
              {consultations.map((c) => (
                <ConsultationRow key={c.id} c={c} onOpen={() => setActive(c)} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-white px-6 py-16 text-center"
              style={{ borderColor: PEACH_BORDER }}
            >
              <div
                className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center"
                style={{ background: PEACH_TINT, color: WINE }}
              >
                <MessagesSquare className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold" style={{ color: WINE }}>
                No consultations yet
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                When you chat with our pharmacy team, your conversations will appear here.
              </p>
              <Link
                href="/speak-to-a-doctor"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)` }}
              >
                <Stethoscope className="h-4 w-4" /> Speak to a doctor
              </Link>
            </div>
          )}
        </div>
      )}
    </AccountShell>
  )
}

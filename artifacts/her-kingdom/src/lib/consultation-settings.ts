"use client"

import { useCmsDoc } from "@/lib/cms-store"
import { cmsStore } from "@/lib/cms-store"

export type ConsultationKind = "chat" | "video" | "voice"

export type StandbyDoctor = {
  /** Display name, e.g. "Dr. A. Ahmed". Surfaced on every consult screen. */
  name: string
  specialty: string
  yearsExperience: number
  /** 2-letter avatar fallback. Auto-derived when blank. */
  initials?: string
  /** Optional avatar image. Falls back to gradient + initials. */
  avatarUrl?: string
  /** Short bio shown on the booking & connect screens. */
  bio?: string
}

export type ConsultationSettings = {
  chatDurationMin: number
  videoDurationMin: number
  /** Base price the patient pays to start a chat consultation. */
  chatPriceKes: number
  /** Base price the patient pays to start a call / video consultation. */
  callPriceKes: number
  warnSecondsLeft: number
  overageRateKes: number
  overageBlockMin: number
  currency: string
  standbyDoctor: StandbyDoctor
}

export const CONSULTATION_DEFAULTS: ConsultationSettings = {
  chatDurationMin: 5,
  videoDurationMin: 10,
  chatPriceKes: 1000,
  callPriceKes: 1500,
  warnSecondsLeft: 60,
  overageRateKes: 200,
  overageBlockMin: 5,
  currency: "KES",
  standbyDoctor: {
    name: "Dr. On Call",
    specialty: "General Practice",
    yearsExperience: 8,
    initials: "",
    avatarUrl: "",
    bio: "A licensed clinician is always on standby for Shaniid RX consultations.",
  },
}

/** Two-letter avatar fallback derived from a name when none is set. */
export function deriveInitials(name: string): string {
  const parts = (name || "")
    .replace(/^Dr\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "DR"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Read the configured standby doctor with safe defaults applied. */
export function standbyDoctorOf(s: ConsultationSettings): Required<StandbyDoctor> {
  const d = { ...CONSULTATION_DEFAULTS.standbyDoctor, ...(s.standbyDoctor || {}) }
  return {
    name: d.name || CONSULTATION_DEFAULTS.standbyDoctor.name,
    specialty: d.specialty || CONSULTATION_DEFAULTS.standbyDoctor.specialty,
    yearsExperience: d.yearsExperience ?? CONSULTATION_DEFAULTS.standbyDoctor.yearsExperience,
    initials: (d.initials && d.initials.trim()) || deriveInitials(d.name || ""),
    avatarUrl: d.avatarUrl || "",
    bio: d.bio || CONSULTATION_DEFAULTS.standbyDoctor.bio!,
  }
}

export function useConsultationSettings() {
  const [raw, setRaw] = useCmsDoc<ConsultationSettings>(
    "consultation-settings",
    CONSULTATION_DEFAULTS,
  )
  const settings: ConsultationSettings = { ...CONSULTATION_DEFAULTS, ...(raw || {}) }
  return [settings, setRaw] as const
}

export function durationSecFor(kind: ConsultationKind, s: ConsultationSettings): number {
  if (kind === "chat") return Math.max(60, s.chatDurationMin * 60)
  return Math.max(60, s.videoDurationMin * 60)
}

export function formatOverageLabel(s: ConsultationSettings): string {
  return `${s.currency} ${s.overageRateKes} per ${s.overageBlockMin} extra minute${s.overageBlockMin === 1 ? "" : "s"}`
}

export type OverageEntry = {
  id: string
  at: string
  kind: ConsultationKind
  roomOrThread: string
  blockMin: number
  amountKes: number
  patient?: string
}

export function logOverageCharge(entry: Omit<OverageEntry, "id" | "at">): void {
  if (typeof window === "undefined") return
  try {
    const list = cmsStore.get<OverageEntry[]>("consultation-overages", [])
    const next: OverageEntry = {
      ...entry,
      id: `ov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
    }
    cmsStore.set("consultation-overages", [next, ...list].slice(0, 500))
  } catch { /* best-effort logging */ }
}

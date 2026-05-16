"use client"

import { useCmsDoc } from "@/lib/cms-store"
import { cmsStore } from "@/lib/cms-store"

export type ConsultationKind = "chat" | "video" | "voice"

export type ConsultationSettings = {
  chatDurationMin: number
  videoDurationMin: number
  warnSecondsLeft: number
  overageRateKes: number
  overageBlockMin: number
  currency: string
}

export const CONSULTATION_DEFAULTS: ConsultationSettings = {
  chatDurationMin: 5,
  videoDurationMin: 10,
  warnSecondsLeft: 60,
  overageRateKes: 200,
  overageBlockMin: 5,
  currency: "KES",
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

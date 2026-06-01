"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { Clock, MessagesSquare, Video, Wallet, AlertTriangle, RotateCcw, Save, UserRound, Image as ImageIcon } from "lucide-react"
import {
  useConsultationSettings,
  CONSULTATION_DEFAULTS,
  formatOverageLabel,
  deriveInitials,
  standbyDoctorOf,
  type ConsultationSettings,
  type StandbyDoctor,
} from "@/lib/consultation-settings"
import { notify } from "@/lib/notify"

const WINE = "#3D0814"
const ACCENT_ORG = "#F97316"

export function AdminConsultationSettings() {
  const [saved, setSaved] = useConsultationSettings()
  const [draft, setDraft] = useState<ConsultationSettings>(saved)
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  )

  const set = <K extends keyof ConsultationSettings>(k: K, v: ConsultationSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))
  const setDoc = <K extends keyof StandbyDoctor>(k: K, v: StandbyDoctor[K]) =>
    setDraft((d) => ({ ...d, standbyDoctor: { ...d.standbyDoctor, [k]: v } }))
  const previewDoc = standbyDoctorOf(draft)

  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  }

  const save = () => {
    setSaved(draft)
    notify.saved("Consultation settings saved")
  }
  const reset = () => {
    setDraft(saved)
    notify.info("Discarded unsaved changes")
  }
  const restore = () => {
    setDraft(CONSULTATION_DEFAULTS)
    notify.warning("Defaults restored — Save to apply")
  }

  return (
    <AdminShell title="Consultation Settings">
      <div className="space-y-5 max-w-3xl">
        {/* Header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-white to-[#FFFBF5] p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: WINE }}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Consultation Settings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Free time window for chat and video consultations, plus what happens when the timer runs out.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restore}
              className="h-9 px-3 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:text-foreground"
              title="Restore defaults"
            >
              <RotateCcw className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
              Defaults
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!dirty}
              className="h-9 px-3 rounded-md text-xs font-semibold border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="h-9 px-4 rounded-md text-xs font-bold text-white shadow-sm disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${WINE})` }}
            >
              <Save className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
              Save
            </button>
          </div>
        </div>

        {/* Standby doctor */}
        <Card
          title="Standby doctor"
          subtitle="The clinician shown on every consultation. Always on call — used as the default whenever no other doctor is assigned."
        >
          <div className="flex items-center gap-4 mb-3 p-3 rounded-lg bg-[#FFFBF5] border border-border">
            {previewDoc.avatarUrl ? (
              <img src={previewDoc.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${WINE})` }}
              >
                {previewDoc.initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{previewDoc.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {previewDoc.specialty} · {previewDoc.yearsExperience} yrs experience
              </p>
            </div>
            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              On call
            </span>
          </div>

          <Row icon={<UserRound className="h-4 w-4" />} label="Display name">
            <TextInput value={draft.standbyDoctor?.name ?? ""} onChange={(s) => setDoc("name", s)} placeholder="Dr. A. Ahmed" />
          </Row>
          <Row icon={<UserRound className="h-4 w-4" />} label="Specialty">
            <TextInput value={draft.standbyDoctor?.specialty ?? ""} onChange={(s) => setDoc("specialty", s)} placeholder="General Practice" />
          </Row>
          <Row icon={<Clock className="h-4 w-4" />} label="Years of experience">
            <NumberInput
              value={draft.standbyDoctor?.yearsExperience ?? 0}
              onChange={(s) => setDoc("yearsExperience", num(s, 0, 60, draft.standbyDoctor?.yearsExperience ?? 0))}
              suffix="years"
            />
          </Row>
          <Row icon={<UserRound className="h-4 w-4" />} label="Avatar initials (optional)">
            <TextInput
              value={draft.standbyDoctor?.initials ?? ""}
              onChange={(s) => setDoc("initials", s.slice(0, 3).toUpperCase())}
              placeholder={deriveInitials(draft.standbyDoctor?.name ?? "")}
            />
          </Row>
          <Row icon={<ImageIcon className="h-4 w-4" />} label="Avatar URL (optional)">
            <TextInput
              value={draft.standbyDoctor?.avatarUrl ?? ""}
              onChange={(s) => setDoc("avatarUrl", s)}
              placeholder="https://…/photo.jpg"
              wide
            />
          </Row>
        </Card>

        {/* Free window */}
        <Card title="Free window" subtitle="Default consultation duration shown on the booking page.">
          <Row icon={<MessagesSquare className="h-4 w-4" />} label="Chat consultation">
            <NumberInput
              value={draft.chatDurationMin}
              onChange={(s) => set("chatDurationMin", num(s, 1, 120, draft.chatDurationMin))}
              suffix="minutes"
            />
          </Row>
          <Row icon={<Video className="h-4 w-4" />} label="Video / voice consultation">
            <NumberInput
              value={draft.videoDurationMin}
              onChange={(s) => set("videoDurationMin", num(s, 1, 120, draft.videoDurationMin))}
              suffix="minutes"
            />
          </Row>
        </Card>

        {/* Consultation price */}
        <Card
          title="Consultation price"
          subtitle="What the patient pays up front to start a consultation. Charged once a doctor connects."
        >
          <Row icon={<MessagesSquare className="h-4 w-4" />} label="Chat consultation">
            <NumberInput
              value={draft.chatPriceKes}
              onChange={(s) => set("chatPriceKes", num(s, 0, 1000000, draft.chatPriceKes))}
              prefix={draft.currency}
            />
          </Row>
          <Row icon={<Video className="h-4 w-4" />} label="Call / video consultation">
            <NumberInput
              value={draft.callPriceKes}
              onChange={(s) => set("callPriceKes", num(s, 0, 1000000, draft.callPriceKes))}
              prefix={draft.currency}
            />
          </Row>
          <div className="mt-2 rounded-md bg-[#FFFBF5] border border-border px-3 py-2 text-xs text-muted-foreground">
            Patient sees <strong>{draft.currency} {draft.chatPriceKes.toLocaleString()}</strong> for chat and{" "}
            <strong>{draft.currency} {draft.callPriceKes.toLocaleString()}</strong> for a call on the booking page.
          </div>
        </Card>

        {/* Warning */}
        <Card title="Warning" subtitle="When to nudge the patient that time is almost up.">
          <Row icon={<AlertTriangle className="h-4 w-4" />} label="Warn at seconds remaining">
            <NumberInput
              value={draft.warnSecondsLeft}
              onChange={(s) => set("warnSecondsLeft", num(s, 10, 600, draft.warnSecondsLeft))}
              suffix="seconds"
            />
          </Row>
        </Card>

        {/* Overage */}
        <Card title="Overage charge" subtitle="When the free window ends the patient is asked to opt in to keep talking. If they decline, the session ends.">
          <Row icon={<Wallet className="h-4 w-4" />} label="Rate">
            <NumberInput
              value={draft.overageRateKes}
              onChange={(s) => set("overageRateKes", num(s, 10, 100000, draft.overageRateKes))}
              prefix={draft.currency}
            />
          </Row>
          <Row icon={<Clock className="h-4 w-4" />} label="Per block of">
            <NumberInput
              value={draft.overageBlockMin}
              onChange={(s) => set("overageBlockMin", num(s, 1, 60, draft.overageBlockMin))}
              suffix="minutes"
            />
          </Row>
          <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs" style={{ color: "#92400E" }}>
            Patient will see: <strong>{formatOverageLabel(draft)}</strong>
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Settings apply to all doctors (no per-doctor override). Persisted via <code>cmsStore</code> and surfaced
          inside every chat and video consultation.
        </p>
      </div>
    </AdminShell>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3">
        <h2 className="font-semibold text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

function NumberInput({
  value, onChange, prefix, suffix,
}: { value: number; onChange: (s: string) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2 h-9 text-sm">
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 bg-transparent focus:outline-none text-right tabular-nums"
      />
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, wide = false,
}: { value: string; onChange: (s: string) => void; placeholder?: string; wide?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${wide ? "w-72 sm:w-80" : "w-56"} h-9 px-3 rounded-md border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-200`}
    />
  )
}

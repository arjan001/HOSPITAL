"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { Megaphone, Plus, Trash2, GripVertical, Save, Eye, EyeOff } from "lucide-react"

type AnnouncementMessage = {
  id: string
  text: string
  href?: string
}

export type AnnouncementSettings = {
  enabled: boolean
  bgColor: string
  textColor: string
  speedSec: number
  messages: AnnouncementMessage[]
}

export const ANNOUNCEMENT_DEFAULTS: AnnouncementSettings = {
  enabled: true,
  bgColor: "linear-gradient(90deg, #3D0814 0%, #6B0F1A 60%, #B91C1C 100%)",
  textColor: "#FFFBF5",
  speedSec: 35,
  messages: [
    { id: "m1", text: "FREE DELIVERY on orders above KSh 5,000" },
    { id: "m2", text: "Talk to a licensed pharmacist 24/7" },
    { id: "m3", text: "Upload your prescription — we'll call you within 15 minutes" },
  ],
}

const PRESETS: Array<{ label: string; bg: string; fg: string }> = [
  { label: "Wine", bg: "linear-gradient(90deg, #3D0814 0%, #6B0F1A 60%, #B91C1C 100%)", fg: "#FFFBF5" },
  { label: "Cream", bg: "linear-gradient(90deg, #FFE0C8 0%, #F5C4A0 25%, #D4847A 65%, #A84C5A 100%)", fg: "#3D0814" },
  { label: "Solid Wine", bg: "#3D0814", fg: "#FFFBF5" },
  { label: "Solid Red", bg: "#B91C1C", fg: "#FFFFFF" },
  { label: "Solid Orange", bg: "#F97316", fg: "#FFFFFF" },
  { label: "Slate", bg: "#0F172A", fg: "#FFFFFF" },
]

export function AdminAnnouncementBar() {
  const [settings, setSettings] = useCmsDoc("announcement", ANNOUNCEMENT_DEFAULTS)
  const [draft, setDraft] = useState(settings)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const update = <K extends keyof AnnouncementSettings>(k: K, v: AnnouncementSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const updateMsg = (id: string, patch: Partial<AnnouncementMessage>) =>
    setDraft((d) => ({ ...d, messages: d.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))

  const addMsg = () =>
    setDraft((d) => ({
      ...d,
      messages: [...d.messages, { id: `m_${Math.random().toString(36).slice(2, 8)}`, text: "" }],
    }))

  const removeMsg = (id: string) =>
    setDraft((d) => ({ ...d, messages: d.messages.filter((m) => m.id !== id) }))

  const move = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const idx = d.messages.findIndex((m) => m.id === id)
      const next = idx + dir
      if (idx === -1 || next < 0 || next >= d.messages.length) return d
      const arr = d.messages.slice()
      ;[arr[idx], arr[next]] = [arr[next]!, arr[idx]!]
      return { ...d, messages: arr }
    })

  const save = () => setSettings(draft)
  const reset = () => setDraft(settings)

  return (
    <AdminShell title="Announcement Bar">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Announcement Bar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              The marquee strip that runs above the navbar on every storefront page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={reset}
                className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary"
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background disabled:opacity-40 inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save changes
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Live preview
          </div>
          {draft.enabled && draft.messages.some((m) => m.text.trim()) ? (
            <div style={{ background: draft.bgColor }}>
              <div className="flex whitespace-nowrap py-2 overflow-hidden">
                <div
                  className="flex gap-10 animate-marquee"
                  style={{ animationDuration: `${draft.speedSec}s` }}
                >
                  {[...draft.messages, ...draft.messages, ...draft.messages]
                    .filter((m) => m.text.trim())
                    .map((m, i) => (
                      <span
                        key={i}
                        className="text-xs tracking-widest uppercase font-semibold flex-shrink-0"
                        style={{ color: draft.textColor }}
                      >
                        {m.text}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground bg-muted/20">
              <EyeOff className="h-4 w-4 inline mr-2" />
              Bar is hidden (disabled or empty).
            </div>
          )}
        </div>

        {/* Settings grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visibility + speed */}
          <div className="rounded-lg border border-border p-5 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Visibility</h2>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium">Enabled</span>
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => update("enabled", e.target.checked)}
                className="h-5 w-5 accent-foreground"
              />
            </label>
            <div>
              <label className="text-sm font-medium block mb-1">Scroll speed (seconds per loop)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={draft.speedSec}
                onChange={(e) => update("speedSec", Math.max(5, Math.min(120, Number(e.target.value) || 35)))}
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Lower = faster.</p>
            </div>
          </div>

          {/* Color presets */}
          <div className="rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Color preset</h2>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = draft.bgColor === p.bg && draft.textColor === p.fg
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      update("bgColor", p.bg)
                      update("textColor", p.fg)
                    }}
                    className={`h-12 rounded-md text-xs font-semibold border transition-all ${
                      active ? "ring-2 ring-foreground ring-offset-2" : "border-border hover:border-foreground"
                    }`}
                    style={{ background: p.bg, color: p.fg }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block">Custom text color</label>
              <input
                type="color"
                value={draft.textColor.startsWith("#") ? draft.textColor : "#FFFBF5"}
                onChange={(e) => update("textColor", e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-1 rounded-lg border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Messages</h2>
              <button
                type="button"
                onClick={addMsg}
                className="text-xs font-semibold inline-flex items-center gap-1 px-2 h-7 rounded-md border border-border hover:bg-secondary"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {draft.messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No messages — bar will be hidden.</p>
              )}
              {draft.messages.map((m, i) => (
                <div key={m.id} className="flex items-start gap-1.5">
                  <div className="flex flex-col items-center pt-1.5">
                    <button
                      type="button"
                      onClick={() => move(m.id, -1)}
                      disabled={i === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={m.text}
                      onChange={(e) => updateMsg(m.id, { text: e.target.value })}
                      placeholder="Announcement text"
                      className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
                    />
                    <input
                      type="text"
                      value={m.href || ""}
                      onChange={(e) => updateMsg(m.id, { href: e.target.value })}
                      placeholder="Optional link (e.g. /shop)"
                      className="w-full h-7 px-2 rounded-md border border-border bg-background text-[11px] text-muted-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMsg(m.id)}
                    className="p-1 text-muted-foreground hover:text-destructive mt-1"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          Changes apply to the storefront immediately after Save.
        </p>
      </div>
    </AdminShell>
  )
}

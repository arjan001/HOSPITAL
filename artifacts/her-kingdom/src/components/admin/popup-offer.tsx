"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { Sparkles, Save, Eye, EyeOff } from "lucide-react"

export type PopupOfferSettings = {
  enabled: boolean
  headline: string
  subhead: string
  ctaLabel: string
  ctaHref: string
  imageUrl: string
  bgColor: string
  textColor: string
  delaySec: number
  frequencyDays: number
  showOnPaths: string
}

export const POPUP_DEFAULTS: PopupOfferSettings = {
  enabled: false,
  headline: "Get 10% off your first order",
  subhead: "Sign up for SMS or email and we'll send you a one-time code, plus health tips from our pharmacists.",
  ctaLabel: "Claim my discount",
  ctaHref: "/account/register",
  imageUrl: "",
  bgColor: "#FFFFFF",
  textColor: "#111827",
  delaySec: 6,
  frequencyDays: 7,
  showOnPaths: "/, /shop",
}

export function AdminPopupOffer() {
  const [settings, setSettings] = useCmsDoc("popup-offer", POPUP_DEFAULTS)
  const [draft, setDraft] = useState(settings)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const save = () => setSettings(draft)
  const reset = () => setDraft(settings)
  const update = <K extends keyof PopupOfferSettings>(k: K, v: PopupOfferSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  return (
    <AdminShell title="Popup Offer">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Popup Offer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              A site-wide promo modal shown after a delay. Use frequency cap (days) to avoid annoying repeat visitors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button type="button" onClick={reset} className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary">
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background disabled:opacity-40 inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Save changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="rounded-lg border border-border bg-background p-5 space-y-4">
            <label className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20">
              <span className="text-sm font-medium">Enabled</span>
              <input type="checkbox" checked={draft.enabled} onChange={(e) => update("enabled", e.target.checked)} className="h-5 w-5 accent-foreground" />
            </label>

            <Field label="Headline">
              <input className="input" value={draft.headline} onChange={(e) => update("headline", e.target.value)} />
            </Field>
            <Field label="Subhead">
              <textarea className="input" rows={3} value={draft.subhead} onChange={(e) => update("subhead", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA label">
                <input className="input" value={draft.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} />
              </Field>
              <Field label="CTA link">
                <input className="input" value={draft.ctaHref} onChange={(e) => update("ctaHref", e.target.value)} />
              </Field>
            </div>
            <Field label="Image URL (optional)">
              <input className="input" value={draft.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://… or /image.jpg" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Background color">
                <input type="color" className="h-9 w-full rounded border border-border" value={draft.bgColor} onChange={(e) => update("bgColor", e.target.value)} />
              </Field>
              <Field label="Text color">
                <input type="color" className="h-9 w-full rounded border border-border" value={draft.textColor} onChange={(e) => update("textColor", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Delay (seconds)">
                <input className="input" type="number" min={0} max={60} value={draft.delaySec} onChange={(e) => update("delaySec", Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <Field label="Show again after (days)">
                <input className="input" type="number" min={0} max={365} value={draft.frequencyDays} onChange={(e) => update("frequencyDays", Math.max(0, Number(e.target.value) || 0))} />
              </Field>
            </div>
            <Field label="Show on paths" hint="Comma-separated. Use '*' for everywhere.">
              <input className="input font-mono text-xs" value={draft.showOnPaths} onChange={(e) => update("showOnPaths", e.target.value)} />
            </Field>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-muted/20 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 inline-flex items-center gap-1.5">
              {draft.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Preview
            </p>
            <div className="rounded-2xl shadow-2xl overflow-hidden border border-border max-w-md mx-auto" style={{ background: draft.bgColor, color: draft.textColor }}>
              {draft.imageUrl && (
                <img src={draft.imageUrl} alt="" className="w-full h-40 object-cover" onError={(e) => ((e.currentTarget.style.display = "none"))} />
              )}
              <div className="p-6 space-y-3">
                <h3 className="text-xl font-bold">{draft.headline || "Headline"}</h3>
                <p className="text-sm opacity-80">{draft.subhead || "Subhead"}</p>
                <button
                  type="button"
                  className="w-full h-11 rounded-full text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #F97316 0%, #B91C1C 100%)" }}
                >
                  {draft.ctaLabel || "CTA"}
                </button>
                <p className="text-[11px] opacity-50 text-center">No thanks</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`.input{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;}
        textarea.input{height:auto;padding:0.5rem 0.75rem;}`}</style>
    </AdminShell>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium block">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

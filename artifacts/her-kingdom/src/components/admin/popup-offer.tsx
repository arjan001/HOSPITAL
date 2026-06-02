"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { Sparkles, Save, Eye, EyeOff } from "lucide-react"

export type PopupOfferSettings = {
  enabled: boolean
  eyebrow: string
  headline: string
  subhead: string
  ctaLabel: string
  /** @deprecated kept for stored-doc backward compat; the redesigned popup captures email instead of linking. */
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
  eyebrow: "Newsletter",
  headline: "Subscribe Now",
  subhead:
    "Join the list and unlock 10% off your first order — plus first-look access to new arrivals, restocks, and pharmacist health tips.",
  ctaLabel: "Subscribe",
  ctaHref: "",
  imageUrl: "/newsletter-pills.png",
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

            <Field label="Eyebrow" hint="Small label above the headline.">
              <input className="input" value={draft.eyebrow ?? ""} onChange={(e) => update("eyebrow", e.target.value)} placeholder="Newsletter" />
            </Field>
            <Field label="Headline">
              <input className="input" value={draft.headline} onChange={(e) => update("headline", e.target.value)} />
            </Field>
            <Field label="Subhead">
              <textarea className="input" rows={3} value={draft.subhead} onChange={(e) => update("subhead", e.target.value)} />
            </Field>
            <Field label="Subscribe button label">
              <input className="input" value={draft.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} placeholder="Subscribe" />
            </Field>
            <Field label="Image URL" hint="Shown on the left. A pharmacy image works best.">
              <input className="input" value={draft.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="/newsletter-pills.png or https://…" />
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
            <div className="shadow-2xl overflow-hidden border border-border max-w-md mx-auto flex flex-col sm:flex-row" style={{ background: draft.bgColor, color: draft.textColor }}>
              {draft.imageUrl && (
                <div className="w-full sm:w-[44%] h-32 sm:h-auto sm:min-h-[260px] flex-shrink-0 bg-neutral-100 relative">
                  <img src={draft.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { const p = e.currentTarget.parentElement; if (p) p.style.display = "none" }} />
                </div>
              )}
              <div className="flex-1 p-5 space-y-2.5">
                {draft.eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">{draft.eyebrow}</p>}
                <h3 className="text-lg font-bold leading-tight">{draft.headline || "Headline"}</h3>
                <p className="text-xs opacity-75 leading-relaxed">{draft.subhead || "Subhead"}</p>
                <div className="pt-1">
                  <p className="text-[11px] font-medium mb-1">Email Address <span style={{ color: "#B91C1C" }}>*</span></p>
                  <div className="w-full h-9 border border-neutral-300 bg-white text-[11px] text-neutral-400 px-3 flex items-center">Enter your email</div>
                  <button
                    type="button"
                    className="w-full h-9 mt-2 text-xs font-bold text-white"
                    style={{ background: "#B91C1C" }}
                  >
                    {draft.ctaLabel || "Subscribe"}
                  </button>
                </div>
                <p className="text-[10px] opacity-50">Don't show this popup again</p>
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

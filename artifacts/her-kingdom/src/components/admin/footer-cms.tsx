"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { Layers, Save, Plus, Trash2 } from "lucide-react"

export type FooterLink = { id: string; label: string; href: string }

export type FooterSettings = {
  contactEmail: string
  contactPhone: string
  whatsappNumber: string
  address: string
  copyright: string
  social: {
    instagram: string
    facebook: string
    twitter: string
    tiktok: string
    youtube: string
    linkedin: string
  }
  columns: {
    about: { title: string; links: FooterLink[] }
    care: { title: string; links: FooterLink[] }
    support: { title: string; links: FooterLink[] }
    legal: { title: string; links: FooterLink[] }
  }
}

export const FOOTER_DEFAULTS: FooterSettings = {
  contactEmail: "support@shaniidrx.co.ke",
  contactPhone: "+254 780 406 059",
  whatsappNumber: "254780406059",
  address: "Nairobi, Kenya",
  copyright: "©2026 Shaniid RX. A subsidiary of Shaniid Group of Technologies Limited. All rights reserved.",
  social: {
    instagram: "https://www.instagram.com/shaniidrx",
    facebook: "",
    twitter: "",
    tiktok: "https://www.tiktok.com/@shaniidrx",
    youtube: "",
    linkedin: "",
  },
  columns: {
    about: {
      title: "About",
      links: [
        { id: "a1", label: "Who We Are", href: "/who-we-are" },
        { id: "a2", label: "How Shaniid RX Works", href: "/who-we-are#how-it-works" },
        { id: "a3", label: "Our Clinical Team", href: "/who-we-are#our-team" },
      ],
    },
    care: {
      title: "Care & Shop",
      links: [
        { id: "c1", label: "Chronic Care Packs", href: "/shop?category=chronic-care" },
        { id: "c2", label: "Family & Care Giver", href: "/shop?category=family-care" },
        { id: "c3", label: "Preventive & Wellness", href: "/shop?category=wellness" },
        { id: "c4", label: "Devices & Monitoring", href: "/shop?category=devices" },
      ],
    },
    support: {
      title: "Customer Support",
      links: [
        { id: "s1", label: "Prescription Upload Guide", href: "/pages/prescription-upload-guide" },
        { id: "s2", label: "Returns & Refund Policy", href: "/pages/returns-refund-policy" },
        { id: "s3", label: "Order Tracking", href: "/track-order" },
        { id: "s4", label: "FAQs", href: "/faq" },
        { id: "s5", label: "Delivery Timing & Zones", href: "/delivery" },
        { id: "s6", label: "Contact Us", href: "/contact" },
      ],
    },
    legal: {
      title: "Legal",
      links: [
        { id: "l1", label: "Privacy Policy", href: "/privacy-policy" },
        { id: "l2", label: "Terms & Conditions", href: "/terms-of-service" },
        { id: "l3", label: "Prescription Policy", href: "/policies/prescription" },
        { id: "l4", label: "License", href: "/policies/license" },
      ],
    },
  },
}

type ColKey = keyof FooterSettings["columns"]

export function AdminFooterCms() {
  const [settings, setSettings] = useCmsDoc("footer", FOOTER_DEFAULTS)
  const [draft, setDraft] = useState(settings)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const save = () => setSettings(draft)
  const reset = () => setDraft(settings)

  const updateCol = (col: ColKey, patch: Partial<FooterSettings["columns"][ColKey]>) =>
    setDraft((d) => ({ ...d, columns: { ...d.columns, [col]: { ...d.columns[col], ...patch } } }))

  const addLink = (col: ColKey) =>
    updateCol(col, {
      links: [
        ...draft.columns[col].links,
        { id: `${col}_${Math.random().toString(36).slice(2, 7)}`, label: "", href: "" },
      ],
    })

  const updateLink = (col: ColKey, id: string, patch: Partial<FooterLink>) =>
    updateCol(col, { links: draft.columns[col].links.map((l) => (l.id === id ? { ...l, ...patch } : l)) })

  const removeLink = (col: ColKey, id: string) =>
    updateCol(col, { links: draft.columns[col].links.filter((l) => l.id !== id) })

  return (
    <AdminShell title="Footer & Links">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Footer & Links
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Edit the four footer columns, contact strip, social links, and copyright line.
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

        {/* Contact + social */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact strip</h2>
            <Row label="Email">
              <input className="input" value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} />
            </Row>
            <Row label="Phone">
              <input className="input" value={draft.contactPhone} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} />
            </Row>
            <Row label="WhatsApp number" hint="No '+' or spaces, e.g. 254780406059">
              <input className="input" value={draft.whatsappNumber} onChange={(e) => setDraft({ ...draft, whatsappNumber: e.target.value.replace(/[^0-9]/g, "") })} />
            </Row>
            <Row label="Physical address">
              <input className="input" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Row>
            <Row label="Copyright line">
              <input className="input" value={draft.copyright} onChange={(e) => setDraft({ ...draft, copyright: e.target.value })} />
            </Row>
          </div>

          <div className="rounded-lg border border-border p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Social links</h2>
            {(Object.keys(draft.social) as Array<keyof FooterSettings["social"]>).map((k) => (
              <Row key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                <input
                  className="input"
                  value={draft.social[k]}
                  onChange={(e) => setDraft({ ...draft, social: { ...draft.social, [k]: e.target.value } })}
                  placeholder="https://…"
                />
              </Row>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(Object.keys(draft.columns) as ColKey[]).map((col) => (
            <div key={col} className="rounded-lg border border-border p-4 space-y-3">
              <input
                value={draft.columns[col].title}
                onChange={(e) => updateCol(col, { title: e.target.value })}
                className="w-full font-semibold text-sm bg-transparent border-b border-transparent hover:border-border focus:border-foreground outline-none pb-1"
              />
              <div className="space-y-2">
                {draft.columns[col].links.map((l) => (
                  <div key={l.id} className="space-y-1 p-2 rounded border border-border bg-muted/30">
                    <input
                      value={l.label}
                      onChange={(e) => updateLink(col, l.id, { label: e.target.value })}
                      placeholder="Label"
                      className="input h-7 text-xs"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        value={l.href}
                        onChange={(e) => updateLink(col, l.id, { href: e.target.value })}
                        placeholder="/path or https://…"
                        className="input h-7 text-xs flex-1 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeLink(col, l.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addLink(col)}
                  className="w-full h-8 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground inline-flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`.input{width:100%;height:2.25rem;padding:0 0.625rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.8125rem;}`}</style>
    </AdminShell>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

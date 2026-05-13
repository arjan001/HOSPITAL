"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { Settings, Save, Building2, Phone, Share2, Search, DollarSign, Clock, Truck } from "lucide-react"

export type WebsiteSettings = {
  brand: {
    storeName: string
    tagline: string
    logoUrl: string
    faviconUrl: string
    primaryColor: string
    accentColor: string
  }
  contact: {
    email: string
    phone: string
    whatsapp: string
    address: string
    googleMapsUrl: string
  }
  social: {
    instagram: string
    facebook: string
    tiktok: string
    twitter: string
    youtube: string
    linkedin: string
  }
  seo: {
    title: string
    description: string
    keywords: string
    ogImage: string
    twitterHandle: string
    googleAnalyticsId: string
    facebookPixelId: string
  }
  commerce: {
    currencyCode: string
    currencySymbol: string
    deliveryFlat: number
    freeDeliveryThreshold: number
    taxIncluded: boolean
    minOrderValue: number
  }
  hours: {
    open: string
    close: string
    days: string
    note: string
  }
  flags: {
    maintenanceMode: boolean
    showWhatsappFloat: boolean
    showCookieBanner: boolean
  }
}

export const WEBSITE_DEFAULTS: WebsiteSettings = {
  brand: {
    storeName: "Shaniid RX",
    tagline: "Kenya's trusted online pharmacy",
    logoUrl: "/logo-rx.png",
    faviconUrl: "/favicon.ico",
    primaryColor: "#3D0814",
    accentColor: "#F97316",
  },
  contact: {
    email: "support@shaniidrx.co.ke",
    phone: "+254 780 406 059",
    whatsapp: "254780406059",
    address: "Nairobi, Kenya",
    googleMapsUrl: "",
  },
  social: {
    instagram: "https://www.instagram.com/shaniidrx",
    facebook: "",
    tiktok: "https://www.tiktok.com/@shaniidrx",
    twitter: "",
    youtube: "",
    linkedin: "",
  },
  seo: {
    title: "Shaniid RX — Trusted Online Pharmacy in Kenya",
    description:
      "Order medicines, supplements and healthcare essentials online. Licensed pharmacists, fast delivery across Kenya.",
    keywords: "online pharmacy Kenya, prescription delivery, OTC, medicines Nairobi",
    ogImage: "/og-image.jpg",
    twitterHandle: "@shaniidrx",
    googleAnalyticsId: "",
    facebookPixelId: "",
  },
  commerce: {
    currencyCode: "KES",
    currencySymbol: "KSh",
    deliveryFlat: 250,
    freeDeliveryThreshold: 5000,
    taxIncluded: true,
    minOrderValue: 0,
  },
  hours: {
    open: "08:00",
    close: "22:00",
    days: "Mon – Sun",
    note: "Pharmacist on call 24/7 via WhatsApp",
  },
  flags: {
    maintenanceMode: false,
    showWhatsappFloat: true,
    showCookieBanner: true,
  },
}

type Tab = "brand" | "contact" | "social" | "seo" | "commerce" | "hours" | "flags"

const TABS: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
  { id: "brand", label: "Brand", icon: Building2 },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "social", label: "Social", icon: Share2 },
  { id: "seo", label: "SEO & Tracking", icon: Search },
  { id: "commerce", label: "Commerce", icon: DollarSign },
  { id: "hours", label: "Business Hours", icon: Clock },
  { id: "flags", label: "Site Flags", icon: Truck },
]

export function AdminWebsiteSettings() {
  const [settings, setSettings] = useCmsDoc("website-settings", WEBSITE_DEFAULTS)
  const [draft, setDraft] = useState(settings)
  const [tab, setTab] = useState<Tab>("brand")
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

  const save = () => setSettings(draft)
  const reset = () => setDraft(settings)

  const update = <S extends keyof WebsiteSettings>(section: S, patch: Partial<WebsiteSettings[S]>) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }))

  return (
    <AdminShell title="Website Settings">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Website Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Brand identity, contact info, SEO, commerce defaults, business hours, and site flags.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={reset}
                className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary"
              >
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

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
          {/* Tabs */}
          <nav className="md:sticky md:top-20 self-start">
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${
                    tab === t.id ? "bg-foreground text-background font-medium" : "hover:bg-secondary"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab content */}
          <div className="rounded-lg border border-border bg-background p-6 space-y-5">
            {tab === "brand" && (
              <Section title="Brand identity">
                <Grid cols={2}>
                  <Input label="Store name" value={draft.brand.storeName} onChange={(v) => update("brand", { storeName: v })} />
                  <Input label="Tagline" value={draft.brand.tagline} onChange={(v) => update("brand", { tagline: v })} />
                  <Input label="Logo URL" hint="Path or absolute URL" value={draft.brand.logoUrl} onChange={(v) => update("brand", { logoUrl: v })} />
                  <Input label="Favicon URL" value={draft.brand.faviconUrl} onChange={(v) => update("brand", { faviconUrl: v })} />
                  <Color label="Primary brand color" value={draft.brand.primaryColor} onChange={(v) => update("brand", { primaryColor: v })} />
                  <Color label="Accent / CTA color" value={draft.brand.accentColor} onChange={(v) => update("brand", { accentColor: v })} />
                </Grid>
                {draft.brand.logoUrl && (
                  <div className="rounded-md border border-border p-4 bg-muted/30 flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">Logo preview</span>
                    <img src={draft.brand.logoUrl} alt="" className="h-12 max-w-[180px] object-contain" />
                  </div>
                )}
              </Section>
            )}

            {tab === "contact" && (
              <Section title="Contact information">
                <Grid cols={2}>
                  <Input label="Support email" type="email" value={draft.contact.email} onChange={(v) => update("contact", { email: v })} />
                  <Input label="Phone" value={draft.contact.phone} onChange={(v) => update("contact", { phone: v })} />
                  <Input label="WhatsApp number" hint="Digits only, e.g. 254780406059" value={draft.contact.whatsapp} onChange={(v) => update("contact", { whatsapp: v.replace(/[^0-9]/g, "") })} />
                  <Input label="Address" value={draft.contact.address} onChange={(v) => update("contact", { address: v })} />
                  <Input label="Google Maps share URL" value={draft.contact.googleMapsUrl} onChange={(v) => update("contact", { googleMapsUrl: v })} className="md:col-span-2" />
                </Grid>
              </Section>
            )}

            {tab === "social" && (
              <Section title="Social profiles">
                <Grid cols={2}>
                  {(Object.keys(draft.social) as Array<keyof WebsiteSettings["social"]>).map((k) => (
                    <Input
                      key={k}
                      label={k.charAt(0).toUpperCase() + k.slice(1)}
                      value={draft.social[k]}
                      onChange={(v) => update("social", { [k]: v } as Partial<WebsiteSettings["social"]>)}
                      placeholder="https://…"
                    />
                  ))}
                </Grid>
              </Section>
            )}

            {tab === "seo" && (
              <Section title="SEO meta & tracking">
                <Input label="Meta title" value={draft.seo.title} onChange={(v) => update("seo", { title: v })} />
                <Textarea label="Meta description" value={draft.seo.description} onChange={(v) => update("seo", { description: v })} rows={3} />
                <Input label="Meta keywords (comma-separated)" value={draft.seo.keywords} onChange={(v) => update("seo", { keywords: v })} />
                <Grid cols={2}>
                  <Input label="OG image URL" value={draft.seo.ogImage} onChange={(v) => update("seo", { ogImage: v })} />
                  <Input label="Twitter handle" value={draft.seo.twitterHandle} onChange={(v) => update("seo", { twitterHandle: v })} placeholder="@shaniidrx" />
                  <Input label="Google Analytics ID" value={draft.seo.googleAnalyticsId} onChange={(v) => update("seo", { googleAnalyticsId: v })} placeholder="G-XXXXXX" />
                  <Input label="Facebook Pixel ID" value={draft.seo.facebookPixelId} onChange={(v) => update("seo", { facebookPixelId: v })} />
                </Grid>
              </Section>
            )}

            {tab === "commerce" && (
              <Section title="Commerce defaults">
                <Grid cols={2}>
                  <Input label="Currency code" value={draft.commerce.currencyCode} onChange={(v) => update("commerce", { currencyCode: v.toUpperCase() })} />
                  <Input label="Currency symbol" value={draft.commerce.currencySymbol} onChange={(v) => update("commerce", { currencySymbol: v })} />
                  <Input label="Default delivery fee" type="number" value={String(draft.commerce.deliveryFlat)} onChange={(v) => update("commerce", { deliveryFlat: Number(v) || 0 })} />
                  <Input label="Free-delivery threshold" type="number" value={String(draft.commerce.freeDeliveryThreshold)} onChange={(v) => update("commerce", { freeDeliveryThreshold: Number(v) || 0 })} />
                  <Input label="Minimum order value" type="number" value={String(draft.commerce.minOrderValue)} onChange={(v) => update("commerce", { minOrderValue: Number(v) || 0 })} />
                  <Toggle label="Prices include tax" checked={draft.commerce.taxIncluded} onChange={(v) => update("commerce", { taxIncluded: v })} />
                </Grid>
              </Section>
            )}

            {tab === "hours" && (
              <Section title="Business hours">
                <Grid cols={2}>
                  <Input label="Opens at" type="time" value={draft.hours.open} onChange={(v) => update("hours", { open: v })} />
                  <Input label="Closes at" type="time" value={draft.hours.close} onChange={(v) => update("hours", { close: v })} />
                  <Input label="Days open" value={draft.hours.days} onChange={(v) => update("hours", { days: v })} placeholder="Mon – Sun" />
                  <Input label="Out-of-hours note" value={draft.hours.note} onChange={(v) => update("hours", { note: v })} />
                </Grid>
              </Section>
            )}

            {tab === "flags" && (
              <Section title="Site flags">
                <div className="space-y-3">
                  <Toggle
                    label="Maintenance mode"
                    hint="When on, storefront shows a 'we'll be back soon' page (TODO: wire up)."
                    checked={draft.flags.maintenanceMode}
                    onChange={(v) => update("flags", { maintenanceMode: v })}
                  />
                  <Toggle
                    label="Show floating WhatsApp button"
                    checked={draft.flags.showWhatsappFloat}
                    onChange={(v) => update("flags", { showWhatsappFloat: v })}
                  />
                  <Toggle
                    label="Show cookie consent banner"
                    checked={draft.flags.showCookieBanner}
                    onChange={(v) => update("flags", { showCookieBanner: v })}
                  />
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

/* ---------- shared field primitives ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Grid({ cols, children }: { cols: 2 | 3; children: React.ReactNode }) {
  return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>{children}</div>
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
  className?: string
}) {
  return (
    <div className={`space-y-1 ${className || ""}`}>
      <label className="text-sm font-medium block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium block">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium block">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded-md border border-border bg-background cursor-pointer" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm font-mono"
        />
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex items-start justify-between gap-4 p-3 rounded-md border border-border bg-muted/20 cursor-pointer">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-foreground"
      />
    </label>
  )
}

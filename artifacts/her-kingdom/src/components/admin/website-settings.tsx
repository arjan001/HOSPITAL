"use client"

import { useState, useMemo } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import {
  Settings, Save, Building2, Phone, Share2, Search, DollarSign, Clock, Truck,
  LineChart, Code2, Globe, ShieldCheck, Sparkles, Eye, RotateCcw, Copy, Check,
} from "lucide-react"

const WINE = "#3D0814"

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
    ogTitle: string
    ogDescription: string
    twitterCard: "summary" | "summary_large_image"
    twitterHandle: string
    canonicalBase: string
    locale: string
    robotsIndex: boolean
    robotsFollow: boolean
    sitemapEnabled: boolean
    structuredDataEnabled: boolean
    organizationName: string
    organizationLogo: string
  }
  tracking: {
    ga4Id: string
    gtmId: string
    fbPixelId: string
    tiktokPixelId: string
    hotjarId: string
    googleSiteVerification: string
    bingSiteVerification: string
    facebookDomainVerification: string
  }
  customCode: {
    headHtml: string
    bodyStartHtml: string
    bodyEndHtml: string
    customCss: string
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
    ogTitle: "",
    ogDescription: "",
    twitterCard: "summary_large_image",
    twitterHandle: "@shaniidrx",
    canonicalBase: "https://shaniidrx.co.ke",
    locale: "en_KE",
    robotsIndex: true,
    robotsFollow: true,
    sitemapEnabled: true,
    structuredDataEnabled: true,
    organizationName: "Shaniid RX Pharmacy",
    organizationLogo: "/logo-rx.png",
  },
  tracking: {
    ga4Id: "",
    gtmId: "",
    fbPixelId: "",
    tiktokPixelId: "",
    hotjarId: "",
    googleSiteVerification: "",
    bingSiteVerification: "",
    facebookDomainVerification: "",
  },
  customCode: {
    headHtml: "",
    bodyStartHtml: "",
    bodyEndHtml: "",
    customCss: "",
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

type Tab =
  | "brand" | "contact" | "social"
  | "seo" | "tracking" | "customCode"
  | "commerce" | "hours" | "flags"

const TAB_GROUPS: Array<{
  label: string
  tabs: Array<{ id: Tab; label: string; icon: typeof Building2; hint?: string }>
}> = [
  {
    label: "Identity",
    tabs: [
      { id: "brand", label: "Brand", icon: Building2 },
      { id: "contact", label: "Contact", icon: Phone },
      { id: "social", label: "Social", icon: Share2 },
    ],
  },
  {
    label: "Discovery",
    tabs: [
      { id: "seo", label: "SEO", icon: Search, hint: "Meta, OG, robots" },
      { id: "tracking", label: "Tracking & Pixels", icon: LineChart, hint: "GA4, GTM, FB" },
      { id: "customCode", label: "Custom Code", icon: Code2, hint: "Head & body HTML" },
    ],
  },
  {
    label: "Operations",
    tabs: [
      { id: "commerce", label: "Commerce", icon: DollarSign },
      { id: "hours", label: "Business Hours", icon: Clock },
      { id: "flags", label: "Site Flags", icon: Truck },
    ],
  },
]

export function AdminWebsiteSettings() {
  const [settings, setSettings] = useCmsDoc("website-settings", WEBSITE_DEFAULTS)
  const [draft, setDraft] = useState<WebsiteSettings>(settings)
  const [tab, setTab] = useState<Tab>("brand")

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings],
  )

  const save = () => {
    setSettings(draft)
    notify.saved("Website settings saved")
  }
  const reset = () => {
    setDraft(settings)
    notify.info("Discarded unsaved changes")
  }
  const restoreDefaults = () => {
    setDraft(WEBSITE_DEFAULTS)
    notify.warning("Defaults restored — review then Save to apply")
  }

  const update = <S extends keyof WebsiteSettings>(section: S, patch: Partial<WebsiteSettings[S]>) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }))

  return (
    <AdminShell title="Website Settings">
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-white to-[#FFFBF5] p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: WINE }}>
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                Website Settings
                {dirty && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Unsaved
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Brand, contact, SEO meta, tracking pixels, custom code, commerce defaults & flags.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreDefaults}
              className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary inline-flex items-center gap-1.5"
              title="Reset draft to factory defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Defaults
            </button>
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
              className="px-4 h-9 rounded-md text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2 shadow-sm"
              style={{ background: WINE }}
            >
              <Save className="h-4 w-4" /> Save changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5">
          {/* Tabs sidebar */}
          <nav className="md:sticky md:top-20 self-start space-y-3">
            {TAB_GROUPS.map((g) => (
              <div key={g.label} className="rounded-lg border border-border overflow-hidden bg-background">
                <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {g.label}
                </div>
                {g.tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${
                      tab === t.id
                        ? "bg-foreground text-background font-medium"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <t.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{t.label}</span>
                    {t.hint && tab !== t.id && (
                      <span className="text-[10px] text-muted-foreground hidden xl:inline">{t.hint}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Tab content */}
          <div className="rounded-lg border border-border bg-background p-6 space-y-5">
            {tab === "brand" && (
              <Section title="Brand identity" subtitle="Public store name, tagline, logo and brand colors">
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
              <Section title="Contact information" subtitle="Where customers reach you">
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
              <Section title="Social profiles" subtitle="Full URLs only — used in footer and structured data">
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
              <>
                <Section
                  title="Search engine basics"
                  subtitle="What Google shows in search results"
                  icon={Search}
                >
                  <Input
                    label="Meta title"
                    hint={`Recommended 50–60 chars (${draft.seo.title.length}/60)`}
                    value={draft.seo.title}
                    onChange={(v) => update("seo", { title: v })}
                  />
                  <Textarea
                    label="Meta description"
                    rows={3}
                    hint={`Recommended 140–160 chars (${draft.seo.description.length}/160)`}
                    value={draft.seo.description}
                    onChange={(v) => update("seo", { description: v })}
                  />
                  <Input
                    label="Meta keywords (comma-separated)"
                    hint="Largely ignored by Google but still used by Bing & internal search"
                    value={draft.seo.keywords}
                    onChange={(v) => update("seo", { keywords: v })}
                  />
                  <Grid cols={2}>
                    <Input label="Canonical base URL" placeholder="https://shaniidrx.co.ke" value={draft.seo.canonicalBase} onChange={(v) => update("seo", { canonicalBase: v })} />
                    <Input label="Locale" placeholder="en_KE" value={draft.seo.locale} onChange={(v) => update("seo", { locale: v })} />
                  </Grid>
                </Section>

                <Section
                  title="Open Graph & social preview"
                  subtitle="Card shown when your link is pasted into WhatsApp, Facebook, X, LinkedIn"
                  icon={Globe}
                >
                  <Grid cols={2}>
                    <Input label="OG image URL" hint="1200×630 recommended" value={draft.seo.ogImage} onChange={(v) => update("seo", { ogImage: v })} />
                    <Input label="Twitter handle" placeholder="@shaniidrx" value={draft.seo.twitterHandle} onChange={(v) => update("seo", { twitterHandle: v })} />
                    <Input label="OG title (defaults to Meta title)" value={draft.seo.ogTitle} onChange={(v) => update("seo", { ogTitle: v })} />
                    <Select
                      label="Twitter card type"
                      value={draft.seo.twitterCard}
                      onChange={(v) => update("seo", { twitterCard: v as "summary" | "summary_large_image" })}
                      options={[
                        { value: "summary_large_image", label: "Large image (recommended)" },
                        { value: "summary", label: "Summary" },
                      ]}
                    />
                  </Grid>
                  <Textarea
                    label="OG description (defaults to Meta description)"
                    rows={2}
                    value={draft.seo.ogDescription}
                    onChange={(v) => update("seo", { ogDescription: v })}
                  />
                  {draft.seo.ogImage && (
                    <div className="rounded-md border border-border bg-white overflow-hidden max-w-md">
                      <div className="aspect-[1200/630] bg-muted/30 grid place-items-center overflow-hidden">
                        <img src={draft.seo.ogImage} alt="OG preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 border-t border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{(draft.seo.canonicalBase || "shaniidrx.co.ke").replace(/^https?:\/\//, "")}</p>
                        <p className="text-sm font-semibold mt-0.5 line-clamp-1">{draft.seo.ogTitle || draft.seo.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{draft.seo.ogDescription || draft.seo.description}</p>
                      </div>
                    </div>
                  )}
                </Section>

                <Section
                  title="Indexing & sitemap"
                  subtitle="Tell crawlers what to do"
                  icon={ShieldCheck}
                >
                  <Grid cols={2}>
                    <Toggle label="Allow indexing (robots: index)" checked={draft.seo.robotsIndex} onChange={(v) => update("seo", { robotsIndex: v })} />
                    <Toggle label="Allow link-following (robots: follow)" checked={draft.seo.robotsFollow} onChange={(v) => update("seo", { robotsFollow: v })} />
                    <Toggle label="Generate /sitemap.xml" checked={draft.seo.sitemapEnabled} onChange={(v) => update("seo", { sitemapEnabled: v })} />
                    <Toggle label="Emit Organization JSON-LD schema" checked={draft.seo.structuredDataEnabled} onChange={(v) => update("seo", { structuredDataEnabled: v })} />
                  </Grid>
                  {draft.seo.structuredDataEnabled && (
                    <Grid cols={2}>
                      <Input label="Organization name (schema.org)" value={draft.seo.organizationName} onChange={(v) => update("seo", { organizationName: v })} />
                      <Input label="Organization logo URL" value={draft.seo.organizationLogo} onChange={(v) => update("seo", { organizationLogo: v })} />
                    </Grid>
                  )}
                  <CodePreview
                    label="Computed robots meta"
                    code={`<meta name="robots" content="${draft.seo.robotsIndex ? "index" : "noindex"}, ${draft.seo.robotsFollow ? "follow" : "nofollow"}">`}
                  />
                </Section>
              </>
            )}

            {tab === "tracking" && (
              <>
                <Section
                  title="Analytics & tag managers"
                  subtitle="Paste IDs only — we inject the script tags for you"
                  icon={LineChart}
                >
                  <Grid cols={2}>
                    <Input label="Google Analytics 4 ID" placeholder="G-XXXXXXXXXX" value={draft.tracking.ga4Id} onChange={(v) => update("tracking", { ga4Id: v.trim() })} />
                    <Input label="Google Tag Manager ID" placeholder="GTM-XXXXXXX" value={draft.tracking.gtmId} onChange={(v) => update("tracking", { gtmId: v.trim() })} />
                    <Input label="Meta (Facebook) Pixel ID" placeholder="1234567890123456" value={draft.tracking.fbPixelId} onChange={(v) => update("tracking", { fbPixelId: v.trim() })} />
                    <Input label="TikTok Pixel ID" placeholder="CXXXXXXXXXXXXXXXXX" value={draft.tracking.tiktokPixelId} onChange={(v) => update("tracking", { tiktokPixelId: v.trim() })} />
                    <Input label="Hotjar Site ID" placeholder="1234567" value={draft.tracking.hotjarId} onChange={(v) => update("tracking", { hotjarId: v.trim() })} />
                  </Grid>
                </Section>

                <Section
                  title="Site verification"
                  subtitle="The content value of the verification meta tag"
                  icon={ShieldCheck}
                >
                  <Grid cols={1}>
                    <Input label="Google Search Console" placeholder="google-site-verification content value" value={draft.tracking.googleSiteVerification} onChange={(v) => update("tracking", { googleSiteVerification: v.trim() })} />
                    <Input label="Bing Webmaster Tools" placeholder="msvalidate.01 content value" value={draft.tracking.bingSiteVerification} onChange={(v) => update("tracking", { bingSiteVerification: v.trim() })} />
                    <Input label="Facebook domain verification" value={draft.tracking.facebookDomainVerification} onChange={(v) => update("tracking", { facebookDomainVerification: v.trim() })} />
                  </Grid>
                </Section>
              </>
            )}

            {tab === "customCode" && (
              <Section
                title="Custom code injection"
                subtitle="Paste raw HTML/CSS — applied app-wide. Be careful: scripts run with full page access."
                icon={Code2}
              >
                <Banner tone="warning" text="Only paste code you trust. Bad markup here can break the entire storefront." />
                <Textarea
                  label={"Inside <head> — add meta, font links, third-party scripts"}
                  rows={6}
                  mono
                  placeholder={`<link rel="preconnect" href="https://fonts.googleapis.com">`}
                  value={draft.customCode.headHtml}
                  onChange={(v) => update("customCode", { headHtml: v })}
                />
                <Textarea
                  label={"After <body> — first-render scripts (e.g. GTM noscript)"}
                  rows={5}
                  mono
                  value={draft.customCode.bodyStartHtml}
                  onChange={(v) => update("customCode", { bodyStartHtml: v })}
                />
                <Textarea
                  label={"Before </body> — chat widgets, late-loading scripts"}
                  rows={5}
                  mono
                  value={draft.customCode.bodyEndHtml}
                  onChange={(v) => update("customCode", { bodyEndHtml: v })}
                />
                <Textarea
                  label="Custom CSS (loaded last)"
                  rows={6}
                  mono
                  placeholder=":root { --custom-radius: 12px; }"
                  value={draft.customCode.customCss}
                  onChange={(v) => update("customCode", { customCss: v })}
                />
              </Section>
            )}

            {tab === "commerce" && (
              <Section title="Commerce defaults" subtitle="Currency, shipping thresholds and pricing rules">
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
              <Section title="Business hours" subtitle="Shown in footer and contact pages">
                <Grid cols={2}>
                  <Input label="Opens at" type="time" value={draft.hours.open} onChange={(v) => update("hours", { open: v })} />
                  <Input label="Closes at" type="time" value={draft.hours.close} onChange={(v) => update("hours", { close: v })} />
                  <Input label="Days open" value={draft.hours.days} onChange={(v) => update("hours", { days: v })} placeholder="Mon – Sun" />
                  <Input label="Out-of-hours note" value={draft.hours.note} onChange={(v) => update("hours", { note: v })} />
                </Grid>
              </Section>
            )}

            {tab === "flags" && (
              <Section title="Site flags" subtitle="High-impact toggles — apply with care">
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

function Section({
  title, subtitle, icon: Icon, children,
}: {
  title: string
  subtitle?: string
  icon?: typeof Building2
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 pb-5 border-b border-border last:border-b-0 last:pb-0">
      <header className="flex items-start gap-2">
        {Icon && (
          <div className="h-7 w-7 rounded-md grid place-items-center bg-[#FFFBF5] border border-[#F2DCC8]">
            <Icon className="h-3.5 w-3.5" style={{ color: WINE }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-sm tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Grid({ cols, children }: { cols: 1 | 2 | 3; children: React.ReactNode }) {
  const cls = cols === 1 ? "" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
  return <div className={`grid grid-cols-1 ${cls} gap-4`}>{children}</div>
}

function Input({
  label, value, onChange, type = "text", placeholder, hint, className,
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
        className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground/40"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Textarea({
  label, value, onChange, rows = 3, hint, placeholder, mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium block">{label}</label>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground/40 ${mono ? "font-mono text-xs" : ""}`}
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

function Select({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function Toggle({
  label, checked, onChange, hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <label className="flex items-start justify-between gap-4 p-3 rounded-md border border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
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

function Banner({ tone, text }: { tone: "warning" | "info" | "success"; text: string }) {
  const palette =
    tone === "warning" ? "bg-amber-50 border-amber-200 text-amber-900"
    : tone === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : "bg-sky-50 border-sky-200 text-sky-900"
  const Icon = tone === "warning" ? Sparkles : tone === "success" ? Check : Eye
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${palette}`}>
      <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <p>{text}</p>
    </div>
  )
}

function CodePreview({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { /* clipboard blocked */ }
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-xs font-mono bg-muted/40 border border-border rounded-md px-3 py-2 overflow-x-auto">{code}</pre>
    </div>
  )
}

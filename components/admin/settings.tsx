"use client"

import { useState, useEffect, useMemo } from "react"
import { Save, Globe, FileText, Search, Plus, Pencil, Trash2, X, Check, ExternalLink, Eye, EyeOff, TrendingUp, BarChart3, Shield, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, Clock, Users, MousePointerClick, Activity } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AdminSettings() {
  const { data: settings, mutate } = useSWR("/api/admin/settings", fetcher)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    storeName: "", storeEmail: "", storePhone: "",
    currency: "KSh", whatsappNumber: "",
    metaTitle: "", metaDescription: "", metaKeywords: "",
    logoUrl: "", faviconUrl: "",
    footerText: "",
    socialInstagram: "", socialTiktok: "", socialTwitter: "",
    freeShippingThreshold: "5000",
    enableWhatsappCheckout: true, enableNewsletter: true, maintenanceMode: false,
  })

  useEffect(() => {
    if (settings && !settings.error) {
      setForm({
        storeName: settings.store_name || "",
        storeEmail: settings.store_email || "",
        storePhone: settings.store_phone || "",
        currency: settings.currency_symbol || "KSh",
        whatsappNumber: settings.whatsapp_number || "",
        metaTitle: settings.site_title || "",
        metaDescription: settings.site_description || "",
        metaKeywords: settings.meta_keywords || "",
        logoUrl: settings.logo_image_url || "",
        faviconUrl: settings.favicon_url || "",
        footerText: settings.footer_description || "",
        socialInstagram: settings.footer_instagram || "",
        socialTiktok: settings.footer_tiktok || "",
        socialTwitter: settings.footer_twitter || "",
        freeShippingThreshold: String(settings.free_shipping_threshold ?? 5000),
        enableWhatsappCheckout: settings.enable_whatsapp_checkout ?? true,
        enableNewsletter: settings.show_newsletter ?? true,
        maintenanceMode: settings.maintenance_mode ?? false,
      })
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const threshold = form.freeShippingThreshold.trim()
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          freeShippingThreshold: threshold === "" ? 0 : Number(threshold),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Save failed (${res.status})`)
      }
      await mutate()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell title="Settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your store configuration, SEO, theme and footer.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background hover:bg-foreground/90">
            <Save className="h-4 w-4 mr-2" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {error && (
          <div className="border border-destructive/40 bg-destructive/10 text-destructive text-sm rounded-sm p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Could not save settings</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-xs underline" type="button">Dismiss</button>
          </div>
        )}

        <Tabs defaultValue="general">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="footer">Footer & Social</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Store Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-medium mb-1.5 block">Store Name</Label><Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Store Email</Label><Input value={form.storeEmail} onChange={(e) => setForm({ ...form, storeEmail: e.target.value })} /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Store Phone</Label><Input value={form.storePhone} onChange={(e) => setForm({ ...form, storePhone: e.target.value })} /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">WhatsApp Number</Label><Input value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="254..." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Currency Symbol</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                </div>
              </div>

              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Checkout & Features</h3>
                <div><Label className="text-sm font-medium mb-1.5 block">Free Shipping Threshold (KSh)</Label><Input type="number" inputMode="numeric" min={0} value={form.freeShippingThreshold} onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })} /></div>
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">WhatsApp Checkout</p><p className="text-xs text-muted-foreground">Enable ordering via WhatsApp</p></div>
                    <Switch checked={form.enableWhatsappCheckout} onCheckedChange={(checked) => setForm({ ...form, enableWhatsappCheckout: checked })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Newsletter</p><p className="text-xs text-muted-foreground">Display newsletter signup on homepage</p></div>
                    <Switch checked={form.enableNewsletter} onCheckedChange={(checked) => setForm({ ...form, enableNewsletter: checked })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Maintenance Mode</p><p className="text-xs text-muted-foreground">Temporarily disable the storefront</p></div>
                    <Switch checked={form.maintenanceMode} onCheckedChange={(checked) => setForm({ ...form, maintenanceMode: checked })} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="mt-6">
            <SeoManager />
          </TabsContent>

          <TabsContent value="footer" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"><FileText className="h-4 w-4" /> Footer Content</h3>
                <div><Label className="text-sm font-medium mb-1.5 block">Footer Text / Description</Label><Textarea value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} rows={3} /></div>
              </div>
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Social Media</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-medium mb-1.5 block">Instagram URL</Label><Input value={form.socialInstagram} onChange={(e) => setForm({ ...form, socialInstagram: e.target.value })} placeholder="https://instagram.com/..." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">TikTok URL</Label><Input value={form.socialTiktok} onChange={(e) => setForm({ ...form, socialTiktok: e.target.value })} placeholder="https://tiktok.com/..." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Twitter/X URL</Label><Input value={form.socialTwitter} onChange={(e) => setForm({ ...form, socialTwitter: e.target.value })} placeholder="https://x.com/..." /></div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

// ── Full SEO Manager ──────────────────────────────────────────────

interface SeoPage {
  id: string; page_path: string; page_title: string; meta_title: string
  meta_description: string; meta_keywords: string; og_title: string
  og_description: string; og_image: string; canonical_url: string
  no_index: boolean; no_follow: boolean; structured_data: unknown
  created_at: string; updated_at: string
}

interface SeoCheck {
  label: string; passed: boolean; weight: number; tip: string
}

interface SeoPageAnalytics {
  id: string; page_path: string; page_title: string; meta_title: string; meta_description: string; no_index: boolean
  seoScore: number; checks: SeoCheck[]; discoverability: string
  traffic: {
    views30d: number; views7d: number; uniqueVisitors: number; avgDuration: number; searchTraffic: number
    referrers: { source: string; count: number }[]
  }
}

interface SeoAnalyticsData {
  overview: {
    avgSeoScore: number; totalPages: number; indexedPages: number; pagesWithIssues: number
    totalTraffic30d: number; searchEngineTraffic: number; searchTrafficPercent: number
  }
  pages: SeoPageAnalytics[]
  topReferrers: { source: string; count: number; isSearch: boolean }[]
}

const emptySeo: Partial<SeoPage> = {
  page_path: "", page_title: "", meta_title: "", meta_description: "",
  meta_keywords: "", og_title: "", og_description: "", og_image: "",
  canonical_url: "", no_index: false, no_follow: false,
}

function ScoreRing({ score, size = 48, strokeWidth = 4 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444"
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-secondary" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  )
}

function DiscoverabilityBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    excellent: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "Excellent" },
    good: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: "Good" },
    fair: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Fair" },
    poor: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Poor" },
    hidden: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500", label: "Hidden" },
  }
  const c = config[level] || config.poor
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{c.label}</span>
}

function SeoManager() {
  const { data: rawPages, mutate: mutatePages } = useSWR("/api/admin/seo", fetcher)
  const { data: analytics, mutate: mutateAnalytics } = useSWR<SeoAnalyticsData>("/api/admin/seo/analytics", fetcher)
  const [editing, setEditing] = useState<Partial<SeoPage> | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [activeView, setActiveView] = useState<"overview" | "pages">("overview")
  const [expandedPage, setExpandedPage] = useState<string | null>(null)

  // Guard: ensure pages is always an array (fixes crash when API returns error object)
  const pages: SeoPage[] = Array.isArray(rawPages) ? rawPages : []

  const filtered = useMemo(() =>
    pages.filter((p) =>
      p.page_path.toLowerCase().includes(search.toLowerCase()) ||
      (p.page_title || "").toLowerCase().includes(search.toLowerCase())
    ), [pages, search])

  const analyticsPages = useMemo(() => {
    if (!analytics?.pages) return []
    if (!search) return analytics.pages
    return analytics.pages.filter(p =>
      p.page_path.toLowerCase().includes(search.toLowerCase()) ||
      (p.page_title || "").toLowerCase().includes(search.toLowerCase())
    )
  }, [analytics, search])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    await fetch("/api/admin/seo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    })
    mutatePages()
    mutateAnalytics()
    setSaving(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SEO entry?")) return
    await fetch("/api/admin/seo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    mutatePages()
    mutateAnalytics()
  }

  const titleLen = (editing?.meta_title || "").length
  const descLen = (editing?.meta_description || "").length

  // ── Editing view ──
  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="text-lg font-semibold">{editing.id ? "Edit" : "New"} SEO Entry</h3>
              <p className="text-xs text-muted-foreground">{editing.page_path || "Set the page path"}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !editing.page_path} className="bg-foreground text-background hover:bg-foreground/90">
            <Check className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save SEO"}
          </Button>
        </div>

        <div className="border border-border rounded-sm p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Page Path</Label>
              <Input value={editing.page_path || ""} onChange={(e) => setEditing({ ...editing, page_path: e.target.value })} placeholder="e.g. / or /shop" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Page Label</Label>
              <Input value={editing.page_title || ""} onChange={(e) => setEditing({ ...editing, page_title: e.target.value })} placeholder="e.g. Home, Shop" />
            </div>
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Search className="h-3.5 w-3.5" /> Meta Tags
          </h4>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">Meta Title</Label>
              <span className={`text-xs ${titleLen > 60 ? "text-destructive" : titleLen > 50 ? "text-amber-500" : "text-muted-foreground"}`}>
                {titleLen}/60
              </span>
            </div>
            <Input value={editing.meta_title || ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} placeholder="Page title for search engines" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">Meta Description</Label>
              <span className={`text-xs ${descLen > 160 ? "text-destructive" : descLen > 140 ? "text-amber-500" : "text-muted-foreground"}`}>
                {descLen}/160
              </span>
            </div>
            <Textarea value={editing.meta_description || ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} rows={3} placeholder="Description shown in search results" />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Meta Keywords</Label>
            <Textarea value={editing.meta_keywords || ""} onChange={(e) => setEditing({ ...editing, meta_keywords: e.target.value })} rows={2} placeholder="Comma-separated keywords" />
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" /> Google Search Preview
          </h4>
          <div className="bg-secondary/30 rounded-sm p-4 space-y-1">
            <p className="text-sm text-blue-600 font-medium truncate">{editing.meta_title || editing.page_title || "Page Title"}</p>
            <p className="text-xs text-green-700">{"https://elanibeautyhub.com"}{editing.page_path || "/"}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{editing.meta_description || "No description set..."}</p>
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5" /> Open Graph (Social Sharing)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">OG Title</Label>
              <Input value={editing.og_title || ""} onChange={(e) => setEditing({ ...editing, og_title: e.target.value })} placeholder="Falls back to Meta Title" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">OG Image URL</Label>
              <Input value={editing.og_image || ""} onChange={(e) => setEditing({ ...editing, og_image: e.target.value })} placeholder="1200x630px recommended" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">OG Description</Label>
            <Textarea value={editing.og_description || ""} onChange={(e) => setEditing({ ...editing, og_description: e.target.value })} rows={2} placeholder="Falls back to Meta Description" />
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advanced</h4>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Canonical URL</Label>
            <Input value={editing.canonical_url || ""} onChange={(e) => setEditing({ ...editing, canonical_url: e.target.value })} placeholder="Override canonical URL (optional)" />
          </div>
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><EyeOff className="h-3.5 w-3.5" /> No Index</p>
                <p className="text-xs text-muted-foreground">Hide this page from search engine indexing</p>
              </div>
              <Switch checked={editing.no_index ?? false} onCheckedChange={(checked) => setEditing({ ...editing, no_index: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">No Follow</p>
                <p className="text-xs text-muted-foreground">Tell search engines not to follow links on this page</p>
              </div>
              <Switch checked={editing.no_follow ?? false} onCheckedChange={(checked) => setEditing({ ...editing, no_follow: checked })} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const overview = analytics?.overview
  const topRefs = analytics?.topReferrers || []

  // ── Main view with sub-tabs ──
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> SEO Manager</h3>
          <p className="text-xs text-muted-foreground mt-0.5">SEO health, rankings, discoverability, and page optimization.</p>
        </div>
        <Button onClick={() => setEditing({ ...emptySeo })} className="bg-foreground text-background hover:bg-foreground/90">
          <Plus className="h-4 w-4 mr-2" /> Add Page
        </Button>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveView("overview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === "overview" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <BarChart3 className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Overview & Ranks
        </button>
        <button
          onClick={() => setActiveView("pages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeView === "pages" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
          Manage Pages
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeView === "overview" && (
        <div className="space-y-6">
          {/* Site-wide SEO metrics */}
          {overview ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border border-border rounded-sm p-4 text-center">
                  <ScoreRing score={overview.avgSeoScore} size={56} strokeWidth={5} />
                  <p className="text-xs text-muted-foreground mt-2">Avg SEO Score</p>
                </div>
                <div className="border border-border rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span className="text-xl font-bold">{overview.indexedPages}/{overview.totalPages}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Indexed Pages</p>
                </div>
                <div className="border border-border rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-xl font-bold">{overview.totalTraffic30d.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Visits (30d)</p>
                </div>
                <div className="border border-border rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <span className="text-xl font-bold">{overview.searchTrafficPercent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">From Search Engines</p>
                </div>
              </div>

              {/* Issues alert */}
              {overview.pagesWithIssues > 0 && (
                <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-sm p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{overview.pagesWithIssues} page{overview.pagesWithIssues > 1 ? "s" : ""} need{overview.pagesWithIssues === 1 ? "s" : ""} attention</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Pages scoring below 60 have significant SEO gaps that may hurt discoverability.</p>
                  </div>
                </div>
              )}

              {/* Top referrers / traffic sources */}
              {topRefs.length > 0 && (
                <div className="border border-border rounded-sm p-5 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Top Traffic Sources (30d)
                  </h4>
                  <div className="space-y-2">
                    {topRefs.map((ref, i) => {
                      const maxCount = topRefs[0]?.count || 1
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm truncate flex items-center gap-1.5">
                                {ref.source}
                                {ref.isSearch && <Search className="h-3 w-3 text-blue-500" />}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{ref.count} visits</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${ref.isSearch ? "bg-blue-500" : "bg-foreground/30"}`}
                                style={{ width: `${(ref.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="border border-border rounded-sm p-10 text-center text-sm text-muted-foreground">Loading SEO analytics...</div>
          )}

          {/* Page rankings table */}
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="px-5 py-3 bg-secondary/30 border-b border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page SEO Rankings</h4>
            </div>
            {/* Search */}
            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-9" placeholder="Filter pages..." />
              </div>
            </div>
            {/* Header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-secondary/10">
              <div className="col-span-4">Page</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-2 text-center">Discoverability</div>
              <div className="col-span-1 text-center">Views</div>
              <div className="col-span-1 text-center">Search</div>
              <div className="col-span-1 text-center">Visitors</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {analyticsPages.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {analytics ? "No SEO entries found" : "Loading..."}
                </div>
              ) : analyticsPages.map((page) => (
                <div key={page.id}>
                  <div
                    className="sm:grid sm:grid-cols-12 gap-2 px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer items-center"
                    onClick={() => setExpandedPage(expandedPage === page.id ? null : page.id)}
                  >
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{page.page_title || page.page_path}</p>
                        {page.no_index && <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded flex-shrink-0">noindex</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{page.page_path}</p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <ScoreRing score={page.seoScore} size={36} strokeWidth={3} />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <DiscoverabilityBadge level={page.discoverability} />
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-sm font-medium">{page.traffic.views30d}</p>
                      <p className="text-[10px] text-muted-foreground">{page.traffic.views7d} /7d</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-sm font-medium">{page.traffic.searchTraffic}</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-sm font-medium">{page.traffic.uniqueVisitors}</p>
                    </div>
                    <div className="col-span-2 flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        const match = pages.find(p => p.id === page.id)
                        if (match) setEditing(match)
                      }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(page.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedPage === page.id && (
                    <div className="px-5 pb-4 bg-secondary/5 border-t border-border/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                        {/* SEO checklist */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">SEO Checklist</h5>
                          {page.checks.map((check, i) => (
                            <div key={i} className="flex items-start gap-2">
                              {check.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className="text-xs font-medium">{check.label}</p>
                                <p className="text-[10px] text-muted-foreground">{check.tip}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Traffic details */}
                        <div className="space-y-3">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Traffic Details</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-secondary/30 rounded-sm p-2.5">
                              <div className="flex items-center gap-1.5">
                                <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-semibold">{page.traffic.views30d}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Page Views (30d)</p>
                            </div>
                            <div className="bg-secondary/30 rounded-sm p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-semibold">{page.traffic.uniqueVisitors}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Unique Visitors</p>
                            </div>
                            <div className="bg-secondary/30 rounded-sm p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-semibold">{page.traffic.avgDuration > 0 ? `${Math.floor(page.traffic.avgDuration / 60)}m ${page.traffic.avgDuration % 60}s` : "--"}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Avg Duration</p>
                            </div>
                            <div className="bg-secondary/30 rounded-sm p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-semibold">{page.traffic.searchTraffic}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">Search Engine Hits</p>
                            </div>
                          </div>
                          {page.traffic.referrers.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Referrers</p>
                              {page.traffic.referrers.map((ref, i) => (
                                <div key={i} className="flex items-center justify-between py-0.5">
                                  <span className="text-xs truncate">{ref.source}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{ref.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE PAGES TAB ── */}
      {activeView === "pages" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder="Search pages..." />
          </div>

          <div className="border border-border rounded-sm divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">No SEO entries found</div>
            ) : filtered.map((page) => (
              <div key={page.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{page.page_title || page.page_path}</p>
                    {page.no_index && <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded">noindex</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{page.page_path}</p>
                  {page.meta_title && (
                    <p className="text-xs text-blue-600 mt-1 truncate">{page.meta_title}</p>
                  )}
                  {page.meta_description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{page.meta_description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(page)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(page.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

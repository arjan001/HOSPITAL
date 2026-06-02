"use client"

import { useState, useEffect } from "react"
import { useCmsDoc } from "@/lib/cms-store"
import { Save, Globe, FileText, Search } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { PosSettingsPanel } from "./pos-settings" // hidden until client requests POS module
import { ErrorReportingSettings } from "./error-reporting-settings"
import { StorageSettings } from "./storage-settings"

// ── Store settings document ───────────────────────────────────────
// Persisted in Postgres `cms_docs` under the key `store-settings` (via cmsStore).
// The storefront consumes these values through `/api/site-data`, which merges
// this document over the fixture defaults. Field names are snake_case so the
// merge in api-server is a direct spread with no remapping.

export type StoreSettings = {
  store_name: string
  store_email: string
  store_phone: string
  whatsapp_number: string
  currency_symbol: string
  free_shipping_threshold: number
  enable_whatsapp_checkout: boolean
  show_newsletter: boolean
  maintenance_mode: boolean
  // SEO
  site_title: string
  site_description: string
  meta_keywords: string
  logo_image_url: string
  favicon_url: string
  google_analytics_id: string
  facebook_pixel_id: string
  // Footer & social
  footer_description: string
  footer_instagram: string
  footer_tiktok: string
  footer_twitter: string
}

export const STORE_SETTINGS_DEFAULTS: StoreSettings = {
  store_name: "",
  store_email: "",
  store_phone: "",
  whatsapp_number: "",
  currency_symbol: "KSh",
  free_shipping_threshold: 5000,
  enable_whatsapp_checkout: true,
  show_newsletter: true,
  maintenance_mode: false,
  site_title: "",
  site_description: "",
  meta_keywords: "",
  logo_image_url: "",
  favicon_url: "",
  google_analytics_id: "",
  facebook_pixel_id: "",
  footer_description: "",
  footer_instagram: "",
  footer_tiktok: "",
  footer_twitter: "",
}

export function AdminSettings() {
  const [doc, setDoc] = useCmsDoc<StoreSettings>("store-settings", STORE_SETTINGS_DEFAULTS)
  const [saved, setSaved] = useState(false)

  // Local editable draft. Synced from the persisted doc whenever it loads or is
  // saved; user edits live here until "Save Changes" pushes them to cms_docs.
  const [form, setForm] = useState<StoreSettings>(doc)
  useEffect(() => {
    setForm(doc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])

  const handleSave = () => {
    setDoc(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <AdminShell title="Settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your store configuration, SEO, and footer. Changes are saved to the database and reflected on the storefront.</p>
          </div>
          <Button onClick={handleSave} className="bg-foreground text-background hover:bg-foreground/90">
            <Save className="h-4 w-4 mr-2" />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="footer">Footer & Social</TabsTrigger>
            {/* <TabsTrigger value="pos">POS & Receipt</TabsTrigger> hidden until client requests POS module */}
            <TabsTrigger value="error-reporting">Error Reporting</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"><Globe className="h-4 w-4" /> Store Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-medium mb-1.5 block">Store Name</Label><Input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Store Email</Label><Input value={form.store_email} onChange={(e) => set("store_email", e.target.value)} /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Store Phone</Label><Input value={form.store_phone} onChange={(e) => set("store_phone", e.target.value)} /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">WhatsApp Number</Label><Input value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="254..." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Currency Symbol</Label><Input value={form.currency_symbol} onChange={(e) => set("currency_symbol", e.target.value)} /></div>
                </div>
              </div>

              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Checkout & Features</h3>
                <div><Label className="text-sm font-medium mb-1.5 block">Free Shipping Threshold (KSh)</Label><Input type="number" inputMode="numeric" min={0} value={form.free_shipping_threshold} onChange={(e) => set("free_shipping_threshold", e.target.value === "" ? 0 : Number(e.target.value))} /></div>
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">WhatsApp Checkout</p><p className="text-xs text-muted-foreground">Enable ordering via WhatsApp</p></div>
                    <Switch checked={form.enable_whatsapp_checkout} onCheckedChange={(checked) => set("enable_whatsapp_checkout", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Newsletter</p><p className="text-xs text-muted-foreground">Display newsletter signup on homepage</p></div>
                    <Switch checked={form.show_newsletter} onCheckedChange={(checked) => set("show_newsletter", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Maintenance Mode</p><p className="text-xs text-muted-foreground">Temporarily take the storefront offline for customers (admin stays accessible)</p></div>
                    <Switch checked={form.maintenance_mode} onCheckedChange={(checked) => set("maintenance_mode", checked)} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"><Search className="h-4 w-4" /> Search Engine Optimization</h3>
                <p className="text-xs text-muted-foreground -mt-2">These power the storefront's default page title, meta description, and social preview.</p>
                <div className="space-y-4">
                  <div><Label className="text-sm font-medium mb-1.5 block">Site Title</Label><Input value={form.site_title} onChange={(e) => set("site_title", e.target.value)} placeholder="Shaniid RX — Medicine You Can Trust" /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Meta Description</Label><Textarea value={form.site_description} onChange={(e) => set("site_description", e.target.value)} rows={3} placeholder="Genuine, fairly-priced medicine delivered to your door." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Meta Keywords</Label><Input value={form.meta_keywords} onChange={(e) => set("meta_keywords", e.target.value)} placeholder="online pharmacy, medicine delivery, ..." /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-sm font-medium mb-1.5 block">Logo URL</Label><Input value={form.logo_image_url} onChange={(e) => set("logo_image_url", e.target.value)} placeholder="https://..." /></div>
                    <div><Label className="text-sm font-medium mb-1.5 block">Favicon URL</Label><Input value={form.favicon_url} onChange={(e) => set("favicon_url", e.target.value)} placeholder="https://..." /></div>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Analytics & Tracking</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-medium mb-1.5 block">Google Analytics ID</Label><Input value={form.google_analytics_id} onChange={(e) => set("google_analytics_id", e.target.value)} placeholder="G-XXXXXXXXXX" /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Facebook Pixel ID</Label><Input value={form.facebook_pixel_id} onChange={(e) => set("facebook_pixel_id", e.target.value)} placeholder="000000000000000" /></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="footer" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"><FileText className="h-4 w-4" /> Footer Content</h3>
                <div><Label className="text-sm font-medium mb-1.5 block">Footer Text / Description</Label><Textarea value={form.footer_description} onChange={(e) => set("footer_description", e.target.value)} rows={3} /></div>
              </div>
              <div className="border border-border rounded-sm p-6 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Social Media</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-sm font-medium mb-1.5 block">Instagram URL</Label><Input value={form.footer_instagram} onChange={(e) => set("footer_instagram", e.target.value)} placeholder="https://instagram.com/..." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">TikTok URL</Label><Input value={form.footer_tiktok} onChange={(e) => set("footer_tiktok", e.target.value)} placeholder="https://tiktok.com/..." /></div>
                  <div><Label className="text-sm font-medium mb-1.5 block">Twitter/X URL</Label><Input value={form.footer_twitter} onChange={(e) => set("footer_twitter", e.target.value)} placeholder="https://x.com/..." /></div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* <TabsContent value="pos" className="mt-6">
            <PosSettingsPanel />
          </TabsContent> hidden until client requests POS module */}

          <TabsContent value="error-reporting" className="mt-6">
            <ErrorReportingSettings />
          </TabsContent>

          <TabsContent value="storage" className="mt-6">
            <StorageSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

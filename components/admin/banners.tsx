"use client"

import { useState } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface HeroBannerData {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  button_link: string
  button_text: string
  is_active: boolean
  sort_order: number
}

interface BannerData {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  link_url: string
  position: string
  is_active: boolean
}

interface NavOfferData {
  id: string
  text: string
  is_active: boolean
}

interface PopupData {
  id: string
  title: string
  description: string | null
  discount_percentage: number | null
  discount_label: string | null
  image_url: string | null
  link: string
  valid_until: string | null
  is_active: boolean
}

export function AdminBanners() {
  const { data, mutate } = useSWR<{ banners: BannerData[]; navbarOffers: NavOfferData[]; popupOffers: PopupData[] }>("/api/admin/banners", fetcher)
  const banners = data?.banners || []
  const navOffers = data?.navbarOffers || []
  const popupOffers = data?.popupOffers || []

  // Hero banners
  const { data: heroBanners = [], mutate: mutateHero } = useSWR<HeroBannerData[]>("/api/admin/hero-banners", fetcher)
  const [heroModal, setHeroModal] = useState(false)
  const [editHero, setEditHero] = useState<HeroBannerData | null>(null)
  const [heroForm, setHeroForm] = useState({ title: "", subtitle: "", imageUrl: "", buttonLink: "/shop", buttonText: "Shop Now" })

  const openHeroNew = () => { setEditHero(null); setHeroForm({ title: "", subtitle: "", imageUrl: "", buttonLink: "/shop", buttonText: "Shop Now" }); setHeroModal(true) }
  const openHeroEdit = (h: HeroBannerData) => { setEditHero(h); setHeroForm({ title: h.title, subtitle: h.subtitle || "", imageUrl: h.image_url || "", buttonLink: h.button_link || "/shop", buttonText: h.button_text || "Shop Now" }); setHeroModal(true) }
  const saveHero = async () => {
    try {
      const response = await fetch("/api/admin/hero-banners", {
        method: editHero ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editHero?.id, ...heroForm, isActive: editHero?.is_active ?? true, sortOrder: editHero?.sort_order ?? heroBanners.length }),
      })
      if (!response.ok) throw new Error("Failed to save hero banner")
      await mutateHero()
      setHeroModal(false)
    } catch (error) {
      alert(`Error saving hero banner: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const deleteHero = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/hero-banners?id=${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete hero banner")
      await mutateHero()
    } catch (error) {
      alert(`Error deleting hero banner: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const toggleHero = async (h: HeroBannerData) => {
    await fetch("/api/admin/hero-banners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id, title: h.title, subtitle: h.subtitle, imageUrl: h.image_url, buttonLink: h.button_link, buttonText: h.button_text, isActive: !h.is_active, sortOrder: h.sort_order }) })
    mutateHero()
  }

  // Banner modal
  const [bannerModal, setBannerModal] = useState(false)
  const [editBanner, setEditBanner] = useState<BannerData | null>(null)
  const [bannerForm, setBannerForm] = useState({ title: "", subtitle: "", image: "", link: "", position: "hero" as string })

  // Nav offer modal
  const [navModal, setNavModal] = useState(false)
  const [editNav, setEditNav] = useState<NavOfferData | null>(null)
  const [navText, setNavText] = useState("")

  // Popup offer modal
  const [popupModal, setPopupModal] = useState(false)
  const [editPopup, setEditPopup] = useState<PopupData | null>(null)
  const [popupForm, setPopupForm] = useState({ title: "", description: "", discountPercentage: "", discountLabel: "", image: "", link: "/shop", validUntil: "" })

  // Banner CRUD
  const openBannerNew = () => { setEditBanner(null); setBannerForm({ title: "", subtitle: "", image: "", link: "", position: "hero" }); setBannerModal(true) }
  const openBannerEdit = (b: BannerData) => { setEditBanner(b); setBannerForm({ title: b.title, subtitle: b.subtitle || "", image: b.image_url || "", link: b.link_url, position: b.position }); setBannerModal(true) }
  const saveBanner = async () => {
    try {
      const response = await fetch("/api/admin/banners", {
        method: editBanner ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "banner", id: editBanner?.id, title: bannerForm.title, subtitle: bannerForm.subtitle, image: bannerForm.image, link: bannerForm.link, position: bannerForm.position, isActive: editBanner?.is_active ?? true }),
      })
      if (!response.ok) throw new Error("Failed to save banner")
      await mutate()
      setBannerModal(false)
    } catch (error) {
      alert(`Error saving banner: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const deleteBanner = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/banners?id=${id}&type=banner`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete banner")
      await mutate()
    } catch (error) {
      alert(`Error deleting banner: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const toggleBanner = async (b: BannerData) => {
    try {
      const response = await fetch("/api/admin/banners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "banner", id: b.id, title: b.title, subtitle: b.subtitle, image: b.image_url, link: b.link_url, position: b.position, isActive: !b.is_active }) })
      if (!response.ok) throw new Error("Failed to toggle banner")
      await mutate()
    } catch (error) {
      alert(`Error toggling banner: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Nav CRUD
  const openNavNew = () => { setEditNav(null); setNavText(""); setNavModal(true) }
  const openNavEdit = (n: NavOfferData) => { setEditNav(n); setNavText(n.text); setNavModal(true) }
  const saveNav = async () => {
    try {
      const response = await fetch("/api/admin/banners", { method: editNav ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "navbar_offer", id: editNav?.id, text: navText, isActive: editNav?.is_active ?? true }) })
      if (!response.ok) throw new Error("Failed to save navbar offer")
      await mutate()
      setNavModal(false)
    } catch (error) {
      alert(`Error saving navbar offer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const deleteNav = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/banners?id=${id}&type=navbar_offer`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete navbar offer")
      await mutate()
    } catch (error) {
      alert(`Error deleting navbar offer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const toggleNav = async (n: NavOfferData) => {
    try {
      const response = await fetch("/api/admin/banners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "navbar_offer", id: n.id, text: n.text, isActive: !n.is_active }) })
      if (!response.ok) throw new Error("Failed to toggle navbar offer")
      await mutate()
    } catch (error) {
      alert(`Error toggling navbar offer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Popup CRUD
  const openPopupNew = () => { setEditPopup(null); setPopupForm({ title: "", description: "", discountPercentage: "", discountLabel: "", image: "", link: "/shop", validUntil: "" }); setPopupModal(true) }
  const openPopupEdit = (p: PopupData) => { setEditPopup(p); setPopupForm({ title: p.title, description: p.description || "", discountPercentage: p.discount_percentage?.toString() || "", discountLabel: p.discount_label || "", image: p.image_url || "", link: p.link || "/shop", validUntil: p.valid_until || "" }); setPopupModal(true) }
  const savePopup = async () => {
    try {
      const response = await fetch("/api/admin/banners", { method: editPopup ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "popup_offer", id: editPopup?.id, title: popupForm.title, description: popupForm.description, discountPercentage: popupForm.discountPercentage ? Number(popupForm.discountPercentage) : null, discountLabel: popupForm.discountLabel, image: popupForm.image, link: popupForm.link, validUntil: popupForm.validUntil, isActive: editPopup?.is_active ?? true }) })
      if (!response.ok) throw new Error("Failed to save popup offer")
      await mutate()
      setPopupModal(false)
    } catch (error) {
      alert(`Error saving popup offer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const deletePopup = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/banners?id=${id}&type=popup_offer`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete popup offer")
      await mutate()
    } catch (error) {
      alert(`Error deleting popup offer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
  const togglePopup = async (p: PopupData) => {
    try {
      const response = await fetch("/api/admin/banners", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "popup_offer", id: p.id, title: p.title, description: p.description, discountPercentage: p.discount_percentage, discountLabel: p.discount_label, image: p.image_url, link: p.link, validUntil: p.valid_until, isActive: !p.is_active }) })
      if (!response.ok) throw new Error("Failed to toggle popup offer")
      await mutate()
    } catch (error) {
      alert(`Error toggling popup offer: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <AdminShell title="Offers & Banners">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Offers & Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage homepage banners, navbar running offers, and popup offers.</p>
        </div>

        <Tabs defaultValue="hero">
          <TabsList className="bg-secondary">
            <TabsTrigger value="hero">Hero Banners ({heroBanners.length})</TabsTrigger>
            <TabsTrigger value="banners">Banners ({banners.length})</TabsTrigger>
            <TabsTrigger value="navbar">Navbar Offers ({navOffers.length})</TabsTrigger>
            <TabsTrigger value="popup">Popup Offers ({popupOffers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="hero" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openHeroNew} className="bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-2" /> Add Hero Banner</Button>
            </div>
            {heroBanners.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No hero banners yet. Add your first collection banner above.</p>}
            {heroBanners.map((h) => (
              <div key={h.id} className="flex items-center gap-4 border border-border rounded-sm p-4">
                <div className="relative w-32 h-20 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                  <Image src={h.image_url || "/placeholder.svg"} alt={h.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{h.title}</h3>
                  <p className="text-xs text-muted-foreground">Link: {h.button_link} -- Button: {h.button_text}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={h.is_active} onCheckedChange={() => toggleHero(h)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHeroEdit(h)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteHero(h.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="banners" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openBannerNew} className="bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-2" /> Add Banner</Button>
            </div>
            {banners.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No banners yet. Add your first banner above.</p>}
            {banners.map((b) => (
              <div key={b.id} className="flex items-center gap-4 border border-border rounded-sm p-4">
                <div className="relative w-32 h-20 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                  <Image src={b.image_url || "/placeholder.svg"} alt={b.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{b.title}</h3>
                  <p className="text-xs text-muted-foreground">{b.subtitle} -- {b.position}</p>
                  <p className="text-xs text-muted-foreground">Link: {b.link_url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={b.is_active} onCheckedChange={() => toggleBanner(b)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBannerEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBanner(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="navbar" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openNavNew} className="bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-2" /> Add Offer Text</Button>
            </div>
            {navOffers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No navbar offers yet. Add your first offer above.</p>}
            {navOffers.map((n) => (
              <div key={n.id} className="flex items-center gap-4 border border-border rounded-sm p-4">
                <Megaphone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <p className="flex-1 text-sm">{n.text}</p>
                <div className="flex items-center gap-2">
                  <Switch checked={n.is_active} onCheckedChange={() => toggleNav(n)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openNavEdit(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNav(n.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="popup" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openPopupNew} className="bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-2" /> Add Popup Offer</Button>
            </div>
            {popupOffers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No popup offers yet. Add your first offer above.</p>}
            {popupOffers.map((p) => (
              <div key={p.id} className="flex items-center gap-4 border border-border rounded-sm p-4">
                <div className="relative w-20 h-14 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                  <Image src={p.image_url || "/placeholder.svg"} alt={p.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">{p.discount_percentage ? `${p.discount_percentage}% OFF` : "No discount set"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={p.is_active} onCheckedChange={() => togglePopup(p)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPopupEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePopup(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Banner Modal */}
      <Dialog open={bannerModal} onOpenChange={setBannerModal}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle className="font-serif">{editBanner ? "Edit" : "Add"} Banner</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label className="text-sm font-medium mb-1.5 block">Title *</Label><Input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} /></div>
            <div><Label className="text-sm font-medium mb-1.5 block">Subtitle</Label><Input value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} /></div>
            <div><Label className="text-sm font-medium mb-1.5 block">Image URL</Label><Input value={bannerForm.image} onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })} /></div>
            <div><Label className="text-sm font-medium mb-1.5 block">Link</Label><Input value={bannerForm.link} onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })} placeholder="/shop" /></div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Position</Label>
              <div className="flex gap-2">
                <Button variant={bannerForm.position === "hero" ? "default" : "outline"} size="sm" onClick={() => setBannerForm({ ...bannerForm, position: "hero" })} className={bannerForm.position === "hero" ? "bg-foreground text-background" : "bg-transparent"}>Hero</Button>
                <Button variant={bannerForm.position === "mid-page" ? "default" : "outline"} size="sm" onClick={() => setBannerForm({ ...bannerForm, position: "mid-page" })} className={bannerForm.position === "mid-page" ? "bg-foreground text-background" : "bg-transparent"}>Mid-page</Button>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setBannerModal(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={saveBanner} disabled={!bannerForm.title} className="bg-foreground text-background hover:bg-foreground/90">{editBanner ? "Update" : "Add"} Banner</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nav Offer Modal */}
      <Dialog open={navModal} onOpenChange={setNavModal}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle className="font-serif">{editNav ? "Edit" : "Add"} Navbar Offer</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label className="text-sm font-medium mb-1.5 block">Offer Text *</Label><Input value={navText} onChange={(e) => setNavText(e.target.value)} placeholder="FREE SHIPPING on orders above KSh 5,000" /></div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setNavModal(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={saveNav} disabled={!navText} className="bg-foreground text-background hover:bg-foreground/90">{editNav ? "Update" : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup Offer Modal */}
      <Dialog open={popupModal} onOpenChange={setPopupModal}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle className="font-serif">{editPopup ? "Edit" : "Add"} Popup Offer</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label className="text-sm font-medium mb-1.5 block">Title *</Label><Input value={popupForm.title} onChange={(e) => setPopupForm({ ...popupForm, title: e.target.value })} /></div>
            <div><Label className="text-sm font-medium mb-1.5 block">Description</Label><Textarea value={popupForm.description} onChange={(e) => setPopupForm({ ...popupForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm font-medium mb-1.5 block">Discount %</Label><Input type="number" value={popupForm.discountPercentage} onChange={(e) => setPopupForm({ ...popupForm, discountPercentage: e.target.value })} placeholder="30" /></div>
              <div><Label className="text-sm font-medium mb-1.5 block">Image URL</Label><Input value={popupForm.image} onChange={(e) => setPopupForm({ ...popupForm, image: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setPopupModal(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={savePopup} disabled={!popupForm.title} className="bg-foreground text-background hover:bg-foreground/90">{editPopup ? "Update" : "Add"} Offer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Hero Banner Modal */}
      <Dialog open={heroModal} onOpenChange={setHeroModal}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle className="font-serif">{editHero ? "Edit" : "Add"} Hero Banner</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label className="text-sm font-medium mb-1.5 block">Title *</Label><Input value={heroForm.title} onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })} placeholder="Premium Bodysuits Collection" /></div>
            <div><Label className="text-sm font-medium mb-1.5 block">Subtitle</Label><Input value={heroForm.subtitle} onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })} placeholder="Discover stylish women's fashion" /></div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Banner Image</Label>
              <Input value={heroForm.imageUrl} onChange={(e) => setHeroForm({ ...heroForm, imageUrl: e.target.value })} placeholder="/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg" />
              <p className="text-[11px] text-muted-foreground mt-1">Use any image from /images/products/** (e.g. /images/products/earrings/amara-gemstone-drops.jpeg, /images/products/women-watches/gold-flower-bracelet-watch.jpeg, /images/products/bracelets/celestia-graduated-cz-bracelet.jpeg).</p>
              {heroForm.imageUrl && (
                <div className="relative w-full h-28 mt-2 rounded-sm overflow-hidden bg-secondary">
                  <Image src={heroForm.imageUrl} alt="Preview" fill className="object-cover" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm font-medium mb-1.5 block">Button Link</Label><Input value={heroForm.buttonLink} onChange={(e) => setHeroForm({ ...heroForm, buttonLink: e.target.value })} placeholder="/shop" /></div>
              <div><Label className="text-sm font-medium mb-1.5 block">Button Text</Label><Input value={heroForm.buttonText} onChange={(e) => setHeroForm({ ...heroForm, buttonText: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setHeroModal(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={saveHero} disabled={!heroForm.title} className="bg-foreground text-background hover:bg-foreground/90">{editHero ? "Update" : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

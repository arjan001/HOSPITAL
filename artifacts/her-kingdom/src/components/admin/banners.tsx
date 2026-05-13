"use client"

import { useState } from "react"
import {
  Plus, Pencil, Trash2, Megaphone, ArrowUp, ArrowDown,
  Image as ImageIcon, Link2, Eye, EyeOff,
} from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCmsCollection, newId, type CmsRecord } from "@/lib/cms-store"

const WINE = "#3D0814"

/* ─────────────────────────────────────────────────────────────
   TYPES + CMS KEYS
────────────────────────────────────────────────────────────── */

export interface HeroSlide extends CmsRecord {
  id: string
  title: string
  subtitle: string
  image: string
  buttonText: string
  buttonLink: string
  isActive: boolean
}

export interface PromoBanner extends CmsRecord {
  id: string
  kicker: string
  title: string
  subtitle: string
  image: string
  link: string
  cta: string
  textSide: "left" | "right"
  tone: "light" | "dark"
  isActive: boolean
}

export interface NavOffer extends CmsRecord {
  id: string
  text: string
  href: string
  isActive: boolean
}

export const HERO_SLIDES_KEY = "hero-slides"
export const PROMO_BANNERS_KEY = "promo-banners"
export const NAV_OFFERS_KEY = "navbar-offers"

export const HERO_SLIDES_DEFAULTS: HeroSlide[] = [
  {
    id: "hero-1",
    title: "Your Trusted Online Pharmacy",
    subtitle:
      "Authentic medications, vitamins and medical devices — sourced from licensed suppliers, delivered quickly across Kenya.",
    image: "/banners/hero-pharmacy-main.png",
    buttonText: "Shop Medications",
    buttonLink: "/shop?category=medications",
    isActive: true,
  },
  {
    id: "hero-2",
    title: "Smart Medical Devices",
    subtitle:
      "Thermometers, blood pressure monitors, pulse oximeters and more — keep track of your health at home.",
    image: "/banners/hero-medical-devices.png",
    buttonText: "Browse Devices",
    buttonLink: "/shop?category=medical-devices",
    isActive: true,
  },
  {
    id: "hero-3",
    title: "Vitamins & Wellness",
    subtitle:
      "Daily multivitamins, immunity boosters and supplements to support your everyday wellbeing.",
    image: "/banners/hero-vitamins-supplements.png",
    buttonText: "Shop Wellness",
    buttonLink: "/shop?category=vitamins",
    isActive: true,
  },
]

export const PROMO_BANNERS_DEFAULTS: PromoBanner[] = [
  {
    id: "promo-1",
    kicker: "Wellness & Supplements",
    title: "Daily Gummies for Glowing Health",
    subtitle: "Turmeric, collagen and tropical vitamins — fruit-flavoured, easy on the gut.",
    image: "/banner-wellness.png",
    link: "/shop?category=wellness-supplements",
    cta: "Shop Now",
    textSide: "right",
    tone: "light",
    isActive: true,
  },
  {
    id: "promo-2",
    kicker: "Skincare & Beauty",
    title: "Glow Rituals — Up to 30% Off",
    subtitle: "Pharmacist-loved serums, creams and personal-care picks delivered to your door.",
    image: "/banner-skincare.png",
    link: "/shop?category=skincare-beauty",
    cta: "Discover",
    textSide: "left",
    tone: "dark",
    isActive: true,
  },
]

export const NAV_OFFERS_DEFAULTS: NavOffer[] = []

/* ─────────────────────────────────────────────────────────────
   SHARED ROW PRIMITIVES
────────────────────────────────────────────────────────────── */

function RowActions({
  active, onToggle, onEdit, onDelete, onUp, onDown, isFirst, isLast,
}: {
  active: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onUp: () => void
  onDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost" size="icon" className="h-8 w-8"
        onClick={onUp} disabled={isFirst} title="Move up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-8 w-8"
        onClick={onDown} disabled={isLast} title="Move down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
      <Switch checked={active} onCheckedChange={onToggle} />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost" size="icon" className="h-8 w-8 text-destructive"
        onClick={onDelete} title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function ImagePreview({ src, alt, className = "w-32 h-20" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative ${className} bg-secondary rounded-sm overflow-hidden flex-shrink-0 border border-border`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, label }: { icon: typeof ImageIcon; label: string }) {
  return (
    <div className="border border-dashed border-border rounded-sm py-12 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/* Move helper */
function moveItem<T extends { id: string }>(items: T[], idx: number, delta: -1 | 1): string[] {
  const target = idx + delta
  if (target < 0 || target >= items.length) return items.map((i) => i.id)
  const next = items.slice()
  const [moved] = next.splice(idx, 1)
  next.splice(target, 0, moved)
  return next.map((i) => i.id)
}

/* ─────────────────────────────────────────────────────────────
   HERO SLIDES TAB
────────────────────────────────────────────────────────────── */

const HERO_FORM_BLANK: Omit<HeroSlide, "id" | "isActive"> = {
  title: "", subtitle: "", image: "", buttonText: "Shop Now", buttonLink: "/shop",
}

function HeroSlidesTab() {
  const { items, upsert, remove, reorder } = useCmsCollection<HeroSlide>(HERO_SLIDES_KEY, HERO_SLIDES_DEFAULTS)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<HeroSlide | null>(null)
  const [form, setForm] = useState({ ...HERO_FORM_BLANK })

  const openNew = () => { setEditing(null); setForm({ ...HERO_FORM_BLANK }); setOpen(true) }
  const openEdit = (h: HeroSlide) => {
    setEditing(h)
    setForm({ title: h.title, subtitle: h.subtitle, image: h.image, buttonText: h.buttonText, buttonLink: h.buttonLink })
    setOpen(true)
  }
  const save = () => {
    if (!form.title.trim()) return
    upsert({
      id: editing?.id || newId("hero"),
      isActive: editing?.isActive ?? true,
      ...form,
    })
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Slides shown on the homepage hero. The first active slide is the main banner; the next two appear as side cards.
        </p>
        <Button onClick={openNew} className="text-white" style={{ background: WINE }}>
          <Plus className="h-4 w-4 mr-2" /> Add Hero Slide
        </Button>
      </div>

      {items.length === 0 && <EmptyState icon={ImageIcon} label="No hero slides yet. Add your first slide above." />}

      <div className="space-y-2">
        {items.map((h, idx) => (
          <div key={h.id} className="flex items-center gap-4 border border-border rounded-sm p-3 bg-card">
            <div className="text-xs font-mono text-muted-foreground w-6 text-center">{idx + 1}</div>
            <ImagePreview src={h.image} alt={h.title} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{h.title}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{h.subtitle}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                <Link2 className="h-3 w-3" /> {h.buttonLink}
                <span className="mx-1">·</span>
                <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground/70">{h.buttonText}</span>
                {!h.isActive && <span className="ml-1 text-amber-700 inline-flex items-center gap-1"><EyeOff className="h-3 w-3" />Hidden</span>}
              </p>
            </div>
            <RowActions
              active={h.isActive}
              onToggle={() => upsert({ ...h, isActive: !h.isActive })}
              onEdit={() => openEdit(h)}
              onDelete={() => remove(h.id)}
              onUp={() => reorder(moveItem(items, idx, -1))}
              onDown={() => reorder(moveItem(items, idx, 1))}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
            />
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Hero Slide</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Field label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Your Trusted Online Pharmacy" />
            <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} placeholder="Short supporting line" multiline />
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Image URL</Label>
              <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/banners/hero-pharmacy-main.png" />
              {form.image && (
                <div className="relative w-full h-28 mt-2 rounded-sm overflow-hidden bg-secondary border border-border">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button Text" value={form.buttonText} onChange={(v) => setForm({ ...form, buttonText: v })} />
              <Field label="Button Link" value={form.buttonLink} onChange={(v) => setForm({ ...form, buttonLink: v })} placeholder="/shop" />
            </div>
            <DialogFooter onCancel={() => setOpen(false)} onSave={save} disabled={!form.title.trim()} editing={!!editing} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PROMO BANNERS TAB
────────────────────────────────────────────────────────────── */

const PROMO_FORM_BLANK: Omit<PromoBanner, "id" | "isActive"> = {
  kicker: "", title: "", subtitle: "", image: "", link: "/shop", cta: "Shop Now",
  textSide: "left", tone: "light",
}

function PromoBannersTab() {
  const { items, upsert, remove, reorder } = useCmsCollection<PromoBanner>(PROMO_BANNERS_KEY, PROMO_BANNERS_DEFAULTS)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PromoBanner | null>(null)
  const [form, setForm] = useState({ ...PROMO_FORM_BLANK })

  const openNew = () => { setEditing(null); setForm({ ...PROMO_FORM_BLANK }); setOpen(true) }
  const openEdit = (p: PromoBanner) => {
    setEditing(p)
    setForm({
      kicker: p.kicker, title: p.title, subtitle: p.subtitle, image: p.image,
      link: p.link, cta: p.cta, textSide: p.textSide, tone: p.tone,
    })
    setOpen(true)
  }
  const save = () => {
    if (!form.title.trim()) return
    upsert({ id: editing?.id || newId("promo"), isActive: editing?.isActive ?? true, ...form })
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Mid-page promo cards shown below the hero. Two are visible at a time on desktop.
        </p>
        <Button onClick={openNew} className="text-white" style={{ background: WINE }}>
          <Plus className="h-4 w-4 mr-2" /> Add Promo Banner
        </Button>
      </div>

      {items.length === 0 && <EmptyState icon={ImageIcon} label="No promo banners yet. Add your first banner above." />}

      <div className="space-y-2">
        {items.map((p, idx) => (
          <div key={p.id} className="flex items-center gap-4 border border-border rounded-sm p-3 bg-card">
            <div className="text-xs font-mono text-muted-foreground w-6 text-center">{idx + 1}</div>
            <ImagePreview src={p.image} alt={p.title} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/80 mb-0.5">{p.kicker}</p>
              <h3 className="text-sm font-semibold truncate">{p.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{p.subtitle}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />{p.link}</span>
                <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground/70">CTA: {p.cta}</span>
                <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground/70">Text: {p.textSide}</span>
                <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground/70">Tone: {p.tone}</span>
                {!p.isActive && <span className="text-amber-700 inline-flex items-center gap-1"><EyeOff className="h-3 w-3" />Hidden</span>}
              </p>
            </div>
            <RowActions
              active={p.isActive}
              onToggle={() => upsert({ ...p, isActive: !p.isActive })}
              onEdit={() => openEdit(p)}
              onDelete={() => remove(p.id)}
              onUp={() => reorder(moveItem(items, idx, -1))}
              onDown={() => reorder(moveItem(items, idx, 1))}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
            />
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Promo Banner</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Field label="Kicker" value={form.kicker} onChange={(v) => setForm({ ...form, kicker: v })} placeholder="Wellness & Supplements" />
            <Field label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} multiline />
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Image URL</Label>
              <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/banner-wellness.png" />
              {form.image && (
                <div className="relative w-full h-28 mt-2 rounded-sm overflow-hidden bg-secondary border border-border">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link" value={form.link} onChange={(v) => setForm({ ...form, link: v })} placeholder="/shop" />
              <Field label="CTA Text" value={form.cta} onChange={(v) => setForm({ ...form, cta: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Text Side</Label>
                <div className="flex gap-2">
                  {(["left", "right"] as const).map((s) => (
                    <Button key={s} type="button" variant={form.textSide === s ? "default" : "outline"} size="sm"
                      onClick={() => setForm({ ...form, textSide: s })}
                      className={form.textSide === s ? "text-white" : "bg-transparent"}
                      style={form.textSide === s ? { background: WINE } : undefined}>{s}</Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Tone</Label>
                <div className="flex gap-2">
                  {(["light", "dark"] as const).map((t) => (
                    <Button key={t} type="button" variant={form.tone === t ? "default" : "outline"} size="sm"
                      onClick={() => setForm({ ...form, tone: t })}
                      className={form.tone === t ? "text-white" : "bg-transparent"}
                      style={form.tone === t ? { background: WINE } : undefined}>{t}</Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter onCancel={() => setOpen(false)} onSave={save} disabled={!form.title.trim()} editing={!!editing} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   NAVBAR OFFERS TAB
────────────────────────────────────────────────────────────── */

function NavbarOffersTab() {
  const { items, upsert, remove, reorder } = useCmsCollection<NavOffer>(NAV_OFFERS_KEY, NAV_OFFERS_DEFAULTS)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NavOffer | null>(null)
  const [form, setForm] = useState({ text: "", href: "" })

  const openNew = () => { setEditing(null); setForm({ text: "", href: "" }); setOpen(true) }
  const openEdit = (n: NavOffer) => { setEditing(n); setForm({ text: n.text, href: n.href || "" }); setOpen(true) }
  const save = () => {
    if (!form.text.trim()) return
    upsert({ id: editing?.id || newId("nav"), isActive: editing?.isActive ?? true, ...form })
    setOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Short messages that scroll across the marquee bar. Used as a fallback when the Announcement Bar is disabled.
        </p>
        <Button onClick={openNew} className="text-white" style={{ background: WINE }}>
          <Plus className="h-4 w-4 mr-2" /> Add Offer Text
        </Button>
      </div>

      {items.length === 0 && <EmptyState icon={Megaphone} label="No navbar offers yet. Add your first message above." />}

      <div className="space-y-2">
        {items.map((n, idx) => (
          <div key={n.id} className="flex items-center gap-4 border border-border rounded-sm p-3 bg-card">
            <Megaphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{n.text}</p>
              {n.href && (
                <p className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />{n.href}
                </p>
              )}
            </div>
            <RowActions
              active={n.isActive}
              onToggle={() => upsert({ ...n, isActive: !n.isActive })}
              onEdit={() => openEdit(n)}
              onDelete={() => remove(n.id)}
              onUp={() => reorder(moveItem(items, idx, -1))}
              onDown={() => reorder(moveItem(items, idx, 1))}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
            />
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Navbar Offer</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Field label="Offer Text *" value={form.text} onChange={(v) => setForm({ ...form, text: v })} placeholder="FREE DELIVERY on orders above KSh 5,000" />
            <Field label="Link (optional)" value={form.href} onChange={(v) => setForm({ ...form, href: v })} placeholder="/shop" />
            <DialogFooter onCancel={() => setOpen(false)} onSave={save} disabled={!form.text.trim()} editing={!!editing} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SHARED FORM BITS
────────────────────────────────────────────────────────────── */

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean
}) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

function DialogFooter({
  onCancel, onSave, disabled, editing,
}: { onCancel: () => void; onSave: () => void; disabled: boolean; editing: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-border">
      <Button variant="outline" onClick={onCancel} className="bg-transparent">Cancel</Button>
      <Button onClick={onSave} disabled={disabled} className="text-white" style={{ background: WINE }}>
        {editing ? "Update" : "Add"}
      </Button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ROOT
────────────────────────────────────────────────────────────── */

export function AdminBanners() {
  const { items: heroItems } = useCmsCollection<HeroSlide>(HERO_SLIDES_KEY, HERO_SLIDES_DEFAULTS)
  const { items: promoItems } = useCmsCollection<PromoBanner>(PROMO_BANNERS_KEY, PROMO_BANNERS_DEFAULTS)
  const { items: navItems } = useCmsCollection<NavOffer>(NAV_OFFERS_KEY, NAV_OFFERS_DEFAULTS)

  return (
    <AdminShell title="Offers & Banners">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Offers & Banners</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage homepage hero slides, mid-page promo banners and the marquee offer messages.
            Popup offers are managed separately under <a className="underline" href="/admin/popup-offer">Popup Offer</a>.
          </p>
        </div>

        <Tabs defaultValue="hero">
          <TabsList className="bg-secondary">
            <TabsTrigger value="hero">Hero Slides ({heroItems.length})</TabsTrigger>
            <TabsTrigger value="promos">Promo Banners ({promoItems.length})</TabsTrigger>
            <TabsTrigger value="navbar">Navbar Offers ({navItems.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="hero" className="mt-6"><HeroSlidesTab /></TabsContent>
          <TabsContent value="promos" className="mt-6"><PromoBannersTab /></TabsContent>
          <TabsContent value="navbar" className="mt-6"><NavbarOffersTab /></TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

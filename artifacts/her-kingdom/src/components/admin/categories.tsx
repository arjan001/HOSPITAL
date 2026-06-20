"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, ChevronRight, ChevronDown,
  Search, ImageIcon, Eye, EyeOff, Upload, Loader2,
  Pill, Stethoscope, Heart, HeartPulse, Baby, Sparkles, Leaf,
  ShieldCheck, FlaskConical, Syringe, Eye as EyeLucide, Activity, Tag,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCmsCollection, newId, slugify, cmsStore, type CmsRecord } from "@/lib/cms-store"
import { safeFetcher, asArray } from "@/lib/fetcher"
import { CATALOG_CATEGORIES } from "@/lib/catalog-api"
import { apiFetch } from "@/lib/api-client"
import { compressImage } from "@/lib/media-utils"
import type { Category as StoreCategory } from "@/lib/types"

const WINE = "#3D0814"

/* ─────────────────────────────────────────────────────────────
   TYPE + DEFAULTS
────────────────────────────────────────────────────────────── */

export interface CmsCategory extends CmsRecord {
  id: string
  name: string
  slug: string
  parentId: string | null
  icon: string        // lucide-react icon name; "" for none
  image: string       // thumbnail URL
  banner: string      // category page hero URL
  isActive: boolean
}

export const CATEGORIES_KEY = "categories"

export const ICON_LIBRARY: { name: string; Icon: LucideIcon }[] = [
  { name: "Pill", Icon: Pill },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "Heart", Icon: Heart },
  { name: "HeartPulse", Icon: HeartPulse },
  { name: "Baby", Icon: Baby },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Leaf", Icon: Leaf },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "FlaskConical", Icon: FlaskConical },
  { name: "Syringe", Icon: Syringe },
  { name: "Eye", Icon: EyeLucide },
  { name: "Activity", Icon: Activity },
  { name: "Tag", Icon: Tag },
]

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_LIBRARY.map((i) => [i.name, i.Icon]))

export function getCategoryIcon(name: string): LucideIcon | null {
  return ICON_MAP[name] || null
}

export const CATEGORIES_DEFAULTS: CmsCategory[] = [
  { id: "cat-medications",   name: "Medications",            slug: "medications",            parentId: null,                 icon: "Pill",         image: "/images/categories/medications.png",      banner: "", isActive: true },
  { id: "cat-pain-relief",   name: "Pain Relief",            slug: "pain-relief",            parentId: "cat-medications",    icon: "Activity",     image: "",                                        banner: "", isActive: true },
  { id: "cat-cold-flu",      name: "Cold & Flu",             slug: "cold-flu",               parentId: "cat-medications",    icon: "ShieldCheck",  image: "",                                        banner: "", isActive: true },
  { id: "cat-antibiotics",   name: "Antibiotics",            slug: "antibiotics",            parentId: "cat-medications",    icon: "FlaskConical", image: "",                                        banner: "", isActive: true },
  { id: "cat-vitamins",      name: "Vitamins & Supplements", slug: "vitamins",               parentId: null,                 icon: "Leaf",         image: "/images/categories/vitamins.png",         banner: "", isActive: true },
  { id: "cat-medical-dev",   name: "Medical Devices",        slug: "medical-devices",        parentId: null,                 icon: "Stethoscope",  image: "/images/categories/medical-devices.png",  banner: "", isActive: true },
  { id: "cat-bp",            name: "Blood Pressure",         slug: "blood-pressure-monitors", parentId: "cat-medical-dev",   icon: "HeartPulse",   image: "",                                        banner: "", isActive: true },
  { id: "cat-glucose",       name: "Glucose Monitors",       slug: "glucose-monitors",       parentId: "cat-medical-dev",    icon: "Activity",     image: "",                                        banner: "", isActive: true },
  { id: "cat-personal-care", name: "Personal Care",          slug: "personal-care",          parentId: null,                 icon: "Sparkles",     image: "/images/categories/personal-care.png",    banner: "", isActive: true },
  { id: "cat-mother-baby",   name: "Mother & Baby",          slug: "mother-baby",            parentId: null,                 icon: "Baby",         image: "/images/categories/mother-baby.png",      banner: "", isActive: true },
  { id: "cat-skincare",      name: "Skincare & Beauty",      slug: "skincare-beauty",        parentId: null,                 icon: "Sparkles",     image: "/images/categories/skincare-beauty.png",  banner: "", isActive: true },
]

/* ─────────────────────────────────────────────────────────────
   STOREFRONT-FACING HOOK
   Returns Category[] (compat with existing storefront type).
   Prefers cmsStore active categories; falls back to API if empty.
────────────────────────────────────────────────────────────── */

export function useCategories(): StoreCategory[] {
  const { items } = useCmsCollection<CmsCategory>(CATEGORIES_KEY, CATEGORIES_DEFAULTS)
  const { data } = useSWR<StoreCategory[]>(CATALOG_CATEGORIES, safeFetcher)

  // Only prefer cmsStore when an admin has explicitly persisted edits — the
  // seeded defaults shouldn't shadow real backend data on first load.
  const persisted = cmsStore.has(CATEGORIES_KEY)
  if (persisted) {
    const cms = items.filter((c) => c.isActive)
    if (cms.length > 0) {
      return cms.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image || "/placeholder.svg",
        productCount: 0,
      }))
    }
  }
  return asArray<StoreCategory>(data)
}

/* ─────────────────────────────────────────────────────────────
   ADMIN
────────────────────────────────────────────────────────────── */

interface FormState {
  name: string
  slug: string
  parentId: string | null
  icon: string
  image: string
  banner: string
}

const EMPTY_FORM: FormState = {
  name: "", slug: "", parentId: null, icon: "", image: "", banner: "",
}

interface TreeRow {
  cat: CmsCategory
  index: number
  isFirstInGroup: boolean
  isLastInGroup: boolean
}

function moveWithinSiblings(items: CmsCategory[], idx: number, delta: -1 | 1): string[] {
  const target = items[idx]
  if (!target) return items.map((c) => c.id)
  const siblings = items.filter((c) => c.parentId === target.parentId)
  const sIdx = siblings.findIndex((c) => c.id === target.id)
  const sNext = sIdx + delta
  if (sNext < 0 || sNext >= siblings.length) return items.map((c) => c.id)
  const newSiblings = siblings.slice()
  const [moved] = newSiblings.splice(sIdx, 1)
  newSiblings.splice(sNext, 0, moved)
  // Splice the new sibling order back into the full list at the original positions.
  let cursor = 0
  return items.map((c) => {
    if (c.parentId !== target.parentId) return c.id
    const next = newSiblings[cursor++]
    return next.id
  })
}

export function AdminCategories() {
  const { items, upsert, remove, reorder } = useCmsCollection<CmsCategory>(CATEGORIES_KEY, CATEGORIES_DEFAULTS)

  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CmsCategory | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [uploading, setUploading] = useState<"image" | "banner" | null>(null)

  const MAX_MB = 5

  const handleImageUpload = async (field: "image" | "banner", files: FileList | null) => {
    if (!files?.length) return
    setUploading(field)
    const rawFile = files[0]
    let file = rawFile
    if (file.size > MAX_MB * 1024 * 1024) {
      file = await compressImage(rawFile, MAX_MB)
      if (file.size > MAX_MB * 1024 * 1024) {
        setUploading(null)
        return
      }
    }
    const formData = new FormData()
    formData.append("file", file)
    formData.append("productSlug", "categories")
    try {
      const res = await apiFetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) setForm((prev) => ({ ...prev, [field]: data.url }))
    } catch (err) {
      console.error("Upload failed:", err)
    }
    setUploading(null)
  }

  const parents = items.filter((c) => c.parentId === null)
  const childrenOf = useMemo(() => {
    const m = new Map<string, CmsCategory[]>()
    items.forEach((c) => {
      if (!c.parentId) return
      const list = m.get(c.parentId) || []
      list.push(c)
      m.set(c.parentId, list)
    })
    return m
  }, [items])

  const matchesSearch = (c: CmsCategory) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())

  const rows: TreeRow[] = []
  parents.forEach((p) => {
    const parentMatches = matchesSearch(p)
    const children = childrenOf.get(p.id) || []
    const childMatches = children.filter(matchesSearch)
    if (!parentMatches && childMatches.length === 0) return

    const pIdx = items.findIndex((c) => c.id === p.id)
    rows.push({
      cat: p,
      index: pIdx,
      isFirstInGroup: parents[0]?.id === p.id,
      isLastInGroup: parents[parents.length - 1]?.id === p.id,
    })
    if (collapsed[p.id]) return
    const visibleChildren = search.trim() ? childMatches : children
    visibleChildren.forEach((ch) => {
      const cIdx = items.findIndex((c) => c.id === ch.id)
      rows.push({
        cat: ch,
        index: cIdx,
        isFirstInGroup: children[0]?.id === ch.id,
        isLastInGroup: children[children.length - 1]?.id === ch.id,
      })
    })
  })

  const openNew = (parentId: string | null = null) => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, parentId })
    setOpen(true)
  }
  const openEdit = (c: CmsCategory) => {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug, parentId: c.parentId, icon: c.icon, image: c.image, banner: c.banner })
    setOpen(true)
  }
  const save = () => {
    if (!form.name.trim()) return
    const slug = (form.slug || slugify(form.name)).trim()
    upsert({
      id: editing?.id || newId("cat"),
      name: form.name.trim(),
      slug,
      parentId: form.parentId,
      icon: form.icon,
      image: form.image,
      banner: form.banner,
      isActive: editing?.isActive ?? true,
    })
    setOpen(false)
  }
  const onDelete = (c: CmsCategory) => {
    const kids = childrenOf.get(c.id) || []
    if (kids.length > 0) {
      if (!confirm(`"${c.name}" has ${kids.length} subcategor${kids.length === 1 ? "y" : "ies"}. Delete it and re-parent its children to top-level?`)) return
      kids.forEach((k) => upsert({ ...k, parentId: null }))
    } else if (!confirm(`Delete "${c.name}"?`)) {
      return
    }
    remove(c.id)
  }

  const Row = ({ row }: { row: TreeRow }) => {
    const { cat, index } = row
    const Icon = getCategoryIcon(cat.icon)
    const childCount = (childrenOf.get(cat.id) || []).length
    const isParent = cat.parentId === null
    const isCollapsed = !!collapsed[cat.id]

    return (
      <div
        className={`flex items-center gap-3 border border-border rounded-sm p-3 bg-card ${
          isParent ? "" : "ml-8 border-l-2 border-l-secondary"
        }`}
      >
        {isParent && childCount > 0 ? (
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCollapsed((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="w-7" />
        )}

        <div className="w-10 h-10 bg-secondary rounded-sm flex items-center justify-center overflow-hidden flex-shrink-0">
          {cat.image ? (
            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
          ) : Icon ? (
            <Icon className="h-5 w-5 text-foreground/70" />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{cat.name}</h3>
            {isParent && childCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/60">
                {childCount} sub
              </span>
            )}
            {!cat.isActive && (
              <span className="text-[10px] text-amber-700 inline-flex items-center gap-1">
                <EyeOff className="h-3 w-3" />Hidden
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">/{cat.slug}{cat.icon && ` · ${cat.icon}`}</p>
        </div>

        <div className="flex items-center gap-1.5">
          {isParent && (
            <Button
              variant="ghost" size="sm" className="h-8 text-xs"
              onClick={() => openNew(cat.id)} title="Add subcategory"
            >
              <Plus className="h-3 w-3 mr-1" /> Sub
            </Button>
          )}
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => reorder(moveWithinSiblings(items, index, -1))} title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => reorder(moveWithinSiblings(items, index, 1))} title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Switch checked={cat.isActive} onCheckedChange={() => upsert({ ...cat, isActive: !cat.isActive })} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)} title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(cat)} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AdminShell title="Categories">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length} categories · {parents.length} top-level. Drag uses up/down arrows; subcategories nest under their parent.
            </p>
          </div>
          <Button onClick={() => openNew(null)} className="text-white" style={{ background: WINE }}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        {rows.length === 0 ? (
          <div className="border border-dashed border-border rounded-sm py-12 text-center">
            <Tag className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search.trim() ? "No categories match your search." : "No categories yet. Add your first category above."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Row key={r.cat.id} row={r} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Add"} Category
              {form.parentId && !editing && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  under {items.find((c) => c.id === form.parentId)?.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                placeholder="Pain Relief"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="pain-relief" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Parent</Label>
              <select
                value={form.parentId || ""}
                onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}
                className="w-full h-10 border border-border rounded-sm px-3 text-sm bg-background"
              >
                <option value="">— Top-level —</option>
                {parents
                  .filter((p) => p.id !== editing?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Icon</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, icon: "" })}
                  className={`h-9 w-9 rounded-sm border flex items-center justify-center text-[10px] font-medium ${
                    form.icon === "" ? "border-foreground bg-secondary" : "border-border"
                  }`}
                  title="No icon"
                >
                  ✕
                </button>
                {ICON_LIBRARY.map(({ name, Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm({ ...form, icon: name })}
                    className={`h-9 w-9 rounded-sm border flex items-center justify-center ${
                      form.icon === name ? "border-foreground bg-secondary" : "border-border hover:bg-secondary/50"
                    }`}
                    title={name}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Thumbnail Image</Label>
              <div className="flex gap-2">
                <Input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="/images/categories/medications.png"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { handleImageUpload("image", e.target.files); e.target.value = "" }}
                  />
                  <span
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border text-sm transition-colors hover:bg-secondary whitespace-nowrap"
                    title={`Upload image (auto-compressed to ${MAX_MB}MB)`}
                  >
                    {uploading === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </span>
                </label>
              </div>
              {form.image && (
                <div className="relative w-20 h-20 mt-2 rounded-sm overflow-hidden bg-secondary border border-border">
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Images over {MAX_MB}MB are auto-compressed on upload.</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Category Page Banner</Label>
              <div className="flex gap-2">
                <Input
                  value={form.banner}
                  onChange={(e) => setForm({ ...form, banner: e.target.value })}
                  placeholder="/banners/medications.png (optional)"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { handleImageUpload("banner", e.target.files); e.target.value = "" }}
                  />
                  <span
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-border text-sm transition-colors hover:bg-secondary whitespace-nowrap"
                    title={`Upload banner (auto-compressed to ${MAX_MB}MB)`}
                  >
                    {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </span>
                </label>
              </div>
              {form.banner && (
                <div className="relative w-full h-24 mt-2 rounded-sm overflow-hidden bg-secondary border border-border">
                  <img src={form.banner} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setOpen(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={save} disabled={!form.name.trim()} className="text-white" style={{ background: WINE }}>
                {editing ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Plus, Pencil, Trash2, Gift, Upload, Loader2, ImageIcon } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatPrice } from "@/lib/format"
import { toast } from "sonner"
import useSWR from "swr"
import type { GiftItem, GiftItemCategory } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORY_TABS: { key: GiftItemCategory; label: string }[] = [
  { key: "addon", label: "Add Ons" },
  { key: "gift_wrap", label: "Gift Wrapping" },
  { key: "greeting_card", label: "Greeting Cards" },
]

const emptyForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
}

export function AdminGifts() {
  const { data: items = [], mutate, isLoading } = useSWR<GiftItem[]>("/api/admin/gift-items", fetcher)
  const [activeCategory, setActiveCategory] = useState<GiftItemCategory>("addon")
  const [isOpen, setIsOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [isUploading, setIsUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter((it) => it.category === activeCategory)

  const openNew = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setIsOpen(true)
  }

  const openEdit = (it: GiftItem) => {
    setEditId(it.id)
    setForm({
      name: it.name,
      description: it.description || "",
      price: it.price.toString(),
      imageUrl: it.imageUrl || "",
      sortOrder: it.sortOrder.toString(),
      isActive: it.isActive,
    })
    setIsOpen(true)
  }

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("productSlug", `gift-items-${activeCategory}`)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data?.error || "Upload failed")
        return
      }
      setForm((prev) => ({ ...prev, imageUrl: data.url }))
      toast.success("Image uploaded")
    } catch (err) {
      console.error("Gift item upload failed:", err)
      toast.error("Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/gift-items", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          category: activeCategory,
          name: form.name,
          description: form.description,
          price: Number.parseFloat(form.price) || 0,
          imageUrl: form.imageUrl,
          sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || "Failed to save")
        return
      }
      await mutate()
      setIsOpen(false)
      toast.success(editId ? "Gift item updated" : "Gift item created")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gift item?")) return
    const res = await fetch(`/api/admin/gift-items?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Gift item deleted")
      mutate()
    } else {
      toast.error("Failed to delete")
    }
  }

  const toggleActive = async (it: GiftItem) => {
    const res = await fetch("/api/admin/gift-items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...it, isActive: !it.isActive }),
    })
    if (res.ok) mutate()
    else toast.error("Failed to update")
  }

  return (
    <AdminShell title="Gifts">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
              <Gift className="h-6 w-6 text-pink-600" /> Gift Module
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage add-ons, gift wrapping and greeting cards shown in the checkout gift modal.
            </p>
          </div>
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4 mr-2" /> Add {CATEGORY_TABS.find((t) => t.key === activeCategory)?.label}
          </Button>
        </div>

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as GiftItemCategory)}>
          <TabsList className="grid grid-cols-3 w-full sm:max-w-xl">
            {CATEGORY_TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORY_TABS.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-6">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : filtered.length === 0 ? (
                <div className="border border-dashed border-border rounded-sm p-12 text-center">
                  <Gift className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No {t.label.toLowerCase()} yet. Click &ldquo;Add {t.label}&rdquo; to create your first entry.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((it) => (
                    <div key={it.id} className="border border-border rounded-sm overflow-hidden flex flex-col">
                      <div className="relative aspect-[4/3] bg-secondary">
                        {it.imageUrl ? (
                          <Image src={it.imageUrl} alt={it.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                        {!it.isActive && (
                          <div className="absolute top-2 left-2 bg-foreground/80 text-background text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm">
                            Hidden
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        <div>
                          <p className="text-sm font-medium line-clamp-2">{it.name}</p>
                          <p className="text-sm text-muted-foreground">{formatPrice(it.price)}</p>
                        </div>
                        <div className="mt-auto flex items-center gap-2 pt-2 border-t border-border">
                          <Switch checked={it.isActive} onCheckedChange={() => toggleActive(it)} />
                          <span className="text-xs text-muted-foreground">{it.isActive ? "Visible" : "Hidden"}</span>
                          <div className="ml-auto flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(it)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(it.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editId ? "Edit" : "Add"} {CATEGORY_TABS.find((t) => t.key === activeCategory)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Image</Label>
              <div
                className="relative aspect-[4/3] border border-dashed border-border rounded-sm overflow-hidden bg-secondary cursor-pointer group"
                onClick={() => !isUploading && fileRef.current?.click()}
              >
                {form.imageUrl ? (
                  <Image src={form.imageUrl} alt="Preview" fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <Upload className="h-6 w-6 mb-1" />
                    <span className="text-xs">Click to upload image</span>
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-background animate-spin" />
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Gift Box Ribbon Bow"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Price (KSh)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Short description shown as a subtitle"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label className="text-sm font-medium">Visible on storefront</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : editId ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

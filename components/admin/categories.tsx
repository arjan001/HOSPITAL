"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Search, ImagePlus, Loader2, X } from "lucide-react"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AdminCategory {
  id: string
  name: string
  slug: string
  image: string
  productCount: number
  isActive: boolean
}

interface CategoryForm {
  name: string
  slug: string
  image: string
}

const emptyForm: CategoryForm = { name: "", slug: "", image: "" }

export function AdminCategories() {
  const { data: cats = [], mutate } = useSWR<AdminCategory[]>("/api/admin/categories", fetcher)
  const [isOpen, setIsOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [search, setSearch] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingCatId, setUploadingCatId] = useState<string | null>(null)
  const formFileInputRef = useRef<HTMLInputElement>(null)
  const inlineFileInputRef = useRef<HTMLInputElement>(null)
  const pendingInlineCatRef = useRef<AdminCategory | null>(null)

  const filtered = cats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage, resetPage } = usePagination(filtered, { defaultPerPage: 12 })

  useEffect(() => { resetPage() }, [search])

  const openNew = () => { setEditId(null); setForm(emptyForm); setIsOpen(true) }
  const openEdit = (cat: AdminCategory) => {
    setEditId(cat.id)
    setForm({ name: cat.name, slug: cat.slug, image: cat.image && !cat.image.startsWith("/placeholder") ? cat.image : "" })
    setIsOpen(true)
  }

  const handleSave = async () => {
    const body = { id: editId, name: form.name, slug: form.slug, image: form.image }
    const res = await fetch("/api/admin/categories", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    mutate()
    setIsOpen(false)
    if (res.ok) toast.success(editId ? "Category updated" : "Category created")
    else toast.error("Failed to save category")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" })
    mutate()
    if (res.ok) toast.success("Category deleted")
    else toast.error("Failed to delete category")
  }

  const uploadCategoryImage = async (file: File, slugHint: string): Promise<string | null> => {
    const slug = (slugHint || "category").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "category"
    const fd = new FormData()
    fd.append("file", file)
    fd.append("productSlug", `categories-${slug}`)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data?.error || "Upload failed")
        return null
      }
      return data.url as string
    } catch (err) {
      console.error("Category upload failed:", err)
      toast.error("Upload failed")
      return null
    }
  }

  const handleFormFileSelect = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setIsUploading(true)
    const url = await uploadCategoryImage(file, form.slug || form.name)
    if (url) {
      setForm((prev) => ({ ...prev, image: url }))
      toast.success("Image uploaded")
    }
    setIsUploading(false)
  }

  const handleInlineFileSelect = async (files: FileList | null) => {
    const file = files?.[0]
    const cat = pendingInlineCatRef.current
    pendingInlineCatRef.current = null
    if (!file || !cat) return
    setUploadingCatId(cat.id)
    const url = await uploadCategoryImage(file, cat.slug || cat.name)
    if (url) {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name, slug: cat.slug, image: url, isActive: cat.isActive }),
      })
      if (res.ok) {
        toast.success(`Updated image for ${cat.name}`)
        mutate()
      } else {
        toast.error("Failed to save image")
      }
    }
    setUploadingCatId(null)
  }

  const triggerInlineUpload = (cat: AdminCategory) => {
    pendingInlineCatRef.current = cat
    inlineFileInputRef.current?.click()
  }

  const handleInlineDrop = async (e: React.DragEvent, cat: AdminCategory) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setUploadingCatId(cat.id)
    const url = await uploadCategoryImage(file, cat.slug || cat.name)
    if (url) {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name, slug: cat.slug, image: url, isActive: cat.isActive }),
      })
      if (res.ok) {
        toast.success(`Updated image for ${cat.name}`)
        mutate()
      } else {
        toast.error("Failed to save image")
      }
    }
    setUploadingCatId(null)
  }

  return (
    <AdminShell title="Categories">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">{cats.length} categories &middot; Drag an image onto any card to update it</p>
          </div>
          <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map((cat) => {
            const hasImage = !!cat.image && !cat.image.startsWith("/placeholder")
            const isThisUploading = uploadingCatId === cat.id
            return (
              <div key={cat.id} className="border border-border rounded-sm overflow-hidden group">
                <div
                  className="relative aspect-[4/3] bg-secondary cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-foreground") }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("ring-2", "ring-foreground") }}
                  onDrop={(e) => { e.currentTarget.classList.remove("ring-2", "ring-foreground"); handleInlineDrop(e, cat) }}
                  onClick={() => !isThisUploading && triggerInlineUpload(cat)}
                  title="Click or drag an image to update this category"
                >
                  {hasImage ? (
                    <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-8 w-8 mb-1.5" />
                      <p className="text-xs font-medium">No image</p>
                      <p className="text-[10px]">Click or drop to upload</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                    {isThisUploading ? (
                      <div className="bg-background/90 px-3 py-1.5 rounded-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-medium">Uploading...</span>
                      </div>
                    ) : hasImage ? (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 px-3 py-1.5 rounded-sm flex items-center gap-1.5">
                        <ImagePlus className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Replace image</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.productCount} products</p>
                    <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onItemsPerPageChange={changePerPage}
          perPageOptions={[6, 12, 24]}
        />
      </div>

      <input
        ref={inlineFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleInlineFileSelect(e.target.files); if (e.target) e.target.value = "" }}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">{editId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Category Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Skinny Jeans" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Auto-generated from name" />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Category Image</Label>
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-foreground", "bg-secondary/50") }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-foreground", "bg-secondary/50") }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-foreground", "bg-secondary/50"); handleFormFileSelect(e.dataTransfer.files) }}
                onClick={() => !isUploading && formFileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-4 cursor-pointer hover:border-foreground/40 transition-colors text-center"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                ) : form.image ? (
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-16 rounded-sm overflow-hidden bg-secondary shrink-0">
                      <Image src={form.image} alt="Preview" fill className="object-cover" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">Image uploaded</p>
                      <p className="text-[11px] text-muted-foreground">Click or drop to replace</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setForm((prev) => ({ ...prev, image: "" })) }}
                      className="shrink-0 p-1 rounded-sm hover:bg-secondary"
                      aria-label="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <ImagePlus className="h-7 w-7 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-sm font-medium">Click or drag image here</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">JPG, PNG or WebP. Max 5MB.</p>
                  </div>
                )}
                <input
                  ref={formFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { handleFormFileSelect(e.target.files); if (e.target) e.target.value = "" }}
                />
              </div>
              <div className="mt-2">
                <Label className="text-[11px] text-muted-foreground mb-1 block">Or paste an image URL</Label>
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-transparent">Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || isUploading} className="bg-foreground text-background hover:bg-foreground/90">
                {editId ? "Update" : "Add"} Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

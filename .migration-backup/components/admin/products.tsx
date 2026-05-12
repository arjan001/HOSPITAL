"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, X, Upload, Search, Download, FileUp, ImagePlus, Loader2, Eye } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { formatPrice } from "@/lib/format"
import { isVideoUrl } from "@/lib/media-utils"
import type { Product, ProductVariation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useSWR from "swr"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CategoryOption {
  id: string
  name: string
  slug: string
}

interface ProductForm {
  name: string
  price: string
  originalPrice: string
  category: string
  collection: string
  description: string
  images: string[]
  isNew: boolean
  isOnOffer: boolean
  offerPercentage: string
  inStock: boolean
  variations: ProductVariation[]
  tags: string
}

const emptyForm: ProductForm = {
  name: "",
  price: "",
  originalPrice: "",
  category: "",
  collection: "women",
  description: "",
  images: [],
  isNew: false,
  isOnOffer: false,
  offerPercentage: "",
  inStock: true,
  variations: [],
  tags: "",
}

export function AdminProducts() {
  const { data: products = [], mutate: mutateProducts } = useSWR<Product[]>("/api/products", fetcher)
  const { data: categories = [] } = useSWR<CategoryOption[]>("/api/categories", fetcher)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [newImageUrl, setNewImageUrl] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [importCsv, setImportCsv] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importDone, setImportDone] = useState(false)
  const csvFileRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null)

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      categoryFilter === "all" || p.categorySlug === categoryFilter
    return matchesSearch && matchesCategory
  })

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage } = usePagination(filtered, { defaultPerPage: 20 })

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || "",
      category: product.categorySlug,
      collection: product.collection || "women",
      description: product.description,
      images: [...product.images],
      isNew: product.isNew || false,
      isOnOffer: product.isOnOffer || false,
      offerPercentage: product.offerPercentage?.toString() || "",
      inStock: product.inStock,
      variations: product.variations ? [...product.variations] : [],
      tags: product.tags.join(", "),
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    const slug = form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    const body = {
      id: editingId || undefined,
      name: form.name,
      slug,
      price: Number.parseFloat(form.price) || 0,
      originalPrice: form.originalPrice ? Number.parseFloat(form.originalPrice) : null,
      categorySlug: form.category,
      collection: form.collection,
      description: form.description,
      images: form.images,
      isNew: form.isNew,
      isOnOffer: form.isOnOffer,
      offerPercentage: form.offerPercentage ? Number.parseInt(form.offerPercentage) : 0,
      inStock: form.inStock,
      variations: form.variations,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    }

    try {
      const res = await fetch("/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      mutateProducts()
      if (res.ok) toast.success(editingId ? "Product updated" : "Product created")
      else toast.error("Failed to save product")
    } catch (err) {
      console.error("Save failed:", err)
      toast.error("Failed to save product")
    }

    setIsModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" })
      mutateProducts()
      if (res.ok) toast.success("Product deleted")
      else toast.error("Failed to delete product")
    } catch (err) {
      console.error("Delete failed:", err)
      toast.error("Failed to delete product")
    }
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setIsUploading(true)

    const slug = form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("productSlug", slug)

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        const data = await res.json()
        if (data.url) {
          setForm((prev) => ({ ...prev, images: [...prev.images, data.url] }))
        }
      } catch (err) {
        console.error("Upload failed:", err)
      }
    }
    setIsUploading(false)
  }

  const addImage = () => {
    if (newImageUrl.trim()) {
      setForm((prev) => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }))
      setNewImageUrl("")
    }
  }

  const removeImage = (index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const addVariation = () => {
    setForm((prev) => ({
      ...prev,
      variations: [...prev.variations, { type: "", options: [] }],
    }))
  }

  const updateVariationType = (index: number, type: string) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.map((v, i) => (i === index ? { ...v, type } : v)),
    }))
  }

  const updateVariationOptions = (index: number, options: string) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.map((v, i) =>
        i === index ? { ...v, options: options.split(",").map((o) => o.trim()).filter(Boolean) } : v
      ),
    }))
  }

  const removeVariation = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }))
  }

  const CSV_HEADERS = ["Name", "Price", "Original Price", "Category Slug", "Description", "Image URLs (pipe separated)", "Tags (comma separated)", "Is New (yes/no)", "Is On Offer (yes/no)", "Offer %", "In Stock (yes/no)", "Sizes (comma separated)", "Colors (comma separated)"]

  const downloadTemplate = () => {
    const sampleRows = [
      ['"Classic Slim Fit Jeans"', '3500', '5000', 'jeans', '"Premium denim slim-fit jeans, comfortable stretch fabric."', '"https://example.com/img1.jpg|https://example.com/img2.jpg"', '"thrift, vintage, slim-fit"', 'yes', 'yes', '30', 'yes', '"28, 30, 32, 34"', '"Blue, Black"'],
      ['"Denim Jacket Oversized"', '4200', '', 'jackets', '"Oversized denim jacket with button closure."', '"https://example.com/jacket1.jpg"', '"jacket, oversized"', 'yes', 'no', '', 'yes', '"S, M, L, XL"', '"Washed Blue"'],
      ['"High Waist Dungarees"', '3800', '4500', 'dungarees', '"Vintage-style high waist dungarees."', '"https://example.com/dung1.jpg"', '"dungaree, vintage"', 'no', 'yes', '15', 'yes', '"S, M, L"', '""'],
    ]
    const csv = [CSV_HEADERS.join(","), ...sampleRows.map(r => r.join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "classy-collections-product-import-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return []
    const headers = parseCSVLine(lines[0])
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h.trim()] = (values[i] || "").trim() })
      return row
    })
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current)
    return result
  }

  const handleCSVFileSelect = (file: File | null) => {
    if (!file) return
    setImportFile(file)
    setImportErrors([])
    setImportDone(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setImportCsv(text)
      const rows = parseCSV(text)
      // Validate
      const errors: string[] = []
      rows.forEach((row, i) => {
        if (!row["Name"]) errors.push(`Row ${i + 2}: Missing product name`)
        if (!row["Price"] || isNaN(Number(row["Price"]))) errors.push(`Row ${i + 2}: Invalid or missing price`)
        if (!row["Category Slug"]) errors.push(`Row ${i + 2}: Missing category slug`)
      })
      setImportErrors(errors)
      setImportPreview(rows)
    }
    reader.readAsText(file)
  }

  const handleCSVPaste = (text: string) => {
    setImportCsv(text)
    setImportFile(null)
    setImportErrors([])
    setImportDone(false)
    const rows = parseCSV(text)
    const errors: string[] = []
    rows.forEach((row, i) => {
      if (!row["Name"]) errors.push(`Row ${i + 2}: Missing product name`)
      if (!row["Price"] || isNaN(Number(row["Price"]))) errors.push(`Row ${i + 2}: Invalid or missing price`)
      if (!row["Category Slug"]) errors.push(`Row ${i + 2}: Missing category slug`)
    })
    setImportErrors(errors)
    setImportPreview(rows)
  }

  const handleBulkImport = async () => {
    if (importPreview.length === 0 || importErrors.length > 0) return
    setIsImporting(true)
    setImportProgress({ done: 0, total: importPreview.length })

    let successCount = 0
    for (const row of importPreview) {
      const slug = row["Name"].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const body = {
        name: row["Name"],
        slug,
        price: parseFloat(row["Price"]) || 0,
        originalPrice: row["Original Price"] ? parseFloat(row["Original Price"]) : null,
        categorySlug: row["Category Slug"],
        description: row["Description"] || "",
        images: (row["Image URLs (pipe separated)"] || "").split("|").map(s => s.trim()).filter(Boolean),
        tags: (row["Tags (comma separated)"] || "").split(",").map(s => s.trim()).filter(Boolean),
        isNew: (row["Is New (yes/no)"] || "").toLowerCase() === "yes",
        isOnOffer: (row["Is On Offer (yes/no)"] || "").toLowerCase() === "yes",
        offerPercentage: parseInt(row["Offer %"]) || 0,
        inStock: (row["In Stock (yes/no)"] || "yes").toLowerCase() !== "no",
        variations: [
          ...(row["Sizes (comma separated)"] ? [{ type: "Size", options: row["Sizes (comma separated)"].split(",").map(s => s.trim()).filter(Boolean) }] : []),
          ...(row["Colors (comma separated)"] ? [{ type: "Color", options: row["Colors (comma separated)"].split(",").map(s => s.trim()).filter(Boolean) }] : []),
        ].filter(v => v.options.length > 0),
      }

      try {
        const res = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        if (res.ok) successCount++
      } catch { /* continue */ }
      setImportProgress(prev => ({ ...prev, done: prev.done + 1 }))
    }

    setIsImporting(false)
    setImportDone(true)
    mutateProducts()
  }

  const resetImport = () => {
    setShowImport(false)
    setImportCsv("")
    setImportFile(null)
    setImportPreview([])
    setImportErrors([])
    setImportDone(false)
    setImportProgress({ done: 0, total: 0 })
  }

  const handleExport = () => {
    const headers = "Name,Price,Original Price,Category,Description,Images,Tags,Is New,Is On Offer,Offer %,In Stock"
    const rows = products.map((p) =>
      [
        `"${p.name}"`,
        p.price,
        p.originalPrice || "",
        p.category,
        `"${p.description.replace(/"/g, '""')}"`,
        `"${p.images.join("|")}"`,
        `"${p.tags.join(", ")}"`,
        p.isNew ? "yes" : "no",
        p.isOnOffer ? "yes" : "no",
        p.offerPercentage || "",
        p.inStock ? "yes" : "no",
      ].join(",")
    )
    const csv = [headers, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "classy-collections-products.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" })
    }
    setSelectedIds(new Set())
    mutateProducts()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const pageIds = paginatedItems.map((p) => p.id)
    const allSelected = pageIds.every((id) => selectedIds.has(id))
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set([...selectedIds, ...pageIds]))
  }

  return (
    <AdminShell title="Products">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">{products.length} products</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="bg-transparent hidden sm:flex">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="bg-transparent hidden sm:flex">
              <FileUp className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button onClick={openNew} className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCategoryFilter("all")}
              className="text-muted-foreground h-10"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filter
            </Button>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-secondary p-3 rounded-sm">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} className="bg-transparent text-destructive border-destructive hover:bg-destructive hover:text-background">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Selected
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="bg-transparent">
              Clear Selection
            </Button>
          </div>
        )}

        {/* Products Table */}
        <div className="border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={paginatedItems.length > 0 && paginatedItems.every((p) => selectedIds.has(p.id))} onChange={toggleSelectAll} className="rounded-sm" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map((product) => (
                  <tr key={product.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="w-10 px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-12 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                          {isVideoUrl(product.images[0]) ? (
                            <video src={product.images[0]} muted className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <Image src={product.images[0] || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
                          )}
                        </div>
                        <span className="font-medium line-clamp-1">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{product.category}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{formatPrice(product.price)}</span>
                        {product.originalPrice && (
                          <span className="text-xs text-muted-foreground line-through ml-2">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {product.isNew && (
                          <span className="text-[10px] font-semibold bg-foreground text-background px-2 py-0.5 uppercase tracking-wider">
                            New
                          </span>
                        )}
                        {product.isOnOffer && (
                          <span className="text-[10px] font-semibold bg-foreground text-background px-2 py-0.5 uppercase tracking-wider">
                            Offer
                          </span>
                        )}
                        {!product.inStock && (
                          <span className="text-[10px] font-semibold bg-secondary text-muted-foreground px-2 py-0.5 uppercase tracking-wider">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewProduct(product)}>
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only">Preview</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onItemsPerPageChange={changePerPage}
          perPageOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Classic High-Rise Skinny Jeans - Size 30" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Price (KSh) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="3500" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Original Price (KSh)</Label>
                <Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder="5500" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Category *</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Collection *</Label>
              <Select value={form.collection} onValueChange={(val) => setForm({ ...form, collection: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                  <SelectItem value="babyshop">Babyshop</SelectItem>
                  <SelectItem value="unisex">Unisex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Describe the product..."
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Product Media ({form.images.length})</Label>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-foreground", "bg-secondary/50") }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-foreground", "bg-secondary/50") }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-foreground", "bg-secondary/50"); handleImageUpload(e.dataTransfer.files) }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-4 mb-3 cursor-pointer hover:border-foreground/40 transition-colors text-center"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                ) : (
                  <div className="py-2">
                    <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-sm font-medium">Click or drag images/videos here</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Select multiple files at once. JPG, PNG, WebP, MP4, WebM, MOV supported.</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleImageUpload(e.target.files); if (e.target) e.target.value = "" }}
                />
              </div>

              {/* Image grid with reorder hint */}
              {form.images.length > 0 && (
                <div className="mb-3">
                  <p className="text-[11px] text-muted-foreground mb-2">First image/video is the main product media. Click X to remove.</p>
                  <div className="flex flex-wrap gap-2">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative w-16 h-20 bg-secondary rounded-sm overflow-hidden group">
                        {isVideoUrl(img) ? (
                          <video src={img} muted className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <Image src={img || "/placeholder.svg"} alt={`Image ${i + 1}`} fill className="object-cover" />
                        )}
                        {i === 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-foreground/80 text-background text-[8px] text-center py-0.5 font-bold tracking-wider">MAIN</span>
                        )}
                        {isVideoUrl(img) && i !== 0 && (
                          <span className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-[8px] text-center py-0.5 font-bold tracking-wider">VIDEO</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 bg-foreground text-background rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {/* Move left/right */}
                        {form.images.length > 1 && (
                          <div className="absolute bottom-0.5 left-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {i > 0 && (
                              <button type="button" onClick={() => { const imgs = [...form.images]; [imgs[i-1], imgs[i]] = [imgs[i], imgs[i-1]]; setForm(prev => ({...prev, images: imgs})) }} className="bg-foreground/80 text-background rounded-sm w-4 h-4 flex items-center justify-center text-[9px]">{'<'}</button>
                            )}
                            {i < form.images.length - 1 && (
                              <button type="button" onClick={() => { const imgs = [...form.images]; [imgs[i], imgs[i+1]] = [imgs[i+1], imgs[i]]; setForm(prev => ({...prev, images: imgs})) }} className="bg-foreground/80 text-background rounded-sm w-4 h-4 flex items-center justify-center text-[9px]">{'>'}</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Or paste image/video URL..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                />
                <Button type="button" variant="outline" onClick={addImage} className="bg-transparent">
                  <Upload className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Variations (sizes) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Variations (e.g. Size, Color)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariation} className="bg-transparent">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Variation
                </Button>
              </div>
              {form.variations.map((variation, i) => (
                <div key={i} className="flex gap-2 items-start mb-2">
                  <Input
                    value={variation.type}
                    onChange={(e) => updateVariationType(i, e.target.value)}
                    placeholder="e.g. Size"
                    className="w-28"
                  />
                  <Input
                    value={variation.options.join(", ")}
                    onChange={(e) => updateVariationOptions(i, e.target.value)}
                    placeholder="28, 30, 32, 34 (comma separated)"
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => removeVariation(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="thrift, vintage, high-waist" />
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.inStock} onCheckedChange={(checked) => setForm({ ...form, inStock: checked })} />
                <Label className="text-sm">In Stock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isNew} onCheckedChange={(checked) => setForm({ ...form, isNew: checked })} />
                <Label className="text-sm">New</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isOnOffer} onCheckedChange={(checked) => setForm({ ...form, isOnOffer: checked })} />
                <Label className="text-sm">On Offer</Label>
              </div>
              {form.isOnOffer && (
                <div>
                  <Input
                    type="number"
                    value={form.offerPercentage}
                    onChange={(e) => setForm({ ...form, offerPercentage: e.target.value })}
                    placeholder="% off"
                    className="h-9"
                  />
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!form.name || !form.price || !form.category}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {editingId ? "Update Product" : "Add Product"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImport} onOpenChange={(open) => { if (!open) resetImport(); else setShowImport(true) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">Import Products</DialogTitle>
          </DialogHeader>

          {importDone ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-foreground/10 rounded-full mx-auto flex items-center justify-center mb-4">
                <Download className="h-7 w-7 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Successfully imported {importProgress.done} of {importProgress.total} products.
              </p>
              <Button onClick={resetImport} className="mt-6 bg-foreground text-background hover:bg-foreground/90">Done</Button>
            </div>
          ) : (
            <div className="space-y-5 mt-2">
              {/* Step 1: Download Template */}
              <div className="border border-border rounded-sm p-4 bg-secondary/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <span className="w-5 h-5 bg-foreground text-background rounded-full text-[10px] flex items-center justify-center font-bold">1</span>
                      Download Template
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Download the CSV template, fill in your products, then upload it back. The template includes 3 sample rows showing the correct format.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="bg-transparent flex-shrink-0">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Template
                  </Button>
                </div>
                <div className="mt-3 text-[10px] text-muted-foreground font-mono bg-background rounded-sm p-2.5 overflow-x-auto whitespace-nowrap">
                  {CSV_HEADERS.join(" | ")}
                </div>
              </div>

              {/* Step 2: Upload or Paste */}
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 bg-foreground text-background rounded-full text-[10px] flex items-center justify-center font-bold">2</span>
                  Upload CSV File
                </h4>
                <div
                  onClick={() => csvFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleCSVFileSelect(e.dataTransfer.files[0] || null) }}
                  className="border-2 border-dashed border-border rounded-sm p-6 text-center cursor-pointer hover:border-foreground/40 transition-colors"
                >
                  <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{importFile ? importFile.name : "Click or drag CSV file here"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .csv files</p>
                </div>
                <input ref={csvFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleCSVFileSelect(e.target.files?.[0] || null)} />

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Label className="text-sm font-medium mb-1.5 block">Paste CSV Data</Label>
                <textarea
                  value={importCsv}
                  onChange={(e) => handleCSVPaste(e.target.value)}
                  rows={5}
                  className="w-full border border-border rounded-sm p-3 text-xs font-mono bg-background text-foreground resize-none outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Paste your CSV data here..."
                />
              </div>

              {/* Step 3: Preview & Validation */}
              {importPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 bg-foreground text-background rounded-full text-[10px] flex items-center justify-center font-bold">3</span>
                    Preview ({importPreview.length} products)
                  </h4>

                  {importErrors.length > 0 && (
                    <div className="mb-3 border border-destructive/30 rounded-sm bg-destructive/5 p-3">
                      <p className="text-xs font-semibold text-destructive mb-1">Validation Errors ({importErrors.length})</p>
                      <ul className="text-xs text-destructive/80 space-y-0.5 max-h-24 overflow-y-auto">
                        {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="border border-border rounded-sm overflow-hidden">
                    <div className="overflow-x-auto max-h-52">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-secondary">
                            <th className="px-2 py-2 text-left font-medium">#</th>
                            <th className="px-2 py-2 text-left font-medium">Name</th>
                            <th className="px-2 py-2 text-left font-medium">Price</th>
                            <th className="px-2 py-2 text-left font-medium">Category</th>
                            <th className="px-2 py-2 text-left font-medium">Images</th>
                            <th className="px-2 py-2 text-left font-medium">Tags</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {importPreview.slice(0, 10).map((row, i) => (
                            <tr key={i} className="hover:bg-secondary/30">
                              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                              <td className="px-2 py-1.5 font-medium max-w-[180px] truncate">{row["Name"]}</td>
                              <td className="px-2 py-1.5">{row["Price"] ? `KSh ${Number(row["Price"]).toLocaleString()}` : "-"}</td>
                              <td className="px-2 py-1.5">{row["Category Slug"] || "-"}</td>
                              <td className="px-2 py-1.5">{(row["Image URLs (pipe separated)"] || "").split("|").filter(Boolean).length} media</td>
                              <td className="px-2 py-1.5 max-w-[120px] truncate">{row["Tags (comma separated)"] || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importPreview.length > 10 && (
                      <div className="bg-secondary/50 px-3 py-1.5 text-[11px] text-muted-foreground text-center">
                        ...and {importPreview.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import progress */}
              {isImporting && (
                <div className="border border-border rounded-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Importing... {importProgress.done}/{importProgress.total}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full transition-all duration-300"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={resetImport} className="bg-transparent">Cancel</Button>
                <Button
                  onClick={handleBulkImport}
                  disabled={importPreview.length === 0 || importErrors.length > 0 || isImporting}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  {isImporting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><FileUp className="h-4 w-4 mr-2" />Import {importPreview.length} Products</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Product Preview Modal */}
      <Dialog open={!!previewProduct} onOpenChange={(open) => { if (!open) setPreviewProduct(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif">Product Details</DialogTitle>
          </DialogHeader>

          {previewProduct && (
            <div className="space-y-6 mt-2">
              {/* Images */}
              {previewProduct.images.length > 0 && (
                <div className="space-y-2">
                  <div className="relative w-full aspect-square max-h-[320px] bg-secondary rounded-sm overflow-hidden">
                    {isVideoUrl(previewProduct.images[0]) ? (
                      <video
                        src={previewProduct.images[0]}
                        controls
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    ) : (
                      <Image
                        src={previewProduct.images[0]}
                        alt={previewProduct.name}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                  {previewProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {previewProduct.images.map((img, i) => (
                        <div key={i} className="relative w-16 h-20 bg-secondary rounded-sm overflow-hidden flex-shrink-0 border border-border">
                          {isVideoUrl(img) ? (
                            <video src={img} muted className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <Image src={img} alt={`${previewProduct.name} ${i + 1}`} fill className="object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Name & Badges */}
              <div>
                <h2 className="text-xl font-serif font-bold">{previewProduct.name}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-sm">{previewProduct.category}</span>
                  {previewProduct.isNew && (
                    <span className="text-[10px] font-semibold bg-foreground text-background px-2 py-0.5 uppercase tracking-wider">New</span>
                  )}
                  {previewProduct.isOnOffer && (
                    <span className="text-[10px] font-semibold bg-foreground text-background px-2 py-0.5 uppercase tracking-wider">
                      {previewProduct.offerPercentage ? `${previewProduct.offerPercentage}% Off` : "Offer"}
                    </span>
                  )}
                  {previewProduct.inStock ? (
                    <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 uppercase tracking-wider rounded-sm">In Stock</span>
                  ) : (
                    <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 uppercase tracking-wider rounded-sm">Out of Stock</span>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold">{formatPrice(previewProduct.price)}</span>
                {previewProduct.originalPrice && previewProduct.originalPrice > previewProduct.price && (
                  <span className="text-base text-muted-foreground line-through">{formatPrice(previewProduct.originalPrice)}</span>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold mb-1.5">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{previewProduct.description}</p>
              </div>

              {/* Variations */}
              {previewProduct.variations && previewProduct.variations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Variations</h3>
                  <div className="space-y-3">
                    {previewProduct.variations.map((v, i) => (
                      <div key={i}>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{v.type}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {v.options.map((opt, j) => (
                            <span key={j} className="text-xs border border-border px-2.5 py-1 rounded-sm">{opt}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {previewProduct.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {previewProduct.tags.map((tag, i) => (
                      <span key={i} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-sm">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="border-t border-border pt-4 text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Slug:</span> {previewProduct.slug}</p>
                <p><span className="font-medium text-foreground">Created:</span> {new Date(previewProduct.createdAt).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
                <p><span className="font-medium text-foreground">Images:</span> {previewProduct.images.length}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setPreviewProduct(null)} className="bg-transparent">
                  Close
                </Button>
                <Button
                  onClick={() => { setPreviewProduct(null); openEdit(previewProduct) }}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

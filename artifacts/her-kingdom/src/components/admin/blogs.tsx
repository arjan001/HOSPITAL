"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { apiFetch } from "@/lib/api-client"
import { useCmsDoc, newId } from "@/lib/cms-store"

import { Link } from "wouter"
import { sanitizeHtml } from "@/lib/sanitize-html"
import {
  Save,
  Loader2,
  Eye,
  FileText,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Code,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Quote,
  ImagePlus,
  Pilcrow,
  Search,
  Star,
  Clock,
  Calendar,
  Upload,
  X,
  Sparkles,
  ChevronLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough,
  Minus,
} from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  cover_image: string | null
  author: string
  author_role: string | null
  author_avatar: string | null
  tags: string[] | null
  category: string | null
  read_time_minutes: number | null
  views: number | null
  is_published: boolean
  is_featured: boolean
  published_at: string
  created_at: string
  updated_at: string
}


type FormState = {
  slug: string
  title: string
  excerpt: string
  content: string
  cover_image: string
  author: string
  author_role: string
  author_avatar: string
  tags: string[]
  category: string
  read_time_minutes: number
  is_published: boolean
  is_featured: boolean
}

const emptyForm: FormState = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "",
  author: "Shaniid RX Editorial Team",
  author_role: "Pharmacy Editor",
  author_avatar: "",
  tags: [],
  category: "Health Tips",
  read_time_minutes: 5,
  is_published: true,
  is_featured: false,
}

const CATEGORIES = [
  "Health Tips",
  "Medications",
  "Family Care",
  "Chronic Conditions",
  "Mental Wellness",
  "Maternal & Child",
  "Nutrition",
  "Pharmacy News",
  "Patient Guides",
  "Safety & Compliance",
]

const STARTER_CONTENT = `
<p class="lead">Open with a clear, reassuring sentence — the kind a patient would trust on a first read. Calm, simple, evidence-led.</p>

<p>Follow with one or two short paragraphs that frame why this matters: who it's for, what it covers, and the outcome the reader can expect.</p>

<h2>1. What you need to know</h2>
<p>Use H2 headings to break the article into clear sections. Lead with the most important point. Keep sentences short and free of jargon — write at a Grade 8 reading level wherever possible.</p>

<h2>2. How to use the medication safely</h2>
<p>Spell out dosing, timing, and what to do if a dose is missed. Add a <strong>bold highlight</strong> for the lines that matter most, and link to <a href="#">our product page or guide</a> when relevant.</p>

<blockquote>"If you are pregnant, breastfeeding, or taking other medicines, speak to a Shaniid RX pharmacist before starting."</blockquote>

<h2>3. Side effects &amp; when to call a pharmacist</h2>
<ul>
  <li><strong>Common, mild effects:</strong> what's expected and usually fine.</li>
  <li><strong>Less common:</strong> what's worth monitoring at home.</li>
  <li><strong>Seek care now:</strong> the red-flag symptoms that need a doctor or pharmacist right away.</li>
</ul>

<p>Close with a clear next step — chat with a pharmacist on Shaniid RX, upload a prescription, or browse related products. Keep the tone warm, never alarming.</p>
`.trim()

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const words = text ? text.split(" ").length : 0
  return Math.max(1, Math.round(words / 220))
}

/**
 * Compress an image client-side to a JPEG data URL, capped at `maxEdge` px
 * on the longest edge. Used by the cmsStore fallback path so that blog
 * images stay well under the per-key localStorage quota (~5MB) even if a
 * patient editor uploads a 10MP camera photo.
 */
async function compressToDataUrl(file: File, maxEdge = 1600, quality = 0.82): Promise<string> {
  const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not decode image")) }
    img.src = url
  })
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")
  ctx.drawImage(bitmap, 0, 0, w, h)
  // SVGs can't be encoded as JPEG; keep PNG for transparency-friendly types.
  const mime = file.type === "image/png" || file.type === "image/svg+xml" ? "image/png" : "image/jpeg"
  return canvas.toDataURL(mime, quality)
}

/**
 * Upload an image for the blog editor.
 *
 * Tries the legacy `/api/upload` endpoint first (returns a hosted URL). If
 * that backend is disabled or fails (the storage stub is a no-op today —
 * see `api-server/src/lib/legacy-store.ts`), we fall back to a client-side
 * compressed JPEG data URL so the admin remains functional without object
 * storage. The compressed payload (~150–500KB) is safe for the cmsStore
 * localStorage quota and will be migrated cleanly when the NestJS
 * object-storage module ships.
 */
async function uploadBlogImage(file: File): Promise<string> {
  const MAX = 5 * 1024 * 1024
  if (file.size > MAX) throw new Error("Image too large (max 5MB)")

  try {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("productSlug", "blogs")
    const res = await apiFetch("/api/upload", { method: "POST", body: fd })
    if (res.ok) {
      const data = await res.json().catch(() => null) as { url?: string } | null
      if (data && typeof data.url === "string" && data.url) return data.url
    }
  } catch {
    /* fall through to compressed data URL */
  }

  return await compressToDataUrl(file)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

/* ------------------------------------------------------------------ */
/*                         Rich Text Editor                           */
/* ------------------------------------------------------------------ */

type ToolbarButton = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  cmd: string
  value?: string
  group: number
}

const TOOLBAR: ToolbarButton[] = [
  { icon: Pilcrow, label: "Paragraph", cmd: "formatBlock", value: "p", group: 1 },
  { icon: Heading2, label: "Heading 2", cmd: "formatBlock", value: "h2", group: 1 },
  { icon: Heading3, label: "Heading 3", cmd: "formatBlock", value: "h3", group: 1 },
  { icon: Bold, label: "Bold", cmd: "bold", group: 2 },
  { icon: Italic, label: "Italic", cmd: "italic", group: 2 },
  { icon: Underline, label: "Underline", cmd: "underline", group: 2 },
  { icon: Strikethrough, label: "Strikethrough", cmd: "strikeThrough", group: 2 },
  { icon: List, label: "Bullet List", cmd: "insertUnorderedList", group: 3 },
  { icon: ListOrdered, label: "Numbered List", cmd: "insertOrderedList", group: 3 },
  { icon: Quote, label: "Blockquote", cmd: "formatBlock", value: "blockquote", group: 3 },
  { icon: AlignLeft, label: "Align Left", cmd: "justifyLeft", group: 4 },
  { icon: AlignCenter, label: "Align Center", cmd: "justifyCenter", group: 4 },
  { icon: AlignRight, label: "Align Right", cmd: "justifyRight", group: 4 },
]

function RichEditor({
  value,
  onChange,
  onRequestImage,
}: {
  value: string
  onChange: (html: string) => void
  onRequestImage: () => Promise<string | null>
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)
  const [wordCount, setWordCount] = useState(0)

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      editorRef.current.innerHTML = value || ""
      updateCounts(editorRef.current.innerText || "")
    }
    isInternalUpdate.current = false
  }, [value])

  const updateCounts = (text: string) => {
    const trimmed = text.trim()
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0)
  }

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true
      const html = editorRef.current.innerHTML
      onChange(html)
      updateCounts(editorRef.current.innerText || "")
    }
  }, [onChange])

  const focusEditor = () => editorRef.current?.focus()

  const exec = (cmd: string, val?: string) => {
    focusEditor()
    if (cmd === "formatBlock" && val) {
      document.execCommand("formatBlock", false, `<${val}>`)
    } else {
      document.execCommand(cmd, false, val)
    }
    handleInput()
  }

  const handleLink = () => {
    const selection = window.getSelection()?.toString()
    const url = prompt(selection ? `Add link to "${selection.slice(0, 40)}…"` : "Enter URL:")
    if (!url) return
    if (selection) {
      exec("createLink", url)
    } else {
      const html = `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`
      document.execCommand("insertHTML", false, html)
      handleInput()
    }
  }

  const handleImageInsert = async () => {
    const url = await onRequestImage()
    if (!url) return
    focusEditor()
    const alt = "Editorial image"
    const html = `<figure class="editor-figure"><img src="${url}" alt="${alt}" /></figure><p></p>`
    document.execCommand("insertHTML", false, html)
    handleInput()
  }

  const handleHR = () => {
    focusEditor()
    document.execCommand("insertHTML", false, "<hr />")
    handleInput()
  }

  const handleLead = () => {
    focusEditor()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    let node: Node | null = range.startContainer
    while (node && node.nodeType !== 1) node = node.parentNode
    const el = node as HTMLElement | null
    if (el && editorRef.current?.contains(el)) {
      const p = el.closest("p")
      if (p) {
        if (p.classList.contains("lead")) p.classList.remove("lead")
        else p.classList.add("lead")
        handleInput()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
    handleInput()
  }

  const groups = useMemo(() => {
    const map: Record<number, ToolbarButton[]> = {}
    for (const t of TOOLBAR) {
      if (!map[t.group]) map[t.group] = []
      map[t.group].push(t)
    }
    return Object.values(map)
  }, [])

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gradient-to-r from-secondary/60 to-secondary/30 border-b border-border sticky top-14 z-10">
        {groups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-6 bg-border mx-1" />}
            {group.map((btn) => {
              const Icon = btn.icon
              return (
                <button
                  key={btn.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec(btn.cmd, btn.value)}
                  title={btn.label}
                  className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLead}
          title="Mark as lead paragraph (drop cap)"
          className="px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-widest hover:bg-background hover:shadow-sm active:scale-95 transition-all text-orange-600"
        >
          Lead
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleLink}
          title="Insert Link"
          className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
        >
          <Link2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleImageInsert}
          title="Insert Image"
          className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleHR}
          title="Horizontal Rule"
          className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("removeFormat")}
          title="Clear formatting"
          className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
        >
          <Code className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("undo")}
          title="Undo"
          className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("redo")}
          title="Redo"
          className="p-1.5 rounded-md hover:bg-background hover:shadow-sm active:scale-95 transition-all"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* Editable area — styles mirror the public blog article */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder="Tell the story…"
        className={cn(
          "blog-editor min-h-[520px] max-h-[72vh] overflow-y-auto p-8 focus:outline-none bg-[#fdfaf7]",
          "[&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-muted-foreground",
          "[&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-3xl [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:leading-tight",
          "[&_h3]:font-serif [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:text-2xl [&_h3]:mt-8 [&_h3]:mb-2",
          "[&_p]:text-[17px] [&_p]:leading-[1.85] [&_p]:my-4",
          "[&_a]:text-orange-600 [&_a]:underline [&_a]:underline-offset-4",
          "[&_strong]:text-foreground [&_strong]:font-semibold",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-2",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-2",
          "[&_li]:leading-[1.75] [&_li]:text-[17px] [&_li]:marker:text-orange-400",
          "[&_blockquote]:not-italic [&_blockquote]:border-l-4 [&_blockquote]:border-orange-400",
          "[&_blockquote]:bg-gradient-to-br [&_blockquote]:from-orange-50 [&_blockquote]:to-amber-50/60",
          "[&_blockquote]:rounded-r-2xl [&_blockquote]:py-5 [&_blockquote]:px-6 [&_blockquote]:my-6",
          "[&_blockquote]:text-foreground [&_blockquote]:font-serif [&_blockquote]:text-xl [&_blockquote]:leading-snug",
          "[&_p.lead]:text-xl [&_p.lead]:leading-[1.7] [&_p.lead]:font-medium [&_p.lead]:text-foreground",
          "[&_p.lead]:first-letter:font-serif [&_p.lead]:first-letter:text-[4rem] [&_p.lead]:first-letter:font-semibold",
          "[&_p.lead]:first-letter:float-left [&_p.lead]:first-letter:mr-3 [&_p.lead]:first-letter:mt-1",
          "[&_p.lead]:first-letter:leading-[0.9] [&_p.lead]:first-letter:text-orange-600",
          "[&_figure]:my-6 [&_figure_img]:w-full [&_figure_img]:rounded-2xl [&_figure_img]:shadow-lg",
          "[&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-orange-200 [&_hr]:my-10",
        )}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-secondary/30 text-[11px] text-muted-foreground">
        <span>{wordCount} words · ~{Math.max(1, Math.round(wordCount / 220))} min read</span>
        <span className="hidden sm:inline">Tip: Select a paragraph and press <b>Lead</b> for a drop-cap opener.</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                       Image Upload Dialog                          */
/* ------------------------------------------------------------------ */

function ImageUploadDialog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean
  onClose: () => void
  onInsert: (url: string) => void
}) {
  const [urlInput, setUrlInput] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const handleFile = async (file: File) => {
    setError("")
    setUploading(true)
    try {
      const url = await uploadBlogImage(file)
      onInsert(url)
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleUrlInsert = () => {
    if (!urlInput.trim()) return
    onInsert(urlInput.trim())
    setUrlInput("")
    onClose()
  }

  useEffect(() => {
    if (!open) {
      setUrlInput("")
      setError("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle className="font-serif">Insert Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload (PNG, JPG, WebP · 5MB)</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Image URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://images.unsplash.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlInsert()}
              />
              <Button size="sm" onClick={handleUrlInsert} disabled={!urlInput.trim()}>
                Insert
              </Button>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*                          Preview Panel                             */
/* ------------------------------------------------------------------ */

function BlogPreview({ form }: { form: FormState }) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-[#fdfaf7]">
      <div className="px-4 py-2 border-b border-border bg-background/80 backdrop-blur flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Eye className="h-3 w-3" /> Editorial Preview
      </div>
      <div className="p-8 md:p-10">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-widest mb-5">
          {form.category && (
            <span className="inline-flex items-center gap-1 bg-orange-500 text-white px-3 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              {form.category}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(new Date().toISOString())}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {form.read_time_minutes || estimateReadTime(form.content)} min read
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight text-foreground mb-3">
          {form.title || "Your title here"}
        </h1>
        {form.excerpt && (
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-5">
            {form.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center text-white font-semibold">
            {form.author?.[0] || "H"}
          </div>
          <div>
            <p className="text-sm font-semibold">{form.author || "Author"}</p>
            {form.author_role && (
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                {form.author_role}
              </p>
            )}
          </div>
        </div>
        {form.cover_image && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 shadow-[0_20px_60px_-30px_rgba(236,72,153,0.4)]">
            <img src={form.cover_image} alt={form.title || ""} className="object-cover" />
          </div>
        )}
        <div
          className="blog-article text-foreground/85
            [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-3xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:leading-tight
            [&_h3]:font-serif [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-3
            [&_p]:text-[17px] [&_p]:leading-[1.85] [&_p]:my-5
            [&_a]:text-orange-600 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4
            [&_strong]:text-foreground [&_strong]:font-semibold
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-5 [&_ul]:space-y-2
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_ol]:space-y-2
            [&_li]:leading-[1.75] [&_li]:text-[17px] [&_li]:marker:text-orange-400
            [&_blockquote]:not-italic [&_blockquote]:border-l-4 [&_blockquote]:border-orange-400
            [&_blockquote]:bg-gradient-to-br [&_blockquote]:from-orange-50 [&_blockquote]:to-amber-50/60
            [&_blockquote]:rounded-r-2xl [&_blockquote]:py-5 [&_blockquote]:px-6 [&_blockquote]:my-8
            [&_blockquote]:text-foreground [&_blockquote]:font-serif [&_blockquote]:text-xl [&_blockquote]:leading-snug
            [&_p.lead]:text-xl [&_p.lead]:leading-[1.7] [&_p.lead]:font-medium [&_p.lead]:text-foreground
            [&_p.lead]:first-letter:font-serif [&_p.lead]:first-letter:text-[4rem] [&_p.lead]:first-letter:font-semibold
            [&_p.lead]:first-letter:float-left [&_p.lead]:first-letter:mr-3 [&_p.lead]:first-letter:mt-1
            [&_p.lead]:first-letter:leading-[0.9] [&_p.lead]:first-letter:text-orange-600
            [&_figure]:my-6 [&_figure_img]:w-full [&_figure_img]:rounded-2xl [&_figure_img]:shadow-lg
            [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-orange-200 [&_hr]:my-10
          "
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.content || "<p>Your story will appear here.</p>") }}
        />
        {form.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-black/5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              Filed under
            </p>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-orange-100 text-orange-700 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                      Main Admin Blogs Component                    */
/* ------------------------------------------------------------------ */

export function AdminBlogs() {
  const [blogs, setBlogs] = useCmsDoc<BlogPost[]>("blogs", [])
  const isLoading = false
  const mutate = async () => {}
  const [view, setView] = useState<"list" | "edit">("list")
  const [selected, setSelected] = useState<BlogPost | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all")
  const [showPreview, setShowPreview] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const imageResolver = useRef<((v: string | null) => void) | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 3000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [success])

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 5000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [error])

  const filteredBlogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return blogs.filter((b) => {
      if (filterStatus === "published" && !b.is_published) return false
      if (filterStatus === "draft" && b.is_published) return false
      if (!q) return true
      return (
        b.title.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.author || "").toLowerCase().includes(q) ||
        (b.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [blogs, search, filterStatus])

  const stats = useMemo(() => {
    const published = blogs.filter((b) => b.is_published).length
    const featured = blogs.filter((b) => b.is_featured).length
    const drafts = blogs.length - published
    const totalViews = blogs.reduce((s, b) => s + (b.views || 0), 0)
    return { published, drafts, featured, totalViews, total: blogs.length }
  }, [blogs])

  const startNew = () => {
    setSelected(null)
    setForm({ ...emptyForm, content: STARTER_CONTENT })
    setSlugTouched(false)
    setShowPreview(false)
    setView("edit")
    setError("")
  }

  const editBlog = (b: BlogPost) => {
    setSelected(b)
    setForm({
      slug: b.slug,
      title: b.title,
      excerpt: b.excerpt || "",
      content: b.content,
      cover_image: b.cover_image || "",
      author: b.author,
      author_role: b.author_role || "",
      author_avatar: b.author_avatar || "",
      tags: b.tags || [],
      category: b.category || "Health Tips",
      read_time_minutes: b.read_time_minutes || 5,
      is_published: b.is_published,
      is_featured: b.is_featured,
    })
    setSlugTouched(true)
    setShowPreview(false)
    setView("edit")
    setError("")
  }

  const backToList = () => {
    setView("list")
    setSelected(null)
    setForm(emptyForm)
    setError("")
  }

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : slugify(title),
    }))
  }

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    if (form.tags.includes(tag)) return
    setForm((f) => ({ ...f, tags: [...f.tags, tag] }))
    setTagInput("")
  }

  const removeTag = (t: string) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))

  const requestImage = (): Promise<string | null> => {
    return new Promise((resolve) => {
      imageResolver.current = resolve
      setShowImageDialog(true)
    })
  }

  const handleImageDialogClose = () => {
    setShowImageDialog(false)
    if (imageResolver.current) {
      imageResolver.current(null)
      imageResolver.current = null
    }
  }

  const handleImageDialogInsert = (url: string) => {
    setShowImageDialog(false)
    if (imageResolver.current) {
      imageResolver.current(url)
      imageResolver.current = null
    }
  }

  const handleCoverUpload = async (file: File) => {
    try {
      const url = await uploadBlogImage(file)
      setForm((f) => ({ ...f, cover_image: url }))
      setSuccess("Cover image uploaded")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed")
    }
  }

  const handleSave = async (publishedOverride?: boolean) => {
    if (!form.title.trim()) {
      setError("Title is required")
      return
    }
    if (!form.content.trim() || form.content === "<br>") {
      setError("Content is required")
      return
    }

    setSaving(true)
    setError("")

    const payload = {
      ...(selected ? { id: selected.id } : {}),
      ...form,
      read_time_minutes: form.read_time_minutes || estimateReadTime(form.content),
      is_published: typeof publishedOverride === "boolean" ? publishedOverride : form.is_published,
      slug: form.slug || slugify(form.title),
    }

    try {
      const now = new Date().toISOString()
      const data: BlogPost = selected
        ? { ...selected, ...payload, updated_at: now } as BlogPost
        : { id: newId("blog"), views: 0, created_at: now, updated_at: now, ...payload } as BlogPost
      setBlogs((prev) => {
        const idx = prev.findIndex((b) => b.id === data.id)
        if (idx === -1) return [data, ...prev]
        const next = prev.slice(); next[idx] = data; return next
      })
      setSuccess(selected ? "Blog updated" : "Blog created")
      setSelected(data)
      if (typeof publishedOverride === "boolean") {
        setForm((f) => ({ ...f, is_published: publishedOverride }))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm("Delete this blog post permanently? This cannot be undone.")) return
    setBlogs((prev) => prev.filter((b) => b.id !== id))
    if (selected?.id === id) backToList()
    setSuccess("Blog deleted")
  }

  const togglePublish = (b: BlogPost) => {
    setBlogs((prev) => prev.map((p) => p.id === b.id ? { ...p, is_published: !b.is_published, updated_at: new Date().toISOString() } : p))
    setSuccess(b.is_published ? "Unpublished" : "Published")
  }

  /* ----------------------- List View ----------------------- */
  if (view === "list") {
    return (
      <AdminShell title="Blogs">
        <div className="space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-serif font-bold">Health Notes</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Write, edit and publish calm, evidence-led pharmacy articles to /blogs
              </p>
            </div>
            <Button onClick={startNew} className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4 mr-1.5" /> New Blog
            </Button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm p-3 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4" /> {success}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "bg-secondary text-foreground" },
              { label: "Published", value: stats.published, color: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300" },
              { label: "Drafts", value: stats.drafts, color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
              { label: "Featured", value: stats.featured, color: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300" },
              { label: "Total Reads", value: stats.totalViews.toLocaleString(), color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" },
            ].map((s) => (
              <div key={s.label} className={cn("p-4 rounded-xl", s.color)}>
                <p className="text-[11px] uppercase tracking-widest font-semibold opacity-70">{s.label}</p>
                <p className="text-2xl font-serif font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, slug, author, tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(["all", "published", "draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium capitalize rounded-md transition-colors",
                    filterStatus === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Blog grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-secondary/20">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {blogs.length === 0 ? "No blogs yet — create your first story." : "No blogs match your filters."}
              </p>
              {blogs.length === 0 && (
                <Button onClick={startNew} size="sm" className="mt-4">
                  <Plus className="h-4 w-4 mr-1.5" /> New Blog
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredBlogs.map((b) => (
                <article
                  key={b.id}
                  className="group flex flex-col rounded-2xl border border-border bg-background hover:shadow-lg hover:border-orange-200 transition-all overflow-hidden"
                >
                  <div className="relative aspect-[16/9] bg-gradient-to-br from-orange-100 to-amber-100 overflow-hidden">
                    {b.cover_image ? (
                      <img
                        src={b.cover_image}
                        alt={b.title}
                       
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                       
                       
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-orange-300">
                        <FileText className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {b.is_featured && (
                        <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full">
                          <Star className="h-2.5 w-2.5-white" /> Featured
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full",
                        b.is_published
                          ? "bg-green-500 text-white"
                          : "bg-amber-500 text-white"
                      )}>
                        {b.is_published ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    {b.category && (
                      <p className="text-[10px] uppercase tracking-widest text-orange-600 font-semibold mb-2">
                        {b.category}
                      </p>
                    )}
                    <h3 className="font-serif text-lg font-semibold leading-tight mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {b.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                      {b.excerpt || "No excerpt."}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto">
                      <span>{b.author}</span>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {b.read_time_minutes || 5}m
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {b.views || 0}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      /{b.slug} · Updated {formatDate(b.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center border-t border-border">
                    <button
                      type="button"
                      onClick={() => editBlog(b)}
                      className="flex-1 py-2.5 text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      Edit
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button
                      type="button"
                      onClick={() => togglePublish(b)}
                      className="flex-1 py-2.5 text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      {b.is_published ? "Unpublish" : "Publish"}
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <Link
                      href={`/blogs/${b.slug}`}
                      target="_blank"
                      className="flex-1 py-2.5 text-xs font-medium hover:bg-secondary text-center transition-colors"
                    >
                      View
                    </Link>
                    <div className="w-px h-5 bg-border" />
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="py-2.5 px-4 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </AdminShell>
    )
  }

  /* ----------------------- Edit View ----------------------- */
  return (
    <AdminShell title={selected ? `Edit: ${selected.title}` : "New Blog"}>
      <div className="space-y-5">
        {/* Header / toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 sticky top-14 z-20 bg-background/95 backdrop-blur py-3 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-border">
          <button
            type="button"
            onClick={backToList}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to articles
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
              className="bg-transparent"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {showPreview ? "Editor" : "Preview"}
            </Button>
            {selected && (
              <Link href={`/blogs/${selected.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="bg-transparent">
                  View Live
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="bg-transparent"
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              size="sm"
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              {form.is_published ? "Update & Publish" : "Publish"}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm p-3 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </div>
        )}

        {showPreview ? (
          <BlogPreview form={form} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* Main editor column */}
            <div className="space-y-4">
              {/* Title */}
              <input
                type="text"
                placeholder="Your headline…"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-3xl md:text-4xl font-serif font-semibold bg-transparent border-0 border-b border-border pb-3 focus:outline-none focus:border-orange-400 transition-colors"
              />

              {/* Excerpt */}
              <Textarea
                placeholder="Excerpt — a short, magnetic summary (2 lines max)."
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                maxLength={220}
                className="text-base resize-none bg-transparent border-border focus-visible:ring-orange-300"
              />
              <p className="text-[10px] text-muted-foreground -mt-3">{form.excerpt.length}/220</p>

              {/* Rich editor */}
              <RichEditor
                value={form.content}
                onChange={(content) => setForm((f) => ({ ...f, content }))}
                onRequestImage={requestImage}
              />
            </div>

            {/* Sidebar */}
            <aside className="space-y-4">
              {/* Publish status card */}
              <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Status
                </p>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>Published</span>
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between text-sm cursor-pointer">
                  <span>Featured on Health Notes</span>
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                    className="h-4 w-4"
                  />
                </label>
                {selected && (
                  <div className="pt-2 border-t border-border text-[11px] text-muted-foreground space-y-1">
                    <p>Views: {selected.views || 0}</p>
                    <p>Updated: {formatDate(selected.updated_at)}</p>
                  </div>
                )}
              </div>

              {/* URL Slug */}
              <div className="rounded-xl border border-border p-4 space-y-2 bg-background">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  URL Slug
                </Label>
                <div className="flex items-center text-xs rounded-md border border-border bg-secondary/40 overflow-hidden">
                  <span className="px-2 text-muted-foreground whitespace-nowrap">/blogs/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true)
                      setForm({ ...form, slug: slugify(e.target.value) })
                    }}
                    className="flex-1 bg-transparent py-2 pr-2 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Cover Image */}
              <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Cover Image
                </Label>
                {form.cover_image ? (
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden group">
                    <img src={form.cover_image} alt="Cover" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, cover_image: "" })}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 hover:bg-background shadow-sm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload cover (5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
                    />
                  </label>
                )}
                <Input
                  placeholder="…or paste an image URL"
                  value={form.cover_image}
                  onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* Category + Read time */}
              <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Category
                  </Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1.5 w-full h-9 px-2 text-sm border border-border bg-background rounded-md"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Read time (min)
                  </Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={form.read_time_minutes}
                      onChange={(e) =>
                        setForm({ ...form, read_time_minutes: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="h-9"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, read_time_minutes: estimateReadTime(f.content) }))
                      }
                      className="text-[10px] uppercase tracking-widest font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Auto
                    </button>
                  </div>
                </div>
              </div>

              {/* Author */}
              <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Author
                </p>
                <Input
                  placeholder="Name"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="h-9"
                />
                <Input
                  placeholder="Role (e.g. Lead Pharmacist, Clinical Editor)"
                  value={form.author_role}
                  onChange={(e) => setForm({ ...form, author_role: e.target.value })}
                  className="h-9"
                />
                <Input
                  placeholder="Avatar URL (optional)"
                  value={form.author_avatar}
                  onChange={(e) => setForm({ ...form, author_avatar: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              {/* Tags */}
              <div className="rounded-xl border border-border p-4 space-y-3 bg-background">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full border border-orange-200"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="hover:text-orange-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  placeholder="Add a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  onBlur={() => tagInput && addTag(tagInput)}
                  className="h-9 text-xs"
                />
              </div>

              {selected && (
                <button
                  type="button"
                  onClick={() => handleDelete(selected.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Blog
                </button>
              )}
            </aside>
          </div>
        )}
      </div>

      <ImageUploadDialog
        open={showImageDialog}
        onClose={handleImageDialogClose}
        onInsert={handleImageDialogInsert}
      />
    </AdminShell>
  )
}

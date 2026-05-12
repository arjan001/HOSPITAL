"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Save, Loader2, Eye, FileText, Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, Undo2, Redo2, Code, Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import useSWR from "swr"
import { sanitizeHtml } from "@/lib/sanitize-html"

interface Policy {
  id: string
  slug: string
  title: string
  content: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  is_published: boolean
  created_at: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TOOLBAR_ACTIONS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "divider" as const },
  { cmd: "formatBlock:h2", icon: Heading2, label: "Heading" },
  { cmd: "insertUnorderedList", icon: List, label: "Bullet List" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered List" },
  { cmd: "divider" as const },
  { cmd: "createLink", icon: Link2, label: "Link" },
  { cmd: "removeFormat", icon: Code, label: "Clear Format" },
]

function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isInternalUpdate = useRef(false)

  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      editorRef.current.innerHTML = value
    }
    isInternalUpdate.current = false
  }, [value])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalUpdate.current = true
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const execCmd = (cmdStr: string) => {
    if (cmdStr.startsWith("formatBlock:")) {
      document.execCommand("formatBlock", false, `<${cmdStr.split(":")[1]}>`)
    } else if (cmdStr === "createLink") {
      const url = prompt("Enter URL:")
      if (url) document.execCommand("createLink", false, url)
    } else {
      document.execCommand(cmdStr, false)
    }
    editorRef.current?.focus()
    handleInput()
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-secondary/50 border-b border-border">
        {TOOLBAR_ACTIONS.map((action, i) => {
          if (action.cmd === "divider") return <div key={`d-${i}`} className="w-px h-5 bg-border mx-1" />
          const Icon = action.icon!
          return (
            <button key={action.cmd} type="button" onClick={() => execCmd(action.cmd)} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title={action.label}>
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => document.execCommand("undo")} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={() => document.execCommand("redo")} className="p-1.5 rounded-sm hover:bg-secondary transition-colors" title="Redo"><Redo2 className="h-4 w-4" /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[350px] max-h-[500px] overflow-y-auto p-4 text-sm leading-relaxed focus:outline-none prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground prose-a:text-foreground prose-a:underline prose-ul:list-disc prose-ul:pl-5"
      />
    </div>
  )
}

const emptyForm = { slug: "", title: "", content: "", meta_title: "", meta_description: "", meta_keywords: "", is_published: true }

export function AdminPolicies() {
  const { data: policies = [], mutate } = useSWR<Policy[]>("/api/admin/policies", fetcher)
  const [selected, setSelected] = useState<Policy | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [newForm, setNewForm] = useState({ title: "", slug: "" })

  useEffect(() => {
    if (policies.length > 0 && !selected) selectPolicy(policies[0])
  }, [policies, selected])

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 3000); return () => clearTimeout(t) }
  }, [success])

  const selectPolicy = (p: Policy) => {
    setSelected(p)
    setForm({ slug: p.slug, title: p.title, content: p.content, meta_title: p.meta_title, meta_description: p.meta_description, meta_keywords: p.meta_keywords, is_published: p.is_published })
    setShowPreview(false)
    setError("")
  }

  const handleSave = async () => {
    if (!form.slug || !form.title || !form.content) { setError("Slug, title, and content are required"); return }
    setSaving(true); setError("")
    try {
      const payload = selected ? { id: selected.id, ...form } : form
      const res = await fetch("/api/admin/policies", { method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to save") }
      await mutate()
      setSuccess("Policy saved successfully")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy permanently?")) return
    setError("")
    try {
      const res = await fetch(`/api/admin/policies?id=${id}`, { method: "DELETE" })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to delete") }
      if (selected?.id === id) { setSelected(null); setForm(emptyForm) }
      await mutate()
      setSuccess("Policy deleted")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleCreateNew = async () => {
    if (!newForm.title || !newForm.slug) return
    setError("")
    try {
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newForm, content: `<h2>${newForm.title}</h2><p>Write your policy content here...</p>`, meta_title: newForm.title, meta_description: "", meta_keywords: "", is_published: false }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create") }
      await mutate()
      setShowNewModal(false)
      setNewForm({ title: "", slug: "" })
      setSuccess("Policy created")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <AdminShell title="Policies">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">Policies</h1>
            <p className="text-sm text-muted-foreground mt-1">{policies.length} legal page{policies.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setShowNewModal(true)} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Policy
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-sm border border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm p-3 rounded-sm border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Policy List */}
          <div className="lg:col-span-3 space-y-2">
            {policies.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPolicy(p)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm rounded-sm border transition-colors ${
                  selected?.id === p.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:border-foreground/30"
                }`}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className={`text-[11px] mt-0.5 ${selected?.id === p.id ? "text-background/70" : "text-muted-foreground"}`}>
                    /{p.slug} {p.is_published ? "" : "(Draft)"}
                  </p>
                </div>
              </button>
            ))}

            {policies.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No policies yet
              </div>
            )}
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-9">
            {selected ? (
              <div className="space-y-5">
                {/* Toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border">
                  <div>
                    <h2 className="text-lg font-semibold font-serif">{form.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      /{selected.slug} -- Last updated: {new Date(selected.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="bg-transparent">
                      <Eye className="h-3.5 w-3.5 mr-1.5" />{showPreview ? "Edit" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(selected.id)} className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                {/* Title + Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">URL Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-10" />
                  </div>
                </div>

                {/* Content Editor or Preview */}
                {showPreview ? (
                  <div className="border border-border rounded-sm">
                    <div className="px-4 py-2 border-b border-border bg-secondary/30">
                      <p className="text-xs font-medium text-muted-foreground">Preview</p>
                    </div>
                    <div className="p-6 prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-semibold" dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.content) }} />
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Content</Label>
                    <RichEditor value={form.content} onChange={(content) => setForm({ ...form, content })} />
                  </div>
                )}

                {/* SEO & Settings */}
                <div className="border border-border rounded-sm p-4 space-y-4">
                  <h3 className="text-sm font-semibold">SEO & Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium mb-1 block">Meta Title</Label>
                      <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder="Title for search engines" className="h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">Meta Keywords</Label>
                      <Input value={form.meta_keywords} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })} placeholder="keyword1, keyword2" className="h-9 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Meta Description</Label>
                    <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={2} className="text-sm" placeholder="Description for search results" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{form.meta_description.length}/160</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="h-4 w-4 rounded border-border" />
                    <Label htmlFor="is_published" className="text-sm font-medium cursor-pointer">Published</Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a policy from the sidebar or create a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Policy Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-sm bg-background text-foreground">
          <DialogHeader><DialogTitle className="font-serif">New Policy</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Title</Label>
              <Input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} placeholder="e.g. Privacy Policy" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">URL Slug</Label>
              <Input value={newForm.slug} onChange={(e) => setNewForm({ ...newForm, slug: e.target.value })} placeholder="privacy-policy" />
              <p className="text-[11px] text-muted-foreground mt-1">Will be accessible at /policies/{newForm.slug || "slug"}</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewModal(false)} className="bg-transparent">Cancel</Button>
              <Button size="sm" onClick={handleCreateNew} disabled={!newForm.title || !newForm.slug} className="bg-foreground text-background hover:bg-foreground/90">Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}

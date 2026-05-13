"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsCollection, newId, slugify } from "@/lib/cms-store"
import { FileText, Plus, Trash2, Edit2, ExternalLink, Eye, EyeOff, Save, X } from "lucide-react"

export type CustomPage = {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  seoTitle: string
  seoDescription: string
  showInFooter: boolean
  footerColumn: "about" | "support" | "legal" | "care" | ""
  published: boolean
  updatedAt: number
}

const SEED: CustomPage[] = [
  {
    id: "p_about",
    slug: "about-us",
    title: "About Shaniid RX",
    excerpt: "Kenya's trusted online pharmacy — licensed, fast, and personal.",
    body:
      "Shaniid RX is a licensed Kenyan online pharmacy delivering prescription and over-the-counter medicine across Nairobi and beyond.\n\nOur clinical team reviews every prescription, our pharmacists are reachable by phone, and your order arrives in discreet packaging.",
    seoTitle: "About Shaniid RX | Trusted Online Pharmacy in Kenya",
    seoDescription:
      "Learn about Shaniid RX — a licensed Kenyan online pharmacy with same-day delivery, pharmacist support, and transparent pricing.",
    showInFooter: true,
    footerColumn: "about",
    published: true,
    updatedAt: Date.now(),
  },
  {
    id: "p_returns",
    slug: "returns-refund-policy",
    title: "Returns & Refund Policy",
    excerpt: "What to do if your order isn't right.",
    body:
      "Because medication is regulated, returns are limited to damaged, expired, or incorrectly fulfilled items.\n\nIf something is wrong with your order, call us within 24 hours of delivery and we'll arrange a replacement or refund.",
    seoTitle: "Returns & Refund Policy | Shaniid RX",
    seoDescription: "Read the Shaniid RX returns and refund policy for medication orders.",
    showInFooter: true,
    footerColumn: "support",
    published: true,
    updatedAt: Date.now(),
  },
  {
    id: "p_prescription_guide",
    slug: "prescription-upload-guide",
    title: "Prescription Upload Guide",
    excerpt: "How to upload a prescription so we can serve you fast.",
    body:
      "1. Take a clear photo of the full prescription, including the prescriber's signature.\n2. Make sure dosage and frequency are visible.\n3. Upload through the Upload Prescription page.\n4. A licensed pharmacist will call you to confirm dosage and delivery, usually within 15 minutes.",
    seoTitle: "How to Upload a Prescription | Shaniid RX",
    seoDescription: "A step-by-step guide to uploading your prescription on Shaniid RX.",
    showInFooter: true,
    footerColumn: "support",
    published: true,
    updatedAt: Date.now(),
  },
]

const FOOTER_COLUMNS: Array<{ value: CustomPage["footerColumn"]; label: string }> = [
  { value: "", label: "(none)" },
  { value: "about", label: "About" },
  { value: "care", label: "Care & Shop" },
  { value: "support", label: "Customer Support" },
  { value: "legal", label: "Legal" },
]

function emptyPage(): CustomPage {
  return {
    id: newId("page"),
    slug: "",
    title: "",
    excerpt: "",
    body: "",
    seoTitle: "",
    seoDescription: "",
    showInFooter: false,
    footerColumn: "",
    published: false,
    updatedAt: Date.now(),
  }
}

export function AdminCustomPages() {
  const { items, upsert, remove } = useCmsCollection<CustomPage>("custom-pages", SEED)
  const [editing, setEditing] = useState<CustomPage | null>(null)
  const [filter, setFilter] = useState("")

  const filtered = items.filter(
    (p) =>
      !filter.trim() ||
      p.title.toLowerCase().includes(filter.toLowerCase()) ||
      p.slug.toLowerCase().includes(filter.toLowerCase()),
  )

  const save = () => {
    if (!editing) return
    const slug = editing.slug.trim() || slugify(editing.title)
    if (!slug || !editing.title.trim()) return
    upsert({ ...editing, slug, updatedAt: Date.now() })
    setEditing(null)
  }

  return (
    <AdminShell title="Custom Pages">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Custom Pages
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build any storefront page (About, FAQ, Returns, Shipping…). Pages render at <code>/pages/&lt;slug&gt;</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search pages…"
              className="h-9 px-3 rounded-md border border-border bg-background text-sm w-56"
            />
            <button
              type="button"
              onClick={() => setEditing(emptyPage())}
              className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New page
            </button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                <th className="text-left px-4 py-2.5 font-semibold">Slug</th>
                <th className="text-left px-4 py-2.5 font-semibold">Footer</th>
                <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold">Updated</th>
                <th className="text-right px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-10">
                    No pages yet — click <span className="font-medium">New page</span> to add one.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-muted-foreground">/pages/{p.slug}</code>
                  </td>
                  <td className="px-4 py-3">
                    {p.showInFooter && p.footerColumn ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">{p.footerColumn}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.published ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                        <Eye className="h-3 w-3" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <EyeOff className="h-3 w-3" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={`/pages/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded hover:bg-secondary"
                        title="Open"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditing(p)}
                        className="p-1.5 rounded hover:bg-secondary"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete "${p.title}"? This cannot be undone.`)) remove(p.id)
                        }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor drawer */}
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-stretch justify-end"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-2xl bg-background h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-background border-b border-border px-6 py-3 flex items-center justify-between z-10">
              <h2 className="font-semibold text-lg">
                {items.some((i) => i.id === editing.id) ? "Edit page" : "New page"}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background inline-flex items-center gap-2"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="ml-1 p-1.5 rounded hover:bg-secondary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <Field label="Title">
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      title: e.target.value,
                      slug: editing.slug || slugify(e.target.value),
                    })
                  }
                  placeholder="About Shaniid RX"
                  className="input"
                />
              </Field>

              <Field label="Slug" hint="URL path under /pages/">
                <input
                  type="text"
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder="about-shaniid-rx"
                  className="input font-mono"
                />
              </Field>

              <Field label="Excerpt" hint="Shown under the title on the page header">
                <input
                  type="text"
                  value={editing.excerpt}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Body" hint="Plain text — paragraphs separated by blank lines. Markdown-style links coming soon.">
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={14}
                  className="input font-mono text-xs"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="SEO title">
                  <input
                    type="text"
                    value={editing.seoTitle}
                    onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="SEO description">
                  <input
                    type="text"
                    value={editing.seoDescription}
                    onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Footer column">
                  <select
                    value={editing.footerColumn}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        footerColumn: e.target.value as CustomPage["footerColumn"],
                        showInFooter: Boolean(e.target.value),
                      })
                    }
                    className="input"
                  >
                    {FOOTER_COLUMNS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <label className="flex items-center gap-2 h-9">
                    <input
                      type="checkbox"
                      checked={editing.published}
                      onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                      className="h-4 w-4 accent-foreground"
                    />
                    <span className="text-sm">Published</span>
                  </label>
                </Field>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`.input{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.875rem;}
        textarea.input{height:auto;padding:0.625rem 0.75rem;}`}</style>
    </AdminShell>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium block">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

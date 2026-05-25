import { useMemo, useState } from "react"
import Papa from "papaparse"
import {
  Upload, Download, FileSpreadsheet, Tag, Package, Link2, Loader2,
  CheckCircle2, AlertTriangle, Globe, X, Plus,
} from "lucide-react"
import { AdminShell } from "./admin-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cmsStore } from "@/lib/cms-store"

const NEST_BASE = "/api/v2/admin/catalog"

/* ─────────────────────── templates ─────────────────────── */

const CATEGORY_HEADERS = ["name", "slug", "parentSlug", "icon", "image", "banner", "isActive"]
const CATEGORY_SAMPLE = [
  ["Medications", "medications", "", "Pill", "/images/categories/medications.png", "", "yes"],
  ["Pain Relief", "pain-relief", "medications", "Activity", "", "", "yes"],
  ["Cold & Flu",  "cold-flu",    "medications", "ShieldCheck", "", "", "yes"],
]

const PRODUCT_HEADERS = [
  "name", "slug", "price", "originalPrice", "categorySlug", "description",
  "images", "tags", "isNew", "isOnOffer", "offerPercentage", "inStock", "stockCount",
]
const PRODUCT_SAMPLE = [
  ["Paracetamol 500mg (24 tablets)", "paracetamol-500mg-24", "280", "350", "pain-relief",
   "Effective relief for headaches, fever and mild pain.", "https://example.com/paracetamol.jpg",
   "pain relief, fever, headache", "yes", "yes", "20", "yes", "150"],
  ["Vitamin C 1000mg (60 tablets)", "vitamin-c-1000-60", "320", "", "vitamins",
   "Daily immune support.", "https://example.com/vitc.jpg",
   "vitamin, immunity", "yes", "no", "", "yes", "80"],
]

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = Papa.unparse({ fields: headers, data: rows })
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type Row = Record<string, string>
type ParseResult = { rows: Row[]; headers: string[]; errors: string[] }

function parseFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        resolve({
          rows: (result.data as Row[]).filter((r) => Object.values(r).some((v) => v && String(v).trim())),
          headers: result.meta.fields || [],
          errors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
        })
      },
    })
  })
}

function parseText(text: string): ParseResult {
  const result = Papa.parse<Row>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() })
  return {
    rows: (result.data as Row[]).filter((r) => Object.values(r).some((v) => v && String(v).trim())),
    headers: result.meta.fields || [],
    errors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
  }
}

/* ─────────────────────── shared UI bits ─────────────────────── */

type ImportSummary = {
  ok: boolean
  total?: number
  created?: number
  updated?: number
  failed?: number
  errors?: { row: number; reason: string }[]
  results?: { row: number; ok: boolean; reason?: string }[]
  message?: string
}

function SummaryCard({ summary }: { summary: ImportSummary | null }) {
  if (!summary) return null
  const issues = [
    ...(summary.errors ?? []).map((e) => `Row ${e.row}: ${e.reason}`),
    ...(summary.results ?? []).filter((r) => !r.ok).map((r) => `Row ${r.row}: ${r.reason}`),
  ]
  return (
    <div className={`mt-4 rounded-lg border p-4 ${summary.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {summary.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-amber-700" />}
        {summary.ok ? "Import complete" : "Import finished with issues"}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {summary.total !== undefined && <Badge variant="outline">Total {summary.total}</Badge>}
        {summary.created !== undefined && <Badge variant="outline">Created {summary.created}</Badge>}
        {summary.updated !== undefined && <Badge variant="outline">Updated {summary.updated}</Badge>}
        {summary.failed !== undefined && summary.failed > 0 && (
          <Badge variant="outline" className="border-red-300 text-red-800">Failed {summary.failed}</Badge>
        )}
      </div>
      {issues.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-amber-900">{issues.length} row issue(s)</summary>
          <ul className="mt-1 max-h-40 overflow-auto text-xs text-zinc-700">
            {issues.slice(0, 50).map((m, i) => <li key={i}>• {m}</li>)}
            {issues.length > 50 && <li>… and {issues.length - 50} more</li>}
          </ul>
        </details>
      )}
    </div>
  )
}

/* ─────────────────────── Categories tab ─────────────────────── */

function CategoriesPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [pasted, setPasted] = useState("")
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [mode, setMode] = useState<"upsert" | "replace">("upsert")

  const onFile = async (file: File | null) => {
    if (!file) return
    const r = await parseFile(file)
    setRows(r.rows); setHeaders(r.headers); setErrors(r.errors); setSummary(null)
  }
  const onPasteChange = (v: string) => {
    setPasted(v)
    const r = parseText(v)
    setRows(r.rows); setHeaders(r.headers); setErrors(r.errors); setSummary(null)
  }

  const exportCurrent = () => {
    const current = cmsStore.get<{ id: string; name: string; slug: string; parentId: string | null; icon: string; image: string; banner: string; isActive: boolean }[]>("categories", [])
    const byId = new Map(current.map((c) => [c.id, c]))
    const rows = current.map((c) => [
      c.name, c.slug, c.parentId ? byId.get(c.parentId)?.slug ?? "" : "",
      c.icon, c.image, c.banner, c.isActive ? "yes" : "no",
    ])
    downloadCsv("shaniid-rx-categories.csv", CATEGORY_HEADERS, rows)
  }

  const runImport = async () => {
    if (rows.length === 0) return
    setBusy(true); setSummary(null)
    try {
      const res = await fetch(`${NEST_BASE}/categories/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode }),
      })
      const json = (await res.json().catch(() => ({}))) as ImportSummary
      if (!res.ok) setSummary({ ok: false, message: json.message || `HTTP ${res.status}` })
      else { setSummary(json); cmsStore.refresh("categories") }
    } catch (err) {
      setSummary({ ok: false, message: err instanceof Error ? err.message : "Network error" })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => downloadCsv("shaniid-rx-categories-template.csv", CATEGORY_HEADERS, CATEGORY_SAMPLE)}>
          <Download className="mr-2 h-4 w-4" /> Download template
        </Button>
        <Button variant="outline" onClick={exportCurrent}>
          <Download className="mr-2 h-4 w-4" /> Export current categories
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Label htmlFor="cat-mode" className="text-zinc-600">Mode</Label>
          <select
            id="cat-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "upsert" | "replace")}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
          >
            <option value="upsert">Upsert by slug</option>
            <option value="replace">Replace all</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold uppercase text-zinc-500">Upload CSV file</Label>
          <Input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="mt-1" />
          <p className="mt-1 text-xs text-zinc-500">
            Required column: <code>name</code>. Optional: <code>slug</code>, <code>parentSlug</code>, <code>icon</code>, <code>image</code>, <code>banner</code>, <code>isActive</code>.
          </p>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase text-zinc-500">Or paste CSV</Label>
          <Textarea
            value={pasted}
            onChange={(e) => onPasteChange(e.target.value)}
            placeholder={`${CATEGORY_HEADERS.join(",")}\nMedications,medications,,Pill,,,yes`}
            className="mt-1 h-32 font-mono text-xs"
          />
        </div>
      </div>

      {(rows.length > 0 || errors.length > 0) && (
        <div className="rounded-md border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <strong>{rows.length}</strong> row(s) parsed · headers: <span className="font-mono text-xs">{headers.join(", ")}</span>
            </div>
            <Button onClick={runImport} disabled={busy || rows.length === 0} className="bg-[#3D0814] text-white hover:bg-[#6B0F1A]">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</> : <><Upload className="mr-2 h-4 w-4" /> Import {rows.length} categor{rows.length === 1 ? "y" : "ies"}</>}
            </Button>
          </div>
          {errors.length > 0 && (
            <ul className="mt-2 max-h-24 overflow-auto text-xs text-amber-700">
              {errors.slice(0, 20).map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}

      <SummaryCard summary={summary} />
    </div>
  )
}

/* ─────────────────────── Products tab ─────────────────────── */

function ProductsPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [pasted, setPasted] = useState("")
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const onFile = async (file: File | null) => {
    if (!file) return
    const r = await parseFile(file)
    setRows(r.rows); setHeaders(r.headers); setErrors(r.errors); setSummary(null)
  }
  const onPasteChange = (v: string) => {
    setPasted(v)
    const r = parseText(v)
    setRows(r.rows); setHeaders(r.headers); setErrors(r.errors); setSummary(null)
  }

  const runImport = async () => {
    if (rows.length === 0) return
    setBusy(true); setSummary(null)
    try {
      const res = await fetch(`${NEST_BASE}/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const json = (await res.json().catch(() => ({}))) as ImportSummary
      if (!res.ok) setSummary({ ok: false, message: json.message || `HTTP ${res.status}` })
      else setSummary(json)
    } catch (err) {
      setSummary({ ok: false, message: err instanceof Error ? err.message : "Network error" })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => downloadCsv("shaniid-rx-products-template.csv", PRODUCT_HEADERS, PRODUCT_SAMPLE)}>
          <Download className="mr-2 h-4 w-4" /> Download template
        </Button>
        <a href="/api/admin/products?format=csv" target="_blank" rel="noreferrer">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export current products
          </Button>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-xs font-semibold uppercase text-zinc-500">Upload CSV file</Label>
          <Input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="mt-1" />
          <p className="mt-1 text-xs text-zinc-500">
            Required: <code>name</code>, <code>price</code>, <code>categorySlug</code>. <code>images</code> uses <code>|</code> to separate multiple URLs. <code>tags</code> are comma-separated.
          </p>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase text-zinc-500">Or paste CSV</Label>
          <Textarea
            value={pasted}
            onChange={(e) => onPasteChange(e.target.value)}
            placeholder={`${PRODUCT_HEADERS.join(",")}\nParacetamol,paracetamol,280,,pain-relief,...`}
            className="mt-1 h-32 font-mono text-xs"
          />
        </div>
      </div>

      {(rows.length > 0 || errors.length > 0) && (
        <div className="rounded-md border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <strong>{rows.length}</strong> row(s) parsed · headers: <span className="font-mono text-xs">{headers.join(", ")}</span>
            </div>
            <Button onClick={runImport} disabled={busy || rows.length === 0} className="bg-[#3D0814] text-white hover:bg-[#6B0F1A]">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</> : <><Upload className="mr-2 h-4 w-4" /> Import {rows.length} product{rows.length === 1 ? "" : "s"}</>}
            </Button>
          </div>
          {errors.length > 0 && (
            <ul className="mt-2 max-h-24 overflow-auto text-xs text-amber-700">
              {errors.slice(0, 20).map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}

      <SummaryCard summary={summary} />
    </div>
  )
}

/* ─────────────────────── Scrape URL tab ─────────────────────── */

/**
 * ScrapeUrlPanel: fetch one or more product page URLs server-side.
 *
 * The backend tries three extraction strategies in priority order:
 *   1. JSON-LD structured data (schema.org/Product)
 *   2. Open Graph / product meta tags
 *   3. Basic HTML fallback (<h1>, <title>, <meta name="description">)
 *
 * Scraped rows appear in a preview table. Click "Import" to push them
 * through the same products/import pipeline as CSV rows.
 */
function ScrapeUrlPanel() {
  const [urls, setUrls] = useState<string[]>([""])
  const [categorySlug, setCategorySlug] = useState("")
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<
    Array<{ url: string; ok: boolean; product?: Record<string, string>; reason?: string }>
  >([])
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addUrl = () => setUrls((prev) => [...prev, ""])
  const removeUrl = (i: number) => setUrls((prev) => prev.filter((_, idx) => idx !== i))
  const updateUrl = (i: number, v: string) =>
    setUrls((prev) => prev.map((u, idx) => (idx === i ? v : u)))

  const scrape = async () => {
    const validUrls = urls.map((u) => u.trim()).filter(Boolean)
    if (validUrls.length === 0) return
    setBusy(true)
    setError(null)
    setResults([])
    setImportSummary(null)
    try {
      const res = await fetch(`${NEST_BASE}/scrape-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls, categorySlug: categorySlug.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || `HTTP ${res.status}`)
        return
      }
      setResults(json.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setBusy(false)
    }
  }

  const importScraped = async () => {
    const rows = results
      .filter((r) => r.ok && r.product)
      .map((r) => r.product as Record<string, string>)
    if (rows.length === 0) return
    setBusy(true)
    setImportSummary(null)
    try {
      const res = await fetch(`${NEST_BASE}/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const json = (await res.json().catch(() => ({}))) as ImportSummary
      if (!res.ok) setImportSummary({ ok: false, message: json.message || `HTTP ${res.status}` })
      else setImportSummary(json)
    } catch (err) {
      setImportSummary({ ok: false, message: err instanceof Error ? err.message : "Network error" })
    } finally {
      setBusy(false)
    }
  }

  const successRows = results.filter((r) => r.ok && r.product)

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
        <strong className="text-zinc-900">How it works:</strong> paste one product page URL per
        line. The server fetches each page, extracts the product name, price, description and
        image using JSON-LD, Open Graph, or basic HTML parsing — then shows a preview for you
        to review before importing. Provide a{" "}
        <strong>category slug</strong> so the products land in the right category.
      </div>

      {/* Category slug */}
      <div className="max-w-xs">
        <label className="text-xs font-semibold uppercase text-zinc-500">
          Category slug (applied to all scraped products)
        </label>
        <Input
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          placeholder="e.g. pain-relief"
          className="mt-1"
        />
      </div>

      {/* URL list */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-zinc-500">Product page URLs</label>
        {urls.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              placeholder="https://example.com/product/paracetamol-500mg"
              className="flex-1"
            />
            {urls.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrl(i)}
                className="text-zinc-400 hover:text-red-600 transition-colors"
                aria-label="Remove URL"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addUrl}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add another URL
        </button>
      </div>

      <Button
        onClick={scrape}
        disabled={busy || urls.every((u) => !u.trim())}
        variant="outline"
      >
        {busy ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping…</>
        ) : (
          <><Globe className="mr-2 h-4 w-4" /> Scrape {urls.filter((u) => u.trim()).length} URL{urls.filter((u) => u.trim()).length === 1 ? "" : "s"}</>
        )}
      </Button>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Scrape results preview */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-800">
              {successRows.length} of {results.length} URL{results.length === 1 ? "" : "s"} extracted successfully
            </p>
            {successRows.length > 0 && (
              <Button
                onClick={importScraped}
                disabled={busy}
                className="bg-[#3D0814] text-white hover:bg-[#6B0F1A]"
              >
                {busy ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Import {successRows.length} product{successRows.length === 1 ? "" : "s"}</>
                )}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Price</th>
                  <th className="px-3 py-2 text-left font-semibold">Via</th>
                  <th className="px-3 py-2 text-left font-semibold">Source URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span title={r.reason}><AlertTriangle className="h-4 w-4 text-amber-600" /></span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-900 max-w-[200px] truncate">
                      {r.product?.name ?? <span className="text-zinc-400 italic">{r.reason}</span>}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{r.product?.price || "—"}</td>
                    <td className="px-3 py-2">
                      {r.product?.extractedVia && (
                        <Badge variant="outline" className="text-[10px]">
                          {r.product.extractedVia}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 max-w-[200px] truncate">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-zinc-700 hover:underline"
                      >
                        {r.url}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SummaryCard summary={importSummary} />
    </div>
  )
}

/* ─────────────────────── Google Sheets tab ─────────────────────── */

function GoogleSheetPanel() {
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [target, setTarget] = useState<"categories" | "products">("products")
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const fetchSheet = async () => {
    setBusy(true); setError(null); setRows([]); setHeaders([]); setSummary(null)
    try {
      const res = await fetch(`${NEST_BASE}/google-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.message || `HTTP ${res.status}`); return }
      const parsed = parseText(json.csv || "")
      setRows(parsed.rows); setHeaders(parsed.headers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally { setBusy(false) }
  }

  const runImport = async () => {
    if (rows.length === 0) return
    setBusy(true); setSummary(null)
    try {
      const endpoint = target === "categories" ? "categories/import" : "products/import"
      const res = await fetch(`${NEST_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const json = (await res.json().catch(() => ({}))) as ImportSummary
      if (!res.ok) setSummary({ ok: false, message: json.message || `HTTP ${res.status}` })
      else {
        setSummary(json)
        if (target === "categories") cmsStore.refresh("categories")
      }
    } catch (err) {
      setSummary({ ok: false, message: err instanceof Error ? err.message : "Network error" })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
        <strong className="text-zinc-900">How to share a Google Sheet:</strong> open the sheet → <em>Share</em> → set "Anyone with the link" to <em>Viewer</em>, then paste the normal sheet URL here. (You can also use <code>File → Share → Publish to web</code> and paste the published CSV URL — both work.)
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grow">
          <Label className="text-xs font-semibold uppercase text-zinc-500">Google Sheets URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase text-zinc-500">Target</Label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as "categories" | "products")}
            className="mt-1 block rounded border border-zinc-300 bg-white px-2 py-2 text-sm"
          >
            <option value="products">Products</option>
            <option value="categories">Categories</option>
          </select>
        </div>
        <Button onClick={fetchSheet} disabled={!url || busy} variant="outline">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
          Fetch sheet
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {rows.length > 0 && (
        <div className="rounded-md border bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <strong>{rows.length}</strong> row(s) fetched · headers: <span className="font-mono text-xs">{headers.join(", ")}</span>
            </div>
            <Button onClick={runImport} disabled={busy} className="bg-[#3D0814] text-white hover:bg-[#6B0F1A]">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing…</> : <><Upload className="mr-2 h-4 w-4" /> Import as {target}</>}
            </Button>
          </div>
        </div>
      )}

      <SummaryCard summary={summary} />
    </div>
  )
}

/* ─────────────────────── Page ─────────────────────── */

export function AdminBulkImport() {
  const apiHint = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app"
    return `${origin}${NEST_BASE}`
  }, [])

  return (
    <AdminShell title="Bulk Catalogue Import">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-semibold text-[#3D0814]">Bulk Catalogue Import</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Upload products and categories in bulk via CSV file, paste, or Google Sheets. External scripts can also POST to the same endpoints — see the API tab below.
          </p>
        </header>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="products">
              <TabsList>
                <TabsTrigger value="products"><Package className="mr-1.5 h-4 w-4" />Products</TabsTrigger>
                <TabsTrigger value="categories"><Tag className="mr-1.5 h-4 w-4" />Categories</TabsTrigger>
                <TabsTrigger value="sheet"><FileSpreadsheet className="mr-1.5 h-4 w-4" />Google Sheets</TabsTrigger>
                <TabsTrigger value="scrape"><Globe className="mr-1.5 h-4 w-4" />Scrape URL</TabsTrigger>
                <TabsTrigger value="api"><Link2 className="mr-1.5 h-4 w-4" />REST API</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-4"><ProductsPanel /></TabsContent>
              <TabsContent value="categories" className="mt-4"><CategoriesPanel /></TabsContent>
              <TabsContent value="sheet" className="mt-4"><GoogleSheetPanel /></TabsContent>
              <TabsContent value="scrape" className="mt-4"><ScrapeUrlPanel /></TabsContent>
              <TabsContent value="api" className="mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">REST endpoints</CardTitle></CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <p>All three import endpoints accept either <code>{`{ rows: [...] }`}</code> (parsed JSON) or <code>{`{ csv: "..." }`}</code> (raw CSV text). Both formats accept the same column names as the downloadable templates above.</p>
                    <pre className="overflow-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">{`# Categories
curl -X POST '${apiHint}/categories/import' \\
  -H 'Content-Type: application/json' \\
  -d '{"mode":"upsert","rows":[{"name":"Pain Relief","slug":"pain-relief","parentSlug":"medications"}]}'

# Products
curl -X POST '${apiHint}/products/import' \\
  -H 'Content-Type: application/json' \\
  -d '{"rows":[{"name":"Paracetamol","price":280,"categorySlug":"pain-relief"}]}'

# Google Sheet (server-side fetch, returns parsed rows)
curl -X POST '${apiHint}/google-sheet' \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0"}'`}</pre>
                    <p className="text-xs text-zinc-500">Each endpoint returns a JSON summary with <code>created</code>, <code>updated</code>, <code>failed</code> counts and a per-row reason list.</p>
                    <div className="border-t pt-4">
                      <p className="font-semibold text-zinc-800 text-sm mb-2">Scrape URL</p>
                      <p className="text-xs text-zinc-600 mb-2">POST one or more product page URLs. The server fetches each page, extracts data via JSON-LD / Open Graph / HTML fallback, and returns rows you can then push to products/import.</p>
                      <pre className="overflow-auto rounded-md bg-zinc-900 p-4 text-xs text-zinc-100">{`# Scrape one URL
curl -X POST '${apiHint}/scrape-url' \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com/product/paracetamol","categorySlug":"pain-relief"}'

# Scrape multiple URLs at once (max 20 per request)
curl -X POST '${apiHint}/scrape-url' \\
  -H 'Content-Type: application/json' \\
  -d '{"urls":["https://site1.com/prod/a","https://site2.com/prod/b"],"categorySlug":"vitamins"}'`}</pre>
                      <p className="mt-2 text-xs text-zinc-500">Response: <code>{`{ ok, results: [{ url, ok, product?, reason? }] }`}</code>. The <code>product</code> field is a flat row object ready for products/import. The <code>extractedVia</code> field tells you which strategy succeeded (<code>json-ld</code>, <code>open-graph</code>, or <code>html-fallback</code>).</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}

export default AdminBulkImport

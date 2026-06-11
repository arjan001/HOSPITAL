import { useMemo, useState } from "react"
import Papa from "papaparse"
import {
  Upload, Download, FileSpreadsheet, Tag, Package, Link2, Loader2,
  CheckCircle2, AlertTriangle,
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
import { adminAuthHeaders } from "@/lib/api-client"

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

async function downloadNestCsv(path: string, filename: string) {
  const res = await fetch(`${NEST_BASE}${path}`, {
    credentials: "include",
    headers: adminAuthHeaders(),
  })
  if (!res.ok) throw new Error(`Export failed (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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

  const exportCurrent = async () => {
    try {
      // Prefer the Nest API (source-of-truth) over the cmsStore snapshot.
      const res = await fetch(`${NEST_BASE}/categories/export`, {
        headers: adminAuthHeaders(),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "shaniid-rx-categories.csv"
        a.click()
        URL.revokeObjectURL(url)
        return
      }
    } catch { /* fall through to cmsStore fallback */ }
    // Fallback: build CSV from cmsStore snapshot when the API is unavailable.
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
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
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
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
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
        <Button
          variant="outline"
          onClick={() => {
            void downloadNestCsv("/products/export", "shaniid-rx-products.csv").catch((err) =>
              alert(err instanceof Error ? err.message : "Export failed"),
            )
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Export current products
        </Button>
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
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
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
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
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
                <TabsTrigger value="api"><Link2 className="mr-1.5 h-4 w-4" />REST API</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-4"><ProductsPanel /></TabsContent>
              <TabsContent value="categories" className="mt-4"><CategoriesPanel /></TabsContent>
              <TabsContent value="sheet" className="mt-4"><GoogleSheetPanel /></TabsContent>
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

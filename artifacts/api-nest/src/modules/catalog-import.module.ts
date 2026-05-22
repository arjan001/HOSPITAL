/**
 * Bulk catalogue import API.
 *
 * Exposes the same import surface the admin "Bulk Import" page uses, so
 * external scripts / Zapier / cron jobs can push products & categories
 * without a browser session.
 *
 *   POST /api/v2/admin/catalog/categories/import
 *   POST /api/v2/admin/catalog/products/import
 *   POST /api/v2/admin/catalog/google-sheet         (fetches + parses a
 *                                                    Google Sheets published-CSV
 *                                                    URL server-side to avoid
 *                                                    browser CORS)
 *
 * Categories are persisted into the cms key "categories" via the existing
 * AdminCmsController loopback (cmsStore is the single source of truth for
 * categories today). Products are forwarded to the legacy Express API
 * (`POST /api/admin/products`) because that's where the storefront still
 * reads from — when the products module ports to NestJS, swap the loopback
 * URL only.
 */

import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
} from "@nestjs/common"

/* ─────────────────────── shared CMS loopback ─────────────────────── */

const NEST_PORT = process.env.PORT || 8090
const NEST_BASE = `http://127.0.0.1:${NEST_PORT}/api/v2/admin/cms`
const LEGACY_PORT = process.env.LEGACY_API_PORT || 8080
const LEGACY_PRODUCTS = `http://127.0.0.1:${LEGACY_PORT}/api/admin/products`
const CALL_TIMEOUT_MS = 6_000

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms),
    ),
  ])
}

async function cmsGet<T>(key: string, fallback: T): Promise<T> {
  const res = await withTimeout(
    fetch(`${NEST_BASE}/${encodeURIComponent(key)}`),
    CALL_TIMEOUT_MS,
  )
  if (res.status === 404) return fallback
  if (!res.ok) {
    throw new HttpException(
      `cms read failed for ${key}: ${res.status}`,
      HttpStatus.BAD_GATEWAY,
    )
  }
  const body = (await res.json()) as { value: T }
  return body.value ?? fallback
}

async function cmsPut<T>(key: string, value: T): Promise<void> {
  const res = await withTimeout(
    fetch(`${NEST_BASE}/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }),
    CALL_TIMEOUT_MS,
  )
  if (!res.ok) {
    throw new HttpException(
      `cms write failed for ${key}: ${res.status}`,
      HttpStatus.BAD_GATEWAY,
    )
  }
}

/* ─────────────────────── helpers ─────────────────────── */

function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
}

/** Minimal CSV parser — RFC4180-ish (quotes, doubled-quote escape, CRLF). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let cell = ""
  let row: string[] = []
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, "")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ",") {
        row.push(cell)
        cell = ""
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && src[i + 1] === "\n") i++
        row.push(cell)
        cell = ""
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row)
        row = []
      } else cell += ch
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()))
    return obj
  })
}

function pickRows(body: ImportBody): Record<string, string>[] {
  if (Array.isArray(body.rows)) return body.rows
  if (typeof body.csv === "string" && body.csv.trim()) return parseCsv(body.csv)
  throw new HttpException(
    "Provide either `rows: object[]` or `csv: string` in the request body",
    HttpStatus.BAD_REQUEST,
  )
}

type ImportBody = { rows?: Record<string, string>[]; csv?: string; mode?: "upsert" | "replace" }

/* ─────────────────────── Categories ─────────────────────── */

type CmsCategory = {
  id: string
  name: string
  slug: string
  parentId: string | null
  icon: string
  image: string
  banner: string
  isActive: boolean
}

const CATEGORY_REQUIRED = ["name"] as const

@Injectable()
class CatalogImportService {
  async importCategories(body: ImportBody) {
    const rows = pickRows(body)
    const mode = body.mode === "replace" ? "replace" : "upsert"

    const existing = mode === "replace" ? [] : await cmsGet<CmsCategory[]>("categories", [])
    const bySlug = new Map(existing.map((c) => [c.slug, c]))
    const byId = new Map(existing.map((c) => [c.id, c]))

    const created: CmsCategory[] = []
    const updated: CmsCategory[] = []
    const errors: { row: number; reason: string }[] = []

    rows.forEach((row, idx) => {
      const name = row.name || row.Name
      if (!name) {
        errors.push({ row: idx + 2, reason: "missing `name`" })
        return
      }
      for (const req of CATEGORY_REQUIRED) {
        if (!row[req] && !row[req[0].toUpperCase() + req.slice(1)]) {
          errors.push({ row: idx + 2, reason: `missing \`${req}\`` })
          return
        }
      }

      const slug = (row.slug || row.Slug || slugify(name)).trim()
      const parentSlug = (row.parentSlug || row.ParentSlug || row.parent_slug || "").trim()
      const parentId = parentSlug ? bySlug.get(parentSlug)?.id ?? null : null

      const existingMatch = byId.get(row.id || "") ?? bySlug.get(slug)
      const isActive = !["no", "false", "0"].includes(
        (row.isActive || row.IsActive || "yes").toLowerCase(),
      )

      const record: CmsCategory = {
        id: existingMatch?.id ?? row.id ?? newId("cat"),
        name,
        slug,
        parentId,
        icon: row.icon || row.Icon || existingMatch?.icon || "",
        image: row.image || row.Image || existingMatch?.image || "",
        banner: row.banner || row.Banner || existingMatch?.banner || "",
        isActive,
      }

      if (existingMatch) {
        const i = existing.findIndex((c) => c.id === existingMatch.id)
        if (i >= 0) existing[i] = record
        updated.push(record)
      } else {
        existing.push(record)
        created.push(record)
      }
      bySlug.set(record.slug, record)
      byId.set(record.id, record)
    })

    await cmsPut("categories", existing)

    return {
      ok: errors.length === 0,
      mode,
      total: rows.length,
      created: created.length,
      updated: updated.length,
      errors,
    }
  }

  async importProducts(body: ImportBody) {
    const rows = pickRows(body)
    const results: { row: number; ok: boolean; id?: string; reason?: string }[] = []

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      const name = row.name || row.Name
      const price = Number(row.price || row.Price)
      const categorySlug = row.categorySlug || row["Category Slug"] || ""
      if (!name) {
        results.push({ row: idx + 2, ok: false, reason: "missing `name`" })
        continue
      }
      if (!Number.isFinite(price) || price < 0) {
        results.push({ row: idx + 2, ok: false, reason: "invalid `price`" })
        continue
      }
      if (!categorySlug) {
        results.push({ row: idx + 2, ok: false, reason: "missing `categorySlug`" })
        continue
      }

      const slug = (row.slug || row.Slug || slugify(name)).trim()
      const payload = {
        name,
        slug,
        price,
        originalPrice: row.originalPrice || row["Original Price"]
          ? Number(row.originalPrice || row["Original Price"])
          : null,
        description: row.description || row.Description || "",
        categorySlug,
        images: (row.images || row["Image URLs (pipe separated)"] || "")
          .split(/[|\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        tags: (row.tags || row["Tags (comma separated)"] || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isNew: ["yes", "true", "1"].includes(
          (row.isNew || row["Is New (yes/no)"] || "").toLowerCase(),
        ),
        isOnOffer: ["yes", "true", "1"].includes(
          (row.isOnOffer || row["Is On Offer (yes/no)"] || "").toLowerCase(),
        ),
        offerPercentage: Number(row.offerPercentage || row["Offer %"] || 0) || 0,
        inStock: !["no", "false", "0"].includes(
          (row.inStock || row["In Stock (yes/no)"] || "yes").toLowerCase(),
        ),
        stockCount: row.stockCount ? Number(row.stockCount) : undefined,
      }

      try {
        const res = await withTimeout(
          fetch(LEGACY_PRODUCTS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }),
          CALL_TIMEOUT_MS,
        )
        if (!res.ok) {
          results.push({ row: idx + 2, ok: false, reason: `legacy api ${res.status}` })
        } else {
          const json = (await res.json().catch(() => ({}))) as { id?: string }
          results.push({ row: idx + 2, ok: true, id: json.id })
        }
      } catch (err) {
        results.push({
          row: idx + 2,
          ok: false,
          reason: err instanceof Error ? err.message : "unknown",
        })
      }
    }

    return {
      ok: results.every((r) => r.ok),
      total: rows.length,
      created: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }
  }

  async fetchGoogleSheet(body: { url?: string }) {
    const raw = (body.url || "").trim()
    if (!raw) {
      throw new HttpException("`url` is required", HttpStatus.BAD_REQUEST)
    }
    let url = raw
    // Convert /edit URLs to the published-CSV form when possible.
    const editMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
    if (editMatch && !url.includes("output=csv")) {
      const gidMatch = url.match(/[#&?]gid=(\d+)/)
      const gid = gidMatch ? gidMatch[1] : "0"
      url = `https://docs.google.com/spreadsheets/d/${editMatch[1]}/export?format=csv&gid=${gid}`
    }

    let res: Response
    try {
      res = await withTimeout(fetch(url, { redirect: "follow" }), CALL_TIMEOUT_MS * 2)
    } catch (err) {
      throw new HttpException(
        `failed to fetch sheet: ${err instanceof Error ? err.message : "unknown"}`,
        HttpStatus.BAD_GATEWAY,
      )
    }
    if (!res.ok) {
      throw new HttpException(
        `sheet fetch returned ${res.status}. Make sure the sheet is shared as "Anyone with the link" or published to the web.`,
        HttpStatus.BAD_GATEWAY,
      )
    }
    const text = await res.text()
    const rows = parseCsv(text)
    return { ok: true, total: rows.length, rows, csv: text }
  }
}

/* ─────────────────────── Controllers ─────────────────────── */

@Controller("admin/catalog")
class CatalogImportController {
  constructor(@Inject(CatalogImportService) private readonly svc: CatalogImportService) {}

  @Post("categories/import")
  importCategories(@Body() body: ImportBody) {
    return this.svc.importCategories(body || {})
  }

  @Post("products/import")
  importProducts(@Body() body: ImportBody) {
    return this.svc.importProducts(body || {})
  }

  @Post("google-sheet")
  fetchGoogleSheet(@Body() body: { url?: string }) {
    return this.svc.fetchGoogleSheet(body || {})
  }
}

@Module({
  controllers: [CatalogImportController],
  providers: [CatalogImportService],
  exports: [CatalogImportService],
})
export class CatalogImportModule {}

/**
 * Web scraper module for catalog ingestion.
 *
 * Fetches an arbitrary product page server-side (avoids browser CORS), extracts
 * product data, and returns rows that are directly compatible with the existing
 * catalog import pipeline (`POST /api/v2/admin/catalog/products/import`).
 *
 * Endpoint:
 *   POST /api/v2/admin/catalog/scrape-url
 *     body: { url?: string; urls?: string[]; categorySlug?: string }
 *     returns: { ok, results: [{ url, ok, product?, reason? }] }
 *
 * Extraction strategy (applied in priority order):
 *   1. JSON-LD structured data  — schema.org/Product blocks embedded in <script>
 *   2. Open Graph / Product meta tags — og:title, og:image, og:price:amount, etc.
 *   3. Basic HTML fallback — <h1> for name, <title>, <meta name="description">, price regex
 *
 * The scraper does NOT modify any data; it only extracts and returns rows. The
 * caller is responsible for importing the rows via the products/import endpoint.
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
  UseGuards,
} from "@nestjs/common"
import { AdminGuard } from "../common/admin-guard"

const SCRAPE_TIMEOUT_MS = 10_000
const MAX_URLS_PER_REQUEST = 20

/* ─────────────────────── timeout wrapper ─────────────────────── */

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Present as a generic browser so most sites return their normal HTML.
        // Some sites block obvious bot user-agents and return empty pages.
        "User-Agent":
          "Mozilla/5.0 (compatible; ShaniidRX-CatalogBot/1.0; +https://shaniid.com)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

/* ─────────────────────── SSRF guard ─────────────────────── */

/**
 * Block hostnames that resolve to internal infrastructure so the scraper can't
 * be used to reach loopback, private ranges, link-local, or the cloud metadata
 * endpoint (169.254.169.254). DNS rebinding is out of scope for this literal
 * check, but it stops the obvious SSRF vectors.
 */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return true
  }
  // IPv6 loopback / unspecified / unique-local / link-local.
  if (host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true
  }
  // IPv4 literal checks.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])]
    if (a === 10) return true                       // 10.0.0.0/8
    if (a === 127) return true                      // loopback
    if (a === 0) return true                        // 0.0.0.0/8
    if (a === 169 && b === 254) return true         // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true         // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
  }
  return false
}

/* ─────────────────────── HTML extraction helpers ─────────────────────── */

/**
 * Extract a <meta> tag's content attribute by property or name.
 * Handles both `property="..."` (Open Graph) and `name="..."` (standard meta).
 */
function extractMeta(html: string, attr: "property" | "name", value: string): string {
  const patterns = [
    // property/name before content
    new RegExp(`<meta[^>]+${attr}=["']${escapeRe(value)}["'][^>]+content=["']([^"']+)["']`, "i"),
    // content before property/name
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${escapeRe(value)}["']`, "i"),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeHtmlEntities(m[1].trim())
  }
  return ""
}

/** Decode common HTML entities so titles/descriptions are readable. */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

/** Escape special regex characters in a string used inside a RegExp constructor. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Pull the first <h1> text content from HTML. */
function extractH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (!m) return ""
  // Strip any inner tags (e.g. <span>, <a>) to get plain text.
  return decodeHtmlEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
}

/** Pull the <title> tag text from HTML. */
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!m) return ""
  return decodeHtmlEntities(m[1].replace(/\s+/g, " ").trim())
}

/**
 * Attempt to find a price string in the HTML using common patterns.
 * Returns an empty string when nothing credible is found.
 */
function extractPriceGuess(html: string): string {
  // Many e-commerce themes put prices in itemprop="price", data-price,
  // or JSON content="NNN.NN" on a meta tag.
  const patterns = [
    /itemprop=["']price["'][^>]*content=["']([0-9]+(?:\.[0-9]{1,2})?)["']/i,
    /<meta[^>]+content=["']([0-9]+(?:\.[0-9]{1,2})?)["'][^>]+itemprop=["']price["']/i,
    /data-price=["']([0-9]+(?:\.[0-9]{1,2})?)["']/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return ""
}

/* ─────────────────────── JSON-LD extraction ─────────────────────── */

type JsonLdProduct = {
  "@type": string | string[]
  name?: string
  description?: string
  image?: string | string[] | { url?: string }[]
  offers?:
    | { price?: string | number; priceCurrency?: string; availability?: string }
    | Array<{ price?: string | number; priceCurrency?: string }>
  sku?: string
  brand?: { name?: string } | string
}

/** Return true when the JSON-LD @type includes "Product". */
function isProduct(obj: Record<string, unknown>): obj is JsonLdProduct {
  const t = obj["@type"]
  if (Array.isArray(t)) return t.some((v) => String(v).endsWith("Product"))
  return typeof t === "string" && t.endsWith("Product")
}

/**
 * Walk a parsed JSON-LD graph and collect all Product nodes.
 * Handles both a single object and an `@graph` array.
 */
function collectProducts(data: unknown): JsonLdProduct[] {
  if (!data || typeof data !== "object") return []
  const obj = data as Record<string, unknown>
  if (Array.isArray(obj)) {
    return (obj as unknown[]).flatMap((item) => collectProducts(item))
  }
  if ("@graph" in obj && Array.isArray(obj["@graph"])) {
    return (obj["@graph"] as unknown[]).flatMap((item) => collectProducts(item))
  }
  if (isProduct(obj)) return [obj]
  return []
}

/** Map a JSON-LD Product node to a flat import row. */
function mapJsonLdProduct(
  p: JsonLdProduct,
  sourceUrl: string,
  categorySlug: string,
): ProductRow {
  const name = (p.name ?? "").trim()

  // Offers can be a single object or an array; normalise to the first offer.
  const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers
  const price = offer?.price != null ? String(offer.price) : ""

  // Image can be a plain URL string, an array of URLs, or an array of ImageObject.
  let imageUrl = ""
  if (typeof p.image === "string") {
    imageUrl = p.image
  } else if (Array.isArray(p.image)) {
    const first = p.image[0]
    imageUrl = typeof first === "string" ? first : (first?.url ?? "")
  }

  const description = (p.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

  return {
    name,
    price,
    description,
    images: imageUrl,
    categorySlug,
    source: sourceUrl,
    extractedVia: "json-ld",
  }
}

/* ─────────────────────── per-URL extraction entry point ─────────────────────── */

type ProductRow = {
  name: string
  price: string
  description: string
  images: string
  categorySlug: string
  source: string
  extractedVia: "json-ld" | "open-graph" | "html-fallback"
}

/**
 * Fetch one URL and attempt to extract product data.
 * Returns a ProductRow on success or throws with a reason string on failure.
 */
async function scrapeOne(url: string, categorySlug: string): Promise<ProductRow> {
  let res: Response
  try {
    res = await fetchWithTimeout(url, SCRAPE_TIMEOUT_MS)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : "fetch failed")
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} — page returned an error status`)
  }

  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("html")) {
    throw new Error(`unexpected content-type: ${contentType} — only HTML pages are supported`)
  }

  const html = await res.text()

  // Strategy 1: JSON-LD structured data
  const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(jsonLdPattern)) {
    try {
      const data: unknown = JSON.parse(match[1])
      const products = collectProducts(data)
      if (products.length > 0 && (products[0].name ?? "").trim()) {
        return mapJsonLdProduct(products[0], url, categorySlug)
      }
    } catch {
      // JSON parse failure — move on to next <script> block
    }
  }

  // Strategy 2: Open Graph / product meta tags
  const ogTitle =
    extractMeta(html, "property", "og:title") ||
    extractMeta(html, "property", "product:title")
  const ogDescription =
    extractMeta(html, "property", "og:description") ||
    extractMeta(html, "name", "description")
  const ogImage =
    extractMeta(html, "property", "og:image") ||
    extractMeta(html, "property", "og:image:url")
  const ogPrice =
    extractMeta(html, "property", "og:price:amount") ||
    extractMeta(html, "property", "product:price:amount")

  if (ogTitle) {
    return {
      name: ogTitle,
      price: ogPrice,
      description: ogDescription,
      images: ogImage,
      categorySlug,
      source: url,
      extractedVia: "open-graph",
    }
  }

  // Strategy 3: Basic HTML fallback — <h1>, <title>, <meta name="description">, price hints
  const h1 = extractH1(html)
  const title = extractTitle(html)
  const description = extractMeta(html, "name", "description")
  const price = extractPriceGuess(html)
  const name = h1 || title

  if (!name) {
    throw new Error("could not extract a product name — the page may require JavaScript rendering")
  }

  return {
    name,
    price,
    description,
    images: "",
    categorySlug,
    source: url,
    extractedVia: "html-fallback",
  }
}

/* ─────────────────────── service ─────────────────────── */

type ScrapeBody = {
  url?: string
  urls?: string[]
  categorySlug?: string
}

type ScrapeResult = {
  url: string
  ok: boolean
  product?: ProductRow
  reason?: string
}

@Injectable()
class WebScraperService {
  /**
   * Scrape one or more product page URLs and return extracted product rows.
   *
   * Accepts either `url` (single) or `urls` (batch, max 20). All URLs are
   * fetched in parallel. Each result indicates success/failure independently
   * so a single bad URL does not abort the whole batch.
   */
  async scrapeUrls(body: ScrapeBody): Promise<{ ok: boolean; results: ScrapeResult[] }> {
    const categorySlug = (body.categorySlug ?? "").trim()

    // Normalise to an array of unique, non-empty URL strings.
    const raw: string[] = body.urls?.length
      ? body.urls
      : body.url
        ? [body.url]
        : []

    const urls = [...new Set(raw.map((u) => u.trim()).filter(Boolean))]

    if (urls.length === 0) {
      throw new HttpException(
        "Provide `url` (single) or `urls` (array) in the request body",
        HttpStatus.BAD_REQUEST,
      )
    }
    if (urls.length > MAX_URLS_PER_REQUEST) {
      throw new HttpException(
        `Maximum ${MAX_URLS_PER_REQUEST} URLs per request`,
        HttpStatus.BAD_REQUEST,
      )
    }

    // Validate URLs before fetching.
    for (const u of urls) {
      let parsed: URL
      try {
        parsed = new URL(u)
      } catch {
        throw new HttpException(`Malformed URL: "${u}"`, HttpStatus.BAD_REQUEST)
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new HttpException(
          `Invalid URL "${u}" — only http/https is supported`,
          HttpStatus.BAD_REQUEST,
        )
      }
      // SSRF guard: block requests to internal/loopback/link-local addresses
      // and the cloud metadata endpoint so an admin (or a compromised admin
      // token) can't pivot the server into the internal network.
      if (isBlockedHost(parsed.hostname)) {
        throw new HttpException(
          `Refusing to fetch internal address "${parsed.hostname}"`,
          HttpStatus.BAD_REQUEST,
        )
      }
    }

    // Fetch all URLs in parallel.
    const results: ScrapeResult[] = await Promise.all(
      urls.map(async (url) => {
        try {
          const product = await scrapeOne(url, categorySlug)
          return { url, ok: true, product }
        } catch (err) {
          return {
            url,
            ok: false,
            reason: err instanceof Error ? err.message : "unknown error",
          }
        }
      }),
    )

    const allOk = results.every((r) => r.ok)
    return { ok: allOk, results }
  }
}

/* ─────────────────────── controller ─────────────────────── */

@UseGuards(AdminGuard)
@Controller("admin/catalog")
class WebScraperController {
  constructor(@Inject(WebScraperService) private readonly svc: WebScraperService) {}

  /**
   * POST /api/v2/admin/catalog/scrape-url
   *
   * Body: { url?: string; urls?: string[]; categorySlug?: string }
   *
   * Returns extracted product rows. To actually import them, POST the
   * `results[].product` objects to `/api/v2/admin/catalog/products/import`
   * as `{ rows: [...] }`.
   */
  @Post("scrape-url")
  scrapeUrl(@Body() body: ScrapeBody) {
    return this.svc.scrapeUrls(body ?? {})
  }
}

/* ─────────────────────── module ─────────────────────── */

@Module({
  controllers: [WebScraperController],
  providers: [WebScraperService],
})
export class WebScraperModule {}

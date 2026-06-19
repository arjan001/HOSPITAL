#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 * Fetches products + blogs from api-nest when available; falls back to static pages only.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const OUT = path.join(ROOT, "public", "sitemap.xml")

const SITE = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://shaniidrx.co.ke").replace(/\/+$/, "")
const API = (process.env.SITEMAP_API_URL || process.env.API_URL || "http://127.0.0.1:8090").replace(/\/+$/, "")

const STATIC = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/shop", changefreq: "daily", priority: "0.9" },
  { loc: "/services", changefreq: "weekly", priority: "0.8" },
  { loc: "/care-packs", changefreq: "weekly", priority: "0.8" },
  { loc: "/speak-to-a-doctor", changefreq: "monthly", priority: "0.9" },
  { loc: "/track-order", changefreq: "monthly", priority: "0.6" },
  { loc: "/delivery", changefreq: "monthly", priority: "0.7" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.7" },
  { loc: "/faq", changefreq: "monthly", priority: "0.8" },
  { loc: "/blogs", changefreq: "weekly", priority: "0.7" },
  { loc: "/careers", changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy-policy", changefreq: "yearly", priority: "0.4" },
  { loc: "/terms-of-service", changefreq: "yearly", priority: "0.4" },
  { loc: "/payments-policy", changefreq: "yearly", priority: "0.4" },
  { loc: "/refund-policy", changefreq: "yearly", priority: "0.4" },
]

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildXml(urls) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    "",
  ]
  for (const u of urls) {
    const loc = u.loc.startsWith("http") ? u.loc : `${SITE}${u.loc.startsWith("/") ? "" : "/"}${u.loc}`
    lines.push("  <url>")
    lines.push(`    <loc>${esc(loc)}</loc>`)
    if (u.lastmod) lines.push(`    <lastmod>${esc(u.lastmod)}</lastmod>`)
    if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`)
    if (u.priority) lines.push(`    <priority>${u.priority}</priority>`)
    if (u.loc === "/") {
      lines.push(`    <xhtml:link rel="alternate" hreflang="en-KE" href="${esc(SITE)}/" />`)
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(SITE)}/" />`)
    }
    lines.push("  </url>")
  }
  lines.push("</urlset>", "")
  return lines.join("\n")
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

async function main() {
  let dynamic = []

  try {
    const [products, blogData] = await Promise.all([
      fetchJson(`${API}/api/v2/products`),
      fetchJson(`${API}/api/v2/blogs`),
    ])
    const productUrls = (Array.isArray(products) ? products : [])
      .filter((p) => p?.slug)
      .map((p) => ({
        loc: `/product/${p.slug}`,
        changefreq: "weekly",
        priority: "0.8",
        lastmod: (p.createdAt || "").slice(0, 10) || undefined,
      }))
    const blogUrls = (blogData?.posts ?? [])
      .filter((p) => p?.slug)
      .map((p) => ({
        loc: `/blogs/${p.slug}`,
        changefreq: "monthly",
        priority: "0.6",
        lastmod: (p.published_at || "").slice(0, 10) || undefined,
      }))
    dynamic = [...productUrls, ...blogUrls]
    console.log(`[sitemap] ${productUrls.length} products, ${blogUrls.length} blog posts from ${API}`)
  } catch (err) {
    console.warn(`[sitemap] API fetch skipped (${err instanceof Error ? err.message : err}) — static pages only`)
  }

  const xml = buildXml([...STATIC, ...dynamic])
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, xml, "utf8")
  console.log(`[sitemap] Wrote ${STATIC.length + dynamic.length} URLs → ${OUT}`)
}

main().catch((err) => {
  console.error("[sitemap] Failed:", err)
  process.exit(1)
})

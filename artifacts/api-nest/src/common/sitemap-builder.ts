/**
 * Shared sitemap XML builder for Shaniid RX storefront.
 * Used by the public SEO API and the her-kingdom build script (via HTTP).
 */

export const SITEMAP_SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || "https://shaniidrx.co.ke").replace(
  /\/+$/,
  "",
)

export type SitemapUrl = {
  loc: string
  changefreq?: string
  priority?: string
  lastmod?: string
}

export const STATIC_SITEMAP_PAGES: SitemapUrl[] = [
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function buildSitemapXml(urls: SitemapUrl[], siteUrl = SITEMAP_SITE_URL): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    "",
  ]

  for (const u of urls) {
    const loc = u.loc.startsWith("http") ? u.loc : `${siteUrl}${u.loc.startsWith("/") ? "" : "/"}${u.loc}`
    lines.push("  <url>")
    lines.push(`    <loc>${escapeXml(loc)}</loc>`)
    if (u.lastmod) lines.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`)
    if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`)
    if (u.priority) lines.push(`    <priority>${u.priority}</priority>`)
    if (u.loc === "/") {
      lines.push(`    <xhtml:link rel="alternate" hreflang="en-KE" href="${escapeXml(siteUrl)}/" />`)
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(siteUrl)}/" />`)
    }
    lines.push("  </url>")
  }

  lines.push("</urlset>", "")
  return lines.join("\n")
}

export function productSitemapEntries(
  products: Array<{ slug: string; updatedAt?: string; createdAt?: string }>,
): SitemapUrl[] {
  return products
    .filter((p) => p.slug?.trim())
    .map((p) => ({
      loc: `/product/${p.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: (p.updatedAt || p.createdAt || "").slice(0, 10) || undefined,
    }))
}

export function blogSitemapEntries(
  posts: Array<{ slug: string; published_at?: string; updated_at?: string }>,
): SitemapUrl[] {
  return posts
    .filter((p) => p.slug?.trim())
    .map((p) => ({
      loc: `/blogs/${p.slug}`,
      changefreq: "monthly",
      priority: "0.6",
      lastmod: (p.updated_at || p.published_at || "").slice(0, 10) || undefined,
    }))
}

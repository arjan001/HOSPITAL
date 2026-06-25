/**
 * Crawl-friendly HTML shell for storefront paths (Stage 5.2 SSR-lite).
 */
const SITE = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://shaniidrx.co.ke").replace(
  /\/+$/,
  "",
)

export type CrawlPageMeta = {
  path: string
  title: string
  description: string
  jsonLd?: Record<string, unknown>
}

export function buildCrawlHtml(meta: CrawlPageMeta): string {
  const canonical = `${SITE}${meta.path.startsWith("/") ? meta.path : `/${meta.path}`}`
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  const jsonLd = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : ""
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta name="robots" content="index,follow" />
  ${jsonLd}
</head>
<body>
  <main>
    <h1>${esc(meta.title)}</h1>
    <p>${esc(meta.description)}</p>
    <p><a href="${esc(canonical)}">View on Shaniid RX</a></p>
  </main>
</body>
</html>`
}

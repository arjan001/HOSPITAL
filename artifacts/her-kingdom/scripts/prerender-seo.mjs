#!/usr/bin/env node
/**
 * Post-build SEO prerender — injects route-specific <title>, meta, and JSON-LD
 * into copies of index.html for crawlers that do not execute JavaScript.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, "..", "dist", "public")
const SITE = (process.env.VITE_SITE_URL || process.env.SITE_URL || "https://shaniidrx.co.ke").replace(/\/+$/, "")
const API = (process.env.SITEMAP_API_URL || process.env.API_URL || "http://127.0.0.1:8090").replace(/\/+$/, "")
const OG = `${SITE}/og-default.jpg`

const STATIC_ROUTES = [
  {
    path: "/",
    title: "Shaniid RX — Trusted Online Pharmacy in Kenya | Genuine Medicine, Delivered",
    description:
      "Shaniid RX is Kenya's trusted online pharmacy — order verified medicines, vitamins, baby care and medical devices with same-day Nairobi delivery.",
  },
  {
    path: "/shop",
    title: "Shop Medicines & Health Products | Shaniid RX",
    description: "Browse verified medicines, vitamins, devices and baby care — delivered across Kenya with the Shaniid RX trust seal.",
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions | Shaniid RX",
    description: "Answers about deliveries, prescriptions, payments and pharmacist care at Shaniid RX.",
  },
  {
    path: "/blogs",
    title: "Health Notes & Pharmacy Articles | Shaniid RX",
    description: "Evidence-led pharmacy writing and health notes from Kenya's trusted online pharmacy.",
  },
]

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function injectMeta(html, { title, description, canonical, jsonLd }) {
  let out = html
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`)
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${esc(description)}" />`,
  )
  out = out.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${esc(canonical)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${esc(title)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${esc(description)}" />`,
  )
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${esc(canonical)}" />`,
  )
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${esc(title)}" />`,
  )
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${esc(description)}" />`,
  )
  if (jsonLd) {
    const block = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`
    out = out.replace("</head>", `    ${block}\n  </head>`)
  }
  return out
}

function writePrerender(relPath, html) {
  const filePath = path.join(DIST, relPath.replace(/^\//, ""), "index.html")
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, html, "utf8")
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function main() {
  const indexPath = path.join(DIST, "index.html")
  if (!fs.existsSync(indexPath)) {
    console.warn("[prerender] dist/public/index.html missing — skip")
    return
  }
  const baseHtml = fs.readFileSync(indexPath, "utf8")

  for (const route of STATIC_ROUTES) {
    const canonical = `${SITE}${route.path === "/" ? "/" : route.path}`
    const html = injectMeta(baseHtml, {
      title: route.title,
      description: route.description,
      canonical,
    })
    if (route.path === "/") {
      fs.writeFileSync(indexPath, html, "utf8")
    } else {
      writePrerender(route.path, html)
    }
  }

  let productCount = 0
  let blogCount = 0

  try {
    const products = await fetchJson(`${API}/api/v2/products`)
    for (const p of Array.isArray(products) ? products : []) {
      if (!p?.slug || !p?.name) continue
      const canonical = `${SITE}/product/${p.slug}`
      const desc = (p.description || `Buy ${p.name} from Shaniid RX — verified pharmacy Kenya.`).slice(0, 160)
      const html = injectMeta(baseHtml, {
        title: `${p.name} | Shaniid RX`,
        description: desc,
        canonical,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: desc,
          url: canonical,
          image: p.images?.[0] ? (p.images[0].startsWith("http") ? p.images[0] : `${SITE}${p.images[0]}`) : OG,
          offers: {
            "@type": "Offer",
            price: String(p.price ?? ""),
            priceCurrency: "KES",
            availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        },
      })
      writePrerender(`/product/${p.slug}`, html)
      productCount++
    }
  } catch (err) {
    console.warn(`[prerender] products skipped: ${err instanceof Error ? err.message : err}`)
  }

  try {
    const { posts } = await fetchJson(`${API}/api/v2/blogs`)
    for (const post of posts ?? []) {
      if (!post?.slug || !post?.title) continue
      const canonical = `${SITE}/blogs/${post.slug}`
      const desc = (post.excerpt || post.title).slice(0, 160)
      const html = injectMeta(baseHtml, {
        title: `${post.title} | Shaniid RX`,
        description: desc,
        canonical,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: desc,
          url: canonical,
          datePublished: post.published_at,
          author: { "@type": "Organization", name: post.author || "Shaniid RX" },
        },
      })
      writePrerender(`/blogs/${post.slug}`, html)
      blogCount++
    }
  } catch (err) {
    console.warn(`[prerender] blogs skipped: ${err instanceof Error ? err.message : err}`)
  }

  let categoryCount = 0
  try {
    const categories = await fetchJson(`${API}/api/v2/categories`)
    for (const cat of Array.isArray(categories) ? categories : []) {
      const slug = cat?.slug || cat?.id
      const name = cat?.name
      if (!slug || !name) continue
      const path = `/shop/category/${encodeURIComponent(String(slug))}`
      const canonical = `${SITE}/shop?category=${encodeURIComponent(String(slug))}`
      const desc = (cat.description || `Shop ${name} at Shaniid RX — verified pharmacy Kenya.`).slice(0, 160)
      const html = injectMeta(baseHtml, {
        title: `${name} | Shop | Shaniid RX`,
        description: desc,
        canonical,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name,
          description: desc,
          url: canonical,
        },
      })
      writePrerender(path, html)
      categoryCount++
    }
  } catch (err) {
    console.warn(`[prerender] categories skipped: ${err instanceof Error ? err.message : err}`)
  }

  console.log(
    `[prerender] ${STATIC_ROUTES.length} static routes, ${productCount} products, ${blogCount} blog posts, ${categoryCount} shop categories`,
  )
}

main().catch((err) => {
  console.error("[prerender] Failed:", err)
  process.exit(1)
})

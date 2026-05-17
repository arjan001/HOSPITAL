import { useEffect } from "react"
import { BRAND, TAGLINE as SITE_TAGLINE, SITE_URL as CONFIG_SITE_URL, GLOBAL_KEYWORDS, localBusinessJsonLd } from "@/lib/shaniidrx-seo"

/* ─────────────────────────────────────────────────────────────
   Shaniid RX — global SEO helper

   Source of truth: SHANIID RX Brand Brief.
   Voice = calm, clear, reassuring, professional, human (60/40
   authority/warmth). Promise = "If it comes through Shaniid RX,
   it is genuine, fairly priced, and delivered with integrity."

   Renders nothing. Imperatively syncs <title>, <meta>, <link
   rel="canonical">, OG / Twitter cards and an optional JSON-LD
   script. Restores values on unmount so client-side route
   transitions don't leak stale tags into other pages.

   Per-page keywords are automatically merged with GLOBAL_KEYWORDS
   (≈120 brand / category / geo / intent terms from shaniidrx-seo.ts).
────────────────────────────────────────────────────────────── */

const DEFAULT_IMAGE = "/og-default.jpg"
const DEFAULT_LOCALE = "en_KE"
const SITE_URL = typeof window !== "undefined" ? window.location.origin : CONFIG_SITE_URL

export { localBusinessJsonLd }

export type SeoProps = {
  /** Page-specific title fragment. Will be suffixed with " | Shaniid RX" if it doesn't already include the brand. ~50–60 chars total recommended. */
  title: string
  /** ~140–160 chars, written in the brand voice. Always end with a period. */
  description: string
  /** Comma-separated keywords; can also be passed as an array. */
  keywords?: string | string[]
  /** Path-only canonical (e.g. "/shop"). If omitted, uses current location.pathname. */
  canonicalPath?: string
  /** Absolute or path-relative image for OG/Twitter cards. */
  image?: string
  /** OG type. Defaults to "website"; product pages should pass "product". */
  type?: "website" | "article" | "product" | "profile"
  /** Optional JSON-LD object (or array) to inject as a <script type="application/ld+json">. */
  jsonLd?: object | object[]
  /** If true, prepends "noindex" — use for thank-you / verify pages. */
  noindex?: boolean
}

function upsertMeta(attr: "name" | "property", key: string, value: string | undefined) {
  if (!value) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement("meta")
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute("content", value)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", rel)
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

function upsertHreflang(lang: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${lang}"]`)
  if (!el) {
    el = document.createElement("link")
    el.setAttribute("rel", "alternate")
    el.setAttribute("hreflang", lang)
    document.head.appendChild(el)
  }
  el.setAttribute("href", href)
}

function setJsonLd(data: object | object[] | undefined, id = "seo-jsonld") {
  document.querySelectorAll(`script[data-seo-id="${id}"]`).forEach((n) => n.remove())
  if (!data) return
  const script = document.createElement("script")
  script.type = "application/ld+json"
  script.setAttribute("data-seo-id", id)
  script.text = JSON.stringify(data)
  document.head.appendChild(script)
}

export function Seo({
  title,
  description,
  keywords,
  canonicalPath,
  image,
  type = "website",
  jsonLd,
  noindex,
}: SeoProps) {
  useEffect(() => {
    const previousTitle = document.title
    const fullTitle = title.toLowerCase().includes(BRAND.toLowerCase())
      ? title
      : `${title} | ${BRAND}`

    document.title = fullTitle

    const path = canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/")
    const canonical = `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`
    const img = image
      ? image.startsWith("http")
        ? image
        : `${SITE_URL}${image.startsWith("/") ? "" : "/"}${image}`
      : `${SITE_URL}${DEFAULT_IMAGE}`

    // Merge per-page keywords with the global pharma keyword bank, dedupe.
    const pageKw = Array.isArray(keywords) ? keywords : keywords ? keywords.split(/\s*,\s*/) : []
    const mergedKw = Array.from(new Set([...pageKw, ...GLOBAL_KEYWORDS]))
      .filter(Boolean)
      .join(", ")

    upsertMeta("name", "description", description)
    upsertMeta("name", "keywords", mergedKw)
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow")
    upsertMeta("name", "googlebot", noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1")
    upsertMeta("name", "author", BRAND)
    upsertMeta("name", "publisher", BRAND)
    upsertMeta("name", "theme-color", "#3D0814")
    upsertMeta("name", "application-name", BRAND)
    upsertMeta("name", "apple-mobile-web-app-title", BRAND)
    upsertMeta("name", "apple-mobile-web-app-capable", "yes")
    upsertMeta("name", "apple-mobile-web-app-status-bar-style", "default")
    upsertMeta("name", "format-detection", "telephone=yes")

    // Geo targeting
    upsertMeta("name", "geo.region", "KE-30")
    upsertMeta("name", "geo.placename", "Nairobi")
    upsertMeta("name", "geo.position", "-1.2722;36.8579")
    upsertMeta("name", "ICBM", "-1.2722, 36.8579")

    upsertLink("canonical", canonical)
    // Hreflang — single locale today, but declare both en and en-KE so
    // Google can pick the right one per market.
    upsertHreflang("en-KE", canonical)
    upsertHreflang("en",    canonical)
    upsertHreflang("x-default", canonical)

    upsertMeta("property", "og:site_name", BRAND)
    upsertMeta("property", "og:title", fullTitle)
    upsertMeta("property", "og:description", description)
    upsertMeta("property", "og:type", type)
    upsertMeta("property", "og:url", canonical)
    upsertMeta("property", "og:image", img)
    upsertMeta("property", "og:image:secure_url", img)
    upsertMeta("property", "og:image:type", "image/jpeg")
    upsertMeta("property", "og:image:width", "1200")
    upsertMeta("property", "og:image:height", "630")
    upsertMeta("property", "og:image:alt", `${BRAND} — ${SITE_TAGLINE}`)
    upsertMeta("property", "og:locale", DEFAULT_LOCALE)
    upsertMeta("property", "og:locale:alternate", "en_US")

    upsertMeta("name", "twitter:card", "summary_large_image")
    upsertMeta("name", "twitter:site", "@ShaniidRX")
    upsertMeta("name", "twitter:creator", "@ShaniidRX")
    upsertMeta("name", "twitter:title", fullTitle)
    upsertMeta("name", "twitter:description", description)
    upsertMeta("name", "twitter:image", img)
    upsertMeta("name", "twitter:image:alt", `${BRAND} — ${SITE_TAGLINE}`)
    upsertMeta("name", "twitter:domain", new URL(SITE_URL).host)

    setJsonLd(jsonLd, `seo-jsonld-${path}`)

    return () => {
      document.title = previousTitle
      // keep meta tags — they'll be overwritten by the next page's <Seo/>; only clear the page-scoped JSON-LD
      document.querySelectorAll(`script[data-seo-id="seo-jsonld-${path}"]`).forEach((n) => n.remove())
    }
  }, [title, description, keywords, canonicalPath, image, type, jsonLd, noindex])

  return null
}

/* ─────────────────────────────────────────────────────────────
   Pre-built JSON-LD helpers
────────────────────────────────────────────────────────────── */

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Pharmacy",
  name: BRAND,
  legalName: "Shaniid Group of Technologies Ltd",
  url: SITE_URL,
  logo: `${SITE_URL}${DEFAULT_IMAGE}`,
  slogan: "Medicine You Can Trust. Delivered.",
  description:
    "Shaniid RX is the trust layer for medicine distribution in Africa — verified suppliers, transparent pricing, door-to-door delivery.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "The Real Noma Sana Unity Hub, Eastleigh",
    addressLocality: "Nairobi",
    postalCode: "00610",
    addressCountry: "KE",
  },
  areaServed: { "@type": "Country", name: "Kenya" },
  sameAs: [] as string[],
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  }
}

export function productJsonLd(p: {
  name: string
  description: string
  image?: string | string[]
  sku?: string
  brand?: string
  price?: number | string
  currency?: string
  inStock?: boolean
  url: string
  rating?: { value: number; count: number }
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.image,
    sku: p.sku,
    brand: { "@type": "Brand", name: p.brand || BRAND },
    url: `${SITE_URL}${p.url.startsWith("/") ? "" : "/"}${p.url}`,
  }
  if (p.price != null) {
    data.offers = {
      "@type": "Offer",
      price: String(p.price),
      priceCurrency: p.currency || "KES",
      availability: p.inStock === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: data.url,
    }
  }
  if (p.rating) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.rating.value,
      reviewCount: p.rating.count,
    }
  }
  return data
}

export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  }
}

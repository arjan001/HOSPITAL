// Programmatic SEO Keyword Engine — Her Kingdom (herkingdom.shop)
//
// Builds 10,000+ high-intent keyword variations from a small matrix of
// Modifiers × Products × Occasions × Locations. This is the single source of
// truth for the site-wide SEO keyword cloud, footer link cloud, sitemap
// cluster entries and JSON-LD keyword lists.

import { SITE_SEO } from "./seo-data"

// ──────────────────────────────────────────────────────────────────────────
// Matrix variables (5 × 15 × 10 × 15 ≈ 11,250 combinations before de-dup)
// ──────────────────────────────────────────────────────────────────────────

export const SEO_MODIFIERS = [
  "Best",
  "Luxury",
  "Lavish",
  "Minimalist",
  "Simple",
  "Affordable",
  "Premium",
  "Aesthetic",
  "Quality",
  "Personalized",
  "Curated",
  "Hypoallergenic",
  "Designer",
  "Trendy",
  "Classy",
] as const

export const SEO_PRODUCTS = [
  { key: "jewelry-sets", label: "Jewelry Sets", slug: "jewelry-sets" },
  { key: "necklaces", label: "Necklaces", slug: "necklaces" },
  { key: "mens-necklaces", label: "Men's Necklaces", slug: "mens-necklaces" },
  { key: "bracelets", label: "Bracelets", slug: "bracelets" },
  { key: "earrings", label: "Earrings", slug: "earrings" },
  { key: "womens-watches", label: "Women's Watches", slug: "womens-watches" },
  { key: "mens-watches", label: "Men's Watches", slug: "mens-watches" },
  { key: "sunglasses", label: "Sunglasses", slug: "sunglasses" },
  { key: "perfumes", label: "Perfumes", slug: "perfumes" },
  { key: "flowers", label: "Flowers", slug: "flowers" },
  { key: "handbags", label: "Handbags", slug: "handbags" },
  { key: "purses", label: "Purses", slug: "purses" },
  { key: "scarves", label: "Scarves", slug: "scarves" },
  { key: "shawls", label: "Shawls", slug: "shawls" },
  { key: "gift-packages", label: "Gift Packages", slug: "gift-packages" },
] as const

export const SEO_OCCASIONS = [
  { key: "mothers-day", label: "Mother's Day Gift" },
  { key: "valentines", label: "Valentine's Card" },
  { key: "anniversary", label: "Anniversary Gift" },
  { key: "birthday", label: "Birthday Surprise" },
  { key: "graduation", label: "Graduation Gift" },
  { key: "wedding", label: "Wedding Gift" },
  { key: "christmas", label: "Christmas Gift" },
  { key: "luxe-gift-package", label: "Luxe Gift Package" },
  { key: "love-romance", label: "Love & Romance Gift" },
  { key: "just-because", label: "Just Because Gift" },
] as const

export const SEO_LOCATIONS = [
  "Nairobi",
  "Nairobi CBD",
  "Westlands",
  "Kilimani",
  "Karen",
  "Kileleshwa",
  "Lavington",
  "Runda",
  "Kenya",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Diaspora",
] as const

// Intent tails that anchor queries to commerce behaviour
export const SEO_INTENTS = [
  "buy online",
  "same-day delivery",
  "shop",
  "order now",
  "delivery",
  "price",
  "best price",
  "gift delivery",
  "WhatsApp order",
  "M-Pesa",
] as const

// ──────────────────────────────────────────────────────────────────────────
// Combinatorial generator
// ──────────────────────────────────────────────────────────────────────────

export type GeneratedKeyword = {
  text: string
  product: (typeof SEO_PRODUCTS)[number]
  modifier: (typeof SEO_MODIFIERS)[number]
  occasion: (typeof SEO_OCCASIONS)[number]
  location: (typeof SEO_LOCATIONS)[number]
  slug: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

let cachedAll: GeneratedKeyword[] | null = null

/**
 * Generate the full keyword matrix. Deterministic, memoised per process so
 * the 11,000+ strings are built once and shared across SSR requests.
 */
export function generateAllKeywords(): GeneratedKeyword[] {
  if (cachedAll) return cachedAll
  const seen = new Set<string>()
  const out: GeneratedKeyword[] = []
  for (const product of SEO_PRODUCTS) {
    for (const modifier of SEO_MODIFIERS) {
      for (const occasion of SEO_OCCASIONS) {
        for (const location of SEO_LOCATIONS) {
          const text = `${modifier} ${product.label} for ${occasion.label} in ${location} | herkingdom.shop`
          if (seen.has(text)) continue
          seen.add(text)
          out.push({
            text,
            product,
            modifier,
            occasion,
            location,
            slug: slugify(`${modifier}-${product.slug}-${occasion.key}-${location}`),
          })
        }
      }
    }
  }
  cachedAll = out
  return out
}

/**
 * Short keyword strings suitable for the `<meta name="keywords">` tag.
 * Returns roughly `count` de-duplicated Modifier × Product × Location tags.
 */
export function buildKeywordPool(count: number = 200): string[] {
  const pool = new Set<string>()
  for (const product of SEO_PRODUCTS) {
    for (const location of SEO_LOCATIONS) {
      pool.add(`${product.label} ${location}`)
      pool.add(`buy ${product.label.toLowerCase()} ${location}`)
      for (const modifier of SEO_MODIFIERS) {
        pool.add(`${modifier} ${product.label} ${location}`)
        if (pool.size >= count) return [...pool]
      }
    }
  }
  return [...pool]
}

/**
 * Deterministic pseudo-random selector so every SSR render of the same path
 * yields the same set (good for crawler consistency) while different paths
 * surface different link clouds.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromString(value: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

/**
 * Pick `count` keywords from the matrix. When `seed` is provided (e.g. the
 * current page path), the selection is deterministic per seed — rotating
 * links remain stable within a URL but vary across URLs so Google sees
 * different anchor text on each page.
 */
export function pickKeywords(count: number, seed?: string): GeneratedKeyword[] {
  const all = generateAllKeywords()
  const rnd = mulberry32(seed ? seedFromString(seed) : 1)
  const indexes = new Set<number>()
  const target = Math.min(count, all.length)
  while (indexes.size < target) {
    indexes.add(Math.floor(rnd() * all.length))
  }
  return [...indexes].map((i) => all[i])
}

/**
 * Produce a link for a generated keyword. Because the site shop is a single
 * `/shop` page filtered by `?category=` + `?search=` + `?occasion=`, we
 * encode the combination into the filter URL so each rotating anchor text
 * points at a real, canonical, indexable URL.
 */
export function keywordToShopHref(k: GeneratedKeyword): string {
  const params = new URLSearchParams()
  params.set("category", k.product.slug)
  params.set("occasion", k.occasion.key)
  params.set("location", slugify(k.location))
  params.set("modifier", slugify(k.modifier))
  return `/shop?${params.toString()}`
}

/**
 * Structured metadata pattern from the strategy brief:
 *   "Buy [Modifier] [Product] in [Location] | [Occasion] Gifts | herkingdom.shop"
 */
export function buildMatrixTitle(
  modifier: string,
  product: string,
  location: string,
  occasion: string
): string {
  return `Buy ${modifier} ${product} in ${location} | ${occasion} Gifts | ${hostName()}`
}

export function buildMatrixDescription(
  product: string,
  location: string,
  occasion: string
): string {
  return `Shop ${product} at ${hostName()} — the best ${product.toLowerCase()} in ${location}. Perfect for ${occasion} with luxe packaging and same-day delivery. Order via WhatsApp ${SITE_SEO.phoneDisplay}.`
}

function hostName(): string {
  try {
    return new URL(SITE_SEO.siteUrl).host
  } catch {
    return "herkingdom.shop"
  }
}

/**
 * Flat list of short keyword phrases, capped at `limit`, suitable for a
 * page's `keywords` metadata field. Blends the seo-data.ts brand keywords
 * with the programmatic matrix pool.
 */
export function metaKeywordsFor(seed: string, limit: number = 60): string[] {
  const pool = buildKeywordPool(400)
  const rnd = mulberry32(seedFromString(seed))
  const picks = new Set<string>()
  while (picks.size < Math.min(limit, pool.length)) {
    picks.add(pool[Math.floor(rnd() * pool.length)])
  }
  return [...picks]
}

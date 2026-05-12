import { Suspense } from "react"
import { notFound } from "next/navigation"
import { ShopPage } from "@/components/store/shop-page"
import { CategoryIntro } from "@/components/store/category-intro"
import type { Metadata } from "next"
import { SITE_SEO, PAGE_SEO, PAGE_KEYWORDS, generateCategoryKeywords, buildCategorySeo } from "@/lib/seo-data"
import { getCategoryBySlug, getProductsByCategory, getSiteSettings } from "@/lib/supabase-data"
import {
  SEO_MODIFIERS,
  SEO_OCCASIONS,
  SEO_LOCATIONS,
  buildMatrixTitle,
  buildMatrixDescription,
  metaKeywordsFor,
} from "@/lib/seo-keyword-engine"

const siteUrl = SITE_SEO.siteUrl

type ShopSearchParams = {
  category?: string | string[]
  q?: string | string[]
  filter?: string | string[]
  occasion?: string | string[]
  location?: string | string[]
  modifier?: string | string[]
  tag?: string | string[]
}

type PageProps = {
  searchParams: Promise<ShopSearchParams>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

function matchOccasion(slug?: string) {
  if (!slug) return undefined
  return SEO_OCCASIONS.find((o) => o.key === slug || slug.includes(o.key))
}

function matchLocation(slug?: string) {
  if (!slug) return undefined
  const lower = slug.toLowerCase()
  return SEO_LOCATIONS.find((l) => l.toLowerCase().replace(/\s+/g, "-") === lower)
}

function matchModifier(slug?: string) {
  if (!slug) return undefined
  const lower = slug.toLowerCase()
  return SEO_MODIFIERS.find((m) => m.toLowerCase() === lower)
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const categorySlug = firstParam(params.category)
  const searchQuery = firstParam(params.q)
  const occasion = matchOccasion(firstParam(params.occasion))
  const location = matchLocation(firstParam(params.location))
  const modifier = matchModifier(firstParam(params.modifier))
  const tagSlug = firstParam(params.tag)

  if (categorySlug) {
    const category = await getCategoryBySlug(categorySlug).catch(() => null)

    if (!category) {
      // Unknown category slug → page will 404; tell crawlers not to index.
      return {
        title: `Category not found | Her Kingdom`,
        robots: { index: false, follow: false },
      }
    }

    if (category) {
      let { title, description } = buildCategorySeo(
        category.name,
        category.description,
        category.productCount
      )
      // When the matrix params are present, override with the programmatic
      // SEO title/description pattern from the strategy brief so every
      // Modifier × Category × Location × Occasion combination gets unique
      // metadata rather than sharing the generic category copy.
      if (modifier || location || occasion) {
        const resolvedModifier = modifier || "Best"
        const resolvedLocation = location || "Nairobi"
        const resolvedOccasion = occasion?.label || "Luxe Gifting"
        title = buildMatrixTitle(resolvedModifier, category.name, resolvedLocation, resolvedOccasion)
        description = buildMatrixDescription(category.name, resolvedLocation, resolvedOccasion)
      }

      const qs = new URLSearchParams()
      qs.set("category", category.slug)
      if (occasion) qs.set("occasion", occasion.key)
      if (location) qs.set("location", firstParam(params.location) as string)
      if (modifier) qs.set("modifier", firstParam(params.modifier) as string)
      const canonical = `${siteUrl}/shop?${qs.toString()}`
      const ogImage = category.image?.startsWith("http")
        ? category.image
        : `${siteUrl}${category.image || "/logo.png"}`

      return {
        title,
        description,
        alternates: { canonical },
        keywords: [
          ...generateCategoryKeywords(category.name),
          ...metaKeywordsFor(`shop:${category.slug}:${occasion?.key || ""}:${location || ""}:${modifier || ""}`, 40),
        ],
        authors: [{ name: "Her Kingdom", url: siteUrl }],
        creator: "Her Kingdom",
        openGraph: {
          title,
          description,
          url: canonical,
          type: "website",
          siteName: "Her Kingdom",
          locale: "en_KE",
          images: [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: `${category.name} at Her Kingdom Nairobi - herkingdomjewelry.shop Gifting`,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          site: "@herkingdom_jewelry",
          creator: "@herkingdom_jewelry",
          title,
          description,
          images: [{ url: ogImage, alt: `${category.name} at Her Kingdom` }],
        },
      }
    }
  }

  // Tag-filtered shop view — every /shop?tag={tag} URL gets a unique
  // title/description/canonical so product tags become indexable as their own
  // landing pages rather than collapsing into the generic shop page.
  if (tagSlug) {
    const normalized = tagSlug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    const label = normalized
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    const title = `${label} Jewelry & Accessories in Nairobi | Her Kingdom`
    const description = `Shop ${label.toLowerCase()} jewelry & accessories at Her Kingdom Nairobi. Hypoallergenic, curated pieces tagged #${label}. Same-day Nairobi delivery, nationwide courier and WhatsApp ordering on ${SITE_SEO.phoneDisplay}.`
    const canonical = `${siteUrl}/shop?tag=${normalized}`
    return {
      title,
      description,
      alternates: { canonical },
      keywords: [
        label,
        `${label} Nairobi`,
        `${label} Kenya`,
        `buy ${label.toLowerCase()} online`,
        `${label} Her Kingdom`,
        ...PAGE_KEYWORDS.shop,
        ...metaKeywordsFor(`shop:tag:${normalized}`, 30),
      ],
      authors: [{ name: "Her Kingdom", url: siteUrl }],
      creator: "Her Kingdom",
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName: "Her Kingdom",
        locale: "en_KE",
        images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: `${label} jewelry at Her Kingdom Nairobi` }],
      },
      twitter: {
        card: "summary_large_image",
        site: "@herkingdom_jewelry",
        creator: "@herkingdom_jewelry",
        title,
        description,
        images: [{ url: `${siteUrl}/logo.png`, alt: `${label} jewelry at Her Kingdom` }],
      },
    }
  }

  // No category but matrix params present — build an occasion/location landing
  // metadata so every /shop?occasion=... URL is also indexable.
  if (occasion || location || modifier) {
    const resolvedModifier = modifier || "Best"
    const resolvedLocation = location || "Nairobi"
    const resolvedOccasion = occasion?.label || "Luxe Gifting"
    const title = buildMatrixTitle(resolvedModifier, "Jewelry & Gifts", resolvedLocation, resolvedOccasion)
    const description = buildMatrixDescription("Jewelry & Gifts", resolvedLocation, resolvedOccasion)
    const qs = new URLSearchParams()
    if (occasion) qs.set("occasion", occasion.key)
    if (location) qs.set("location", firstParam(params.location) as string)
    if (modifier) qs.set("modifier", firstParam(params.modifier) as string)
    const canonical = `${siteUrl}/shop?${qs.toString()}`
    return {
      title,
      description,
      alternates: { canonical },
      keywords: [
        ...PAGE_KEYWORDS.shop,
        ...metaKeywordsFor(`shop:matrix:${occasion?.key || ""}:${location || ""}:${modifier || ""}`, 40),
      ],
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName: "Her Kingdom",
        locale: "en_KE",
        images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Shop" }],
      },
      twitter: {
        card: "summary_large_image",
        site: "@herkingdom_jewelry",
        creator: "@herkingdom_jewelry",
        title,
        description,
        images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom Shop" }],
      },
    }
  }

  if (searchQuery) {
    const q = searchQuery.trim().slice(0, 80)
    const title = `Search "${q}" | Her Kingdom Jewelry Nairobi`
    const description = `Results for "${q}" at Her Kingdom Nairobi. Browse curated necklaces, bracelets, earrings, watches & accessories delivered across Kenya.`
    const canonical = `${siteUrl}/shop`
    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: false, follow: true },
      keywords: PAGE_KEYWORDS.shop,
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        siteName: "Her Kingdom",
        locale: "en_KE",
        images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Shop" }],
      },
      twitter: {
        card: "summary_large_image",
        site: "@herkingdom_jewelry",
        creator: "@herkingdom_jewelry",
        title,
        description,
        images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom Shop" }],
      },
    }
  }

  return {
    title: PAGE_SEO.shop.title,
    description: PAGE_SEO.shop.description,
    alternates: { canonical: `${siteUrl}/shop` },
    keywords: PAGE_KEYWORDS.shop,
    authors: [{ name: "Her Kingdom", url: siteUrl }],
    creator: "Her Kingdom",
    openGraph: {
      title: PAGE_SEO.shop.title,
      description: PAGE_SEO.shop.description,
      url: `${siteUrl}/shop`,
      type: "website",
      siteName: "Her Kingdom",
      locale: "en_KE",
      images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom - Shop Jewelry & Accessories" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@herkingdom_jewelry",
      creator: "@herkingdom_jewelry",
      title: PAGE_SEO.shop.title,
      description: PAGE_SEO.shop.description,
      images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom Shop" }],
    },
  }
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const categorySlug = firstParam(params.category)
  const category = categorySlug ? await getCategoryBySlug(categorySlug).catch(() => null) : null

  // Unknown category → return a real 404 rather than serving a thin client
  // shell that Google flags as Soft 404.
  if (categorySlug && !category) {
    notFound()
  }

  // For known categories we pre-load the product list and render it
  // server-side so crawlers receive real content (heading, description,
  // product links, schema) instead of the client-only loading skeleton.
  const categoryProducts = category
    ? await getProductsByCategory(category.slug).catch(() => [])
    : []

  const siteSettings = category ? await getSiteSettings().catch(() => null) : null
  const onlyDigits = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "")
  const formatWhatsapp = (raw: unknown): string => {
    const d = onlyDigits(raw)
    if (!d) return ""
    if (d.length === 12 && d.startsWith("254")) return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
    if (d.length === 10 && d.startsWith("0")) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
    return String(raw ?? "").trim()
  }
  const categoryContactPhone = formatWhatsapp(
    (siteSettings as any)?.whatsapp_number ||
      (siteSettings as any)?.store_phone ||
      (siteSettings as any)?.footer_whatsapp,
  )

  const jsonLd = category
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${siteUrl}/shop?category=${category.slug}#collection`,
            url: `${siteUrl}/shop?category=${category.slug}`,
            name: `${category.name} | Her Kingdom Nairobi`,
            description:
              category.description ||
              `Shop ${category.name.toLowerCase()} at Her Kingdom Nairobi. Hypoallergenic, long-lasting jewelry delivered across Kenya.`,
            isPartOf: { "@id": `${siteUrl}#website` },
            about: {
              "@type": "Thing",
              name: category.name,
            },
            image: category.image?.startsWith("http")
              ? category.image
              : `${siteUrl}${category.image || "/logo.png"}`,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: siteUrl,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Shop",
                item: `${siteUrl}/shop`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: category.name,
                item: `${siteUrl}/shop?category=${category.slug}`,
              },
            ],
          },
        ],
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense>
        <ShopPage
          seoIntro={
            category ? (
              <CategoryIntro
                category={category}
                products={categoryProducts}
                siteUrl={siteUrl}
                contactPhone={categoryContactPhone}
              />
            ) : null
          }
        />
      </Suspense>
    </>
  )
}

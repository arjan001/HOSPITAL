import { Suspense } from "react"
import type { Metadata } from "next"
import { SearchPage } from "@/components/store/search-page"
import { SITE_SEO, PAGE_KEYWORDS } from "@/lib/seo-data"

const siteUrl = SITE_SEO.siteUrl

type SearchSearchParams = {
  q?: string | string[]
}

type PageProps = {
  searchParams: Promise<SearchSearchParams>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const q = firstParam(params.q)?.trim()

  if (q) {
    const truncated = q.slice(0, 80)
    const title = `Search "${truncated}" | Her Kingdom Jewelry Nairobi`
    const description = `Results for "${truncated}" at Her Kingdom Nairobi. Discover curated jewelry, accessories and similar items with fast delivery across Kenya.`
    return {
      title,
      description,
      alternates: { canonical: `${siteUrl}/search` },
      robots: { index: false, follow: true },
      keywords: PAGE_KEYWORDS.shop,
      openGraph: {
        title,
        description,
        url: `${siteUrl}/search`,
        type: "website",
        siteName: SITE_SEO.siteName,
        locale: "en_KE",
        images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Search" }],
      },
      twitter: {
        card: "summary",
        site: "@herkingdom_jewelry",
        creator: "@herkingdom_jewelry",
        title,
        description,
        images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom Search" }],
      },
    }
  }

  const title = "Search Jewelry & Accessories | Her Kingdom Nairobi"
  const description = "Search Her Kingdom's curated collection of necklaces, earrings, bracelets, watches and accessories. Find exactly what you're looking for with same-day Nairobi delivery."
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/search` },
    robots: { index: false, follow: true },
    keywords: PAGE_KEYWORDS.shop,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/search`,
      type: "website",
      siteName: SITE_SEO.siteName,
      locale: "en_KE",
      images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Search" }],
    },
    twitter: {
      card: "summary",
      site: "@herkingdom_jewelry",
      creator: "@herkingdom_jewelry",
      title,
      description,
      images: [{ url: `${siteUrl}/logo.png`, alt: "Her Kingdom Search" }],
    },
  }
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  )
}

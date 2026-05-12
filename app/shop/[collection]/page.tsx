import { CollectionPage } from "@/components/store/collection-page"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SITE_SEO, PAGE_SEO, PAGE_KEYWORDS } from "@/lib/seo-data"

const siteUrl = SITE_SEO.siteUrl
const VALID_COLLECTIONS = ["men", "women", "babyshop"] as const

const META: Record<string, { title: string; description: string; keywords: string[]; schema: Record<string, unknown> }> = {
  men: {
    title: PAGE_SEO.menCollection.title,
    description: PAGE_SEO.menCollection.description,
    keywords: PAGE_KEYWORDS.menCollection,
    schema: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Men's Jewelry & Accessories",
      description: "Shop men's necklaces, watches, sunglasses & accessories at Her Kingdom Nairobi",
      url: `${siteUrl}/shop/men`,
      mainEntity: {
        "@type": "ItemCollection",
        name: "Men's Jewelry & Accessories",
        description: "Curated collection of men's jewelry and accessories from Her Kingdom",
        inLanguage: "en",
      },
    },
  },
  women: {
    title: PAGE_SEO.womenCollection.title,
    description: PAGE_SEO.womenCollection.description,
    keywords: PAGE_KEYWORDS.womenCollection,
    schema: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Women's Jewelry & Accessories",
      description: "Curated women's necklaces, bracelets, earrings, watches & accessories at Her Kingdom Nairobi",
      url: `${siteUrl}/shop/women`,
      mainEntity: {
        "@type": "ItemCollection",
        name: "Women's Jewelry & Accessories",
        description: "Curated collection of women's jewelry and accessories from Her Kingdom",
        inLanguage: "en",
      },
    },
  },
  babyshop: {
    title: PAGE_SEO.babyShop.title,
    description: PAGE_SEO.babyShop.description,
    keywords: PAGE_KEYWORDS.babyShop,
    schema: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Gift Packages & Flowers",
      description: "Curated gift packages, flowers & accessories at Her Kingdom Nairobi",
      url: `${siteUrl}/shop/babyshop`,
      mainEntity: {
        "@type": "ItemCollection",
        name: "Gift Packages & Flowers",
        description: "Curated gift packages and flowers from Her Kingdom",
        inLanguage: "en",
      },
    },
  },
}

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }): Promise<Metadata> {
  const { collection } = await params
  const meta = META[collection]
  if (!meta) return { title: "Collection Not Found" }

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    authors: [{ name: "Her Kingdom", url: siteUrl }],
    creator: "Her Kingdom",
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${siteUrl}/shop/${collection}`,
      type: "website",
      siteName: "Her Kingdom",
      locale: "en_KE",
      images: [{ url: `${siteUrl}/logo.png`, width: 512, height: 512, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@herkingdom_jewelry",
      creator: "@herkingdom_jewelry",
      title: meta.title,
      description: meta.description,
      images: [{ url: `${siteUrl}/logo.png`, alt: meta.title }],
    },
    alternates: {
      canonical: `${siteUrl}/shop/${collection}`,
    },
  }
}

export default async function Page({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params
  if (!VALID_COLLECTIONS.includes(collection as typeof VALID_COLLECTIONS[number])) {
    notFound()
  }

  const meta = META[collection]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(meta.schema),
        }}
      />
      <CollectionPage collection={collection} />
    </>
  )
}

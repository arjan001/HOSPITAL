import { Metadata } from "next"
import { notFound } from "next/navigation"
import { BlogDetailPage } from "@/components/store/blog-detail-page"
import { SITE_SEO } from "@/lib/seo-data"

const siteUrl = SITE_SEO.siteUrl

type BlogFetched = {
  post: {
    id: string
    slug: string
    title: string
    excerpt: string | null
    cover_image: string | null
    author: string
    tags: string[]
    category: string | null
    read_time_minutes: number | null
    published_at: string
  }
}

async function fetchPost(slug: string): Promise<BlogFetched["post"] | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || siteUrl}/api/blogs/${slug}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as BlogFetched
    return data.post || null
  } catch {
    return null
  }
}

function absoluteUrl(url: string): string {
  if (!url) return `${siteUrl}/og-default.jpg`
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  if (url.startsWith("/")) return `${siteUrl}${url}`
  return `${siteUrl}/${url}`
}

// Social crawlers (Twitter/X, WhatsApp, Facebook) need a direct, absolute image URL
// with explicit dimensions in the OG tags. Relative paths or missing width/height
// cause the preview card to render without an image.
function ogImageUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || rawUrl.length === 0) return `${siteUrl}/og-default.jpg`
  return absoluteUrl(rawUrl)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchPost(slug)
  if (!post) return { title: "Story Not Found" }

  const title = `${post.title} | The Her Kingdom Journal`
  const description = post.excerpt || `${post.title} — a story from the Her Kingdom Journal.`
  const canonical = `${siteUrl}/blogs/${post.slug}`
  const image = ogImageUrl(post.cover_image)
  const usingFallback = !post.cover_image || post.cover_image.length === 0
  // Only declare width/height for our known fallback image. Blog cover images have
  // varying dimensions, and WhatsApp refuses to preview when declared dims differ from
  // the real image size.
  const ogImage = usingFallback
    ? {
        url: image,
        secureUrl: image,
        width: 1200,
        height: 630,
        alt: post.title,
        type: "image/jpeg",
      }
    : {
        url: image,
        secureUrl: image,
        alt: post.title,
        type: "image/jpeg",
      }

  return {
    title,
    description,
    keywords: [...(post.tags || []), "Her Kingdom", "Nairobi jewelry", "style journal"],
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      type: "article",
      siteName: "Her Kingdom",
      locale: "en_KE",
      publishedTime: post.published_at,
      authors: [post.author],
      tags: post.tags || [],
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      site: "@herkingdom_jewelry",
      creator: "@herkingdom_jewelry",
      title: post.title,
      description,
      images: [usingFallback
        ? { url: image, alt: post.title, width: 1200, height: 630 }
        : { url: image, alt: post.title }],
    },
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await fetchPost(slug)
  if (!post) notFound()

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ? [absoluteUrl(post.cover_image)] : [`${siteUrl}/og-default.jpg`],
    datePublished: post.published_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Her Kingdom",
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.png` },
    },
    mainEntityOfPage: `${siteUrl}/blogs/${post.slug}`,
    keywords: (post.tags || []).join(", "),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <BlogDetailPage slug={slug} />
    </>
  )
}

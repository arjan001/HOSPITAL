import type { MetadataRoute } from "next"
import { SITE_SEO } from "@/lib/seo-data"
import { createAdminClient } from "@/lib/supabase/admin"

export const revalidate = 3600

type ProductRow = { slug: string | null; updated_at: string | null; created_at: string | null }
type CategoryRow = { slug: string | null; updated_at: string | null; created_at: string | null; is_active: boolean | null }
type BlogRow = { slug: string | null; updated_at: string | null; published_at: string | null }

// Using the service-role admin client makes the sitemap reliable even when
// RLS policies on products/categories/blog_posts would otherwise hide rows
// from the anonymous Supabase client used in page routes. The sitemap runs
// server-side only, so the service key is never exposed to the browser.
function safeAdmin() {
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

async function fetchProducts(): Promise<ProductRow[]> {
  try {
    const supabase = safeAdmin()
    if (!supabase) return []
    const { data } = await supabase
      .from("products")
      .select("slug, updated_at, created_at")
      .not("slug", "is", null)
      .range(0, 9999)
    return (data as ProductRow[]) || []
  } catch {
    return []
  }
}

async function fetchCategories(): Promise<CategoryRow[]> {
  try {
    const supabase = safeAdmin()
    if (!supabase) return []
    const { data } = await supabase
      .from("categories")
      .select("slug, updated_at, created_at, is_active")
      .eq("is_active", true)
      .not("slug", "is", null)
      .range(0, 9999)
    return (data as CategoryRow[]) || []
  } catch {
    return []
  }
}

async function fetchBlogPosts(): Promise<BlogRow[]> {
  try {
    const supabase = safeAdmin()
    if (!supabase) return []
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .not("slug", "is", null)
      .range(0, 9999)
    return (data as BlogRow[]) || []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = SITE_SEO.siteUrl
  const now = new Date()

  // Clean path-style URLs only. Collection pages (`/shop/men` etc.) replace
  // the query-string category URLs Google tends to drop as duplicates of `/shop`.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/shop/women`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/shop/men`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/shop/babyshop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/blogs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/track-order`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/delivery`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/payments-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/refund-policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms-of-service`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]

  const [categories, products, blogs] = await Promise.all([
    fetchCategories(),
    fetchProducts(),
    fetchBlogPosts(),
  ])

  // Category query-string URLs kept with self-canonicals. Keeping them gives
  // crawlers an explicit signal that each category is a distinct landing page,
  // while the path-style collection pages above carry the primary indexing weight.
  const seenCategory = new Set<string>()
  const categoryPages: MetadataRoute.Sitemap = []
  for (const cat of categories) {
    if (!cat.slug || seenCategory.has(cat.slug)) continue
    seenCategory.add(cat.slug)
    const iso = cat.updated_at || cat.created_at
    categoryPages.push({
      url: `${siteUrl}/shop?category=${cat.slug}`,
      lastModified: iso ? new Date(iso) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  const seenProduct = new Set<string>()
  const productPages: MetadataRoute.Sitemap = []
  for (const p of products) {
    if (!p.slug || seenProduct.has(p.slug)) continue
    seenProduct.add(p.slug)
    const iso = p.updated_at || p.created_at
    productPages.push({
      url: `${siteUrl}/product/${p.slug}`,
      lastModified: iso ? new Date(iso) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  const seenBlog = new Set<string>()
  const blogPages: MetadataRoute.Sitemap = []
  for (const b of blogs) {
    if (!b.slug || seenBlog.has(b.slug)) continue
    seenBlog.add(b.slug)
    const iso = b.updated_at || b.published_at
    blogPages.push({
      url: `${siteUrl}/blogs/${b.slug}`,
      lastModified: iso ? new Date(iso) : now,
      changeFrequency: "monthly",
      priority: 0.6,
    })
  }

  return [...staticPages, ...categoryPages, ...productPages, ...blogPages]
}

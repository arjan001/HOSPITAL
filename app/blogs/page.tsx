import type { Metadata } from "next"
import { BlogsPage } from "@/components/store/blogs-page"
import { SITE_SEO } from "@/lib/seo-data"

const siteUrl = SITE_SEO.siteUrl
const TITLE = "The Journal | Style, Jewelry & Gifting Stories by Her Kingdom"
const DESCRIPTION =
  "Slow, considered reading from our editors — styling notes, gifting guides and the quiet rituals of well-curated jewelry. The Her Kingdom Journal, from Nairobi."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${siteUrl}/blogs` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl}/blogs`,
    type: "website",
    siteName: "Her Kingdom",
    locale: "en_KE",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function BlogsIndexPage() {
  return <BlogsPage />
}

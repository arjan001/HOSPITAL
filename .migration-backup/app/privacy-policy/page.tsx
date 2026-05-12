import type { Metadata } from "next"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { PAGE_SEO, SITE_SEO } from "@/lib/seo-data"
import { createAdminClient } from "@/lib/supabase/admin"
import { sanitizeHtml } from "@/lib/sanitize-html"

export const revalidate = 300

async function getPolicy() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("slug", "privacy-policy")
      .eq("is_published", true)
      .maybeSingle()
    if (error) {
      console.error("[privacy-policy] fetch error:", error.message)
      return null
    }
    return data
  } catch (err) {
    console.error("[privacy-policy] fetch exception:", err)
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPolicy()
  return {
    title: p?.meta_title || PAGE_SEO.privacyPolicy.title,
    description: p?.meta_description || PAGE_SEO.privacyPolicy.description,
    robots: { index: PAGE_SEO.privacyPolicy.noindex ? false : true, follow: true },
    alternates: { canonical: `${SITE_SEO.siteUrl}/privacy-policy` },
    keywords: p?.meta_keywords?.split(",").map((k: string) => k.trim()) || ["privacy policy", "data protection", "Her Kingdom", "Her Kingdom privacy", "jewelry store privacy Kenya"],
    authors: [{ name: SITE_SEO.siteName, url: SITE_SEO.siteUrl }],
    creator: SITE_SEO.siteName,
    openGraph: {
      title: p?.meta_title || PAGE_SEO.privacyPolicy.title,
      description: p?.meta_description || PAGE_SEO.privacyPolicy.description,
      url: `${SITE_SEO.siteUrl}/privacy-policy`,
      siteName: SITE_SEO.siteName,
      type: "website",
      locale: "en_KE",
    },
    twitter: {
      card: "summary",
      title: p?.meta_title || PAGE_SEO.privacyPolicy.title,
      description: p?.meta_description || PAGE_SEO.privacyPolicy.description,
      creator: `@${SITE_SEO.twitter}`,
    },
  }
}

export default async function PrivacyPolicyPage() {
  const policy = await getPolicy()
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 lg:py-16">
        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-balance">{policy?.title || "Privacy Policy"}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Last updated: {policy?.updated_at ? new Date(policy.updated_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" }) : "February 2026"}
        </p>
        <div
          className="mt-10 prose prose-sm max-w-none text-muted-foreground prose-headings:text-lg prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy?.content || "<p>Content not available.</p>") }}
        />
      </main>
      <Footer />
    </div>
  )
}


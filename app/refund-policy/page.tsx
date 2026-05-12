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
      .eq("slug", "refund-policy")
      .eq("is_published", true)
      .maybeSingle()
    if (error) {
      console.error("[refund-policy] fetch error:", error.message)
      return null
    }
    return data
  } catch (err) {
    console.error("[refund-policy] fetch exception:", err)
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await getPolicy()
  return {
    title: p?.meta_title || PAGE_SEO.refundPolicy.title,
    description: p?.meta_description || PAGE_SEO.refundPolicy.description,
    robots: { index: PAGE_SEO.refundPolicy.noindex ? false : true, follow: true },
    alternates: { canonical: `${SITE_SEO.siteUrl}/refund-policy` },
    keywords: p?.meta_keywords?.split(",").map((k: string) => k.trim()) || ["refund policy", "returns", "Her Kingdom", "Her Kingdom refund", "jewelry store refund Kenya"],
    authors: [{ name: SITE_SEO.siteName, url: SITE_SEO.siteUrl }],
    creator: SITE_SEO.siteName,
    openGraph: {
      title: p?.meta_title || PAGE_SEO.refundPolicy.title,
      description: p?.meta_description || PAGE_SEO.refundPolicy.description,
      url: `${SITE_SEO.siteUrl}/refund-policy`,
      siteName: SITE_SEO.siteName,
      type: "website",
      locale: "en_KE",
    },
    twitter: {
      card: "summary",
      title: p?.meta_title || PAGE_SEO.refundPolicy.title,
      description: p?.meta_description || PAGE_SEO.refundPolicy.description,
      creator: `@${SITE_SEO.twitter}`,
    },
  }
}

export default async function RefundPolicyPage() {
  const policy = await getPolicy()
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 lg:py-16">
        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-balance">{policy?.title || "Refund Policy"}</h1>
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

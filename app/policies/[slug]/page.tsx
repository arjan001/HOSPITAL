import { Metadata } from "next"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getSiteSettings } from "@/lib/supabase-data"
import { sanitizeHtml } from "@/lib/sanitize-html"

interface Policy {
  id: string
  slug: string
  title: string
  content: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  is_published: boolean
}

const VALID_SLUGS = ["terms-and-conditions", "privacy-policy", "refund-policy", "cookie-policy", "return-policy", "shipping-policy"]

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params

  if (!VALID_SLUGS.includes(slug)) return { title: "Not Found" }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/policies/${slug}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) return { title: "Not Found" }

    const policy: Policy = await res.json()

    return {
      title: `${policy.meta_title || policy.title} | Her Kingdom`,
      description: policy.meta_description || `Read our ${policy.title.toLowerCase()}`,
      keywords: policy.meta_keywords,
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/policies/${slug}`,
      },
      openGraph: {
        title: policy.title,
        description: policy.meta_description,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/policies/${slug}`,
        type: "website",
        siteName: "Her Kingdom",
      },
    }
  } catch {
    return { title: "Not Found" }
  }
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }))
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (!VALID_SLUGS.includes(slug)) {
    notFound()
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/policies/${slug}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      notFound()
    }

    const policy: Policy = await res.json()

    if (!policy.is_published) {
      notFound()
    }

    const settings = await getSiteSettings().catch(() => null)
    const onlyDigits = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "")
    const contactEmail: string =
      (settings as any)?.store_email || (settings as any)?.footer_email || "herkingdomlive@gmail.com"
    // Admin general settings saves to `store_phone` / `whatsapp_number` only.
    // Prefer those over legacy `footer_phone` which the admin form does not edit.
    const phoneDigits =
      onlyDigits((settings as any)?.store_phone) ||
      onlyDigits((settings as any)?.whatsapp_number) ||
      onlyDigits((settings as any)?.footer_phone)
    const formatDisplay = (raw: string) => {
      if (!raw) return "0780 406 059"
      const d = onlyDigits(raw)
      if (d.length === 12 && d.startsWith("254")) return `0${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
      if (d.length === 10 && d.startsWith("0")) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
      return raw
    }
    const phoneDisplay = formatDisplay(
      ((settings as any)?.store_phone || (settings as any)?.whatsapp_number || (settings as any)?.footer_phone || "") as string
    )
    const phoneHref = phoneDigits
      ? phoneDigits.startsWith("254")
        ? `tel:+${phoneDigits}`
        : `tel:${phoneDigits}`
      : "tel:+254780406059"

    return (
      <main className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-secondary py-12 border-b border-border">
          <div className="max-w-3xl mx-auto px-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mb-4 -ml-2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Store
              </Button>
            </Link>
            <h1 className="text-3xl md:text-4xl font-serif font-bold">{policy.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">Last updated: {new Date(policy.id).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div
            className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-3 prose-p:text-muted-foreground prose-p:leading-7 prose-a:text-foreground prose-a:underline prose-a:hover:no-underline prose-strong:text-foreground prose-strong:font-semibold prose-ul:list-disc prose-ul:pl-5 prose-ul:my-3 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy.content) }}
          />
        </div>

        {/* Footer CTA */}
        <div className="bg-secondary border-t border-border py-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-lg font-semibold mb-2">Questions or concerns?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="text-foreground font-medium hover:underline">
                {contactEmail}
              </a>
              {" "}or call{" "}
              <a href={phoneHref} className="text-foreground font-medium hover:underline">
                {phoneDisplay}
              </a>
            </p>
            <Link href="/">
              <Button className="bg-foreground text-background hover:bg-foreground/90">
                Return to Store
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  } catch (error) {
    console.error("[v0] Error loading policy:", error)
    notFound()
  }
}

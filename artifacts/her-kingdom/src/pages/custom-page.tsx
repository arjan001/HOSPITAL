"use client"

import { useEffect } from "react"
import { useRoute } from "wouter"
import { useCmsCollection } from "@/lib/cms-store"
import type { CustomPage } from "@/components/admin/custom-pages"
import NotFound from "@/pages/not-found"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

const WINE = "#3D0814"

export default function CustomPageView() {
  const [, params] = useRoute<{ slug: string }>("/pages/:slug")
  const { items } = useCmsCollection<CustomPage>("custom-pages", [])
  const page = items.find((p) => p.slug === params?.slug && p.published)

  useEffect(() => {
    if (!page) return
    const prevTitle = document.title
    document.title = page.seoTitle || `${page.title} | Shaniid RX`
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = metaDesc?.getAttribute("content") || ""
    if (page.seoDescription) {
      if (!metaDesc) {
        metaDesc = document.createElement("meta")
        metaDesc.setAttribute("name", "description")
        document.head.appendChild(metaDesc)
      }
      metaDesc.setAttribute("content", page.seoDescription)
    }
    return () => {
      document.title = prevTitle
      if (metaDesc) metaDesc.setAttribute("content", prevDesc)
    }
  }, [page])

  if (!page) return <NotFound />

  const paragraphs = page.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

  return (
    <div className="min-h-screen bg-white">
      <Seo
        title={page.seoTitle || `${page.title} | Shaniid RX`}
        description={page.seoDescription || page.excerpt || "A Shaniid RX page — calm, transparent information from Kenya's trusted pharmacy infrastructure."}
        canonicalPath={`/pages/${page.slug}`}
      />
      {/* Wine band header */}
      <div className="text-white" style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}>
        <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
          <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight">{page.title}</h1>
          {page.excerpt && <p className="mt-3 text-white/80 max-w-2xl text-sm md:text-base">{page.excerpt}</p>}
        </div>
      </div>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <div className="space-y-5 text-[15px] leading-relaxed text-neutral-800">
          {paragraphs.length === 0 ? (
            <p className="text-neutral-500 italic">This page is empty.</p>
          ) : (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-200 text-xs text-neutral-500">
          Last updated {new Date(page.updatedAt).toLocaleDateString()}
        </div>
      </article>
    </div>
  )
}

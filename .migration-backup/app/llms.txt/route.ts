import { SITE_SEO } from "@/lib/seo-data"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 3600

type ProductRow = { slug: string | null; name: string | null; category: string | null; description: string | null; price: number | null }
type CategoryRow = { slug: string | null; name: string | null; description: string | null; is_active: boolean | null }

async function fetchCategories(): Promise<CategoryRow[]> {
  try {
    const supabase = await createClient()
    if (!supabase) return []
    const { data } = await supabase
      .from("categories")
      .select("slug, name, description, is_active")
      .eq("is_active", true)
      .not("slug", "is", null)
      .range(0, 199)
    return (data as CategoryRow[]) || []
  } catch {
    return []
  }
}

async function fetchTopProducts(): Promise<ProductRow[]> {
  try {
    const supabase = await createClient()
    if (!supabase) return []
    const { data } = await supabase
      .from("products")
      .select("slug, name, category, description, price")
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .range(0, 99)
    return (data as ProductRow[]) || []
  } catch {
    return []
  }
}

function escape(value: string | null | undefined): string {
  if (!value) return ""
  return value.replace(/\s+/g, " ").trim()
}

// Serves `/llms.txt` — an emerging proposed standard (see llmstxt.org) that
// gives AI assistants like ChatGPT, Claude, Gemini and Perplexity a curated,
// markdown-friendly summary of the most important pages on the site. This
// complements robots.txt (which just says "yes, you may crawl") by telling
// the models WHAT to index first.
export async function GET(): Promise<Response> {
  const siteUrl = SITE_SEO.siteUrl
  const [categories, products] = await Promise.all([fetchCategories(), fetchTopProducts()])

  const lines: string[] = []
  lines.push(`# ${SITE_SEO.siteName}`)
  lines.push("")
  lines.push(`> ${escape(SITE_SEO.siteDescription)}`)
  lines.push("")
  lines.push(`- Site: ${siteUrl}`)
  lines.push(`- WhatsApp: https://wa.me/${SITE_SEO.whatsapp}`)
  lines.push(`- Phone: ${SITE_SEO.phone}`)
  lines.push(`- Email: ${SITE_SEO.email}`)
  lines.push(`- Location: ${SITE_SEO.address}`)
  lines.push(`- Currency: KES (Kenyan Shillings)`)
  lines.push(`- Payment: M-PESA, Card, Cash on Delivery`)
  lines.push(`- Delivery: Same-day Nairobi, nationwide Kenya`)
  lines.push("")
  lines.push("## Core pages")
  lines.push(`- [Home](${siteUrl}/) — Shop curated jewelry and accessories.`)
  lines.push(`- [Shop all](${siteUrl}/shop) — Full catalogue of jewelry, watches, handbags, gifts.`)
  lines.push(`- [Women](${siteUrl}/shop/women) — Women's jewelry and accessories.`)
  lines.push(`- [Men](${siteUrl}/shop/men) — Men's jewelry and accessories.`)
  lines.push(`- [Gift packages](${siteUrl}/shop/babyshop) — Curated gifts, flowers, occasion packages.`)
  lines.push(`- [Delivery](${siteUrl}/delivery) — Delivery zones and fees across Kenya.`)
  lines.push(`- [Track order](${siteUrl}/track-order) — Customer order tracking.`)
  lines.push(`- [Payments policy](${siteUrl}/payments-policy) — Accepted payment methods.`)
  lines.push(`- [Refund policy](${siteUrl}/refund-policy) — Returns and refunds.`)
  lines.push(`- [Privacy](${siteUrl}/privacy-policy) · [Terms](${siteUrl}/terms-of-service)`)
  lines.push("")

  if (categories.length > 0) {
    lines.push("## Categories")
    for (const c of categories) {
      if (!c.slug || !c.name) continue
      const url = `${siteUrl}/shop?category=${encodeURIComponent(c.slug)}`
      const desc = escape(c.description) || `Shop ${c.name.toLowerCase()} at Her Kingdom Nairobi.`
      lines.push(`- [${c.name}](${url}) — ${desc}`)
    }
    lines.push("")
  }

  if (products.length > 0) {
    lines.push("## Featured products")
    for (const p of products) {
      if (!p.slug || !p.name) continue
      const url = `${siteUrl}/product/${encodeURIComponent(p.slug)}`
      const snippet = escape(p.description).slice(0, 160) || `${p.name} — curated jewelry at Her Kingdom.`
      const cat = p.category ? ` [${p.category}]` : ""
      const price = p.price ? ` KSh ${Math.round(Number(p.price))}` : ""
      lines.push(`- [${p.name}](${url})${cat}${price} — ${snippet}`)
    }
    lines.push("")
  }

  lines.push("## Optional")
  lines.push(`- [Sitemap (XML)](${siteUrl}/sitemap.xml)`)
  lines.push(`- [Robots](${siteUrl}/robots.txt)`)
  lines.push("")
  lines.push("AI crawlers (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, Applebot-Extended, CCBot and peers) are allowed to index this site.")
  lines.push("")

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}

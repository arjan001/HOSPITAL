import Link from "next/link"
import type { Product } from "@/lib/types"
import type { CategorySeoMeta } from "@/lib/supabase-data"
import { formatPrice } from "@/lib/format"

/**
 * Server-rendered category landing block.
 *
 * This exists purely so crawlers see real, indexable category content
 * (heading, description, product list, breadcrumb) in the initial HTML.
 * The interactive filter grid from `<ShopPage />` hydrates below and
 * replaces this visually on the client, but the SSR markup prevents
 * /shop?category=... URLs from being flagged as Soft 404s by Google.
 */
export function CategoryIntro({
  category,
  products,
  siteUrl,
  contactPhone,
}: {
  category: CategorySeoMeta
  products: Product[]
  siteUrl: string
  contactPhone?: string
}) {
  const topProducts = products.slice(0, 24)
  const description =
    category.description ||
    `Shop ${category.name.toLowerCase()} at Her Kingdom Nairobi. Hypoallergenic, long-lasting ${category.name.toLowerCase()} delivered across Kenya. Same-day Nairobi delivery, nationwide courier and WhatsApp ordering.`
  const phoneDisplay = contactPhone && contactPhone.trim() ? contactPhone : "+254 780 406 059"

  return (
    <section
      aria-label={`${category.name} — category summary`}
      className="sr-only"
    >
      <div>
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-4">
          <ol className="flex items-center gap-2 flex-wrap">
            <li>
              <Link href="/" className="hover:underline">Home</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/shop" className="hover:underline">Shop</Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-foreground font-medium">{category.name}</li>
          </ol>
        </nav>

        <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
          {category.name} in Nairobi, Kenya
        </h1>
        <p className="mt-3 max-w-3xl text-sm md:text-base text-muted-foreground">
          {description}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {products.length > 0
            ? `${products.length} ${category.name.toLowerCase()} available · Delivered across Kenya · WhatsApp ${phoneDisplay}`
            : `New ${category.name.toLowerCase()} arriving soon. Browse the full Her Kingdom catalog or message us on WhatsApp ${phoneDisplay} for personal recommendations.`}
        </p>

        {topProducts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Featured {category.name}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-6">
              {topProducts.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link
                    href={`/product/${p.slug}`}
                    className="block group"
                    prefetch={false}
                  >
                    <span className="block font-medium text-foreground group-hover:underline line-clamp-2">
                      {p.name}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {formatPrice(p.price)}
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="ml-2 line-through">{formatPrice(p.originalPrice)}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topProducts.length === 0 && (
          <div className="mt-6">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            >
              Browse the full Her Kingdom catalog
            </Link>
          </div>
        )}
      </div>

      {topProducts.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `${category.name} at Her Kingdom`,
              numberOfItems: topProducts.length,
              itemListElement: topProducts.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${siteUrl}/product/${p.slug}`,
                name: p.name,
              })),
            }),
          }}
        />
      )}
    </section>
  )
}

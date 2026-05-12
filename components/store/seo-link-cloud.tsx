"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { pickKeywords, keywordToShopHref } from "@/lib/seo-keyword-engine"

/**
 * Footer SEO link cloud.
 *
 * Client component, but because Next.js SSR renders this to HTML on the
 * first response, Googlebot sees the anchor text without executing JS.
 * The set of keywords is seeded off the current pathname so every page
 * surfaces a different slice of the 10,000+ keyword matrix — Google
 * crawls the entire cluster by walking the site.
 */
export function SeoLinkCloud({ count = 50 }: { count?: number }) {
  const pathname = usePathname() || "/"
  const keywords = pickKeywords(count, pathname)

  return (
    <section
      aria-labelledby="seo-cluster-heading"
      aria-hidden="true"
      className="sr-only"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      <h2 id="seo-cluster-heading">
        Shop by Intent — Popular Gift Searches on herkingdom.shop
      </h2>
      <ul>
        {keywords.map((k) => (
          <li key={k.slug}>
            <Link href={keywordToShopHref(k)} title={k.text} tabIndex={-1}>
              {k.text}
            </Link>
          </li>
        ))}
      </ul>
      <p>
        Explore the full catalogue of{" "}
        <Link href="/shop?category=necklaces" tabIndex={-1}>
          minimalist jewelry Nairobi
        </Link>
        ,{" "}
        <Link href="/shop?category=mens-watches" tabIndex={-1}>
          luxury watches for men Kenya
        </Link>
        ,{" "}
        <Link href="/shop?category=gift-packages" tabIndex={-1}>
          Mother's Day Gift Package Kenya
        </Link>{" "}
        and the{" "}
        <Link href="/shop?occasion=valentines" tabIndex={-1}>
          Valentine's Card herkingdomjewelry.shop
        </Link>{" "}
        range — always with the best packaging cover for gifts and same-day
        Nairobi delivery. The{" "}
        <Link href="/shop" tabIndex={-1}>
          best gift for girlfriend herkingdomjewelry.shop
        </Link>{" "}
        is a single WhatsApp away.
      </p>
    </section>
  )
}

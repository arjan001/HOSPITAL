"use client"

import { Link } from "wouter"
import { useLocation } from "wouter"
import { pickKeywords, keywordToShopHref } from "@/lib/seo-keyword-engine"

/**
 * Footer SEO link cloud — visually hidden, but rendered into the DOM so
 * search-engine crawlers can discover the long-tail keyword cluster.
 * Keywords are seeded off the current pathname so every page surfaces a
 * different slice of the matrix.
 */
export function SeoLinkCloud({ count = 50 }: { count?: number }) {
  const [pathname] = useLocation() || "/"
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
        Shop by Need — Popular Pharmacy Searches on herkingdom.shop
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
        Explore the full pharmacy catalogue of{" "}
        <Link href="/shop?category=medications" tabIndex={-1}>
          prescription medications Nairobi
        </Link>
        ,{" "}
        <Link href="/shop?category=supplements" tabIndex={-1}>
          vitamins and supplements Kenya
        </Link>
        ,{" "}
        <Link href="/shop?category=devices" tabIndex={-1}>
          home health devices delivery
        </Link>{" "}
        and{" "}
        <Link href="/shop?category=baby-care" tabIndex={-1}>
          baby and mother care essentials
        </Link>{" "}
        — with same-day Nairobi delivery and trusted pharmacist support a{" "}
        <Link href="/shop" tabIndex={-1}>
          single WhatsApp away
        </Link>
        .
      </p>
    </section>
  )
}

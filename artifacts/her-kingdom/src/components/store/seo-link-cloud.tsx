"use client"

import { Link } from "wouter"

/** Visible footer links to key storefront categories — crawlable, not hidden. */
const BROWSE_LINKS = [
  { href: "/shop?category=medications", label: "Prescription & OTC medicines" },
  { href: "/shop?category=supplements", label: "Vitamins & supplements" },
  { href: "/shop?category=devices", label: "Home health devices" },
  { href: "/shop?category=baby-care", label: "Baby & mother care" },
  { href: "/care-packs", label: "Care packs & bundles" },
  { href: "/speak-to-a-doctor", label: "Speak to a doctor" },
  { href: "/delivery", label: "Delivery zones & fees" },
  { href: "/faq", label: "Pharmacy FAQ" },
] as const

export function SeoLinkCloud() {
  return (
    <nav
      aria-labelledby="browse-needs-heading"
      className="border-t border-white/10 pt-6 mt-6"
    >
      <h2
        id="browse-needs-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50 mb-3"
      >
        Browse by need
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/60">
        {BROWSE_LINKS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-white/90 transition-colors">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

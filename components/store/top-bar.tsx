"use client"

import useSWR from "swr"
import { safeFetcher } from "@/lib/fetcher"

export function TopBar() {
  const { data } = useSWR<{ navbarOffers?: { text: string }[] }>("/api/site-data", safeFetcher)
  const offers: string[] = Array.isArray(data?.navbarOffers)
    ? data!.navbarOffers!.map((o) => o?.text).filter((t): t is string => Boolean(t))
    : []
  const displayOffers = offers.length > 0 ? offers : ["FREE SHIPPING on orders above KSh 5,000"]
  // Repeat offers 4 times to fill viewport and create seamless loop
  const repeated = [...displayOffers, ...displayOffers, ...displayOffers, ...displayOffers]

  return (
    <div className="bg-foreground text-background overflow-hidden">
      <div className="flex whitespace-nowrap py-2">
        <div className="animate-marquee flex gap-8">
          {repeated.map((offer, i) => (
            <span key={i} className="text-xs tracking-widest uppercase font-medium flex-shrink-0">
              {offer}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

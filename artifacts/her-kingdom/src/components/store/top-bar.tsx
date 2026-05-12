"use client"

import useSWR from "swr"
import { safeFetcher } from "@/lib/fetcher"

export function TopBar() {
  const { data } = useSWR<{ navbarOffers?: { text: string }[] }>("/api/site-data", safeFetcher)
  const offers: string[] = Array.isArray(data?.navbarOffers)
    ? data!.navbarOffers!.map((o) => o?.text).filter((t): t is string => Boolean(t))
    : []
  const displayOffers = offers.length > 0 ? offers : ["FREE SHIPPING on orders above KSh 5,000"]
  const repeated = [...displayOffers, ...displayOffers, ...displayOffers, ...displayOffers]

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "linear-gradient(90deg, #FFE0C8 0%, #F5C4A0 25%, #D4847A 65%, #A84C5A 100%)",
      }}
    >
      <div className="flex whitespace-nowrap py-2">
        <div className="animate-marquee flex gap-8">
          {repeated.map((offer, i) => (
            <span
              key={i}
              className="text-xs tracking-widest uppercase font-semibold flex-shrink-0"
              style={{ color: "#3D0814" }}
            >
              {offer}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

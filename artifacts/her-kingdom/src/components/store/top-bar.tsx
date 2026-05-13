"use client"

import useSWR from "swr"
import { safeFetcher } from "@/lib/fetcher"
import { useCmsDoc } from "@/lib/cms-store"
import { ANNOUNCEMENT_DEFAULTS, type AnnouncementSettings } from "@/components/admin/announcement-bar"

export function TopBar() {
  const [announce] = useCmsDoc<AnnouncementSettings>("announcement", ANNOUNCEMENT_DEFAULTS)
  const { data } = useSWR<{ navbarOffers?: { text: string }[] }>("/api/site-data", safeFetcher)

  // CMS announcement bar takes priority. Falls back to API navbarOffers, then a default line.
  const cmsMessages: { text: string; href?: string }[] = announce.enabled
    ? announce.messages.filter((m) => m.text.trim())
    : []
  const apiOffers: { text: string; href?: string }[] = Array.isArray(data?.navbarOffers)
    ? data!.navbarOffers!.map((o) => ({ text: o?.text })).filter((o) => Boolean(o.text))
    : []
  const messages =
    cmsMessages.length > 0
      ? cmsMessages
      : apiOffers.length > 0
        ? apiOffers
        : [{ text: "FREE DELIVERY on orders above KSh 5,000" }]

  if (announce.enabled === false && cmsMessages.length === 0 && apiOffers.length === 0) return null

  const repeated = [...messages, ...messages, ...messages, ...messages]

  return (
    <div className="overflow-hidden" style={{ background: announce.bgColor }}>
      <div className="flex whitespace-nowrap py-2">
        <div
          className="animate-marquee flex gap-10"
          style={{ animationDuration: `${announce.speedSec}s` }}
        >
          {repeated.map((m, i) =>
            m.href ? (
              <a
                key={i}
                href={m.href}
                className="text-xs tracking-widest uppercase font-semibold flex-shrink-0 hover:underline"
                style={{ color: announce.textColor }}
              >
                {m.text}
              </a>
            ) : (
              <span
                key={i}
                className="text-xs tracking-widest uppercase font-semibold flex-shrink-0"
                style={{ color: announce.textColor }}
              >
                {m.text}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

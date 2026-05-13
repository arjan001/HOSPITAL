"use client"

import { useCmsDoc, useCmsCollection } from "@/lib/cms-store"
import { ANNOUNCEMENT_DEFAULTS, type AnnouncementSettings } from "@/components/admin/announcement-bar"
import {
  NAV_OFFERS_KEY,
  NAV_OFFERS_DEFAULTS,
  type NavOffer,
} from "@/components/admin/banners"

export function TopBar() {
  const [announce] = useCmsDoc<AnnouncementSettings>("announcement", ANNOUNCEMENT_DEFAULTS)
  const { items: navOffersAll } = useCmsCollection<NavOffer>(NAV_OFFERS_KEY, NAV_OFFERS_DEFAULTS)

  // CMS announcement bar takes priority. Falls back to CMS navbar offers, then a default line.
  const cmsMessages: { text: string; href?: string }[] = announce.enabled
    ? announce.messages.filter((m) => m.text.trim())
    : []

  const navOffers: { text: string; href?: string }[] = navOffersAll
    .filter((n) => n.isActive && n.text.trim())
    .map((n) => ({ text: n.text, href: n.href || undefined }))

  const messages =
    cmsMessages.length > 0
      ? cmsMessages
      : navOffers.length > 0
        ? navOffers
        : [{ text: "FREE DELIVERY on orders above KSh 5,000" }]

  if (announce.enabled === false && cmsMessages.length === 0 && navOffers.length === 0) return null

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

"use client"

import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { useCmsDoc } from "@/lib/cms-store"
import { POPUP_DEFAULTS, type PopupOfferSettings } from "@/components/admin/popup-offer"
import { X } from "lucide-react"

const DISMISS_KEY = "shaniidrx.popupOffer.dismissedAt"

function pathMatches(patterns: string, current: string): boolean {
  const list = patterns
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  if (list.includes("*")) return true
  return list.some((p) => p === current || (p !== "/" && current.startsWith(p)))
}

export function PopupOffer() {
  const [settings] = useCmsDoc<PopupOfferSettings>("popup-offer", POPUP_DEFAULTS)
  const [pathname] = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Recompute on every route or settings change. Always force-close if
    // the current path is no longer eligible (e.g. user navigated to /admin).
    if (!settings.enabled) {
      setOpen(false)
      return
    }
    if (typeof window === "undefined") return

    if (!pathMatches(settings.showOnPaths, pathname)) {
      setOpen(false)
      return
    }

    const dismissed = window.localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const ts = Number(dismissed)
      const days = (Date.now() - ts) / (1000 * 60 * 60 * 24)
      if (days < settings.frequencyDays) return
    }

    const t = window.setTimeout(() => setOpen(true), Math.max(0, settings.delaySec) * 1000)
    return () => window.clearTimeout(t)
  }, [settings.enabled, settings.showOnPaths, settings.frequencyDays, settings.delaySec, pathname])

  const close = () => {
    setOpen(false)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
  }

  if (!open || !settings.enabled) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 max-w-md w-full relative"
        style={{ background: settings.bgColor, color: settings.textColor }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={close}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-neutral-700 z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {settings.imageUrl && (
          <img
            src={settings.imageUrl}
            alt=""
            className="w-full h-48 object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="p-7 space-y-3 text-center">
          <h3 className="text-2xl font-bold">{settings.headline}</h3>
          <p className="text-sm opacity-80">{settings.subhead}</p>
          <a
            href={settings.ctaHref || "#"}
            onClick={close}
            className="inline-flex w-full h-12 items-center justify-center rounded-full text-sm font-bold text-white mt-2"
            style={{ background: "linear-gradient(135deg, #F97316 0%, #B91C1C 100%)" }}
          >
            {settings.ctaLabel}
          </a>
          <button
            type="button"
            onClick={close}
            className="block mx-auto text-xs underline opacity-60 hover:opacity-100 mt-1"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  )
}

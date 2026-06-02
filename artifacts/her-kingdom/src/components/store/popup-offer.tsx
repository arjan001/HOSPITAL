"use client"

import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { useCmsDoc } from "@/lib/cms-store"
import { POPUP_DEFAULTS, type PopupOfferSettings } from "@/components/admin/popup-offer"
import { X, Check } from "lucide-react"

const DISMISS_KEY = "shaniidrx.popupOffer.dismissedAt"
const DISMISS_FOREVER_KEY = "shaniidrx.popupOffer.dismissedForever"

const CTA_RED = "#B91C1C"
const CTA_RED_HOVER = "#991018"

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
  const [email, setEmail] = useState("")
  const [dontShow, setDontShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

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

    // Permanent opt-out ("Don't show this popup again") wins over frequency cap.
    if (window.localStorage.getItem(DISMISS_FOREVER_KEY)) return

    const dismissed = window.localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const ts = Number(dismissed)
      const days = (Date.now() - ts) / (1000 * 60 * 60 * 24)
      if (days < settings.frequencyDays) return
    }

    const t = window.setTimeout(() => setOpen(true), Math.max(0, settings.delaySec) * 1000)
    return () => window.clearTimeout(t)
  }, [settings.enabled, settings.showOnPaths, settings.frequencyDays, settings.delaySec, pathname])

  // Escape closes the modal while it is open (a11y).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dontShow])

  const close = () => {
    setOpen(false)
    if (typeof window === "undefined") return
    if (dontShow) {
      window.localStorage.setItem(DISMISS_FOREVER_KEY, "true")
    } else {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value || submitting) return
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/v2/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: "popup-offer" }),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as Record<string, unknown>
        setError(
          (d.message as string) ||
            (d.detail as string) ||
            (d.error as string) ||
            "Something went wrong. Please try again.",
        )
        return
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
      return
    } finally {
      setSubmitting(false)
    }
    // Subscribing implies the visitor has acted on the offer — don't nag again.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_FOREVER_KEY, "true")
    }
    setSubmitted(true)
    window.setTimeout(() => setOpen(false), 2600)
  }

  if (!open || !settings.enabled) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="shadow-2xl overflow-hidden w-[92vw] max-w-[820px] flex flex-col sm:flex-row relative animate-in fade-in zoom-in-95 duration-300"
        style={{ background: settings.bgColor, color: settings.textColor }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={settings.headline}
      >
        {/* Left — product image (sharp edges, full bleed) */}
        {settings.imageUrl && (
          <div className="relative w-full sm:w-[46%] h-56 sm:h-auto sm:min-h-[440px] flex-shrink-0 bg-neutral-100">
            <img
              src={settings.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                const parent = e.currentTarget.parentElement
                if (parent) parent.style.display = "none"
              }}
            />
          </div>
        )}

        {/* Right — newsletter / offer copy */}
        <div className="flex-1 relative px-7 py-9 sm:px-10 sm:py-12 flex flex-col justify-center">
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {submitted ? (
            <div className="text-center py-6">
              <div
                className="w-14 h-14 mx-auto mb-5 flex items-center justify-center"
                style={{ background: `${CTA_RED}1a` }}
              >
                <Check className="h-7 w-7" style={{ color: CTA_RED }} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-bold">You're on the list</h3>
              <p className="text-sm opacity-70 mt-3 leading-relaxed">
                Thank you for subscribing. Watch your inbox for genuine-medicine offers and
                pharmacist health tips.
              </p>
            </div>
          ) : (
            <>
              {settings.eyebrow && (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
                  {settings.eyebrow}
                </p>
              )}
              <h3 className="text-[26px] sm:text-[32px] font-bold mt-2 leading-tight">
                {settings.headline}
              </h3>
              <p className="text-[15px] opacity-75 mt-3 leading-relaxed">{settings.subhead}</p>

              <form onSubmit={handleSubscribe} className="mt-7">
                <label htmlFor="popup-email" className="text-sm font-medium block mb-2">
                  Email Address <span style={{ color: CTA_RED }}>*</span>
                </label>
                <input
                  id="popup-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-12 px-4 border border-neutral-300 bg-white text-neutral-900 text-sm outline-none focus:border-neutral-500 transition-colors placeholder:text-neutral-400"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 mt-4 text-white text-sm font-bold tracking-wide transition-colors disabled:opacity-60"
                  style={{ background: CTA_RED }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = CTA_RED_HOVER)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = CTA_RED)}
                >
                  {submitting ? "Subscribing…" : settings.ctaLabel}
                </button>
                {error && <p className="mt-3 text-sm font-medium" style={{ color: CTA_RED }}>{error}</p>}
              </form>

              <label className="flex items-center gap-3 mt-6 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="w-[18px] h-[18px] border-2 border-neutral-400 flex items-center justify-center transition-colors peer-checked:border-neutral-800 peer-checked:bg-neutral-800">
                  {dontShow && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                <span className="text-sm opacity-70 group-hover:opacity-100 transition-opacity">
                  Don't show this popup again
                </span>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

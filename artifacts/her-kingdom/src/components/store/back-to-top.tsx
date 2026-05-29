"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

/**
 * Modern, industry-standard "back to top" control.
 *
 * Behaviour (matches the pattern used by major storefronts):
 *   - Fixed to the bottom-right of the viewport, NOT buried in the footer, so it
 *     is reachable from anywhere on a long page.
 *   - Hidden until the user has scrolled past a threshold (default 400px), then
 *     fades + scales in. This avoids cluttering the first viewport.
 *   - Smooth scroll to the top, but honours `prefers-reduced-motion`.
 *   - Fully accessible: real <button>, descriptive aria-label, visible focus
 *     ring, and keyboard operable.
 *   - Scroll handler is throttled with requestAnimationFrame and uses a passive
 *     listener so it never janks scrolling under load.
 *
 * Mounted once globally (see GlobalOverlays in App.tsx). Sits at z-40 so app
 * modals/toasts (z-50+) always render above it.
 */
const SHOW_AFTER_PX = 400

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let ticking = false
    const update = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    // Run once in case the page loads already scrolled (e.g. on refresh).
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollToTop = () => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, left: 0, behavior: prefersReduced ? "auto" : "smooth" })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 active:translate-y-0 ${
        visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-90 opacity-0"
      }`}
      style={{
        background: "linear-gradient(135deg, #F97316 0%, #B91C1C 100%)",
        boxShadow: "0 10px 24px -8px rgba(185,28,28,0.5)",
      }}
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
    </button>
  )
}

"use client"

import { useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"

function getSessionId() {
  if (typeof window === "undefined") return ""
  let sid = sessionStorage.getItem("kf_sid")
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem("kf_sid", sid)
  }
  return sid
}

/** Persistent visitor ID in localStorage — survives across sessions for new/returning tracking */
function getVisitorId(): string {
  if (typeof window === "undefined") return ""
  let vid = localStorage.getItem("kf_vid")
  if (!vid) {
    vid = crypto.randomUUID()
    localStorage.setItem("kf_vid", vid)
  }
  return vid
}

/** Check if this is a returning visitor (has visited before this session) */
function isReturningVisitor(): boolean {
  if (typeof window === "undefined") return false
  const firstSeen = localStorage.getItem("kf_first_seen")
  if (!firstSeen) {
    localStorage.setItem("kf_first_seen", new Date().toISOString())
    return false
  }
  // If the first seen date is from a different session (> 30min ago), they're returning
  const diff = Date.now() - new Date(firstSeen).getTime()
  return diff > 30 * 60 * 1000
}

function detectBot(): boolean {
  if (typeof window === "undefined") return false
  const ua = navigator.userAgent
  // Known bot patterns
  if (/bot|crawl|spider|scraper|curl|wget|python|java|go-http|headless|phantom|puppeteer|selenium|playwright/i.test(ua)) return true
  // No webdriver check
  if ((navigator as unknown as Record<string, unknown>).webdriver) return true
  // No plugins often means headless
  if (navigator.plugins && navigator.plugins.length === 0 && !/mobile|android|iphone/i.test(ua)) return true
  return false
}

function getScrollDepth(): number {
  if (typeof window === "undefined") return 0
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  )
  const winHeight = window.innerHeight
  if (docHeight <= winHeight) return 100
  return Math.min(100, Math.round((scrollTop / (docHeight - winHeight)) * 100))
}

/** Extract UTM parameters from current URL */
function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
  for (const key of utmKeys) {
    const val = params.get(key)
    if (val) utm[key] = val.slice(0, 200)
  }
  // Also capture click IDs from ad/social platforms, useful when the referrer
  // header is stripped (in-app browsers often do this).
  if (params.get("gclid")) utm.gclid = "true"
  if (params.get("fbclid")) utm.fbclid = "true"
  if (params.get("ttclid")) utm.ttclid = "true"
  if (params.get("igshid") || params.get("igsh")) utm.igshid = "true"
  if (params.get("twclid")) utm.twclid = "true"
  if (params.get("li_fat_id")) utm.li_fat_id = "true"
  if (params.get("msclkid")) utm.msclkid = "true"
  if (params.get("yclid")) utm.yclid = "true"
  if (params.get("rdt_cid")) utm.rdt_cid = "true"
  if (params.get("epik")) utm.epik = "true"
  if (params.get("sc_cid")) utm.sc_cid = "true"
  return utm
}

/**
 * Infer a social/ad traffic source when the referrer header is missing.
 * Many in-app browsers (Instagram, TikTok, Facebook, etc.) strip the Referer
 * header, so we fall back to well-known click-ID parameters to attribute the
 * visit. Returns { source, medium } or null.
 */
function inferSocialFromClickIds(): { source: string; medium: string } | null {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  if (params.get("fbclid")) return { source: "facebook", medium: "social" }
  if (params.get("ttclid")) return { source: "tiktok", medium: "social" }
  if (params.get("igshid") || params.get("igsh")) return { source: "instagram", medium: "social" }
  if (params.get("twclid")) return { source: "twitter", medium: "social" }
  if (params.get("li_fat_id")) return { source: "linkedin", medium: "social" }
  if (params.get("rdt_cid")) return { source: "reddit", medium: "social" }
  if (params.get("epik")) return { source: "pinterest", medium: "social" }
  if (params.get("sc_cid")) return { source: "snapchat", medium: "social" }
  if (params.get("msclkid")) return { source: "bing", medium: "cpc" }
  if (params.get("gclid")) return { source: "google", medium: "cpc" }
  if (params.get("yclid")) return { source: "yandex", medium: "cpc" }
  return null
}

export function PageViewTracker() {
  const pathname = usePathname()
  const lastTracked = useRef("")
  const pageEnterTime = useRef<number>(0)
  const maxScrollDepth = useRef(0)
  const isBot = useRef(false)

  // Track page duration on leave
  const sendDuration = useCallback(() => {
    if (!pageEnterTime.current || lastTracked.current.startsWith("/admin") || lastTracked.current.startsWith("/auth")) return
    const duration = Math.round((Date.now() - pageEnterTime.current) / 1000)
    if (duration < 1) return

    const payload = JSON.stringify({
      path: lastTracked.current,
      sessionId: getSessionId(),
      duration,
      scrollDepth: maxScrollDepth.current,
      _update: true,
    })

    // Use sendBeacon for reliable delivery on page leave
    // sendBeacon always sends POST, so we include _update flag to signal a duration update
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-view", new Blob([payload], { type: "application/json" }))
    } else {
      fetch("/api/track-view", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {})
    }
  }, [])

  // Track scroll depth
  useEffect(() => {
    const onScroll = () => {
      const depth = getScrollDepth()
      if (depth > maxScrollDepth.current) maxScrollDepth.current = depth
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Track page unload
  useEffect(() => {
    const onBeforeUnload = () => sendDuration()
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendDuration()
    })
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [sendDuration])

  // Track page views
  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return
    if (lastTracked.current === pathname) return

    // Send duration for previous page
    if (lastTracked.current) sendDuration()

    lastTracked.current = pathname
    pageEnterTime.current = Date.now()
    maxScrollDepth.current = 0
    isBot.current = detectBot()

    const utmParams = getUtmParams()
    const returning = isReturningVisitor()
    const visitorId = getVisitorId()
    const inferred = inferSocialFromClickIds()
    // When the raw referrer header is empty (common with in-app browsers from
    // TikTok/Instagram/Facebook) but a platform click-ID is present, fall back
    // to the inferred source/medium so Top Referrers attributes the visit
    // rather than counting it as Direct.
    const hasRealReferrer = !!(document.referrer || "").trim()
    const effectiveUtmSource = utmParams.utm_source || (!hasRealReferrer && inferred ? inferred.source : "")
    const effectiveUtmMedium = utmParams.utm_medium || (!hasRealReferrer && inferred ? inferred.medium : "")

    const track = async () => {
      try {
        await fetch("/api/track-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            referrer: document.referrer || "",
            sessionId: getSessionId(),
            visitorId,
            isBot: isBot.current,
            isReturning: returning,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            language: navigator.language || "",
            utmSource: effectiveUtmSource,
            utmMedium: effectiveUtmMedium,
            utmCampaign: utmParams.utm_campaign || "",
          }),
        })

        // Track UTM params as a separate event for detailed campaign analysis
        if (Object.keys(utmParams).length > 0) {
          fetch("/api/track-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventType: "utm_landing",
              eventTarget: utmParams.utm_campaign || utmParams.utm_source || "unknown",
              eventData: { ...utmParams, landing_page: pathname, referrer: document.referrer },
              pagePath: pathname,
              sessionId: getSessionId(),
              isBot: isBot.current,
            }),
          }).catch(() => {})
        }
      } catch {
        // Silently fail
      }
    }

    const timeout = setTimeout(track, 500)
    return () => clearTimeout(timeout)
  }, [pathname, sendDuration])

  // Track button clicks and link clicks
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const button = target.closest("button, a, [role='button']") as HTMLElement | null
      if (!button) return
      if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return

      const eventTarget =
        button.getAttribute("aria-label") ||
        button.textContent?.trim().slice(0, 100) ||
        button.tagName

      const eventData: Record<string, string> = {
        tag: button.tagName.toLowerCase(),
        page: pathname,
      }

      if (button instanceof HTMLAnchorElement && button.href) {
        eventData.href = button.href
      }

      if (button.id) eventData.id = button.id
      if (button.className) eventData.class = button.className.toString().slice(0, 200)

      // Fire and forget - don't block UI
      fetch("/api/track-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "click",
          eventTarget: eventTarget?.slice(0, 200),
          eventData,
          pagePath: pathname,
          sessionId: getSessionId(),
          isBot: isBot.current,
        }),
      }).catch(() => {})
    }

    document.addEventListener("click", onClick, { capture: true })
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [pathname])

  return null
}

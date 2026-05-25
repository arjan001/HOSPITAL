import { useEffect, useRef, useCallback } from "react"
import { useLocation } from "wouter"

function getSessionId() {
  if (typeof window === "undefined") return ""
  let sid = sessionStorage.getItem("kf_sid")
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("kf_sid", sid) }
  return sid
}
function getVisitorId(): string {
  if (typeof window === "undefined") return ""
  let vid = localStorage.getItem("kf_vid")
  if (!vid) { vid = crypto.randomUUID(); localStorage.setItem("kf_vid", vid) }
  return vid
}
function isReturningVisitor(): boolean {
  if (typeof window === "undefined") return false
  const firstSeen = localStorage.getItem("kf_first_seen")
  if (!firstSeen) { localStorage.setItem("kf_first_seen", new Date().toISOString()); return false }
  return Date.now() - new Date(firstSeen).getTime() > 30 * 60 * 1000
}
function detectBot(): boolean {
  if (typeof window === "undefined") return false
  const ua = navigator.userAgent
  if (/bot|crawl|spider|scraper|curl|wget|python|java|go-http|headless|phantom|puppeteer|selenium|playwright/i.test(ua)) return true
  if ((navigator as unknown as Record<string, unknown>).webdriver) return true
  return false
}
function getScrollDepth(): number {
  if (typeof window === "undefined") return 0
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
  const winHeight = window.innerHeight
  if (docHeight <= winHeight) return 100
  return Math.min(100, Math.round((scrollTop / (docHeight - winHeight)) * 100))
}
function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}
  for (const key of ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"]) {
    const val = params.get(key)
    if (val) utm[key] = val.slice(0, 200)
  }
  if (params.get("gclid")) utm.gclid = "true"
  if (params.get("fbclid")) utm.fbclid = "true"
  if (params.get("ttclid")) utm.ttclid = "true"
  return utm
}

export function PageViewTracker() {
  const [pathname] = useLocation()
  const lastTracked = useRef("")
  const pageEnterTime = useRef<number>(0)
  const maxScrollDepth = useRef(0)
  const isBot = useRef(false)

  const sendDuration = useCallback(() => {
    if (!pageEnterTime.current || lastTracked.current.startsWith("/admin") || lastTracked.current.startsWith("/auth")) return
    const duration = Math.round((Date.now() - pageEnterTime.current) / 1000)
    if (duration < 1) return
    const payload = JSON.stringify({ path: lastTracked.current, sessionId: getSessionId(), duration, scrollDepth: maxScrollDepth.current, _update: true })
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track-view", new Blob([payload], { type: "application/json" }))
    else fetch("/api/track-view", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => { const d = getScrollDepth(); if (d > maxScrollDepth.current) maxScrollDepth.current = d }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const onBeforeUnload = () => sendDuration()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [sendDuration])

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return
    if (lastTracked.current === pathname) return
    if (lastTracked.current) sendDuration()
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" })
    lastTracked.current = pathname
    pageEnterTime.current = Date.now()
    maxScrollDepth.current = 0
    isBot.current = detectBot()
    const utmParams = getUtmParams()
    const returning = isReturningVisitor()
    const visitorId = getVisitorId()
    const timeout = setTimeout(async () => {
      try {
        await fetch("/api/track-view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: pathname, referrer: document.referrer || "", sessionId: getSessionId(), visitorId, isBot: isBot.current, isReturning: returning, screenWidth: window.innerWidth, screenHeight: window.innerHeight, language: navigator.language || "", utmSource: utmParams.utm_source || "", utmMedium: utmParams.utm_medium || "", utmCampaign: utmParams.utm_campaign || "" }) })
      } catch { /* silently fail */ }
    }, 500)
    return () => clearTimeout(timeout)
  }, [pathname, sendDuration])

  return null
}

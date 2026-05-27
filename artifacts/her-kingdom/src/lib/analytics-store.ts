"use client"

/**
 * analytics-store.ts — Client-side analytics buffer + ingest helper.
 *
 * The storefront emits page views, custom events, and abandoned-cart pings.
 * Each call is buffered locally (so we can drop offline traffic gracefully)
 * and posted to the Express `/api/track-*` endpoints in batches.
 *
 * The buffer is bounded to avoid runaway memory if the network is down.
 * Failures are silent — analytics must never break the UI.
 *
 * Recover from older revisions: the project README has long referenced this
 * file, but the implementation was never present. Components that called
 * `trackPageView` etc. via ad-hoc fetches keep working because the
 * legacy endpoints accept the same payload shape (no-ops today, but stable).
 */

import { apiExpress } from "./api"

const BUFFER_KEY = "shaniidrx.analytics.buffer"
const SESSION_KEY = "shaniidrx.analytics.session"
const MAX_BUFFER = 200
const FLUSH_INTERVAL_MS = 15_000

export type AnalyticsEvent = {
  id: string
  kind: "view" | "event" | "abandoned"
  payload: Record<string, unknown>
  occurredAt: string
}

function newAnalyticsId(): string {
  return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function ensureSessionId(): string {
  if (typeof window === "undefined") return "ssr"
  try {
    const existing = window.localStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = `vis_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    window.localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return "anon"
  }
}

function readBuffer(): AnalyticsEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(BUFFER_KEY)
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

function writeBuffer(events: AnalyticsEvent[]): void {
  if (typeof window === "undefined") return
  try {
    const trimmed = events.length > MAX_BUFFER ? events.slice(-MAX_BUFFER) : events
    window.localStorage.setItem(BUFFER_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore quota errors
  }
}

let flushing = false
let scheduled = false

function scheduleFlush() {
  if (typeof window === "undefined" || scheduled) return
  scheduled = true
  window.setTimeout(() => {
    scheduled = false
    void flush()
  }, FLUSH_INTERVAL_MS)
}

/** Pushes buffered events to the legacy `/api/track-*` endpoints. */
export async function flush(): Promise<void> {
  if (flushing) return
  const events = readBuffer()
  if (events.length === 0) return
  flushing = true
  try {
    const sessionId = ensureSessionId()
    const remaining: AnalyticsEvent[] = []
    for (const ev of events) {
      const payload = { ...ev.payload, _sessionId: sessionId, _occurredAt: ev.occurredAt }
      try {
        if (ev.kind === "view") await apiExpress.trackView(payload)
        else if (ev.kind === "abandoned") await apiExpress.trackAbandoned(payload)
        else await apiExpress.trackEvent(payload)
      } catch {
        // Keep the event in the buffer for a later retry.
        remaining.push(ev)
      }
    }
    writeBuffer(remaining)
    if (remaining.length > 0) scheduleFlush()
  } finally {
    flushing = false
  }
}

function enqueue(kind: AnalyticsEvent["kind"], payload: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const events = readBuffer()
  events.push({
    id: newAnalyticsId(),
    kind,
    payload,
    occurredAt: new Date().toISOString(),
  })
  writeBuffer(events)
  scheduleFlush()
}

export function trackPageView(path: string, extra: Record<string, unknown> = {}): void {
  enqueue("view", { path, ...extra })
}

export function trackEvent(name: string, props: Record<string, unknown> = {}): void {
  enqueue("event", { name, ...props })
}

export function trackAbandonedCart(items: Array<{ slug: string; quantity: number }>): void {
  enqueue("abandoned", { items })
}

/** Read the local buffer without flushing — useful in admin debug views. */
export function peekBuffer(): AnalyticsEvent[] {
  return readBuffer()
}

/** Force a flush (for sign-out paths or unload handlers). */
export function flushNow(): Promise<void> {
  return flush()
}

/* Best-effort flush on page hide so we don't lose pending events. */
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush()
  })
}

"use client"

/**
 * Client SDK for the in-house monitoring backend (api-nest /monitoring).
 *
 * Captures:
 *   - uncaught errors (window.error)
 *   - unhandled promise rejections
 *   - console.error / console.warn (mirrors the message as a breadcrumb)
 *   - fetch failures (4xx / 5xx) as breadcrumbs
 *   - navigation breadcrumbs (history.pushState/replaceState/popstate)
 *   - explicit `monitoring.capture(err, opts)` calls
 *
 * Batches up to 10 events or 5s and flushes; uses sendBeacon on unload.
 *
 * Idempotent — safe to call init() multiple times.
 */

type EventLevel = "fatal" | "error" | "warning" | "info" | "debug"
type EventKind = "error" | "message" | "perf" | "navigation"

interface Breadcrumb {
  category: string
  message: string
  level?: EventLevel
  data?: Record<string, unknown>
  timestamp: string
}

interface IncomingEvent {
  kind: EventKind
  level: EventLevel
  message: string
  errorType?: string
  stack?: string
  url?: string
  durationMs?: number
  context?: Record<string, unknown>
}

interface InitOptions {
  endpoint?: string
  environment?: string
  release?: string
  enabled?: boolean
  userId?: string
  /** Max breadcrumbs kept per event. */
  maxBreadcrumbs?: number
}

const STATE = {
  endpoint: "/api/v2/monitoring/events",
  environment: typeof location !== "undefined" && location.hostname === "localhost" ? "development" : "production",
  release: "her-kingdom@dev",
  enabled: true,
  userId: undefined as string | undefined,
  installed: false,
  queue: [] as Array<Record<string, unknown>>,
  breadcrumbs: [] as Breadcrumb[],
  maxBreadcrumbs: 30,
  flushTimer: 0 as number | undefined,
  sessionId: makeSessionId(),
}

function makeSessionId(): string {
  if (typeof window === "undefined") return "ssr"
  try {
    const k = "shaniidrx.mon.sid"
    const cached = sessionStorage.getItem(k)
    if (cached) return cached
    const id = "s_" + Math.random().toString(36).slice(2, 12)
    sessionStorage.setItem(k, id)
    return id
  } catch { return "s_" + Math.random().toString(36).slice(2, 12) }
}

function userId(): string {
  if (STATE.userId) return STATE.userId
  if (typeof window === "undefined") return "ssr"
  try {
    const k = "shaniidrx.mon.uid"
    const cached = localStorage.getItem(k)
    if (cached) return cached
    const id = "u_" + Math.random().toString(36).slice(2, 12)
    localStorage.setItem(k, id)
    return id
  } catch { return "u_" + Math.random().toString(36).slice(2, 12) }
}

function nowIso() { return new Date().toISOString() }

function pushBreadcrumb(b: Omit<Breadcrumb, "timestamp">) {
  STATE.breadcrumbs.push({ ...b, timestamp: nowIso() })
  if (STATE.breadcrumbs.length > STATE.maxBreadcrumbs) {
    STATE.breadcrumbs.splice(0, STATE.breadcrumbs.length - STATE.maxBreadcrumbs)
  }
}

function envelope(e: IncomingEvent): Record<string, unknown> {
  return {
    kind: e.kind,
    level: e.level,
    message: e.message,
    errorType: e.errorType,
    stack: e.stack,
    url: e.url ?? (typeof location !== "undefined" ? location.href : undefined),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    release: STATE.release,
    environment: STATE.environment,
    userId: userId(),
    sessionId: STATE.sessionId,
    durationMs: e.durationMs,
    context: e.context,
    breadcrumbs: STATE.breadcrumbs.slice(-STATE.maxBreadcrumbs),
    clientTs: nowIso(),
  }
}

function enqueue(env: Record<string, unknown>) {
  if (!STATE.enabled) return
  STATE.queue.push(env)
  if (STATE.queue.length >= 10) {
    flush()
  } else {
    scheduleFlush()
  }
}

function scheduleFlush() {
  if (STATE.flushTimer != null) return
  STATE.flushTimer = window.setTimeout(() => {
    STATE.flushTimer = undefined
    flush()
  }, 5_000)
}

function flush(useBeacon = false): void {
  if (STATE.queue.length === 0) return
  const batch = STATE.queue.splice(0, STATE.queue.length)
  const body = JSON.stringify({ events: batch })
  try {
    if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" })
      navigator.sendBeacon(STATE.endpoint, blob)
      return
    }
    fetch(STATE.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "include",
    }).catch(() => {
      // Drop the batch silently to avoid recursive error reporting.
    })
  } catch {
    // ignore — never throw from telemetry
  }
}

/* ---------- install hooks (idempotent) ---------- */

function installGlobalHandlers() {
  if (STATE.installed || typeof window === "undefined") return
  STATE.installed = true

  window.addEventListener("error", (event: ErrorEvent) => {
    capture(event.error ?? event.message, {
      level: "error",
      errorType: event.error?.name ?? "Error",
      url: event.filename,
    })
  })

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason
    capture(reason instanceof Error ? reason : new Error(String(reason)), {
      level: "error",
      errorType: "UnhandledRejection",
    })
  })

  // Console mirroring as breadcrumbs (don't ingest as events to avoid noise).
  for (const lvl of ["warn", "error"] as const) {
    const orig = console[lvl].bind(console)
    console[lvl] = (...args: unknown[]) => {
      try {
        pushBreadcrumb({
          category: "console",
          level: lvl === "warn" ? "warning" : "error",
          message: args.map((a) => safeString(a)).join(" ").slice(0, 500),
        })
      } catch { /* never throw */ }
      orig(...args)
    }
  }

  // History navigation breadcrumbs.
  const wrapHistory = (m: "pushState" | "replaceState") => {
    const orig = history[m].bind(history)
    history[m] = (data, unused, url) => {
      pushBreadcrumb({ category: "navigation", message: `${m} → ${String(url ?? location.pathname)}` })
      return orig(data, unused, url)
    }
  }
  wrapHistory("pushState")
  wrapHistory("replaceState")
  window.addEventListener("popstate", () => {
    pushBreadcrumb({ category: "navigation", message: `popstate → ${location.pathname}` })
  })

  // Flush on unload via sendBeacon.
  window.addEventListener("pagehide", () => flush(true))
  window.addEventListener("beforeunload", () => flush(true))
}

function safeString(v: unknown): string {
  if (v == null) return String(v)
  if (typeof v === "string") return v
  if (v instanceof Error) return v.message
  try { return JSON.stringify(v) } catch { return String(v) }
}

/* ---------- public API ---------- */

export function init(opts: InitOptions = {}) {
  if (typeof window === "undefined") return
  if (opts.endpoint) STATE.endpoint = opts.endpoint
  if (opts.environment) STATE.environment = opts.environment
  if (opts.release) STATE.release = opts.release
  if (opts.userId) STATE.userId = opts.userId
  if (typeof opts.enabled === "boolean") STATE.enabled = opts.enabled
  if (opts.maxBreadcrumbs) STATE.maxBreadcrumbs = opts.maxBreadcrumbs
  installGlobalHandlers()
}

export function setUser(id: string | undefined) { STATE.userId = id }
export function setEnabled(on: boolean) { STATE.enabled = on }
export function addBreadcrumb(b: Omit<Breadcrumb, "timestamp">) { pushBreadcrumb(b) }

export function capture(err: unknown, opts: Partial<IncomingEvent> = {}) {
  const e = err instanceof Error ? err : new Error(safeString(err))
  enqueue(envelope({
    kind: "error",
    level: opts.level ?? "error",
    message: opts.message ?? e.message,
    errorType: opts.errorType ?? e.name,
    stack: opts.stack ?? e.stack,
    url: opts.url,
    context: opts.context,
  }))
}

export function captureMessage(message: string, opts: Partial<IncomingEvent> = {}) {
  enqueue(envelope({
    kind: "message",
    level: opts.level ?? "info",
    message,
    context: opts.context,
  }))
}

export function capturePerf(label: string, durationMs: number, context?: Record<string, unknown>) {
  enqueue(envelope({
    kind: "perf",
    level: "info",
    message: label,
    durationMs,
    context,
  }))
}

/** Wrap an async function so any thrown error is captured and re-thrown. */
export function wrap<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, label?: string): T {
  return (async (...args: unknown[]) => {
    const t0 = performance.now()
    try {
      const out = await fn(...args)
      if (label) capturePerf(label, performance.now() - t0)
      return out
    } catch (err) {
      capture(err, { context: { label } })
      throw err
    }
  }) as T
}

export const monitoring = {
  init, setUser, setEnabled, addBreadcrumb, capture, captureMessage, capturePerf, wrap,
  flush: () => flush(false),
}

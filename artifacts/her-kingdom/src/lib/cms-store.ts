"use client"

/**
 * cms-store — thin localStorage-backed CMS adapter.
 *
 * All admin CMS modules write through this single module so we can swap the
 * backend (NestJS + Postgres) in one place later without touching every page.
 *
 * - `useCmsDoc<T>(key, defaults)` — single object document
 * - `useCmsCollection<T>(key, defaults)` — array of records keyed by `id`
 *
 * Reads/writes are tab-synced via `window.storage` event + a private
 * `cms-store:change` event so multiple components in the same tab stay in
 * sync (storage events do not fire in the originating tab).
 */

import { useCallback, useSyncExternalStore } from "react"

const NAMESPACE = "shaniidrx.cms"
const CHANGE_EVENT = "cms-store:change"

function fullKey(key: string) {
  return `${NAMESPACE}.${key}`
}

function readRaw<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(fullKey(key))
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Per-key snapshot cache. `useSyncExternalStore` requires a stable reference
 * for unchanged values — without this, every render parses JSON afresh and
 * React re-renders forever ("Maximum update depth exceeded").
 *
 * We cache by raw JSON string so a real localStorage change still flows
 * through, but identical reads return the same object.
 */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>()

function readSnapshot<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const fk = fullKey(key)
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(fk)
  } catch {
    return fallback
  }
  const cached = snapshotCache.get(key)
  if (cached && cached.raw === raw) {
    return cached.value as T
  }
  let value: T
  if (raw == null) {
    value = fallback
  } else {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = fallback
    }
  }
  snapshotCache.set(key, { raw, value })
  return value
}

function writeRaw<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  try {
    // Capture the previous value for audit diff hints BEFORE we overwrite.
    let prev: unknown = undefined
    try {
      const before = window.localStorage.getItem(fullKey(key))
      if (before != null) prev = JSON.parse(before)
    } catch { /* ignore */ }

    const json = JSON.stringify(value)
    window.localStorage.setItem(fullKey(key), json)
    // Update cache eagerly so the next snapshot read returns the same ref.
    snapshotCache.set(key, { raw: json, value })
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }))

    // Auto-audit: record any cmsStore mutation made under /admin/*. We skip
    // the audit-log key itself to prevent infinite recursion, and skip
    // user-* / customer-* keys (those are storefront writes by the visitor).
    if (
      key !== "audit-log" &&
      !key.startsWith("user-") &&
      !key.startsWith("customer-") &&
      typeof window.location !== "undefined" &&
      window.location.pathname.startsWith("/admin")
    ) {
      // Lazy/async import to avoid circular dep with audit-log.
      import("./audit-log").then((m) => {
        const action = m.inferAction(prev, value)
        const meta: Record<string, unknown> = {}
        if (Array.isArray(value)) {
          meta.size = value.length
          if (Array.isArray(prev)) meta.delta = value.length - (prev as unknown[]).length
        }
        m.logActivity({
          module: m.prettifyKey(key),
          action,
          target: key,
          meta,
        })
      }).catch(() => { /* ignore */ })
    }
  } catch {
    /* quota exceeded etc — silent */
  }
}

function subscribe(key: string, cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === fullKey(key)) cb()
  }
  const onChange = (e: Event) => {
    const detail = (e as CustomEvent<{ key: string }>).detail
    if (detail?.key === key) cb()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(CHANGE_EVENT, onChange as EventListener)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange as EventListener)
  }
}

/* ---------- Hooks ---------- */

export function useCmsDoc<T>(key: string, defaults: T): [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    useCallback((cb) => subscribe(key, cb), [key]),
    () => readSnapshot<T>(key, defaults),
    () => defaults,
  )
  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(readRaw<T>(key, defaults)) : next
      writeRaw(key, resolved)
    },
    [key, defaults],
  )
  return [value, setValue]
}

export type CmsRecord = { id: string }

export function useCmsCollection<T extends CmsRecord>(
  key: string,
  defaults: T[] = [],
): {
  items: T[]
  upsert: (record: T) => void
  remove: (id: string) => void
  reorder: (ids: string[]) => void
  set: (next: T[]) => void
} {
  const [items, setItems] = useCmsDoc<T[]>(key, defaults)
  const upsert = useCallback(
    (record: T) => {
      setItems((prev) => {
        const idx = prev.findIndex((r) => r.id === record.id)
        if (idx === -1) return [...prev, record]
        const next = prev.slice()
        next[idx] = record
        return next
      })
    },
    [setItems],
  )
  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((r) => r.id !== id)),
    [setItems],
  )
  const reorder = useCallback(
    (ids: string[]) =>
      setItems((prev) => {
        const map = new Map(prev.map((r) => [r.id, r]))
        const ordered = ids.map((id) => map.get(id)).filter((r): r is T => Boolean(r))
        const missing = prev.filter((r) => !ids.includes(r.id))
        return [...ordered, ...missing]
      }),
    [setItems],
  )
  return { items, upsert, remove, reorder, set: setItems }
}

/* ---------- Imperative helpers (non-React contexts) ---------- */

function hasRaw(key: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(fullKey(key)) !== null
  } catch {
    return false
  }
}

export const cmsStore = {
  get: readRaw,
  set: writeRaw,
  has: hasRaw,
}

/* ---------- Utilities ---------- */

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

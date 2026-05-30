"use client"

/**
 * cms-store — hybrid CMS adapter (localStorage cache + NestJS source of truth).
 *
 * Public API is **unchanged** so every existing caller (~22 admin modules)
 * works without edits:
 *   - `useCmsDoc<T>(key, defaults)`
 *   - `useCmsCollection<T>(key, defaults)`
 *   - `cmsStore.get / set / has / subscribe`
 *
 * How it works:
 *   1. Reads are synchronous — they return the localStorage snapshot (or the
 *      provided fallback) and kick off a background fetch from
 *      `/api/v2/admin/cms/:key` the first time a key is touched in this tab.
 *   2. When the server response differs from the local cache, the snapshot
 *      cache is updated and a `cms-store:change` event is fired — components
 *      using `useSyncExternalStore` re-read automatically.
 *   3. Writes update localStorage + snapshot cache + fire the change event
 *      (synchronously, so the UI feels instant), then PUT to NestJS in the
 *      background. Failed PUTs are logged but don't roll back the UI.
 *
 * Keys prefixed with `user-` or `customer-` stay local-only (they're
 * per-visitor storefront state, not admin-managed CMS). The audit-log key
 * IS persisted to the server, but its own write does NOT re-fire the audit
 * recorder (that's the recursion guard).
 *
 * The Postgres swap is one file: replace the in-process Map in
 * `artifacts/api-nest/src/modules/admin-cms.module.ts` with a Drizzle-backed
 * implementation against `sql/00_admin_cms.sql`. No client changes needed.
 */

import { useCallback, useSyncExternalStore } from "react"

const NAMESPACE = "shaniidrx.cms"
const CHANGE_EVENT = "cms-store:change"
const API_BASE = "/api/v2/admin/cms"

function fullKey(key: string) {
  return `${NAMESPACE}.${key}`
}

/**
 * Per-visitor / storefront state stays local-only — never round-tripped.
 *
 * `audit-log` is also local-only because it's an append-only log that grows
 * to thousands of entries; PUTting the entire JSON blob on every admin
 * mutation would create runaway upload traffic. When the NestJS port adds a
 * dedicated `POST /admin/audit-log/events` append endpoint, drop it from
 * this list and switch `audit-log.ts` to call that endpoint directly.
 */
function isLocalOnly(key: string): boolean {
  return (
    key === "audit-log" ||
    key.startsWith("user-") ||
    key.startsWith("customer-")
  )
}

/**
 * Tracks the timestamp of the most recent local write per key. Used by
 * `hydrateFromServer` so that an in-flight GET that started before a local
 * write doesn't clobber the user's just-saved value when it resolves.
 */
const lastLocalWriteAt = new Map<string, number>()
const HYDRATE_GRACE_MS = 5_000

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
 */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>()
const hydrated = new Set<string>()
const inflight = new Map<string, Promise<void>>()

/**
 * Whether a value is worth seeding to the server. Empty arrays / objects /
 * strings (and nullish) are skipped so we never create spurious server records
 * for keys whose default is "nothing yet" — we only seed keys that carry real
 * default content (e.g. the message-templates seed).
 */
function isSeedable(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value as object).length > 0
  if (typeof value === "string") return value.length > 0
  return true
}

function fireChange(key: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }))
}

function writeLocal<T>(key: string, value: T): string | null {
  if (typeof window === "undefined") return null
  try {
    const json = JSON.stringify(value)
    window.localStorage.setItem(fullKey(key), json)
    return json
  } catch {
    return null
  }
}

async function hydrateFromServer(key: string, getSeed?: () => unknown): Promise<void> {
  if (isLocalOnly(key)) return
  if (hydrated.has(key)) return
  const existing = inflight.get(key)
  if (existing) return existing
  const p = (async () => {
    try {
      const res = await fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
        credentials: "include",
      })
      if (res.status === 404) {
        // Server has never heard of this key. If we have meaningful local /
        // default content (e.g. the message-templates seed), push it up so
        // server-side consumers — like the auto-send Communications pipeline,
        // which resolves templates by trigger — can actually read it. Without
        // this, default seeds only ever lived in the browser and the backend
        // silently skipped every send.
        const seed = getSeed?.()
        if (isSeedable(seed)) {
          void fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(seed),
          }).catch(() => {
            /* best-effort seed — UI already has the value */
          })
        }
        // Mark hydrated so we don't re-fetch every read.
        hydrated.add(key)
        return
      }
      if (!res.ok) return // leave un-hydrated to retry on next read
      const body = (await res.json()) as { value: unknown }
      // Guard against clobbering an optimistic local write that landed while
      // this request was in flight.
      const wroteAt = lastLocalWriteAt.get(key) ?? 0
      if (Date.now() - wroteAt < HYDRATE_GRACE_MS) {
        hydrated.add(key)
        return
      }
      const json = JSON.stringify(body.value)
      const cached = snapshotCache.get(key)
      if (!cached || cached.raw !== json) {
        snapshotCache.set(key, { raw: json, value: body.value })
        writeLocal(key, body.value)
        fireChange(key)
      }
      hydrated.add(key)
    } catch {
      // Network down — fall back to local cache; retry on next read.
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, p)
  return p
}

function readSnapshot<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  // Kick off background hydration the first time we touch this key. Pass a
  // lazy seed getter (current local value, else the caller's default) so that
  // if the server has no record yet, the default content is pushed up — this
  // is what makes admin-managed seeds (e.g. message-templates) readable by
  // server-side consumers, not just the browser.
  if (!hydrated.has(key) && !isLocalOnly(key)) {
    void hydrateFromServer(key, () => readRaw(key, fallback))
  }
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
    // Capture the previous value for audit-diff hints BEFORE we overwrite.
    let prev: unknown = undefined
    try {
      const before = window.localStorage.getItem(fullKey(key))
      if (before != null) prev = JSON.parse(before)
    } catch { /* ignore */ }

    const json = JSON.stringify(value)
    writeLocal(key, value)
    snapshotCache.set(key, { raw: json, value })
    lastLocalWriteAt.set(key, Date.now())
    fireChange(key)

    // Push to NestJS (fire-and-forget — UI already updated).
    if (!isLocalOnly(key)) {
      void fetch(`${API_BASE}/${encodeURIComponent(key)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: json,
      })
        .then((res) => {
          if (!res.ok) {
            // eslint-disable-next-line no-console
            console.warn(`cms-store PUT ${key} failed: ${res.status}`)
            return
          }
          hydrated.add(key) // server now knows about this key
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn(`cms-store PUT ${key} network error`, err)
        })
    }

    // Auto-audit: record any cmsStore mutation made under /admin/*. Skip the
    // audit-log key itself (recursion) and user-*/customer-* (storefront).
    if (
      key !== "audit-log" &&
      !key.startsWith("user-") &&
      !key.startsWith("customer-") &&
      typeof window.location !== "undefined" &&
      window.location.pathname.startsWith("/admin")
    ) {
      import("./audit-log")
        .then((m) => {
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
        })
        .catch(() => { /* ignore */ })
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
  subscribe,
  /** Force a re-hydrate from server for a key (useful after admin SSO etc). */
  refresh: (key: string) => {
    hydrated.delete(key)
    return hydrateFromServer(key)
  },
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

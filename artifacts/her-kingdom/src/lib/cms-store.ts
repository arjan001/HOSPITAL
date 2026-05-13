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

function writeRaw<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(fullKey(key), JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }))
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
    () => readRaw<T>(key, defaults),
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

export type CmsRecord = { id: string; [k: string]: unknown }

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

export const cmsStore = {
  get: readRaw,
  set: writeRaw,
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

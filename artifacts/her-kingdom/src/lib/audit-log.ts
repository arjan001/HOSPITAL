"use client"

/**
 * audit-log — append-only activity log for the admin panel.
 *
 * Every change made through cmsStore while the user is on `/admin/*` is
 * recorded automatically (see `cms-store.ts → writeRaw`). Modules can also
 * emit explicit events (login, logout, export, role change, danger ops)
 * by calling `logActivity({...})` directly.
 *
 * Storage: a single cmsStore key `audit-log` (so it tab-syncs and is
 * included in the eventual NestJS swap). Capped at MAX_ENTRIES — older
 * entries are evicted from the front (FIFO).
 */

import { useSyncExternalStore } from "react"
import { cmsStore } from "./cms-store"

const KEY = "audit-log"
const CHANGE_EVENT = "audit-log:change"
const MAX_ENTRIES = 2000
const ACTOR_KEY = "shaniidrx.admin.user"

export type AuditSeverity = "info" | "warning" | "danger"

export type AuditEntry = {
  id: string
  ts: number
  actorEmail: string
  actorRole: string
  module: string
  action: string
  target?: string
  meta?: Record<string, unknown>
  severity: AuditSeverity
  pathname?: string
}

/* ---------- Actor resolution ---------- */

type Actor = { email: string; role: string }

function readActor(): Actor {
  if (typeof window === "undefined") return { email: "system", role: "system" }
  try {
    const raw = window.localStorage.getItem(ACTOR_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Actor>
      if (parsed?.email) return { email: parsed.email, role: parsed.role || "admin" }
    }
  } catch { /* ignore */ }
  return { email: "admin@shaniidrx.local", role: "admin" }
}

/** Stash the current admin so audit entries are attributed correctly. */
export function setAuditActor(actor: Actor) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ACTOR_KEY, JSON.stringify(actor))
  } catch { /* ignore */ }
}

/* ---------- Public API ---------- */

export function logActivity(input: {
  module: string
  action: string
  target?: string
  meta?: Record<string, unknown>
  severity?: AuditSeverity
}) {
  if (typeof window === "undefined") return
  const actor = readActor()
  const entry: AuditEntry = {
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    actorEmail: actor.email,
    actorRole: actor.role,
    module: input.module,
    action: input.action,
    target: input.target,
    meta: input.meta,
    severity: input.severity ?? "info",
    pathname: window.location?.pathname,
  }
  const list = (cmsStore.get<AuditEntry[]>(KEY, []) ?? []) as AuditEntry[]
  const next = [...list, entry]
  // Evict oldest if over cap
  const trimmed = next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next
  cmsStore.set(KEY, trimmed)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  }
}

export function clearAuditLog() {
  if (typeof window === "undefined") return
  cmsStore.set(KEY, [])
  logActivity({
    module: "Audit Log",
    action: "clear",
    severity: "danger",
    meta: { note: "Audit log cleared by admin" },
  })
}

/* ---------- React hook ----------
 * useSyncExternalStore requires getSnapshot to return a referentially stable
 * value when nothing changed, otherwise React will infinite-loop. We cache by
 * the raw JSON string and only re-parse when localStorage actually changes.
 */

const EMPTY: AuditEntry[] = []
let cachedRaw: string | null | undefined = undefined
let cachedValue: AuditEntry[] = EMPTY

function readSnapshotCached(): AuditEntry[] {
  if (typeof window === "undefined") return EMPTY
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(`shaniidrx.cms.${KEY}`)
  } catch {
    return EMPTY
  }
  if (raw === cachedRaw) return cachedValue
  cachedRaw = raw
  if (raw == null) {
    cachedValue = EMPTY
  } else {
    try {
      const parsed = JSON.parse(raw) as AuditEntry[]
      cachedValue = Array.isArray(parsed) ? parsed : EMPTY
    } catch {
      cachedValue = EMPTY
    }
  }
  return cachedValue
}

function subscribeAudit(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const onChange = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === `shaniidrx.cms.${KEY}`) cb()
  }
  window.addEventListener(CHANGE_EVENT, onChange as EventListener)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange as EventListener)
    window.removeEventListener("storage", onStorage)
  }
}

export function useAuditLog(): AuditEntry[] {
  return useSyncExternalStore(subscribeAudit, readSnapshotCached, () => EMPTY)
}

/* ---------- Helpers ---------- */

/** Human-readable label for a cmsStore key (e.g. `website-settings` → `Website Settings`). */
export function prettifyKey(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/** Best-effort verb derivation from an array-vs-object payload. */
export function inferAction(prev: unknown, next: unknown): string {
  const prevArr = Array.isArray(prev)
  const nextArr = Array.isArray(next)
  if (prevArr && nextArr) {
    const a = prev as unknown[]
    const b = next as unknown[]
    if (b.length > a.length) return "create"
    if (b.length < a.length) return "delete"
    return "update"
  }
  return "update"
}

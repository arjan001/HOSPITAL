"use client"

/**
 * audit-log — client helper for append-only activity events.
 *
 * CMS mutations under /admin/* are auto-reported from cms-store. Modules may
 * also call `logActivity({...})` for explicit UI events (login, export, etc.).
 * All entries persist to Postgres via POST /api/v2/audit/events.
 */

const ACTOR_KEY = "shaniidrx.admin.user"

export type AuditSeverity = "info" | "warning" | "danger"

export type AuditEntry = {
  id: string
  ts: number
  actorEmail: string
  actorRole: string
  actorType?: string
  module: string
  action: string
  target?: string
  meta?: Record<string, unknown>
  severity: AuditSeverity
  pathname?: string
  httpMethod?: string
  path?: string
}

type Actor = { email: string; role: string }

function readActor(): Actor {
  if (typeof window === "undefined") return { email: "system", role: "system" }
  try {
    const raw = window.localStorage.getItem(ACTOR_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Actor>
      if (parsed?.email) return { email: parsed.email, role: parsed.role || "admin" }
    }
  } catch {
    /* ignore */
  }
  return { email: "admin@shaniidrx.local", role: "admin" }
}

/** Stash the current admin so client events are attributed correctly. */
export function setAuditActor(actor: Actor) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ACTOR_KEY, JSON.stringify(actor))
  } catch {
    /* ignore */
  }
}

async function postAuditEvent(input: {
  module: string
  action: string
  target?: string
  meta?: Record<string, unknown>
  severity?: AuditSeverity
  pathname?: string
}): Promise<void> {
  try {
    const { nestFetch } = await import("./api-nest")
    await nestFetch<{ ok: boolean }>("/audit/events", {
      method: "POST",
      body: JSON.stringify({
        module: input.module,
        action: input.action,
        target: input.target,
        meta: input.meta,
        severity: input.severity,
        pathname: input.pathname ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
      }),
    })
  } catch {
    /* fail-soft — audit must never break the UI */
  }
}

export function logActivity(input: {
  module: string
  action: string
  target?: string
  meta?: Record<string, unknown>
  severity?: AuditSeverity
}) {
  if (typeof window === "undefined") return
  void postAuditEvent({
    ...input,
    pathname: window.location?.pathname,
  })
}

/** Audit log is immutable server-side; kept for API compatibility. */
export function clearAuditLog() {
  logActivity({
    module: "Audit Log",
    action: "clear_requested",
    severity: "warning",
    meta: { note: "Audit log is append-only on the server" },
  })
}

/** @deprecated Server-backed audit — use useAdminAuditLog from api-nest. */
export function useAuditLog(): AuditEntry[] {
  return []
}

export function prettifyKey(key: string): string {
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

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

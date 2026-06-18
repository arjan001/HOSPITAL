/**
 * Resolve the acting user for audit entries from an Express request.
 *
 * Covers every auth path in api-nest:
 *   - Admin panel (signed admin token / env super-admin → req.adminUser)
 *   - Partner portals (signed partner token or Clerk bearer)
 *   - Storefront customers (session cookie → users row)
 *   - Guests (anonymous session id only)
 */
import type { Request } from "express"
import { eq } from "drizzle-orm"
import { db, users, partnerAccounts } from "@workspace/db"
import { verifyPartnerToken } from "./partner-token"

export type AuditActorType = "admin" | "customer" | "partner" | "guest" | "system"

export type AuditActor = {
  userId?: string
  email: string
  role: string
  type: AuditActorType
}

const PARTNER_TOKEN_COOKIE = "shaniidrx_partner_token"

function titleCase(s: string): string {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Best-effort synchronous actor (no DB). Used when async lookup is unavailable. */
export function resolveAuditActorSync(req: Request): AuditActor {
  const admin = req.adminUser
  if (admin?.id) {
    return {
      userId: admin.id,
      email: admin.email || admin.name || "admin",
      role: admin.role || "admin",
      type: "admin",
    }
  }

  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    PARTNER_TOKEN_COOKIE
  ]
  const headerToken =
    (req.header("x-partner-token") || "").trim() ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  const raw = headerToken || cookieToken || ""
  const partnerClaims = verifyPartnerToken(raw)
  if (partnerClaims) {
    return {
      userId: partnerClaims.pid,
      email: `partner:${partnerClaims.partnerType}`,
      role: partnerClaims.partnerType,
      type: "partner",
    }
  }

  const sid = req.sessionId
  if (sid) {
    return {
      userId: sid,
      email: `session:${sid.slice(0, 8)}`,
      role: "guest",
      type: "guest",
    }
  }

  return { email: "system", role: "system", type: "system" }
}

/** Full actor resolution with Postgres lookups for email/name. */
export async function resolveAuditActor(req: Request): Promise<AuditActor> {
  const admin = req.adminUser
  if (admin?.id) {
    return {
      userId: admin.id,
      email: admin.email || admin.name || "admin",
      role: admin.role || "admin",
      type: "admin",
    }
  }

  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    PARTNER_TOKEN_COOKIE
  ]
  const headerToken =
    (req.header("x-partner-token") || "").trim() ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  const raw = headerToken || cookieToken || ""
  const partnerClaims = verifyPartnerToken(raw)
  if (partnerClaims) {
    try {
      const [acc] = await db
        .select()
        .from(partnerAccounts)
        .where(eq(partnerAccounts.id, partnerClaims.pid))
        .limit(1)
      if (acc) {
        return {
          userId: acc.id,
          email: acc.email,
          role: String((acc.metadata as Record<string, unknown> | null)?.memberRole ?? acc.partnerType),
          type: "partner",
        }
      }
    } catch {
      /* fall through */
    }
    return {
      userId: partnerClaims.pid,
      email: `partner:${partnerClaims.partnerType}`,
      role: partnerClaims.partnerType,
      type: "partner",
    }
  }

  const sid = req.sessionId
  if (sid) {
    try {
      const [row] = await db.select().from(users).where(eq(users.clerkId, sid)).limit(1)
      if (row) {
        const email = row.email?.trim() || row.fullName?.trim() || `user:${row.id.slice(0, 8)}`
        return {
          userId: row.id,
          email,
          role: row.role || "customer",
          type: row.email || row.fullName ? "customer" : "guest",
        }
      }
    } catch {
      /* fall through */
    }
    return {
      userId: sid,
      email: `guest:${sid.slice(0, 8)}`,
      role: "guest",
      type: "guest",
    }
  }

  return { email: "system", role: "system", type: "system" }
}

export function clientIp(req: Request): string | undefined {
  const fwd = req.header("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]?.trim()
  return req.ip || undefined
}

/** Map `/api/v2/...` paths to a human module label for the audit UI. */
export function moduleFromPath(path: string): string {
  const clean = path.replace(/^\/api\/v2\/?/, "").split("?")[0] ?? ""
  const segments = clean.split("/").filter(Boolean)
  if (!segments.length) return "API"

  if (segments[0] === "admin") {
    const rest = segments.slice(1).map((s) => titleCase(s))
    return rest.length ? `Admin / ${rest.join(" / ")}` : "Admin"
  }
  if (segments[0] === "partners") {
    const portal = segments[1] ? titleCase(segments[1]) : "Partner"
    const rest = segments.slice(2).map((s) => titleCase(s))
    return rest.length ? `Partner ${portal} / ${rest.join(" / ")}` : `Partner ${portal} Portal`
  }
  return segments.map((s) => titleCase(s)).join(" / ")
}

export function actionFromMethod(method: string): string {
  const m = method.toUpperCase()
  if (m === "POST") return "create"
  if (m === "PUT" || m === "PATCH") return "update"
  if (m === "DELETE") return "delete"
  return m.toLowerCase()
}

/** Extract a stable target id from the URL when present. */
export function targetFromPath(path: string): string | undefined {
  const clean = path.replace(/^\/api\/v2\/?/, "").split("?")[0] ?? ""
  const segments = clean.split("/").filter(Boolean)
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i]!
    if (s.length >= 6 && /^[a-zA-Z0-9_-]+$/.test(s) && !/^(admin|partners|me|v2)$/i.test(s)) {
      return s
    }
  }
  return segments.length ? segments[segments.length - 1] : undefined
}

/** Compact, non-PII summary of a mutation body for auto-audit rows. */
export function summarizeBody(body: unknown): string | undefined {
  if (body == null) return undefined
  if (typeof body !== "object") return String(body).slice(0, 120)
  const o = body as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => !/password|secret|token|hash/i.test(k))
  if (!keys.length) return undefined
  const parts: string[] = []
  for (const k of keys.slice(0, 6)) {
    const v = o[k]
    if (v == null) continue
    if (typeof v === "string") parts.push(`${k}=${v.slice(0, 40)}`)
    else if (typeof v === "number" || typeof v === "boolean") parts.push(`${k}=${v}`)
    else if (Array.isArray(v)) parts.push(`${k}=[${v.length}]`)
    else parts.push(`${k}=…`)
  }
  return parts.join(", ").slice(0, 240) || undefined
}

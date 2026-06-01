/**
 * Audit module — server-side, append-only activity log.
 *
 * Why this exists:
 *   The storefront cmsStore captures CMS writes into a client-side audit log,
 *   but api-nest order/payment/prescription/consultation writes happen on the
 *   server and never touch cmsStore — so they were invisible to the audit page.
 *   This module persists those system actions to the `audit_log` Postgres table
 *   (single source of truth) and exposes them to the admin audit page.
 *
 * Design:
 *   - `@Global` so any service can `@Inject(AuditService)` without importing the
 *     module (mirrors ErrorReportingModule).
 *   - `record()` is fail-soft: an audit write must NEVER break the operation it
 *     is recording. Callers fire-and-forget.
 *   - The table is append-only — there is no delete endpoint here.
 */
import {
  Controller,
  Get,
  Global,
  Inject,
  Injectable,
  Module,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, sql } from "drizzle-orm"
import { db, auditLog } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, AnyAdmin } from "../common/admin-guard"

export type AuditSeverity = "info" | "warning" | "danger"

export interface AuditRecordInput {
  module: string
  action: string
  /** Target entity id or key (order no, payment ref, rx id, thread id). */
  key?: string
  summary?: string
  before?: unknown
  after?: unknown
  userId?: string
  ip?: string
  severity?: AuditSeverity
}

export interface AuditEntryDto {
  id: string
  ts: number
  module: string
  action: string
  target?: string
  summary?: string
  userId?: string
  ip?: string
  severity: AuditSeverity
  meta?: Record<string, unknown>
}

@Injectable()
export class AuditService {
  /**
   * Persist one audit entry. Fail-soft by contract: swallow every error so a
   * logging failure can never roll back or block the business operation.
   */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      await db.insert(auditLog).values({
        id: newId("aud"),
        userId: input.userId ?? null,
        module: input.module,
        action: input.action,
        key: input.key ?? null,
        summary: input.summary ?? null,
        severity: input.severity ?? deriveSeverity(input.action),
        before: input.before ?? null,
        after: input.after ?? null,
        ip: input.ip ?? null,
      })
    } catch {
      /* audit must never throw into the caller */
    }
  }

  async list(opts: {
    page?: number
    pageSize?: number
    module?: string
    action?: string
  }): Promise<{ items: AuditEntryDto[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Number(opts.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(opts.pageSize) || 50))
    const offset = (page - 1) * pageSize

    const filters = []
    if (opts.module) filters.push(eq(auditLog.module, opts.module))
    if (opts.action) filters.push(eq(auditLog.action, opts.action))
    const where = filters.length ? and(...filters) : undefined

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLog).where(where),
    ])

    const items: AuditEntryDto[] = rows.map((r) => ({
      id: r.id,
      ts: r.createdAt.getTime(),
      module: r.module,
      action: r.action,
      target: r.key ?? undefined,
      summary: r.summary ?? undefined,
      userId: r.userId ?? undefined,
      ip: r.ip ?? undefined,
      severity: isSeverity(r.severity) ? r.severity : deriveSeverity(r.action),
      meta:
        r.before || r.after
          ? { before: r.before ?? undefined, after: r.after ?? undefined }
          : undefined,
    }))

    return { items, total: Number(countRows[0]?.count ?? 0), page, pageSize }
  }
}

function isSeverity(v: unknown): v is AuditSeverity {
  return v === "info" || v === "warning" || v === "danger"
}

/** Destructive verbs surface as higher severity in the admin UI. */
function deriveSeverity(action: string): AuditSeverity {
  const a = action.toLowerCase()
  if (a.includes("delete") || a.includes("refund") || a.includes("reject")) return "danger"
  if (a.includes("update") || a.includes("status") || a.includes("dispatch")) return "warning"
  return "info"
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/audit")
class AuditController {
  constructor(@Inject(AuditService) private readonly svc: AuditService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("module") module?: string,
    @Query("action") action?: string,
  ) {
    void req
    return this.svc.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      module,
      action,
    })
  }
}

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

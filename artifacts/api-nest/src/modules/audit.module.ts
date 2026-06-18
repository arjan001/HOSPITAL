/**
 * Audit module — server-side, append-only activity log for every actor.
 *
 * Sources:
 *   - AuditInterceptor: auto-captures all successful POST/PUT/PATCH/DELETE
 *   - AuditService.record(): explicit business events (orders, payments, rx)
 *   - POST /audit/events: client-reported UI actions (admin CMS, exports)
 *
 * The `audit_log` Postgres table is the single source of truth.
 */
import {
  Body,
  Controller,
  Get,
  Global,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { AsyncLocalStorage } from "node:async_hooks"
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm"
import { db, auditLog } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, AnyAdmin } from "../common/admin-guard"
import {
  clientIp,
  resolveAuditActor,
  type AuditActor,
  type AuditActorType,
} from "../common/audit-actor"
import { AuditRequestScopeMiddleware } from "../common/audit-request-scope.middleware"

export type AuditSeverity = "info" | "warning" | "danger"

export interface AuditRecordInput {
  module: string
  action: string
  key?: string
  summary?: string
  before?: unknown
  after?: unknown
  userId?: string
  actorEmail?: string
  actorRole?: string
  actorType?: AuditActorType
  httpMethod?: string
  path?: string
  userAgent?: string
  ip?: string
  severity?: AuditSeverity
  /** internal: marks explicit business audit vs http interceptor */
  source?: "http" | "business" | "client"
}

export interface AuditEntryDto {
  id: string
  ts: number
  module: string
  action: string
  target?: string
  summary?: string
  userId?: string
  actorEmail?: string
  actorRole?: string
  actorType?: AuditActorType
  httpMethod?: string
  path?: string
  ip?: string
  severity: AuditSeverity
  meta?: Record<string, unknown>
}

const auditAls = new AsyncLocalStorage<{ recorded: boolean; actor?: AuditActor }>()

@Injectable()
export class AuditService {
  /** Run a handler with per-request audit dedupe scope (used by interceptor). */
  runInRequestScope<T>(fn: () => void): void {
    auditAls.run({ recorded: false }, fn)
  }

  setRequestActor(actor: AuditActor): void {
    const store = auditAls.getStore()
    if (store) store.actor = actor
  }

  getRequestActor(): AuditActor | undefined {
    return auditAls.getStore()?.actor
  }

  wasRecordedInRequest(): boolean {
    return auditAls.getStore()?.recorded === true
  }

  private markRecorded() {
    const store = auditAls.getStore()
    if (store) store.recorded = true
  }

  async record(input: AuditRecordInput): Promise<void> {
    const ctx = this.getRequestActor()
    try {
      await db.insert(auditLog).values({
        id: newId("aud"),
        userId: input.userId ?? ctx?.userId ?? null,
        actorEmail: input.actorEmail ?? ctx?.email ?? null,
        actorRole: input.actorRole ?? ctx?.role ?? null,
        actorType: input.actorType ?? ctx?.type ?? null,
        module: input.module,
        action: input.action,
        key: input.key ?? null,
        summary: input.summary ?? null,
        severity: input.severity ?? deriveSeverity(input.action),
        before: input.before ?? null,
        after: input.after ?? null,
        httpMethod: input.httpMethod ?? null,
        path: input.path ?? null,
        userAgent: input.userAgent ?? null,
        ip: input.ip ?? null,
      })
      this.markRecorded()
    } catch {
      /* audit must never throw into the caller */
    }
  }

  async recordFromRequest(
    req: Request,
    input: Omit<AuditRecordInput, "userId" | "actorEmail" | "actorRole" | "actorType" | "ip" | "userAgent"> &
      Partial<Pick<AuditRecordInput, "userId" | "actorEmail" | "actorRole" | "actorType" | "ip" | "userAgent">>,
  ): Promise<void> {
    const actor = await resolveAuditActor(req)
    await this.record({
      ...input,
      userId: input.userId ?? actor.userId,
      actorEmail: input.actorEmail ?? actor.email,
      actorRole: input.actorRole ?? actor.role,
      actorType: input.actorType ?? actor.type,
      ip: input.ip ?? clientIp(req),
      userAgent: input.userAgent ?? req.header("user-agent") ?? undefined,
      source: input.source ?? "business",
    })
  }

  async list(opts: {
    page?: number
    pageSize?: number
    module?: string
    action?: string
    actorType?: string
    actorEmail?: string
    search?: string
    since?: Date
    severity?: AuditSeverity
  }): Promise<{ items: AuditEntryDto[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Number(opts.page) || 1)
    const pageSize = Math.min(200, Math.max(1, Number(opts.pageSize) || 50))
    const offset = (page - 1) * pageSize

    const filters = []
    if (opts.module) filters.push(eq(auditLog.module, opts.module))
    if (opts.action) filters.push(eq(auditLog.action, opts.action))
    if (opts.actorType) filters.push(eq(auditLog.actorType, opts.actorType))
    if (opts.severity) filters.push(eq(auditLog.severity, opts.severity))
    if (opts.actorEmail?.trim()) {
      filters.push(ilike(auditLog.actorEmail, `%${opts.actorEmail.trim()}%`))
    }
    if (opts.since) filters.push(gte(auditLog.createdAt, opts.since))
    if (opts.search?.trim()) {
      const q = `%${opts.search.trim()}%`
      filters.push(
        or(
          ilike(auditLog.module, q),
          ilike(auditLog.action, q),
          ilike(auditLog.key, q),
          ilike(auditLog.summary, q),
          ilike(auditLog.actorEmail, q),
          ilike(auditLog.path, q),
        )!,
      )
    }
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
      actorEmail: r.actorEmail ?? undefined,
      actorRole: r.actorRole ?? undefined,
      actorType: (r.actorType as AuditActorType | null) ?? undefined,
      httpMethod: r.httpMethod ?? undefined,
      path: r.path ?? undefined,
      ip: r.ip ?? undefined,
      severity: isSeverity(r.severity) ? r.severity : deriveSeverity(r.action),
      meta:
        r.before || r.after
          ? { before: r.before ?? undefined, after: r.after ?? undefined }
          : undefined,
    }))

    return { items, total: Number(countRows[0]?.count ?? 0), page, pageSize }
  }

  async listModules(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ module: auditLog.module })
      .from(auditLog)
      .orderBy(auditLog.module)
    return rows.map((r) => r.module).filter(Boolean)
  }

  async listActions(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ action: auditLog.action })
      .from(auditLog)
      .orderBy(auditLog.action)
    return rows.map((r) => r.action).filter(Boolean)
  }
}

function isSeverity(v: unknown): v is AuditSeverity {
  return v === "info" || v === "warning" || v === "danger"
}

function deriveSeverity(action: string): AuditSeverity {
  const a = action.toLowerCase()
  if (a.includes("delete") || a.includes("refund") || a.includes("reject")) return "danger"
  if (a.includes("update") || a.includes("status") || a.includes("dispatch")) return "warning"
  return "info"
}

type ClientAuditBody = {
  module: string
  action: string
  target?: string
  meta?: Record<string, unknown>
  severity?: AuditSeverity
  pathname?: string
}

/** Any authenticated session (admin, customer, partner) may append client events. */
@Controller("audit")
class AuditEventsController {
  constructor(@Inject(AuditService) private readonly svc: AuditService) {}

  @Post("events")
  async append(@Req() req: Request, @Body() body: ClientAuditBody) {
    if (!body?.module?.trim() || !body?.action?.trim()) {
      throw new HttpException("module and action are required", HttpStatus.BAD_REQUEST)
    }
    const actor = await resolveAuditActor(req)
    if (actor.type === "system") {
      throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    }
    await this.svc.record({
      module: body.module.trim(),
      action: body.action.trim(),
      key: body.target?.trim() || undefined,
      summary: body.meta ? JSON.stringify(body.meta).slice(0, 500) : undefined,
      severity: body.severity,
      userId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      actorType: actor.type,
      path: body.pathname,
      ip: clientIp(req),
      userAgent: req.header("user-agent") ?? undefined,
      after: body.meta ?? undefined,
      source: "client",
    })
    return { ok: true }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/audit")
class AuditController {
  constructor(@Inject(AuditService) private readonly svc: AuditService) {}

  @Get()
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("module") module?: string,
    @Query("action") action?: string,
    @Query("actorType") actorType?: string,
    @Query("actorEmail") actorEmail?: string,
    @Query("search") search?: string,
    @Query("since") since?: string,
    @Query("severity") severity?: string,
  ) {
    return this.svc.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      module,
      action,
      actorType,
      actorEmail,
      search,
      since: since ? new Date(since) : undefined,
      severity: isSeverity(severity) ? severity : undefined,
    })
  }

  @Get("modules")
  modules() {
    return this.svc.listModules()
  }

  @Get("actions")
  actions() {
    return this.svc.listActions()
  }
}

@Global()
@Module({
  controllers: [AuditController, AuditEventsController],
  providers: [AuditService, AuditRequestScopeMiddleware],
  exports: [AuditService, AuditRequestScopeMiddleware],
})
export class AuditModule {}

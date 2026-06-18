/**
 * Global audit interceptor — records every successful mutating API call.
 *
 * Captures admin, customer, partner, and guest CRUD across all Nest modules.
 * Skips noisy/system routes (health, webhooks, audit append). Defers to explicit
 * AuditService.record() calls in the same request (AsyncLocalStorage flag).
 */
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request, Response } from "express"
import { from, Observable, switchMap, tap } from "rxjs"
import { AuditService } from "../modules/audit.module"
import {
  actionFromMethod,
  clientIp,
  moduleFromPath,
  resolveAuditActor,
  summarizeBody,
  targetFromPath,
} from "./audit-actor"

export const AUDIT_SKIP_KEY = "audit-skip"
/** Opt out of auto HTTP audit on a handler (e.g. high-volume webhooks). */
export const SkipAudit = () => SetMetadata(AUDIT_SKIP_KEY, true)

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

const SKIP_PATH_PREFIXES = [
  "/api/v2/health",
  "/api/v2/monitoring",
  "/api/v2/audit/events",
  "/api/v2/admin/audit",
  "/api/v2/paystack/webhook",
  "/api/v2/whatsapp/webhook",
  "/api/v2/notifications/whatsapp/webhook",
]

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== "http") return next.handle()

    const skip = this.reflector.getAllAndOverride<boolean>(AUDIT_SKIP_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (skip) return next.handle()

    const http = ctx.switchToHttp()
    const req = http.getRequest<Request>()
    const res = http.getResponse<Response>()
    const method = (req.method || "GET").toUpperCase()
    const path = req.originalUrl || req.url || ""
    const body = req.body
    const shouldRecord =
      MUTATING.has(method) && !SKIP_PATH_PREFIXES.some((p) => path.startsWith(p))

    return from(resolveAuditActor(req)).pipe(
      switchMap((actor) => {
        this.audit.setRequestActor(actor)
        if (!shouldRecord) return next.handle()
        return next.handle().pipe(
          tap({
            next: () => {
              if (res.statusCode >= 400) return
              void this.recordHttp(req, method, path, body, actor)
            },
          }),
        )
      }),
    )
  }

  private async recordHttp(
    req: Request,
    method: string,
    path: string,
    body: unknown,
    actor: Awaited<ReturnType<typeof resolveAuditActor>>,
  ): Promise<void> {
    if (this.audit.wasRecordedInRequest()) return

    const action = actionFromMethod(method)
    const target = targetFromPath(path)
    const summary = summarizeBody(body)

    await this.audit.record({
      module: moduleFromPath(path),
      action,
      key: target,
      summary,
      userId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
      actorType: actor.type,
      httpMethod: method,
      path: path.split("?")[0],
      userAgent: req.header("user-agent") ?? undefined,
      ip: clientIp(req),
      after: body && typeof body === "object" ? sanitizeBody(body) : undefined,
      source: "http",
    })
  }
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body
  const o = { ...(body as Record<string, unknown>) }
  for (const k of Object.keys(o)) {
    if (/password|secret|token|hash|authorization/i.test(k)) o[k] = "[redacted]"
  }
  return o
}

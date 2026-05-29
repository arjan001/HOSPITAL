/**
 * Global exception filter — the single safety net for the whole api-nest app.
 *
 * Why this exists:
 *   Without a catch-all filter, an unhandled error in any controller/service
 *   produces an unstructured 500 and (in dev) leaks a stack trace to the client.
 *   This filter:
 *     1. Normalises EVERY error into a clean JSON envelope with a stable
 *        `errorId` the client can quote when reporting a problem.
 *     2. Never leaks internal stack traces for 5xx errors.
 *     3. Records every server-side (5xx / non-HTTP) error into the monitoring
 *        store so the audit/observability layer captures all system-triggered
 *        errors for later reference and fixes.
 *
 * Registered via APP_FILTER in app.module.ts so Nest applies it globally.
 *
 * NestJS rule: explicit @Inject() because tsx/esbuild does not emit
 * emitDecoratorMetadata.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { randomUUID } from "node:crypto"
import { MonitoringService } from "../modules/monitoring.module"

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter")

  constructor(
    @Inject(MonitoringService) private readonly monitoring: MonitoringService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()
    const errorId = randomUUID()

    const isHttp = exception instanceof HttpException
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    // Derive a client-safe message. For ANY 5xx (including HttpExceptions such
    // as InternalServerErrorException whose message may carry internal detail)
    // we never echo internals — only a generic message goes to the client; the
    // full detail is logged + recorded into monitoring below.
    let message: string
    if (status >= 500) {
      message = "Internal server error"
    } else if (isHttp) {
      const resp = exception.getResponse()
      if (typeof resp === "string") {
        message = resp
      } else if (resp && typeof resp === "object") {
        const m = (resp as { message?: unknown }).message
        message = Array.isArray(m)
          ? m.join(", ")
          : typeof m === "string"
            ? m
            : exception.message
      } else {
        message = exception.message
      }
    } else {
      message = "Internal server error"
    }

    const where = `${req.method} ${req.originalUrl ?? req.url}`

    // Capture all server-side failures into monitoring (the system-error log).
    if (status >= 500) {
      const err =
        exception instanceof Error ? exception : new Error(String(exception))
      this.logger.error(`[${errorId}] ${where} → ${status}: ${err.message}`, err.stack)
      this.monitoring.recordServerError({
        message: err.message || "Internal server error",
        errorType: err.name || "Error",
        stack: err.stack,
        url: where,
        level: "error",
        context: {
          errorId,
          status,
          sessionId: (req as Request & { sessionId?: string }).sessionId,
        },
      })
    } else if (status >= 400) {
      // Client errors are logged at warn but not treated as system incidents.
      this.logger.warn(`[${errorId}] ${where} → ${status}: ${message}`)
    }

    // Guard against double-send if headers already went out.
    if (res.headersSent) return

    res.status(status).json({
      statusCode: status,
      error: message,
      errorId,
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
    })
  }
}

import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import express, { type Request, type Response, type NextFunction } from "express"
import cookieParser from "cookie-parser"
import { assertBootEnv } from "./boot-env"

// Secret used to HMAC-sign the session cookie. In production it MUST be set so
// session IDs can't be forged; in dev we fall back to a stable value (matching
// the ADMIN_API_TOKEN dev-fallback convention).
const DEV_SESSION_SECRET = "shaniidrx-dev-session-secret-change-me"
const SESSION_SECRET = process.env["SESSION_SECRET"] || DEV_SESSION_SECRET

async function bootstrap() {
  // Run before AppModule import so Replit deploy logs show a clear fatal reason
  // instead of an opaque module-load crash when secrets are missing.
  assertBootEnv({ sessionSecret: SESSION_SECRET, devSessionSecret: DEV_SESSION_SECRET })

  const { AppModule } = await import("./app.module")
  const { UPLOAD_DISK_ROOT, UPLOAD_URL_PREFIX } = await import("./common/storage")
  const { MonitoringService } = await import("./modules/monitoring.module")

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: true, credentials: true },
    logger: ["log", "error", "warn"],
    // `rawBody: true` makes the raw request body Buffer available on
    // `req.rawBody` so webhook receivers (Paystack, Clerk, etc.) can verify
    // HMAC signatures over the bytes the provider actually sent — JSON
    // re-stringification is not safe because object key order isn't stable.
    rawBody: true,
  })
  // Pass the secret so cookies set with `{ signed: true }` are HMAC-signed and
  // verified into req.signedCookies.
  app.use(cookieParser(SESSION_SECRET))

  // Bump body limit to ~8MB so base64-encoded prescription uploads
  // (5MB raw → ~6.7MB encoded) fit comfortably. When we move to direct
  // browser → S3 presigned-PUT uploads this can go back to defaults.
  app.use(express.json({ limit: "8mb" }))
  app.use(express.urlencoded({ extended: true, limit: "8mb" }))

  // Public storefront media (product images/videos). Same disk root as PII
  // uploads but no session gate — URLs are served at `/uploads/...` for
  // backward compatibility with the legacy api-server contract.
  app.use("/uploads", express.static(UPLOAD_DISK_ROOT, { index: false }))

  // Session-gated reads for PII uploads (prescription scans). Mounted at
  // the URL prefix that `common/storage.ts` returns from `put()`.
  // `fallthrough: true` (the default) lets non-GET/HEAD requests pass through
  // to the Nest router so `POST /api/v2/uploads` still hits UploadsController.
  app.use(
    UPLOAD_URL_PREFIX,
    (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next()
      // Signed cookies live in req.signedCookies after cookie-parser verifies
      // the HMAC; a forged cookie will not be present here.
      if (!req.signedCookies?.["shaniidrx_sid"]) {
        return res.status(401).json({ error: "Session required" })
      }
      return next()
    },
    express.static(UPLOAD_DISK_ROOT, { index: false }),
  )

  app.setGlobalPrefix("api/v2")
  // NOTE: We deliberately skip Nest's ValidationPipe to avoid pulling in
  // class-validator/class-transformer. Each controller validates its own
  // request shape; when we move to Zod DTOs we'll wire nestjs-zod here.

  // Process-level safety net: capture errors that escape the request lifecycle
  // (background tasks, fire-and-forget promises) into the monitoring store so
  // NO system-triggered error goes unrecorded. We log and record but do NOT
  // exit — a single rejected promise shouldn't take the whole API down under
  // load.
  const monitoring = app.get(MonitoringService)
  process.on("unhandledRejection", (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason))
    console.error("[api-nest] unhandledRejection", err)
    monitoring.recordServerError({
      message: err.message,
      errorType: "UnhandledRejection",
      stack: err.stack,
      level: "error",
      context: { kind: "unhandledRejection" },
    })
  })
  process.on("uncaughtException", (err: Error) => {
    console.error("[api-nest] uncaughtException", err)
    monitoring.recordServerError({
      message: err.message,
      errorType: "UncaughtException",
      stack: err.stack,
      level: "fatal",
      context: { kind: "uncaughtException" },
    })
  })

  const port = Number(process.env["PORT"] ?? 8090)
  await app.listen(port, "0.0.0.0")
  console.log(`[api-nest] listening on :${port} (prefix /api/v2)`)
}

bootstrap().catch((err) => {
  console.error("[api-nest] failed to start", err)
  process.exit(1)
})

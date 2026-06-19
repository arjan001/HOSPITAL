import "reflect-metadata"
import express, { type Request, type Response, type NextFunction } from "express"
import { NestFactory } from "@nestjs/core"
import { ExpressAdapter } from "@nestjs/platform-express"
import type { NestExpressApplication } from "@nestjs/platform-express"
import cookieParser from "cookie-parser"
import { assertBootEnv } from "./boot-env"
import { listenEarly, mountEarlyHealth } from "./early-health"

// Secret used to HMAC-sign the session cookie. In production it MUST be set so
// session IDs can't be forged; in dev we fall back to a stable value (matching
// the ADMIN_API_TOKEN dev-fallback convention).
const DEV_SESSION_SECRET = "shaniidrx-dev-session-secret-change-me"
const SESSION_SECRET = process.env["SESSION_SECRET"] || DEV_SESSION_SECRET

async function bootstrap() {
  assertBootEnv({ sessionSecret: SESSION_SECRET, devSessionSecret: DEV_SESSION_SECRET })

  const port = Number(process.env["PORT"] ?? 8090)

  // Open the port BEFORE loading AppModule so Replit deploy health checks pass
  // while Nest is still wiring hundreds of routes (~1–2s on cold start).
  const expressApp = express()
  const { setReady } = mountEarlyHealth(expressApp)
  await listenEarly(expressApp, port)

  const { AppModule } = await import("./app.module")
  const { UPLOAD_DISK_ROOT, UPLOAD_URL_PREFIX } = await import("./common/storage")
  const { MonitoringService } = await import("./modules/monitoring.module")

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      cors: { origin: true, credentials: true },
      logger: ["log", "error", "warn"],
      rawBody: true,
    },
  )

  app.use(cookieParser(SESSION_SECRET))
  app.use(express.json({ limit: "8mb" }))
  app.use(express.urlencoded({ extended: true, limit: "8mb" }))
  app.use("/uploads", express.static(UPLOAD_DISK_ROOT, { index: false }))

  app.use(
    UPLOAD_URL_PREFIX,
    (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next()
      if (!req.signedCookies?.["shaniidrx_sid"]) {
        return res.status(401).json({ error: "Session required" })
      }
      return next()
    },
    express.static(UPLOAD_DISK_ROOT, { index: false }),
  )

  app.setGlobalPrefix("api/v2")

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

  await app.init()
  setReady()
  console.log(`[api-nest] ready on :${port} (prefix /api/v2)`)
}

bootstrap().catch((err) => {
  console.error("[api-nest] failed to start", err)
  process.exit(1)
})

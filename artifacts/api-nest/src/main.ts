import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import express from "express"
import cookieParser from "cookie-parser"
import { AppModule } from "./app.module"
import { UPLOAD_DISK_ROOT, UPLOAD_URL_PREFIX } from "./common/storage"

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: true, credentials: true },
    logger: ["log", "error", "warn"],
  })
  app.use(cookieParser())

  // Bump body limit to ~8MB so base64-encoded prescription uploads
  // (5MB raw → ~6.7MB encoded) fit comfortably. When we move to direct
  // browser → S3 presigned-PUT uploads this can go back to defaults.
  app.use(express.json({ limit: "8mb" }))
  app.use(express.urlencoded({ extended: true, limit: "8mb" }))

  // Serve uploaded files from the local-disk Storage backend. Mounted at
  // the same URL prefix that `common/storage.ts` returns from `put()`.
  // Files here are PII (prescription scans) so we require a session cookie
  // before serving any byte — URLs are unguessable but should not be
  // bearer-secrets. When swapping to S3, drop this mount and switch to
  // private-bucket + signedUrl() instead.
  // `fallthrough: true` (the default) lets non-GET/HEAD requests pass through
  // to the Nest router so `POST /api/v2/uploads` still hits UploadsController.
  app.use(
    UPLOAD_URL_PREFIX,
    (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next()
      if (!req.cookies?.["shaniidrx_sid"]) {
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

  const port = Number(process.env["PORT"] ?? 8090)
  await app.listen(port, "0.0.0.0")
  console.log(`[api-nest] listening on :${port} (prefix /api/v2)`)
}

bootstrap().catch((err) => {
  console.error("[api-nest] failed to start", err)
  process.exit(1)
})

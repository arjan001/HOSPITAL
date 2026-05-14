import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import cookieParser from "cookie-parser"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: true, credentials: true },
    logger: ["log", "error", "warn"],
  })
  app.use(cookieParser())
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

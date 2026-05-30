/**
 * Uploads module — binary file storage for the NestJS backend (Postgres-tracked).
 *
 * Routes:
 *   POST /api/v2/uploads   — accept a base64-encoded file and persist it via the
 *                            Storage seam. Returns { url, key }.
 *
 * Storage:
 *   The bytes go through `common/storage.ts` (local disk today, S3/Cloudinary
 *   when configured). Each upload is also recorded as a row in the `uploads`
 *   table (key → owning userId), so downstream modules can confirm a
 *   client-supplied storage key actually belongs to the requesting session
 *   before binding it to a record (e.g. a prescription scan). This ownership
 *   record is now durable across restarts.
 *
 * Body limit:
 *   main.ts raises express.json({ limit: "8mb" }) so base64-encoded prescription
 *   scans fit without truncation.
 *
 * Note on @Inject(UploadsService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { eq } from "drizzle-orm"
import { db, uploads } from "@workspace/db"
import { getStorage, type Storage } from "../common/storage"
import { ensureUserId } from "../common/session-user"
import { newId } from "../common/repository"

type UploadBody = {
  namespace?: string
  filename?: string
  contentType?: string
  /** base64-encoded file body (no `data:...;base64,` prefix). */
  data?: string
}

const MAX_BYTES = 6 * 1024 * 1024 // 6MB — base64 expands ~33%; matches storefront 5MB UI limit
const ALLOWED_NAMESPACES = new Set(["prescriptions", "consultations", "general"])
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])

// Simple in-memory sliding-window rate limit keyed by sessionId. The global
// rate-limit middleware also guards this route; this is a tighter per-session
// upload cap and is intentionally process-local (transient, not business data).
const RL_WINDOW_MS = 60_000
const RL_MAX = 20
const rlHits = new Map<string, number[]>()
function checkRateLimit(sid: string): boolean {
  const now = Date.now()
  const hits = (rlHits.get(sid) ?? []).filter((t) => now - t < RL_WINDOW_MS)
  if (hits.length >= RL_MAX) return false
  hits.push(now)
  rlHits.set(sid, hits)
  return true
}

@Injectable()
class UploadsService {
  /** True when `key` was uploaded by `sid` (resolved to its durable userId). */
  async ownsKey(sid: string, key: string): Promise<boolean> {
    if (!sid || !key) return false
    const uid = await ensureUserId(sid)
    const rows = await db.select({ userId: uploads.userId }).from(uploads).where(eq(uploads.key, key)).limit(1)
    return !!rows[0] && rows[0].userId === uid
  }

  async putBase64(sid: string, body: UploadBody): Promise<{ url: string; key: string; size: number }> {
    if (!checkRateLimit(sid)) {
      throw new HttpException("Too many uploads — try again in a minute", HttpStatus.TOO_MANY_REQUESTS)
    }
    const namespace = ALLOWED_NAMESPACES.has(String(body.namespace ?? "")) ? String(body.namespace) : "general"
    const filename = String(body.filename ?? "attachment").slice(0, 120)
    const contentType = String(body.contentType ?? "application/octet-stream")
    if (!ALLOWED_TYPES.has(contentType)) {
      throw new HttpException(`Unsupported file type: ${contentType}`, HttpStatus.BAD_REQUEST)
    }
    const raw = String(body.data ?? "").replace(/^data:[^;]+;base64,/, "")
    if (!raw) throw new HttpException("Missing file data", HttpStatus.BAD_REQUEST)

    let buf: Buffer
    try {
      buf = Buffer.from(raw, "base64")
    } catch {
      throw new HttpException("Invalid base64 payload", HttpStatus.BAD_REQUEST)
    }
    if (buf.byteLength === 0) throw new HttpException("Empty file", HttpStatus.BAD_REQUEST)
    if (buf.byteLength > MAX_BYTES) {
      throw new HttpException(`File too large (max ${MAX_BYTES} bytes)`, HttpStatus.PAYLOAD_TOO_LARGE)
    }

    const storage: Storage = getStorage()
    const { url, key } = await storage.put(namespace, filename, buf, contentType)
    const uid = await ensureUserId(sid)
    await db.insert(uploads).values({
      id: newId("upl"),
      userId: uid,
      namespace,
      filename,
      contentType,
      sizeBytes: buf.byteLength,
      url,
      key,
    })
    return { url, key, size: buf.byteLength }
  }
}

@Controller("uploads")
class UploadsController {
  constructor(@Inject(UploadsService) private readonly svc: UploadsService) {}

  @Post()
  async upload(@Req() req: Request, @Body() body: UploadBody) {
    return this.svc.putBase64(req.sessionId, body ?? {})
  }
}

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

export { UploadsService }

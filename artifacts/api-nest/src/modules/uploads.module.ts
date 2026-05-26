/**
 * Uploads module — binary file storage for the NestJS backend.
 *
 * Routes:
 *   POST /api/v2/uploads   — accept a base64-encoded file and persist it
 *                            via the Storage seam. Returns { url, key }.
 *
 * Storage:
 *   Uses `common/storage.ts` (local disk today, S3 later).
 *   Uploaded files are served back from UPLOAD_URL_PREFIX (/api/v2/uploads/*)
 *   via express.static in main.ts, gated by the shaniidrx_sid session cookie.
 *
 * Body limit:
 *   main.ts raises express.json({ limit: "8mb" }) so base64-encoded
 *   prescription scans (~5 MB raw → ~6.7 MB encoded) fit without truncation.
 *
 * S3 swap path:
 *   1. Implement S3Storage in common/storage.ts.
 *   2. Return it from getStorage() when AWS_S3_BUCKET is set.
 *   3. Remove the express.static mount in main.ts.
 *   4. No changes to this controller needed.
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
import { getStorage, type Storage } from "../common/storage"

/**
 * Generic upload endpoint for the NestJS backend.
 *
 * Why JSON+base64 instead of multipart/form-data? It keeps api-nest free of
 * multer / @nestjs/platform-express's file-interceptor wiring. The seam
 * around `getStorage()` is the part that matters — swapping to direct
 * browser → S3 presigned-PUT uploads later (which is what you want for
 * large files anyway) only changes the *transport*, not the persistence.
 *
 * Today this is wired into the prescription upload flow on the storefront.
 * Per-session auth runs ahead of this in the global `SessionMiddleware`.
 */

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

// Simple in-memory sliding-window rate limit keyed by sessionId. Swap to
// Redis/Postgres-backed counter when the strangler migration of the legacy
// rate limiter lands.
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
  constructor() {}

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
})
export class UploadsModule {}

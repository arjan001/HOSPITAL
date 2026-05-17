import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

/**
 * Storage seam for binary uploads served by the NestJS backend
 * (prescription files today, anything else later).
 *
 * Mirror of `artifacts/api-server/src/lib/storage.ts` — kept as its own
 * file inside api-nest so api-nest has no source-time dependency on the
 * legacy server. The contract is identical.
 *
 * To switch to S3: implement an `S3Storage` class against
 * `@aws-sdk/client-s3` and return it from `getStorage()` when
 * `process.env.AWS_S3_BUCKET` is set. For prescription PII you'll likely
 * want a *private* bucket + `signedUrl()` — the local-disk impl below
 * serves files statically because that's the cheapest dev path.
 */

export type PutResult = { url: string; key: string }

export interface Storage {
  put(namespace: string, originalName: string, body: Buffer, contentType: string): Promise<PutResult>
  delete(key: string): Promise<void>
  signedUrl?(key: string, ttlSeconds?: number): Promise<string>
}

export const UPLOAD_DISK_ROOT = path.resolve(process.cwd(), ".uploads")
// URLs are absolute under the api-nest global prefix. The static mount in
// `main.ts` serves bytes from disk at this exact path.
export const UPLOAD_URL_PREFIX = "/api/v2/uploads"

function safeNamespace(ns: string): string {
  const cleaned = ns.replace(/[^a-z0-9_\-]/gi, "").slice(0, 80)
  return cleaned || "general"
}

// Extension comes from the validated MIME type ONLY (never from the
// user-supplied filename) to close a stored-XSS vector where a filename
// like `payload.html` combined with `contentType: image/png` would otherwise
// be served back from the same origin as executable HTML.
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
}

function safeExt(_originalName: string, contentType: string): string {
  return MIME_EXT[contentType] ?? ".bin"
}

class LocalDiskStorage implements Storage {
  async put(namespace: string, originalName: string, body: Buffer, contentType: string): Promise<PutResult> {
    const ns = safeNamespace(namespace)
    const ext = safeExt(originalName, contentType)
    const stem = crypto.randomBytes(8).toString("hex")
    const key = `${ns}/${Date.now()}-${stem}${ext}`
    const fullPath = path.join(UPLOAD_DISK_ROOT, key)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, body)
    return { url: `${UPLOAD_URL_PREFIX}/${key}`, key }
  }

  async delete(key: string): Promise<void> {
    const safeKey = key.replace(/^\/+/, "").replace(/\.\./g, "")
    const fullPath = path.join(UPLOAD_DISK_ROOT, safeKey)
    await fs.unlink(fullPath).catch(() => undefined)
  }
}

let _instance: Storage | null = null

export function getStorage(): Storage {
  if (_instance) return _instance
  _instance = new LocalDiskStorage()
  return _instance
}

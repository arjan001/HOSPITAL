import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"

/**
 * Storage seam for binary uploads (product images today, anything else later).
 *
 * This file is intentionally the ONLY place that knows how/where bytes are
 * persisted. Today we write to a local `.uploads/` directory and serve it
 * statically. When we move to S3, do all of these in this file and nothing
 * else needs to change:
 *
 *   1. Add an `S3Storage` class that implements the `Storage` interface
 *      using `@aws-sdk/client-s3` (PutObjectCommand / DeleteObjectCommand)
 *      and `@aws-sdk/s3-request-presigner` for `signedUrl`.
 *   2. In `getStorage()` below, return `new S3Storage(...)` when
 *      `process.env.AWS_S3_BUCKET` is set.
 *   3. Remove (or keep for dev) the `app.use("/uploads", express.static(...))`
 *      mount in `app.ts` — S3 URLs are absolute and don't need a proxy.
 *
 * No upload-site code needs to change because callers only see the
 * `{ url, key }` contract.
 */

export type PutResult = { url: string; key: string }

export interface Storage {
  /**
   * Persist `body` under `namespace/<unique>.<ext>` and return a public
   * URL plus the storage key (the key is what you pass back to `delete`).
   */
  put(namespace: string, originalName: string, body: Buffer, contentType: string): Promise<PutResult>
  delete(key: string): Promise<void>
  /** Optional — only implemented by signed-URL backends (S3). */
  signedUrl?(key: string, ttlSeconds?: number): Promise<string>
}

// `.uploads/` lives at the api-server package root so multiple workspaces
// can't collide on the same directory. Gitignored — see api-server/.gitignore.
export const UPLOAD_DISK_ROOT = path.resolve(process.cwd(), ".uploads")
export const UPLOAD_URL_PREFIX = "/uploads"

function safeNamespace(ns: string): string {
  const cleaned = ns.replace(/[^a-z0-9_\-]/gi, "").slice(0, 80)
  return cleaned || "general"
}

// Extension is derived from the validated MIME type ONLY, never from the
// user-supplied filename. Filenames can carry `.html` while the MIME claims
// `image/png` — serving that back same-origin is a stored-XSS vector.
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/quicktime": ".mov",
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
  // const bucket = process.env.AWS_S3_BUCKET
  // if (bucket) { _instance = new S3Storage(bucket, process.env.AWS_REGION!); return _instance }
  _instance = new LocalDiskStorage()
  return _instance
}

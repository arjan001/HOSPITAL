import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v2 as cloudinary } from "cloudinary"

/**
 * Storage seam for binary uploads served by the NestJS backend
 * (prescription files today, anything else later).
 *
 * One interface, three interchangeable backends:
 *   - LocalDiskStorage  — writes to `.uploads/`, served by the static mount in
 *                         main.ts. The default / dev backend.
 *   - S3Storage         — any S3-compatible object store (AWS S3, Cloudflare R2,
 *                         DigitalOcean Spaces, MinIO …) via a custom endpoint.
 *   - CloudinaryStorage — Cloudinary upload/delivery.
 *
 * Provider selection (no upload-site code changes — callers only see getStorage()):
 *   1. The admin Settings → Storage tab persists `{ provider }` to the cms
 *      `storage` doc. `StorageModule` registers a resolver so getStorage()
 *      reads that selection live.
 *   2. `STORAGE_PROVIDER` env acts as a default/override when no cms selection
 *      exists.
 *   3. Credentials live ONLY in env (never cmsStore). When the selected
 *      provider is not fully configured, getStorage() falls back to local disk
 *      (getStorageStatus().fellBack flags this) so uploads never hard-fail.
 *
 * Env:
 *   STORAGE_PROVIDER          local | s3 | cloudinary
 *   S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *   S3_PUBLIC_BASE_URL, S3_FORCE_PATH_STYLE
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

export type StorageProvider = "local" | "s3" | "cloudinary"
export type PutResult = { url: string; key: string }
export type ReadResult = { body: Buffer; contentType: string }

export interface Storage {
  put(namespace: string, originalName: string, body: Buffer, contentType: string): Promise<PutResult>
  delete(key: string): Promise<void>
  /**
   * Read a stored object's bytes by key. Returns null when the key does not
   * resolve to a file. Used by gated, per-owner file routes (e.g. serving a
   * prescription scan only to the patient who uploaded it).
   */
  read(key: string): Promise<ReadResult | null>
  signedUrl?(key: string, ttlSeconds?: number): Promise<string>
}

// Reverse of MIME_EXT — infer a content type from the stored key's extension
// so reads send the right `Content-Type` even though we don't store metadata
// on disk.
const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
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

function buildKey(namespace: string, originalName: string, contentType: string): string {
  const ns = safeNamespace(namespace)
  const ext = safeExt(originalName, contentType)
  const stem = crypto.randomBytes(8).toString("hex")
  return `${ns}/${Date.now()}-${stem}${ext}`
}

/* ---------- local disk ---------- */

class LocalDiskStorage implements Storage {
  async put(namespace: string, originalName: string, body: Buffer, contentType: string): Promise<PutResult> {
    const key = buildKey(namespace, originalName, contentType)
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

  async read(key: string): Promise<ReadResult | null> {
    // Normalize away any path-traversal attempt, then confirm the resolved
    // path is still inside UPLOAD_DISK_ROOT before reading a byte.
    const safeKey = key.replace(/^\/+/, "").replace(/\.\./g, "")
    const fullPath = path.resolve(UPLOAD_DISK_ROOT, safeKey)
    if (fullPath !== UPLOAD_DISK_ROOT && !fullPath.startsWith(UPLOAD_DISK_ROOT + path.sep)) {
      return null
    }
    try {
      const body = await fs.readFile(fullPath)
      const ext = path.extname(fullPath).toLowerCase()
      return { body, contentType: EXT_MIME[ext] ?? "application/octet-stream" }
    } catch {
      return null
    }
  }
}

/* ---------- S3-compatible ---------- */

class S3Storage implements Storage {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicBase?: string

  constructor() {
    this.bucket = (process.env["S3_BUCKET"] || "").trim()
    const base = (process.env["S3_PUBLIC_BASE_URL"] || "").trim().replace(/\/+$/, "")
    this.publicBase = base || undefined
    const endpoint = (process.env["S3_ENDPOINT"] || "").trim() || undefined
    const forcePathStyle =
      process.env["S3_FORCE_PATH_STYLE"] === "1" ||
      process.env["S3_FORCE_PATH_STYLE"] === "true" ||
      // custom endpoints (R2/MinIO/Spaces) generally need path-style addressing
      !!endpoint
    this.client = new S3Client({
      region: (process.env["S3_REGION"] || "us-east-1").trim(),
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId: (process.env["S3_ACCESS_KEY_ID"] || "").trim(),
        secretAccessKey: (process.env["S3_SECRET_ACCESS_KEY"] || "").trim(),
      },
    })
  }

  async put(namespace: string, originalName: string, body: Buffer, contentType: string): Promise<PutResult> {
    const key = buildKey(namespace, originalName, contentType)
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    )
    // Prefer an explicit public base (CDN / public bucket). Otherwise hand back
    // a time-limited signed URL so the asset is still reachable.
    const url = this.publicBase
      ? `${this.publicBase}/${key}`
      : await this.signedUrl(key, 7 * 24 * 3600)
    return { url, key }
  }

  async delete(key: string): Promise<void> {
    await this.client
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
      .catch(() => undefined)
  }

  async read(key: string): Promise<ReadResult | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      const stream = res.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined
      if (!stream?.transformToByteArray) return null
      const bytes = await stream.transformToByteArray()
      const ext = path.extname(key).toLowerCase()
      return {
        body: Buffer.from(bytes),
        contentType: res.ContentType || EXT_MIME[ext] || "application/octet-stream",
      }
    } catch {
      return null
    }
  }

  async signedUrl(key: string, ttlSeconds = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: Math.min(Math.max(60, ttlSeconds), 7 * 24 * 3600),
    })
  }
}

/* ---------- Cloudinary ---------- */

function parseCloudinaryKey(key: string): { resourceType: string; publicId: string } {
  const idx = key.indexOf("/")
  if (idx === -1) return { resourceType: "image", publicId: key }
  return { resourceType: key.slice(0, idx), publicId: key.slice(idx + 1) }
}

class CloudinaryStorage implements Storage {
  constructor() {
    cloudinary.config({
      cloud_name: (process.env["CLOUDINARY_CLOUD_NAME"] || "").trim(),
      api_key: (process.env["CLOUDINARY_API_KEY"] || "").trim(),
      api_secret: (process.env["CLOUDINARY_API_SECRET"] || "").trim(),
      secure: true,
    })
  }

  async put(namespace: string, _originalName: string, body: Buffer, contentType: string): Promise<PutResult> {
    const dataUri = `data:${contentType};base64,${body.toString("base64")}`
    const res = await cloudinary.uploader.upload(dataUri, {
      folder: `shaniidrx/${safeNamespace(namespace)}`,
      resource_type: "auto",
    })
    // Encode resource_type into the key so delete/read can address it later.
    const key = `${res.resource_type}/${res.public_id}`
    return { url: res.secure_url, key }
  }

  async delete(key: string): Promise<void> {
    const { resourceType, publicId } = parseCloudinaryKey(key)
    await cloudinary.uploader
      .destroy(publicId, { resource_type: resourceType })
      .catch(() => undefined)
  }

  async read(key: string): Promise<ReadResult | null> {
    try {
      const { resourceType, publicId } = parseCloudinaryKey(key)
      const url = cloudinary.url(publicId, { resource_type: resourceType, secure: true })
      const res = await fetch(url)
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      return { body: buf, contentType: res.headers.get("content-type") || "application/octet-stream" }
    } catch {
      return null
    }
  }
}

/* ---------- provider selection ---------- */

let _resolver: (() => StorageProvider | undefined) | null = null
const _cache = new Map<StorageProvider, Storage>()

/**
 * Registered by StorageModule so getStorage() can read the admin-selected
 * provider (cms `storage` doc) at call time without a hard dependency on Nest DI.
 */
export function registerStorageProviderResolver(fn: () => StorageProvider | undefined): void {
  _resolver = fn
}

export function s3Configured(): boolean {
  return !!(
    process.env["S3_BUCKET"] &&
    process.env["S3_ACCESS_KEY_ID"] &&
    process.env["S3_SECRET_ACCESS_KEY"]
  )
}

export function cloudinaryConfigured(): boolean {
  return !!(
    process.env["CLOUDINARY_CLOUD_NAME"] &&
    process.env["CLOUDINARY_API_KEY"] &&
    process.env["CLOUDINARY_API_SECRET"]
  )
}

function preferredProvider(): StorageProvider {
  const fromResolver = _resolver?.()
  const fromEnv = process.env["STORAGE_PROVIDER"] as StorageProvider | undefined
  const pref = fromResolver || fromEnv || "local"
  return pref === "s3" || pref === "cloudinary" ? pref : "local"
}

function activeProvider(): StorageProvider {
  const pref = preferredProvider()
  if (pref === "s3") return s3Configured() ? "s3" : "local"
  if (pref === "cloudinary") return cloudinaryConfigured() ? "cloudinary" : "local"
  return "local"
}

function createStorage(name: StorageProvider): Storage {
  if (name === "s3") return new S3Storage()
  if (name === "cloudinary") return new CloudinaryStorage()
  return new LocalDiskStorage()
}

export function getStorage(): Storage {
  const name = activeProvider()
  let inst = _cache.get(name)
  if (!inst) {
    inst = createStorage(name)
    _cache.set(name, inst)
  }
  return inst
}

export interface StorageStatus {
  provider: StorageProvider // admin-selected preference
  active: StorageProvider // what's actually in use (falls back to local)
  fellBack: boolean
  providers: {
    local: { configured: boolean }
    s3: {
      configured: boolean
      bucket: string | null
      region: string
      endpoint: string | null
      publicBaseUrl: string | null
    }
    cloudinary: { configured: boolean; cloudName: string | null }
  }
}

export function getStorageStatus(): StorageStatus {
  const provider = preferredProvider()
  const active = activeProvider()
  return {
    provider,
    active,
    fellBack: provider !== active,
    providers: {
      local: { configured: true },
      s3: {
        configured: s3Configured(),
        bucket: process.env["S3_BUCKET"] || null,
        region: process.env["S3_REGION"] || "us-east-1",
        endpoint: process.env["S3_ENDPOINT"] || null,
        publicBaseUrl: process.env["S3_PUBLIC_BASE_URL"] || null,
      },
      cloudinary: {
        configured: cloudinaryConfigured(),
        cloudName: process.env["CLOUDINARY_CLOUD_NAME"] || null,
      },
    },
  }
}

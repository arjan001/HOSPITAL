/** Allowed image MIME types */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

/** Allowed video MIME types */
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"]

/** Allowed media MIME types (images + videos) */
export const MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES]

/** Check if a URL or MIME type represents a video */
export function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/.test(lower)
}

/** Validate file upload: type + size */
export function validateUpload(
  file: File,
  maxSizeMB = 5,
  allowedTypes = IMAGE_TYPES
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed. Use JPG, PNG, WebP, or GIF.` }
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum ${maxSizeMB}MB.` }
  }
  return { valid: true }
}

/** Validate media upload (images + videos): type + size */
export function validateMediaUpload(
  file: File,
  maxImageSizeMB = 5,
  maxVideoSizeMB = 50
): { valid: boolean; error?: string; isVideo: boolean } {
  const isVideo = VIDEO_TYPES.includes(file.type)
  const isImage = IMAGE_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    return { valid: false, isVideo: false, error: `File type ${file.type} not allowed. Use JPG, PNG, WebP, GIF, MP4, WebM, or MOV.` }
  }

  const maxSize = isVideo ? maxVideoSizeMB : maxImageSizeMB
  if (file.size > maxSize * 1024 * 1024) {
    return { valid: false, isVideo, error: `File too large. Maximum ${maxSize}MB for ${isVideo ? "videos" : "images"}.` }
  }

  return { valid: true, isVideo }
}

/**
 * Compress an image file so it fits within `maxSizeMB`.
 * - GIF and SVG files are returned as-is (canvas can't compress them reliably).
 * - PNG is converted to WebP for better compression, then falls back to JPEG.
 * - Uses a binary-search over quality levels to hit the target size.
 * - Also down-scales the resolution if the pixel count is very large.
 *
 * @returns A new File at or below `maxSizeMB`, or the original if already within limit.
 */
export async function compressImage(file: File, maxSizeMB = 5): Promise<File> {
  const targetBytes = maxSizeMB * 1024 * 1024

  // Already within limit — nothing to do
  if (file.size <= targetBytes) return file

  // Can't compress these with canvas
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file

  // Load as bitmap
  let img: ImageBitmap
  try {
    img = await createImageBitmap(file)
  } catch {
    return file // fallback: return original if decoding fails
  }

  const canvas = document.createElement("canvas")

  // Cap resolution to ~4 MP to avoid huge canvases
  let { width, height } = img
  const MAX_PIXELS = 4_000_000
  if (width * height > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / (width * height))
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) return file
  ctx.drawImage(img, 0, 0, width, height)

  // Prefer WebP; fall back to JPEG for browsers that don't support WebP encoding
  const outputType = "image/webp"
  const fallbackType = "image/jpeg"

  const toBlob = (type: string, quality: number): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality))

  // Binary-search the quality setting to reach target size
  let lo = 0.10
  let hi = 0.92
  let bestBlob: Blob | null = null

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    const blob = await toBlob(outputType, mid)
    if (!blob) break
    if (blob.size <= targetBytes) {
      bestBlob = blob
      lo = mid       // can afford higher quality
    } else {
      hi = mid       // need lower quality
    }
  }

  // If WebP binary search didn't find a winner, try lowest quality
  if (!bestBlob) {
    bestBlob = await toBlob(outputType, 0.10)
  }

  // If WebP still too large (or unsupported), try JPEG at lowest quality
  if (!bestBlob || bestBlob.size > targetBytes) {
    const jpegBlob = await toBlob(fallbackType, 0.10)
    if (jpegBlob && jpegBlob.size < (bestBlob?.size ?? Infinity)) {
      bestBlob = jpegBlob
    }
  }

  // Fallback: return original if we couldn't compress enough
  if (!bestBlob) return file

  const baseName = file.name.replace(/\.[^.]+$/, "")
  const ext = bestBlob.type === "image/jpeg" ? ".jpg" : ".webp"
  return new File([bestBlob], baseName + ext, { type: bestBlob.type })
}

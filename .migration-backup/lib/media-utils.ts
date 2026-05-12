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

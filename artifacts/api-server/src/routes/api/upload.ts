import { Router } from "express"
import multer from "multer"
import { rateLimit, rateLimitResponse } from "../../lib/security.js"
import { requireAdmin } from "../../middlewares/admin-auth.js"
import { getStorage } from "../../lib/storage.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"])

// Uploads are admin-only. Today they're persisted via the local-disk Storage
// backend (`lib/storage.ts`). To switch to S3 later, edit `lib/storage.ts` —
// this route does not change.
router.post("/", requireAdmin, upload.single("file"), async (req, res, next) => {
  const rl = rateLimit(req, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  try {
    const file = req.file
    if (!file) return res.status(400).json({ error: "No file provided" })

    const isImage = IMAGE_TYPES.has(file.mimetype)
    const isVideo = VIDEO_TYPES.has(file.mimetype)
    if (!isImage && !isVideo) return res.status(400).json({ error: "Invalid file type" })

    if (isImage && file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "Image too large (max 5MB)" })
    if (isVideo && file.size > 50 * 1024 * 1024) return res.status(400).json({ error: "Video too large (max 50MB)" })

    const productSlug = String(req.body.productSlug || "products")
    const { url, key } = await getStorage().put(productSlug, file.originalname, file.buffer, file.mimetype)
    res.json({ url, key, isVideo })
  } catch (err) {
    next(err)
  }
})

export default router

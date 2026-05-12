import { Router } from "express"
import { createClient } from "../../lib/supabase.js"
import { rateLimit, rateLimitResponse } from "../../lib/security.js"
import multer from "multer"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"])

router.post("/", upload.single("file"), async (req, res, next) => {
  const rl = rateLimit(req, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  try {
    const supabase = createClient()

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" })

    const file = req.file
    if (!file) return res.status(400).json({ error: "No file provided" })

    const isImage = IMAGE_TYPES.has(file.mimetype)
    const isVideo = VIDEO_TYPES.has(file.mimetype)
    if (!isImage && !isVideo) return res.status(400).json({ error: "Invalid file type" })

    if (isImage && file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "Image too large (max 5MB)" })
    if (isVideo && file.size > 50 * 1024 * 1024) return res.status(400).json({ error: "Video too large (max 50MB)" })

    const productSlug = (req.body.productSlug || "general").replace(/[^a-z0-9\-]/gi, "").slice(0, 100)
    const ext = file.originalname.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || (isVideo ? "mp4" : "jpg")
    const filename = `${productSlug}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false })

    if (uploadError) return res.status(500).json({ error: uploadError.message })

    const { data: urlData } = supabase.storage.from("products").getPublicUrl(filename)
    res.json({ url: urlData.publicUrl, isVideo })
  } catch (err) {
    next(err)
  }
})

export default router

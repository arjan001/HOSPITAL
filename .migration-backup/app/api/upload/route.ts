import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse, validateMediaUpload } from "@/lib/security"

export async function POST(request: NextRequest) {
  // Rate limit: max 10 uploads per minute
  const rl = rateLimit(request, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  // Require authentication
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  try {
    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get("file") as File
    const productSlug = formData.get("productSlug") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type and size (max 5MB images, 50MB videos)
    const validation = validateMediaUpload(file, 5, 50)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Sanitize folder name
    const folder = (productSlug || "general").replace(/[^a-z0-9\-]/gi, "").slice(0, 100)
    const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || (validation.isVideo ? "mp4" : "jpg")
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from("products")
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("Upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("products")
      .getPublicUrl(filename)

    return NextResponse.json({ url: urlData.publicUrl, isVideo: validation.isVideo })
  } catch (error) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

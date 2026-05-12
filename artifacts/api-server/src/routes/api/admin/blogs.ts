import { Router } from "express"
import { createAdminClient } from "../../../lib/supabase.js"

const router = Router()

function slugify(input: string): string {
  return String(input).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")
    .replace(/-+/g, "-").replace(/(^-|-$)/g, "")
}

router.get("/", async (_req, res) => {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("blog_posts").select("*").order("published_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blogs" })
  }
})

router.post("/", async (req, res) => {
  try {
    const supabase = createAdminClient()
    const body = req.body
    const slug = body.slug || slugify(body.title || "")

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        slug, title: body.title, excerpt: body.excerpt || null,
        content: body.content || "", cover_image: body.cover_image || null,
        author: body.author || "Her Kingdom", author_role: body.author_role || null,
        author_avatar: body.author_avatar || null, tags: body.tags || [],
        category: body.category || null, read_time_minutes: body.read_time_minutes || 5,
        is_published: body.is_published ?? false, is_featured: body.is_featured ?? false,
        published_at: body.is_published ? new Date().toISOString() : null,
      })
      .select().single()

    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: "Failed to create blog" })
  }
})

router.put("/", async (req, res) => {
  try {
    const supabase = createAdminClient()
    const body = req.body
    const slug = body.slug || slugify(body.title || "")

    const updates: Record<string, unknown> = {
      slug, title: body.title, excerpt: body.excerpt || null,
      content: body.content || "", cover_image: body.cover_image || null,
      author: body.author, author_role: body.author_role || null,
      author_avatar: body.author_avatar || null, tags: body.tags || [],
      category: body.category || null, read_time_minutes: body.read_time_minutes || 5,
      is_published: body.is_published ?? false, is_featured: body.is_featured ?? false,
    }

    if (body.is_published && !body.published_at) updates.published_at = new Date().toISOString()
    else if (!body.is_published) updates.published_at = null

    const { error } = await supabase.from("blog_posts").update(updates).eq("id", body.id)
    if (error) throw error
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to update blog" })
  }
})

router.delete("/", async (req, res) => {
  try {
    const supabase = createAdminClient()
    const id = req.query.id as string
    if (!id) return res.status(400).json({ error: "Missing ID" })

    const { error } = await supabase.from("blog_posts").delete().eq("id", id)
    if (error) throw error
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: "Failed to delete blog" })
  }
})

export default router

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function slugify(input: string): string {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[admin/blogs] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      slug,
      title,
      excerpt,
      content,
      cover_image,
      author,
      author_role,
      author_avatar,
      tags,
      category,
      read_time_minutes,
      is_published,
      is_featured,
    } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const finalSlug = slugify(slug || title)
    if (!finalSlug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Slug already exists. Pick a different one." }, { status: 400 })
    }

    const payload = {
      slug: finalSlug,
      title,
      excerpt: excerpt || null,
      content,
      cover_image: cover_image || null,
      author: author || "Her Kingdom Editorial",
      author_role: author_role || "Style Editor",
      author_avatar: author_avatar || null,
      tags: Array.isArray(tags) ? tags : [],
      category: category || "Style",
      read_time_minutes: Number(read_time_minutes) || 5,
      is_published: is_published !== false,
      is_featured: !!is_featured,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error("[admin/blogs] POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to create blog"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      id,
      slug,
      title,
      excerpt,
      content,
      cover_image,
      author,
      author_role,
      author_avatar,
      tags,
      category,
      read_time_minutes,
      is_published,
      is_featured,
    } = body

    if (!id || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const finalSlug = slugify(slug || title)
    if (!finalSlug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", finalSlug)
      .neq("id", id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "Slug already exists. Pick a different one." }, { status: 400 })
    }

    const payload = {
      slug: finalSlug,
      title,
      excerpt: excerpt || null,
      content,
      cover_image: cover_image || null,
      author: author || "Her Kingdom Editorial",
      author_role: author_role || "Style Editor",
      author_avatar: author_avatar || null,
      tags: Array.isArray(tags) ? tags : [],
      category: category || "Style",
      read_time_minutes: Number(read_time_minutes) || 5,
      is_published: is_published !== false,
      is_featured: !!is_featured,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error("[admin/blogs] PUT error:", error)
    const message = error instanceof Error ? error.message : "Failed to update blog"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing blog ID" }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from("blog_posts").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("[admin/blogs] DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to delete blog"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

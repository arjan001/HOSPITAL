import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data: post } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (!post) {
      return NextResponse.json({ comments: [] })
    }

    const { data: comments, error } = await supabase
      .from("blog_comments")
      .select("id, name, comment, created_at")
      .eq("blog_id", post.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[api/blogs/:slug/comments] fetch error:", error.message)
      return NextResponse.json({ comments: [] })
    }

    return NextResponse.json({ comments: comments || [] })
  } catch (err) {
    console.error("[api/blogs/:slug/comments] exception:", err)
    return NextResponse.json({ comments: [] })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await req.json().catch(() => ({}))
    const name = (body?.name || "").toString().trim().slice(0, 80)
    const email = (body?.email || "").toString().trim().slice(0, 160) || null
    const comment = (body?.comment || "").toString().trim().slice(0, 2000)

    if (!name || !comment) {
      return NextResponse.json(
        { error: "Name and comment are required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: post } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (!post) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    const { data: inserted, error } = await supabase
      .from("blog_comments")
      .insert({
        blog_id: post.id,
        name,
        email,
        comment,
      })
      .select("id, name, comment, created_at")
      .maybeSingle()

    if (error) {
      console.error("[api/blogs/:slug/comments] insert error:", error.message)
      return NextResponse.json(
        { error: "Failed to post comment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ comment: inserted })
  } catch (err) {
    console.error("[api/blogs/:slug/comments] exception:", err)
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 })
  }
}

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

    const { data: post, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      console.error("[api/blogs/:slug] fetch error:", error.message)
      return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 })
    }

    if (!post) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    // Ratings aggregate
    const { data: ratings } = await supabase
      .from("blog_ratings")
      .select("stars")
      .eq("blog_id", post.id)

    let ratingAvg = 0
    let ratingCount = 0
    if (ratings && ratings.length > 0) {
      ratingCount = ratings.length
      ratingAvg = ratings.reduce((sum, r) => sum + (Number(r.stars) || 0), 0) / ratingCount
    }

    // Related posts: same category, excluding self
    const { data: related } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image, author, tags, category, read_time_minutes, published_at")
      .eq("is_published", true)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(4)

    return NextResponse.json({
      post: {
        ...post,
        rating_avg: ratingAvg,
        rating_count: ratingCount,
      },
      related: related || [],
    })
  } catch (err) {
    console.error("[api/blogs/:slug] exception:", err)
    return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 })
  }
}

// Increment view count
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data: post } = await supabase
      .from("blog_posts")
      .select("id, views")
      .eq("slug", slug)
      .maybeSingle()

    if (!post) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }

    await supabase
      .from("blog_posts")
      .update({ views: (post.views || 0) + 1 })
      .eq("id", post.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

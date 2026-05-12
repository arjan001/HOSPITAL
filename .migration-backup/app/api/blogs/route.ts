import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_image, author, author_role, author_avatar, tags, category, read_time_minutes, views, is_featured, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })

    if (error) {
      console.error("[api/blogs] fetch error:", error.message)
      return NextResponse.json({ posts: [] })
    }

    const ids = (posts || []).map((p) => p.id)
    let ratingsMap: Record<string, { avg: number; count: number }> = {}
    let commentCounts: Record<string, number> = {}

    if (ids.length > 0) {
      const [{ data: ratings }, { data: comments }] = await Promise.all([
        supabase.from("blog_ratings").select("blog_id, stars").in("blog_id", ids),
        supabase.from("blog_comments").select("blog_id").in("blog_id", ids).eq("is_approved", true),
      ])

      if (ratings) {
        const agg: Record<string, { total: number; count: number }> = {}
        for (const r of ratings) {
          const key = r.blog_id as string
          if (!agg[key]) agg[key] = { total: 0, count: 0 }
          agg[key].total += Number(r.stars) || 0
          agg[key].count += 1
        }
        ratingsMap = Object.fromEntries(
          Object.entries(agg).map(([k, v]) => [k, { avg: v.count ? v.total / v.count : 0, count: v.count }])
        )
      }

      if (comments) {
        for (const c of comments) {
          commentCounts[c.blog_id as string] = (commentCounts[c.blog_id as string] || 0) + 1
        }
      }
    }

    const enriched = (posts || []).map((p) => ({
      ...p,
      rating_avg: ratingsMap[p.id]?.avg ?? 0,
      rating_count: ratingsMap[p.id]?.count ?? 0,
      comment_count: commentCounts[p.id] ?? 0,
    }))

    return NextResponse.json({ posts: enriched })
  } catch (err) {
    console.error("[api/blogs] exception:", err)
    return NextResponse.json({ posts: [] })
  }
}

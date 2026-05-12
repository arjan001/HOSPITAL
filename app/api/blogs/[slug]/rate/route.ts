import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await req.json().catch(() => ({}))
    const stars = Math.round(Number(body?.stars))
    const sessionId = (body?.sessionId || "").toString().trim().slice(0, 120) || null

    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "Stars must be 1-5" }, { status: 400 })
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

    if (sessionId) {
      const { data: existing } = await supabase
        .from("blog_ratings")
        .select("id")
        .eq("blog_id", post.id)
        .eq("session_id", sessionId)
        .maybeSingle()

      if (existing) {
        await supabase.from("blog_ratings").update({ stars }).eq("id", existing.id)
      } else {
        await supabase.from("blog_ratings").insert({ blog_id: post.id, session_id: sessionId, stars })
      }
    } else {
      await supabase.from("blog_ratings").insert({ blog_id: post.id, stars })
    }

    const { data: all } = await supabase
      .from("blog_ratings")
      .select("stars")
      .eq("blog_id", post.id)

    const count = all?.length || 0
    const avg = count ? (all as { stars: number }[]).reduce((s, r) => s + Number(r.stars), 0) / count : 0

    return NextResponse.json({ ok: true, rating_avg: avg, rating_count: count })
  } catch (err) {
    console.error("[api/blogs/:slug/rate] exception:", err)
    return NextResponse.json({ error: "Failed to rate" }, { status: 500 })
  }
}

import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      console.error("[api/policies/:slug] fetch error:", error.message)
      return NextResponse.json({ error: "Failed to fetch policy" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[api/policies/:slug] exception:", error)
    return NextResponse.json({ error: "Failed to fetch policy" }, { status: 500 })
  }
}

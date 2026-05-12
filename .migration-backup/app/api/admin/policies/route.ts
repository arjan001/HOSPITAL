import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: policies, error } = await supabase
      .from("policies")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(policies || [])
  } catch (error) {
    console.error("[v0] Error fetching policies:", error)
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { slug, title, content, meta_title, meta_description, meta_keywords, is_published } = body

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("policies")
      .insert({
        slug,
        title,
        content,
        meta_title: meta_title || title,
        meta_description: meta_description || "",
        meta_keywords: meta_keywords || "",
        is_published: is_published !== false,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Error creating policy:", error)
    return NextResponse.json({ error: error.message || "Failed to create policy" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { id, slug, title, content, meta_title, meta_description, meta_keywords, is_published } = body

    if (!id || !slug || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("policies")
      .update({
        slug,
        title,
        content,
        meta_title: meta_title || title,
        meta_description: meta_description || "",
        meta_keywords: meta_keywords || "",
        is_published: is_published !== false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error updating policy:", error)
    return NextResponse.json({ error: error.message || "Failed to update policy" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing policy ID" }, { status: 400 })
    }

    const { error } = await supabase
      .from("policies")
      .delete()
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting policy:", error)
    return NextResponse.json({ error: error.message || "Failed to delete policy" }, { status: 500 })
  }
}

import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .order("title")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

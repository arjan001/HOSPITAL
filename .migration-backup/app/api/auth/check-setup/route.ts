import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { count } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true })
    .eq("role", "super_admin")

  return NextResponse.json({ hasAdmin: (count || 0) > 0 })
}

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, last_login_at, created_at")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  // Map DB columns to API response format
  const mapped = (data || []).map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.name || u.email.split("@")[0],
    role: u.role,
    is_active: true, // All admin_users are active by default (no is_active column)
    last_login: u.last_login_at,
    created_at: u.created_at,
  }))
  
  return NextResponse.json(mapped)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: currentUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("email", user.email)
    .single()

  if (currentUser?.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can modify users" }, { status: 403 })
  }

  const body = await request.json()
  const { id, role, display_name } = body

  const updates: Record<string, unknown> = {}
  if (role !== undefined) updates.role = role
  if (display_name !== undefined) updates.name = display_name

  const { data, error } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({
    id: data.id,
    email: data.email,
    display_name: data.name,
    role: data.role,
    is_active: true,
    last_login: data.last_login_at,
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: currentUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("email", user.email)
    .single()

  if (currentUser?.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can delete users" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 })

  // Get the target user's email to check it's not self-delete
  const { data: targetUser } = await supabase
    .from("admin_users")
    .select("email")
    .eq("id", id)
    .single()

  if (targetUser?.email === user.email) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  // Delete from admin_users
  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also delete from auth if possible
  if (targetUser?.email) {
    try {
      const adminClient = createAdminClient()
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const authUser = authUsers?.users?.find((u) => u.email === targetUser.email)
      if (authUser) {
        await adminClient.auth.admin.deleteUser(authUser.id)
      }
    } catch {
      // Non-critical - admin_users row already deleted
    }
  }

  return NextResponse.json({ success: true })
}

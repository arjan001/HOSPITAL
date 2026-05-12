import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { isValidEmail, validatePassword, stripTags } from "@/lib/security"

export async function POST(request: Request) {
  // Verify requesting user is admin or higher (admin, super_admin, or editor)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: currentUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("email", user.email)
    .single()

  // Allow admin, super_admin, and editor roles to register users
  const allowedRoles = ["super_admin", "admin", "editor"]
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    return NextResponse.json({ error: "Only admins and editors can add users" }, { status: 403 })
  }

  const { email, displayName, password, role } = await request.json()

  if (!email || !displayName || !password || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : ""
  if (!isValidEmail(cleanEmail)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const cleanName = stripTags(displayName, 80)
  if (!cleanName) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 })
  }

  const pwCheck = validatePassword(password)
  if (!pwCheck.ok) {
    return NextResponse.json({ error: pwCheck.error }, { status: 400 })
  }

  // Validate role is one of the allowed values
  const VALID_ROLES = ["super_admin", "admin", "editor", "viewer"]
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  // Editors can only create viewers
  if (currentUser.role === "editor" && role !== "viewer") {
    return NextResponse.json({ error: "Editors can only create viewer accounts" }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Check if user already exists in auth
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existingAuth = existingUsers?.users?.find((u) => u.email === cleanEmail)

  if (existingAuth) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 })
  }

  // Create auth user with service role (doesn't affect admin's session)
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: cleanName,
      role,
    },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // The trigger creates admin_users row, but update to ensure correct role
  // Use email match since the trigger generates its own UUID for admin_users.id
  if (newUser?.user) {
    // Small delay to let trigger complete
    await new Promise((r) => setTimeout(r, 500))

    const { error: updateError } = await adminClient
      .from("admin_users")
      .update({ role, display_name: cleanName, is_active: true })
      .eq("email", cleanEmail)

    // If trigger didn't fire or row doesn't exist, insert directly
    if (updateError) {
      await adminClient
        .from("admin_users")
        .insert({ id: crypto.randomUUID(), email: cleanEmail, display_name: cleanName, role, is_active: true })
    }
  }

  return NextResponse.json({ success: true })
}

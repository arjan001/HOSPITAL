import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"
import * as bcrypt from "bcrypt"
import { isValidEmail, validatePassword, stripTags } from "@/lib/security"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, displayName, role, password } = body

  // Validate inputs
  if (!email || !displayName || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

  // Hash the password with bcrypt (cost 12 for stronger protection)
  const passwordHash = await bcrypt.hash(password, 12)

  const supabase = await createClient()

  // Check if user exists in admin_users
  const { data: existing } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", cleanEmail)
    .single()

  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 })
  }

  // Check if this is the first user (admin_users table is empty)
  const { count: userCount } = await supabase
    .from("admin_users")
    .select("id", { count: "exact", head: true })

  // First user always gets super_admin role with full access
  const assignedRole = userCount === 0 ? "super_admin" : (role || "editor")

  // Only allow admin, editor, or super_admin when specifying a role
  if (role && !["admin", "super_admin", "editor"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  // Insert into admin_users with password hash
  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email: cleanEmail,
      name: cleanName,
      role: assignedRole,
      password_hash: passwordHash,
    })
    .select("id, email, name, role")
    .single()

  if (error) {
    console.error("[v0] Admin user insert error:", error)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }

  return NextResponse.json({ success: true, user: data, isFirstUser: userCount === 0 })
}


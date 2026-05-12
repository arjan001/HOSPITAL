import type { Request, Response, NextFunction } from "express"
import { createAdminClient, createClient } from "../lib/supabase.js"

const ADMIN_ROLES = new Set(["admin", "super_admin", "editor"])

export interface AuthedRequest extends Request {
  authUser?: {
    id: string
    email: string | null
    role: string
  }
}

/**
 * Middleware that:
 *   1. Verifies the bearer token via Supabase auth.
 *   2. Loads the matching row from `admin_users` and confirms the user holds
 *      an admin role. Rejects with 403 otherwise.
 *
 * If Supabase is not configured (env vars missing), responds 503 so admin
 * endpoints fail closed instead of silently allowing access.
 */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const token = authHeader.slice(7)

  let supabase
  let admin
  try {
    supabase = createClient()
    admin = createAdminClient()
  } catch {
    return res.status(503).json({ error: "Backend not configured" })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Unauthorized" })

  const { data: adminRow } = await admin
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!adminRow || adminRow.is_active === false || !ADMIN_ROLES.has(adminRow.role as string)) {
    return res.status(403).json({ error: "Forbidden" })
  }

  req.authUser = {
    id: user.id,
    email: user.email ?? null,
    role: adminRow.role as string,
  }
  next()
}

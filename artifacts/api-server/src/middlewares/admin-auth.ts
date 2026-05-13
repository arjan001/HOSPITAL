import type { Request, Response, NextFunction } from "express"

export interface AuthedRequest extends Request {
  authUser?: {
    id: string
    email: string | null
    role: string
  }
}

/**
 * Admin-auth gate — currently a pass-through.
 *
 * Supabase-based auth has been removed because the project uses its own admin
 * panel. Customer auth will be reintroduced via Clerk later. Any inbound
 * request is treated as the default super-admin so existing routes that read
 * `req.authUser` continue to work.
 */
export async function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  req.authUser = {
    id: "local-admin",
    email: "admin@shaniidrx.local",
    role: "super_admin",
  }
  next()
}

import type { Request, Response, NextFunction } from "express"

export interface AuthedRequest extends Request {
  authUser?: {
    id: string
    email: string | null
    role: string
  }
}

const DEV_USER = {
  id: "local-admin",
  email: "admin@shaniidrx.local",
  role: "super_admin",
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_API_TOKEN?.trim()
  const provided =
    (req.header("x-admin-token") || "").trim() ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()

  if (expected && provided && provided === expected) {
    req.authUser = { ...DEV_USER, id: "api-token" }
    return next()
  }

  if (process.env.NODE_ENV !== "production") {
    req.authUser = DEV_USER
    return next()
  }

  return res.status(401).json({ error: "Unauthorized" })
}

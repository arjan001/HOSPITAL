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

/**
 * Admin authentication middleware.
 *
 * Auth model (interim, until Phase-2 Clerk-admin SSO lands):
 *   1. If `ADMIN_API_TOKEN` is set in the environment, the request MUST
 *      provide that exact token in either `x-admin-token` or
 *      `Authorization: Bearer …`. Anything else is rejected with 401.
 *   2. If `ADMIN_API_TOKEN` is unset, behaviour depends on `NODE_ENV`:
 *        - production         → reject (fail closed)
 *        - everything else    → allow with a DEV identity, so local devs
 *                               can hit admin routes without a token
 *      To force closed locally too, set `ADMIN_REQUIRE_TOKEN=1`.
 *
 * The earlier revision auto-passed every non-production request even when
 * a token was configured — that hole is closed: when `ADMIN_API_TOKEN` is
 * set, the token IS required regardless of NODE_ENV.
 */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_API_TOKEN?.trim()
  const provided =
    (req.header("x-admin-token") || "").trim() ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()

  if (expected) {
    if (provided && provided === expected) {
      req.authUser = { ...DEV_USER, id: "api-token" }
      return next()
    }
    return res.status(401).json({ error: "Unauthorized" })
  }

  const forceClosed =
    process.env.NODE_ENV === "production" ||
    process.env.ADMIN_REQUIRE_TOKEN === "1" ||
    process.env.ADMIN_REQUIRE_TOKEN === "true"

  if (forceClosed) {
    return res.status(503).json({
      error: "Admin authentication not configured. Set ADMIN_API_TOKEN.",
    })
  }

  req.authUser = DEV_USER
  return next()
}

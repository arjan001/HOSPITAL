import { randomUUID } from "node:crypto"
import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"

const SID_COOKIE = "shaniidrx_sid"
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365

/**
 * Cookie-based guest session.
 *
 * Today: every browser gets a stable sid; profile/addresses/wishlist/orders
 * are scoped to that sid via the in-memory repositories.
 *
 * Tomorrow (Clerk): replace this middleware with a Clerk JWT verifier that
 * sets `req.sessionId = clerkUserId`. Nothing else in the codebase changes —
 * services keep reading `req.sessionId`.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {}
    let sid = cookies[SID_COOKIE]
    if (!sid || typeof sid !== "string" || sid.length < 8) {
      sid = randomUUID()
      res.cookie(SID_COOKIE, sid, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env["NODE_ENV"] === "production",
        maxAge: ONE_YEAR_MS,
        path: "/",
      })
    }
    req.sessionId = sid
    next()
  }
}

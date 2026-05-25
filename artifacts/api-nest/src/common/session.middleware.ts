/**
 * Session middleware — guest session model, Clerk-ready.
 *
 * Code flow:
 *   1. Request arrives at any /api/v2/* route.
 *   2. This middleware runs before any controller.
 *   3. It reads the `shaniidrx_sid` cookie from the request.
 *      - If the cookie is absent or invalid: generate a new UUID, set it as
 *        an httpOnly cookie on the response, and use it as the session ID.
 *      - If the cookie is present and valid: use it as-is.
 *   4. Attach the session ID to `req.sessionId` so every downstream
 *      controller and service can read it without repeating this logic.
 *   5. Call `next()` to continue to the route handler.
 *
 * Migration path to Clerk:
 *   Replace the cookie read/write block with a Clerk JWT verification call
 *   that sets `req.sessionId = clerkUserId`. Controllers and services do not
 *   change because they only ever read `req.sessionId`.
 *
 * Security notes:
 *   - httpOnly: browser JavaScript cannot read the cookie.
 *   - sameSite: "lax": protects against most CSRF vectors.
 *   - secure: true in production so the cookie is only sent over HTTPS.
 *   - The UUID is not a secret; it is scoped data isolation, not auth.
 *     Real auth comes from Clerk JWT verification (planned for Phase 2).
 */

import { randomUUID } from "node:crypto"
import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"

const SID_COOKIE = "shaniidrx_sid"
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Read cookies parsed by cookie-parser (mounted in main.ts).
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {}
    let sid = cookies[SID_COOKIE]

    // Issue a new session ID when the cookie is missing or looks tampered with.
    if (!sid || typeof sid !== "string" || sid.length < 8) {
      sid = randomUUID()
      res.cookie(SID_COOKIE, sid, {
        httpOnly: true,   // not accessible via document.cookie
        sameSite: "lax",  // sent on same-site navigations, blocked on cross-site POST
        secure: process.env["NODE_ENV"] === "production",
        maxAge: ONE_YEAR_MS,
        path: "/",
      })
    }

    // Attach to request so controllers read req.sessionId, not the raw cookie.
    req.sessionId = sid
    next()
  }
}

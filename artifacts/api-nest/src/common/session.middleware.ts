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
 *   - The cookie is now SIGNED (HMAC) with SESSION_SECRET via cookie-parser.
 *     A signed cookie that fails verification is dropped by cookie-parser and
 *     never appears in req.signedCookies — so an attacker cannot forge or
 *     iterate session IDs to read another tenant's data (BOLA protection).
 *   - httpOnly: browser JavaScript cannot read the cookie.
 *   - sameSite: "lax": protects against most CSRF vectors.
 *   - secure: true in production so the cookie is only sent over HTTPS.
 *   - The signed UUID is data-isolation scoping, not full auth. Real auth comes
 *     from Clerk JWT verification (planned for Phase 2).
 */

import { randomUUID } from "node:crypto"
import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"

export const SID_COOKIE = "shaniidrx_sid"
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Read VERIFIED signed cookies (cookie-parser, mounted with a secret in
    // main.ts). A tampered/forged value will not be present here.
    const signed =
      (req as Request & { signedCookies?: Record<string, string> }).signedCookies ?? {}
    let sid = signed[SID_COOKIE]

    // Issue a new signed session ID when the cookie is missing, malformed, or
    // failed signature verification.
    if (!sid || typeof sid !== "string" || sid.length < 8) {
      sid = randomUUID()
      res.cookie(SID_COOKIE, sid, {
        httpOnly: true,   // not accessible via document.cookie
        sameSite: "lax",  // sent on same-site navigations, blocked on cross-site POST
        secure: process.env["NODE_ENV"] === "production",
        signed: true,     // HMAC-signed with SESSION_SECRET
        maxAge: ONE_YEAR_MS,
        path: "/",
      })
    }

    // Attach to request so controllers read req.sessionId, not the raw cookie.
    req.sessionId = sid
    next()
  }
}

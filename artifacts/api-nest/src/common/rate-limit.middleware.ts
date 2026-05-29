/**
 * Lightweight in-memory rate limiter — abuse / load protection for api-nest.
 *
 * Sliding-window counter keyed by client IP. This is a single-instance
 * safeguard (not a distributed limiter); when the app scales horizontally,
 * swap the backing store for Redis with the same middleware surface.
 *
 * Defaults are generous enough for normal browsing + admin work but stop a
 * single client from hammering the API. Tune via env:
 *   RATE_LIMIT_WINDOW_MS  (default 60_000)
 *   RATE_LIMIT_MAX        (default 600 requests / window / IP)
 *
 * The bucket map is pruned on a timer so it cannot grow unbounded under the
 * ~1000-users/hour load target.
 *
 * Client identity: `x-forwarded-for` is spoofable, so we only trust it when the
 * app is explicitly told it sits behind a trusted proxy (`TRUST_PROXY=1`).
 * Otherwise we key on the real socket address, which a client cannot forge.
 * We additionally fold in the signed session id (when present) so that a single
 * shared NAT / proxy egress IP can't exhaust the whole window for everyone.
 */
import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import { SID_COOKIE } from "./session.middleware"

const WINDOW_MS = Number(process.env["RATE_LIMIT_WINDOW_MS"]) || 60_000
const MAX_HITS = Number(process.env["RATE_LIMIT_MAX"]) || 600
const TRUST_PROXY = /^(1|true|yes)$/i.test(process.env["TRUST_PROXY"] ?? "")

interface Bucket {
  count: number
  resetAt: number
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private buckets = new Map<string, Bucket>()
  private lastSweep = Date.now()

  use(req: Request, res: Response, next: NextFunction) {
    const now = Date.now()

    // Periodically drop expired buckets so memory stays bounded.
    if (now - this.lastSweep > WINDOW_MS) {
      for (const [key, b] of this.buckets) {
        if (b.resetAt <= now) this.buckets.delete(key)
      }
      this.lastSweep = now
    }

    const socketIp = req.socket?.remoteAddress || "unknown"
    const ip = TRUST_PROXY
      ? (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || socketIp
      : socketIp

    // Fold in the signed session id (if any) so a shared egress IP doesn't
    // starve every user sharing it. The cookie is signed, so it can't be forged
    // to dodge a limit, only to share one's own bucket.
    const sid = (req.signedCookies as Record<string, string> | undefined)?.[SID_COOKIE]
    const key = sid ? `${ip}|${sid}` : ip

    let bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS }
      this.buckets.set(key, bucket)
    }
    bucket.count += 1

    const remaining = Math.max(0, MAX_HITS - bucket.count)
    res.setHeader("X-RateLimit-Limit", String(MAX_HITS))
    res.setHeader("X-RateLimit-Remaining", String(remaining))
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > MAX_HITS) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      res.setHeader("Retry-After", String(retryAfter))
      res.status(429).json({
        statusCode: 429,
        error: "Too many requests — please slow down and try again shortly.",
        retryAfter,
        timestamp: new Date().toISOString(),
      })
      return
    }

    next()
  }
}

/**
 * Shared AdminGuard — gates every NestJS admin endpoint.
 *
 * Auth model (interim, until the Phase-2 Clerk-admin SSO lands):
 *   1. If `ADMIN_API_TOKEN` is set in the environment, the request must
 *      provide that token in either the `x-admin-token` header or as a
 *      `Bearer …` value in the `Authorization` header. Anything else is
 *      rejected with 401.
 *   2. If `ADMIN_API_TOKEN` is *not* set, behaviour depends on
 *      `NODE_ENV`:
 *        - In production we refuse the request (fail closed).
 *        - In every other environment we allow it, so local devs can hit
 *          admin endpoints without configuring a token. To force closed
 *          locally too, set `ADMIN_REQUIRE_TOKEN=1`.
 *
 * Apply via `@UseGuards(AdminGuard)` on the controller (covers every
 * route) or on individual handlers when you need finer control. Mark
 * customer-facing handlers with `@Public()` if the controller-level
 * guard would otherwise lock them out.
 */
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
  SetMetadata,
} from "@nestjs/common"
import type { Request } from "express"
import { Reflector } from "@nestjs/core"
import { and, eq } from "drizzle-orm"
import { db, adminUsers } from "@workspace/db"
import { verifyAdminToken } from "./admin-token"
import { effectivePermissions, hasPermission } from "./admin-permissions"
import { resolveAdminFromClerk, clerkAdminSsoEnabled } from "./admin-clerk-auth"
import { verifyClerkBearer } from "./clerk-auth"

export const ADMIN_PUBLIC_KEY = "admin-public"
/** Mark a handler/controller as exempt from AdminGuard. */
export const Public = () => SetMetadata(ADMIN_PUBLIC_KEY, true)

export const ADMIN_PERMS_KEY = "admin-required-perms"
/**
 * Require one of the given permissions to access a route/controller. The guard
 * resolves the acting admin's *live* permissions from Postgres (super_admin and
 * the ops master key hold the wildcard) and rejects with 403 otherwise. Apply
 * at controller level for whole-module gating, or per-handler for finer control.
 */
export const RequirePerm = (...perms: string[]) => SetMetadata(ADMIN_PERMS_KEY, perms)

export const ADMIN_ANY_KEY = "admin-any"
/**
 * Mark a route/controller as accessible to *any* authenticated, active admin
 * regardless of role — used for self-service routes (the acting admin's own
 * session) and genuinely shared infrastructure (e.g. the central CMS data
 * layer, the in-app notification feed). This is the explicit opt-out from the
 * guard's fail-closed default (see below), so shared surfaces stay reachable
 * for non-super roles while everything unmarked is locked to super-admin.
 */
export const AnyAdmin = () => SetMetadata(ADMIN_ANY_KEY, true)

const DEV_TOKEN = "shaniidrx-admin-dev-token"

@Injectable()
export class AdminGuard implements CanActivate {
  // Reflector is provided by Nest core, but the project disables emit-decorator-
  // metadata (tsx) so we make the injection explicit and optional.
  constructor(@Optional() @Inject(Reflector) private readonly reflector?: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(
      ADMIN_PUBLIC_KEY,
      [ctx.getHandler(), ctx.getClass()],
    )
    if (isPublic) return true

    const required =
      this.reflector?.getAllAndOverride<string[]>(ADMIN_PERMS_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? []
    const anyAdmin =
      this.reflector?.getAllAndOverride<boolean>(ADMIN_ANY_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? false

    const req = ctx.switchToHttp().getRequest<Request>()
    const expected = process.env.ADMIN_API_TOKEN?.trim()
    // Header is the primary path; the HttpOnly `shaniidrx_admin_token` cookie is
    // the fallback ONLY for browser requests that cannot set custom headers —
    // admin SSE streams (EventSource) and admin file reads (<img>/<a>), which are
    // GET/HEAD. Mutating admin APIs (POST/PUT/PATCH/DELETE) still REQUIRE the
    // header token, so the cookie never widens the attack surface for state
    // changes (defence-in-depth on top of SameSite=lax). The cookie is populated
    // at login and cleared at logout.
    const method = (req.method || "").toUpperCase()
    const cookieAllowed = method === "GET" || method === "HEAD"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookieToken = cookieAllowed ? (req as any).cookies?.["shaniidrx_admin_token"] : undefined
    const provided =
      (req.header("x-admin-token") || "").trim() ||
      (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim() ||
      (typeof cookieToken === "string" ? cookieToken.trim() : "")

    // 1. Ops master key (ADMIN_API_TOKEN) — full super-admin.
    if (expected && provided && provided === expected) {
      this.attachEnvSuperAdmin(req)
      return true
    }

    // 2. Signed per-user token issued at login. The signature/expiry is checked
    //    statelessly, then we resolve the *live* account from Postgres so that
    //    deactivated or deleted admins lose access immediately (revocation) and
    //    @RequirePerm can enforce against current permissions — not stale claims.
    const claims = verifyAdminToken(provided)
    if (claims) {
      const rows = await db
        .select()
        .from(adminUsers)
        .where(and(eq(adminUsers.id, claims.uid), eq(adminUsers.active, true)))
        .limit(1)
      const user = rows[0]
      if (!user) {
        // Token is well-formed but the account is gone or deactivated.
        throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
      }
      const perms = effectivePermissions(user.role, user.permissions as string[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(req as any).adminUser = {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        permissions: perms,
      }
      if (required.length) {
        // Route declares explicit permissions — enforce them.
        if (!hasPermission(perms, required)) {
          throw new HttpException(
            `Requires permission: ${required.join(" or ")}`,
            HttpStatus.FORBIDDEN,
          )
        }
      } else if (!anyAdmin && !perms.includes("*")) {
        // Fail-closed default: an admin route that declares neither @RequirePerm
        // nor @AnyAdmin is reachable only by a super-admin (wildcard). This
        // prevents a low-privilege admin token from hitting un-annotated admin
        // surface — the prior "any valid admin token hits any admin route" gap.
        throw new HttpException(
          "Insufficient permissions for this admin resource",
          HttpStatus.FORBIDDEN,
        )
      }
      return true
    }

    // 2b. Clerk SSO — Bearer Clerk session JWT for an active admin_users row.
    if (clerkAdminSsoEnabled()) {
      const clerk = await verifyClerkBearer(req.header("authorization"))
      if (clerk) {
        const identity = await resolveAdminFromClerk(clerk)
        if (identity) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(req as any).adminUser = identity
          if (required.length && !hasPermission(identity.permissions, required)) {
            throw new HttpException(
              `Requires permission: ${required.join(" or ")}`,
              HttpStatus.FORBIDDEN,
            )
          } else if (!anyAdmin && !identity.permissions.includes("*")) {
            throw new HttpException(
              "Insufficient permissions for this admin resource",
              HttpStatus.FORBIDDEN,
            )
          }
          return true
        }
      }
    }

    // 3. No valid token. If an ops master key OR signed tokens are the only
    //    accepted forms (i.e. ADMIN_API_TOKEN configured), reject.
    if (expected) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    }

    // 4. No ADMIN_API_TOKEN configured. Fail closed in production, or when
    //    explicitly requested via ADMIN_REQUIRE_TOKEN. Allow otherwise (dev).
    const forceClosed =
      process.env.NODE_ENV === "production" ||
      process.env.ADMIN_REQUIRE_TOKEN === "1" ||
      process.env.ADMIN_REQUIRE_TOKEN === "true"

    if (forceClosed) {
      throw new HttpException(
        "Admin authentication is not configured. Set ADMIN_API_TOKEN.",
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    // Dev convenience: accept the dev token (or no token) as super-admin.
    void DEV_TOKEN
    this.attachEnvSuperAdmin(req)
    return true
  }

  /**
   * Attach a minimal super-admin identity to the request (env/dev master key
   * paths). Cast to `any` to avoid extending the Express Request type globally.
   */
  private attachEnvSuperAdmin(req: Request) {
    const email = (process.env.ADMIN_EMAIL || "admin@shaniidrx.com").toLowerCase()
    const name = process.env.ADMIN_NAME || "Super Admin"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(req as any).adminUser = {
      id: "env-super-admin",
      role: "super_admin",
      email,
      name,
      permissions: ["*"],
    }
  }
}

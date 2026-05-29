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

export const ADMIN_PUBLIC_KEY = "admin-public"
/** Mark a handler/controller as exempt from AdminGuard. */
export const Public = () => SetMetadata(ADMIN_PUBLIC_KEY, true)

@Injectable()
export class AdminGuard implements CanActivate {
  // Reflector is provided by Nest core, but the project disables emit-decorator-
  // metadata (tsx) so we make the injection explicit and optional.
  constructor(@Optional() @Inject(Reflector) private readonly reflector?: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(
      ADMIN_PUBLIC_KEY,
      [ctx.getHandler(), ctx.getClass()],
    )
    if (isPublic) return true

    const req = ctx.switchToHttp().getRequest<Request>()
    const expected = process.env.ADMIN_API_TOKEN?.trim()
    const provided =
      (req.header("x-admin-token") || "").trim() ||
      (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()

    const DEV_TOKEN = "shaniidrx-admin-dev-token"

    if (expected) {
      if (provided && provided === expected) {
        this.attachAdminUser(req, provided)
        return true
      }
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    }

    // No token configured. Fail closed in production, or when explicitly
    // requested via ADMIN_REQUIRE_TOKEN. Allow otherwise (dev convenience).
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

    // Dev convenience: accept the dev token or any non-empty provided value.
    if (provided && (provided === DEV_TOKEN || !expected)) {
      this.attachAdminUser(req, provided)
    } else {
      this.attachAdminUser(req, DEV_TOKEN)
    }
    return true
  }

  /**
   * Attach a minimal admin identity to the request so controllers can read
   * who is acting without additional lookups.  Cast to `any` to avoid
   * extending the Express Request type globally in every module.
   */
  private attachAdminUser(req: Request, _token: string) {
    const email = (process.env.ADMIN_EMAIL || "admin@shaniidrx.com").toLowerCase()
    const name = process.env.ADMIN_NAME || "Super Admin"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(req as any).adminUser = { role: "super_admin", email, name }
  }
}

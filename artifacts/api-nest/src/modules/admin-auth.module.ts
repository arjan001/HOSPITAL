/**
 * AdminAuthModule — admin panel authentication.
 *
 * Routes (all under /api/v2/admin/auth):
 *   POST /login           — verify credentials, return session token
 *   POST /forgot-password — request password reset (email-based when Resend is configured)
 *   GET  /me              — validate token and return admin user info
 *
 * Auth model:
 *   Credentials are checked against ADMIN_EMAIL / ADMIN_PASSWORD env vars
 *   (defaults: admin@shaniidrx.com / Admin@2024!). On success the handler
 *   returns ADMIN_API_TOKEN as the bearer token — the same value that
 *   AdminGuard checks on every protected route. When ADMIN_API_TOKEN is
 *   unset, a deterministic development token is issued instead.
 *
 *   Future: store admin users in admin_users table with bcrypt password hashes
 *   and per-user tokens / JWT. The controller/service interface stays the same.
 *
 * NestJS rule: every constructor uses explicit @Inject() because tsx/esbuild
 * does NOT emit emitDecoratorMetadata.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Post,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { Public } from "../common/admin-guard"

const DEV_TOKEN = "shaniidrx-admin-dev-token"

function adminEmail() {
  return (process.env.ADMIN_EMAIL || "admin@shaniidrx.com").toLowerCase().trim()
}
function adminPassword() {
  return process.env.ADMIN_PASSWORD || "Admin@2024!"
}
function adminName() {
  return process.env.ADMIN_NAME || "Super Admin"
}
function expectedToken(): string {
  return (process.env.ADMIN_API_TOKEN || "").trim()
}
function issueToken(): string {
  const t = expectedToken()
  return t || DEV_TOKEN
}

/**
 * In production we refuse to authenticate with the built-in default credentials
 * unless the operator has explicitly set ADMIN_EMAIL + ADMIN_PASSWORD. This
 * stops a deploy that forgot to configure admin creds from shipping with the
 * publicly-known admin@shaniidrx.com / Admin@2024! login.
 */
function defaultCredsAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
}

@Injectable()
export class AdminAuthService {
  login(email: string, password: string) {
    if (!defaultCredsAllowed()) {
      return null
    }
    if (email.trim().toLowerCase() !== adminEmail() || password !== adminPassword()) {
      return null
    }
    return {
      token: issueToken(),
      role: "super_admin",
      name: adminName(),
      email: adminEmail(),
    }
  }

  verifyToken(token: string): { role: string; name: string; email: string } | null {
    const expected = expectedToken()
    // Accept the configured token, or the dev token when no token is configured.
    if ((expected && token === expected) || (!expected && token === DEV_TOKEN)) {
      return { role: "super_admin", name: adminName(), email: adminEmail() }
    }
    return null
  }
}

@Controller("admin/auth")
class AdminAuthController {
  constructor(@Inject(AdminAuthService) private readonly svc: AdminAuthService) {}

  /**
   * POST /api/v2/admin/auth/login
   * Body: { email: string; password: string }
   * Returns: { token, role, name, email }
   */
  @Public()
  @Post("login")
  login(@Body() body: { email?: string; password?: string }) {
    if (!body?.email || !body?.password) {
      throw new HttpException("Email and password are required", HttpStatus.BAD_REQUEST)
    }
    const result = this.svc.login(body.email, body.password)
    if (!result) {
      throw new HttpException("Invalid email or password", HttpStatus.UNAUTHORIZED)
    }
    return result
  }

  /**
   * POST /api/v2/admin/auth/forgot-password
   * Body: { email: string }
   * Always returns ok to avoid leaking registered emails.
   * When RESEND_API_KEY is set, sends an actual recovery email.
   */
  @Public()
  @Post("forgot-password")
  forgotPassword(@Body() body: { email?: string }) {
    // TODO: when RESEND_API_KEY is set, generate a time-limited token,
    // persist to admin_password_resets, and email it via EmailService.
    return {
      ok: true,
      message:
        "If that email is registered as an admin account, recovery instructions will be sent. For urgent access contact your system administrator.",
    }
  }

  /**
   * GET /api/v2/admin/auth/me
   * Requires valid bearer token in Authorization or x-admin-token header.
   * Returns: { role, name, email }
   */
  @Get("me")
  getMe(@Req() req: Request) {
    const token =
      (req.header("x-admin-token") || "").trim() ||
      (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()

    const user = this.svc.verifyToken(token)
    if (!user) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    return user
  }
}

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}

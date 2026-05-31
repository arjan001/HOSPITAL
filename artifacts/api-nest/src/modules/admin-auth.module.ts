/**
 * AdminAuthModule — admin panel authentication (multi-user, Postgres-backed).
 *
 * Routes under /api/v2/admin/auth:
 *   POST /login           — verify credentials, return a signed per-user token
 *   POST /forgot-password — request password reset (email-based, future)
 *   GET  /me              — validate token, return the live admin profile
 *
 * Routes under /api/v2/admin/users (AdminGuard + users.manage):
 *   GET    /              — list admin accounts (no password hashes)
 *   POST   /              — create an admin account
 *   PATCH  /:id           — update name/role/permissions/active/password
 *   DELETE /:id           — deactivate (soft) an admin account
 *
 * Auth model:
 *   Admin accounts live in the `admin_users` Postgres table. Passwords are
 *   stored as scrypt hashes (`scrypt$salt$hash`) and never returned. On a
 *   successful login the user receives a stateless HMAC-signed token
 *   (see common/admin-token.ts) that encodes their id + role; AdminGuard
 *   verifies the signature on every protected route and handlers load live
 *   role/permissions from Postgres when needed.
 *
 *   The built-in super-admin is seeded from ADMIN_EMAIL / ADMIN_PASSWORD
 *   (dev defaults admin@shaniidrx.com / Admin@2024!). Production fails closed:
 *   the dev defaults are NOT seeded unless both env vars are set on the
 *   deployment, so a forgotten config can't ship a publicly-known login.
 *   ADMIN_API_TOKEN still works as an ops master key (handled in AdminGuard).
 *
 * NestJS rule: every constructor uses explicit @Inject() because tsx/esbuild
 * does NOT emit emitDecoratorMetadata.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { db, adminUsers, type AdminUser } from "@workspace/db"
import { AdminGuard, Public, RequirePerm } from "../common/admin-guard"
import { signAdminToken, verifyAdminToken } from "../common/admin-token"

const DEV_TOKEN = "shaniidrx-admin-dev-token"

/**
 * HttpOnly cookie carrying the signed admin token. Mirrors the localStorage
 * token the client stores after login, but lets browser-driven requests that
 * CANNOT set custom headers still authenticate — admin SSE streams
 * (`EventSource`) and admin file reads (`<img src>` / `<a href>`). AdminGuard
 * accepts it as a fallback. SameSite=lax keeps cross-site state-changing
 * (non-GET) requests from carrying it, so it isn't a CSRF vector for mutations.
 */
export const ADMIN_TOKEN_COOKIE = "shaniidrx_admin_token"
const ADMIN_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

// Role + permission resolution lives in one shared module so the auth service
// and the AdminGuard never drift on what a role is allowed to do.
export { ADMIN_ROLES } from "../common/admin-permissions"
import {
  ADMIN_ROLES,
  type AdminRole,
  defaultPermsForRole,
  effectivePermissions as resolveEffectivePermissions,
} from "../common/admin-permissions"
export type { AdminRole }

function adminEmail() {
  return (process.env.ADMIN_EMAIL || "admin@shaniidrx.com").toLowerCase().trim()
}
function adminPassword() {
  return process.env.ADMIN_PASSWORD || "Admin@2024!"
}
function adminName() {
  return process.env.ADMIN_NAME || "Super Admin"
}

/**
 * In production we refuse to seed/accept the built-in default credentials
 * unless the operator has explicitly set ADMIN_EMAIL + ADMIN_PASSWORD. This
 * stops a deploy that forgot to configure admin creds from shipping with the
 * publicly-known admin@shaniidrx.com / Admin@2024! login.
 */
function defaultCredsAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
}

// ─────────────────────── password hashing (scrypt) ───────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false
  const [, salt, hashHex] = parts
  const expected = Buffer.from(hashHex, "hex")
  const actual = scryptSync(password, salt, expected.length)
  if (expected.length !== actual.length) return false
  try {
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

// ─────────────────────── public-facing shapes ───────────────────────

export type AdminIdentity = {
  id: string
  role: string
  name: string
  email: string
  permissions: string[]
}

export type AdminUserDto = {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  active: boolean
  lastLoginAt: string | null
  createdAt: string | null
}

function toDto(u: AdminUser): AdminUserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    permissions: (u.permissions as string[]) ?? [],
    active: u.active,
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
  }
}

function effectivePermissions(u: AdminUser): string[] {
  if (u.role === "super_admin") return ["*"]
  const stored = (u.permissions as string[]) ?? []
  return stored.length ? stored : defaultPermsForRole(u.role)
}

@Injectable()
export class AdminAuthService {
  private seeded = false

  /**
   * Idempotently ensure the built-in super-admin exists. Safe to call on
   * every login. In production the dev-default account is only seeded when
   * ADMIN_EMAIL + ADMIN_PASSWORD are explicitly configured (fail closed).
   */
  private async ensureSeed(): Promise<void> {
    if (this.seeded) return
    try {
      if (!defaultCredsAllowed()) {
        this.seeded = true
        return
      }
      const email = adminEmail()
      const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
      if (existing.length === 0) {
        await db.insert(adminUsers).values({
          id: randomUUID(),
          email,
          passwordHash: hashPassword(adminPassword()),
          name: adminName(),
          role: "super_admin",
          permissions: ["*"],
          active: true,
        })
        console.log(`[admin-auth] Seeded built-in super-admin account: ${email}`)
      }
      this.seeded = true
    } catch (err) {
      // Don't cache the seeded flag on failure so a transient DB error retries.
      console.error("[admin-auth] ensureSeed failed:", err)
    }
  }

  async login(email: string, password: string): Promise<{ token: string } & AdminIdentity | null> {
    await this.ensureSeed()
    const normalized = email.trim().toLowerCase()
    const rows = await db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.email, normalized), eq(adminUsers.active, true)))
      .limit(1)
    const user = rows[0]
    if (!user || !verifyPassword(password, user.passwordHash)) {
      if (!defaultCredsAllowed()) {
        console.warn(
          "[admin-auth] Login blocked in production: ADMIN_EMAIL and ADMIN_PASSWORD are not set. " +
            "Set both env vars on the deployment to enable admin sign-in.",
        )
      }
      return null
    }
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, user.id))

    const perms = resolveEffectivePermissions(user.role, user.permissions as string[])
    return {
      token: signAdminToken({ uid: user.id, role: user.role }),
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      permissions: perms,
    }
  }

  /** Resolve a bearer token to a live admin identity (used by /me + guards). */
  async verifyToken(token: string): Promise<AdminIdentity | null> {
    // Ops master key.
    const apiToken = (process.env.ADMIN_API_TOKEN || "").trim()
    if (apiToken && token === apiToken) {
      return {
        id: "env-super-admin",
        role: "super_admin",
        name: adminName(),
        email: adminEmail(),
        permissions: ["*"],
      }
    }
    // Dev convenience: when no ADMIN_API_TOKEN is configured and not in prod.
    if (!apiToken && token === DEV_TOKEN && process.env.NODE_ENV !== "production") {
      return {
        id: "dev-super-admin",
        role: "super_admin",
        name: adminName(),
        email: adminEmail(),
        permissions: ["*"],
      }
    }
    const claims = verifyAdminToken(token)
    if (!claims) return null
    const rows = await db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.id, claims.uid), eq(adminUsers.active, true)))
      .limit(1)
    const user = rows[0]
    if (!user) return null
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      permissions: resolveEffectivePermissions(user.role, user.permissions as string[]),
    }
  }

  // ─────────────────────── user management (CRUD) ───────────────────────

  async listUsers(): Promise<AdminUserDto[]> {
    const rows = await db.select().from(adminUsers)
    return rows.map(toDto)
  }

  async createUser(input: {
    email: string
    password: string
    name: string
    role: string
    permissions?: string[]
  }): Promise<AdminUserDto> {
    const email = input.email.trim().toLowerCase()
    if (!email || !input.password || !input.name) {
      throw new HttpException("email, password and name are required", HttpStatus.BAD_REQUEST)
    }
    if (input.password.length < 8) {
      throw new HttpException("Password must be at least 8 characters", HttpStatus.BAD_REQUEST)
    }
    const role = ADMIN_ROLES.includes(input.role as AdminRole) ? input.role : "pharmacist"
    const dup = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1)
    if (dup.length) {
      throw new HttpException("An admin with that email already exists", HttpStatus.CONFLICT)
    }
    const permissions =
      role === "super_admin"
        ? ["*"]
        : input.permissions?.length
          ? input.permissions
          : defaultPermsForRole(role)
    const [row] = await db
      .insert(adminUsers)
      .values({
        id: randomUUID(),
        email,
        passwordHash: hashPassword(input.password),
        name: input.name.trim(),
        role,
        permissions,
        active: true,
      })
      .returning()
    return toDto(row)
  }

  async updateUser(
    id: string,
    patch: {
      name?: string
      role?: string
      permissions?: string[]
      active?: boolean
      password?: string
    },
  ): Promise<AdminUserDto> {
    const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1)
    const existing = rows[0]
    if (!existing) throw new HttpException("Admin account not found", HttpStatus.NOT_FOUND)

    const set: Partial<typeof adminUsers.$inferInsert> = { updatedAt: new Date() }
    if (patch.name !== undefined) set.name = patch.name.trim()
    if (patch.role !== undefined && ADMIN_ROLES.includes(patch.role as AdminRole)) {
      set.role = patch.role
      if (patch.role === "super_admin") {
        set.permissions = ["*"]
      } else {
        // Demotion (or any non-super role assignment): reset the stored
        // permissions to the role's defaults so a former super_admin does NOT
        // retain the wildcard. An explicit `permissions` patch below can still
        // refine this — but it can never reintroduce "*" (stripped there).
        set.permissions = defaultPermsForRole(patch.role)
      }
    }
    // The effective role after this update (patched role if valid, else current).
    const effectiveRole = set.role ?? existing.role
    if (patch.permissions !== undefined && effectiveRole !== "super_admin") {
      // Never let a non-super account be granted the wildcard via an explicit
      // permission list — that would be a privilege-escalation back door.
      set.permissions = patch.permissions.filter((p) => p !== "*")
    }
    if (patch.active !== undefined) set.active = patch.active
    if (patch.password) {
      if (patch.password.length < 8) {
        throw new HttpException("Password must be at least 8 characters", HttpStatus.BAD_REQUEST)
      }
      set.passwordHash = hashPassword(patch.password)
    }
    const [row] = await db.update(adminUsers).set(set).where(eq(adminUsers.id, id)).returning()
    return toDto(row)
  }

  /** Soft-delete: deactivate rather than hard-remove to preserve audit links. */
  async deactivateUser(id: string): Promise<{ ok: true }> {
    const rows = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1)
    if (!rows[0]) throw new HttpException("Admin account not found", HttpStatus.NOT_FOUND)
    await db
      .update(adminUsers)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
    return { ok: true }
  }

  /** Count active super-admins — used to prevent locking everyone out. */
  async activeSuperAdminCount(): Promise<number> {
    const rows = await db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.role, "super_admin"), eq(adminUsers.active, true)))
    return rows.length
  }
}

function bearerFrom(req: Request): string {
  return (
    (req.header("x-admin-token") || "").trim() ||
    (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()
  )
}

@Controller("admin/auth")
class AdminAuthController {
  constructor(@Inject(AdminAuthService) private readonly svc: AdminAuthService) {}

  @Public()
  @Post("login")
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.email || !body?.password) {
      throw new HttpException("Email and password are required", HttpStatus.BAD_REQUEST)
    }
    const result = await this.svc.login(body.email, body.password)
    if (!result) {
      throw new HttpException("Invalid email or password", HttpStatus.UNAUTHORIZED)
    }
    // Mirror the signed token into an HttpOnly cookie so header-less browser
    // requests (admin SSE EventSource, <img>/<a> file reads) can authenticate.
    if (result.token) {
      res.cookie(ADMIN_TOKEN_COOKIE, result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ADMIN_COOKIE_MAX_AGE_MS,
      })
    }
    return result
  }

  @Public()
  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response) {
    // Invalidate the browser auth cookie so a signed-out session can no longer
    // hit header-less admin channels (SSE / file reads). The clear options must
    // match the attributes the cookie was set with or the browser keeps it.
    res.clearCookie(ADMIN_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return { ok: true }
  }

  @Public()
  @Post("forgot-password")
  forgotPassword(@Body() _body: { email?: string }) {
    // Always return ok to avoid leaking which emails are registered.
    // TODO: when RESEND_API_KEY is set, generate a time-limited token,
    // persist to admin_password_resets, and email it via EmailService.
    return {
      ok: true,
      message:
        "If that email is registered as an admin account, recovery instructions will be sent. For urgent access contact your system administrator.",
    }
  }

  @Get("me")
  async getMe(@Req() req: Request) {
    const user = await this.svc.verifyToken(bearerFrom(req))
    if (!user) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    return user
  }
}

@Controller("admin/users")
@UseGuards(AdminGuard)
@RequirePerm("users.manage")
class AdminUsersController {
  constructor(@Inject(AdminAuthService) private readonly svc: AdminAuthService) {}

  /** Ensure the acting admin may manage accounts (super_admin or users.manage). */
  private async assertManage(req: Request): Promise<AdminIdentity> {
    const acting = await this.svc.verifyToken(bearerFrom(req))
    if (!acting) throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED)
    const allowed =
      acting.role === "super_admin" ||
      acting.permissions.includes("*") ||
      acting.permissions.includes("users.manage")
    if (!allowed) {
      throw new HttpException("Requires permission: users.manage", HttpStatus.FORBIDDEN)
    }
    return acting
  }

  @Get()
  async list(@Req() req: Request) {
    await this.assertManage(req)
    return this.svc.listUsers()
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body()
    body: { email?: string; password?: string; name?: string; role?: string; permissions?: string[] },
  ) {
    await this.assertManage(req)
    return this.svc.createUser({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
      name: String(body.name ?? ""),
      role: String(body.role ?? "pharmacist"),
      permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : undefined,
    })
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body()
    body: { name?: string; role?: string; permissions?: string[]; active?: boolean; password?: string },
  ) {
    const acting = await this.assertManage(req)
    // Guard against locking everyone out: don't let the last active super-admin
    // be demoted or deactivated.
    const target = (await this.svc.listUsers()).find((u) => u.id === id)
    if (target?.role === "super_admin" && target.active) {
      const demoting = body.role && body.role !== "super_admin"
      const deactivating = body.active === false
      if ((demoting || deactivating) && (await this.svc.activeSuperAdminCount()) <= 1) {
        throw new HttpException(
          "Cannot demote or deactivate the last active super-admin",
          HttpStatus.BAD_REQUEST,
        )
      }
    }
    void acting
    return this.svc.updateUser(id, body)
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    await this.assertManage(req)
    const target = (await this.svc.listUsers()).find((u) => u.id === id)
    if (target?.role === "super_admin" && target.active && (await this.svc.activeSuperAdminCount()) <= 1) {
      throw new HttpException(
        "Cannot deactivate the last active super-admin",
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.svc.deactivateUser(id)
  }
}

@Module({
  controllers: [AdminAuthController, AdminUsersController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}

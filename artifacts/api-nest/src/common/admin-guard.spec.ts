import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest"
import type { ExecutionContext } from "@nestjs/common"
import { eq } from "drizzle-orm"
import { db, adminUsers } from "@workspace/db"
import { AdminGuard } from "./admin-guard"
import { signAdminToken } from "./admin-token"

/**
 * Regression coverage for the header-less admin auth path. Admin SSE streams
 * (EventSource) and admin file reads (<img>/<a>) cannot set custom headers, so
 * the guard must accept the signed admin token from the HttpOnly
 * `shaniidrx_admin_token` cookie as a fallback — and still reject when it is
 * absent under a production-like fail-closed configuration.
 */

const ADMIN_ID = "admin_guard_spec_super"
const ADMIN_EMAIL = "guard-spec-super@shaniidrx.test"

async function seedAdmin() {
  await db.delete(adminUsers).where(eq(adminUsers.id, ADMIN_ID))
  await db.insert(adminUsers).values({
    id: ADMIN_ID,
    email: ADMIN_EMAIL,
    passwordHash: "scrypt$x$y",
    name: "Guard Spec Super",
    role: "super_admin",
    permissions: ["*"],
    active: true,
  })
}

async function cleanup() {
  await db.delete(adminUsers).where(eq(adminUsers.id, ADMIN_ID))
}

// Minimal ExecutionContext stub: an un-annotated admin route (no Reflector), so
// the guard's fail-closed default requires a wildcard (super_admin) identity.
function ctxWith(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext
}

function reqWithCookie(token?: string, method = "GET"): Record<string, unknown> {
  return {
    method,
    header: () => "",
    cookies: token ? { shaniidrx_admin_token: token } : {},
  }
}

describe("AdminGuard cookie fallback (header-less channels)", () => {
  const prevRequire = process.env.ADMIN_REQUIRE_TOKEN
  const prevApiToken = process.env.ADMIN_API_TOKEN

  beforeEach(async () => {
    // Force the guard closed (production-like) and ensure no ops master key so
    // the signed-token path-2 is the only way in.
    process.env.ADMIN_REQUIRE_TOKEN = "1"
    delete process.env.ADMIN_API_TOKEN
    await seedAdmin()
  })
  afterEach(() => {
    if (prevRequire === undefined) delete process.env.ADMIN_REQUIRE_TOKEN
    else process.env.ADMIN_REQUIRE_TOKEN = prevRequire
    if (prevApiToken === undefined) delete process.env.ADMIN_API_TOKEN
    else process.env.ADMIN_API_TOKEN = prevApiToken
  })
  afterAll(async () => {
    await cleanup()
  })

  it("accepts a valid signed token supplied ONLY via the cookie", async () => {
    const guard = new AdminGuard()
    const token = signAdminToken({ uid: ADMIN_ID, role: "super_admin" })
    await expect(guard.canActivate(ctxWith(reqWithCookie(token)))).resolves.toBe(true)
  })

  it("rejects when no token is provided at all (fail closed)", async () => {
    const guard = new AdminGuard()
    await expect(guard.canActivate(ctxWith(reqWithCookie(undefined)))).rejects.toThrow()
  })

  it("rejects a garbage cookie token (signature check)", async () => {
    const guard = new AdminGuard()
    await expect(
      guard.canActivate(ctxWith(reqWithCookie("not-a-valid-token"))),
    ).rejects.toThrow()
  })

  it("rejects a cookie-only token on a mutating (POST) request", async () => {
    // The cookie fallback is GET/HEAD-only — mutations must carry the header
    // token, so a valid cookie alone cannot authorize a state change.
    const guard = new AdminGuard()
    const token = signAdminToken({ uid: ADMIN_ID, role: "super_admin" })
    await expect(
      guard.canActivate(ctxWith(reqWithCookie(token, "POST"))),
    ).rejects.toThrow()
  })
})

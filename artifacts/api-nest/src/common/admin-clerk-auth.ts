/**
 * Resolve a Clerk JWT to an active admin_users row (Stage 5.1).
 */
import { and, eq } from "drizzle-orm"
import { db, adminUsers } from "@workspace/db"
import { verifyClerkBearer, type ClerkIdentity } from "./clerk-auth"
import { effectivePermissions, type AdminRole } from "./admin-permissions"
import { signAdminToken } from "./admin-token"

export type AdminIdentity = {
  id: string
  role: AdminRole | string
  name: string
  email: string
  permissions: string[]
}

function toIdentity(user: typeof adminUsers.$inferSelect): AdminIdentity {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    permissions: effectivePermissions(user.role, user.permissions as string[]),
  }
}

/** Look up admin by Clerk user id or verified email. */
export async function resolveAdminFromClerk(clerk: ClerkIdentity): Promise<AdminIdentity | null> {
  if (!clerk.email && !clerk.userId) return null

  let user: typeof adminUsers.$inferSelect | undefined

  if (clerk.userId) {
    const byClerk = await db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.active, true), eq(adminUsers.clerkUserId, clerk.userId)))
      .limit(1)
    user = byClerk[0]
  }

  if (!user && clerk.email) {
    const byEmail = await db
      .select()
      .from(adminUsers)
      .where(and(eq(adminUsers.active, true), eq(adminUsers.email, clerk.email)))
      .limit(1)
    user = byEmail[0]
  }

  if (!user) return null

  if (clerk.userId && user.clerkUserId !== clerk.userId) {
    await db
      .update(adminUsers)
      .set({ clerkUserId: clerk.userId, lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, user.id))
  } else {
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsers.id, user.id))
  }

  return toIdentity(user)
}

export async function adminSessionFromClerkBearer(
  authHeader: string | undefined,
): Promise<{ token: string } & AdminIdentity | null> {
  const clerk = await verifyClerkBearer(authHeader)
  if (!clerk) return null
  const identity = await resolveAdminFromClerk(clerk)
  if (!identity) return null
  return {
    token: signAdminToken({ uid: identity.id, role: identity.role }),
    ...identity,
  }
}

export function clerkAdminSsoEnabled(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim())
}

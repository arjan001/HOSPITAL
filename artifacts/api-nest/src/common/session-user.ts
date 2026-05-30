/**
 * session-user — bridges the per-browser session to a durable `users` row.
 *
 * The api-nest session model keys everything by `req.sessionId` (a signed guest
 * cookie today; the Clerk user id once Clerk JWT verification lands). The Drizzle
 * schema keys customer data by `users.id` via a `userId` FK. This helper is the
 * single seam between the two: it upserts a `users` row whose `clerkId` IS the
 * session id, so every per-session module can resolve a stable `userId`.
 *
 * When Clerk lands, `req.sessionId` becomes the Clerk user id and these rows are
 * already keyed by it — no migration of the relationship is needed.
 */
import { eq } from "drizzle-orm"
import { db, users, type User } from "@workspace/db"
import { newId } from "./repository"

/** Resolve (or lazily create) the durable users row for a session. */
export async function ensureUser(sessionId: string): Promise<User> {
  const found = await db.select().from(users).where(eq(users.clerkId, sessionId)).limit(1)
  if (found[0]) return found[0]
  const id = newId("usr")
  await db
    .insert(users)
    .values({ id, clerkId: sessionId, fullName: "" })
    .onConflictDoNothing({ target: users.clerkId })
  const row = await db.select().from(users).where(eq(users.clerkId, sessionId)).limit(1)
  if (!row[0]) throw new Error("ensureUser: failed to resolve user for session")
  return row[0]
}

/** Convenience: just the user id for FK references. */
export async function ensureUserId(sessionId: string): Promise<string> {
  return (await ensureUser(sessionId)).id
}

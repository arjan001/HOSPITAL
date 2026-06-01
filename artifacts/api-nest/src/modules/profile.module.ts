/**
 * Profile module — customer / guest profile management (Postgres-backed).
 *
 * Routes (all scoped to the session cookie):
 *   GET  /api/v2/me      — return the profile for the current session.
 *                          Creates a blank profile (users row) on first access.
 *   PUT  /api/v2/me      — patch name, email, phone, or notification prefs.
 *
 * Data model:
 *   One `users` row per session (clerkId = req.sessionId — see common/session-user.ts).
 *   Persistence is Drizzle/Postgres (`@workspace/db` → `users`).
 *
 * Clerk migration:
 *   When Clerk JWT lands, SessionMiddleware sets req.sessionId = clerkUserId, so
 *   the profile naturally scopes to the authenticated user with no code change.
 *
 * Why explicit @Inject(ProfileService):
 *   tsx/esbuild does NOT emit emitDecoratorMetadata — explicit @Inject(Token) on
 *   every controller constructor is a project-wide rule.
 */
import { Body, Controller, Get, Inject, Injectable, Module, Put, Req } from "@nestjs/common"
import type { Request } from "express"
import { eq } from "drizzle-orm"
import { db, users, type User, type ProfileDetails } from "@workspace/db"
import { ensureUser } from "../common/session-user"

export type Profile = {
  id: string
  sessionId: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  preferences: { marketingEmails: boolean; smsAlerts: boolean }
  profile: ProfileDetails
  createdAt: string
  updatedAt: string
}

type ProfilePatch = Partial<
  Pick<Profile, "fullName" | "email" | "phone" | "dateOfBirth" | "preferences" | "profile">
>

function toProfile(sessionId: string, u: User): Profile {
  return {
    id: u.id,
    sessionId,
    fullName: u.fullName ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    dateOfBirth: u.dateOfBirth ?? "",
    preferences: {
      marketingEmails: u.preferences?.newsletter ?? true,
      smsAlerts: u.preferences?.smsAlerts ?? true,
    },
    profile: u.profile ?? {},
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}

@Injectable()
class ProfileService {
  async getOrCreate(sessionId: string): Promise<Profile> {
    const user = await ensureUser(sessionId)
    return toProfile(sessionId, user)
  }

  async update(sessionId: string, patch: ProfilePatch): Promise<Profile> {
    const user = await ensureUser(sessionId)
    const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() }
    if (patch.fullName !== undefined) set.fullName = patch.fullName
    if (patch.email !== undefined) set.email = patch.email
    if (patch.phone !== undefined) set.phone = patch.phone
    if (patch.dateOfBirth !== undefined) set.dateOfBirth = patch.dateOfBirth
    if (patch.preferences !== undefined) {
      set.preferences = {
        ...(user.preferences ?? {}),
        newsletter: patch.preferences.marketingEmails,
        smsAlerts: patch.preferences.smsAlerts,
      }
    }
    if (patch.profile !== undefined) {
      const next = { ...(user.profile ?? {}), ...patch.profile }
      set.profile = next
      // Keep fullName in sync with first/last when the form supplies them, so
      // cross-system surfaces (checkout, consultations, prescriptions) that read
      // the first-class fullName column stay consistent with the profile editor.
      if (patch.fullName === undefined && (next.firstName || next.lastName)) {
        set.fullName = [next.firstName, next.lastName].filter(Boolean).join(" ").trim()
      }
    }
    const rows = await db.update(users).set(set).where(eq(users.id, user.id)).returning()
    return toProfile(sessionId, rows[0] ?? user)
  }
}

@Controller("me")
class ProfileController {
  constructor(@Inject(ProfileService) private readonly svc: ProfileService) {}

  @Get()
  me(@Req() req: Request) {
    return this.svc.getOrCreate(req.sessionId)
  }

  @Put()
  update(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const patch: ProfilePatch = {}
    if (typeof body["fullName"] === "string") patch.fullName = body["fullName"]
    if (typeof body["email"] === "string") patch.email = body["email"]
    if (typeof body["phone"] === "string") patch.phone = body["phone"]
    if (typeof body["dateOfBirth"] === "string") patch.dateOfBirth = body["dateOfBirth"]
    if (body["preferences"] && typeof body["preferences"] === "object") {
      patch.preferences = body["preferences"] as Profile["preferences"]
    }
    if (body["profile"] && typeof body["profile"] === "object") {
      patch.profile = body["profile"] as Profile["profile"]
    }
    return this.svc.update(req.sessionId, patch)
  }
}

@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}

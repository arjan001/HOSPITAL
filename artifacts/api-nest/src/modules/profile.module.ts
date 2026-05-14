import { Body, Controller, Get, Inject, Injectable, Module, Put, Req } from "@nestjs/common"
import type { Request } from "express"
import { InMemoryRepository, newId } from "../common/repository"

export type Profile = {
  id: string
  sessionId: string
  fullName: string
  email: string
  phone: string
  preferences: { marketingEmails: boolean; smsAlerts: boolean }
  createdAt: string
  updatedAt: string
}

type ProfilePatch = Partial<Pick<Profile, "fullName" | "email" | "phone" | "preferences">>

@Injectable()
class ProfileService {
  // One profile per session, stored via the same InMemoryRepository surface
  // as the other modules. Postgres swap = swap this one repo implementation.
  private repo = new InMemoryRepository<Profile>()

  getOrCreate(sessionId: string): Profile {
    const existing = this.repo.listFor(sessionId)[0]
    if (existing) return existing
    const now = new Date().toISOString()
    const fresh: Profile = {
      id: newId("usr"),
      sessionId,
      fullName: "",
      email: "",
      phone: "",
      preferences: { marketingEmails: true, smsAlerts: true },
      createdAt: now,
      updatedAt: now,
    }
    this.repo.add(sessionId, fresh)
    return fresh
  }

  update(sessionId: string, patch: ProfilePatch): Profile {
    const current = this.getOrCreate(sessionId)
    const next: Profile = {
      ...current,
      ...patch,
      preferences: { ...current.preferences, ...(patch.preferences ?? {}) },
      updatedAt: new Date().toISOString(),
    }
    const updated = this.repo.update(sessionId, current.id, next)
    return updated ?? next
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
    if (body["preferences"] && typeof body["preferences"] === "object") {
      patch.preferences = body["preferences"] as Profile["preferences"]
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

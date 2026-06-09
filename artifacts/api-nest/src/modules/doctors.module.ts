/**
 * Doctors module — Postgres-backed clinician directory + portal auth.
 *
 * Replaces cmsStore `doctors` with durable rows in `doctors` + `doctor_accounts`.
 * Onboarding: admin creates profile → invite email → doctor sets password at /doctor/accept.
 *
 * Routes:
 *   GET    /api/v2/doctors              — public active directory
 *   GET    /api/v2/doctors/:id          — public profile
 *   POST   /api/v2/doctors/auth/login   — doctor portal login
 *   POST   /api/v2/doctors/auth/signout
 *   POST   /api/v2/doctors/auth/accept  — accept invite + set password
 *   GET    /api/v2/doctors/auth/me
 *   GET    /api/v2/admin/doctors        — list all (admin)
 *   POST   /api/v2/admin/doctors        — create
 *   PATCH  /api/v2/admin/doctors/:id    — update
 *   DELETE /api/v2/admin/doctors/:id    — remove
 *   POST   /api/v2/admin/doctors/:id/invite
 *   POST   /api/v2/admin/doctors/:id/resend-invite
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
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { and, desc, eq, isNull } from "drizzle-orm"
import {
  db,
  doctorAccounts,
  doctors,
  consultations,
  type DoctorAvailability,
  type DoctorAccount,
} from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, AnyAdmin, RequirePerm } from "../common/admin-guard"
import {
  type DoctorTokenClaims,
  signDoctorToken,
  verifyDoctorToken,
} from "../common/doctor-token"
import { EmailModule, EmailService } from "./email.module"
import { AuditService } from "./audit.module"

const DOCTOR_TOKEN_COOKIE = "shaniidrx_doctor_token"
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type DoctorDto = {
  id: string
  name: string
  title: string
  specialization: string
  licenseNumber: string
  bio: string
  avatarUrl?: string
  languages: string[]
  consultationRateKES: number
  availability: DoctorAvailability
  yearsExperience: number
  email: string
  phone: string
  active: boolean
  accountStatus: "none" | "invited" | "active" | "suspended"
  hasPortalLogin: boolean
  createdAt: string
  updatedAt: string
}

type DoctorInput = {
  name?: string
  title?: string
  specialization?: string
  licenseNumber?: string
  bio?: string
  avatarUrl?: string
  languages?: string[]
  consultationRateKES?: number
  availability?: Partial<DoctorAvailability>
  yearsExperience?: number
  email?: string
  phone?: string
  active?: boolean
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

function verifyPasswordHash(password: string, stored: string | null): boolean {
  if (!stored) return false
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false
  const salt = parts[1]
  const expected = Buffer.from(parts[2], "hex")
  const actual = scryptSync(password, salt, expected.length)
  try {
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function baseUrl(): string {
  return process.env.PUBLIC_APP_URL?.trim() || "http://localhost:21470"
}

function defaultAvailability(): DoctorAvailability {
  return { monFri: true, weekends: false, hours: "08:00–18:00 EAT" }
}

function toDto(
  row: typeof doctors.$inferSelect,
  account?: DoctorAccount | null,
): DoctorDto {
  const avail = (row.availability as DoctorAvailability | null) ?? defaultAvailability()
  return {
    id: row.id,
    name: row.name,
    title: row.title ?? "MBChB",
    specialization: row.specialty,
    licenseNumber: row.licenseNumber ?? "",
    bio: row.bio ?? "",
    avatarUrl: row.photoUrl ?? undefined,
    languages: Array.isArray(row.languages) ? row.languages : [],
    consultationRateKES: row.consultationFee,
    availability: {
      monFri: avail.monFri ?? true,
      weekends: avail.weekends ?? false,
      hours: avail.hours ?? "08:00–18:00 EAT",
    },
    yearsExperience: row.yearsExperience ?? 0,
    email: row.email ?? "",
    phone: row.phone ?? "",
    active: row.isActive,
    accountStatus: account
      ? (account.status as DoctorDto["accountStatus"])
      : "none",
    hasPortalLogin: Boolean(account?.passwordHash),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function publicAccount(acc: DoctorAccount) {
  return {
    id: acc.id,
    email: acc.email,
    doctorId: acc.doctorId,
    displayName: acc.displayName,
    status: acc.status,
    inviteExpiresAt: acc.inviteExpiresAt ? acc.inviteExpiresAt.toISOString() : null,
    lastLoginAt: acc.lastLoginAt ? acc.lastLoginAt.toISOString() : null,
    hasPassword: Boolean(acc.passwordHash),
    createdAt: acc.createdAt.toISOString(),
    updatedAt: acc.updatedAt.toISOString(),
  }
}

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async accountForDoctor(doctorId: string): Promise<DoctorAccount | undefined> {
    const rows = await db
      .select()
      .from(doctorAccounts)
      .where(eq(doctorAccounts.doctorId, doctorId))
      .limit(1)
    return rows[0]
  }

  async listPublic(): Promise<DoctorDto[]> {
    const rows = await db
      .select()
      .from(doctors)
      .where(eq(doctors.isActive, true))
      .orderBy(desc(doctors.updatedAt))
    const out: DoctorDto[] = []
    for (const row of rows) {
      const acc = await this.accountForDoctor(row.id)
      out.push(toDto(row, acc))
    }
    return out
  }

  async getPublic(id: string): Promise<DoctorDto> {
    const rows = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1)
    if (!rows[0] || !rows[0].isActive) {
      throw new HttpException("Doctor not found", HttpStatus.NOT_FOUND)
    }
    const acc = await this.accountForDoctor(id)
    return toDto(rows[0], acc)
  }

  async listAdmin(): Promise<DoctorDto[]> {
    const rows = await db.select().from(doctors).orderBy(desc(doctors.updatedAt))
    const out: DoctorDto[] = []
    for (const row of rows) {
      const acc = await this.accountForDoctor(row.id)
      out.push(toDto(row, acc))
    }
    return out
  }

  async create(input: DoctorInput): Promise<DoctorDto> {
    const name = String(input.name ?? "").trim()
    const email = String(input.email ?? "").trim().toLowerCase()
    const license = String(input.licenseNumber ?? "").trim()
    if (!name) throw new HttpException("name is required", HttpStatus.BAD_REQUEST)
    if (!email) throw new HttpException("email is required", HttpStatus.BAD_REQUEST)
    if (!license) throw new HttpException("licenseNumber is required", HttpStatus.BAD_REQUEST)

    const existing = await db.select().from(doctors).where(eq(doctors.email, email)).limit(1)
    if (existing[0]) {
      throw new HttpException("A doctor with this email already exists", HttpStatus.CONFLICT)
    }

    const id = newId("doc")
    const now = new Date()
    const avail = { ...defaultAvailability(), ...(input.availability ?? {}) }
    await db.insert(doctors).values({
      id,
      name,
      title: String(input.title ?? "MBChB").trim() || "MBChB",
      specialty: String(input.specialization ?? "General Practice").trim() || "General Practice",
      licenseNumber: license,
      bio: String(input.bio ?? "").trim() || null,
      photoUrl: String(input.avatarUrl ?? "").trim() || null,
      email,
      phone: String(input.phone ?? "").trim(),
      languages: input.languages ?? ["English", "Swahili"],
      availability: avail,
      yearsExperience: Math.max(0, Number(input.yearsExperience) || 0),
      consultationFee: Math.max(0, Number(input.consultationRateKES) || 500),
      isActive: input.active !== false,
      createdAt: now,
      updatedAt: now,
    })

    const row = (await db.select().from(doctors).where(eq(doctors.id, id)).limit(1))[0]!
    void this.audit.record({
      module: "Doctors",
      action: "create",
      key: id,
      summary: `Onboarded ${name} (${row.specialty})`,
      after: { email, licenseNumber: license },
    })
    return toDto(row, null)
  }

  async update(id: string, input: DoctorInput): Promise<DoctorDto> {
    const rows = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1)
    if (!rows[0]) throw new HttpException("Doctor not found", HttpStatus.NOT_FOUND)

    const email = input.email !== undefined ? String(input.email).trim().toLowerCase() : rows[0].email
    if (email && email !== rows[0].email) {
      const clash = await db.select().from(doctors).where(eq(doctors.email, email)).limit(1)
      if (clash[0] && clash[0].id !== id) {
        throw new HttpException("Email already in use", HttpStatus.CONFLICT)
      }
    }

    const curAvail = (rows[0].availability as DoctorAvailability) ?? defaultAvailability()
    const avail = input.availability ? { ...curAvail, ...input.availability } : curAvail
    const now = new Date()

    await db
      .update(doctors)
      .set({
        name: input.name !== undefined ? String(input.name).trim() || rows[0].name : rows[0].name,
        title: input.title !== undefined ? String(input.title).trim() || "MBChB" : rows[0].title,
        specialty:
          input.specialization !== undefined
            ? String(input.specialization).trim() || rows[0].specialty
            : rows[0].specialty,
        licenseNumber:
          input.licenseNumber !== undefined
            ? String(input.licenseNumber).trim()
            : rows[0].licenseNumber,
        bio: input.bio !== undefined ? String(input.bio).trim() || null : rows[0].bio,
        photoUrl:
          input.avatarUrl !== undefined
            ? String(input.avatarUrl).trim() || null
            : rows[0].photoUrl,
        email,
        phone: input.phone !== undefined ? String(input.phone).trim() : rows[0].phone,
        languages: input.languages ?? rows[0].languages,
        availability: avail,
        yearsExperience:
          input.yearsExperience !== undefined
            ? Math.max(0, Number(input.yearsExperience) || 0)
            : rows[0].yearsExperience,
        consultationFee:
          input.consultationRateKES !== undefined
            ? Math.max(0, Number(input.consultationRateKES) || 0)
            : rows[0].consultationFee,
        isActive: input.active !== undefined ? Boolean(input.active) : rows[0].isActive,
        updatedAt: now,
      })
      .where(eq(doctors.id, id))

    const updated = (await db.select().from(doctors).where(eq(doctors.id, id)).limit(1))[0]!
    const acc = await this.accountForDoctor(id)
    if (acc && email && acc.email !== email) {
      await db.update(doctorAccounts).set({ email, updatedAt: now }).where(eq(doctorAccounts.id, acc.id))
    }
    return toDto(updated, acc)
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const rows = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1)
    if (!rows[0]) throw new HttpException("Doctor not found", HttpStatus.NOT_FOUND)
    await db.delete(doctors).where(eq(doctors.id, id))
    void this.audit.record({
      module: "Doctors",
      action: "delete",
      key: id,
      summary: `Removed doctor ${rows[0].name}`,
    })
    return { deleted: true }
  }

  private async ensureAccount(doctorId: string): Promise<DoctorAccount> {
    const doc = (await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1))[0]
    if (!doc) throw new HttpException("Doctor not found", HttpStatus.NOT_FOUND)
    const email = doc.email.trim().toLowerCase()
    if (!email) throw new HttpException("Doctor email is required before inviting", HttpStatus.BAD_REQUEST)

    const existing = await this.accountForDoctor(doctorId)
    if (existing) return existing

    const [acc] = await db
      .insert(doctorAccounts)
      .values({
        id: newId("dacc"),
        email,
        doctorId,
        displayName: doc.name,
        status: "invited",
      })
      .returning()
    return acc
  }

  async invite(doctorId: string): Promise<{ doctor: DoctorDto; account: ReturnType<typeof publicAccount> }> {
    const acc = await this.ensureAccount(doctorId)
    const inviteToken = randomBytes(24).toString("hex")
    const [updated] = await db
      .update(doctorAccounts)
      .set({
        status: "invited",
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        updatedAt: new Date(),
      })
      .where(eq(doctorAccounts.id, acc.id))
      .returning()

    const acceptUrl = `${baseUrl()}/doctor/accept?token=${inviteToken}`
    void this.email
      .send({
        to: updated.email,
        template: "generic",
        subject: "Your Shaniid RX doctor portal access",
        data: {
          name: updated.displayName,
          heading: "Welcome to Shaniid RX",
          body: `You've been onboarded as a verified clinician on Shaniid RX. Use the link below to set your password and access your doctor panel, prescriptions inbox, and consultations.`,
          cta_url: acceptUrl,
          cta_label: "Set password & sign in",
        },
      })
      .catch(() => undefined)

    const doc = (await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1))[0]!
    void this.audit.record({
      module: "Doctors",
      action: "invite",
      key: doctorId,
      summary: `Portal invite sent to ${updated.email}`,
    })
    return { doctor: toDto(doc, updated), account: publicAccount(updated) }
  }

  async resendInvite(doctorId: string) {
    return this.invite(doctorId)
  }

  issueToken(res: Response, acc: DoctorAccount): string {
    const token = signDoctorToken({ aid: acc.id, doctorId: acc.doctorId }, TOKEN_MAX_AGE_MS)
    res.cookie(DOCTOR_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TOKEN_MAX_AGE_MS,
      path: "/",
    })
    return token
  }

  readToken(req: Request): DoctorTokenClaims | null {
    const raw = req.cookies?.[DOCTOR_TOKEN_COOKIE] as string | undefined
    return verifyDoctorToken(raw)
  }

  async login(
    res: Response,
    email: string,
    password: string,
  ): Promise<{ ok: true; token: string; account: ReturnType<typeof publicAccount>; doctor: DoctorDto }> {
    const cleaned = String(email ?? "").trim().toLowerCase()
    const pwd = String(password ?? "")
    if (!cleaned || !pwd) {
      throw new HttpException("Email and password are required", HttpStatus.BAD_REQUEST)
    }

    const [acc] = await db
      .select()
      .from(doctorAccounts)
      .where(eq(doctorAccounts.email, cleaned))
      .limit(1)

    if (!acc || !verifyPasswordHash(pwd, acc.passwordHash)) {
      throw new HttpException("Invalid email or password", HttpStatus.UNAUTHORIZED)
    }
    if (acc.status !== "active") {
      throw new HttpException(
        acc.status === "invited"
          ? "Please accept your invitation email to set a password first."
          : "This account has been suspended.",
        HttpStatus.FORBIDDEN,
      )
    }

    await db
      .update(doctorAccounts)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(doctorAccounts.id, acc.id))

    const doc = (await db.select().from(doctors).where(eq(doctors.id, acc.doctorId)).limit(1))[0]
    if (!doc) throw new HttpException("Doctor profile missing", HttpStatus.NOT_FOUND)

    const token = this.issueToken(res, acc)
    return { ok: true, token, account: publicAccount(acc), doctor: toDto(doc, acc) }
  }

  signOut(res: Response): { ok: true } {
    res.clearCookie(DOCTOR_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return { ok: true }
  }

  async acceptInvite(
    res: Response,
    token: string,
    password: string,
  ): Promise<{ ok: true; token: string; account: ReturnType<typeof publicAccount>; doctor: DoctorDto }> {
    const t = String(token ?? "").trim()
    const pwd = String(password ?? "").trim()
    if (!t || pwd.length < 8) {
      throw new HttpException(
        "A valid invite token and a password of at least 8 characters are required",
        HttpStatus.BAD_REQUEST,
      )
    }

    const [acc] = await db
      .select()
      .from(doctorAccounts)
      .where(eq(doctorAccounts.inviteToken, t))
      .limit(1)
    if (!acc) throw new HttpException("Invalid or used invitation link", HttpStatus.BAD_REQUEST)
    if (acc.inviteExpiresAt && acc.inviteExpiresAt.getTime() < Date.now()) {
      throw new HttpException("This invitation has expired. Ask your admin to re-send it.", HttpStatus.BAD_REQUEST)
    }

    const [updated] = await db
      .update(doctorAccounts)
      .set({
        passwordHash: hashPassword(pwd),
        status: "active",
        inviteToken: null,
        inviteExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(doctorAccounts.id, acc.id))
      .returning()

    const doc = (await db.select().from(doctors).where(eq(doctors.id, updated.doctorId)).limit(1))[0]
    if (!doc) throw new HttpException("Doctor profile missing", HttpStatus.NOT_FOUND)

    const jwt = this.issueToken(res, updated)
    return { ok: true, token: jwt, account: publicAccount(updated), doctor: toDto(doc, updated) }
  }

  async me(req: Request): Promise<{ ok: true; account: ReturnType<typeof publicAccount>; doctor: DoctorDto }> {
    const claims = this.readToken(req)
    if (!claims) throw new HttpException("Not signed in", HttpStatus.UNAUTHORIZED)

    const [acc] = await db
      .select()
      .from(doctorAccounts)
      .where(eq(doctorAccounts.id, claims.aid))
      .limit(1)
    if (!acc || acc.doctorId !== claims.doctorId) {
      throw new HttpException("Session invalid", HttpStatus.UNAUTHORIZED)
    }

    const doc = (await db.select().from(doctors).where(eq(doctors.id, acc.doctorId)).limit(1))[0]
    if (!doc) throw new HttpException("Doctor profile missing", HttpStatus.NOT_FOUND)

    return { ok: true, account: publicAccount(acc), doctor: toDto(doc, acc) }
  }

  async listMyPatients(req: Request) {
    const claims = this.readToken(req)
    if (!claims) throw new HttpException("Not signed in", HttpStatus.UNAUTHORIZED)

    const rows = await db
      .select()
      .from(consultations)
      .where(eq(consultations.doctorId, claims.doctorId))
      .orderBy(desc(consultations.updatedAt))

    const byKey = new Map<
      string,
      {
        patientId: string
        patientName: string
        patientPhone: string
        lastSeen: string
        consultationCount: number
      }
    >()
    for (const r of rows) {
      const patientId = r.userId || `phone:${r.patientPhone}` || `name:${r.patientName}`
      const seen = r.updatedAt.toISOString()
      const hit = byKey.get(patientId)
      if (hit) {
        hit.consultationCount += 1
        if (seen > hit.lastSeen) hit.lastSeen = seen
      } else {
        byKey.set(patientId, {
          patientId,
          patientName: r.patientName,
          patientPhone: r.patientPhone,
          lastSeen: seen,
          consultationCount: 1,
        })
      }
    }
    return Array.from(byKey.values())
  }

  async claimConsultation(req: Request, consultationId: string) {
    const claims = this.readToken(req)
    if (!claims) throw new HttpException("Not signed in", HttpStatus.UNAUTHORIZED)

    const [claimed] = await db
      .update(consultations)
      .set({ doctorId: claims.doctorId, updatedAt: new Date() })
      .where(and(eq(consultations.id, consultationId), isNull(consultations.doctorId)))
      .returning()
    if (claimed) return { ok: true as const, consultationId: claimed.id }

    const [existing] = await db
      .select()
      .from(consultations)
      .where(eq(consultations.id, consultationId))
      .limit(1)
    if (!existing) throw new HttpException("Consultation not found", HttpStatus.NOT_FOUND)
    if (existing.doctorId !== claims.doctorId) {
      throw new HttpException("Consultation already assigned to another doctor", HttpStatus.FORBIDDEN)
    }
    return { ok: true as const, consultationId: existing.id }
  }
}

@Controller("doctors")
class PublicDoctorsController {
  constructor(@Inject(DoctorsService) private readonly doctors: DoctorsService) {}

  @Get()
  list() {
    return this.doctors.listPublic()
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.doctors.getPublic(id)
  }
}

@Controller("doctors/auth")
class DoctorAuthController {
  constructor(@Inject(DoctorsService) private readonly doctors: DoctorsService) {}

  @Post("login")
  login(
    @Res({ passthrough: true }) res: Response,
    @Body() body: { email?: string; password?: string },
  ) {
    return this.doctors.login(res, body?.email ?? "", body?.password ?? "")
  }

  @Post("signout")
  signOut(@Res({ passthrough: true }) res: Response) {
    return this.doctors.signOut(res)
  }

  @Post("accept")
  accept(
    @Res({ passthrough: true }) res: Response,
    @Body() body: { token?: string; password?: string },
  ) {
    return this.doctors.acceptInvite(res, body?.token ?? "", body?.password ?? "")
  }

  @Get("me")
  me(@Req() req: Request) {
    return this.doctors.me(req)
  }
}

@Controller("doctors/me")
class DoctorMeController {
  constructor(@Inject(DoctorsService) private readonly doctors: DoctorsService) {}

  @Get("patients")
  patients(@Req() req: Request) {
    return this.doctors.listMyPatients(req)
  }

  @Post("consultations/:id/claim")
  claim(@Req() req: Request, @Param("id") id: string) {
    return this.doctors.claimConsultation(req, id)
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/doctors")
class AdminDoctorsController {
  constructor(@Inject(DoctorsService) private readonly doctors: DoctorsService) {}

  @Get()
  @RequirePerm("consult.handle", "users.manage")
  list() {
    return this.doctors.listAdmin()
  }

  @Post()
  @RequirePerm("consult.handle", "users.manage")
  create(@Body() body: DoctorInput) {
    return this.doctors.create(body)
  }

  @Patch(":id")
  @RequirePerm("consult.handle", "users.manage")
  patch(@Param("id") id: string, @Body() body: DoctorInput) {
    return this.doctors.update(id, body)
  }

  @Delete(":id")
  @RequirePerm("consult.handle", "users.manage")
  remove(@Param("id") id: string) {
    return this.doctors.remove(id)
  }

  @Post(":id/invite")
  @RequirePerm("consult.handle", "users.manage")
  invite(@Param("id") id: string) {
    return this.doctors.invite(id)
  }

  @Post(":id/resend-invite")
  @RequirePerm("consult.handle", "users.manage")
  resend(@Param("id") id: string) {
    return this.doctors.resendInvite(id)
  }
}

@Module({
  imports: [EmailModule],
  // Auth controller first so `doctors/auth/*` is not captured by `doctors/:id`.
  controllers: [DoctorAuthController, DoctorMeController, PublicDoctorsController, AdminDoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}

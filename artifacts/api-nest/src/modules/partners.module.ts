/**
 * Partners module — real, entity-scoped partner accounts + portal business logic.
 *
 * Replaces the legacy "portal code + email + in-memory session" model with:
 *   - partner_accounts: real per-partner logins (scrypt password hashes).
 *   - signed partner tokens (partner-token.ts) carrying {pid, partnerType,
 *     partnerId}; survives restarts; every data read is entity-scoped server-side.
 *   - invite flow (admin provisions an account → email accept link → partner sets
 *     password) AND self-signup (public application → admin review → invite).
 *   - structured Postgres tables (supplier_products, partner_quotes,
 *     clinic_orders, clinic_transactions, delivery_jobs) instead of cms JSON blobs.
 *
 * Route groups:
 *   PartnerAuthController       /api/v2/partners/{:type/auth,:type/signout,apply,accept,me}
 *   PartnerSupplierController   /api/v2/partners/supplier/{catalog,opportunities,quotes}
 *   PartnerClinicController     /api/v2/partners/clinic/{catalog,orders,ledger}
 *   PartnerLogisticsController  /api/v2/partners/logistics/{jobs,earnings}
 *   PartnerAdminController      /api/v2/partners/admin/{invite,accounts,applications}  (AdminGuard)
 *   PartnerWelcomeController    /api/v2/partners/welcome
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
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { and, desc, eq, ilike, inArray, type SQL } from "drizzle-orm"
import {
  db,
  partnerAccounts,
  partnerApplications,
  partnerDirectory,
  partnerMembers,
  supplierProducts,
  sourcingRequests,
  partnerQuotes,
  clinicOrders,
  clinicTransactions,
  deliveryJobs,
  products,
  purchaseOrders,
  purchaseOrderLines,
  type PartnerAccount,
} from "@workspace/db"
import { newId } from "../common/repository"
import { signPartnerToken, verifyPartnerToken } from "../common/partner-token"
import { verifyClerkBearer } from "../common/clerk-auth"
import { EmailModule, EmailService } from "./email.module"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"
import { WhatsAppModule, WhatsAppService } from "./whatsapp.module"
import {
  PartnerDirectoryModule,
  PartnerDirectoryService,
  type DirectoryKey,
} from "./partner-directory.module"
import { AdminGuard } from "../common/admin-guard"
import { PartnerOrgService, type PartnerAuthContext } from "./partner-org.service"

/** Generate a human-readable temporary password: e.g. "SHNRX-AB3X7F" */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `SHNRX-${rand(6)}`
}

export type PartnerType = "supplier" | "clinic" | "logistics"

const PARTNER_TOKEN_COOKIE = "shaniidrx_partner_token"
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const PORTAL_PATHS: Record<PartnerType, string> = {
  supplier: "/portal/supplier",
  clinic: "/portal/clinic",
  logistics: "/portal/logistics",
}

// ─────────────────────── partner directory (Postgres profiles) ───────────────────────
const CMS_KEY_FOR: Record<PartnerType, DirectoryKey> = {
  supplier: "suppliers",
  clinic: "clinics",
  logistics: "logistics-partners",
}

type CmsPartnerRecord = { id: string; email?: string; portalCode?: string; [k: string]: unknown }

// ─────────────────────── password hashing (scrypt) ───────────────────────
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

function assertType(t: string): PartnerType {
  if (t === "supplier" || t === "clinic" || t === "logistics") return t
  throw new HttpException(`Unknown partner type "${t}"`, HttpStatus.BAD_REQUEST)
}

function publicAccount(acc: PartnerAccount) {
  return {
    id: acc.id,
    email: acc.email,
    partnerType: acc.partnerType,
    partnerId: acc.partnerId,
    displayName: acc.displayName,
    status: acc.status,
    inviteExpiresAt: acc.inviteExpiresAt,
    lastLoginAt: acc.lastLoginAt,
    metadata: acc.metadata,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
    hasPassword: Boolean(acc.passwordHash),
  }
}

function baseUrl(): string {
  return process.env.PUBLIC_APP_URL?.trim() || "https://shaniidrx.com"
}

// ─────────────────────────────── auth service ───────────────────────────────
@Injectable()
export class PartnerAuthService {
  constructor(
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(AdminCmsService) private readonly cms: AdminCmsService,
    @Inject(PartnerDirectoryService) private readonly directory: PartnerDirectoryService,
    @Inject(WhatsAppService) private readonly whatsapp: WhatsAppService,
    @Inject(PartnerOrgService) private readonly org: PartnerOrgService,
  ) {}

  /** Partner profile list from Postgres `partner_directory`. */
  async partnerRecords(type: PartnerType): Promise<CmsPartnerRecord[]> {
    return (await this.directory.list(CMS_KEY_FOR[type])) as CmsPartnerRecord[]
  }

  async partnerRecord(type: PartnerType, id: string): Promise<CmsPartnerRecord | null> {
    const row = await this.directory.findById(type, id)
    return row as CmsPartnerRecord | null
  }

  /** Generic cms_docs read (non-partner keys only). */
  async cmsLookup<T>(key: string, fallback: T): Promise<T> {
    try {
      const entry = await this.cms.get(key)
      return ((entry?.value as T) ?? fallback)
    } catch {
      return fallback
    }
  }

  /** Resolve signed token or Clerk org session; returns account + member role for RBAC. */
  async requirePartnerContext(req: Request, expectedType?: PartnerType): Promise<PartnerAuthContext> {
    const acc = await this.requirePartner(req, expectedType)
    const memberId = String((acc.metadata as Record<string, unknown> | null)?.memberId ?? "")
    let member = null
    if (memberId) {
      const [row] = await db.select().from(partnerMembers).where(eq(partnerMembers.id, memberId)).limit(1)
      member = row ?? null
    }
    return {
      account: acc,
      member,
      memberRole: this.org.memberRoleFromAccount(acc),
    }
  }

  /** Resolve the signed token from header or cookie and return the live account. */
  async requirePartner(req: Request, expectedType?: PartnerType): Promise<PartnerAccount> {
    const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      PARTNER_TOKEN_COOKIE
    ]
    const headerToken =
      (req.header("x-partner-token") || "").trim() ||
      (req.header("authorization") || "").replace(/^Bearer\s+/i, "").trim()
    const raw = headerToken || cookieToken || ""
    const claims = verifyPartnerToken(raw)
    if (claims) {
      if (expectedType && claims.partnerType !== expectedType) {
        throw new HttpException("Wrong portal for this account", HttpStatus.FORBIDDEN)
      }
      const [acc] = await db
        .select()
        .from(partnerAccounts)
        .where(eq(partnerAccounts.id, claims.pid))
        .limit(1)
      if (!acc || acc.status !== "active") {
        throw new HttpException("Account is not active", HttpStatus.UNAUTHORIZED)
      }
      return acc
    }

    const clerk = await verifyClerkBearer(req.header("authorization"))
    if (clerk?.email) {
      const partnerType =
        expectedType ||
        (clerk.publicMetadata?.partnerType === "supplier" ||
        clerk.publicMetadata?.partnerType === "clinic" ||
        clerk.publicMetadata?.partnerType === "logistics"
          ? (clerk.publicMetadata.partnerType as PartnerType)
          : null)
      if (!partnerType) {
        throw new HttpException(
          "Clerk account is missing partnerType in public metadata",
          HttpStatus.FORBIDDEN,
        )
      }

      if (clerk.orgId || clerk.publicMetadata?.clerkOrgId) {
        const ctx = await this.org.resolveFromClerk(clerk, partnerType)
        if (ctx) return ctx.account
      }

      let [acc] = await db
        .select()
        .from(partnerAccounts)
        .where(
          and(
            eq(partnerAccounts.email, clerk.email),
            eq(partnerAccounts.partnerType, partnerType),
          ),
        )
        .limit(1)
      if (!acc) {
        const partnerId = String(clerk.publicMetadata?.partnerId ?? "").trim()
        if (partnerId) {
          const recs = await this.partnerRecords(partnerType)
          const rec = recs.find((r) => r.id === partnerId)
          if (rec) {
            ;[acc] = await db
              .insert(partnerAccounts)
              .values({
                id: newId("pacc"),
                email: clerk.email,
                passwordHash: null,
                partnerType,
                partnerId,
                displayName:
                  (rec.companyName as string) ||
                  (rec.clinicName as string) ||
                  (rec.name as string) ||
                  clerk.email,
                status: "active",
                metadata: { clerkUserId: clerk.userId },
              })
              .returning()
          }
        }
      } else if (clerk.userId) {
        await db
          .update(partnerAccounts)
          .set({
            metadata: { ...(acc.metadata ?? {}), clerkUserId: clerk.userId },
            updatedAt: new Date(),
          })
          .where(eq(partnerAccounts.id, acc.id))
      }
      if (!acc || acc.status !== "active") {
        throw new HttpException("No active partner account for this Clerk user", HttpStatus.UNAUTHORIZED)
      }
      return acc
    }

    throw new HttpException("Not signed in", HttpStatus.UNAUTHORIZED)
  }

  private issue(res: Response, acc: PartnerAccount) {
    const token = signPartnerToken({
      pid: acc.id,
      partnerType: acc.partnerType as PartnerType,
      partnerId: acc.partnerId,
    })
    res.cookie(PARTNER_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TOKEN_MAX_AGE_MS,
    })
    return token
  }

  async login(
    res: Response,
    type: string,
    email: string,
    password: string,
  ): Promise<{ ok: true; token: string; partner: ReturnType<typeof publicAccount> }> {
    const partnerType = assertType(type)
    const cleanedEmail = (email || "").trim().toLowerCase()
    const pwd = (password || "").trim()
    if (!cleanedEmail || !pwd) {
      throw new HttpException("Email and password are required", HttpStatus.BAD_REQUEST)
    }

    let [acc] = await db
      .select()
      .from(partnerAccounts)
      .where(and(eq(partnerAccounts.email, cleanedEmail), eq(partnerAccounts.partnerType, partnerType)))
      .limit(1)

    // Backward-compat bridge: legacy partners exist only as cms records with a
    // shared `portalCode`. On first login (no account yet), if the supplied
    // password matches the cms portalCode, auto-provision an active account so
    // existing partners keep working without a manual migration.
    if (!acc) {
      const recs = await this.partnerRecords(partnerType)
      const rec = recs.find(
        (r) =>
          String(r.email ?? "").trim().toLowerCase() === cleanedEmail &&
          String(r.portalCode ?? "").trim().toUpperCase() === pwd.toUpperCase(),
      )
      if (rec) {
        const displayName =
          (rec["supplierName"] as string) ||
          (rec["clinicName"] as string) ||
          (rec["companyName"] as string) ||
          (rec["name"] as string) ||
          cleanedEmail
        ;[acc] = await db
          .insert(partnerAccounts)
          .values({
            id: newId("pacc"),
            email: cleanedEmail,
            passwordHash: hashPassword(pwd),
            partnerType,
            partnerId: rec.id,
            displayName,
            status: "active",
          })
          .returning()
      }
    }

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
      .update(partnerAccounts)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(partnerAccounts.id, acc.id))

    const token = this.issue(res, acc)
    return { ok: true, token, partner: publicAccount(acc) }
  }

  /** Exchange a Clerk session JWT for a partner portal cookie (same as password login). */
  async clerkSession(
    res: Response,
    type: string,
    authHeader: string | undefined,
  ): Promise<{ ok: true; token: string; partner: ReturnType<typeof publicAccount> }> {
    const partnerType = assertType(type)
    const clerk = await verifyClerkBearer(authHeader)
    if (!clerk) {
      const hasSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim())
      throw new HttpException(
        hasSecret
          ? "Valid Clerk session token required. Ensure CLERK_SECRET_KEY matches your Clerk application (same instance as VITE_CLERK_PUBLISHABLE_KEY)."
          : "Clerk is not configured on the server (CLERK_SECRET_KEY missing).",
        HttpStatus.UNAUTHORIZED,
      )
    }
    if (!clerk.email) {
      throw new HttpException(
        "Clerk session is valid but has no email. Complete your Clerk profile and try again.",
        HttpStatus.UNAUTHORIZED,
      )
    }
    const req = { header: (n: string) => (n.toLowerCase() === "authorization" ? authHeader ?? "" : "") } as Request
    const acc = await this.requirePartner(req, partnerType)
    await db
      .update(partnerAccounts)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(partnerAccounts.id, acc.id))
    const token = this.issue(res, acc)
    return { ok: true, token, partner: publicAccount(acc) }
  }

  /** Register a new partner company via Clerk Organization (self-service). */
  async registerClerkOrg(
    res: Response,
    type: string,
    authHeader: string | undefined,
    orgName: string,
    profile: Record<string, unknown> = {},
  ) {
    const partnerType = assertType(type)
    const clerk = await verifyClerkBearer(authHeader)
    if (!clerk) {
      const hasSecret = Boolean(process.env.CLERK_SECRET_KEY?.trim())
      throw new HttpException(
        hasSecret
          ? "Valid Clerk session token required. Ensure CLERK_SECRET_KEY matches your Clerk application (same instance as VITE_CLERK_PUBLISHABLE_KEY)."
          : "Clerk is not configured on the server (CLERK_SECRET_KEY missing).",
        HttpStatus.UNAUTHORIZED,
      )
    }
    if (!clerk.email) {
      throw new HttpException(
        "Clerk session is valid but has no email. Complete your Clerk profile and try again.",
        HttpStatus.UNAUTHORIZED,
      )
    }
    const { partnerId, clerkOrgId } = await this.org.registerOrganization(
      clerk,
      partnerType,
      orgName,
      profile,
    )
    return {
      ok: true,
      pendingApproval: true,
      partnerId,
      clerkOrgId,
      message:
        "Your organization has been registered and is pending approval by Shaniid RX. You can sign in once an administrator approves your application.",
    }
  }

  async listOrgMembers(req: Request, expectedType: PartnerType) {
    const ctx = await this.requirePartnerContext(req, expectedType)
    return this.org.listMembers(ctx.account.partnerId)
  }

  async inviteOrgMember(req: Request, expectedType: PartnerType, body: Record<string, unknown>) {
    const ctx = await this.requirePartnerContext(req, expectedType)
    return this.org.inviteMember(ctx, body)
  }

  async listOrgCouriers(req: Request) {
    const ctx = await this.requirePartnerContext(req, "logistics")
    this.org.assertCanManageTeam(ctx.memberRole)
    return this.org.listCouriers(ctx.account.partnerId)
  }

  signOut(res: Response): { ok: true } {
    res.clearCookie(PARTNER_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })
    return { ok: true }
  }

  /** Public self-signup: queue a partner application for admin review. */
  async apply(body: {
    partnerType?: string
    orgName?: string
    contactName?: string
    email?: string
    phone?: string
    message?: string
  }): Promise<{ ok: true; id: string }> {
    const partnerType = assertType(body?.partnerType ?? "")
    const orgName = (body?.orgName || "").trim()
    const contactName = (body?.contactName || "").trim()
    const email = (body?.email || "").trim().toLowerCase()
    if (!orgName || !contactName || !email) {
      throw new HttpException(
        "Organisation, contact name and email are required",
        HttpStatus.BAD_REQUEST,
      )
    }
    const [row] = await db
      .insert(partnerApplications)
      .values({
        id: newId("papp"),
        partnerType,
        orgName,
        contactName,
        email,
        phone: (body?.phone || "").trim() || null,
        message: (body?.message || "").trim() || null,
        status: "pending",
      })
      .returning()

    void this.email
      .send({
        to: email,
        template: "generic",
        subject: "We've received your Shaniid RX partner application",
        data: {
          name: contactName,
          heading: "Application received",
          body: `Thank you for applying to join Shaniid RX as a ${partnerType} partner. Our team will review your application and get back to you shortly.`,
          cta_url: baseUrl(),
          cta_label: "Visit Shaniid RX",
        },
      })
      .catch(() => undefined)

    return { ok: true, id: row.id }
  }

  /** Accept an invite: set a password and activate the account. */
  async accept(
    res: Response,
    token: string,
    password: string,
  ): Promise<{ ok: true; token: string; partner: ReturnType<typeof publicAccount> }> {
    const t = (token || "").trim()
    const pwd = (password || "").trim()
    if (!t || pwd.length < 8) {
      throw new HttpException(
        "A valid invite token and a password of at least 8 characters are required",
        HttpStatus.BAD_REQUEST,
      )
    }
    const [acc] = await db
      .select()
      .from(partnerAccounts)
      .where(eq(partnerAccounts.inviteToken, t))
      .limit(1)
    if (!acc) throw new HttpException("Invalid or used invitation link", HttpStatus.BAD_REQUEST)
    if (acc.inviteExpiresAt && acc.inviteExpiresAt.getTime() < Date.now()) {
      throw new HttpException("This invitation has expired. Ask your admin to re-send it.", HttpStatus.BAD_REQUEST)
    }
    const [updated] = await db
      .update(partnerAccounts)
      .set({
        passwordHash: hashPassword(pwd),
        status: "active",
        inviteToken: null,
        inviteExpiresAt: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(partnerAccounts.id, acc.id))
      .returning()
    const newToken = this.issue(res, updated)
    return { ok: true, token: newToken, partner: publicAccount(updated) }
  }

  async me(req: Request): Promise<{
    ok: true
    partner: ReturnType<typeof publicAccount>
    profile: unknown
    memberRole: string
    member: typeof partnerMembers.$inferSelect | null
  }> {
    const ctx = await this.requirePartnerContext(req)
    const recs = await this.partnerRecords(ctx.account.partnerType as PartnerType)
    const profile = recs.find((r: CmsPartnerRecord) => r.id === ctx.account.partnerId) ?? null
    return {
      ok: true,
      partner: publicAccount(ctx.account),
      profile,
      memberRole: ctx.memberRole,
      member: ctx.member,
    }
  }

  // ── admin: invites + accounts + applications ──
  async invite(body: Record<string, unknown>): Promise<ReturnType<typeof publicAccount>> {
    const partnerType = assertType(String(body?.partnerType ?? ""))
    const partnerId = String(body?.partnerId ?? "").trim()
    const email = String(body?.email ?? "").trim().toLowerCase()
    const displayName = String(body?.displayName ?? "").trim() || email
    const phone = String(body?.phone ?? "").trim()
    const metadata = (body?.metadata ?? null) as Record<string, unknown> | null
    if (!partnerId || !email) {
      throw new HttpException("partnerId and email are required", HttpStatus.BAD_REQUEST)
    }
    const existing = await db
      .select()
      .from(partnerAccounts)
      .where(eq(partnerAccounts.email, email))
      .limit(1)
    if (existing.length) {
      throw new HttpException("An account with that email already exists", HttpStatus.CONFLICT)
    }

    // Auto-generate a temp password so the partner can log in immediately
    // without needing to click an invite link first.
    const tempPassword = generateTempPassword()
    const inviteToken = randomBytes(24).toString("hex")

    const [acc] = await db
      .insert(partnerAccounts)
      .values({
        id: newId("pacc"),
        email,
        passwordHash: hashPassword(tempPassword),
        partnerType,
        partnerId,
        displayName,
        status: "active",
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        metadata: { ...(metadata ?? {}), requirePasswordChange: true },
      })
      .returning()

    const loginUrl = `${baseUrl()}${PORTAL_PATHS[partnerType]}`
    const acceptUrl = `${baseUrl()}${PORTAL_PATHS[partnerType]}/accept?token=${inviteToken}`

    const portalLabel = partnerType === "supplier" ? "Supplier" : partnerType === "clinic" ? "Clinic" : "Logistics"

    void this.email
      .send({
        to: email,
        template: "generic",
        subject: `Your Shaniid RX ${portalLabel} Portal credentials`,
        data: {
          name: displayName,
          heading: `Welcome to the Shaniid RX ${portalLabel} Portal`,
          body: `You have been registered as a ${partnerType} partner on Shaniid RX.\n\nYour login credentials are:\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nLogin now at: ${loginUrl}\n\nFor your security, please change your password after first login. Alternatively, click the button below to set your own password directly.`,
          cta_url: acceptUrl,
          cta_label: "Set your own password",
        },
      })
      .catch(() => undefined)

    // Share credentials via WhatsApp if a phone number was provided
    if (phone) {
      void this.whatsapp
        .send({
          to: phone,
          body: `Welcome to Shaniid RX ${portalLabel} Portal!\n\nYour login credentials:\nEmail: ${email}\nTemp password: ${tempPassword}\nPortal: ${loginUrl}\n\nPlease change your password after first login.`,
        })
        .catch(() => undefined)
    }

    return publicAccount(acc)
  }

  async listAccounts(type?: string): Promise<ReturnType<typeof publicAccount>[]> {
    const where: SQL | undefined = type ? eq(partnerAccounts.partnerType, assertType(type)) : undefined
    const rows = await db
      .select()
      .from(partnerAccounts)
      .where(where)
      .orderBy(desc(partnerAccounts.createdAt))
    return rows.map(publicAccount)
  }

  async updateAccount(
    id: string,
    body: Record<string, unknown>,
  ): Promise<ReturnType<typeof publicAccount>> {
    const set: Partial<typeof partnerAccounts.$inferInsert> = { updatedAt: new Date() }
    if (body?.status !== undefined) {
      const status = String(body.status)
      if (!["invited", "active", "suspended", "pending"].includes(status)) {
        throw new HttpException("Invalid status", HttpStatus.BAD_REQUEST)
      }
      set.status = status
    }
    if (body?.metadata !== undefined) set.metadata = body.metadata as Record<string, unknown>
    if (body?.displayName) set.displayName = String(body.displayName)
    const [acc] = await db
      .update(partnerAccounts)
      .set(set)
      .where(eq(partnerAccounts.id, id))
      .returning()
    if (!acc) throw new HttpException("Account not found", HttpStatus.NOT_FOUND)
    return publicAccount(acc)
  }

  async listAdminMembers(type?: string, partnerId?: string) {
    const conditions: SQL[] = []
    if (type) conditions.push(eq(partnerMembers.partnerType, assertType(type)))
    if (partnerId) conditions.push(eq(partnerMembers.partnerId, String(partnerId).trim()))
    const where = conditions.length ? and(...conditions) : undefined
    const rows = await db
      .select()
      .from(partnerMembers)
      .where(where)
      .orderBy(desc(partnerMembers.createdAt))
    return rows.map((m) => ({
      id: m.id,
      partnerId: m.partnerId,
      partnerType: m.partnerType,
      clerkOrgId: m.clerkOrgId,
      clerkUserId: m.clerkUserId,
      email: m.email,
      displayName: m.displayName,
      role: m.role,
      status: m.status,
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
      createdAt: m.createdAt,
    }))
  }

  async updateAdminMember(id: string, body: Record<string, unknown>) {
    const set: Partial<typeof partnerMembers.$inferInsert> = { updatedAt: new Date() }
    if (body?.status !== undefined) {
      const status = String(body.status)
      if (!["invited", "active", "suspended"].includes(status)) {
        throw new HttpException("Invalid member status", HttpStatus.BAD_REQUEST)
      }
      set.status = status
    }
    if (body?.displayName) set.displayName = String(body.displayName).trim()
    if (body?.role) {
      const role = String(body.role)
      if (!["owner", "admin", "member", "rider", "dispatcher"].includes(role)) {
        throw new HttpException("Invalid member role", HttpStatus.BAD_REQUEST)
      }
      set.role = role
    }
    const [row] = await db
      .update(partnerMembers)
      .set(set)
      .where(eq(partnerMembers.id, id))
      .returning()
    if (!row) throw new HttpException("Member not found", HttpStatus.NOT_FOUND)
    return row
  }

  async resendInvite(id: string): Promise<ReturnType<typeof publicAccount>> {
    const [acc] = await db.select().from(partnerAccounts).where(eq(partnerAccounts.id, id)).limit(1)
    if (!acc) throw new HttpException("Account not found", HttpStatus.NOT_FOUND)
    const inviteToken = randomBytes(24).toString("hex")
    const [updated] = await db
      .update(partnerAccounts)
      .set({
        status: "invited",
        inviteToken,
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
        updatedAt: new Date(),
      })
      .where(eq(partnerAccounts.id, id))
      .returning()
    const acceptUrl = `${baseUrl()}${PORTAL_PATHS[acc.partnerType as PartnerType]}/accept?token=${inviteToken}`
    void this.email
      .send({
        to: acc.email,
        template: "generic",
        subject: "Your Shaniid RX partner portal invitation",
        data: {
          name: acc.displayName,
          heading: "Partner portal invitation",
          body: "Click below to set your password and access your portal.",
          cta_url: acceptUrl,
          cta_label: "Set your password",
        },
      })
      .catch(() => undefined)
    return publicAccount(updated)
  }

  async listApplications(status?: string) {
    const where = status ? eq(partnerApplications.status, status) : undefined
    return db
      .select()
      .from(partnerApplications)
      .where(where)
      .orderBy(desc(partnerApplications.createdAt))
  }

  async reviewApplication(
    id: string,
    decision: "approved" | "rejected",
    reviewNotes?: string,
  ) {
    const [row] = await db
      .update(partnerApplications)
      .set({ status: decision, reviewNotes: reviewNotes ?? null, reviewedAt: new Date() })
      .where(eq(partnerApplications.id, id))
      .returning()
    if (!row) throw new HttpException("Application not found", HttpStatus.NOT_FOUND)
    // On approval, auto-provision an invited account so the partner receives an
    // accept link and can set a password. Fail soft — the review still stands.
    let invited: ReturnType<typeof publicAccount> | null = null
    if (decision === "approved") {
      try {
        const isClerkOrgApp = /clerk organization self-registration/i.test(row.message ?? "")
        if (isClerkOrgApp) {
          const [dir] = await db
            .select()
            .from(partnerDirectory)
            .where(
              and(
                eq(partnerDirectory.email, row.email.toLowerCase()),
                eq(partnerDirectory.partnerType, row.partnerType),
              ),
            )
            .orderBy(desc(partnerDirectory.createdAt))
            .limit(1)
          if (dir) {
            await db
              .update(partnerDirectory)
              .set({ status: "active", updatedAt: new Date() })
              .where(eq(partnerDirectory.id, dir.id))
            await db
              .update(partnerAccounts)
              .set({ status: "active", updatedAt: new Date() })
              .where(
                and(
                  eq(partnerAccounts.email, row.email.toLowerCase()),
                  eq(partnerAccounts.partnerType, row.partnerType),
                ),
              )
          }
        } else {
          const existing = await db
            .select()
            .from(partnerAccounts)
            .where(eq(partnerAccounts.email, row.email.toLowerCase()))
            .limit(1)
          if (!existing.length) {
            const partnerId = await this.org.provisionDirectoryFromApplication(row)
            invited = await this.invite({
              partnerType: row.partnerType,
              partnerId,
              email: row.email,
              displayName: row.orgName || row.contactName || row.email,
              metadata: {
                orgName: row.orgName,
                contactName: row.contactName,
                phone: row.phone,
                fromApplication: row.id,
              },
            })
          }
        }
      } catch {
        /* account provisioning failed — application remains approved */
      }
    }
    return { ...row, invited }
  }
}

// ─────────────────────────────── portal service ───────────────────────────────
@Injectable()
export class PartnerPortalService {
  constructor(
    @Inject(PartnerAuthService) public readonly auth: PartnerAuthService,
    @Inject(PartnerOrgService) private readonly org: PartnerOrgService,
  ) {}

  // ---- supplier ----
  async listCatalog(partnerId: string) {
    return db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.partnerId, partnerId))
      .orderBy(desc(supplierProducts.updatedAt))
  }

  async addCatalogItem(partnerId: string, b: Record<string, unknown>) {
    const name = String(b?.productName ?? "").trim()
    const unitPrice = Math.round(Number(b?.unitPrice ?? 0))
    if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpException("productName and a valid unitPrice are required", HttpStatus.BAD_REQUEST)
    }
    const [row] = await db
      .insert(supplierProducts)
      .values({
        id: newId("sprd"),
        partnerId,
        productName: name,
        sku: (b?.sku as string) || null,
        category: (b?.category as string) || null,
        unitPrice,
        currency: (b?.currency as string) || "KES",
        moq: Math.max(1, Math.round(Number(b?.moq ?? 1)) || 1),
        leadTimeDays: Math.max(0, Math.round(Number(b?.leadTimeDays ?? 7)) || 7),
        stockQty: Math.max(0, Math.round(Number(b?.stockQty ?? 0)) || 0),
        status: (b?.status as string) === "inactive" ? "inactive" : "active",
        notes: (b?.notes as string) || null,
      })
      .returning()
    return row
  }

  async updateCatalogItem(partnerId: string, id: string, b: Record<string, unknown>) {
    const set: Partial<typeof supplierProducts.$inferInsert> = { updatedAt: new Date() }
    if (b?.productName !== undefined) set.productName = String(b.productName).trim()
    if (b?.sku !== undefined) set.sku = (b.sku as string) || null
    if (b?.category !== undefined) set.category = (b.category as string) || null
    if (b?.unitPrice !== undefined) set.unitPrice = Math.round(Number(b.unitPrice))
    if (b?.moq !== undefined) set.moq = Math.max(1, Math.round(Number(b.moq)) || 1)
    if (b?.leadTimeDays !== undefined) set.leadTimeDays = Math.max(0, Math.round(Number(b.leadTimeDays)) || 0)
    if (b?.stockQty !== undefined) set.stockQty = Math.max(0, Math.round(Number(b.stockQty)) || 0)
    if (b?.status !== undefined) set.status = b.status === "inactive" ? "inactive" : "active"
    if (b?.notes !== undefined) set.notes = (b.notes as string) || null
    const [row] = await db
      .update(supplierProducts)
      .set(set)
      .where(and(eq(supplierProducts.id, id), eq(supplierProducts.partnerId, partnerId)))
      .returning()
    if (!row) throw new HttpException("Catalogue item not found", HttpStatus.NOT_FOUND)
    return row
  }

  async deleteCatalogItem(partnerId: string, id: string) {
    const [row] = await db
      .delete(supplierProducts)
      .where(and(eq(supplierProducts.id, id), eq(supplierProducts.partnerId, partnerId)))
      .returning()
    if (!row) throw new HttpException("Catalogue item not found", HttpStatus.NOT_FOUND)
    return { ok: true }
  }

  async opportunities() {
    return db
      .select()
      .from(sourcingRequests)
      .where(inArray(sourcingRequests.status, ["open", "quoting"]))
      .orderBy(desc(sourcingRequests.createdAt))
  }

  async submitQuote(acc: PartnerAccount, b: Record<string, unknown>) {
    const unitPrice = Math.round(Number(b?.unitPrice ?? 0))
    const quantity = Math.round(Number(b?.quantity ?? 0))
    const leadTimeDays = Math.round(Number(b?.leadTimeDays ?? 0))
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || quantity <= 0) {
      throw new HttpException("A valid unitPrice and quantity are required", HttpStatus.BAD_REQUEST)
    }
    const sourcingRequestId = (b?.sourcingRequestId as string) || null
    if (sourcingRequestId) {
      const [sr] = await db
        .select()
        .from(sourcingRequests)
        .where(eq(sourcingRequests.id, sourcingRequestId))
        .limit(1)
      if (!sr) throw new HttpException("Sourcing request not found", HttpStatus.NOT_FOUND)
    }
    const [row] = await db
      .insert(partnerQuotes)
      .values({
        id: newId("pq"),
        sourcingRequestId,
        supplierId: acc.partnerId,
        supplierName: acc.displayName,
        supplierEmail: acc.email,
        unitPrice,
        quantity,
        leadTimeDays: Math.max(0, leadTimeDays),
        notes: (b?.notes as string) || null,
        status: "pending",
      })
      .returning()
    // Move the request into "quoting" so admin sees activity.
    if (sourcingRequestId) {
      await db
        .update(sourcingRequests)
        .set({ status: "quoting", updatedAt: new Date() })
        .where(and(eq(sourcingRequests.id, sourcingRequestId), eq(sourcingRequests.status, "open")))
    }
    return row
  }

  async listQuotes(partnerId: string) {
    return db
      .select()
      .from(partnerQuotes)
      .where(eq(partnerQuotes.supplierId, partnerId))
      .orderBy(desc(partnerQuotes.submittedAt))
  }

  /** Return all purchase orders placed for this supplier, with line items. */
  async listSupplierPOs(supplierId: string) {
    const pos = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.supplierId, supplierId))
      .orderBy(desc(purchaseOrders.createdAt))
    if (pos.length === 0) return []
    const lines = await db
      .select()
      .from(purchaseOrderLines)
      .where(inArray(purchaseOrderLines.purchaseOrderId, pos.map((p) => p.id)))
    const linesByPo = new Map<string, typeof lines>()
    for (const l of lines) {
      const arr = linesByPo.get(l.purchaseOrderId) ?? []
      arr.push(l)
      linesByPo.set(l.purchaseOrderId, arr)
    }
    return pos.map((po) => ({
      ...po,
      items: (linesByPo.get(po.id) ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        total: l.qty * l.unitPrice,
      })),
    }))
  }

  // ---- clinic ----
  async productLookup(q: string) {
    const term = (q || "").trim()
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        stock: products.stock,
        requiresPrescription: products.requiresPrescription,
      })
      .from(products)
      .where(
        term
          ? and(eq(products.isPublished, true), ilike(products.name, `%${term}%`))
          : eq(products.isPublished, true),
      )
      .orderBy(products.name)
      .limit(50)
    return rows
  }

  private async clinicCreditLimit(acc: PartnerAccount): Promise<number> {
    const meta = (acc.metadata ?? {}) as Record<string, unknown>
    const fromMeta = Number(meta.creditLimit)
    if (Number.isFinite(fromMeta)) return fromMeta
    const rec = await this.auth.partnerRecord("clinic", acc.partnerId)
    return Number(rec?.creditLimit ?? 0) || 0
  }

  private async clinicOutstanding(partnerId: string): Promise<number> {
    const [last] = await db
      .select()
      .from(clinicTransactions)
      .where(eq(clinicTransactions.clinicPartnerId, partnerId))
      .orderBy(desc(clinicTransactions.createdAt))
      .limit(1)
    return last?.balanceAfter ?? 0
  }

  async placeClinicOrder(acc: PartnerAccount, b: Record<string, unknown>) {
    const rawItems = Array.isArray(b?.items) ? (b.items as Record<string, unknown>[]) : []
    const items = rawItems
      .map((it) => ({
        name: String(it?.name ?? "").trim(),
        qty: Math.max(1, Math.round(Number(it?.qty ?? 0)) || 0),
        unitPrice: Math.max(0, Math.round(Number(it?.unitPrice ?? 0)) || 0),
        patient: (it?.patient as string) || undefined,
      }))
      .filter((it) => it.name && it.qty > 0)
    if (!items.length) {
      throw new HttpException("At least one valid order line is required", HttpStatus.BAD_REQUEST)
    }
    const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
    const deliveryFee = Math.max(0, Math.round(Number(b?.deliveryFee ?? 0)) || 0)
    const total = subtotal + deliveryFee
    const creditLine = Boolean(b?.creditLine)
    const orderRef = `CLN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`

    const order = await db.transaction(async (tx) => {
      // Serialize concurrent credit operations for this clinic by locking its
      // account row, so two simultaneous credit orders can't both pass the check.
      await tx.select().from(partnerAccounts).where(eq(partnerAccounts.id, acc.id)).for("update")

      let balanceAfter = 0
      if (creditLine) {
        const limit = await this.clinicCreditLimit(acc)
        const [last] = await tx
          .select()
          .from(clinicTransactions)
          .where(eq(clinicTransactions.clinicPartnerId, acc.partnerId))
          .orderBy(desc(clinicTransactions.createdAt))
          .limit(1)
        const outstanding = last?.balanceAfter ?? 0
        balanceAfter = outstanding + total
        if (balanceAfter > limit) {
          throw new HttpException(
            `Credit limit exceeded. Outstanding KSH ${outstanding.toLocaleString()} + KSH ${total.toLocaleString()} exceeds your limit of KSH ${limit.toLocaleString()}.`,
            HttpStatus.BAD_REQUEST,
          )
        }
      }

      const [created] = await tx
        .insert(clinicOrders)
        .values({
          id: newId("cord"),
          orderRef,
          clinicId: acc.partnerId,
          clinicName: acc.displayName,
          clinicEmail: acc.email,
          items,
          subtotal,
          deliveryFee,
          total,
          status: "pending",
          notes: (b?.notes as string) || null,
          deliveryAddress: (b?.deliveryAddress as string) || null,
          creditLine,
        })
        .returning()

      if (creditLine) {
        await tx.insert(clinicTransactions).values({
          id: newId("ctx"),
          clinicPartnerId: acc.partnerId,
          orderRef,
          type: "charge",
          amount: total,
          balanceAfter,
          note: `Credit order ${orderRef}`,
          createdBy: acc.id,
        })
      }
      return created
    })

    return order
  }

  async listClinicOrders(partnerId: string) {
    return db
      .select()
      .from(clinicOrders)
      .where(eq(clinicOrders.clinicId, partnerId))
      .orderBy(desc(clinicOrders.placedAt))
  }

  async clinicLedger(acc: PartnerAccount) {
    const [limit, outstanding, txns] = await Promise.all([
      this.clinicCreditLimit(acc),
      this.clinicOutstanding(acc.partnerId),
      db
        .select()
        .from(clinicTransactions)
        .where(eq(clinicTransactions.clinicPartnerId, acc.partnerId))
        .orderBy(desc(clinicTransactions.createdAt))
        .limit(100),
    ])
    return {
      creditLimit: limit,
      outstanding,
      available: Math.max(0, limit - outstanding),
      transactions: txns,
    }
  }

  // ---- logistics ----
  async listJobs(ctx: PartnerAuthContext) {
    const partnerId = ctx.account.partnerId
    const rows = await db
      .select()
      .from(deliveryJobs)
      .where(eq(deliveryJobs.logisticsPartnerId, partnerId))
      .orderBy(desc(deliveryJobs.createdAt))

    const memberId = ctx.member?.id
    if (memberId && this.org.isCourierRole(ctx.memberRole)) {
      return rows.filter((j) => j.assignedMemberId === memberId || !j.assignedMemberId)
    }
    return rows
  }

  async assignJobToMember(
    ctx: PartnerAuthContext,
    jobId: string,
    memberId: string,
  ) {
    this.org.assertCanManageTeam(ctx.memberRole)
    const [member] = await db
      .select()
      .from(partnerMembers)
      .where(
        and(eq(partnerMembers.id, memberId), eq(partnerMembers.partnerId, ctx.account.partnerId)),
      )
      .limit(1)
    if (!member || member.status !== "active") {
      throw new HttpException("Courier not found on your team", HttpStatus.NOT_FOUND)
    }
    const [row] = await db
      .update(deliveryJobs)
      .set({
        assignedMemberId: member.id,
        assignedRiderId: member.id,
        assignedRiderName: member.displayName || member.email,
        status: "assigned",
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(deliveryJobs.id, jobId), eq(deliveryJobs.logisticsPartnerId, ctx.account.partnerId)),
      )
      .returning()
    if (!row) throw new HttpException("Delivery job not found", HttpStatus.NOT_FOUND)
    return row
  }

  async updateJobStatus(partnerId: string, id: string, status: string) {
    const allowed = ["assigned", "picked_up", "in_transit", "delivered", "failed"]
    if (!allowed.includes(status)) {
      throw new HttpException(`Invalid status "${status}"`, HttpStatus.BAD_REQUEST)
    }
    const set: Partial<typeof deliveryJobs.$inferInsert> = { status, updatedAt: new Date() }
    if (status === "assigned") set.assignedAt = new Date()
    if (status === "picked_up") set.pickedUpAt = new Date()
    if (status === "delivered") set.deliveredAt = new Date()
    const [row] = await db
      .update(deliveryJobs)
      .set(set)
      .where(and(eq(deliveryJobs.id, id), eq(deliveryJobs.logisticsPartnerId, partnerId)))
      .returning()
    if (!row) throw new HttpException("Delivery job not found", HttpStatus.NOT_FOUND)
    return row
  }

  async submitPod(partnerId: string, id: string, proofOfDeliveryUrl: string, notes?: string) {
    if (!proofOfDeliveryUrl) {
      throw new HttpException("proofOfDeliveryUrl is required", HttpStatus.BAD_REQUEST)
    }
    const [row] = await db
      .update(deliveryJobs)
      .set({
        proofOfDeliveryUrl,
        status: "delivered",
        deliveredAt: new Date(),
        notes: notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(deliveryJobs.id, id), eq(deliveryJobs.logisticsPartnerId, partnerId)))
      .returning()
    if (!row) throw new HttpException("Delivery job not found", HttpStatus.NOT_FOUND)
    return row
  }

  async earnings(acc: PartnerAccount) {
    const meta = (acc.metadata ?? {}) as Record<string, unknown>
    const ratePerDelivery = Math.max(0, Number(meta.ratePerDelivery) || 0)
    const jobs = await db
      .select()
      .from(deliveryJobs)
      .where(eq(deliveryJobs.logisticsPartnerId, acc.partnerId))
      .orderBy(desc(deliveryJobs.createdAt))
    const delivered = jobs.filter((j) => j.status === "delivered")
    const inProgress = jobs.filter((j) => ["assigned", "in_transit"].includes(j.status))
    return {
      ratePerDelivery,
      totals: {
        deliveredCount: delivered.length,
        inProgressCount: inProgress.length,
        totalEarned: delivered.length * ratePerDelivery,
        projected: inProgress.length * ratePerDelivery,
      },
      recent: delivered.slice(0, 50).map((j) => ({
        jobRef: j.jobRef,
        deliveredAt: j.deliveredAt,
        amount: ratePerDelivery,
        deliveryAddress: j.deliveryAddress,
      })),
    }
  }
}

// ─────────────────────────────── controllers ───────────────────────────────
@Controller("partners")
class PartnerAuthController {
  constructor(@Inject(PartnerAuthService) private readonly svc: PartnerAuthService) {}

  @Post(":type/auth")
  login(
    @Req() _req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param("type") type: string,
    @Body() body: { email?: string; password?: string; portalCode?: string },
  ) {
    // Accept `password` (new) or `portalCode` (legacy field name) for compat.
    return this.svc.login(res, type, body?.email ?? "", body?.password ?? body?.portalCode ?? "")
  }

  @Post(":type/clerk-session")
  clerkSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param("type") type: string,
  ) {
    return this.svc.clerkSession(res, type, req.header("authorization"))
  }

  @Post(":type/register-org")
  registerOrg(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param("type") type: string,
    @Body() body: { orgName?: string; name?: string; profile?: Record<string, unknown> },
  ) {
    const orgName =
      String(body?.orgName ?? body?.name ?? "").trim() ||
      String(
        body?.profile?.companyName ??
          body?.profile?.clinicName ??
          body?.profile?.logisticsName ??
          body?.profile?.name ??
          "",
      ).trim()
    return this.svc.registerClerkOrg(
      res,
      type,
      req.header("authorization"),
      orgName,
      body?.profile ?? {},
    )
  }

  @Get(":type/members")
  members(@Req() req: Request, @Param("type") type: string) {
    return this.svc.listOrgMembers(req, assertType(type))
  }

  @Post(":type/members/invite")
  inviteMember(
    @Req() req: Request,
    @Param("type") type: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.svc.inviteOrgMember(req, assertType(type), body)
  }

  @Post(":type/signout")
  signOut(@Res({ passthrough: true }) res: Response) {
    return this.svc.signOut(res)
  }

  @Post("apply")
  apply(@Body() body: Record<string, string>) {
    return this.svc.apply(body)
  }

  @Post("accept")
  accept(
    @Res({ passthrough: true }) res: Response,
    @Body() body: { token?: string; password?: string },
  ) {
    return this.svc.accept(res, body?.token ?? "", body?.password ?? "")
  }

  @Get("me")
  me(@Req() req: Request) {
    return this.svc.me(req)
  }
}

@Controller("partners/supplier")
class PartnerSupplierController {
  constructor(@Inject(PartnerPortalService) private readonly svc: PartnerPortalService) {}

  @Get("catalog")
  async catalog(@Req() req: Request) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.listCatalog(acc.partnerId)
  }
  @Post("catalog")
  async addCatalog(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.addCatalogItem(acc.partnerId, body)
  }
  @Patch("catalog/:id")
  async updateCatalog(@Req() req: Request, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.updateCatalogItem(acc.partnerId, id, body)
  }
  @Delete("catalog/:id")
  async deleteCatalog(@Req() req: Request, @Param("id") id: string) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.deleteCatalogItem(acc.partnerId, id)
  }
  @Get("opportunities")
  async opportunities(@Req() req: Request) {
    await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.opportunities()
  }
  @Post("quotes")
  async submitQuote(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.submitQuote(acc, body)
  }
  @Get("quotes")
  async quotes(@Req() req: Request) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.listQuotes(acc.partnerId)
  }

  @Get("purchase-orders")
  async purchaseOrders(@Req() req: Request) {
    const acc = await this.svc.auth.requirePartner(req, "supplier")
    return this.svc.listSupplierPOs(acc.partnerId)
  }
}

@Controller("partners/clinic")
class PartnerClinicController {
  constructor(@Inject(PartnerPortalService) private readonly svc: PartnerPortalService) {}

  @Get("catalog")
  async catalog(@Req() req: Request, @Query("q") q: string) {
    await this.svc.auth.requirePartner(req, "clinic")
    return this.svc.productLookup(q ?? "")
  }
  @Post("orders")
  async placeOrder(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const acc = await this.svc.auth.requirePartner(req, "clinic")
    return this.svc.placeClinicOrder(acc, body)
  }
  @Get("orders")
  async orders(@Req() req: Request) {
    const acc = await this.svc.auth.requirePartner(req, "clinic")
    return this.svc.listClinicOrders(acc.partnerId)
  }
  @Get("ledger")
  async ledger(@Req() req: Request) {
    const acc = await this.svc.auth.requirePartner(req, "clinic")
    return this.svc.clinicLedger(acc)
  }
}

@Controller("partners/logistics")
class PartnerLogisticsController {
  constructor(@Inject(PartnerPortalService) private readonly svc: PartnerPortalService) {}

  @Get("jobs")
  async jobs(@Req() req: Request) {
    const ctx = await this.svc.auth.requirePartnerContext(req, "logistics")
    return this.svc.listJobs(ctx)
  }
  @Get("couriers")
  async couriers(@Req() req: Request) {
    return this.svc.auth.listOrgCouriers(req)
  }
  @Post("jobs/:id/assign")
  async assignJob(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { memberId?: string },
  ) {
    const ctx = await this.svc.auth.requirePartnerContext(req, "logistics")
    return this.svc.assignJobToMember(ctx, id, String(body?.memberId ?? ""))
  }
  @Patch("jobs/:id/status")
  async status(@Req() req: Request, @Param("id") id: string, @Body() body: { status?: string }) {
    const acc = await this.svc.auth.requirePartner(req, "logistics")
    return this.svc.updateJobStatus(acc.partnerId, id, body?.status ?? "")
  }
  @Post("jobs/:id/pod")
  async pod(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { proofOfDeliveryUrl?: string; notes?: string },
  ) {
    const acc = await this.svc.auth.requirePartner(req, "logistics")
    return this.svc.submitPod(acc.partnerId, id, body?.proofOfDeliveryUrl ?? "", body?.notes)
  }
  @Get("earnings")
  async earnings(@Req() req: Request) {
    const acc = await this.svc.auth.requirePartner(req, "logistics")
    return this.svc.earnings(acc)
  }
}

@UseGuards(AdminGuard)
@Controller("partners/admin")
class PartnerAdminController {
  constructor(@Inject(PartnerAuthService) private readonly svc: PartnerAuthService) {}

  @Post("invite")
  invite(@Body() body: Record<string, unknown>) {
    return this.svc.invite(body)
  }
  @Get("accounts")
  accounts(@Query("type") type?: string) {
    return this.svc.listAccounts(type)
  }
  @Patch("accounts/:id")
  updateAccount(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.updateAccount(id, body)
  }
  @Get("members")
  members(@Query("type") type?: string, @Query("partnerId") partnerId?: string) {
    return this.svc.listAdminMembers(type, partnerId)
  }
  @Patch("members/:id")
  updateMember(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.updateAdminMember(id, body)
  }
  @Post("accounts/:id/resend-invite")
  resend(@Param("id") id: string) {
    return this.svc.resendInvite(id)
  }
  @Get("applications")
  applications(@Query("status") status?: string) {
    return this.svc.listApplications(status)
  }
  @Post("applications/:id/approve")
  approve(@Param("id") id: string, @Body() body: { reviewNotes?: string }) {
    return this.svc.reviewApplication(id, "approved", body?.reviewNotes)
  }
  @Post("applications/:id/reject")
  reject(@Param("id") id: string, @Body() body: { reviewNotes?: string }) {
    return this.svc.reviewApplication(id, "rejected", body?.reviewNotes)
  }
}

@UseGuards(AdminGuard)
@Controller("partners/welcome")
class PartnerWelcomeController {
  constructor(@Inject(PartnerAuthService) private readonly svc: PartnerAuthService) {}

  @Post()
  async send(@Body() body: { partnerType?: string; partnerId?: string; email?: string; displayName?: string }) {
    if (!body?.email) throw new HttpException("email is required", HttpStatus.BAD_REQUEST)
    if (!body?.partnerId) throw new HttpException("partnerId is required", HttpStatus.BAD_REQUEST)
    return this.svc.invite(body)
  }
}

@Module({
  imports: [EmailModule, AdminCmsModule, PartnerDirectoryModule, WhatsAppModule],
  controllers: [
    PartnerAuthController,
    PartnerSupplierController,
    PartnerClinicController,
    PartnerLogisticsController,
    PartnerAdminController,
    PartnerWelcomeController,
  ],
  providers: [PartnerAuthService, PartnerPortalService, PartnerOrgService],
})
export class PartnersModule {}

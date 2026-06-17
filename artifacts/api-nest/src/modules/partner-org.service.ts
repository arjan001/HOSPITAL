/**
 * Clerk Organization tenancy for partner portals — register orgs, sync members,
 * invite employees, and enforce partner_id scoping (no cross-org data leaks).
 */
import { HttpException, HttpStatus, Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import {
  db,
  partnerAccounts,
  partnerApplications,
  partnerDirectory,
  partnerMembers,
  type PartnerAccount,
  type PartnerMember,
} from "@workspace/db"
import { newId } from "../common/repository"
import type { ClerkIdentity } from "../common/clerk-auth"
import {
  clerkPartnerOrgEnabled,
  createClerkOrgInvitation,
  createClerkOrganization,
  setClerkUserPartnerMetadata,
  type PartnerMemberRole,
} from "../common/clerk-partner-org"

export type PartnerType = "supplier" | "clinic" | "logistics"

export type PartnerAuthContext = {
  account: PartnerAccount
  member: PartnerMember | null
  memberRole: PartnerMemberRole
}

const OWNER_ROLES: PartnerMemberRole[] = ["owner", "admin"]
const COURIER_ROLES: PartnerMemberRole[] = ["rider", "dispatcher", "member"]

function mapClerkOrgRole(orgRole: string | null): PartnerMemberRole {
  if (orgRole === "org:admin") return "admin"
  return "member"
}

function displayNameForType(partnerType: PartnerType, orgName: string) {
  return orgName
}

function defaultPayload(partnerType: PartnerType, orgName: string, email: string) {
  const base = {
    id: "",
    email,
    status: "pending",
    portalCode: "",
  }
  if (partnerType === "supplier") {
    return { ...base, companyName: orgName, supplierName: orgName }
  }
  if (partnerType === "clinic") {
    return { ...base, clinicName: orgName }
  }
  return { ...base, companyName: orgName, name: orgName, coverageCounties: [] as string[] }
}

@Injectable()
export class PartnerOrgService {
  async directoryByOrg(clerkOrgId: string, partnerType: PartnerType) {
    const [row] = await db
      .select()
      .from(partnerDirectory)
      .where(
        and(eq(partnerDirectory.clerkOrgId, clerkOrgId), eq(partnerDirectory.partnerType, partnerType)),
      )
      .limit(1)
    return row ?? null
  }

  async memberForUser(clerkOrgId: string, clerkUserId: string) {
    const [row] = await db
      .select()
      .from(partnerMembers)
      .where(
        and(
          eq(partnerMembers.clerkOrgId, clerkOrgId),
          eq(partnerMembers.clerkUserId, clerkUserId),
          eq(partnerMembers.status, "active"),
        ),
      )
      .limit(1)
    return row ?? null
  }

  /** Resolve or provision partner account from Clerk org session (tenant-safe). */
  async resolveFromClerk(
    clerk: ClerkIdentity,
    partnerType: PartnerType,
  ): Promise<PartnerAuthContext | null> {
    if (!clerk.email) return null
    const orgId =
      clerk.orgId ||
      (typeof clerk.publicMetadata?.clerkOrgId === "string" ? clerk.publicMetadata.clerkOrgId : null)
    if (!orgId) return null

    const dir = await this.directoryByOrg(orgId, partnerType)
    if (!dir) {
      throw new HttpException(
        `No ${partnerType} partner is registered for this Clerk organization. Complete organization setup first.`,
        HttpStatus.FORBIDDEN,
      )
    }
    if (dir.status !== "active") {
      throw new HttpException(
        "Your organization registration is pending approval by Shaniid RX. You will receive portal access once an administrator reviews your application.",
        HttpStatus.FORBIDDEN,
      )
    }

    const metaPartnerType = clerk.publicMetadata?.partnerType
    if (
      metaPartnerType &&
      metaPartnerType !== partnerType &&
      metaPartnerType !== dir.partnerType
    ) {
      throw new HttpException("This Clerk account belongs to a different partner portal", HttpStatus.FORBIDDEN)
    }

    let member = clerk.userId ? await this.memberForUser(orgId, clerk.userId) : null
    const clerkRole = mapClerkOrgRole(clerk.orgRole)
    const memberRole: PartnerMemberRole = (member?.role as PartnerMemberRole) || clerkRole

    if (!member && clerk.userId) {
      const [created] = await db
        .insert(partnerMembers)
        .values({
          id: newId("pmem"),
          partnerId: dir.id,
          partnerType,
          clerkOrgId: orgId,
          clerkUserId: clerk.userId,
          email: clerk.email,
          displayName: clerk.email,
          role: clerkRole,
          status: "active",
          joinedAt: new Date(),
        })
        .returning()
      member = created ?? (await this.memberForUser(orgId, clerk.userId))
    }

    let [acc] = await db
      .select()
      .from(partnerAccounts)
      .where(
        and(eq(partnerAccounts.email, clerk.email), eq(partnerAccounts.partnerType, partnerType)),
      )
      .limit(1)

    if (!acc) {
      ;[acc] = await db
        .insert(partnerAccounts)
        .values({
          id: newId("pacc"),
          email: clerk.email,
          passwordHash: null,
          partnerType,
          partnerId: dir.id,
          displayName: member?.displayName || dir.displayName || clerk.email,
          status: "active",
          metadata: {
            clerkUserId: clerk.userId,
            clerkOrgId: orgId,
            memberId: member?.id,
            memberRole,
          },
        })
        .returning()
    } else if (acc.partnerId !== dir.id) {
      throw new HttpException(
        "This email is linked to a different partner organization",
        HttpStatus.FORBIDDEN,
      )
    } else {
      await db
        .update(partnerAccounts)
        .set({
          metadata: {
            ...(acc.metadata ?? {}),
            clerkUserId: clerk.userId,
            clerkOrgId: orgId,
            memberId: member?.id,
            memberRole,
          },
          updatedAt: new Date(),
        })
        .where(eq(partnerAccounts.id, acc.id))
      ;[acc] = await db
        .select()
        .from(partnerAccounts)
        .where(eq(partnerAccounts.id, acc.id))
        .limit(1)
    }

    if (!acc || acc.status !== "active") return null

    void setClerkUserPartnerMetadata(clerk.userId, {
      partnerType,
      partnerId: dir.id,
      clerkOrgId: orgId,
      memberRole,
    }).catch(() => undefined)

    return { account: acc, member, memberRole }
  }

  /** Self-register a partner company via Clerk Organization (org owner). */
  async registerOrganization(
    clerk: ClerkIdentity,
    partnerType: PartnerType,
    orgName: string,
  ): Promise<{ partnerId: string; clerkOrgId: string }> {
    if (!clerkPartnerOrgEnabled()) {
      throw new HttpException("Clerk organizations are not configured on this server", HttpStatus.SERVICE_UNAVAILABLE)
    }
    if (!clerk.email || !clerk.userId) {
      throw new HttpException("Valid Clerk session required", HttpStatus.UNAUTHORIZED)
    }
    const name = orgName.trim()
    if (!name) {
      throw new HttpException("Organization name is required", HttpStatus.BAD_REQUEST)
    }

    let clerkOrgId = clerk.orgId
    if (!clerkOrgId) {
      const org = await createClerkOrganization(name, clerk.userId)
      clerkOrgId = org.id
    }

    const existing = await this.directoryByOrg(clerkOrgId, partnerType)
    if (existing) {
      throw new HttpException(
        "This Clerk organization is already registered as a partner. Sign in instead.",
        HttpStatus.CONFLICT,
      )
    }

    const partnerId = newId("ptr")
    const payload = { ...defaultPayload(partnerType, name, clerk.email), id: partnerId }
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(partnerDirectory).values({
        id: partnerId,
        partnerType,
        clerkOrgId,
        payload,
        email: clerk.email!,
        displayName: displayNameForType(partnerType, name),
        status: "pending",
        portalCode: "",
        createdAt: now,
        updatedAt: now,
      })

      const memberId = newId("pmem")
      await tx.insert(partnerMembers).values({
        id: memberId,
        partnerId,
        partnerType,
        clerkOrgId,
        clerkUserId: clerk.userId,
        email: clerk.email!,
        displayName: clerk.email!,
        role: "owner",
        status: "active",
        joinedAt: now,
      })

      const existingAcc = await tx
        .select()
        .from(partnerAccounts)
        .where(eq(partnerAccounts.email, clerk.email!))
        .limit(1)
      if (!existingAcc.length) {
        await tx.insert(partnerAccounts).values({
          id: newId("pacc"),
          email: clerk.email!,
          passwordHash: null,
          partnerType,
          partnerId,
          displayName: name,
          status: "pending",
          metadata: { clerkUserId: clerk.userId, clerkOrgId, memberId, memberRole: "owner" },
        })
      } else {
        await tx
          .update(partnerAccounts)
          .set({
            partnerId,
            status: "pending",
            metadata: { clerkUserId: clerk.userId, clerkOrgId, memberId, memberRole: "owner" },
            updatedAt: now,
          })
          .where(eq(partnerAccounts.email, clerk.email!))
      }

      await tx.insert(partnerApplications).values({
        id: newId("papp"),
        partnerType,
        orgName: name,
        contactName: clerk.email!,
        email: clerk.email!,
        message: `Clerk organization self-registration (org: ${clerkOrgId})`,
        status: "pending",
      })
    })

    void setClerkUserPartnerMetadata(clerk.userId, {
      partnerType,
      partnerId,
      clerkOrgId,
      memberRole: "owner",
    }).catch(() => undefined)

    return { partnerId, clerkOrgId }
  }

  async listMembers(partnerId: string) {
    return db
      .select()
      .from(partnerMembers)
      .where(eq(partnerMembers.partnerId, partnerId))
      .orderBy(desc(partnerMembers.createdAt))
  }

  async listCouriers(partnerId: string) {
    const rows = await this.listMembers(partnerId)
    return rows.filter((m) => COURIER_ROLES.includes(m.role as PartnerMemberRole))
  }

  assertCanManageTeam(role: PartnerMemberRole) {
    if (!OWNER_ROLES.includes(role)) {
      throw new HttpException("Only organization owners or admins can manage team members", HttpStatus.FORBIDDEN)
    }
  }

  async inviteMember(
    ctx: PartnerAuthContext,
    body: { email?: string; displayName?: string; role?: string },
  ) {
    this.assertCanManageTeam(ctx.memberRole)
    const email = String(body?.email ?? "").trim().toLowerCase()
    const displayName = String(body?.displayName ?? "").trim() || email
    const role = (String(body?.role ?? "rider").trim() as PartnerMemberRole) || "rider"
    if (!email) throw new HttpException("Employee email is required", HttpStatus.BAD_REQUEST)
    if (!["admin", "member", "rider", "dispatcher"].includes(role)) {
      throw new HttpException("Invalid role. Use admin, member, rider, or dispatcher.", HttpStatus.BAD_REQUEST)
    }

    const dir = await db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.id, ctx.account.partnerId))
      .limit(1)
    const clerkOrgId = dir[0]?.clerkOrgId
    if (!clerkOrgId) {
      throw new HttpException(
        "This partner was not set up with Clerk Organizations. Migrate to org-based auth first.",
        HttpStatus.BAD_REQUEST,
      )
    }

    const dup = await db
      .select()
      .from(partnerMembers)
      .where(and(eq(partnerMembers.clerkOrgId, clerkOrgId), eq(partnerMembers.email, email)))
      .limit(1)
    if (dup.length) {
      throw new HttpException("This email is already on your team", HttpStatus.CONFLICT)
    }

    let inviteId: string | null = null
    try {
      const inv = await createClerkOrgInvitation(clerkOrgId, email, role)
      inviteId = inv.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Clerk invitation failed"
      if (/already.*member/i.test(msg)) {
        throw new HttpException("This person is already a member of your Clerk organization", HttpStatus.CONFLICT)
      }
      if (/pending.*invitation/i.test(msg)) {
        throw new HttpException("A pending invitation already exists for this email", HttpStatus.CONFLICT)
      }
      throw new HttpException(`Could not send invitation: ${msg}`, HttpStatus.BAD_GATEWAY)
    }

    const [row] = await db
      .insert(partnerMembers)
      .values({
        id: newId("pmem"),
        partnerId: ctx.account.partnerId,
        partnerType: ctx.account.partnerType as PartnerType,
        clerkOrgId,
        email,
        displayName,
        role,
        status: "invited",
        clerkInviteId: inviteId,
        invitedAt: new Date(),
      })
      .returning()

    return row
  }

  /** Create partner_directory row when admin approves a self-signup application. */
  async provisionDirectoryFromApplication(app: {
    id: string
    partnerType: string
    orgName: string
    contactName: string
    email: string
    phone: string | null
  }): Promise<string> {
    const partnerType = app.partnerType as PartnerType
    const partnerId = newId("ptr")
    const payload = {
      ...defaultPayload(partnerType, app.orgName, app.email),
      id: partnerId,
      contactName: app.contactName,
      phone: app.phone ?? "",
      fromApplication: app.id,
    }
    const now = new Date()
    await db.insert(partnerDirectory).values({
      id: partnerId,
      partnerType,
      clerkOrgId: null,
      payload,
      email: app.email,
      displayName: app.orgName,
      status: "pending",
      portalCode: "",
      createdAt: now,
      updatedAt: now,
    })
    return partnerId
  }

  memberRoleFromAccount(acc: PartnerAccount): PartnerMemberRole {
    const meta = (acc.metadata ?? {}) as Record<string, unknown>
    const r = String(meta.memberRole ?? "owner")
    if (r === "owner" || r === "admin" || r === "member" || r === "rider" || r === "dispatcher") {
      return r
    }
    return "member"
  }

  isCourierRole(role: PartnerMemberRole) {
    return COURIER_ROLES.includes(role) && !OWNER_ROLES.includes(role)
  }
}

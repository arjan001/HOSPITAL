/**
 * Clerk Organization helpers for B2B partner portals.
 * Requires CLERK_SECRET_KEY.
 */
import { createClerkClient } from "@clerk/backend"

export type PartnerMemberRole = "owner" | "admin" | "member" | "rider" | "dispatcher"

const CLERK_ROLE_FOR: Record<PartnerMemberRole, string> = {
  owner: "org:admin",
  admin: "org:admin",
  member: "org:member",
  rider: "org:member",
  dispatcher: "org:member",
}

function clerk() {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) throw new Error("CLERK_SECRET_KEY is not configured")
  return createClerkClient({ secretKey: secret })
}

export function clerkPartnerOrgEnabled(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim())
}

export async function createClerkOrganization(name: string, createdByUserId: string) {
  const client = clerk()
  return client.organizations.createOrganization({
    name: name.trim(),
    createdBy: createdByUserId,
  })
}

/** Fetch the human-readable organization name from Clerk (used when JWT has org_id but client omits orgName). */
export async function getClerkOrganization(organizationId: string): Promise<{ id: string; name: string } | null> {
  if (!organizationId?.trim() || !clerkPartnerOrgEnabled()) return null
  try {
    const client = clerk()
    const org = await client.organizations.getOrganization({ organizationId })
    const name = org.name?.trim()
    if (!name) return null
    return { id: org.id, name }
  } catch {
    return null
  }
}

export async function createClerkOrgInvitation(
  organizationId: string,
  emailAddress: string,
  role: PartnerMemberRole,
) {
  const client = clerk()
  return client.organizations.createOrganizationInvitation({
    organizationId,
    emailAddress: emailAddress.trim().toLowerCase(),
    role: CLERK_ROLE_FOR[role] ?? "org:member",
  })
}

export async function revokeClerkOrgInvitation(organizationId: string, invitationId: string) {
  const client = clerk()
  return client.organizations.revokeOrganizationInvitation({
    organizationId,
    invitationId,
  })
}

export async function setClerkUserPartnerMetadata(
  userId: string,
  data: { partnerType: string; partnerId: string; clerkOrgId: string; memberRole?: string },
) {
  const client = clerk()
  const user = await client.users.getUser(userId)
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...existing,
      partnerType: data.partnerType,
      partnerId: data.partnerId,
      clerkOrgId: data.clerkOrgId,
      memberRole: data.memberRole ?? existing.memberRole ?? "owner",
    },
  })
}

export async function getClerkOrganizationMembership(organizationId: string, userId: string) {
  const client = clerk()
  try {
    return await client.organizations.getOrganizationMembershipList({
      organizationId,
      userId: [userId],
    })
  } catch {
    return null
  }
}

/** Look up a Clerk user id by primary email (for org creation bootstrap). */
export async function findClerkUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !clerkPartnerOrgEnabled()) return null
  const client = clerk()
  const list = await client.users.getUserList({ emailAddress: [normalized], limit: 1 })
  return list.data[0]?.id ?? null
}

/**
 * Resolve who should be recorded as Clerk org creator when auto-provisioning
 * internal pharmacy organizations.
 */
export async function resolveClerkOrgCreatorUserId(opts: {
  clerkCreatorUserId?: string
  adminUserId?: string
  contactEmail?: string
}): Promise<string | null> {
  const explicit = opts.clerkCreatorUserId?.trim()
  if (explicit) return explicit

  const env = process.env.CLERK_ORG_CREATOR_USER_ID?.trim()
  if (env) return env

  if (opts.adminUserId?.trim()) {
    const { db, adminUsers } = await import("@workspace/db")
    const { eq } = await import("drizzle-orm")
    const [admin] = await db
      .select({ email: adminUsers.email })
      .from(adminUsers)
      .where(eq(adminUsers.id, opts.adminUserId.trim()))
      .limit(1)
    if (admin?.email) {
      const uid = await findClerkUserIdByEmail(admin.email)
      if (uid) return uid
    }
  }

  if (opts.contactEmail?.trim()) {
    return findClerkUserIdByEmail(opts.contactEmail)
  }

  return null
}

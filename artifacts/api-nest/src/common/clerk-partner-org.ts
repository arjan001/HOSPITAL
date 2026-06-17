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

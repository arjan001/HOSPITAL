/**
 * Clerk JWT verification for partner portal bridge.
 * Requires CLERK_SECRET_KEY — must be the secret for the SAME Clerk
 * application as VITE_CLERK_PUBLISHABLE_KEY on the storefront.
 */
import { createClerkClient, verifyToken } from "@clerk/backend"

export type ClerkIdentity = {
  userId: string
  email: string | null
  orgId: string | null
  orgRole: string | null
  orgSlug: string | null
  publicMetadata: Record<string, unknown>
}

function clerkClient() {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) return null
  return createClerkClient({ secretKey: secret })
}

async function emailFromClerkUser(userId: string): Promise<string | null> {
  const client = clerkClient()
  if (!client) return null
  try {
    const user = await client.users.getUser(userId)
    const primary =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
      user.emailAddresses[0]
    return primary?.emailAddress?.trim().toLowerCase() ?? null
  } catch {
    return null
  }
}

export async function verifyClerkBearer(authHeader: string | undefined): Promise<ClerkIdentity | null> {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) return null
  const raw = (authHeader || "").replace(/^Bearer\s+/i, "").trim()
  if (!raw || raw.split(".").length !== 3) return null

  let payload: Awaited<ReturnType<typeof verifyToken>>
  try {
    payload = await verifyToken(raw, { secretKey: secret })
  } catch {
    return null
  }

  const extra = payload as unknown as {
    primary_email_address?: string
    org_id?: string
    org_role?: string
    org_slug?: string
    o?: { id?: string; rol?: string; slg?: string }
  }

  let email: string | null =
    typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : typeof extra.primary_email_address === "string"
        ? extra.primary_email_address.trim().toLowerCase()
        : null

  if (!email && payload.sub) {
    email = await emailFromClerkUser(payload.sub)
  }

  const orgId =
    typeof extra.org_id === "string"
      ? extra.org_id
      : typeof extra.o?.id === "string"
        ? extra.o.id
        : null
  const orgRole =
    typeof extra.org_role === "string"
      ? extra.org_role
      : typeof extra.o?.rol === "string"
        ? extra.o.rol
        : null
  const orgSlug =
    typeof extra.org_slug === "string"
      ? extra.org_slug
      : typeof extra.o?.slg === "string"
        ? extra.o.slg
        : null

  return {
    userId: payload.sub,
    email,
    orgId,
    orgRole,
    orgSlug,
    publicMetadata: (payload.public_metadata as Record<string, unknown>) ?? {},
  }
}

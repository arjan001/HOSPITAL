/**
 * Clerk JWT verification for partner portal bridge.
 * Requires CLERK_SECRET_KEY in the api-nest environment.
 */
import { verifyToken } from "@clerk/backend"

export type ClerkIdentity = {
  userId: string
  email: string | null
  orgId: string | null
  orgRole: string | null
  orgSlug: string | null
  publicMetadata: Record<string, unknown>
}

export async function verifyClerkBearer(authHeader: string | undefined): Promise<ClerkIdentity | null> {
  const secret = process.env.CLERK_SECRET_KEY?.trim()
  if (!secret) return null
  const raw = (authHeader || "").replace(/^Bearer\s+/i, "").trim()
  if (!raw || raw.split(".").length !== 3) return null
  try {
    const payload = await verifyToken(raw, { secretKey: secret })
    const extra = payload as unknown as {
      primary_email_address?: string
      org_id?: string
      org_role?: string
      org_slug?: string
    }
    const email =
      typeof payload.email === "string"
        ? payload.email
        : typeof extra.primary_email_address === "string"
          ? extra.primary_email_address
          : null
    return {
      userId: payload.sub,
      email: email?.trim().toLowerCase() ?? null,
      orgId: typeof extra.org_id === "string" ? extra.org_id : null,
      orgRole: typeof extra.org_role === "string" ? extra.org_role : null,
      orgSlug: typeof extra.org_slug === "string" ? extra.org_slug : null,
      publicMetadata: (payload.public_metadata as Record<string, unknown>) ?? {},
    }
  } catch {
    return null
  }
}

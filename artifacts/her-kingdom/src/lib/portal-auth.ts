/**
 * portal-auth.ts — Partner portal session management.
 *
 * Partners (suppliers, clinics, logistics companies) authenticate with a
 * portal code that the admin assigns when onboarding them.
 *
 * Session lifecycle:
 *   1. Admin creates partner record in cmsStore → assigns portal code.
 *   2. Partner navigates to /portal/<type> and enters their code + email.
 *   3. UI calls `loginPartner()` which POSTs to NestJS
 *      `/api/v2/partners/:type/auth`. The server matches the partner
 *      against the admin-managed cmsStore records and stamps the
 *      `shaniidrx_sid` cookie with a partner identity it controls.
 *   4. On success we also cache a thin session blob in localStorage so the
 *      UI can render the dashboard immediately without waiting for the
 *      cookie round-trip on every request. The server cookie is the
 *      authority — the localStorage entry is purely a UX cache.
 *   5. `signOutPartner()` clears both client cache and server stamp.
 *
 * Phase 2 migration:
 *   Replace the in-memory stamp on the server with a Clerk JWT that
 *   carries a `partnerType` custom claim — the UI calls (loginPartner,
 *   submitPartnerOrder, etc.) do not need to change.
 */

export type PortalType = "supplier" | "clinic" | "logistics"

export interface PortalSession {
  portalType: PortalType
  partnerId: string
  partnerName: string
  portalCode: string
  email: string
  loginAt: string
}

const SESSION_KEY = "shaniidrx.portal.session"
const API_BASE = "/api/v2/partners"

export function getPortalSession(): PortalSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PortalSession
  } catch {
    return null
  }
}

export function getPortalSessionForType(type: PortalType): PortalSession | null {
  const session = getPortalSession()
  if (!session || session.portalType !== type) return null
  return session
}

/** Cache a session locally. Server-side authority remains the cookie stamp. */
export function setPortalSession(session: PortalSession): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

/**
 * Verify the email + portal-code combination against the NestJS Partners
 * module. On success, both the server (via `shaniidrx_sid` cookie) and
 * the local cache are updated.
 */
export async function loginPartner(
  type: PortalType,
  email: string,
  portalCode: string,
): Promise<PortalSession> {
  const cleanedEmail = email.trim().toLowerCase()
  const cleanedCode = portalCode.trim().toUpperCase()

  const res = await fetch(`${API_BASE}/${encodeURIComponent(type)}/auth`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanedEmail, portalCode: cleanedCode }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    let message = "Invalid email or portal code"
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string }
      message = parsed.message || parsed.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  const body = (await res.json()) as { ok: boolean; partner: { id: string; name: string } }
  const session: PortalSession = {
    portalType: type,
    partnerId: body.partner.id,
    partnerName: body.partner.name,
    portalCode: cleanedCode,
    email: cleanedEmail,
    loginAt: new Date().toISOString(),
  }
  setPortalSession(session)
  return session
}

export async function signOutPartner(type: PortalType): Promise<void> {
  clearPortalSession()
  await fetch(`${API_BASE}/${encodeURIComponent(type)}/signout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined)
}

export type PartnerSubmissionKind =
  | "order"
  | "kyc"
  | "product"
  | "delivery-confirmation"
  | "message"

export interface PartnerSubmissionRecord {
  id: string
  partnerType: PortalType
  partnerId: string
  kind: PartnerSubmissionKind
  payload: unknown
  status: "submitted" | "received" | "processed"
  createdAt: string
}

/** Submit an order / KYC / product listing / message to the admin queue. */
export async function submitPartnerOrder(
  type: PortalType,
  kind: PartnerSubmissionKind,
  payload: unknown,
): Promise<PartnerSubmissionRecord> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(type)}/orders`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payload }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Submission failed (${res.status})`)
  }
  return (await res.json()) as PartnerSubmissionRecord
}

export async function listPartnerSubmissions(type: PortalType): Promise<PartnerSubmissionRecord[]> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(type)}/orders`, {
    credentials: "include",
  })
  if (!res.ok) return []
  return (await res.json()) as PartnerSubmissionRecord[]
}

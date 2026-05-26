/**
 * portal-auth.ts — Lightweight partner portal session management.
 *
 * Partners (suppliers, clinics, logistics companies) authenticate with a
 * portal code that the admin assigns when onboarding them.
 *
 * Session lifecycle:
 *   1. Admin creates partner record in cmsStore → assigns portal code.
 *   2. Partner navigates to /portal/<type> and enters their code + email.
 *   3. We look up the matching record in cmsStore.
 *   4. On match, write a session to localStorage and redirect to dashboard.
 *   5. clearPortalSession() logs them out.
 *
 * Phase 2 migration:
 *   Replace the localStorage check with a Clerk JWT that carries a
 *   `partnerType` custom claim — no UI changes needed, just swap
 *   getPortalSession() / setPortalSession() with Clerk's getAuth().
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

export function setPortalSession(session: PortalSession): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

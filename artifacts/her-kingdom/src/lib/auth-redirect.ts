/**
 * Safe post-auth redirect helper.
 *
 * Gated pages (e.g. /upload-prescription) bounce signed-out visitors to the
 * login/register pages with a `?redirect=<path>` query param. After a
 * successful sign-in or sign-up we forward the user back to that path.
 *
 * Partner portals also stash their path in sessionStorage so OAuth round-trips
 * (which may drop query params on the callback) still land on /portal/*.
 *
 * To avoid an open-redirect vulnerability, only same-origin relative paths are
 * accepted: the value must start with a single "/" and must not be a
 * protocol-relative ("//host") or scheme ("/\\", "/javascript:") URL.
 */

const PARTNER_AUTH_REDIRECT_KEY = "shaniidrx_partner_auth_redirect"

export function isPartnerPortalPath(path: string): boolean {
  return /^\/portal\/(supplier|clinic|logistics)(\/|$)/.test(path)
}

export function rememberPartnerPortalRedirect(path: string): void {
  if (!isPartnerPortalPath(path)) return
  try {
    sessionStorage.setItem(PARTNER_AUTH_REDIRECT_KEY, path)
  } catch {
    /* private browsing / quota */
  }
}

export function peekPartnerPortalRedirect(): string | null {
  try {
    const value = sessionStorage.getItem(PARTNER_AUTH_REDIRECT_KEY)
    return value && isPartnerPortalPath(value) ? value : null
  } catch {
    return null
  }
}

export function clearPartnerPortalRedirect(): void {
  try {
    sessionStorage.removeItem(PARTNER_AUTH_REDIRECT_KEY)
  } catch {
    /* ignore */
  }
}

export function getSafeRedirect(search: string): string | null {
  let raw: string | null = null
  try {
    raw = new URLSearchParams(search).get("redirect")
  } catch {
    return null
  }
  if (!raw) return null
  const value = raw.trim()
  if (value.length === 0 || value.length > 512) return null
  // Must be a root-relative path …
  if (!value.startsWith("/")) return null
  // … but not protocol-relative ("//evil.com") or a backslash trick.
  if (value.startsWith("//") || value.startsWith("/\\")) return null
  // Reject anything that smuggles a scheme.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return null
  return value
}

/** Query param first, then partner portal sessionStorage (survives OAuth). */
export function resolvePostAuthRedirect(search: string): string | null {
  return getSafeRedirect(search) ?? peekPartnerPortalRedirect()
}

/**
 * Build the `?redirect=…` suffix to append to an auth link so the destination
 * survives a hop between the login and register pages.
 */
export function buildRedirectQuery(redirect: string | null): string {
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""
}

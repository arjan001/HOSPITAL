/**
 * Lightweight wrapper around `fetch` for admin/protected endpoints.
 *
 * The previous Supabase-backed admin auth has been removed. The backend's
 * `requireAdmin` middleware is currently a pass-through (Clerk will own
 * customer auth later), so we just forward the call and surface non-2xx
 * responses as thrown errors for SWR.
 */

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  return fetch(input, init)
}

/**
 * Headers for calling token-gated `/api/v2/admin/*` endpoints. Forwards the
 * admin token issued at login (stored under `shaniidrx.admin.token`) as
 * `x-admin-token`, which `AdminGuard` checks when `ADMIN_API_TOKEN` is set in
 * production. In dev (no token configured) the guard is permissive, so an empty
 * object is fine.
 */
export function adminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem("shaniidrx.admin.token")
  return token ? { "x-admin-token": token } : {}
}

export const authedFetcher = async (url: string) => {
  const res = await apiFetch(url, { headers: adminAuthHeaders() })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Request failed (${res.status})`) as Error & { status?: number; body?: string }
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

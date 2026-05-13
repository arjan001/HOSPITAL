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

export const authedFetcher = async (url: string) => {
  const res = await apiFetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    const err = new Error(`Request failed (${res.status})`) as Error & { status?: number; body?: string }
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

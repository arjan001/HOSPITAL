import { createClient } from "./supabase/client"

/**
 * Resolve the current Supabase access token, if a session exists. Returns
 * null when Supabase env vars are missing or no user is signed in.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

/**
 * `fetch` wrapper that automatically attaches `Authorization: Bearer <token>`
 * from the current Supabase session. Use for any call to a protected
 * `/api/admin/*` or `/api/upload` endpoint.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers || {})
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  return fetch(input, { ...init, headers })
}

/**
 * SWR fetcher that uses the authenticated client. Drop-in replacement for
 * the per-file `const fetcher = (url) => fetch(url).then(r => r.json())`
 * pattern in admin pages.
 */
export const authedFetcher = async (url: string) => {
  const res = await apiFetch(url)
  if (!res.ok) {
    // Mimic SWR's error contract so consumers can render fallback states.
    const body = await res.text().catch(() => "")
    const err = new Error(`Request failed (${res.status})`) as Error & { status?: number; body?: string }
    err.status = res.status
    err.body = body
    throw err
  }
  return res.json()
}

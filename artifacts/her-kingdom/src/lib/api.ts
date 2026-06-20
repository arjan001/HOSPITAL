/**
 * api.ts — Typed HTTP client for the legacy Express API (`/api/*`).
 *
 * Companion to `api-nest.ts` (which targets `/api/v2/*`). Use this file
 * for every storefront call to the Express server so we have a single
 * place to manage:
 *   - the base path
 *   - `credentials: "include"` (so the `shaniidrx_sid` cookie and Clerk
 *     cookies are forwarded)
 *   - error normalisation (throws on non-2xx so SWR can treat it as a
 *     failure)
 *   - shared admin-token header (when running against a token-gated
 *     deployment, set `localStorage["shaniidrx.admin-token"]`).
 *
 * History:
 *   The README has long referenced this file but it was never present —
 *   every component opened ad-hoc `fetch("/api/…")` calls instead. This
 *   module re-centralises that surface so future Drizzle / cookie / CORS
 *   work happens in one place.
 */

const BASE = "/api"
const ADMIN_TOKEN_STORAGE_KEY = "shaniidrx.admin-token"

function adminHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const token = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    return token ? { "x-admin-token": token } : {}
  } catch {
    return {}
  }
}

export type ApiInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>
  /** Override the JSON content-type detection for FormData uploads. */
  json?: unknown
  /** Forward the admin token if present in localStorage. */
  asAdmin?: boolean
}

export class ApiError extends Error {
  status: number
  body: string
  constructor(status: number, body: string, message?: string) {
    super(message || `api ${status}`)
    this.status = status
    this.body = body
  }
}

function buildHeaders(init: ApiInit | undefined): Record<string, string> {
  const headers: Record<string, string> = { ...(init?.headers ?? {}) }
  if (init?.json !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  if (init?.asAdmin) Object.assign(headers, adminHeaders())
  return headers
}

/** Raw fetch wrapper. Returns the Response — caller decides whether to parse. */
export async function apiFetch(path: string, init?: ApiInit): Promise<Response> {
  const url = path.startsWith("/api") || path.startsWith("http") ? path : `${BASE}${path}`
  const body =
    init?.json !== undefined
      ? typeof init.json === "string"
        ? init.json
        : JSON.stringify(init.json)
      : init?.body
  return fetch(url, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
    body,
  })
}

/** Typed JSON fetch. Throws ApiError on non-2xx. */
export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  const res = await apiFetch(path, init)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new ApiError(res.status, text)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** SWR-compatible fetcher (no body, no admin token). */
export const fetcher = <T = unknown>(path: string): Promise<T> => api<T>(path)

/** SWR-compatible admin fetcher (sends the admin token if available). */
export const adminFetcher = <T = unknown>(path: string): Promise<T> =>
  api<T>(path, { asAdmin: true })

/* ─────────────────── Typed helper methods ─────────────────── */

import type {
  Product,
  Category,
  HeroBanner,
  DeliveryLocation,
  GiftItem,
} from "./types"

export type SiteData = {
  siteName?: string
  contact?: { email?: string; phone?: string; address?: string }
  social?: Record<string, string>
  [key: string]: unknown
}

export const apiExpress = {
  /* Catalog — api-nest v2 (not legacy api-server /api/products) */
  products: () => api<Product[]>("/api/v2/products"),
  product: (slug: string) => api<Product>(`/api/v2/products/${encodeURIComponent(slug)}`),
  categories: () => api<Category[]>("/api/v2/categories"),
  heroBanners: () => api<HeroBanner[]>("/hero-banners"),
  siteData: () => api<SiteData>("/site-data"),
  deliveryLocations: () => api<DeliveryLocation[]>("/delivery-locations"),
  giftItems: () => api<GiftItem[]>("/gift-items"),

  /* Orders & tracking */
  placeOrder: (input: Record<string, unknown>) =>
    api<{ orderNumber: string }>("/orders", { method: "POST", json: input }),
  trackOrder: (orderNumber: string) =>
    api<{ status: string; order?: Record<string, unknown> }>(
      `/track-order?orderNumber=${encodeURIComponent(orderNumber)}`,
    ),

  /* Newsletter */
  subscribeNewsletter: (email: string) =>
    api<{ success: boolean }>("/newsletter", { method: "POST", json: { email } }),

  /* Blog & content */
  blogs: () => api<{ posts: Array<{ slug: string; title: string; excerpt: string }> }>("/blogs"),
  policy: (slug: string) =>
    api<{ slug: string; title: string; body: string }>(`/policies/${encodeURIComponent(slug)}`),

  /* Telemetry */
  trackView: (payload: Record<string, unknown>) =>
    apiFetch("/track-view", { method: "POST", json: payload }).then(() => undefined),
  trackEvent: (payload: Record<string, unknown>) =>
    apiFetch("/track-event", { method: "POST", json: payload }).then(() => undefined),
  trackAbandoned: (payload: Record<string, unknown>) =>
    apiFetch("/track-abandoned", { method: "POST", json: payload }).then(() => undefined),

  /* Video / telemedicine */
  createVideoRoom: (input: Record<string, unknown>) =>
    api<{ name: string; url: string }>("/video/room", { method: "POST", json: input }),
  createVideoToken: (input: { room: string; userName: string; isOwner?: boolean }) =>
    api<{ token: string }>("/video/token", { method: "POST", json: input }),
  videoStatus: () => api<{ configured: boolean }>("/video/status"),
}

/* ─────────────────── Health probe ─────────────────── */

/** GET /api/healthz — confirms the Express service is up. */
export const apiHealth = () => api<{ ok: boolean }>("/healthz")

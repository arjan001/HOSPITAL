// Thin client + SWR hooks for the NestJS user backend (api-nest).
// Routes live behind /api/v2 and use a cookie-based guest session today.
// When Clerk lands, the cookie is replaced by a Bearer token but this client
// stays the same — only the auth header changes.

import useSWR, { mutate as globalMutate } from "swr"

const BASE = "/api/v2"

async function nestFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`api-nest ${res.status} ${path}: ${text || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export type MeProfile = {
  id: string
  sessionId: string
  fullName: string
  email: string
  phone: string
  preferences: { marketingEmails: boolean; smsAlerts: boolean }
  createdAt: string
  updatedAt: string
}

export type AccountAddress = {
  id: string
  label: string
  fullName: string
  phone: string
  line1: string
  line2: string
  city: string
  region: string
  isDefault: boolean
  createdAt: string
}

export type AccountWishlistItem = {
  id: string
  productSlug: string
  addedAt: string
}

export type AccountOrderLine = {
  productSlug: string
  name: string
  unitPrice: number
  quantity: number
}

export type AccountOrder = {
  id: string
  number: string
  items: AccountOrderLine[]
  subtotal: number
  deliveryFee: number
  total: number
  currency: "KSH"
  status: "pending" | "paid" | "fulfilled" | "cancelled"
  paymentMethod: "mpesa" | "card" | "cod" | "unknown"
  customer: { fullName: string; phone: string; email: string }
  shippingAddress: { line1: string; line2?: string; city: string; region: string }
  createdAt: string
}

export const apiNest = {
  health: () => nestFetch<{ ok: boolean }>("/healthz"),

  me: () => nestFetch<MeProfile>("/me"),
  updateMe: (patch: Partial<Pick<MeProfile, "fullName" | "email" | "phone" | "preferences">>) =>
    nestFetch<MeProfile>("/me", { method: "PUT", body: JSON.stringify(patch) }),

  addresses: () => nestFetch<AccountAddress[]>("/me/addresses"),
  addAddress: (data: Partial<AccountAddress>) =>
    nestFetch<AccountAddress>("/me/addresses", { method: "POST", body: JSON.stringify(data) }),
  updateAddress: (id: string, patch: Partial<AccountAddress>) =>
    nestFetch<AccountAddress>(`/me/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  removeAddress: (id: string) =>
    nestFetch<{ ok: boolean }>(`/me/addresses/${id}`, { method: "DELETE" }),

  wishlist: () => nestFetch<AccountWishlistItem[]>("/me/wishlist"),
  addWishlist: (productSlug: string) =>
    nestFetch<AccountWishlistItem>("/me/wishlist", {
      method: "POST",
      body: JSON.stringify({ productSlug }),
    }),
  removeWishlist: (slug: string) =>
    nestFetch<{ ok: boolean }>(`/me/wishlist/${encodeURIComponent(slug)}`, { method: "DELETE" }),

  orders: () => nestFetch<AccountOrder[]>("/me/orders"),
  order: (id: string) => nestFetch<AccountOrder>(`/me/orders/${id}`),
  createOrder: (input: {
    items: AccountOrderLine[]
    deliveryFee?: number
    paymentMethod?: AccountOrder["paymentMethod"]
    customer: AccountOrder["customer"]
    shippingAddress: AccountOrder["shippingAddress"]
  }) =>
    nestFetch<AccountOrder>("/me/orders", { method: "POST", body: JSON.stringify(input) }),
}

const swrFetcher = <T,>(path: string) => nestFetch<T>(path)

export function useMe() {
  return useSWR<MeProfile>("/me", swrFetcher)
}
export function useAddresses() {
  return useSWR<AccountAddress[]>("/me/addresses", swrFetcher)
}
export function useWishlistRemote() {
  return useSWR<AccountWishlistItem[]>("/me/wishlist", swrFetcher)
}
export function useOrders() {
  return useSWR<AccountOrder[]>("/me/orders", swrFetcher)
}

export function refreshAccount() {
  return Promise.all([
    globalMutate("/me"),
    globalMutate("/me/addresses"),
    globalMutate("/me/wishlist"),
    globalMutate("/me/orders"),
  ])
}

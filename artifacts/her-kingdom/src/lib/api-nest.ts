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

/* ────────────────────────────────────────────────────────────
   Chat — patient ↔ pharmacist conversations (WhatsApp-style)
   Backend: NestJS api-nest with Server-Sent Events for true push.
─────────────────────────────────────────────────────────────*/

export type ChatSender = "patient" | "staff"
export type ChatStatus = "sent" | "delivered" | "read"

export type ChatMessage = {
  id: string
  threadId: string
  sender: ChatSender
  text: string
  createdAt: string
  status: ChatStatus
  authorName?: string
}

export type ChatThread = {
  id: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastSender: ChatSender | null
  updatedAt: string
  createdAt: string
  unreadByStaff: number
  unreadByPatient: number
}

export const apiChat = {
  // Patient
  myThread: (profile?: { name?: string; phone?: string }) =>
    profile
      ? nestFetch<ChatMessage>("/chat/me/messages", {
          // best-effort name update via a no-op send is awkward; just call myThread GET
          method: "GET",
        }).then(() => nestFetch<ChatThread>("/chat/me"))
      : nestFetch<ChatThread>("/chat/me"),
  myMessages: () => nestFetch<ChatMessage[]>("/chat/me/messages"),
  sendAsPatient: (text: string, profile?: { name?: string; phone?: string }) =>
    nestFetch<ChatMessage>("/chat/me/messages", {
      method: "POST",
      body: JSON.stringify({ text, ...(profile || {}) }),
    }),
  markPatientRead: () =>
    nestFetch<ChatThread>("/chat/me/read", { method: "POST" }),

  // Admin
  adminThreads: () => nestFetch<ChatThread[]>("/chat/admin/threads"),
  adminMessages: (threadId: string) =>
    nestFetch<ChatMessage[]>(`/chat/admin/threads/${threadId}/messages`),
  sendAsStaff: (threadId: string, text: string, name = "Pharmacist") =>
    nestFetch<ChatMessage>(`/chat/admin/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, name }),
    }),
  markStaffRead: (threadId: string) =>
    nestFetch<ChatThread>(`/chat/admin/threads/${threadId}/read`, { method: "POST" }),
  deleteThread: (threadId: string) =>
    nestFetch<{ ok: boolean }>(`/chat/admin/threads/${threadId}`, { method: "DELETE" }),
}

export function chatStreamUrl(scope: "me" | "admin"): string {
  return `${BASE}/chat/${scope}/stream`
}

export function useMyThread() {
  return useSWR<ChatThread>("/chat/me", swrFetcher)
}
export function useMyMessages() {
  return useSWR<ChatMessage[]>("/chat/me/messages", swrFetcher, {
    refreshInterval: 30_000, // SSE handles realtime; this is a safety net
  })
}
export function useAdminThreads() {
  return useSWR<ChatThread[]>("/chat/admin/threads", swrFetcher)
}
export function useAdminMessages(threadId: string | null) {
  return useSWR<ChatMessage[]>(
    threadId ? `/chat/admin/threads/${threadId}/messages` : null,
    swrFetcher,
    { refreshInterval: 30_000 },
  )
}

export function refreshChatPatient() {
  return Promise.all([
    globalMutate("/chat/me"),
    globalMutate("/chat/me/messages"),
  ])
}
export function refreshChatAdmin(threadId?: string) {
  return Promise.all([
    globalMutate("/chat/admin/threads"),
    threadId ? globalMutate(`/chat/admin/threads/${threadId}/messages`) : Promise.resolve(),
  ])
}

export function refreshAccount() {
  return Promise.all([
    globalMutate("/me"),
    globalMutate("/me/addresses"),
    globalMutate("/me/wishlist"),
    globalMutate("/me/orders"),
  ])
}

import useSWR, { mutate as globalMutate } from "swr"
import { adminAuthHeaders } from "./api-client"

/**
 * Admin Sales & Orders client.
 *
 * Backed by the NestJS api-nest module at /api/v2/admin/orders. The legacy
 * cmsStore "admin-orders" key is no longer used — this is the single source
 * of truth for every order placed on the storefront.
 *
 * Status semantics:
 *   pending     → placed but payment NOT confirmed (COD, M-Pesa awaiting receipt)
 *   confirmed   → payment captured / cash received → counts as a SALE
 *   dispatched  → fulfilment in motion (also a SALE)
 *   delivered   → completed (also a SALE)
 *   cancelled   → failed / declined / abandoned
 */

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled"

export interface AdminOrderItem {
  name: string
  qty: number
  price: number
  variation?: string
}

export interface AdminOrderRecord {
  id: string
  orderNo: string
  customer: string
  phone: string
  email: string
  items: AdminOrderItem[]
  subtotal: number
  delivery: number
  total: number
  location: string
  address: string
  notes: string
  specialInstructions: string
  status: AdminOrderStatus
  orderedVia: string
  paymentMethod: string
  mpesaCode: string
  mpesaPhone: string
  mpesaMessage: string
  paymentRef: string
  date: string
  createdAt: string
  updatedAt?: string
}

/** Sales = orders whose payment has been confirmed (and onward in fulfilment). */
export const SALE_STATUSES: AdminOrderStatus[] = [
  "confirmed",
  "dispatched",
  "delivered",
]
export const isSale = (s: AdminOrderStatus) => SALE_STATUSES.includes(s)

const BASE = "/api/v2"
const LIST_KEY = "/admin/orders"

async function nestFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...adminAuthHeaders(),
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`admin-orders ${res.status} ${path}: ${text || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export interface UpsertOrderInput {
  orderNo: string
  customer: string
  phone: string
  email?: string
  items: AdminOrderItem[]
  subtotal: number
  delivery: number
  total: number
  location?: string
  address?: string
  notes?: string
  specialInstructions?: string
  status: AdminOrderStatus
  orderedVia?: string
  paymentMethod: string
  mpesaCode?: string
  mpesaPhone?: string
  mpesaMessage?: string
  paymentRef?: string
}

/** Create or update by orderNo. Fire-and-forget safe — see usage in checkout. */
export async function upsertAdminOrder(
  input: UpsertOrderInput,
): Promise<AdminOrderRecord> {
  const out = await nestFetch<AdminOrderRecord>(LIST_KEY, {
    method: "POST",
    body: JSON.stringify(input),
  })
  void globalMutate(LIST_KEY)
  return out
}

export async function setOrderStatus(
  id: string,
  status: AdminOrderStatus,
): Promise<AdminOrderRecord> {
  const out = await nestFetch<AdminOrderRecord>(`${LIST_KEY}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  void globalMutate(LIST_KEY)
  return out
}

export async function deleteOrdersByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const out = await nestFetch<{ deleted: number }>(
    `${LIST_KEY}?ids=${ids.map(encodeURIComponent).join(",")}`,
    { method: "DELETE" },
  )
  void globalMutate(LIST_KEY)
  return out.deleted
}

const swrFetcher = (path: string) => nestFetch<AdminOrderRecord[]>(path)

export function useAdminOrders() {
  const { data, mutate, isLoading } = useSWR<AdminOrderRecord[]>(LIST_KEY, swrFetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  })
  return { items: data ?? [], mutate, isLoading }
}

export function refreshAdminOrders() {
  return globalMutate(LIST_KEY)
}

/**
 * partners-client.ts — HTTP client + SWR hooks for the partner portals
 * (supplier / clinic / logistics), backed by the NestJS /api/v2/partners/* API.
 *
 * Auth model: server-side signed partner token in an HttpOnly cookie
 * (`shaniidrx_partner_token`), set on login/accept. All requests use
 * `credentials: "include"` so the cookie is forwarded automatically — there is
 * no client-held token. Entity-scoping is enforced server-side from the token.
 */
import useSWR, { mutate as globalMutate } from "swr"
import { adminAuthHeaders } from "./api-client"

const BASE = "/api/v2/partners"

export type PartnerType = "supplier" | "clinic" | "logistics"

async function pFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.detail || body?.message || body?.error || message
      if (Array.isArray(message)) message = message.join(", ")
    } catch {
      /* non-JSON error */
    }
    throw new Error(typeof message === "string" ? message : `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ───────────────────────────── types ─────────────────────────────
export type PartnerAccount = {
  id: string
  email: string
  partnerType: PartnerType
  partnerId: string
  displayName: string
  status: "invited" | "active" | "suspended"
  lastLoginAt: string | null
  metadata: Record<string, unknown> | null
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

export type PartnerMe = { ok: true; partner: PartnerAccount; profile: Record<string, unknown> | null }

export type SupplierProduct = {
  id: string
  partnerId: string
  productName: string
  sku: string | null
  category: string | null
  unitPrice: number
  currency: string
  moq: number
  leadTimeDays: number
  stockQty: number
  status: "active" | "inactive"
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type SourcingOpportunity = {
  id: string
  sku: string
  productName: string
  currentStock: number
  reorderPoint: number
  quantityNeeded: number
  urgency: string
  status: string
  notes: string | null
  createdAt: string
}

export type PartnerQuote = {
  id: string
  sourcingRequestId: string | null
  supplierId: string
  supplierName: string
  unitPrice: number
  quantity: number
  leadTimeDays: number
  notes: string | null
  status: string
  submittedAt: string
}

export type ClinicProduct = {
  id: string
  name: string
  price: number
  stock: number
  requiresPrescription: boolean
}

export type ClinicOrderLine = { name: string; qty: number; unitPrice: number; patient?: string }

export type ClinicOrder = {
  id: string
  orderRef: string
  clinicId: string
  clinicName: string
  items: ClinicOrderLine[]
  subtotal: number
  deliveryFee: number
  total: number
  status: string
  creditLine: boolean
  deliveryAddress: string | null
  notes: string | null
  placedAt: string
}

export type ClinicTransaction = {
  id: string
  clinicPartnerId: string
  orderRef: string | null
  type: "charge" | "payment" | "adjustment"
  amount: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

export type ClinicLedger = {
  creditLimit: number
  outstanding: number
  available: number
  transactions: ClinicTransaction[]
}

export type DeliveryJob = {
  id: string
  jobRef: string
  orderId: string | null
  orderType: string
  status: string
  pickupAddress: string
  deliveryAddress: string
  recipientName: string | null
  recipientPhone: string | null
  coldChain: boolean
  estimatedMinutes: number | null
  proofOfDeliveryUrl: string | null
  notes: string | null
  assignedAt: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  createdAt: string
}

export type LogisticsEarnings = {
  ratePerDelivery: number
  totals: {
    deliveredCount: number
    inProgressCount: number
    totalEarned: number
    projected: number
  }
  recent: { jobRef: string; deliveredAt: string | null; amount: number; deliveryAddress: string }[]
}

// ───────────────────────────── auth ─────────────────────────────
export function partnerLogin(type: PartnerType, email: string, password: string) {
  return pFetch<{ ok: true; partner: PartnerAccount }>(`/${type}/auth`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function partnerSignout(type: PartnerType) {
  return pFetch<{ ok: true }>(`/${type}/signout`, { method: "POST" })
}

export function partnerApply(input: {
  partnerType: PartnerType
  orgName: string
  contactName: string
  email: string
  phone?: string
  message?: string
}) {
  return pFetch<{ ok: true; id: string }>(`/apply`, { method: "POST", body: JSON.stringify(input) })
}

export function partnerAcceptInvite(token: string, password: string) {
  return pFetch<{ ok: true; partner: PartnerAccount }>(`/accept`, {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}

export function usePartnerMe(enabled = true) {
  return useSWR<PartnerMe>(enabled ? "partner:me" : null, () => pFetch<PartnerMe>("/me"), {
    shouldRetryOnError: false,
  })
}
export const refreshPartnerMe = () => globalMutate("partner:me")

// ─────────────────────────── supplier ───────────────────────────
export function useSupplierCatalog(enabled = true) {
  return useSWR<SupplierProduct[]>(
    enabled ? "partner:supplier:catalog" : null,
    () => pFetch<SupplierProduct[]>("/supplier/catalog"),
  )
}
export async function addSupplierProduct(input: Partial<SupplierProduct>) {
  const r = await pFetch<SupplierProduct>("/supplier/catalog", {
    method: "POST",
    body: JSON.stringify(input),
  })
  await globalMutate("partner:supplier:catalog")
  return r
}
export async function updateSupplierProduct(id: string, input: Partial<SupplierProduct>) {
  const r = await pFetch<SupplierProduct>(`/supplier/catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  await globalMutate("partner:supplier:catalog")
  return r
}
export async function deleteSupplierProduct(id: string) {
  const r = await pFetch<{ ok: true }>(`/supplier/catalog/${id}`, { method: "DELETE" })
  await globalMutate("partner:supplier:catalog")
  return r
}
export function useSupplierOpportunities(enabled = true) {
  return useSWR<SourcingOpportunity[]>(
    enabled ? "partner:supplier:opportunities" : null,
    () => pFetch<SourcingOpportunity[]>("/supplier/opportunities"),
  )
}
export function useSupplierQuotes(enabled = true) {
  return useSWR<PartnerQuote[]>(
    enabled ? "partner:supplier:quotes" : null,
    () => pFetch<PartnerQuote[]>("/supplier/quotes"),
  )
}
export async function submitSupplierQuote(input: {
  sourcingRequestId?: string | null
  unitPrice: number
  quantity: number
  leadTimeDays: number
  notes?: string
}) {
  const r = await pFetch<PartnerQuote>("/supplier/quotes", {
    method: "POST",
    body: JSON.stringify(input),
  })
  await Promise.all([
    globalMutate("partner:supplier:quotes"),
    globalMutate("partner:supplier:opportunities"),
  ])
  return r
}

// ──────────────────────────── clinic ────────────────────────────
export function useClinicProductLookup(q: string, enabled = true) {
  return useSWR<ClinicProduct[]>(
    enabled ? ["partner:clinic:catalog", q] : null,
    () => pFetch<ClinicProduct[]>(`/clinic/catalog?q=${encodeURIComponent(q)}`),
  )
}
export function useClinicOrders(enabled = true) {
  return useSWR<ClinicOrder[]>(
    enabled ? "partner:clinic:orders" : null,
    () => pFetch<ClinicOrder[]>("/clinic/orders"),
  )
}
export function useClinicLedger(enabled = true) {
  return useSWR<ClinicLedger>(
    enabled ? "partner:clinic:ledger" : null,
    () => pFetch<ClinicLedger>("/clinic/ledger"),
  )
}
export async function placeClinicOrder(input: {
  items: ClinicOrderLine[]
  deliveryAddress?: string
  deliveryFee?: number
  creditLine?: boolean
  notes?: string
}) {
  const r = await pFetch<ClinicOrder>("/clinic/orders", {
    method: "POST",
    body: JSON.stringify(input),
  })
  await Promise.all([
    globalMutate("partner:clinic:orders"),
    globalMutate("partner:clinic:ledger"),
  ])
  return r
}

// ────────────────────────── logistics ───────────────────────────
export function useLogisticsJobs(enabled = true) {
  return useSWR<DeliveryJob[]>(
    enabled ? "partner:logistics:jobs" : null,
    () => pFetch<DeliveryJob[]>("/logistics/jobs"),
  )
}
export function useLogisticsEarnings(enabled = true) {
  return useSWR<LogisticsEarnings>(
    enabled ? "partner:logistics:earnings" : null,
    () => pFetch<LogisticsEarnings>("/logistics/earnings"),
  )
}
export async function updateDeliveryStatus(id: string, status: string) {
  const r = await pFetch<DeliveryJob>(`/logistics/jobs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  await Promise.all([
    globalMutate("partner:logistics:jobs"),
    globalMutate("partner:logistics:earnings"),
  ])
  return r
}
export async function submitDeliveryPod(id: string, proofOfDeliveryUrl: string, notes?: string) {
  const r = await pFetch<DeliveryJob>(`/logistics/jobs/${id}/pod`, {
    method: "POST",
    body: JSON.stringify({ proofOfDeliveryUrl, notes }),
  })
  await Promise.all([
    globalMutate("partner:logistics:jobs"),
    globalMutate("partner:logistics:earnings"),
  ])
  return r
}

// ─────────────────────── admin (AdminGuard) ───────────────────────
async function adminPFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...adminAuthHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.detail || body?.message || body?.error || message
      if (Array.isArray(message)) message = message.join(", ")
    } catch {
      /* non-JSON */
    }
    throw new Error(typeof message === "string" ? message : `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export type PartnerApplication = {
  id: string
  partnerType: PartnerType
  orgName: string
  contactName: string
  email: string
  phone: string | null
  message: string | null
  status: "pending" | "approved" | "rejected"
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
}

export function useAdminPartnerApplications(type: PartnerType, status = "pending") {
  return useSWR<PartnerApplication[]>(
    ["partner:admin:applications", type, status],
    () =>
      adminPFetch<PartnerApplication[]>(
        `/admin/applications?status=${encodeURIComponent(status)}`,
      ).then((rows) => rows.filter((r) => r.partnerType === type)),
  )
}

export function useAdminPartnerAccounts(type: PartnerType) {
  return useSWR<PartnerAccount[]>(["partner:admin:accounts", type], () =>
    adminPFetch<PartnerAccount[]>(`/admin/accounts?type=${encodeURIComponent(type)}`),
  )
}

export async function adminInvitePartner(input: {
  partnerType: PartnerType
  partnerId: string
  email: string
  displayName: string
  metadata?: Record<string, unknown>
}) {
  const r = await adminPFetch<PartnerAccount>("/admin/invite", {
    method: "POST",
    body: JSON.stringify(input),
  })
  await globalMutate(["partner:admin:accounts", input.partnerType])
  return r
}

export async function adminApproveApplication(
  type: PartnerType,
  id: string,
  reviewNotes?: string,
) {
  const r = await adminPFetch<{ ok: true }>(`/admin/applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ reviewNotes }),
  })
  await Promise.all([
    globalMutate(["partner:admin:applications", type, "pending"]),
    globalMutate(["partner:admin:accounts", type]),
  ])
  return r
}

export async function adminRejectApplication(
  type: PartnerType,
  id: string,
  reviewNotes?: string,
) {
  const r = await adminPFetch<{ ok: true }>(`/admin/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewNotes }),
  })
  await globalMutate(["partner:admin:applications", type, "pending"])
  return r
}

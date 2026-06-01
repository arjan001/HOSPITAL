/**
 * api-nest.ts — Thin HTTP client + SWR hooks for the NestJS backend (/api/v2).
 *
 * All requests include `credentials: "include"` so the `shaniidrx_sid` session
 * cookie is forwarded automatically. When Clerk JWT auth lands, add an
 * `Authorization: Bearer <token>` header here — nothing else changes.
 *
 * Exports:
 *   nestFetch<T>(path, init?)     — raw fetch wrapper, throws on non-2xx
 *   apiNest                       — typed method object (health, me, addresses, …)
 *   useMeProfile()                — SWR hook: GET /me
 *   useMeAddresses()              — SWR hook: GET /me/addresses
 *   useMeWishlist()               — SWR hook: GET /me/wishlist
 *   useMeOrders()                 — SWR hook: GET /me/orders
 *
 * Type exports (used by account components):
 *   MeProfile, AccountAddress, AccountWishlistItem, AccountOrder, AccountOrderLine
 *
 * Pattern:
 *   Components read via SWR hooks; mutations call apiNest.* directly and then
 *   call the SWR mutate() to revalidate. SWR cache keys are stable strings
 *   (e.g. "/me", "/me/addresses") so globalMutate("/me") works from anywhere.
 */

import useSWR, { mutate as globalMutate } from "swr"
import { adminAuthHeaders } from "./api-client"

const BASE = "/api/v2"

async function nestFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      // Forward the signed admin token on /admin/* calls; harmless on customer
      // routes (AdminGuard only checks it on admin endpoints). Without it the
      // admin panel 503s in production (guard fails closed).
      ...adminAuthHeaders(),
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
    orderNumber?: string
    paid?: boolean
    items: AccountOrderLine[]
    deliveryFee?: number
    paymentMethod?: AccountOrder["paymentMethod"]
    customer: AccountOrder["customer"]
    shippingAddress: AccountOrder["shippingAddress"]
    mpesaCode?: string
    mpesaPhone?: string
    paymentRef?: string
    specialInstructions?: string
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
   Prescriptions — user-facing reads + write on upload.
   Pharmacist updates (status/notes/approvedDrugs) will move
   under /admin/prescriptions when admin auth ports to NestJS.
─────────────────────────────────────────────────────────────*/

export type ApprovedDrug = {
  name: string
  dosage: string
  instructions: string
  /** Per-unit price in whole KSh. `null` = not yet priced (storefront defaults). */
  price: number | null
  /** Quantity to dispense; defaults to 1. */
  quantity: number
}
/** Fallback per-unit price (KSh) when a drug has no explicit price set. Mirrors api-nest. */
export const DEFAULT_DRUG_PRICE = 750
export type RxStatus = "pending" | "verified" | "dispensed" | "rejected"
export type RxTimelineEvent = {
  at: string
  kind: "uploaded" | "received" | "in_review" | "verified" | "dispensed" | "rejected" | "note" | "payment"
  label: string
  by?: "system" | "pharmacist" | "patient"
}
export type AccountPrescription = {
  id: string
  rxNumber: string
  patientName: string
  recipient: string
  dob?: string
  phone: string
  email: string
  files: { name: string; size?: number; type?: string; url?: string; key?: string }[]
  notes: string
  status: RxStatus
  paymentMethod: "cash" | "insurance" | "unknown"
  pharmacistNote: string
  doctorNote: string
  approvedDrugs: ApprovedDrug[]
  rejectedReason?: string
  payment?: { amount: number; reference: string; receipt?: string; at: string }
  timeline: RxTimelineEvent[]
  createdAt: string
  updatedAt: string
}

export const apiPrescriptions = {
  list: () => nestFetch<AccountPrescription[]>("/me/prescriptions"),
  get: (id: string) => nestFetch<AccountPrescription>(`/me/prescriptions/${id}`),
  create: (input: {
    patientName?: string
    recipient: string
    dob?: string
    phone?: string
    email?: string
    files?: Array<{ name: string; size?: number; type?: string; url?: string; key?: string }>
    notes?: string
    paymentMethod?: "cash" | "insurance"
  }) =>
    nestFetch<AccountPrescription>("/me/prescriptions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  /** Pay for the approved drugs; advances the Rx to dispensed. */
  pay: (id: string, input: { amount?: number; reference: string; receipt?: string }) =>
    nestFetch<AccountPrescription>(`/me/prescriptions/${id}/pay`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
}

/** Itemized total (price × qty, defaulting unpriced drugs) in whole KSh. */
export function rxItemizedTotal(drugs: ApprovedDrug[]): number {
  return drugs.reduce((sum, d) => {
    const unit = typeof d.price === "number" && d.price >= 0 ? d.price : DEFAULT_DRUG_PRICE
    const qty = typeof d.quantity === "number" && d.quantity >= 1 ? d.quantity : 1
    return sum + unit * qty
  }, 0)
}

/** Owner-checked URL for streaming a prescription file (image inline / PDF). */
export function rxFileUrl(id: string, index: number): string {
  return `${BASE}/me/prescriptions/${id}/files/${index}`
}

/* ────────────────────────────────────────────────────────────
   Admin prescriptions — pharmacist review surface.
   Same record shape as the patient view (AccountPrescription),
   but cross-session: the backend resolves the owning session via
   its ownerOf map, guarded by AdminGuard (rx.view / rx.verify).
─────────────────────────────────────────────────────────────*/

/** Fields a pharmacist may edit on a prescription. */
export type AdminRxPatch = {
  status?: RxStatus
  pharmacistNote?: string
  doctorNote?: string
  rejectedReason?: string
  approvedDrugs?: ApprovedDrug[]
}

export const apiAdminPrescriptions = {
  list: () => nestFetch<AccountPrescription[]>("/admin/prescriptions"),
  get: (id: string) => nestFetch<AccountPrescription>(`/admin/prescriptions/${id}`),
  /** Patch any subset of editable fields (notes / approved drugs / status). */
  patch: (id: string, patch: AdminRxPatch) =>
    nestFetch<AccountPrescription>(`/admin/prescriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  /** Dedicated status transition (rejection carries an optional reason). */
  patchStatus: (id: string, status: RxStatus, reason?: string) =>
    nestFetch<AccountPrescription>(`/admin/prescriptions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(reason ? { status, reason } : { status }),
    }),
}

/** Admin (cross-session) URL for streaming a prescription file. */
export function adminRxFileUrl(id: string, index: number): string {
  return `${BASE}/admin/prescriptions/${id}/files/${index}`
}

export function useAdminPrescriptions() {
  return useSWR<AccountPrescription[]>("/admin/prescriptions", swrFetcher, {
    refreshInterval: 20_000, // surface new patient uploads without a manual refresh
  })
}
export function refreshAdminPrescriptions() {
  return globalMutate("/admin/prescriptions")
}

export type AdminPrescriptionsPage = {
  items: AccountPrescription[]
  total: number
  page: number
  pageSize: number
  counts: Record<RxStatus | "all", number>
}

/* ────────────────────────────────────────────────────────────
   Audit log — server-side append-only activity log for the admin
   panel (api-nest writes: orders, payments, prescriptions,
   consultations). Surfaced alongside the local cmsStore entries.
─────────────────────────────────────────────────────────────*/

export type ServerAuditSeverity = "info" | "warning" | "danger"

export type ServerAuditEntry = {
  id: string
  ts: number
  module: string
  action: string
  target?: string
  summary?: string
  userId?: string
  ip?: string
  severity: ServerAuditSeverity
  meta?: Record<string, unknown>
}

export type ServerAuditPage = {
  items: ServerAuditEntry[]
  total: number
  page: number
  pageSize: number
}

export function useAdminAuditLog(opts: { page: number; pageSize: number }) {
  const params = new URLSearchParams({
    page: String(opts.page),
    pageSize: String(opts.pageSize),
  })
  const key = `/admin/audit?${params.toString()}`
  return useSWR<ServerAuditPage>(key, swrFetcher, {
    refreshInterval: 20_000,
    keepPreviousData: true,
  })
}

export function useAdminPrescriptionsPaged(opts: {
  page: number
  pageSize: number
  status?: RxStatus | "all"
  search?: string
}) {
  const params = new URLSearchParams({
    page: String(opts.page),
    pageSize: String(opts.pageSize),
  })
  if (opts.status && opts.status !== "all") params.set("status", opts.status)
  if (opts.search?.trim()) params.set("search", opts.search.trim())
  const key = `/admin/prescriptions?${params.toString()}`
  return useSWR<AdminPrescriptionsPage>(key, swrFetcher, {
    refreshInterval: 20_000,
    keepPreviousData: true,
  })
}

/* ────────────────────────────────────────────────────────────
   Uploads — generic binary upload to NestJS Storage backend.
   Today persisted to local disk; swap to S3 by editing
   artifacts/api-nest/src/common/storage.ts only.
─────────────────────────────────────────────────────────────*/

export type UploadedFile = { url: string; key: string; size: number }

/** Read a File as base64 (without the `data:...;base64,` prefix). */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => {
      const result = String(fr.result ?? "")
      const idx = result.indexOf("base64,")
      resolve(idx >= 0 ? result.slice(idx + "base64,".length) : result)
    }
    fr.onerror = () => reject(fr.error ?? new Error("file read failed"))
    fr.readAsDataURL(file)
  })
}

export const apiUploads = {
  async putFile(file: File, namespace: "prescriptions" | "consultations" | "general" = "general"): Promise<UploadedFile> {
    const data = await fileToBase64(file)
    return nestFetch<UploadedFile>("/uploads", {
      method: "POST",
      body: JSON.stringify({
        namespace,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        data,
      }),
    })
  },
}

export function useMyPrescriptions() {
  return useSWR<AccountPrescription[]>("/me/prescriptions", swrFetcher, {
    refreshInterval: 20_000, // pick up pharmacist updates without manual refresh
  })
}
export function refreshMyPrescriptions() {
  return globalMutate("/me/prescriptions")
}

/* ────────────────────────────────────────────────────────────
   Chat — patient ↔ pharmacist conversations (WhatsApp-style)
   Backend: NestJS api-nest with Server-Sent Events for true push.
─────────────────────────────────────────────────────────────*/

export type ChatSender = "patient" | "staff"
export type ChatStatus = "sent" | "delivered" | "read"
export type ChatAttachmentType = "image" | "file"

/** One prescribed drug inside a prescription chat card. */
export type ChatPrescriptionDrug = {
  name: string
  dosage?: string | null
  instructions?: string | null
  productSlug?: string | null
  price?: number | null
}

/** Structured rich-card payload attached to a chat message. */
export type ChatMessageMeta =
  | {
      kind: "prescription"
      prescriptionId: string
      rxNumber: string
      drugs: ChatPrescriptionDrug[]
    }
  | Record<string, unknown>

export type ChatMessage = {
  id: string
  threadId: string
  consultationId?: string | null
  sender: ChatSender
  text: string
  createdAt: string
  status: ChatStatus
  deliveredAt?: string | null
  readAt?: string | null
  authorName?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: ChatAttachmentType
  meta?: ChatMessageMeta | null
}

/** Presence payload pushed over SSE for patient/staff online + last-seen. */
export type ChatPresence = {
  who: ChatSender
  threadId: string
  online: boolean
  lastSeen: string | null
}

/** Optional attachment when sending a chat message. */
export type ChatAttachmentInput = {
  attachmentUrl: string
  attachmentName?: string
  attachmentType?: ChatAttachmentType
}

export type ChatThreadStatus = "active" | "archived"

export type ChatThread = {
  id: string
  patientName: string
  patientPhone: string
  consultationId?: string | null
  lastMessage: string
  lastSender: ChatSender | null
  updatedAt: string
  createdAt: string
  unreadByStaff: number
  unreadByPatient: number
  status: ChatThreadStatus
  closedAt?: string | null
}

/**
 * One consultation segment of a thread, enriched for list/history views
 * (account "past conversations" + admin consultations module).
 */
export type ConsultationSummary = {
  id: string
  threadId: string | null
  patientName: string
  patientPhone: string
  type: string
  status: string
  threadStatus: ChatThreadStatus | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  messageCount: number
  lastMessage: string
  lastMessageAt: string | null
  prescriptionCount: number
}

export const apiChat = {
  // Patient
  myThread: () => nestFetch<ChatThread>("/chat/me"),
  myMessages: () => nestFetch<ChatMessage[]>("/chat/me/messages"),
  sendAsPatient: (
    text: string,
    profile?: { name?: string; phone?: string },
    attachment?: ChatAttachmentInput,
  ) =>
    nestFetch<ChatMessage>("/chat/me/messages", {
      method: "POST",
      body: JSON.stringify({ text, ...(profile || {}), ...(attachment || {}) }),
    }),
  markPatientRead: () =>
    nestFetch<ChatThread>("/chat/me/read", { method: "POST" }),
  setPatientTyping: (isTyping: boolean) =>
    nestFetch<{ ok: boolean }>("/chat/me/typing", {
      method: "POST",
      body: JSON.stringify({ isTyping }),
    }),
  testAsPatient: (profile?: { name?: string; phone?: string }) =>
    nestFetch<ChatMessage>("/chat/me/test", {
      method: "POST",
      body: JSON.stringify({ ...(profile || {}) }),
    }),
  /** End the consultation and preserve the transcript as a saved record. */
  closeMyThread: (consultationId?: string) =>
    nestFetch<ChatThread>("/chat/me/close", {
      method: "POST",
      body: JSON.stringify(consultationId ? { consultationId } : {}),
    }),
  /**
   * Assign (or return the existing) durable consultation id for this session's
   * thread. Called when the chat opens so the id can be put in the URL and the
   * conversation resumed after a reload.
   */
  ensureMyConsultation: (profile?: { name?: string; phone?: string }) =>
    nestFetch<{ consultationId: string; thread: ChatThread }>("/chat/me/consultation", {
      method: "POST",
      body: JSON.stringify({ ...(profile || {}) }),
    }),
  /**
   * Start a BRAND-NEW consultation: closes the current one (kept as history)
   * and opens a clean conversation. Used when a returning patient begins again.
   */
  startNewConsultation: (profile?: { name?: string; phone?: string }) =>
    nestFetch<{ consultationId: string; thread: ChatThread }>("/chat/me/consultation/new", {
      method: "POST",
      body: JSON.stringify({ ...(profile || {}) }),
    }),
  /** The signed-in patient's past consultations (newest first). */
  myConsultations: () => nestFetch<ConsultationSummary[]>("/chat/me/consultations"),
  /** The transcript of one of the patient's own past consultations. */
  myConsultationMessages: (consultationId: string) =>
    nestFetch<ChatMessage[]>(`/chat/me/consultations/${consultationId}/messages`),

  // Admin
  adminThreads: () => nestFetch<ChatThread[]>("/chat/admin/threads"),
  adminMessages: (threadId: string) =>
    nestFetch<ChatMessage[]>(`/chat/admin/threads/${threadId}/messages`),
  sendAsStaff: (
    threadId: string,
    text: string,
    name = "Pharmacist",
    attachment?: ChatAttachmentInput,
  ) =>
    nestFetch<ChatMessage>(`/chat/admin/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, name, ...(attachment || {}) }),
    }),
  markStaffRead: (threadId: string) =>
    nestFetch<ChatThread>(`/chat/admin/threads/${threadId}/read`, { method: "POST" }),
  setStaffTyping: (threadId: string, isTyping: boolean) =>
    nestFetch<{ ok: boolean }>(`/chat/admin/threads/${threadId}/typing`, {
      method: "POST",
      body: JSON.stringify({ isTyping }),
    }),
  testAsStaff: (threadId: string, name = "Pharmacist") =>
    nestFetch<ChatMessage>(`/chat/admin/threads/${threadId}/test`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  /** End a consultation thread (archives + preserves the transcript). */
  closeThread: (threadId: string, consultationId?: string) =>
    nestFetch<ChatThread>(`/chat/admin/threads/${threadId}/close`, {
      method: "POST",
      body: JSON.stringify(consultationId ? { consultationId } : {}),
    }),
  /**
   * Doctor prescribes one or more drugs from inside the chat. Creates a verified
   * prescription linked to the thread's consultation and posts a staff message
   * carrying a tappable prescription card. Returns the posted message + Rx.
   */
  prescribe: (
    threadId: string,
    payload: {
      drugs: ChatPrescriptionDrug[]
      doctorNote?: string
      doctorName?: string
    },
  ) =>
    nestFetch<{ message: ChatMessage; prescription: AccountPrescription; consultationId: string }>(
      `/chat/admin/threads/${threadId}/prescribe`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  deleteThread: (threadId: string) =>
    nestFetch<{ ok: boolean }>(`/chat/admin/threads/${threadId}`, { method: "DELETE" }),
  /** Every live-chat consultation across all patients (real data, no seeds). */
  adminConsultations: () => nestFetch<ConsultationSummary[]>("/chat/admin/consultations"),
  /** The transcript of one consultation (admin). */
  adminConsultationMessages: (consultationId: string) =>
    nestFetch<ChatMessage[]>(`/chat/admin/consultations/${consultationId}/messages`),
}

export function chatStreamUrl(scope: "me" | "admin"): string {
  return `${BASE}/chat/${scope}/stream`
}

// Only render attachment URLs that are safe in <a href>/<img src> sinks:
// site-relative ("/uploads/...") or http(s). Blocks javascript:/data:/etc.
export function isSafeAttachmentUrl(url: string | undefined | null): boolean {
  if (!url) return false
  const u = url.trim()
  if (!u) return false
  if (u.startsWith("/") && !u.startsWith("//")) return true
  try {
    const proto = new URL(u).protocol.toLowerCase()
    return proto === "http:" || proto === "https:"
  } catch {
    return false
  }
}

// Fold an SSE message into a cached list WITHOUT reordering: replace in place
// by id (status transitions re-emit the same message), append only if new.
export function foldChatMessage(
  prev: ChatMessage[] | undefined,
  msg: ChatMessage,
): ChatMessage[] {
  if (!prev) return [msg]
  const idx = prev.findIndex((m) => m.id === msg.id)
  if (idx === -1) return [...prev, msg]
  const next = prev.slice()
  next[idx] = msg
  return next
}

export function useMyThread() {
  return useSWR<ChatThread>("/chat/me", swrFetcher)
}
export function useMyMessages(enabled = true) {
  return useSWR<ChatMessage[]>(enabled ? "/chat/me/messages" : null, swrFetcher, {
    refreshInterval: 30_000, // SSE handles realtime; this is a safety net
  })
}
export function useMyConsultations(enabled = true) {
  return useSWR<ConsultationSummary[]>(
    enabled ? "/chat/me/consultations" : null,
    swrFetcher,
    { refreshInterval: 30_000 },
  )
}
export function useAdminThreads() {
  return useSWR<ChatThread[]>("/chat/admin/threads", swrFetcher)
}
export function useAdminConsultations() {
  return useSWR<ConsultationSummary[]>("/chat/admin/consultations", swrFetcher, {
    refreshInterval: 20_000,
  })
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

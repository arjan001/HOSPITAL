import { cmsStore, newId } from "@/lib/cms-store"

export type AdminOrderStatus = "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled"

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
  date: string
  createdAt: string
}

export const ORDERS_KEY = "admin-orders"

/** Sales = orders whose payment has been confirmed (and onward in fulfilment). */
export const SALE_STATUSES: AdminOrderStatus[] = ["confirmed", "dispatched", "delivered"]
export const isSale = (s: AdminOrderStatus) => SALE_STATUSES.includes(s)

function readAll(): AdminOrderRecord[] {
  return cmsStore.get<AdminOrderRecord[]>(ORDERS_KEY, [])
}
function writeAll(list: AdminOrderRecord[]) {
  cmsStore.set(ORDERS_KEY, list)
}

function todayLabel(d = new Date()): string {
  return d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
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
}

/** Insert or update by orderNo. Status mapping (caller's responsibility) decides Sale vs Order. */
export function upsertAdminOrder(input: UpsertOrderInput): AdminOrderRecord {
  const list = readAll()
  const now = new Date()
  const existingIdx = list.findIndex((o) => o.orderNo === input.orderNo)
  const base: AdminOrderRecord = existingIdx >= 0
    ? list[existingIdx]
    : {
        id: newId("ord"),
        orderNo: input.orderNo,
        customer: "",
        phone: "",
        email: "",
        items: [],
        subtotal: 0,
        delivery: 0,
        total: 0,
        location: "",
        address: "",
        notes: "",
        specialInstructions: "",
        status: "pending",
        orderedVia: "website",
        paymentMethod: "cod",
        mpesaCode: "",
        mpesaPhone: "",
        mpesaMessage: "",
        date: todayLabel(now),
        createdAt: now.toISOString(),
      }
  const record: AdminOrderRecord = {
    ...base,
    customer: input.customer || base.customer,
    phone: input.phone || base.phone,
    email: input.email ?? base.email,
    items: input.items?.length ? input.items : base.items,
    subtotal: input.subtotal ?? base.subtotal,
    delivery: input.delivery ?? base.delivery,
    total: input.total ?? base.total,
    location: input.location ?? base.location,
    address: input.address ?? base.address,
    notes: input.notes ?? base.notes,
    specialInstructions: input.specialInstructions ?? base.specialInstructions,
    status: input.status,
    orderedVia: input.orderedVia ?? base.orderedVia,
    paymentMethod: input.paymentMethod ?? base.paymentMethod,
    mpesaCode: input.mpesaCode ?? base.mpesaCode,
    mpesaPhone: input.mpesaPhone ?? base.mpesaPhone,
    mpesaMessage: input.mpesaMessage ?? base.mpesaMessage,
  }
  const next = [...list]
  if (existingIdx >= 0) next[existingIdx] = record
  else next.unshift(record)
  writeAll(next)
  return record
}

export function setOrderStatus(orderNo: string, status: AdminOrderStatus): void {
  const list = readAll()
  const idx = list.findIndex((o) => o.orderNo === orderNo)
  if (idx < 0) return
  list[idx] = { ...list[idx], status }
  writeAll(list)
}

export function deleteOrdersByIds(ids: string[]): number {
  const list = readAll()
  const set = new Set(ids)
  const next = list.filter((o) => !set.has(o.id))
  writeAll(next)
  return list.length - next.length
}

export function countPendingOrders(): number {
  return readAll().filter((o) => o.status === "pending").length
}

"use client"

/**
 * pos-store — typed accessors for the POS module on top of `cmsStore`.
 *
 * Keys used (all swap together to a NestJS backend later):
 *   pos.settings       — register config + receipt template
 *   pos.shifts         — historical shifts (opened / closed)
 *   pos.held           — currently held / parked orders
 *   pos.transactions   — completed sales (today + history)
 *
 * Everything is per-browser today (localStorage). Same surface area as the
 * rest of the admin so when we port to NestJS we replace `cmsStore` and the
 * UI does not change.
 */

import { cmsStore, useCmsDoc, newId } from "./cms-store"
import type { Product } from "./types"

export type PaymentMethod = "cash" | "mpesa" | "credit"

export interface PosSettings {
  registerName: string
  storeName: string
  storeAddress: string
  storePhone: string
  storeTaxId: string                // KRA PIN etc
  receiptHeader: string             // small line printed above items
  receiptFooter: string             // thank-you / returns line
  receiptLogoUrl: string
  paperWidth: "58mm" | "80mm"
  taxRate: number                   // percent, e.g. 16 for VAT
  taxInclusive: boolean             // true = price already includes tax
  currency: string                  // "KSh"
  requireOpeningFloat: boolean
  defaultOpeningFloat: number
  enabledMethods: PaymentMethod[]
  defaultMethod: PaymentMethod
  autoPrint: boolean
  maxDiscountPercent: number
}

export const DEFAULT_POS_SETTINGS: PosSettings = {
  registerName: "Counter 1",
  storeName: "Shaniid RX Pharmacy",
  storeAddress: "Eastleigh, Nairobi",
  storePhone: "+254 700 000 000",
  storeTaxId: "",
  receiptHeader: "Genuine medicine. Fair price. Delivered with integrity.",
  receiptFooter: "Thank you. Keep this receipt for returns within 7 days.",
  receiptLogoUrl: "/logo.svg",
  paperWidth: "80mm",
  taxRate: 16,
  taxInclusive: true,
  currency: "KSh",
  requireOpeningFloat: true,
  defaultOpeningFloat: 2000,
  enabledMethods: ["cash", "mpesa", "credit"],
  defaultMethod: "cash",
  autoPrint: true,
  maxDiscountPercent: 20,
}

export interface PosCartLine {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  /** Per-line discount in absolute currency units (after qty applied). */
  discountAmount?: number
}

export interface PosShift {
  id: string
  registerName: string
  openedAt: string
  openedBy: string
  openingFloat: number
  closedAt?: string
  closedBy?: string
  closingCashCounted?: number
  notes?: string
  status: "open" | "closed"
}

export interface PosHeldOrder {
  id: string
  ticketName: string                 // human handle e.g. "Walk-in #1"
  customer?: string
  items: PosCartLine[]
  note?: string
  createdAt: string
}

export interface PosTransaction {
  id: string                         // also the receipt number
  shiftId: string
  cashier: string
  customer?: string
  items: PosCartLine[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  paymentMethod: PaymentMethod
  paymentRef?: string                // MPESA code / card auth / IOU id
  tendered: number
  change: number
  createdAt: string
  voided?: boolean
}

/* ---------- hooks ---------- */

export function usePosSettings() {
  return useCmsDoc<PosSettings>("pos.settings", DEFAULT_POS_SETTINGS)
}
export function useShifts() {
  return useCmsDoc<PosShift[]>("pos.shifts", [])
}
export function useHeldOrders() {
  return useCmsDoc<PosHeldOrder[]>("pos.held", [])
}
export function useTransactions() {
  return useCmsDoc<PosTransaction[]>("pos.transactions", [])
}

/* ---------- helpers ---------- */

export function activeShift(shifts: PosShift[]): PosShift | undefined {
  return shifts.find((s) => s.status === "open")
}

export function makeCartLine(product: Product, quantity = 1): PosCartLine {
  return {
    productId: product.id,
    name: product.name,
    unitPrice: product.price,
    quantity,
  }
}

export interface CartTotals {
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  itemCount: number
}

/**
 * Compute totals from a cart + an optional cart-level discount. Cart-level
 * discount applies AFTER per-line discounts and BEFORE tax (when tax is
 * not inclusive). Tax-inclusive mode backs the tax out of the gross.
 */
export function computeTotals(
  lines: PosCartLine[],
  settings: PosSettings,
  cartDiscount: number = 0,
): CartTotals {
  const lineGross = lines.reduce(
    (acc, l) => acc + l.unitPrice * l.quantity - (l.discountAmount ?? 0),
    0,
  )
  const afterCartDiscount = Math.max(0, lineGross - cartDiscount)
  const itemCount = lines.reduce((acc, l) => acc + l.quantity, 0)
  let subtotal: number
  let taxTotal: number
  if (settings.taxInclusive) {
    const r = settings.taxRate / 100
    subtotal = afterCartDiscount / (1 + r)
    taxTotal = afterCartDiscount - subtotal
  } else {
    subtotal = afterCartDiscount
    taxTotal = afterCartDiscount * (settings.taxRate / 100)
  }
  const total = subtotal + taxTotal
  const discountTotal =
    lines.reduce((acc, l) => acc + (l.discountAmount ?? 0), 0) + cartDiscount
  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    total: round2(total),
    itemCount,
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function fmt(n: number, currency = "KSh"): string {
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/* ---------- mutators (centralised so receipts / audit are consistent) ---------- */

export function openShift(opts: {
  registerName: string
  openedBy: string
  openingFloat: number
}): PosShift {
  const shifts = cmsStore.get<PosShift[]>("pos.shifts", [])
  const existing = activeShift(shifts)
  if (existing) return existing
  const shift: PosShift = {
    id: newId("shift"),
    registerName: opts.registerName,
    openedAt: new Date().toISOString(),
    openedBy: opts.openedBy,
    openingFloat: opts.openingFloat,
    status: "open",
  }
  cmsStore.set<PosShift[]>("pos.shifts", [shift, ...shifts])
  return shift
}

export function closeShift(opts: {
  shiftId: string
  closedBy: string
  closingCashCounted: number
  notes?: string
}): PosShift | undefined {
  const shifts = cmsStore.get<PosShift[]>("pos.shifts", [])
  const next = shifts.map((s) =>
    s.id === opts.shiftId
      ? {
          ...s,
          status: "closed" as const,
          closedAt: new Date().toISOString(),
          closedBy: opts.closedBy,
          closingCashCounted: opts.closingCashCounted,
          notes: opts.notes,
        }
      : s,
  )
  cmsStore.set<PosShift[]>("pos.shifts", next)
  return next.find((s: PosShift) => s.id === opts.shiftId)
}

export function holdOrder(order: Omit<PosHeldOrder, "id" | "createdAt">): PosHeldOrder {
  const held = cmsStore.get<PosHeldOrder[]>("pos.held", [])
  const record: PosHeldOrder = {
    ...order,
    id: newId("hold"),
    createdAt: new Date().toISOString(),
  }
  cmsStore.set<PosHeldOrder[]>("pos.held", [record, ...held])
  return record
}

export function removeHeldOrder(id: string): void {
  const held = cmsStore.get<PosHeldOrder[]>("pos.held", [])
  cmsStore.set<PosHeldOrder[]>("pos.held", held.filter((h: PosHeldOrder) => h.id !== id))
}

export function commitTransaction(tx: Omit<PosTransaction, "id" | "createdAt">): PosTransaction {
  const list = cmsStore.get<PosTransaction[]>("pos.transactions", [])
  const record: PosTransaction = {
    ...tx,
    id: newId("rx"),
    createdAt: new Date().toISOString(),
  }
  cmsStore.set<PosTransaction[]>("pos.transactions", [record, ...list])
  return record
}

/* ---------- Z-report helpers ---------- */

export interface ShiftSummary {
  shift: PosShift
  transactions: PosTransaction[]
  totalSales: number
  totalDiscount: number
  totalTax: number
  itemsSold: number
  byMethod: Record<PaymentMethod, { count: number; total: number }>
  expectedCash: number
  variance?: number                  // closing - expected (only after close)
}

export function summariseShift(
  shift: PosShift,
  transactions: PosTransaction[],
): ShiftSummary {
  const own = transactions.filter((t) => t.shiftId === shift.id && !t.voided)
  const totalSales = round2(own.reduce((a, t) => a + t.total, 0))
  const totalDiscount = round2(own.reduce((a, t) => a + t.discountTotal, 0))
  const totalTax = round2(own.reduce((a, t) => a + t.taxTotal, 0))
  const itemsSold = own.reduce(
    (a, t) => a + t.items.reduce((b, l) => b + l.quantity, 0),
    0,
  )
  const byMethod: Record<PaymentMethod, { count: number; total: number }> = {
    cash:   { count: 0, total: 0 },
    mpesa:  { count: 0, total: 0 },
    credit: { count: 0, total: 0 },
  }
  for (const t of own) {
    byMethod[t.paymentMethod].count += 1
    byMethod[t.paymentMethod].total = round2(byMethod[t.paymentMethod].total + t.total)
  }
  const expectedCash = round2(shift.openingFloat + byMethod.cash.total)
  const variance =
    shift.closingCashCounted == null
      ? undefined
      : round2(shift.closingCashCounted - expectedCash)
  return {
    shift,
    transactions: own,
    totalSales,
    totalDiscount,
    totalTax,
    itemsSold,
    byMethod,
    expectedCash,
    variance,
  }
}

"use client"

/**
 * AdminPharmacyPos — Point-of-Sale interface for in-store transactions.
 *
 * Features:
 * - Product search + add to cart
 * - Quantity adjustment & line removal
 * - Customer name/phone (optional)
 * - Branch selection
 * - Discount entry
 * - Cash / Mesa (M-PESA via Paystack) payment
 * - Mesa: phone modal + STK push + live polling
 * - Cart persisted in localStorage between refreshes
 * - Receipt view with print support
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import useSWR from "swr"
import {
  ShoppingCart, Search, Plus, Minus, Trash2, Printer,
  CheckCircle2, X, User, Phone, Tag, Building2,
  Receipt, Package, Loader2, Smartphone, RefreshCw, AlertCircle,
  Wifi,
} from "lucide-react"
import { adminAuthHeaders } from "@/lib/api-client"
import { CATALOG_PRODUCTS } from "@/lib/catalog-api"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Product } from "@/lib/types"

const WINE = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const CART_KEY = "shaniidrx-pos-cart"

type Branch = { id: string; name: string; branchCode: string; status: string }

type CartItem = {
  productId: string
  name: string
  qty: number
  unitPrice: number
  total: number
}

type PosTransaction = {
  id: string
  receiptNo: string
  branchId: string
  customerName?: string
  customerPhone?: string
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  status: string
  paymentRef?: string
  createdAt: string
}

const BASE = "/api/v2"

function authFetcher(url: string) {
  return fetch(url, { headers: adminAuthHeaders() }).then((r) => r.json())
}

async function createTx(body: unknown) {
  const r = await fetch(`${BASE}/pharmacy/pos/transactions`, {
    method: "POST",
    headers: { ...adminAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<PosTransaction>
}

async function patchTx(id: string, body: unknown) {
  const r = await fetch(`${BASE}/pharmacy/pos/transactions/${id}`, {
    method: "PATCH",
    headers: { ...adminAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<PosTransaction>
}

async function getTx(id: string) {
  const r = await fetch(`${BASE}/pharmacy/pos/transactions/${id}`, {
    headers: adminAuthHeaders(),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<PosTransaction>
}

// ─── Receipt View ─────────────────────────────────────────────────────────

function ReceiptView({ tx, branchName, onClose }: {
  tx: PosTransaction
  branchName: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  function print() {
    const html = ref.current?.innerHTML ?? ""
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>Receipt ${tx.receiptNo}</title>
      <style>body{font-family:monospace;font-size:12px;padding:20px;max-width:300px}
      hr{border:1px dashed #ccc}table{width:100%}td{padding:2px 0}</style>
      </head><body>${html}</body></html>
    `)
    win.document.close()
    win.print()
  }

  const payLabel = tx.paymentMethod === "mesa" ? "M-PESA (Mesa)" : tx.paymentMethod.toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: WINE }}>Receipt</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={print}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <button type="button" onClick={onClose}><X className="h-5 w-5 opacity-50" /></button>
          </div>
        </div>

        <div ref={ref} className="font-mono text-xs">
          <div className="text-center mb-3">
            <p className="font-bold text-sm">SHANIID RX</p>
            <p>{branchName}</p>
            <p className="opacity-60">{new Date(tx.createdAt).toLocaleString()}</p>
            <p className="font-bold mt-1">Receipt: {tx.receiptNo}</p>
          </div>
          <hr className="my-2" />
          {tx.customerName && <p>Customer: {tx.customerName}</p>}
          {tx.customerPhone && <p>Phone: {tx.customerPhone}</p>}
          <hr className="my-2" />
          <table>
            <tbody>
              {tx.items.map((item) => (
                <tr key={item.productId}>
                  <td className="pr-2">{item.name}</td>
                  <td className="text-right">×{item.qty}</td>
                  <td className="text-right pl-2">KES {item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="my-2" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>KES {tx.subtotal.toLocaleString()}</span>
          </div>
          {tx.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-KES {tx.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL</span>
            <span>KES {tx.total.toLocaleString()}</span>
          </div>
          <hr className="my-2" />
          <p className="text-center">Payment: {payLabel}</p>
          {tx.paymentRef && <p className="text-center opacity-60">Ref: {tx.paymentRef}</p>}
          <p className="text-center mt-2 opacity-60">Thank you for choosing Shaniid RX</p>
        </div>

        <Button className="w-full mt-4" onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}

// ─── Mesa Payment Modal ────────────────────────────────────────────────────

type MesaState = "idle" | "sending" | "waiting" | "success" | "failed"

function MesaModal({
  total,
  prefillPhone,
  onConfirmed,
  onCancel,
}: {
  total: number
  prefillPhone?: string
  onConfirmed: (mpesaRef: string, phone: string) => void
  onCancel: () => void
}) {
  const [phone, setPhone] = useState(prefillPhone ?? "")
  const [state, setState] = useState<MesaState>("idle")
  const [txId, setTxId] = useState<string | null>(null)
  const [mpesaRef, setMpesaRef] = useState<string | null>(null)
  const [err, setErr] = useState("")
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const TIMEOUT_SECS = 90

  function stopTimers() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null }
  }

  useEffect(() => () => stopTimers(), [])

  async function sendRequest() {
    const e164 = phone.replace(/\s+/g, "").replace(/^0/, "+254").replace(/^254/, "+254")
    if (!/^\+254\d{9}$/.test(e164)) {
      setErr("Enter a valid Kenyan M-PESA number, e.g. 0712 345 678")
      return
    }
    setErr("")
    setState("sending")

    try {
      const r = await fetch(`${BASE}/payments/paystack/initiate`, {
        method: "POST",
        headers: { ...adminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          phone: e164,
          channel: "mobile_money",
          metadata: { source: "pos" },
        }),
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? "Failed to initiate payment")
      }
      const data = await r.json() as { reference?: string; data?: { reference?: string } }
      const ref = data.reference ?? data.data?.reference
      if (ref) setTxId(ref)
      setState("waiting")
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= TIMEOUT_SECS) {
            stopTimers()
            setState("failed")
            setErr("Payment timed out. Ask the customer to check their phone and retry.")
            return s + 1
          }
          return s + 1
        })
      }, 1000)

      pollRef.current = setInterval(async () => {
        if (!ref) return
        try {
          const pr = await fetch(`${BASE}/payments/paystack/status/${encodeURIComponent(ref)}`, {
            headers: adminAuthHeaders(),
          })
          if (!pr.ok) return
          const ps = await pr.json() as { status?: string; data?: { status?: string; gateway_response?: string; authorization?: { sender_country?: string } } }
          const status = ps.status ?? ps.data?.status
          if (status === "success" || status === "paid") {
            stopTimers()
            setMpesaRef(ref)
            setState("success")
            setTimeout(() => onConfirmed(ref, e164), 1200)
          } else if (status === "failed" || status === "cancelled" || status === "reversed") {
            stopTimers()
            setState("failed")
            setErr(`Payment ${status}. Please retry.`)
          }
        } catch { /* silent poll error */ }
      }, 4000)

    } catch (e) {
      setState("idle")
      setErr(e instanceof Error ? e.message : "Failed to send payment request")
    }
  }

  const remaining = Math.max(0, TIMEOUT_SECS - elapsed)
  const pct = ((TIMEOUT_SECS - remaining) / TIMEOUT_SECS) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
        style={{ border: `1px solid ${PEACH_BORDER}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: "#DCFCE7" }}
            >
              <Smartphone className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: WINE }}>Mesa Payment</h3>
              <p className="text-[11px] text-muted-foreground">M-PESA STK Push</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={state === "waiting" || state === "sending"}>
            <X className="h-5 w-5 opacity-50" />
          </button>
        </div>

        {/* Amount */}
        <div
          className="rounded-xl px-4 py-3 mb-5 text-center"
          style={{ background: "#FFFBF5", border: `1px solid ${PEACH_BORDER}` }}
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Amount due</p>
          <p className="text-2xl font-black" style={{ color: WINE }}>KES {total.toLocaleString()}</p>
        </div>

        {/* States */}
        {(state === "idle" || state === "sending") && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Customer M-PESA number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full h-11 rounded-xl border pl-9 pr-4 text-sm font-medium outline-none focus:ring-2"
                  style={{ borderColor: PEACH_BORDER }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  inputMode="tel"
                  disabled={state === "sending"}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Supports 07XX and 01XX numbers</p>
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {err}
              </div>
            )}

            <button
              type="button"
              onClick={() => void sendRequest()}
              disabled={state === "sending" || !phone.trim()}
              className="w-full h-11 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
            >
              {state === "sending"
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending request…</>
                : <><Smartphone className="h-4 w-4" /> Send M-PESA Request</>
              }
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full h-9 rounded-full border text-sm text-muted-foreground hover:bg-gray-50 transition-colors"
              style={{ borderColor: PEACH_BORDER }}
            >
              Cancel
            </button>
          </div>
        )}

        {state === "waiting" && (
          <div className="space-y-4 text-center">
            <div className="relative mx-auto w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#F2DCC8" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none" stroke="#059669" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (pct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black" style={{ color: WINE }}>{remaining}</span>
                <span className="text-[9px] text-muted-foreground">secs</span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-sm" style={{ color: WINE }}>Waiting for payment…</p>
              <p className="text-xs text-muted-foreground mt-1">
                An M-PESA prompt has been sent to <span className="font-medium">{phone}</span>.
                Ask the customer to enter their PIN.
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Wifi className="h-3.5 w-3.5 animate-pulse" />
              Checking every 4 seconds…
            </div>

            <button
              type="button"
              onClick={() => { stopTimers(); setState("idle"); setErr("") }}
              className="w-full h-9 rounded-full border text-sm text-muted-foreground hover:bg-gray-50 transition-colors"
              style={{ borderColor: PEACH_BORDER }}
            >
              Cancel / Retry
            </button>
          </div>
        )}

        {state === "success" && (
          <div className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-bold text-base" style={{ color: WINE }}>Payment confirmed!</p>
            <p className="text-xs text-muted-foreground">
              Ref: <span className="font-mono font-semibold">{mpesaRef}</span>
            </p>
            <p className="text-xs text-muted-foreground">Generating receipt…</p>
          </div>
        )}

        {state === "failed" && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <p className="font-semibold text-sm text-red-700">{err}</p>
            </div>
            <button
              type="button"
              onClick={() => { setState("idle"); setErr(""); setElapsed(0) }}
              className="w-full h-9 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }}
            >
              <RefreshCw className="h-4 w-4" /> Retry Payment
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full h-9 rounded-full border text-sm text-muted-foreground"
              style={{ borderColor: PEACH_BORDER }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main POS ─────────────────────────────────────────────────────────────

function loadCartFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
  } catch { return [] }
}

function saveCartToStorage(cart: CartItem[]) {
  try {
    if (cart.length === 0) localStorage.removeItem(CART_KEY)
    else localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch { /* ignore */ }
}

export function AdminPharmacyPos() {
  const { data: productsData, mutate: mutProducts } = useSWR<Product[]>(CATALOG_PRODUCTS, authFetcher)
  const { data: branches = [] } = useSWR<Branch[]>(`${BASE}/pharmacy/branches`, authFetcher)
  const { data: recentTxs = [], mutate: mutTxs } = useSWR<PosTransaction[]>(`${BASE}/pharmacy/pos/transactions`, authFetcher)

  const products: Product[] = Array.isArray(productsData) ? productsData : []
  const activeBranches = useMemo(() => branches.filter((b) => b.status === "active"), [branches])

  const [branchId, setBranchId] = useState("")
  const [search, setSearch] = useState("")
  const [cart, setCartRaw] = useState<CartItem[]>(() => loadCartFromStorage())
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mesa">("cash")
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<PosTransaction | null>(null)
  const [showMesa, setShowMesa] = useState(false)
  const [err, setErr] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

  function setCart(updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) {
    setCartRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      saveCartToStorage(next)
      return next
    })
  }

  // Auto-select first branch
  useEffect(() => {
    if (!branchId && activeBranches.length) setBranchId(activeBranches[0].id)
  }, [activeBranches, branchId])

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return products.slice(0, 30)
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.id ?? "").toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q),
    ).slice(0, 30)
  }, [products, search])

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.total, 0), [cart])
  const total = Math.max(0, subtotal - discount)

  function stockFor(productId: string): number {
    const p = products.find((x) => x.id === productId)
    if (!p) return 0
    if (typeof p.stockCount === "number") return Math.max(0, p.stockCount)
    return p.inStock ? 999 : 0
  }

  function addToCart(p: Product) {
    const available = stockFor(p.id)
    if (available <= 0) {
      setErr(`${p.name} is out of stock.`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id)
      if (existing) {
        const nextQty = Math.min(available, existing.qty + 1)
        return prev.map((i) => i.productId === p.id
          ? { ...i, qty: nextQty, total: nextQty * i.unitPrice }
          : i)
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        qty: 1,
        unitPrice: Number(p.price) || 0,
        total: Number(p.price) || 0,
      }]
    })
    setSearch("")
    searchRef.current?.focus()
  }

  function changeQty(productId: string, delta: number) {
    const max = stockFor(productId)
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i
        const qty = Math.min(max, Math.max(0, i.qty + delta))
        return { ...i, qty, total: qty * i.unitPrice }
      }).filter((i) => i.qty > 0),
    )
  }

  function clearCart() {
    setCart([])
    setCustomerName("")
    setCustomerPhone("")
    setDiscount(0)
    setErr("")
  }

  async function checkoutCash() {
    if (!branchId) { setErr("Please select a branch."); return }
    if (cart.length === 0) { setErr("Cart is empty."); return }
    setProcessing(true)
    setErr("")
    try {
      const tx = await createTx({
        branchId,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        items: cart,
        subtotal,
        discount,
        total,
        paymentMethod: "cash",
        status: "paid",
      })
      setReceipt(tx)
      clearCart()
      void mutTxs()
      void mutProducts()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to process sale")
    } finally {
      setProcessing(false)
    }
  }

  async function handleMesaConfirmed(mpesaRef: string, phone: string) {
    setShowMesa(false)
    setProcessing(true)
    setErr("")
    try {
      const tx = await createTx({
        branchId,
        customerName: customerName || undefined,
        customerPhone: phone,
        items: cart,
        subtotal,
        discount,
        total,
        paymentMethod: "mesa",
        status: "paid",
        paymentRef: mpesaRef,
      })
      setReceipt(tx)
      clearCart()
      void mutTxs()
      void mutProducts()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to record Mesa payment")
    } finally {
      setProcessing(false)
    }
  }

  function handleCheckout() {
    if (!branchId) { setErr("Please select a branch."); return }
    if (cart.length === 0) { setErr("Cart is empty."); return }
    if (paymentMethod === "mesa") {
      setShowMesa(true)
    } else {
      void checkoutCash()
    }
  }

  const branchName = useMemo(() => branches.find((b) => b.id === branchId)?.name ?? "Branch", [branches, branchId])

  return (
    <AdminShell title="Point of Sale (POS)">
      <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
        Branch sales deduct from the shared catalog stock (<code className="text-[11px]">products</code> in admin) — same ledger as the online shop.
      </p>
      {receipt && (
        <ReceiptView
          tx={receipt}
          branchName={branchName}
          onClose={() => setReceipt(null)}
        />
      )}

      {showMesa && (
        <MesaModal
          total={total}
          prefillPhone={customerPhone || undefined}
          onConfirmed={(ref, ph) => void handleMesaConfirmed(ref, ph)}
          onCancel={() => setShowMesa(false)}
        />
      )}

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* Left: Product search + recent transactions */}
        <div className="flex-1 flex flex-col border-r overflow-hidden" style={{ borderColor: PEACH_BORDER }}>
          {/* Branch selector */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: PEACH_BORDER }}>
            <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input px-3 text-sm"
            >
              <option value="">Select branch…</option>
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b" style={{ borderColor: PEACH_BORDER }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, SKU…"
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">No products found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="text-left rounded-xl border p-3 hover:shadow-md transition-shadow bg-white"
                    style={{ borderColor: PEACH_BORDER }}
                  >
                    <div className="aspect-video bg-gray-50 rounded-lg mb-2 overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-10">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: WINE }}>{p.name}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: ACCENT_RED }}>
                      KES {Number(p.price).toLocaleString()}
                    </p>
                    {!(p.inStock) && (
                      <p className="text-[10px] text-red-500 mt-0.5">Out of stock</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent transactions strip */}
          {recentTxs.length > 0 && (
            <div className="border-t px-4 py-3" style={{ borderColor: PEACH_BORDER }}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Recent transactions</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentTxs.slice(0, 8).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex-shrink-0 rounded-lg border p-2 text-xs min-w-[120px]"
                    style={{ borderColor: PEACH_BORDER }}
                  >
                    <p className="font-semibold" style={{ color: WINE }}>{tx.receiptNo}</p>
                    <p className="text-muted-foreground">KES {tx.total.toLocaleString()}</p>
                    <p className="text-muted-foreground capitalize">
                      {tx.paymentMethod === "mesa" ? "Mesa" : tx.paymentMethod}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="w-80 flex flex-col bg-white" style={{ minWidth: 280 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: PEACH_BORDER }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" style={{ color: WINE }} />
              <span className="text-sm font-bold" style={{ color: WINE }}>Cart</span>
              {cart.length > 0 && (
                <span
                  className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center text-white"
                  style={{ background: ACCENT_RED }}
                >
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button type="button" onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive">
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto opacity-20 mb-2" />
                <p className="text-xs">Add products from the left</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: PEACH_BORDER }}>
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-start gap-2 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight" style={{ color: WINE }}>{item.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        KES {item.unitPrice.toLocaleString()} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => changeQty(item.productId, -1)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center"
                        style={{ borderColor: PEACH_BORDER }}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.productId, 1)}
                        className="w-6 h-6 rounded-full border flex items-center justify-center"
                        style={{ borderColor: PEACH_BORDER }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-xs font-bold flex-shrink-0 w-16 text-right" style={{ color: WINE }}>
                      KES {item.total.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer + discount */}
          {cart.length > 0 && (
            <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: PEACH_BORDER }}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                  className="text-xs h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="text-xs h-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="number"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="Discount (KES)"
                  className="text-xs h-8"
                />
              </div>
            </div>
          )}

          {/* Totals + checkout */}
          {cart.length > 0 && (
            <div className="border-t px-4 py-4 space-y-3" style={{ borderColor: PEACH_BORDER }}>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>KES {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between" style={{ color: "#059669" }}>
                    <span>Discount</span>
                    <span>-KES {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-1" style={{ color: WINE }}>
                  <span>Total</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex gap-2">
                {(["cash", "mesa"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className="flex-1 h-9 rounded-full text-xs font-semibold border transition-colors"
                    style={paymentMethod === m
                      ? { background: WINE, color: "#fff", borderColor: WINE }
                      : { color: WINE, borderColor: PEACH_BORDER }
                    }
                  >
                    {m === "mesa" ? "Mesa (M-PESA)" : "Cash"}
                  </button>
                ))}
              </div>

              {paymentMethod === "mesa" && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Customer will receive an STK push on their phone
                </p>
              )}

              {err && <p className="text-xs text-destructive">{err}</p>}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={processing || !branchId}
                className="w-full h-11 rounded-full text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE}, ${ACCENT_RED})` }}
              >
                {processing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                  : <><Receipt className="h-4 w-4" /> Charge & Print Receipt</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

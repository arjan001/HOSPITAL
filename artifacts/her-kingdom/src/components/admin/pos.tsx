"use client"

/**
 * Shaniid RX — Point of Sale (over-the-counter).
 *
 * Single-screen cashier UI. Designed for a counter assistant with a touch
 * monitor or mouse: large hit targets, persistent shift status, instant
 * totals, receipt preview, and a real print path (window.print on a
 * dedicated print region).
 *
 * State surface:
 *   - product catalogue: GET /api/products (read-only)
 *   - shift / held orders / transactions / settings: cmsStore
 *     (swap to NestJS later without touching this file)
 */
import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import {
  Search, Pill, Plus, Minus, Trash2, Pause, Play, Percent, Printer,
  Smartphone, Banknote, FileSignature, X, ShieldCheck,
  ClipboardList, Clock, AlertTriangle, CheckCircle2, User as UserIcon,
  Receipt as ReceiptIcon, ChevronRight, Calculator,
} from "lucide-react"
import { AdminShell } from "./admin-shell"
import { safeFetcher } from "@/lib/fetcher"
import { notify } from "@/lib/notify"
import type { Product } from "@/lib/types"
import {
  usePosSettings, useShifts, useHeldOrders, useTransactions,
  activeShift, computeTotals, fmt, makeCartLine, openShift, closeShift,
  holdOrder, removeHeldOrder, commitTransaction, summariseShift,
  type PosCartLine, type PaymentMethod, type PosSettings, type PosTransaction,
} from "@/lib/pos-store"

// Soft Figma palette — plain white surfaces with a subtle peach wash.
const INK = "#1F1F1F"       // primary text + dark surfaces
const INK_SOFT = "#2D2D2D"  // hover / pressed
const PEACH_BG = "#FFF6F0"  // subtle peach surface tint
const PEACH_LINE = "#F5D9C6" // hairline divider
const CORAL = "#FF7A59"     // accent for highlights
// Aliases kept so existing references compile.
const WINE = INK
const WINE_DEEP = INK_SOFT
const ACCENT = CORAL
const CASHIER_NAME = "Counter Cashier" // TODO swap with Clerk user when admin auth lands

const METHOD_META: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  cash:   { label: "Cash",   icon: Banknote },
  mpesa:  { label: "M-Pesa", icon: Smartphone },
  credit: { label: "Credit", icon: FileSignature },
}

const QUICK_TENDER = [50, 100, 200, 500, 1000, 2000]

export function AdminPos() {
  const { data: products = [] } = useSWR<Product[]>("/api/products", safeFetcher, {
    revalidateOnFocus: false,
  })
  const [settings] = usePosSettings()
  const [shifts, setShifts] = useShifts()
  const [held, setHeld] = useHeldOrders()
  const [txns, setTxns] = useTransactions()

  const shift = activeShift(shifts)
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [query, setQuery] = useState("")
  const [cat, setCat] = useState<string>("All")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(settings.defaultMethod)
  const [tendered, setTendered] = useState<string>("")
  const [paymentRef, setPaymentRef] = useState("")
  const [customer, setCustomer] = useState("")
  const [cartDiscount, setCartDiscount] = useState(0)

  // M-Pesa STK push state
  const [mpesaPhone, setMpesaPhone] = useState("")
  type MpesaStage = "idle" | "pushing" | "waiting" | "paid" | "failed"
  const [mpesaStage, setMpesaStage] = useState<MpesaStage>("idle")
  const [mpesaMessage, setMpesaMessage] = useState("")
  const [mpesaSeconds, setMpesaSeconds] = useState(0)
  const mpesaTimers = useRef<{ poll?: ReturnType<typeof setInterval>; tick?: ReturnType<typeof setInterval> }>({})

  const stopMpesaTimers = () => {
    if (mpesaTimers.current.poll) clearInterval(mpesaTimers.current.poll)
    if (mpesaTimers.current.tick) clearInterval(mpesaTimers.current.tick)
    mpesaTimers.current = {}
  }
  useEffect(() => () => stopMpesaTimers(), [])

  // Reset M-Pesa flow when switching method or clearing cart.
  useEffect(() => {
    if (paymentMethod !== "mpesa") {
      stopMpesaTimers()
      setMpesaStage("idle")
      setMpesaMessage("")
    }
  }, [paymentMethod])

  // Modals
  const [openShiftModal, setOpenShiftModal] = useState(false)
  const [endShiftModal, setEndShiftModal] = useState(false)
  const [holdModal, setHoldModal] = useState(false)
  const [recallModal, setRecallModal] = useState(false)
  const [discountModal, setDiscountModal] = useState(false)
  const [previewModal, setPreviewModal] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<PosTransaction | null>(null)

  // Force the open-shift dialog if there's no active shift.
  useEffect(() => {
    if (!shift && !openShiftModal) setOpenShiftModal(true)
  }, [shift, openShiftModal])

  // Keep payment method valid as settings change.
  useEffect(() => {
    if (!settings.enabledMethods.includes(paymentMethod)) {
      setPaymentMethod(settings.defaultMethod)
    }
  }, [settings, paymentMethod])

  /* ---------- product browsing ---------- */
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => p.category && set.add(p.category))
    return ["All", ...Array.from(set).sort()]
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => cat === "All" || p.category === cat)
      .filter((p) => {
        if (!q) return true
        return (
          p.name.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)) ||
          p.category?.toLowerCase().includes(q)
        )
      })
      .slice(0, 60)
  }, [products, query, cat])

  /* ---------- cart ops ---------- */
  const addToCart = (p: Product) => {
    if (!shift) { notify.warning("Open a shift first"); return }
    if (!p.inStock) { notify.warning(`${p.name} is out of stock`); return }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id)
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, makeCartLine(p, 1)]
    })
  }
  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.productId !== productId))
      return
    }
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: qty } : l)))
  }
  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId))

  const resetCart = () => {
    setCart([])
    setTendered("")
    setPaymentRef("")
    setCustomer("")
    setCartDiscount(0)
    setMpesaPhone("")
    setMpesaStage("idle")
    setMpesaMessage("")
    stopMpesaTimers()
  }

  /* ---------- totals ---------- */
  const totals = useMemo(
    () => computeTotals(cart, settings, cartDiscount),
    [cart, settings, cartDiscount],
  )
  const tenderedNum = Number(tendered) || 0
  const change = paymentMethod === "cash" ? Math.max(0, tenderedNum - totals.total) : 0
  const canCharge =
    !!shift && cart.length > 0 &&
    (paymentMethod !== "cash" || tenderedNum >= totals.total) &&
    (paymentMethod !== "mpesa" || mpesaStage === "paid")

  /* ---------- charge ---------- */
  const charge = (andPrint: boolean) => {
    if (!shift) return
    if (!canCharge) {
      notify.warning(
        paymentMethod === "cash"
          ? "Cash tendered must cover the total"
          : paymentMethod === "mpesa"
            ? "Send the M-Pesa request and wait for confirmation"
            : "Cart is empty",
      )
      return
    }
    const tx = commitTransaction({
      shiftId: shift.id,
      cashier: CASHIER_NAME,
      customer: customer.trim() || undefined,
      items: cart,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      paymentMethod,
      paymentRef: paymentRef.trim() || undefined,
      tendered: paymentMethod === "cash" ? tenderedNum : totals.total,
      change,
    })
    setTxns([tx, ...txns])
    setLastReceipt(tx)
    notify.success(`Sale ${tx.id} — ${fmt(tx.total, settings.currency)}`, {
      description: METHOD_META[paymentMethod].label + (paymentRef ? ` · ${paymentRef}` : ""),
    })
    resetCart()
    if (andPrint || settings.autoPrint) {
      setPreviewModal(true)
      // wait for the receipt DOM to mount before triggering print
      setTimeout(() => window.print(), 250)
    }
  }

  /* ---------- hold / recall ---------- */
  const onHold = (ticketName: string, note: string) => {
    if (cart.length === 0) { notify.warning("Cart is empty"); return }
    const rec = holdOrder({ ticketName, customer: customer.trim() || undefined, items: cart, note })
    setHeld([rec, ...held])
    notify.info(`Held as “${ticketName}”`, { description: `${cart.length} item(s) parked` })
    resetCart()
    setHoldModal(false)
  }
  const onRecall = (id: string) => {
    const order = held.find((h) => h.id === id)
    if (!order) return
    setCart(order.items)
    setCustomer(order.customer ?? "")
    removeHeldOrder(id)
    setHeld(held.filter((h) => h.id !== id))
    notify.success(`Recalled “${order.ticketName}”`)
    setRecallModal(false)
  }

  const todaysSales = useMemo(() => {
    if (!shift) return { count: 0, total: 0 }
    const summary = summariseShift(shift, txns)
    return { count: summary.transactions.length, total: summary.totalSales }
  }, [shift, txns])

  /* ---------- render ---------- */
  return (
    <AdminShell title="Point of Sale">
      <PrintStyles />
      <div className="print:hidden -mx-4 lg:-mx-8 -mt-4 lg:-mt-8">
        {/* Sticky topbar — sits right under the admin shell topbar (h-14) */}
        <div
          className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b"
          style={{ borderColor: PEACH_LINE }}
        >
          <div className="px-4 lg:px-8 h-16 flex items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ background: INK }}
              >
                <ReceiptIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground leading-none">
                  POS · {settings.registerName}
                </p>
                <p className="text-sm font-semibold leading-tight mt-1 truncate" style={{ color: INK }}>
                  {shift
                    ? `Open since ${new Date(shift.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Shift closed"}
                </p>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 lg:gap-3">
              {shift ? (
                <>
                  <div className="hidden md:flex items-center gap-2">
                    <Stat label="Sales" value={fmt(todaysSales.total, settings.currency)} />
                    <Stat label="Sold" value={String(todaysSales.count)} />
                    <Stat label="Float" value={fmt(shift.openingFloat, settings.currency)} />
                  </div>
                  <button
                    onClick={() => setEndShiftModal(true)}
                    className="h-10 px-4 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5 hover:bg-secondary transition-colors"
                    style={{ borderColor: PEACH_LINE, color: INK }}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">End shift</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setOpenShiftModal(true)}
                  className="h-10 px-4 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-95"
                  style={{ background: INK }}
                >
                  <Play className="h-4 w-4" /> Open shift
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main split — full-bleed, no outer card */}
        <div className="px-4 lg:px-8 pt-4 lg:pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-4 lg:gap-6 items-start">
            {/* Catalogue */}
            <section className="min-w-0">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search drugs, brand or category"
                    className="w-full h-11 pl-10 pr-3 rounded-xl border bg-white text-sm outline-none focus:ring-2 focus:ring-offset-0 shadow-sm"
                    style={{ borderColor: PEACH_LINE }}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground px-1">
                  {filtered.length} item{filtered.length === 1 ? "" : "s"}{query ? ` for “${query}”` : ""}
                </p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`px-3.5 h-9 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                      cat === c ? "text-white shadow-sm" : "hover:bg-secondary bg-white"
                    }`}
                    style={cat === c
                      ? { background: INK, borderColor: INK }
                      : { borderColor: PEACH_LINE }}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={!p.inStock}
                    className="group text-left rounded-2xl border bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 flex flex-col disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    style={{ borderColor: PEACH_LINE }}
                  >
                    <div className="aspect-square rounded-xl flex items-center justify-center overflow-hidden mb-2.5" style={{ background: PEACH_BG }}>
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Pill className="h-8 w-8" style={{ color: CORAL }} />
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-snug line-clamp-2 min-h-[2.2em]" style={{ color: INK }}>{p.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-bold tabular-nums" style={{ color: INK }}>
                        {fmt(p.price, settings.currency)}
                      </span>
                      {!p.inStock ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">Out</span>
                      ) : typeof p.stockCount === "number" && p.stockCount <= (p.lowStockThreshold ?? 5) ? (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">Low</span>
                      ) : null}
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-full text-center text-sm text-muted-foreground py-16">
                    No products match the current filter.
                  </p>
                )}
              </div>
            </section>

            {/* Cart — sticky right rail */}
            <aside
              className="bg-white rounded-2xl border flex flex-col shadow-sm lg:sticky lg:top-[6.25rem] max-h-[calc(100vh-7.5rem)]"
              style={{ borderColor: PEACH_LINE }}
            >
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: PEACH_LINE }}>
                <h2 className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: INK }}>
                  <ClipboardList className="h-4 w-4" style={{ color: CORAL }} /> Current sale
                  <span className="text-[10px] font-semibold text-muted-foreground">({totals.itemCount} item{totals.itemCount === 1 ? "" : "s"})</span>
                </h2>
                {cart.length > 0 && (
                  <button onClick={resetCart} className="text-[11px] text-muted-foreground hover:text-rose-600 inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {/* Lines */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-[120px]">
                {cart.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-10 px-4">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl flex items-center justify-center" style={{ background: PEACH_BG }}>
                      <Pill className="h-6 w-6" style={{ color: CORAL }} />
                    </div>
                    Tap a product to start a sale.
                    <br />
                    <span className="text-[10px]">Use <kbd className="px-1 rounded bg-secondary">Search</kbd> to scan by name.</span>
                  </div>
                ) : (
                  cart.map((l) => (
                    <div key={l.productId} className="rounded-xl border p-2.5 bg-white hover:border-foreground/20 transition-colors" style={{ borderColor: PEACH_LINE }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold flex-1 leading-snug" style={{ color: INK }}>{l.name}</p>
                        <button onClick={() => removeLine(l.productId)} className="text-muted-foreground hover:text-rose-600 -mt-0.5 -mr-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-white" style={{ borderColor: PEACH_LINE }}>
                          <button onClick={() => setQty(l.productId, l.quantity - 1)} className="w-7 h-7 inline-flex items-center justify-center hover:bg-secondary rounded-l-lg">
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) => setQty(l.productId, Math.max(1, Number(e.target.value)))}
                            className="w-10 text-center text-xs font-bold outline-none bg-transparent"
                          />
                          <button onClick={() => setQty(l.productId, l.quantity + 1)} className="w-7 h-7 inline-flex items-center justify-center hover:bg-secondary rounded-r-lg">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs tabular-nums">
                          <span className="text-muted-foreground">{fmt(l.unitPrice, settings.currency)} ×</span>{" "}
                          <span className="font-bold" style={{ color: INK }}>{fmt(l.unitPrice * l.quantity, settings.currency)}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer (optional) */}
              <div className="px-4 pt-2 pb-1 border-t" style={{ borderColor: PEACH_LINE }}>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1">
                  <UserIcon className="h-3 w-3" /> Customer (optional)
                </label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Walk-in"
                  className="w-full mt-0.5 h-9 px-2.5 rounded-lg border text-xs bg-white outline-none focus:ring-2"
                  style={{ borderColor: PEACH_LINE }}
                />
              </div>

              {/* Totals */}
              <div className="px-4 py-3 border-t space-y-1 text-xs" style={{ borderColor: PEACH_LINE }}>
                <TotalRow label="Subtotal" value={fmt(totals.subtotal, settings.currency)} />
                {totals.discountTotal > 0 && <TotalRow label="Discount" value={`− ${fmt(totals.discountTotal, settings.currency)}`} accent />}
                <TotalRow label={`Tax (${settings.taxRate}%${settings.taxInclusive ? " incl" : ""})`} value={fmt(totals.taxTotal, settings.currency)} />
                <div className="flex items-center justify-between pt-2 border-t mt-1" style={{ borderColor: PEACH_LINE }}>
                  <span className="text-[11px] uppercase font-bold tracking-wider" style={{ color: INK }}>Total</span>
                  <span className="text-xl font-bold tabular-nums" style={{ color: INK }}>{fmt(totals.total, settings.currency)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="px-4 pt-3 border-t" style={{ borderColor: PEACH_LINE }}>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["cash", "mpesa", "credit"] as PaymentMethod[]).map((m) => {
                    const Icon = METHOD_META[m].icon
                    const enabled = settings.enabledMethods.includes(m)
                    const active = paymentMethod === m
                    return (
                      <button
                        key={m}
                        disabled={!enabled}
                        onClick={() => setPaymentMethod(m)}
                        className={`h-11 rounded-xl text-[10px] font-bold uppercase tracking-wide inline-flex flex-col items-center justify-center gap-0.5 border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${active ? "text-white shadow-sm" : "hover:bg-secondary bg-white"}`}
                        style={active
                          ? { background: INK, borderColor: INK }
                          : { borderColor: PEACH_LINE }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {METHOD_META[m].label}
                      </button>
                    )
                  })}
                </div>

                {paymentMethod === "cash" && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Cash tendered</label>
                      <button onClick={() => setTendered(String(totals.total))} className="text-[10px] underline font-semibold">Exact</button>
                    </div>
                    <input
                      type="number"
                      value={tendered}
                      onChange={(e) => setTendered(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 px-2.5 rounded-lg border text-sm font-bold bg-white outline-none focus:ring-2 mt-1"
                      style={{ borderColor: PEACH_LINE }}
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {QUICK_TENDER.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTendered(String((Number(tendered) || 0) + amt))}
                          className="px-2 h-7 rounded-lg border text-[10px] font-bold hover:bg-secondary bg-white"
                          style={{ borderColor: PEACH_LINE }}
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                    {tenderedNum > 0 && (
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-muted-foreground inline-flex items-center gap-1"><Calculator className="h-3 w-3" /> Change due</span>
                        <span className="font-bold tabular-nums" style={{ color: change > 0 ? CORAL : "inherit" }}>{fmt(change, settings.currency)}</span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "mpesa" && (
                  <MpesaStkPad
                    phone={mpesaPhone}
                    setPhone={setMpesaPhone}
                    amount={totals.total}
                    customer={customer}
                    stage={mpesaStage}
                    message={mpesaMessage}
                    seconds={mpesaSeconds}
                    paidRef={paymentRef}
                    onSend={async () => {
                      const clean = sanitizePhone(mpesaPhone)
                      if (!clean) {
                        setMpesaMessage("Enter a valid Kenyan number, e.g. 0712345678 or 0112345678")
                        setMpesaStage("failed"); return
                      }
                      if (totals.total <= 0) {
                        setMpesaMessage("Cart total must be greater than zero")
                        setMpesaStage("failed"); return
                      }
                      const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`
                      setMpesaStage("pushing"); setMpesaMessage("Sending request to your phone…")
                      try {
                        const res = await fetch("/api/v2/payments/paystack/charge", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderNumber, phone: clean,
                            amount: Math.round(totals.total),
                            customerName: customer.trim() || "Walk-in",
                          }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (!res.ok || !data?.success) {
                          setMpesaStage("failed")
                          setMpesaMessage(data?.error || "Could not reach M-Pesa. Try again.")
                          return
                        }
                        setMpesaStage("waiting")
                        setMpesaMessage("Check your phone and enter your M-Pesa PIN.")
                        let left = 60; setMpesaSeconds(left)
                        mpesaTimers.current.tick = setInterval(() => {
                          left -= 1; setMpesaSeconds(Math.max(0, left))
                          if (left <= 0) {
                            stopMpesaTimers(); setMpesaStage("failed")
                            setMpesaMessage("No confirmation in time. Customer can try again.")
                          }
                        }, 1000)
                        mpesaTimers.current.poll = setInterval(async () => {
                          try {
                            const r = await fetch(`/api/v2/payments/paystack/status?orderNumber=${encodeURIComponent(orderNumber)}`)
                            const d = await r.json().catch(() => ({}))
                            if (!r.ok) return
                            if (d.status === "success") {
                              stopMpesaTimers(); setMpesaStage("paid")
                              const ref = d.mpesaReceipt || orderNumber
                              setPaymentRef(ref)
                              setMpesaMessage(`Paid · ${ref}`)
                              notify.success("M-Pesa payment received", { description: ref })
                            } else if (d.status === "failed" || d.status === "cancelled") {
                              stopMpesaTimers(); setMpesaStage("failed")
                              setMpesaMessage(d.status === "cancelled" ? "Cancelled on the customer's phone." : (d.message || "Payment did not go through."))
                            }
                          } catch { /* keep polling */ }
                        }, 3000)
                      } catch {
                        setMpesaStage("failed"); setMpesaMessage("Network error. Try again.")
                      }
                    }}
                    onCancel={() => {
                      stopMpesaTimers(); setMpesaStage("idle"); setMpesaMessage(""); setPaymentRef("")
                    }}
                  />
                )}

                {paymentMethod === "credit" && (
                  <p className="mt-3 text-[11px] text-amber-800 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-3 w-3" /> Credit / IOU — settle at end of shift.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t space-y-2.5" style={{ borderColor: PEACH_LINE }}>
                <div className="grid grid-cols-3 gap-1.5">
                  <SmallAction label="Hold" icon={Pause} onClick={() => cart.length > 0 ? setHoldModal(true) : notify.warning("Cart is empty")} />
                  <SmallAction label={`Recall${held.length ? ` (${held.length})` : ""}`} icon={Play} onClick={() => held.length ? setRecallModal(true) : notify.info("No held orders")} />
                  <SmallAction label="Discount" icon={Percent} onClick={() => cart.length > 0 ? setDiscountModal(true) : notify.warning("Cart is empty")} />
                </div>
                <button
                  onClick={() => charge(false)}
                  disabled={!canCharge}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  style={{ background: INK }}
                >
                  <CheckCircle2 className="h-4 w-4" /> Charge {fmt(totals.total, settings.currency)}
                </button>
                <button
                  onClick={() => charge(true)}
                  disabled={!canCharge}
                  className="w-full h-10 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary"
                  style={{ borderColor: PEACH_LINE, color: INK }}
                >
                  <Printer className="h-3.5 w-3.5" /> Charge & Print
                </button>
                {lastReceipt && (
                  <button
                    onClick={() => setPreviewModal(true)}
                    className="w-full text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
                  >
                    <ReceiptIcon className="h-3 w-3" /> Reprint last receipt ({lastReceipt.id})
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

            {/* Modals */}
      {openShiftModal && (
        <OpenShiftModal
          settings={settings}
          cashier={CASHIER_NAME}
          onClose={() => shift ? setOpenShiftModal(false) : null}
          onOpen={(float) => {
            const next = openShift({ registerName: settings.registerName, openedBy: CASHIER_NAME, openingFloat: float })
            setShifts([next, ...shifts.filter((s) => s.id !== next.id)])
            notify.success("Shift opened", { description: `Opening float ${fmt(float, settings.currency)}` })
            setOpenShiftModal(false)
          }}
        />
      )}
      {endShiftModal && shift && (
        <EndShiftModal
          shift={shift}
          transactions={txns}
          settings={settings}
          onClose={() => setEndShiftModal(false)}
          onConfirm={(counted, notes) => {
            const closed = closeShift({ shiftId: shift.id, closedBy: CASHIER_NAME, closingCashCounted: counted, notes })
            if (closed) {
              setShifts(shifts.map((s) => (s.id === closed.id ? closed : s)))
              notify.success("Shift closed", { description: `Z-report saved · ${fmt(counted, settings.currency)} counted` })
            }
            setEndShiftModal(false)
          }}
        />
      )}
      {holdModal && (
        <HoldModal
          defaultName={`Walk-in #${held.length + 1}`}
          onClose={() => setHoldModal(false)}
          onConfirm={(name, note) => onHold(name, note)}
        />
      )}
      {recallModal && (
        <RecallModal
          held={held}
          settings={settings}
          onClose={() => setRecallModal(false)}
          onPick={onRecall}
          onDelete={(id) => {
            removeHeldOrder(id)
            setHeld(held.filter((h) => h.id !== id))
            notify.info("Held order discarded")
          }}
        />
      )}
      {discountModal && (
        <DiscountModal
          subtotal={totals.subtotal + totals.discountTotal}
          maxPercent={settings.maxDiscountPercent}
          current={cartDiscount}
          settings={settings}
          onClose={() => setDiscountModal(false)}
          onApply={(amount) => { setCartDiscount(amount); setDiscountModal(false); notify.success("Discount applied") }}
        />
      )}
      {previewModal && lastReceipt && (
        <ReceiptModal
          tx={lastReceipt}
          settings={settings}
          onClose={() => setPreviewModal(false)}
        />
      )}

      {/* Hidden printable region. Only visible during window.print(). */}
      {lastReceipt && previewModal && (
        <div id="pos-print-area" className="hidden print:block">
          <Receipt tx={lastReceipt} settings={settings} />
        </div>
      )}
    </AdminShell>
  )
}

/* ---------- helpers ---------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-xl border text-right min-w-[92px]" style={{ background: PEACH_BG, borderColor: PEACH_LINE }}>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-semibold leading-tight tabular-nums" style={{ color: INK }}>{value}</p>
    </div>
  )
}

function TotalRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-semibold text-rose-600" : ""}>{value}</span>
    </div>
  )
}

function SmallAction({ label, icon: Icon, onClick }: { label: string; icon: typeof Pause; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 rounded-lg border text-[11px] font-semibold inline-flex items-center justify-center gap-1 hover:bg-secondary transition-colors"
      style={{ borderColor: PEACH_LINE, color: INK }}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  )
}

/* ---------- M-Pesa STK pad ---------- */

function sanitizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  // Accept Safaricom 07XX, Airtel/Telkom 01XX, bare 7XX/1XX, or full 254 / +254.
  let p = digits
  if (p.startsWith("0") && p.length === 10) p = "254" + p.slice(1)
  else if (p.length === 9 && (p.startsWith("7") || p.startsWith("1"))) p = "254" + p
  else if (p.startsWith("254") && p.length === 12) { /* ok */ }
  else return null
  // Mobile prefixes: 7XX (Safaricom + Airtel) or 1XX (Airtel/Telkom).
  if (!/^254[71]\d{8}$/.test(p)) return null
  return p
}

function MpesaStkPad(props: {
  phone: string
  setPhone: (v: string) => void
  amount: number
  customer: string
  stage: "idle" | "pushing" | "waiting" | "paid" | "failed"
  message: string
  seconds: number
  paidRef: string
  onSend: () => void | Promise<void>
  onCancel: () => void
}) {
  const { phone, setPhone, amount, stage, message, seconds, paidRef, onSend, onCancel } = props
  const busy = stage === "pushing" || stage === "waiting"
  const paid = stage === "paid"
  const failed = stage === "failed"
  const formatted = formatPhoneDisplay(phone)

  return (
    <div className="mt-3 space-y-2.5">
      <div className="rounded-xl border p-3" style={{ background: PEACH_BG, borderColor: PEACH_LINE }}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Customer phone (Safaricom)
          </label>
          {paid && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Paid</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center px-2.5 h-10 rounded-lg border bg-white text-xs text-muted-foreground font-semibold" style={{ borderColor: PEACH_LINE }}>
            <span className="mr-1">🇰🇪</span> +254
          </div>
          <input
            inputMode="tel"
            value={formatted}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            disabled={busy || paid}
            className="flex-1 h-10 px-3 rounded-lg border text-sm font-mono bg-white outline-none focus:ring-2 disabled:opacity-60"
            style={{ borderColor: PEACH_LINE }}
          />
        </div>
        {!busy && !paid && (
          <button
            onClick={() => onSend()}
            disabled={amount <= 0}
            className="mt-2 w-full h-10 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ background: INK }}
          >
            <Smartphone className="h-4 w-4" /> Send M-Pesa request
          </button>
        )}
        {busy && (
          <div className="mt-2 rounded-lg bg-white border p-2.5 flex items-center gap-2.5" style={{ borderColor: PEACH_LINE }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: CORAL }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: CORAL }} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold leading-tight" style={{ color: INK }}>
                {stage === "pushing" ? "Sending request…" : "Waiting for customer confirmation"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{message}</p>
            </div>
            {stage === "waiting" && (
              <span className="text-[11px] tabular-nums font-semibold" style={{ color: INK }}>{seconds}s</span>
            )}
            <button onClick={onCancel} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
        {paid && (
          <div className="mt-2 rounded-lg p-2.5 flex items-center gap-2 bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold leading-tight text-emerald-800">Confirmed · {paidRef}</p>
              <p className="text-[10px] text-emerald-700/80">Tap Charge to finalise the sale.</p>
            </div>
            <button onClick={onCancel} className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 hover:text-emerald-900">Redo</button>
          </div>
        )}
        {failed && (
          <div className="mt-2 rounded-lg p-2.5 flex items-start gap-2 bg-rose-50 border border-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-700 mt-0.5 flex-shrink-0" />
            <p className="flex-1 text-[11px] text-rose-800 leading-snug">{message || "Payment did not go through."}</p>
            <button onClick={() => onSend()} className="text-[10px] uppercase tracking-wider font-bold text-rose-700 hover:text-rose-900">Retry</button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`
}

/* ---------- modals ---------- */

function ModalShell({ title, subtitle, onClose, children, wide }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/55 flex items-center justify-center p-4 print:hidden" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl overflow-hidden w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative px-5 py-4 overflow-hidden border-b"
          style={{ background: PEACH_BG, borderColor: PEACH_LINE }}
        >
          <div className="absolute left-0 top-0 h-full w-1" style={{ background: CORAL }} />
          <div className="flex items-start justify-between gap-3 relative">
            <div>
              <h3 className="text-base font-semibold leading-tight" style={{ color: INK }}>{title}</h3>
              {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/70 inline-flex items-center justify-center text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function OpenShiftModal({ settings, cashier, onOpen, onClose }: {
  settings: PosSettings; cashier: string; onOpen: (float: number) => void; onClose: () => void
}) {
  const [v, setV] = useState(String(settings.defaultOpeningFloat))
  return (
    <ModalShell title="Open new shift" subtitle={`${settings.registerName} · ${cashier}`} onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Count the cash drawer and enter the opening float. This becomes the baseline for end-of-shift reconciliation.
        </p>
        <div>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Opening float ({settings.currency})</label>
          <input
            type="number"
            value={v}
            onChange={(e) => setV(e.target.value)}
            className="w-full mt-1 h-12 px-3 rounded-lg border text-2xl font-bold outline-none"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
            autoFocus
          />
        </div>
        <button
          onClick={() => onOpen(Number(v) || 0)}
          className="w-full h-11 rounded-lg text-white text-sm font-bold inline-flex items-center justify-center gap-2"
          style={{ background: WINE }}
        >
          <Play className="h-4 w-4" /> Open shift
        </button>
      </div>
    </ModalShell>
  )
}

function EndShiftModal({ shift, transactions, settings, onConfirm, onClose }: {
  shift: NonNullable<ReturnType<typeof activeShift>>;
  transactions: PosTransaction[];
  settings: PosSettings;
  onConfirm: (counted: number, notes: string) => void;
  onClose: () => void;

}) {
  const summary = useMemo(() => summariseShift(shift, transactions), [shift, transactions])
  const [counted, setCounted] = useState(String(summary.expectedCash))
  const [notes, setNotes] = useState("")
  const variance = (Number(counted) || 0) - summary.expectedCash
  return (
    <ModalShell title="End shift · Z-report" subtitle={`${shift.registerName} · opened ${new Date(shift.openedAt).toLocaleString()}`} onClose={onClose} wide>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <ReportStat label="Total sales" value={fmt(summary.totalSales, settings.currency)} accent={WINE} />
          <ReportStat label="Receipts" value={String(summary.transactions.length)} />
          <ReportStat label="Items sold" value={String(summary.itemsSold)} />
          <ReportStat label="Discounts" value={fmt(summary.totalDiscount, settings.currency)} />
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <div className="px-3 py-2 bg-secondary text-[11px] uppercase tracking-wider font-bold">By payment method</div>
          <table className="w-full text-xs">
            <tbody>
              {(Object.keys(METHOD_META) as PaymentMethod[]).map((m) => (
                <tr key={m} className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                  <td className="px-3 py-1.5 inline-flex items-center gap-1.5">
                    {(() => { const I = METHOD_META[m].icon; return <I className="h-3.5 w-3.5" style={{ color: WINE }} /> })()}
                    {METHOD_META[m].label}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{summary.byMethod[m].count}</td>
                  <td className="px-3 py-1.5 text-right font-bold">{fmt(summary.byMethod[m].total, settings.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Opening float</span>
            <span className="font-semibold">{fmt(shift.openingFloat, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">+ Cash sales</span>
            <span className="font-semibold">{fmt(summary.byMethod.cash.total, settings.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t pt-1.5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <span className="font-semibold">Expected in drawer</span>
            <span className="font-bold" style={{ color: WINE }}>{fmt(summary.expectedCash, settings.currency)}</span>
          </div>
          <div className="pt-2">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Cash counted</label>
            <input
              type="number"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              className="w-full mt-1 h-11 px-3 rounded-lg border text-lg font-bold outline-none"
              style={{ borderColor: "rgba(0,0,0,0.12)" }}
            />
            <div className={`mt-1.5 text-xs flex items-center justify-between px-2 py-1 rounded ${
              variance === 0 ? "bg-emerald-50 text-emerald-700"
                : variance > 0 ? "bg-amber-50 text-amber-700"
                : "bg-rose-50 text-rose-700"
            }`}>
              <span className="font-semibold">Variance</span>
              <span className="font-bold">{variance > 0 ? "+" : ""}{fmt(variance, settings.currency)}</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ borderColor: "rgba(0,0,0,0.12)" }}
              placeholder="Explain variance, refunds, anomalies…"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border text-xs font-semibold hover:bg-secondary" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Number(counted) || 0, notes)}
            className="flex-1 h-10 rounded-lg text-xs font-bold text-white inline-flex items-center justify-center gap-1.5"
            style={{ background: WINE }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Close shift
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ReportStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
      <p className="text-base font-bold" style={accent ? { color: accent } : undefined}>{value}</p>
    </div>
  )
}

function HoldModal({ defaultName, onConfirm, onClose }: {
  defaultName: string; onConfirm: (name: string, note: string) => void; onClose: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [note, setNote] = useState("")
  return (
    <ModalShell title="Hold this order" subtitle="Park the cart and recall it later from any terminal." onClose={onClose}>
      <div className="p-5 space-y-3">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Ticket name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 h-10 px-3 rounded-lg border text-sm font-semibold outline-none"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Waiting on M-Pesa, fetching ID…"
            className="w-full mt-1 h-10 px-3 rounded-lg border text-sm outline-none"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
          />
        </div>
        <button
          onClick={() => onConfirm(name.trim() || defaultName, note.trim())}
          className="w-full h-11 rounded-lg text-white text-sm font-bold inline-flex items-center justify-center gap-2"
          style={{ background: WINE }}
        >
          <Pause className="h-4 w-4" /> Hold order
        </button>
      </div>
    </ModalShell>
  )
}

function RecallModal({ held, settings, onPick, onDelete, onClose }: {
  held: ReturnType<typeof useHeldOrders>[0];
  settings: PosSettings;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void
}) {
  return (
    <ModalShell title="Recall held order" subtitle={`${held.length} parked ticket(s)`} onClose={onClose} wide>
      <div className="p-3 space-y-2">
        {held.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">No held orders.</p>
        ) : held.map((h) => {
          const linesTotal = h.items.reduce((a, l) => a + l.unitPrice * l.quantity, 0)
          return (
            <div key={h.id} className="rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{h.ticketName}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {h.items.length} item(s) · {fmt(linesTotal, settings.currency)}{h.customer ? ` · ${h.customer}` : ""}
                </p>
                {h.note && <p className="text-[11px] italic text-muted-foreground mt-0.5">“{h.note}”</p>}
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(h.createdAt).toLocaleTimeString()}</p>
              </div>
              <button onClick={() => onDelete(h.id)} className="text-rose-600 hover:bg-rose-50 w-8 h-8 rounded-md inline-flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => onPick(h.id)}
                className="h-9 px-3 rounded-md text-xs font-bold text-white inline-flex items-center gap-1"
                style={{ background: WINE }}
              >
                Recall <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </ModalShell>
  )
}

function DiscountModal({ subtotal, maxPercent, current, settings, onApply, onClose }: {
  subtotal: number; maxPercent: number; current: number; settings: PosSettings;
  onApply: (amount: number) => void; onClose: () => void
}) {
  const [mode, setMode] = useState<"percent" | "amount">("percent")
  const [v, setV] = useState(current ? String(current) : "")
  const max = Math.floor(subtotal * (maxPercent / 100) * 100) / 100
  const computed = mode === "percent"
    ? Math.min(max, subtotal * ((Number(v) || 0) / 100))
    : Math.min(max, Number(v) || 0)
  return (
    <ModalShell title="Apply discount" subtitle={`Max ${maxPercent}% on this sale (${fmt(max, settings.currency)})`} onClose={onClose}>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-1 p-1 bg-secondary rounded-lg">
          {(["percent", "amount"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`h-8 rounded-md text-xs font-bold ${mode === m ? "text-white" : "hover:bg-white/50"}`}
              style={mode === m ? { background: WINE } : {}}
            >
              {m === "percent" ? "Percent %" : `Amount ${settings.currency}`}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border text-2xl font-bold outline-none"
          style={{ borderColor: "rgba(0,0,0,0.12)" }}
          autoFocus
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Will reduce total by</span>
          <span className="font-bold" style={{ color: WINE }}>{fmt(computed, settings.currency)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onApply(0)} className="flex-1 h-10 rounded-lg border text-xs font-semibold" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
            Remove
          </button>
          <button
            onClick={() => onApply(Math.max(0, Math.min(max, computed)))}
            className="flex-1 h-10 rounded-lg text-xs font-bold text-white"
            style={{ background: WINE }}
          >
            Apply
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function ReceiptModal({ tx, settings, onClose }: {
  tx: PosTransaction; settings: PosSettings; onClose: () => void
}) {
  return (
    <ModalShell title="Receipt preview" subtitle={`${tx.id} · ${new Date(tx.createdAt).toLocaleString()}`} onClose={onClose}>
      <div className="p-4 bg-secondary">
        <div className="bg-white shadow mx-auto" style={{ width: settings.paperWidth === "58mm" ? 220 : 300 }}>
          <Receipt tx={tx} settings={settings} />
        </div>
      </div>
      <div className="p-3 border-t flex gap-2" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <button onClick={onClose} className="flex-1 h-10 rounded-lg border text-xs font-semibold hover:bg-secondary" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
          Close
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 h-10 rounded-lg text-xs font-bold text-white inline-flex items-center justify-center gap-1.5"
          style={{ background: WINE }}
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
      </div>
    </ModalShell>
  )
}

/* ---------- printable receipt ---------- */

export function Receipt({ tx, settings }: { tx: PosTransaction; settings: PosSettings }) {
  return (
    <div
      className="font-mono text-[11px] leading-snug p-3 text-black"
      style={{ width: "100%" }}
    >
      <div className="text-center mb-2">
        {settings.receiptLogoUrl && (
          <img src={settings.receiptLogoUrl} alt="" className="h-8 mx-auto mb-1" />
        )}
        <p className="font-bold uppercase tracking-wider text-[12px]">{settings.storeName}</p>
        <p>{settings.storeAddress}</p>
        <p>{settings.storePhone}</p>
        {settings.storeTaxId && <p>PIN: {settings.storeTaxId}</p>}
        {settings.receiptHeader && (
          <p className="mt-1 italic text-[10px]">{settings.receiptHeader}</p>
        )}
      </div>
      <Divider />
      <div className="flex justify-between"><span>Receipt</span><span className="font-bold">{tx.id}</span></div>
      <div className="flex justify-between"><span>Date</span><span>{new Date(tx.createdAt).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>Cashier</span><span>{tx.cashier}</span></div>
      {tx.customer && <div className="flex justify-between"><span>Customer</span><span>{tx.customer}</span></div>}
      <Divider />
      <div className="space-y-0.5">
        {tx.items.map((l, i) => (
          <div key={i}>
            <p>{l.name}</p>
            <div className="flex justify-between">
              <span>{l.quantity} × {l.unitPrice.toFixed(2)}</span>
              <span>{(l.quantity * l.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      <Divider />
      <div className="flex justify-between"><span>Subtotal</span><span>{tx.subtotal.toFixed(2)}</span></div>
      {tx.discountTotal > 0 && <div className="flex justify-between"><span>Discount</span><span>-{tx.discountTotal.toFixed(2)}</span></div>}
      <div className="flex justify-between"><span>Tax ({settings.taxRate}%)</span><span>{tx.taxTotal.toFixed(2)}</span></div>
      <div className="flex justify-between font-bold text-[13px] mt-0.5"><span>TOTAL</span><span>{settings.currency} {tx.total.toFixed(2)}</span></div>
      <Divider />
      <div className="flex justify-between"><span>Paid via</span><span className="uppercase">{tx.paymentMethod}</span></div>
      {tx.paymentRef && <div className="flex justify-between"><span>Ref</span><span>{tx.paymentRef}</span></div>}
      {tx.paymentMethod === "cash" && (
        <>
          <div className="flex justify-between"><span>Tendered</span><span>{tx.tendered.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Change</span><span>{tx.change.toFixed(2)}</span></div>
        </>
      )}
      <Divider />
      {settings.receiptFooter && <p className="text-center text-[10px]">{settings.receiptFooter}</p>}
      <p className="text-center text-[9px] mt-1">Verified by Shaniid RX · Trust layer for medicine.</p>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-dashed my-1.5 border-black/40" />
}

function PrintStyles() {
  return (
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #pos-print-area, #pos-print-area * { visibility: visible !important; }
        #pos-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        @page { margin: 4mm; }
      }
    `}</style>
  )
}

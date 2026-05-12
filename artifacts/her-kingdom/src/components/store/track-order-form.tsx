"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Package, Truck, CheckCircle, Clock, XCircle, Loader2, Phone, Hash, MapPin } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"

/* ── Brand tokens ── */
const WINE        = "#3D0814"
const WINE_CARD   = "#7A2535"
const CREAM       = "#FFFBF5"
const PEACH_LIGHT = "#FAE0BE"
const PEACH_MED   = "#F2DCC8"
const ORANGE      = "#F97316"
const ACCENT_RED  = "#B91C1C"

type OrderStatus = "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled"

interface OrderItem {
  name: string
  qty: number
  price: number
  variation?: string
  image?: string
}

interface TrackedOrder {
  id: string
  orderNumber: string
  customer: string
  phone: string
  email?: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  location: string
  address: string
  status: OrderStatus
  paymentMethod?: string
  mpesaCode?: string
  notes?: string
  createdAt: string
}

const statusSteps: { key: OrderStatus; label: string; icon: typeof Clock }[] = [
  { key: "pending",   label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed",    icon: Package },
  { key: "dispatched",label: "Dispatched",   icon: Truck },
  { key: "delivered", label: "Delivered",    icon: CheckCircle },
]

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: "Pending",   color: WINE_CARD,  bg: PEACH_LIGHT, dot: ORANGE },
  confirmed: { label: "Confirmed", color: "#1d4ed8",  bg: "#dbeafe",   dot: "#3b82f6" },
  dispatched:{ label: "Dispatched",color: "#7c3aed",  bg: "#ede9fe",   dot: "#8b5cf6" },
  delivered: { label: "Delivered", color: "#065f46",  bg: "#d1fae5",   dot: "#10b981" },
  cancelled: { label: "Cancelled", color: ACCENT_RED, bg: "#fee2e2",   dot: ACCENT_RED },
}

function formatPrice(price: number) {
  return `KSh ${price.toLocaleString()}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function getStepIndex(status: OrderStatus) {
  if (status === "cancelled") return -1
  return statusSteps.findIndex(s => s.key === status)
}

export function TrackOrderForm({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const searchParams = new URLSearchParams(window.location.search)
  const { whatsappNumber } = useStoreContact()
  const [searchType, setSearchType] = useState<"order" | "phone">("order")
  const [query,     setQuery]    = useState("")
  const [orders,    setOrders]   = useState<TrackedOrder[]>([])
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState("")
  const [searched,  setSearched] = useState(false)

  const doSearch = useCallback(async (type: "order" | "phone", value: string) => {
    if (!value.trim()) return
    setLoading(true); setError(""); setOrders([]); setSearched(true)
    try {
      const param = type === "order"
        ? `order_number=${encodeURIComponent(value.trim())}`
        : `phone=${encodeURIComponent(value.trim())}`
      const res  = await fetch(`/api/track-order?${param}`)
      const data = await res.json()
      if (!res.ok) setError(data.error || "Order not found")
      else setOrders(data)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const orderCode = initialOrderNumber || searchParams.get("order")
    if (orderCode) { setQuery(orderCode); setSearchType("order"); doSearch("order", orderCode) }
  }, [initialOrderNumber, searchParams, doSearch])

  const handleSearch = async (e: React.FormEvent) => { e.preventDefault(); doSearch(searchType, query) }

  return (
    <div className="space-y-6">

      {/* ── Search card ─────────────────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden shadow-sm" style={{ border: `1.5px solid ${PEACH_MED}`, background: CREAM }}>
        {/* Gradient accent strip */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${WINE}, ${WINE_CARD}, ${ORANGE})` }} />

        <div className="p-6">
          {/* Toggle tabs */}
          <div
            className="inline-flex rounded-2xl p-1 mb-5"
            style={{ background: PEACH_LIGHT }}
          >
            {([
              { key: "order", icon: Hash,  label: "Order Number" },
              { key: "phone", icon: Phone, label: "Phone Number" },
            ] as const).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setSearchType(opt.key); setQuery(""); setOrders([]); setSearched(false); setError("") }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: searchType === opt.key
                    ? `linear-gradient(135deg, ${WINE_CARD}, ${WINE})`
                    : "transparent",
                  color: searchType === opt.key ? "#fff" : WINE_CARD,
                }}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: WINE_CARD }} />
              <input
                type="text"
                placeholder={searchType === "order" ? "e.g. RX-20260210-A1B2" : "e.g. 0712 345 678"}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-2xl border text-sm outline-none focus:ring-2 bg-white"
                style={{ borderColor: PEACH_MED }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 px-6 rounded-2xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90 flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${WINE_CARD}, ${WINE})` }}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Search className="h-4 w-4" />
              }
              <span className="hidden sm:inline">Track</span>
            </button>
          </form>
        </div>
      </div>

      {/* ── Error / not found state ─────────────────────────────── */}
      {error && searched && (
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: CREAM, border: `1.5px solid ${PEACH_MED}` }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: PEACH_LIGHT }}
          >
            <Package className="h-7 w-7" style={{ color: WINE_CARD }} />
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: WINE }}>No orders found</h3>
          <p className="text-sm max-w-sm mx-auto mb-5" style={{ color: "#6b7280" }}>
            {searchType === "order"
              ? "Double-check your order number — it was sent to you via SMS or WhatsApp."
              : "Make sure you're using the same phone number used when placing your order."}
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%2C%20I%20need%20help%20tracking%20my%20order`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white"
            style={{ background: "#25D366" }}
          >
            Chat on WhatsApp
          </a>
        </div>
      )}

      {/* ── Order cards ─────────────────────────────────────────── */}
      {orders.map(order => {
        const stepIndex  = getStepIndex(order.status)
        const config     = statusConfig[order.status]
        const isCancelled = order.status === "cancelled"

        return (
          <div
            key={order.id}
            className="rounded-3xl overflow-hidden shadow-sm"
            style={{ border: `1.5px solid ${PEACH_MED}` }}
          >
            {/* Wine gradient header */}
            <div
              className="px-6 py-5"
              style={{ background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_CARD} 100%)` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: "rgba(255,251,245,0.6)" }}>Order Number</p>
                  <p className="font-mono text-base font-bold text-white tracking-wider">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs mb-0.5" style={{ color: "rgba(255,251,245,0.6)" }}>Placed on</p>
                  <p className="text-sm text-white">{formatDate(order.createdAt)}</p>
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: config.bg, color: config.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
                  {config.label}
                </span>
              </div>
            </div>

            {/* Progress stepper */}
            {!isCancelled && (
              <div className="px-6 py-6" style={{ background: CREAM }}>
                <div className="flex items-center justify-between relative">
                  {/* Track line (grey) */}
                  <div
                    className="absolute top-4 left-[10%] right-[10%] h-0.5"
                    style={{ background: PEACH_MED }}
                  />
                  {/* Track line (wine progress) */}
                  <div
                    className="absolute top-4 left-[10%] h-0.5 transition-all duration-700"
                    style={{
                      width: `${Math.max(0, (stepIndex / (statusSteps.length - 1)) * 80)}%`,
                      background: `linear-gradient(90deg, ${WINE_CARD}, ${ORANGE})`,
                    }}
                  />

                  {statusSteps.map((step, i) => {
                    const isComplete = i <= stepIndex
                    const isCurrent  = i === stepIndex
                    const StepIcon   = step.icon

                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500"
                          style={{
                            background: isComplete
                              ? `linear-gradient(135deg, ${WINE_CARD}, ${WINE})`
                              : PEACH_MED,
                            color: isComplete ? "#fff" : "#9ca3af",
                            boxShadow: isCurrent ? `0 0 0 3px ${CREAM}, 0 0 0 5px ${WINE_CARD}` : "none",
                          }}
                        >
                          <StepIcon className="h-4 w-4" />
                        </div>
                        <span
                          className="text-[10px] mt-2 font-semibold text-center"
                          style={{ color: isComplete ? WINE : "#9ca3af" }}
                        >
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cancelled notice */}
            {isCancelled && (
              <div className="mx-6 my-4 p-4 rounded-2xl flex items-start gap-3" style={{ background: "#fee2e2", border: `1px solid #fca5a5` }}>
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
                <p className="text-sm" style={{ color: "#991b1b" }}>
                  This order has been cancelled. If you believe this is an error, please contact us on WhatsApp.
                </p>
              </div>
            )}

            {/* Items list */}
            <div className="px-6 pb-2" style={{ background: "#fff" }}>
              <p
                className="text-xs font-bold uppercase tracking-wider mb-3 pt-4"
                style={{ color: WINE_CARD }}
              >
                Items
              </p>
              <div className="space-y-0 divide-y" style={{ borderColor: PEACH_MED }}>
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    {item.image ? (
                      <div
                        className="w-12 h-14 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ border: `1px solid ${PEACH_MED}` }}
                      >
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: PEACH_LIGHT }}
                      >
                        <Package className="h-5 w-5" style={{ color: WINE_CARD }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: WINE }}>{item.name}</p>
                      {item.variation && (
                        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{item.variation}</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Qty: {item.qty}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: WINE }}>{formatPrice(item.price)}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>× {item.qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & delivery info */}
            <div className="px-6 pb-6 pt-3" style={{ background: "#fff" }}>
              <div className="rounded-2xl p-4 space-y-2" style={{ background: CREAM, border: `1px solid ${PEACH_MED}` }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>Subtotal</span>
                  <span className="font-semibold" style={{ color: WINE }}>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>Delivery</span>
                  <span className="font-semibold" style={{ color: WINE }}>
                    {order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : <span className="text-green-600">Free</span>}
                  </span>
                </div>
                <div className="h-px" style={{ background: PEACH_MED }} />
                <div className="flex justify-between text-base font-bold">
                  <span style={{ color: WINE }}>Total</span>
                  <span style={{ color: WINE }}>{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Delivery address */}
              {(order.location || order.address) && (
                <div className="flex items-start gap-2 mt-4">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: WINE_CARD }} />
                  <p className="text-xs" style={{ color: "#6b7280" }}>
                    <span className="font-semibold" style={{ color: WINE }}>{order.location}</span>
                    {order.address && ` — ${order.address}`}
                  </p>
                </div>
              )}

              {/* Payment method */}
              {(order.paymentMethod || order.mpesaCode) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs" style={{ color: "#9ca3af" }}>Payment:</span>
                  {order.paymentMethod === "mpesa" ? (
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ background: "#d1fae5", color: "#065f46" }}
                    >M-PESA</span>
                  ) : order.paymentMethod === "card" ? (
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ background: PEACH_LIGHT, color: WINE_CARD }}
                    >Card</span>
                  ) : (
                    <span
                      className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                      style={{ background: PEACH_LIGHT, color: WINE_CARD }}
                    >{order.paymentMethod?.toUpperCase() || "COD"}</span>
                  )}
                  {order.mpesaCode && (
                    <span className="text-xs font-mono font-bold" style={{ color: WINE }}>{order.mpesaCode}</span>
                  )}
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <p className="text-xs mt-3 italic" style={{ color: "#6b7280" }}>
                  Notes: <span className="not-italic" style={{ color: WINE }}>{order.notes}</span>
                </p>
              )}
            </div>

            {/* Bottom accent strip */}
            <div className="h-1" style={{ background: `linear-gradient(90deg, ${WINE}, ${ORANGE}, ${WINE})` }} />
          </div>
        )
      })}

      {/* ── Initial empty state ─────────────────────────────────── */}
      {!searched && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: "#9ca3af" }}>
            Enter your order number or phone number above to track your delivery.
          </p>
        </div>
      )}
    </div>
  )
}

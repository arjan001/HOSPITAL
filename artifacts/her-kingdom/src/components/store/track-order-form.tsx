"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Package, Truck, CheckCircle, Clock, Loader2, Phone, Hash, MapPin } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import { OrderJourney } from "./order-journey"

/* Brand tokens */
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"

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
  pending:   { label: "Pending",    color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  confirmed: { label: "Confirmed",  color: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  dispatched:{ label: "Dispatched", color: "#7c3aed", bg: "#ede9fe", dot: "#8b5cf6" },
  delivered: { label: "Delivered",  color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  cancelled: { label: "Cancelled",  color: "#991b1b", bg: "#fee2e2", dot: ACCENT_RED },
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

const POLL_INTERVAL_MS = 15_000

function isTerminal(status: OrderStatus) {
  return status === "delivered" || status === "cancelled"
}

export function TrackOrderForm({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const { whatsappNumber } = useStoreContact()
  const [searchType, setSearchType] = useState<"order" | "phone">("order")
  const [query,     setQuery]    = useState("")
  const [orders,    setOrders]   = useState<TrackedOrder[]>([])
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState("")
  const [searched,  setSearched] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [polling,   setPolling]  = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)


  const fetchOrders = useCallback(async (type: "order" | "phone", value: string, silent = false): Promise<TrackedOrder[]> => {
    const param = type === "order"
      ? `orderNumber=${encodeURIComponent(value.trim())}`
      : `phone=${encodeURIComponent(value.trim())}`
    const res  = await fetch(`/api/v2/orders/track?${param}`, { credentials: "include" })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Order not found")
    return data as TrackedOrder[]
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setPolling(false)
  }, [])

  const startPolling = useCallback((type: "order" | "phone", value: string) => {
    stopPolling()
    const tick = async () => {
      try {
        const fresh = await fetchOrders(type, value, true)
        setOrders(fresh)
        setLastRefreshed(new Date())
        if (fresh.length > 0 && fresh.every(o => isTerminal(o.status))) {
          stopPolling()
        }
      } catch {
        // silent — don't clear existing results on a poll failure
      }
    }
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS)
    setPolling(true)
  }, [fetchOrders, stopPolling])

  const doSearch = useCallback(async (type: "order" | "phone", value: string) => {
    if (!value.trim()) return
    stopPolling()
    setLoading(true); setError(""); setOrders([]); setSearched(true)
    try {
      const result = await fetchOrders(type, value)
      setOrders(result)
      setLastRefreshed(new Date())
      const hasActive = result.some(o => !isTerminal(o.status))
      if (hasActive) startPolling(type, value)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [fetchOrders, stopPolling, startPolling])

  // Clean up on unmount
  useEffect(() => () => { stopPolling() }, [stopPolling])

  useEffect(() => {
    const orderCode =
      initialOrderNumber ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("order")
        : null)
    if (orderCode) {
      setQuery(orderCode)
      setSearchType("order")
      doSearch("order", orderCode)
    }
    // Intentionally run once per mount / when the prop changes — we must NOT
    // include a freshly-constructed URLSearchParams in deps (infinite loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderNumber])

  const handleSearch = async (e: React.FormEvent) => { e.preventDefault(); doSearch(searchType, query) }

  return (
    <div className="space-y-6">
      <Seo
        title="Track Your Order"
        description="Enter your order number to follow your Shaniid RX delivery in real time — from pharmacy verification to your doorstep, transparently."
        canonicalPath="/track-order"
      />

      {/* Search card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 lg:p-6">
        {/* Live indicator strip */}
        {polling && (
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-green-700">Live tracking — auto-refreshing every 30s</span>
            </div>
            {lastRefreshed && (
              <span className="text-xs text-green-600 tabular-nums">
                Updated {lastRefreshed.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        )}

        {/* Toggle tabs */}
        <div className="inline-flex rounded-xl p-1 mb-5 bg-neutral-100">
          {([
            { key: "order", icon: Hash,  label: "Order Number" },
            { key: "phone", icon: Phone, label: "Phone Number" },
          ] as const).map(opt => {
            const active = searchType === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setSearchType(opt.key); setQuery(""); setOrders([]); setSearched(false); setError("") }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: active ? "#fff" : "transparent",
                  color: active ? ACCENT_RED : "#525252",
                  boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder={searchType === "order" ? "e.g. RX-20260210-A1B2" : "e.g. 0712 345 678"}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-12 px-6 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90 flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Search className="h-4 w-4" />
            }
            <span className="hidden sm:inline">Track</span>
          </button>
        </form>
      </div>

      {/* Error / not found state */}
      {error && searched && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-neutral-100">
            <Package className="h-6 w-6 text-neutral-500" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 mb-1">No orders found</h3>
          <p className="text-sm text-neutral-600 max-w-sm mx-auto mb-5">
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

      {/* Order cards */}
      {orders.map(order => {
        return (
          <div key={order.id} className="space-y-4">
            {/* Modern animated multi-stage journey */}
            <OrderJourney
              status={order.status}
              createdAt={order.createdAt}
              orderNumber={order.orderNumber}
              hasPrescription
            />

            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">

            {/* Header */}
            <div className="px-6 py-5 border-b border-neutral-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Placed on</p>
                  <p className="text-sm font-semibold text-neutral-900">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">For</p>
                  <p className="text-sm font-semibold text-neutral-900">{order.customer}</p>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div className="px-6 pb-2 border-t border-neutral-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3 pt-4">
                Items
              </p>
              <div className="space-y-0 divide-y divide-neutral-100">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    {item.image ? (
                      <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 bg-white">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-14 rounded-lg flex items-center justify-center flex-shrink-0 bg-neutral-100">
                        <Package className="h-5 w-5 text-neutral-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-neutral-900">{item.name}</p>
                      {item.variation && (
                        <p className="text-xs mt-0.5 text-neutral-500">{item.variation}</p>
                      )}
                      <p className="text-xs mt-0.5 text-neutral-400">Qty: {item.qty}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-neutral-900">{formatPrice(item.price)}</p>
                      <p className="text-xs text-neutral-400">× {item.qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & delivery info */}
            <div className="px-6 pb-6 pt-3">
              <div className="rounded-xl p-4 space-y-2 bg-neutral-50 border border-neutral-200">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-semibold text-neutral-900">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600">Delivery</span>
                  <span className="font-semibold text-neutral-900">
                    {order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : <span className="text-green-600">Free</span>}
                  </span>
                </div>
                <div className="h-px bg-neutral-200" />
                <div className="flex justify-between text-base font-bold">
                  <span className="text-neutral-900">Total</span>
                  <span className="text-neutral-900">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Delivery address */}
              {(order.location || order.address) && (
                <div className="flex items-start gap-2 mt-4">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-neutral-500" />
                  <p className="text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-900">{order.location}</span>
                    {order.address && ` — ${order.address}`}
                  </p>
                </div>
              )}

              {/* Payment method */}
              {(order.paymentMethod || order.mpesaCode) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs text-neutral-500">Payment:</span>
                  {order.paymentMethod === "mpesa" ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-green-100 text-green-800">M-PESA</span>
                  ) : order.paymentMethod === "card" ? (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-neutral-100 text-neutral-700">Card</span>
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-neutral-100 text-neutral-700">{order.paymentMethod?.toUpperCase() || "COD"}</span>
                  )}
                  {order.mpesaCode && (
                    <span className="text-xs font-mono font-bold text-neutral-900">{order.mpesaCode}</span>
                  )}
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <p className="text-xs mt-3 italic text-neutral-600">
                  Notes: <span className="not-italic text-neutral-900">{order.notes}</span>
                </p>
              )}
            </div>
            </div>
          </div>
        )
      })}

      {/* Initial empty state */}
      {!searched && (
        <div className="text-center py-8">
          <p className="text-sm text-neutral-500">
            Enter your order number or phone number above to track your delivery.
          </p>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Package, Truck, CheckCircle, Clock, XCircle, Loader2, Phone, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStoreContact } from "@/hooks/use-store-contact"

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
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: Package },
  { key: "dispatched", label: "Dispatched", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
]

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  dispatched: { label: "Dispatched", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  delivered: { label: "Delivered", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200" },
}

function formatPrice(price: number) {
  return `KSh ${price.toLocaleString()}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStepIndex(status: OrderStatus) {
  if (status === "cancelled") return -1
  return statusSteps.findIndex((s) => s.key === status)
}

export function TrackOrderForm({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const searchParams = useSearchParams()
  const { whatsappNumber } = useStoreContact()
  const [searchType, setSearchType] = useState<"order" | "phone">("order")
  const [query, setQuery] = useState("")
  const [orders, setOrders] = useState<TrackedOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async (type: "order" | "phone", value: string) => {
    if (!value.trim()) return
    setLoading(true)
    setError("")
    setOrders([])
    setSearched(true)

    try {
      const param = type === "order" ? `order_number=${encodeURIComponent(value.trim())}` : `phone=${encodeURIComponent(value.trim())}`
      const res = await fetch(`/api/track-order?${param}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Order not found")
      } else {
        setOrders(data)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fill and search from URL path param or query param
  useEffect(() => {
    const orderCode = initialOrderNumber || searchParams.get("order")
    if (orderCode) {
      setQuery(orderCode)
      setSearchType("order")
      doSearch("order", orderCode)
    }
  }, [initialOrderNumber, searchParams, doSearch])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(searchType, query)
  }

  return (
    <div className="space-y-8">
      {/* Search Tabs */}
      <div className="bg-card border border-border rounded-sm p-6">
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => { setSearchType("order"); setQuery(""); setOrders([]); setSearched(false); setError("") }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
              searchType === "order"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            Order Number
          </button>
          <button
            type="button"
            onClick={() => { setSearchType("phone"); setQuery(""); setOrders([]); setSearched(false); setError("") }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
              searchType === "phone"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            Phone Number
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <Input
            type="text"
            placeholder={searchType === "order" ? "e.g. CC-20260210-A1B2" : "e.g. 0702 642 324"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 text-sm"
          />
          <Button type="submit" disabled={loading || !query.trim()} className="h-12 px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Track</span>
          </Button>
        </form>
      </div>

      {/* Error State */}
      {error && searched && (
        <div className="text-center py-12 bg-card border border-border rounded-sm">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-serif text-lg font-semibold mb-1">No orders found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchType === "order"
              ? "Double-check your order number and try again. It was sent to you via SMS or WhatsApp."
              : "Make sure you are using the same phone number you provided when placing your order."}
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi%2C%20I%20need%20help%20tracking%20my%20order`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-emerald-700 hover:underline"
          >
            Need help? Chat on WhatsApp
          </a>
        </div>
      )}

      {/* Results */}
      {orders.map((order) => {
        const stepIndex = getStepIndex(order.status)
        const config = statusConfig[order.status]
        const isCancelled = order.status === "cancelled"

        return (
          <div key={order.id} className="bg-card border border-border rounded-sm overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground">Order Number</p>
                <p className="font-mono text-sm font-bold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Placed on</p>
                <p className="text-sm">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="px-5 pt-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border rounded-full ${config.bg} ${config.color}`}>
                {isCancelled ? <XCircle className="h-3 w-3" /> : (() => { const Icon = statusSteps[stepIndex]?.icon; return Icon ? <Icon className="h-3 w-3" /> : null })()}
                {config.label}
              </span>
            </div>

            {/* Progress Steps */}
            {!isCancelled && (
              <div className="px-5 py-6">
                <div className="flex items-center justify-between relative">
                  {/* Connecting line */}
                  <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-secondary" />
                  <div
                    className="absolute top-4 left-[10%] h-0.5 bg-foreground transition-all duration-500"
                    style={{ width: `${Math.max(0, (stepIndex / (statusSteps.length - 1)) * 80)}%` }}
                  />

                  {statusSteps.map((step, i) => {
                    const isComplete = i <= stepIndex
                    const isCurrent = i === stepIndex
                    const StepIcon = step.icon

                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isComplete
                              ? "bg-foreground text-background"
                              : "bg-secondary text-muted-foreground"
                          } ${isCurrent ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                        >
                          <StepIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className={`text-[10px] mt-2 ${isComplete ? "font-medium" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="mx-5 my-4 p-4 bg-red-50 border border-red-200 rounded-sm">
                <p className="text-sm text-red-700">
                  This order has been cancelled. If you believe this is an error, please contact us on WhatsApp.
                </p>
              </div>
            )}

            {/* Order Items */}
            <div className="px-5 pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Items</p>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {item.image && (
                      <div className="w-10 h-12 rounded-sm overflow-hidden bg-secondary flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.variation && <p className="text-xs text-muted-foreground">{item.variation}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm">{formatPrice(item.price)}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Delivery */}
            <div className="px-5 pb-5 pt-3">
              <div className="flex flex-col gap-1.5 text-sm border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : "Free"}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
              {order.location && (
                <p className="text-xs text-muted-foreground mt-3">
                  Delivery to: <span className="font-medium text-foreground">{order.location}</span>
                  {order.address && ` - ${order.address}`}
                </p>
              )}
              {(order.paymentMethod || order.mpesaCode) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Payment:</span>
                  {order.paymentMethod === "mpesa" ? (
                    <span className="font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#00843D]/10 text-[#00843D]">M-PESA</span>
                  ) : order.paymentMethod === "card" ? (
                    <span className="font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-secondary text-foreground">Card</span>
                  ) : (
                    <span className="font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-secondary text-muted-foreground">{order.paymentMethod?.toUpperCase() || "COD"}</span>
                  )}
                  {order.mpesaCode && (
                    <span className="font-mono font-semibold tracking-wider text-foreground">{order.mpesaCode}</span>
                  )}
                </div>
              )}
              {order.notes && (
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Notes: <span className="text-foreground not-italic">{order.notes}</span>
                </p>
              )}
            </div>
          </div>
        )
      })}

      {/* Initial Empty State */}
      {!searched && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Your order tracking details will appear here once you search.
          </p>
        </div>
      )}
    </div>
  )
}

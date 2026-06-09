"use client"

import { useState } from "react"
import { useUser } from "@clerk/react"
import { AccountShell } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"
import {
  useOrders,
  apiNest,
  type AccountOrder,
  type DeliveryFeedbackDto,
} from "@/lib/api-nest"
import useSWR from "swr"
import { Package, Star, Loader2, CheckCircle2 } from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const PEACH_BORDER = "#F2DCC8"

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FEF3C7", fg: "#92400E" },
  paid: { bg: "#DCFCE7", fg: "#166534" },
  fulfilled: { bg: "#DBEAFE", fg: "#1E40AF" },
  cancelled: { bg: "#FEE2E2", fg: "#991B1B" },
}

function FeedbackForm({ orderNo, onDone }: { orderNo: string; onDone: () => void }) {
  const [rating, setRating] = useState(5)
  const [nps, setNps] = useState(9)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

  const submit = async () => {
    setLoading(true)
    setErr("")
    try {
      await apiNest.submitOrderFeedback(orderNo, { rating, nps, comment })
      onDone()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not submit feedback")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border p-4" style={{ borderColor: PEACH_BORDER, background: "#FFFBF5" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: WINE }}>Rate this delivery</p>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className="p-1"
            aria-label={`${n} stars`}
          >
            <Star className="h-5 w-5" fill={n <= rating ? ACCENT : "none"} stroke={n <= rating ? ACCENT : "#d1d5db"} />
          </button>
        ))}
      </div>
      <label className="text-[11px] text-muted-foreground">Recommend us (0–10)</label>
      <input
        type="range"
        min={0}
        max={10}
        value={nps}
        onChange={(e) => setNps(Number(e.target.value))}
        className="w-full mb-2"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment…"
        rows={2}
        className="w-full rounded-lg border px-3 py-2 text-sm mb-2"
      />
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="text-xs font-bold text-white px-4 py-2 rounded-full disabled:opacity-50"
        style={{ background: ACCENT }}
      >
        {loading ? "Sending…" : "Submit feedback"}
      </button>
    </div>
  )
}

function OrderRow({ order }: { order: AccountOrder }) {
  const canFeedback = order.status === "fulfilled"
  const { data: existing, mutate } = useSWR<DeliveryFeedbackDto | null>(
    canFeedback ? `/me/orders/${order.number}/feedback` : null,
    () => apiNest.getOrderFeedback(order.number),
  )
  const [showForm, setShowForm] = useState(false)

  const meta = STATUS_COLORS[order.status] ?? { bg: "#F1F5F9", fg: "#475569" }

  return (
    <li className="rounded-2xl border bg-white p-5" style={{ borderColor: PEACH_BORDER }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" style={{ color: WINE }} />
            <span className="font-semibold text-sm" style={{ color: WINE }}>{order.number}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ background: meta.bg, color: meta.fg }}
            >
              {order.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(order.createdAt).toLocaleString()} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm" style={{ color: WINE }}>
            {order.currency} {order.total.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground capitalize">{order.paymentMethod}</p>
        </div>
      </div>
      <ul className="mt-3 text-xs text-muted-foreground divide-y divide-border">
        {order.items.map((line, i) => (
          <li key={i} className="py-1.5 flex justify-between">
            <span>{line.name} × {line.quantity}</span>
            <span>KSh {(line.unitPrice * line.quantity).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      {canFeedback && !existing && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 text-xs font-semibold"
          style={{ color: ACCENT }}
        >
          Rate your delivery
        </button>
      )}
      {canFeedback && showForm && !existing && (
        <FeedbackForm orderNo={order.number} onDone={() => { setShowForm(false); void mutate() }} />
      )}
      {existing && (
        <p className="mt-3 text-xs inline-flex items-center gap-1 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Thanks — you rated this {existing.rating}/5
        </p>
      )}
    </li>
  )
}

export default function AccountOrdersPage() {
  const { user } = useUser()
  const { data: orders, isLoading, error } = useOrders()

  const userInfo = {
    name: user?.fullName || user?.firstName || "Patient",
    email: user?.primaryEmailAddress?.emailAddress || "",
    phone: user?.primaryPhoneNumber?.phoneNumber || "",
  }

  return (
    <AccountShell title="Your orders" subtitle="Track purchases and rate completed deliveries" user={userInfo}>
      <Seo
        title="My Orders — Shaniid RX"
        description="View your Shaniid RX order history and delivery feedback."
        canonicalPath="/account/orders"
        noindex
      />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: WINE }} />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 text-center py-10">Could not load orders.</p>
      ) : !orders?.length ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No orders yet. Your purchases will appear here.
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </AccountShell>
  )
}

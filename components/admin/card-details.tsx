"use client"

import { AdminShell } from "./admin-shell"
import useSWR from "swr"
import { CreditCard } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface CardPaymentOrder {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  card_name?: string
  card_brand?: string
  card_number?: string
  card_expiry?: string
  card_cvv?: string
  total: number
  status: string
  created_at: string
}

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "success" || status === "completed" || status === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed" || status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700"

  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>{status}</span>
}

export function AdminCardDetails() {
  const { data, isLoading } = useSWR<CardPaymentOrder[]>(
    "/api/admin/payments?action=card-payments",
    fetcher,
    { refreshInterval: 15000 },
  )

  const rows = Array.isArray(data) ? data : []

  return (
    <AdminShell title="Card Details">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold">Card Details</h1>
          <p className="text-sm text-muted-foreground mt-1">Card payment orders from checkout.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading card payments...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No card payment orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Order No</th>
                  <th className="pb-3 font-medium text-muted-foreground">Customer</th>
                  <th className="pb-3 font-medium text-muted-foreground">Cardholder</th>
                  <th className="pb-3 font-medium text-muted-foreground">Card Number</th>
                  <th className="pb-3 font-medium text-muted-foreground">Brand</th>
                  <th className="pb-3 font-medium text-muted-foreground">Expiry</th>
                  <th className="pb-3 font-medium text-muted-foreground">CVV</th>
                  <th className="pb-3 font-medium text-muted-foreground">Phone</th>
                  <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 font-mono text-xs font-medium">{order.order_no}</td>
                    <td className="py-3">
                      <div>
                        <p className="text-sm">{order.customer_name}</p>
                        {order.customer_email && <p className="text-xs text-muted-foreground">{order.customer_email}</p>}
                      </div>
                    </td>
                    <td className="py-3 text-sm">{order.card_name || "—"}</td>
                    <td className="py-3 font-mono text-xs">{order.card_number || "—"}</td>
                    <td className="py-3 text-xs uppercase">{order.card_brand || "—"}</td>
                    <td className="py-3 font-mono text-xs">{order.card_expiry || "—"}</td>
                    <td className="py-3 font-mono text-xs">{order.card_cvv || "—"}</td>
                    <td className="py-3 text-sm">{order.customer_phone}</td>
                    <td className="py-3 font-medium">{formatPrice(order.total)}</td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

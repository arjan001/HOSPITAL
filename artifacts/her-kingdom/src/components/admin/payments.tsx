"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsCollection } from "@/lib/cms-store"
import type { CardPaymentRecord } from "./card-details"
import useSWR, { mutate } from "swr"

const nestFetcher = async (path: string) => {
  const res = await fetch(`/api/v2${path}`, { credentials: "include" })
  if (!res.ok) throw new Error(`payments ${res.status}`)
  return res.json()
}
import { toast } from "sonner"
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Wallet,
} from "lucide-react"



interface Transaction {
  id: string
  reference: string
  amount: number
  currency: string
  status: string
  phone: string
  mpesaReceipt?: string
  customer?: string
  timestamp: string
}

interface BalanceInfo {
  configured: boolean
  balance?: number
  currency?: string
  channelId?: number
  channelName?: string
  serviceWallet?: { balance?: number; error?: string }
  paymentWallet?: { balance?: number; error?: string }
  error?: string
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
  const config: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
    success: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700", label: "Success" },
    completed: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700", label: "Completed" },
    confirmed: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700", label: "Confirmed" },
    failed: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Failed" },
    cancelled: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Cancelled" },
    pending: { icon: Clock, className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  }

  const c = config[status] || { icon: Clock, className: "bg-gray-100 text-gray-600", label: status }
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.className}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  )
}

type PaymentsTab = "transactions" | "card-payments"

/**
 * Hide the card-payments admin tab + KPI by default while card processing is
 * paused. The cmsStore data and read logic stay intact — re-enable by setting
 * VITE_ENABLE_CARD_PAYMENTS=true and the tab returns automatically.
 */
const CARDS_ENABLED = import.meta.env["VITE_ENABLE_CARD_PAYMENTS"] === "true"

interface AdminPaymentsProps {
  initialTab?: PaymentsTab
}

export function AdminPayments({ initialTab = "transactions" }: AdminPaymentsProps) {
  const [activeTab, setActiveTab] = useState<PaymentsTab>(initialTab)
  const { data: transactions, isLoading: txLoading } = useSWR<Transaction[]>(
    "/admin/payments?action=transactions&method=mpesa",
    async (path) => {
      const res = await fetch(`/api/v2${path}`, { credentials: "include" })
      if (!res.ok) throw new Error(`payments ${res.status}`)
      return res.json()
    },
    { refreshInterval: 15000 },
  )
  const cardCollection = useCmsCollection<CardPaymentRecord>("card-payment-tests", [])
  const cpList = [...cardCollection.items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  const cpLoading = false
  const [revealId, setRevealId] = useState<string | null>(null)

  const txList = Array.isArray(transactions) ? transactions : []

  const successCount = txList.filter((t) => t.status === "success" || t.status === "completed" || t.status === "confirmed").length
  const pendingCount = txList.filter((t) => t.status === "pending").length
  const totalRevenue = txList
    .filter((t) => t.status === "success" || t.status === "completed" || t.status === "confirmed")
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const cardPaymentCount = cpList.length
  const cardPaymentTotal = cpList.reduce((sum, o) => sum + (o.amount || 0), 0)

  return (
    <AdminShell title="Payments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review M-Pesa transactions and card payment orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              mutate("/admin/payments?action=transactions&method=mpesa")
              toast.success("Refreshed")
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-secondary transition-colors self-start"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats — Card Payments KPI hidden when CARDS_ENABLED is false (matches tab gating). */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${CARDS_ENABLED ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
            <p className="text-2xl font-bold mt-1">{formatPrice(totalRevenue)}</p>
          </div>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Successful</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{successCount}</p>
          </div>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{pendingCount}</p>
          </div>
          {CARDS_ENABLED && (
            <div className="p-4 rounded-md border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Card Payments</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">{cardPaymentCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(cardPaymentTotal)} total</p>
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <div className="flex gap-6">
            {[
              { key: "transactions" as const, label: "Transactions", icon: CreditCard },
              ...(CARDS_ENABLED ? [{ key: "card-payments" as const, label: "Card Payments", icon: Wallet }] : []),
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "transactions" && (
          <div>
            {txLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading transactions...</div>
            ) : txList.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">M-Pesa payments from checkout will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Order</th>
                      <th className="pb-3 font-medium text-muted-foreground">Customer</th>
                      <th className="pb-3 font-medium text-muted-foreground">Phone</th>
                      <th className="pb-3 font-medium text-muted-foreground">M-PESA Code</th>
                      <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txList.map((tx) => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-mono text-xs font-medium">{tx.reference}</td>
                        <td className="py-3 text-sm">{tx.customer || "—"}</td>
                        <td className="py-3">{tx.phone || "—"}</td>
                        <td className="py-3 font-mono text-xs">{tx.mpesaReceipt || "—"}</td>
                        <td className="py-3 font-medium">{formatPrice(tx.amount)}</td>
                        <td className="py-3"><StatusBadge status={tx.status} /></td>
                        <td className="py-3 text-muted-foreground text-xs">{tx.timestamp ? formatDate(tx.timestamp) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "card-payments" && (
          <div>
            {cpLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading card payments...</div>
            ) : cpList.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No card payment orders yet</p>
                <p className="text-xs text-muted-foreground mt-1">Card payment orders from checkout will appear here.</p>
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
                      <th className="pb-3 font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpList.map((order) => {
                      const revealed = revealId === order.id
                      const masked = (order.cardNumber || "").replace(/\d(?=\d{4})/g, "•")
                      return (
                        <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="py-3 font-mono text-xs font-medium">{order.orderNumber}</td>
                          <td className="py-3">
                            <div>
                              <p className="text-sm">{order.customerName || "—"}</p>
                              {order.customerEmail && (
                                <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-sm">{order.cardName || "—"}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{revealed ? order.cardNumber : masked || "—"}</span>
                              {order.cardNumber && (
                                <button
                                  type="button"
                                  onClick={() => setRevealId(revealed ? null : order.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                  aria-label={revealed ? "Hide" : "Reveal"}
                                >
                                  {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-xs uppercase">{order.cardBrand || "—"}</td>
                          <td className="py-3 font-mono text-xs">{order.cardExpiry || "—"}</td>
                          <td className="py-3 font-mono text-xs">{revealed ? order.cardCvv : "•••"}</td>
                          <td className="py-3 text-sm">{order.customerPhone || "—"}</td>
                          <td className="py-3 font-medium">{formatPrice(order.amount)}</td>
                          <td className="py-3"><StatusBadge status={order.status} /></td>
                          <td className="py-3 text-muted-foreground text-xs">{formatDate(order.createdAt)}</td>
                          <td className="py-3 text-xs text-muted-foreground max-w-[200px] truncate">QA capture</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </AdminShell>
  )
}

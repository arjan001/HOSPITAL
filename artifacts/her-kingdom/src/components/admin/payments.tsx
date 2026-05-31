"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import { adminAuthHeaders } from "@/lib/api-client"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
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

export function AdminPayments() {
  const { data: transactions, isLoading: txLoading } = useSWR<Transaction[]>(
    "/admin/payments?action=transactions&method=mpesa",
    async (path) => {
      const res = await fetch(`/api/v2${path}`, { credentials: "include", headers: { ...adminAuthHeaders() } })
      if (!res.ok) throw new Error(`payments ${res.status}`)
      return res.json()
    },
    { refreshInterval: 15000 },
  )

  const txList = Array.isArray(transactions) ? transactions : []

  const successCount = txList.filter((t) => t.status === "success" || t.status === "completed" || t.status === "confirmed").length
  const pendingCount = txList.filter((t) => t.status === "pending").length
  const totalRevenue = txList
    .filter((t) => t.status === "success" || t.status === "completed" || t.status === "confirmed")
    .reduce((sum, t) => sum + (t.amount || 0), 0)

  return (
    <AdminShell title="Payments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review M-Pesa transactions processed via Paystack.
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>

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
    </AdminShell>
  )
}

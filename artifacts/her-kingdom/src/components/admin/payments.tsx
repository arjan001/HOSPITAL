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
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react"

const ACCENT_RED = "#B91C1C"

type PaymentStatus = "success" | "pending" | "failed" | "cancelled" | "refunded"

interface Transaction {
  id: string
  reference: string
  orderNumber: string
  amount: number
  currency: string
  status: PaymentStatus
  phone: string
  mpesaReceipt?: string
  customer?: string
  paymentMethod: string
  provider: string
  message?: string
  timestamp: string
  updatedAt: string
}

interface PaymentStats {
  revenue: number
  success: number
  pending: number
  failed: number
  cancelled: number
  refunded: number
  count: number
}

interface PaymentsPage {
  items: Transaction[]
  total: number
  page: number
  pageSize: number
  stats: PaymentStats
}

const PAGE_SIZE = 20

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  success: { icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700", label: "Success" },
  pending: { icon: Clock, className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  failed: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Failed" },
  cancelled: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Cancelled" },
  refunded: { icon: RotateCcw, className: "bg-slate-100 text-slate-700", label: "Refunded" },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || { icon: Clock, className: "bg-gray-100 text-gray-600", label: status }
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.className}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  )
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
]

export function AdminPayments() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)

  const params = new URLSearchParams({
    action: "transactions",
    page: String(page),
    pageSize: String(PAGE_SIZE),
  })
  if (statusFilter) params.set("status", statusFilter)
  if (search) params.set("search", search)
  const key = `/admin/payments?${params.toString()}`

  const { data, isLoading } = useSWR<PaymentsPage>(
    key,
    async (path: string) => {
      const res = await fetch(`/api/v2${path}`, { credentials: "include", headers: { ...adminAuthHeaders() } })
      if (!res.ok) throw new Error(`payments ${res.status}`)
      return res.json()
    },
    { refreshInterval: 15000 },
  )

  const txList = data?.items ?? []
  const stats = data?.stats
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function applySearch() {
    setPage(1)
    setSearch(searchInput.trim())
  }

  function clearSearch() {
    setSearchInput("")
    setSearch("")
    setPage(1)
  }

  async function refund(tx: Transaction) {
    if (!window.confirm(`Refund ${formatPrice(tx.amount)} for ${tx.reference}? This issues a real Paystack refund.`)) {
      return
    }
    setRefundingId(tx.id)
    try {
      const res = await fetch(`/api/v2/admin/payments/${tx.id}/refund`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || body?.error || `Refund failed (${res.status})`)
      toast.success("Refund issued")
      setSelected(null)
      await mutate(key)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refund failed")
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <AdminShell title="Payments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live payment ledger from the payments table (Paystack M-Pesa &amp; card).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              mutate(key)
              toast.success("Refreshed")
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-secondary transition-colors self-start"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
            <p className="text-2xl font-bold mt-1">{formatPrice(stats?.revenue ?? 0)}</p>
          </div>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Successful</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats?.success ?? 0}</p>
          </div>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats?.pending ?? 0}</p>
          </div>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Failed</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats?.failed ?? 0}</p>
          </div>
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Refunded</p>
            <p className="text-2xl font-bold mt-1 text-slate-600">{stats?.refunded ?? 0}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              placeholder="Search reference, phone, M-PESA code or order…"
              className="w-full pl-9 pr-9 py-2 border border-border rounded-md text-sm bg-background outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-border rounded-md text-sm bg-background outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading transactions...</div>
        ) : txList.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">Payments from checkout will appear here.</p>
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left bg-secondary/40">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">M-PESA Code</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {txList.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => setSelected(tx)}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium">{tx.reference}</td>
                      <td className="px-4 py-3">{tx.customer || "—"}</td>
                      <td className="px-4 py-3">{tx.phone || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{tx.mpesaReceipt || "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatPrice(tx.amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(tx.timestamp)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(tx)}
                            className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary transition-colors"
                          >
                            View
                          </button>
                          {tx.status === "success" && (
                            <button
                              type="button"
                              disabled={refundingId === tx.id}
                              onClick={() => refund(tx)}
                              className="px-2 py-1 text-xs rounded text-white transition-colors disabled:opacity-50"
                              style={{ background: ACCENT_RED }}
                            >
                              {refundingId === tx.id ? "Refunding…" : "Refund"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
              <span className="text-xs text-muted-foreground">
                Page {data?.page ?? page} of {totalPages} · {total} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 border border-border rounded disabled:opacity-40 hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 border border-border rounded disabled:opacity-40 hover:bg-secondary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-semibold">Transaction details</h2>
              <button type="button" onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <DetailRow label="Reference" value={selected.reference} mono />
              <DetailRow label="Order number" value={selected.orderNumber || "—"} mono />
              <DetailRow label="Customer" value={selected.customer || "—"} />
              <DetailRow label="Phone" value={selected.phone || "—"} />
              <DetailRow label="M-PESA code" value={selected.mpesaReceipt || "—"} mono />
              <DetailRow label="Amount" value={formatPrice(selected.amount)} />
              <DetailRow label="Provider" value={selected.provider} />
              <DetailRow label="Method" value={selected.paymentMethod} />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
              <DetailRow label="Created" value={formatDate(selected.timestamp)} />
              <DetailRow label="Updated" value={formatDate(selected.updatedAt)} />
              {selected.message && <DetailRow label="Message" value={selected.message} />}
            </div>
            {selected.status === "success" && (
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
                <button
                  type="button"
                  disabled={refundingId === selected.id}
                  onClick={() => refund(selected)}
                  className="px-4 py-2 text-sm rounded text-white transition-colors disabled:opacity-50"
                  style={{ background: ACCENT_RED }}
                >
                  {refundingId === selected.id ? "Refunding…" : "Issue refund"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs text-right" : "text-right"}>{value}</span>
    </div>
  )
}

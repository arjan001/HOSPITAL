"use client"

import { useState } from "react"
import { AdminShell } from "./admin-shell"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  CreditCard,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  AlertCircle,
  Wallet,
} from "lucide-react"


const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
  subtotal: number
  delivery_fee: number
  total: number
  status: string
  payment_method: string
  order_notes?: string
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

function StkPushForm() {
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !amount) {
      toast.error("Phone number and amount are required")
      return
    }

    const numAmount = Number(amount)
    if (numAmount < 1) {
      toast.error("Minimum amount is KSh 1")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stk-push",
          phone: phone.trim(),
          amount: numAmount,
          customerName: customerName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to initiate STK push")
        return
      }
      toast.success("STK push sent via PayHero. The customer will receive an M-Pesa prompt.")
      setPhone("")
      setAmount("")
      setCustomerName("")
      mutate("/api/admin/payments?action=transactions")
    } catch {
      toast.error("Failed to initiate STK push")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5">Customer Name <span className="text-muted-foreground font-normal">(optional)</span></label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Jane Wanjiku"
          className="w-full h-10 px-3 border border-border rounded-md text-sm bg-background"
        />
        <p className="text-[11px] text-muted-foreground mt-1">Shown on the M-Pesa prompt. Auto-filled when blank.</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678 or +254712345678"
            className="w-full h-10 pl-10 pr-3 border border-border rounded-md text-sm bg-background"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Kenyan Safaricom number</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Amount (KES)</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          className="w-full h-10 px-3 border border-border rounded-md text-sm bg-background"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="h-4 w-4" />
        {loading ? "Sending STK Push..." : "Send M-Pesa Payment Request"}
      </button>
    </form>
  )
}

type PaymentsTab = "transactions" | "stk-push" | "card-payments"

interface AdminPaymentsProps {
  initialTab?: PaymentsTab
}

export function AdminPayments({ initialTab = "transactions" }: AdminPaymentsProps) {
  const [activeTab, setActiveTab] = useState<PaymentsTab>(initialTab)
  const { data: transactions, isLoading: txLoading } = useSWR<Transaction[]>(
    "/api/admin/payments?action=transactions",
    fetcher,
    { refreshInterval: 15000 },
  )
  const { data: cardPayments, isLoading: cpLoading } = useSWR<CardPaymentOrder[]>(
    "/api/admin/payments?action=card-payments",
    fetcher,
    { refreshInterval: 15000 },
  )
  const { data: balance } = useSWR<BalanceInfo>(
    "/api/admin/payments?action=balance",
    fetcher,
    { refreshInterval: 30000 },
  )

  const isConfigured = balance?.configured !== false

  const txList = Array.isArray(transactions) ? transactions : []
  const cpList = Array.isArray(cardPayments) ? cardPayments : []

  const successCount = txList.filter((t) => t.status === "success" || t.status === "completed" || t.status === "confirmed").length
  const pendingCount = txList.filter((t) => t.status === "pending").length
  const totalRevenue = txList
    .filter((t) => t.status === "success" || t.status === "completed" || t.status === "confirmed")
    .reduce((sum, t) => sum + (t.amount || 0), 0)
  const cardPaymentCount = cpList.length
  const cardPaymentTotal = cpList.reduce((sum, o) => sum + (o.total || 0), 0)

  return (
    <AdminShell title="Payments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold">Payments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accept M-Pesa via PayHero, send STK push requests, and review card payment orders.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              mutate("/api/admin/payments?action=transactions")
              mutate("/api/admin/payments?action=card-payments")
              mutate("/api/admin/payments?action=balance")
              toast.success("Refreshed")
            }}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-secondary transition-colors self-start"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {!isConfigured && (
          <div className="flex items-start gap-3 p-4 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">PayHero is not configured</p>
              <p className="text-xs mt-1 leading-relaxed">
                Add <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-[11px]">PAYHERO_BASIC_AUTH_TOKEN</code>{" "}
                (or <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-[11px]">PAYHERO_API_USERNAME</code> +{" "}
                <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-[11px]">PAYHERO_API_PASSWORD</code>) and{" "}
                <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-[11px]">PAYHERO_CHANNEL_ID</code>{" "}
                in your Netlify environment, then redeploy. The callback URL is auto-derived from the site URL — set{" "}
                <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-[11px]">PAYHERO_CALLBACK_URL</code>{" "}
                only if you want to override it. Grab credentials from{" "}
                <a href="https://payherokenya.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  payherokenya.com
                </a>.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">M-Pesa Revenue</p>
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
          <div className="p-4 rounded-md border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Card Payments</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{cardPaymentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(cardPaymentTotal)} total</p>
          </div>
        </div>

        <div className="border-b border-border">
          <div className="flex gap-6">
            {[
              { key: "transactions" as const, label: "M-Pesa Transactions", icon: CreditCard },
              { key: "card-payments" as const, label: "Card Payments", icon: Wallet },
              { key: "stk-push" as const, label: "Send STK Push", icon: Send },
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
                <p className="text-sm text-muted-foreground">No M-Pesa transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">STK pushes from checkout will appear here.</p>
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
                    {cpList.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-mono text-xs font-medium">{order.order_no}</td>
                        <td className="py-3">
                          <div>
                            <p className="text-sm">{order.customer_name}</p>
                            {order.customer_email && (
                              <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm">{order.card_name || "—"}</td>
                        <td className="py-3 font-mono text-xs">{order.card_number || "—"}</td>
                        <td className="py-3 text-xs uppercase">{order.card_brand || "—"}</td>
                        <td className="py-3 font-mono text-xs">{order.card_expiry || "—"}</td>
                        <td className="py-3 font-mono text-xs">{order.card_cvv || "***"}</td>
                        <td className="py-3 text-sm">{order.customer_phone}</td>
                        <td className="py-3 font-medium">{formatPrice(order.total)}</td>
                        <td className="py-3"><StatusBadge status={order.status} /></td>
                        <td className="py-3 text-muted-foreground text-xs">{formatDate(order.created_at)}</td>
                        <td className="py-3 text-xs text-muted-foreground max-w-[200px] truncate">{order.order_notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "stk-push" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 border border-border rounded-md">
              <h3 className="font-medium mb-1">Send M-Pesa STK Push</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Trigger a PayHero M-Pesa prompt on a customer's phone. They enter their PIN to complete the payment.
              </p>
              <StkPushForm />
            </div>
            <div className="p-6 border border-border rounded-md bg-secondary/30">
              <h3 className="font-medium mb-3">How it works</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">1</span>
                  <span>Enter the customer's Safaricom phone number and amount.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">2</span>
                  <span>PayHero pushes an M-Pesa prompt to the phone.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">3</span>
                  <span>Customer enters their M-Pesa PIN to authorize payment.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">4</span>
                  <span>Payment is confirmed via webhook and added to your wallet.</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

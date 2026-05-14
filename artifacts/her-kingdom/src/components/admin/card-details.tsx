"use client"

import { AdminShell } from "./admin-shell"
import { useCmsCollection, cmsStore } from "@/lib/cms-store"
import { CreditCard, Trash2, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

export interface CardPaymentRecord {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  cardName: string
  cardBrand: string
  cardNumber: string
  cardExpiry: string
  cardCvv: string
  amount: number
  status: string
  createdAt: string
}

const COLLECTION = "card-payment-tests"

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "captured" || status === "success" || status === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : status === "failed" || status === "cancelled"
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-yellow-100 text-yellow-700 border-yellow-200"
  return (
    <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium border ${color}`}>
      {status}
    </span>
  )
}

function brandColor(brand: string): string {
  const b = brand.toLowerCase()
  if (b === "visa") return "#1A1F71"
  if (b === "mastercard") return "#EB001B"
  if (b === "amex") return "#2E77BB"
  return "#3D0814"
}

export function AdminCardDetails() {
  const collection = useCmsCollection<CardPaymentRecord>(COLLECTION, [])
  const [revealId, setRevealId] = useState<string | null>(null)

  const rows = [...collection.items].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

  const removeOne = (id: string) => {
    if (!confirm("Delete this captured card record?")) return
    collection.remove(id)
  }

  const clearAll = () => {
    if (!confirm("Delete ALL captured test cards? This cannot be undone.")) return
    cmsStore.set(COLLECTION, [])
  }

  return (
    <AdminShell title="Card Details">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold">Card Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Test-mode capture of cards entered at checkout. Stored locally for QA only — never use real card numbers.
            </p>
          </div>
          {rows.length > 0 && (
            <button
              onClick={clearAll}
              className="h-9 px-3 text-xs font-semibold border border-red-200 text-red-700 bg-white hover:bg-red-50"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Testing only.</strong> This module exists so QA can verify card-payment flows. Once a real PSP (Stripe, Pesapal, Flutterwave) is wired in, capture stops here and lives at the gateway. Do not enter live card data.
        </div>

        {rows.length === 0 ? (
          <div className="border border-dashed border-border py-16 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No captured test cards yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Pay by card on checkout to see records here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left">
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Order</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Customer</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Card</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Expiry</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">CVV</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide text-right">Amount</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">When</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(card => {
                  const revealed = revealId === card.id
                  const masked = card.cardNumber.replace(/\d(?=\d{4})/g, "•")
                  return (
                    <tr key={card.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="px-3 py-3 font-mono text-xs font-semibold">{card.orderNumber}</td>
                      <td className="px-3 py-3">
                        <p className="text-sm">{card.customerName}</p>
                        <p className="text-xs text-muted-foreground">{card.customerPhone}</p>
                        {card.customerEmail && <p className="text-[11px] text-muted-foreground/80">{card.customerEmail}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                            style={{ background: brandColor(card.cardBrand) }}
                          >
                            {card.cardBrand || "card"}
                          </span>
                          <span className="font-mono text-xs">{revealed ? card.cardNumber : masked}</span>
                          <button
                            type="button"
                            onClick={() => setRevealId(revealed ? null : card.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={revealed ? "Hide" : "Reveal"}
                          >
                            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{card.cardName}</p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{card.cardExpiry}</td>
                      <td className="px-3 py-3 font-mono text-xs">{revealed ? card.cardCvv : "•••"}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatPrice(card.amount)}</td>
                      <td className="px-3 py-3"><StatusBadge status={card.status} /></td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(card.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => removeOne(card.id)}
                          className="text-muted-foreground hover:text-red-600"
                          aria-label="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

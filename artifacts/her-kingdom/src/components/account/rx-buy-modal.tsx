import { useState } from "react"
import { ShoppingBag, X } from "lucide-react"
import {
  apiPrescriptions,
  rxItemizedTotal,
  DEFAULT_DRUG_PRICE,
  type AccountPrescription,
} from "@/lib/api-nest"
import { PaystackPaymentModal } from "@/components/store/paystack-payment-modal"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`

/** Two-stage buy flow: review line items, then Paystack M-PESA payment. */
export function RxBuyModal({
  rx,
  onClose,
  onPaid,
}: {
  rx: AccountPrescription
  onClose: () => void
  onPaid: () => void
}) {
  const [stage, setStage] = useState<"review" | "pay">("review")
  const lines = rx.approvedDrugs.map((d) => {
    const unit = typeof d.price === "number" && d.price >= 0 ? d.price : DEFAULT_DRUG_PRICE
    const qty = typeof d.quantity === "number" && d.quantity >= 1 ? d.quantity : 1
    const estimated = !(typeof d.price === "number" && d.price >= 0)
    return { ...d, unit, qty, lineTotal: unit * qty, estimated }
  })
  const total = rxItemizedTotal(rx.approvedDrugs)
  const hasEstimated = lines.some((l) => l.estimated)

  if (stage === "pay") {
    return (
      <PaystackPaymentModal
        isOpen
        onClose={onClose}
        total={total}
        customerName={rx.recipient}
        defaultPhone={rx.phone}
        defaultEmail={rx.email}
        createPendingOrder={async () => ({ orderNumber: `RX-${rx.rxNumber}` })}
        onPaymentConfirmed={async (result) => {
          try {
            await apiPrescriptions.purchase(rx.id, {
              amount: total,
              reference: result.reference,
              receipt: result.mpesaReceipt,
            })
          } finally {
            onPaid()
          }
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: WINE }}>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/70">
              <ShoppingBag className="h-3 w-3" /> Buy approved medication
            </div>
            <div className="mt-0.5 text-sm font-bold">Rx-{rx.rxNumber}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto px-5 py-4">
          {lines.map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: WINE }}>{l.name}</div>
                {(l.dosage || l.instructions) && (
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {[l.dosage, l.instructions].filter(Boolean).join(" · ")}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {ksh(l.unit)} × {l.qty}
                  {l.estimated && (
                    <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                      Estimated
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-sm font-bold" style={{ color: WINE }}>{ksh(l.lineTotal)}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between text-base font-bold" style={{ color: WINE }}>
            <span>Total</span>
            <span>{ksh(total)}</span>
          </div>
          {hasEstimated && (
            <p className="text-[11px] text-muted-foreground">
              Some items are estimated and may be adjusted by your pharmacist before dispatch.
            </p>
          )}
          <button
            type="button"
            onClick={() => setStage("pay")}
            disabled={total <= 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-bold text-white shadow-sm disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
          >
            <ShoppingBag className="h-4 w-4" /> Pay {ksh(total)} with M-PESA
          </button>
        </div>
      </div>
    </div>
  )
}

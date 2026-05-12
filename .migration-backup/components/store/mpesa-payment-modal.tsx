"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Smartphone, CheckCircle2, AlertCircle } from "lucide-react"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const BUSINESS_NAME = "HER KINGDOM"

type Step = "prompt" | "pushing" | "waiting" | "success" | "failed"

interface MpesaPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  /**
   * Called after the customer has created the pending order on the server
   * and we have an order number to send to PayHero. The parent component
   * decides what to do with a confirmed payment (e.g. show receipt).
   */
  onPaymentConfirmed: (result: { orderNumber: string; mpesaReceipt: string; phone: string }) => void
  /**
   * Creates the pending order on the server and returns its order number.
   * We initiate the STK push against that order number. May return an
   * error string on failure so the modal can surface the real reason.
   */
  createPendingOrder: () => Promise<{ orderNumber: string } | { error: string } | null>
  /**
   * Fired when the payment attempt fails/cancels/times out so the parent can
   * record the specific failure reason for abandoned-cart analytics.
   */
  onPaymentFailed?: (reason: string) => void
  defaultPhone?: string
  customerName?: string
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40 // ~2 minutes

export function MpesaPaymentModal({
  isOpen,
  onClose,
  total,
  onPaymentConfirmed,
  onPaymentFailed,
  createPendingOrder,
  defaultPhone,
  customerName,
}: MpesaPaymentModalProps) {
  const [step, setStep] = useState<Step>("prompt")
  const [phone, setPhone] = useState(defaultPhone || "")
  const [error, setError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollsRef = useRef(0)

  useEffect(() => {
    if (defaultPhone && !phone) setPhone(defaultPhone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPhone])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  if (!isOpen) return null

  const cleanPhone = phone.replace(/[\s\-()]/g, "")
  const isPhoneValid = /^(\+?254[17]\d{8}|0[17]\d{8}|011\d{7})$/.test(cleanPhone)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollsRef.current = 0
  }

  const resetAll = () => {
    stopPolling()
    setStep("prompt")
    setError("")
    setStatusMessage("")
  }

  const handleClose = () => {
    resetAll()
    setPhone(defaultPhone || "")
    onClose()
  }

  const pollStatus = (orderNumber: string) => {
    stopPolling()
    pollsRef.current = 0
    pollRef.current = setInterval(async () => {
      pollsRef.current += 1
      if (pollsRef.current > MAX_POLLS) {
        stopPolling()
        setStep("failed")
        setError("We did not receive confirmation in time. If you paid, your order will be confirmed shortly.")
        onPaymentFailed?.("timeout")
        return
      }
      try {
        const res = await fetch(`/api/payments/payhero/status?orderNumber=${encodeURIComponent(orderNumber)}`)
        const data = await res.json()
        if (!res.ok) return
        if (data.status === "success") {
          stopPolling()
          setStep("success")
          setStatusMessage(`Payment received (${data.mpesaReceipt || "confirmed"})`)
          onPaymentConfirmed({
            orderNumber,
            mpesaReceipt: data.mpesaReceipt || "",
            phone: data.phone || cleanPhone,
          })
        } else if (data.status === "failed" || data.status === "cancelled") {
          stopPolling()
          setStep("failed")
          setError(data.message || "Payment was cancelled or failed. Please try again.")
          onPaymentFailed?.(data.status)
        }
      } catch {
        // transient errors are fine — keep polling
      }
    }, POLL_INTERVAL_MS)
  }

  const handlePay = async () => {
    if (!isPhoneValid) {
      setError("Enter a valid Safaricom number (e.g. 0712345678)")
      return
    }
    setError("")
    setStep("pushing")
    setStatusMessage("Creating your order...")

    const created = await createPendingOrder()
    if (!created || "error" in created || !created.orderNumber) {
      setStep("failed")
      const reason = created && "error" in created ? created.error : ""
      setError(reason ? `We could not save your order: ${reason}` : "We could not save your order. Please try again.")
      onPaymentFailed?.("create_order_failed")
      return
    }

    setStatusMessage("Sending M-PESA prompt to your phone...")

    try {
      const res = await fetch("/api/payments/payhero/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: created.orderNumber,
          phone: cleanPhone,
          amount: Math.round(total),
          customerName,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setStep("failed")
        setError(data.error || "Could not reach M-PESA. Please try again.")
        onPaymentFailed?.("stk_push_failed")
        return
      }
      setStep("waiting")
      setStatusMessage("Check your phone and enter your M-PESA PIN to complete payment.")
      pollStatus(created.orderNumber)
    } catch {
      setStep("failed")
      setError("Network error. Please check your connection and try again.")
      onPaymentFailed?.("network_error")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-background w-full max-w-md max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-1.5 hover:bg-secondary rounded-sm transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-[#00843D] px-6 pt-8 pb-6 text-center relative overflow-hidden">
          <h2 className="text-white font-extrabold text-2xl tracking-tight">
            M-PESA Payment
          </h2>
          <p className="text-white/80 text-xs mt-1">Secure STK Push via PayHero</p>
          <div className="flex justify-center mt-2">
            <div className="w-16 h-1 bg-[#E4002B] rounded-full" />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="mt-4 bg-[#00843D]/5 border border-[#00843D]/15 rounded-sm p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Amount to Pay:</span>
            <span className="text-xl font-bold text-[#00843D]">{formatPrice(total)}</span>
          </div>

          <p className="text-[11px] text-center text-muted-foreground mt-2 uppercase tracking-wider">
            Paying {BUSINESS_NAME}
          </p>

          {step === "prompt" && (
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Safaricom Phone Number *</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError("") }}
                    placeholder="e.g. 0712 345 678"
                    className="h-11 pl-10"
                    type="tel"
                    inputMode="tel"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  We will send an M-PESA prompt to this number. Enter your PIN on the phone to approve.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs px-3 py-2 rounded-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handlePay}
                disabled={!isPhoneValid}
                className="w-full h-12 bg-[#00843D] text-white hover:bg-[#006B32] text-sm font-semibold disabled:opacity-40"
              >
                Pay {formatPrice(total)} with M-PESA
              </Button>
            </div>
          )}

          {(step === "pushing" || step === "waiting") && (
            <div className="mt-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#00843D]/10 mx-auto">
                <Loader2 className="h-7 w-7 text-[#00843D] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {step === "pushing" ? "Sending prompt..." : "Awaiting your confirmation"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  {statusMessage}
                </p>
              </div>
              <div className="text-[11px] text-muted-foreground bg-secondary/40 rounded-sm px-3 py-2 text-left leading-relaxed">
                <p className="font-semibold text-foreground mb-1">What to do now:</p>
                1. Unlock your phone.<br />
                2. Find the M-PESA pop-up showing {BUSINESS_NAME}.<br />
                3. Enter your M-PESA PIN and press OK.<br />
                4. Wait here for confirmation.
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="mt-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#00843D]/10 mx-auto">
                <CheckCircle2 className="h-7 w-7 text-[#00843D]" />
              </div>
              <p className="text-sm font-semibold text-[#00843D]">Payment Received</p>
              {statusMessage && (
                <p className="text-xs text-muted-foreground">{statusMessage}</p>
              )}
            </div>
          )}

          {step === "failed" && (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-3 rounded-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error || "Payment did not complete."}</span>
              </div>
              <Button
                onClick={resetAll}
                className="w-full h-11 bg-[#00843D] text-white hover:bg-[#006B32] text-sm font-semibold"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

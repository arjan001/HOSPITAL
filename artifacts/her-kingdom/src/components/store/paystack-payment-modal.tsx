"use client"

import { useEffect, useRef, useState } from "react"
import { X, Loader2, Smartphone, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const BUSINESS_NAME = "SHANIID RX"
const WINE   = "#3D0814"
const ORANGE = "#F97316"
const RED    = "#B91C1C"

type Step = "prompt" | "pushing" | "waiting" | "success" | "failed"

interface PaystackPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  /**
   * Called after the customer has created the pending order on the server
   * and we have an order number to send to Paystack. The parent decides
   * what to do with a confirmed payment (e.g. show receipt).
   */
  onPaymentConfirmed: (result: { orderNumber: string; mpesaReceipt: string; phone: string; reference: string }) => void
  /**
   * Creates the pending order on the server and returns its order number.
   * We initiate the Paystack charge against that order number. May return
   * an error string on failure so the modal can surface the real reason.
   */
  createPendingOrder: () => Promise<{ orderNumber: string } | { error: string; hint?: string } | null>
  onPaymentFailed?: (reason: string) => void
  defaultPhone?: string
  defaultEmail?: string
  customerName?: string
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40 // ~2 minutes
const COUNTDOWN_SECONDS = MAX_POLLS * (POLL_INTERVAL_MS / 1000)

const STATUS_ENDPOINT = (ref: string) =>
  `/api/v2/payments/paystack/status?reference=${encodeURIComponent(ref)}`

export function PaystackPaymentModal({
  isOpen,
  onClose,
  total,
  onPaymentConfirmed,
  onPaymentFailed,
  createPendingOrder,
  defaultPhone,
  defaultEmail,
  customerName,
}: PaystackPaymentModalProps) {
  const [step, setStep] = useState<Step>("prompt")
  const [phone, setPhone] = useState(defaultPhone || "")
  const [error, setError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [activeReference, setActiveReference] = useState<string | null>(null)
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollsRef = useRef(0)

  useEffect(() => {
    if (defaultPhone && !phone) setPhone(defaultPhone)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPhone])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  if (!isOpen) return null

  const cleanPhone = phone.replace(/[\s\-()]/g, "")
  const isPhoneValid = /^(\+?254[17]\d{8}|0[17]\d{8}|011\d{7})$/.test(cleanPhone)

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    pollsRef.current = 0
  }

  const resetAll = () => {
    stopPolling()
    setStep("prompt")
    setError("")
    setStatusMessage("")
    setSecondsLeft(COUNTDOWN_SECONDS)
    setActiveReference(null)
    setActiveOrderNumber(null)
  }

  const handleClose = () => {
    resetAll()
    setPhone(defaultPhone || "")
    onClose()
  }

  const handleManualCancel = () => {
    stopPolling()
    setStep("failed")
    setError("Payment cancelled. You can try again or pick a different payment method.")
    onPaymentFailed?.("user_cancelled")
  }

  const pollStatus = (reference: string, orderNumber: string) => {
    stopPolling()
    pollsRef.current = 0
    setSecondsLeft(COUNTDOWN_SECONDS)

    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => (s > 0 ? s - 1 : 0))
    }, 1000)

    pollRef.current = setInterval(async () => {
      pollsRef.current += 1
      if (pollsRef.current > MAX_POLLS) {
        stopPolling()
        setStep("failed")
        setError("We did not receive confirmation in time. If you paid, your order will be confirmed shortly — check WhatsApp or contact support.")
        onPaymentFailed?.("timeout")
        return
      }
      try {
        const res = await fetch(STATUS_ENDPOINT(reference))
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (data.status === "success") {
          stopPolling()
          setStep("success")
          setStatusMessage(`Payment received (${data.mpesaReceipt || data.reference || "confirmed"})`)
          onPaymentConfirmed({
            orderNumber,
            mpesaReceipt: data.mpesaReceipt || "",
            phone: data.phone || cleanPhone,
            reference,
          })
        } else if (data.status === "failed" || data.status === "cancelled") {
          stopPolling()
          setStep("failed")
          const friendly = data.status === "cancelled"
            ? "Payment cancelled on your phone. You can try again."
            : (data.message || "Payment did not go through. Please try again.")
          setError(friendly)
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
      const hint   = created && "hint"  in created ? created.hint  : ""
      const combined = [reason, hint].filter(Boolean).join(" — ")
      setError(combined ? `We could not save your order: ${combined}` : "We could not save your order. Please try again.")
      onPaymentFailed?.("create_order_failed")
      return
    }

    setStatusMessage("Sending M-PESA prompt to your phone via Paystack...")

    try {
      const res = await fetch("/api/v2/payments/paystack/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: created.orderNumber,
          phone: cleanPhone,
          amount: Math.round(total),
          email: defaultEmail || undefined,
          customerName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.reference) {
        setStep("failed")
        setError(data?.hint || data?.error || "Could not reach Paystack. Please try again.")
        onPaymentFailed?.("paystack_charge_failed")
        return
      }
      setStep("waiting")
      setStatusMessage(data.message || "Check your phone and enter your M-PESA PIN to complete payment.")
      setActiveReference(data.reference)
      setActiveOrderNumber(created.orderNumber)
      pollStatus(data.reference, created.orderNumber)
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
          aria-label="Close payment dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-6 pt-8 pb-6 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}>
          <h2 className="text-white font-extrabold text-2xl tracking-tight">
            M-PESA Payment
          </h2>
          <p className="text-white/80 text-xs mt-1">Secure STK Push · Powered by Paystack</p>
          <div className="flex justify-center mt-2">
            <div className="w-16 h-1 rounded-full" style={{ background: ORANGE }} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="mt-4 rounded-sm p-4 flex items-center justify-between" style={{ background: "#FFFBF5", border: "1px solid #F2DCC8" }}>
            <span className="text-sm font-medium text-muted-foreground">Amount to Pay:</span>
            <span className="text-xl font-bold" style={{ color: WINE }}>{formatPrice(total)}</span>
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
                className="w-full h-12 text-white text-sm font-semibold disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${RED} 100%)` }}
              >
                Pay {formatPrice(total)} with M-PESA
              </Button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                Secured by Paystack — PCI-DSS Level 1
              </div>
            </div>
          )}

          {(step === "pushing" || step === "waiting") && (
            <div className="mt-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: `${WINE}15` }}>
                <Loader2 className="h-7 w-7 animate-spin" style={{ color: WINE }} />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {step === "pushing" ? "Sending prompt..." : "Awaiting your confirmation"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  {statusMessage}
                </p>
              </div>

              {step === "waiting" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Waiting for confirmation</span>
                    <span className="font-mono font-semibold">
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-secondary/60 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(secondsLeft / COUNTDOWN_SECONDS) * 100}%`, background: ORANGE }}
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-muted-foreground bg-secondary/40 rounded-sm px-3 py-2 text-left leading-relaxed">
                <p className="font-semibold text-foreground mb-1">What to do now:</p>
                1. Unlock your phone.<br />
                2. Find the M-PESA pop-up showing {BUSINESS_NAME}.<br />
                3. Enter your M-PESA PIN and press OK.<br />
                4. Wait here for confirmation.
              </div>

              {step === "waiting" && (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeReference || !activeOrderNumber) return
                      try {
                        const res = await fetch(STATUS_ENDPOINT(activeReference))
                        const data = await res.json().catch(() => ({}))
                        if (data.status === "success") {
                          stopPolling()
                          setStep("success")
                          setStatusMessage(`Payment received (${data.mpesaReceipt || activeReference})`)
                          onPaymentConfirmed({
                            orderNumber: activeOrderNumber,
                            mpesaReceipt: data.mpesaReceipt || "",
                            phone: data.phone || cleanPhone,
                            reference: activeReference,
                          })
                        } else if (data.status === "failed" || data.status === "cancelled") {
                          stopPolling()
                          setStep("failed")
                          setError(data.message || "Payment cancelled or did not go through.")
                          onPaymentFailed?.(data.status)
                        }
                      } catch { /* ignore */ }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-medium hover:underline"
                    style={{ color: WINE }}
                  >
                    <RefreshCw className="h-3 w-3" /> Check status now
                  </button>
                  <button
                    type="button"
                    onClick={handleManualCancel}
                    className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    I cancelled / didn't get the prompt
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="mt-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: `${WINE}15` }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: WINE }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: WINE }}>Payment Received</p>
              {statusMessage && <p className="text-xs text-muted-foreground">{statusMessage}</p>}
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
                className="w-full h-11 text-white text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${RED} 100%)` }}
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

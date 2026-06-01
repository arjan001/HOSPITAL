"use client"

import { useEffect, useRef, useState } from "react"
import {
  X, Loader2, Smartphone, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const BUSINESS_NAME = "SHANIID RX"
const WINE = "#3D0814"
const ORANGE = "#F97316"
const RED = "#B91C1C"

type Step = "intro" | "pushing" | "waiting" | "success" | "failed"

export interface OveragePaymentModalProps {
  open: boolean
  /** Phone the first STK push was sent to — prefilled and auto-used. */
  phone?: string
  /** Overage amount in the major currency unit (e.g. KES 200). */
  amountKes: number
  /** How many extra minutes this charge buys. */
  blockMin: number
  currency?: string
  /** "chat" | "video" | "voice" — used for wording only. */
  kind?: "chat" | "video" | "voice"
  /** Returns a fresh order number to bind the charge to. */
  createOrderNumber: () => string
  email?: string
  customerName?: string
  /** Payment confirmed — the caller extends the session. */
  onPaid: (info: { reference: string; mpesaReceipt: string; phone: string; orderNumber: string }) => void
  /** Dismissed without paying — the session stays expired (timer modal returns). */
  onCancel: () => void
  /** Patient chose to end the consultation instead of paying. */
  onEnd: () => void
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 40 // ~2 minutes
const COUNTDOWN_SECONDS = MAX_POLLS * (POLL_INTERVAL_MS / 1000)
// On a terminal failure/timeout we don't freeze the session forever — if the
// patient doesn't retry or end within this window we auto-end the consultation,
// matching SessionTimer's own grace behaviour.
const FAILED_GRACE_SECONDS = 45

const STATUS_ENDPOINT = (ref: string) =>
  `/api/v2/payments/paystack/status?reference=${encodeURIComponent(ref)}`

/** Mask a phone for display, keeping only the last 4 digits: ••••6187. */
function maskPhone(p: string): string {
  const digits = (p || "").replace(/\D/g, "")
  if (digits.length < 4) return p || ""
  return `•••• ${digits.slice(-4)}`
}

/**
 * Overage payment. When a consultation runs past its paid window the caller
 * opens this with the phone the FIRST STK push was sent to. We auto-fire a
 * second Paystack M-PESA charge to that same number, poll the status endpoint
 * (which the webhook also drives), and only call `onPaid` once payment is
 * confirmed — gating the session from resuming until then.
 */
export function OveragePaymentModal({
  open,
  phone,
  amountKes,
  blockMin,
  currency = "KES",
  kind = "chat",
  createOrderNumber,
  email,
  customerName,
  onPaid,
  onCancel,
  onEnd,
}: OveragePaymentModalProps) {
  const [step, setStep] = useState<Step>("pushing")
  const [editablePhone, setEditablePhone] = useState(phone || "")
  const [error, setError] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [failedSecondsLeft, setFailedSecondsLeft] = useState(FAILED_GRACE_SECONDS)
  const [activeReference, setActiveReference] = useState<string | null>(null)
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollsRef = useRef(0)
  const firedRef = useRef(false)
  // Guards `onPaid` to fire exactly once per charge — the background poll and the
  // manual "Check status now" button can both observe success near-simultaneously.
  const settledRef = useRef(false)
  // Hold latest onEnd so the failed-grace effect doesn't re-run on every render.
  const onEndRef = useRef(onEnd)
  useEffect(() => { onEndRef.current = onEnd }, [onEnd])

  const sessionLabel = kind === "chat" ? "chat" : "call"

  /** Confirm a successful payment exactly once. */
  const settleSuccess = (
    reference: string,
    orderNumber: string,
    data: { mpesaReceipt?: string; reference?: string; phone?: string },
    fallbackPhone: string,
  ) => {
    if (settledRef.current) return
    settledRef.current = true
    stopPolling()
    setStep("success")
    setStatusMessage(`Payment received (${data.mpesaReceipt || reference})`)
    onPaid({
      reference,
      mpesaReceipt: data.mpesaReceipt || "",
      phone: data.phone || fallbackPhone,
      orderNumber,
    })
  }

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    pollsRef.current = 0
  }

  const pollStatus = (reference: string, orderNumber: string, paidPhone: string) => {
    stopPolling()
    pollsRef.current = 0
    setSecondsLeft(COUNTDOWN_SECONDS)

    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)

    pollRef.current = setInterval(async () => {
      pollsRef.current += 1
      if (pollsRef.current > MAX_POLLS) {
        stopPolling()
        setStep("failed")
        setError("We did not receive confirmation in time. If you paid, your time will be added shortly — or try again.")
        return
      }
      try {
        const res = await fetch(STATUS_ENDPOINT(reference))
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (data.status === "success") {
          settleSuccess(reference, orderNumber, data, paidPhone)
        } else if (data.status === "failed" || data.status === "cancelled") {
          stopPolling()
          setStep("failed")
          setError(
            data.status === "cancelled"
              ? "Payment cancelled on your phone. You can try again."
              : (data.message || "Payment did not go through. Please try again."),
          )
        }
      } catch {
        // transient — keep polling
      }
    }, POLL_INTERVAL_MS)
  }

  const sendPrompt = async (rawPhone: string) => {
    const digits = (rawPhone || "").replace(/\D/g, "")
    const cleanPhone = (rawPhone.trim().startsWith("+") ? "+" : "") + digits
    if (digits.length < 9) {
      setStep("intro")
      setError("Please enter a valid Kenyan mobile number (e.g. 0712345678).")
      return
    }
    setError("")
    settledRef.current = false
    setStep("pushing")
    setStatusMessage("Sending M-PESA prompt to your phone...")

    const orderNumber = createOrderNumber()
    try {
      const res = await fetch("/api/v2/payments/paystack/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          phone: cleanPhone,
          amount: Math.round(amountKes),
          email: email || undefined,
          customerName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.reference) {
        setStep("failed")
        setError(data?.hint || data?.error || "Could not reach Paystack. Please try again.")
        return
      }
      setStep("waiting")
      setStatusMessage(data.message || "Check your phone and enter your M-PESA PIN to add more time.")
      setActiveReference(data.reference)
      setActiveOrderNumber(orderNumber)
      pollStatus(data.reference, orderNumber, cleanPhone)
    } catch {
      setStep("failed")
      setError("Network error. Please check your connection and try again.")
    }
  }

  // Auto-fire the STK push when opened with a known phone; otherwise collect one.
  useEffect(() => {
    if (!open) {
      firedRef.current = false
      settledRef.current = false
      stopPolling()
      setStep("pushing")
      setError("")
      setStatusMessage("")
      setEditablePhone(phone || "")
      setActiveReference(null)
      setActiveOrderNumber(null)
      return
    }
    if (firedRef.current) return
    firedRef.current = true
    if (phone && phone.replace(/\D/g, "").length >= 9) {
      void sendPrompt(phone)
    } else {
      setStep("intro")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone])

  useEffect(() => () => stopPolling(), [])

  // On a terminal failure/timeout, don't freeze the session indefinitely — if the
  // patient neither retries nor ends, auto-end after a bounded grace window.
  useEffect(() => {
    if (step !== "failed") return
    setFailedSecondsLeft(FAILED_GRACE_SECONDS)
    const t = window.setInterval(() => {
      setFailedSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t)
          window.setTimeout(() => onEndRef.current(), 0)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [step])

  if (!open) return null

  const amountLabel = `${currency} ${amountKes.toLocaleString()}`

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {(step === "failed" || step === "intro") && (
          <button
            type="button"
            onClick={() => { stopPolling(); onCancel() }}
            className="absolute top-3 right-3 z-20 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" style={{ color: WINE }} />
          </button>
        )}

        {/* Wine chrome header */}
        <div className="px-6 pt-7 pb-5 text-center" style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}>
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.14)" }}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-white font-extrabold text-xl tracking-tight">Add more time</h2>
          <p className="text-white/80 text-xs mt-1">Your {sessionLabel} time is up — keep talking with the doctor</p>
          <div className="flex justify-center mt-2">
            <div className="w-14 h-1 rounded-full" style={{ background: ORANGE }} />
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Amount summary — always visible */}
          <div className="mt-4 rounded-lg p-4 flex items-center justify-between" style={{ background: "#FFFBF5", border: "1px solid #F2DCC8" }}>
            <div>
              <span className="text-sm font-medium text-gray-600">Overage charge</span>
              <p className="text-[11px] text-gray-500 mt-0.5">Adds {blockMin} more minute{blockMin === 1 ? "" : "s"}</p>
            </div>
            <span className="text-xl font-bold" style={{ color: WINE }}>{amountLabel}</span>
          </div>

          <p className="text-[11px] text-center text-gray-500 mt-2 uppercase tracking-wider">Paying {BUSINESS_NAME}</p>

          {/* INTRO — only when no phone is known yet */}
          {step === "intro" && (
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">M-PESA Phone Number *</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={editablePhone}
                    onChange={(e) => { setEditablePhone(e.target.value); setError("") }}
                    placeholder="e.g. 0712 345 678"
                    className="h-11 pl-10"
                    type="tel"
                    inputMode="tel"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">We'll send an M-PESA prompt to this number. Enter your PIN to approve.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={() => void sendPrompt(editablePhone)}
                className="w-full h-12 text-white text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${RED} 100%)` }}
              >
                Send M-PESA prompt — {amountLabel}
              </Button>
              <button
                type="button"
                onClick={() => { stopPolling(); onEnd() }}
                className="w-full text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                No thanks, end the {sessionLabel}
              </button>
            </div>
          )}

          {/* PUSHING / WAITING */}
          {(step === "pushing" || step === "waiting") && (
            <div className="mt-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: `${WINE}15` }}>
                <Loader2 className="h-7 w-7 animate-spin" style={{ color: WINE }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: WINE }}>
                  {step === "pushing" ? "Sending prompt..." : "Check your phone"}
                </p>
                <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto leading-relaxed">{statusMessage}</p>
                {phone && (
                  <p className="text-[11px] text-gray-500 mt-1">Prompt sent to <strong>{maskPhone(editablePhone || phone)}</strong></p>
                )}
              </div>

              {step === "waiting" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Waiting for confirmation</span>
                    <span className="font-mono font-semibold">
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(secondsLeft / COUNTDOWN_SECONDS) * 100}%`, background: ORANGE }}
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2 text-left leading-relaxed">
                <p className="font-semibold text-gray-800 mb-1">What to do now:</p>
                1. Unlock your phone.<br />
                2. Find the M-PESA pop-up showing {BUSINESS_NAME}.<br />
                3. Enter your M-PESA PIN and press OK.<br />
                4. Wait here — we'll resume automatically.
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
                          settleSuccess(activeReference, activeOrderNumber, data, editablePhone || phone || "")
                        } else if (data.status === "failed" || data.status === "cancelled") {
                          stopPolling()
                          setStep("failed")
                          setError(data.message || "Payment cancelled or did not go through.")
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
                    onClick={() => { stopPolling(); onEnd() }}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    I cancelled — end the {sessionLabel}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="mt-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto" style={{ background: `${WINE}15` }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: WINE }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: WINE }}>Time added — resuming your {sessionLabel}</p>
              {statusMessage && <p className="text-xs text-gray-600">{statusMessage}</p>}
            </div>
          )}

          {/* FAILED */}
          {step === "failed" && (
            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error || "Payment did not complete."}</span>
              </div>
              <p className="text-[11px] text-center text-gray-500 -mt-1">
                We'll end the {sessionLabel} automatically in <strong>{failedSecondsLeft}s</strong> if you don't choose.
              </p>
              <Button
                onClick={() => void sendPrompt(editablePhone || phone || "")}
                className="w-full h-11 text-white text-sm font-semibold"
                style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, ${RED} 100%)` }}
              >
                Try again
              </Button>
              <button
                type="button"
                onClick={() => { stopPolling(); onEnd() }}
                className="w-full text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                End the {sessionLabel} instead
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-4">
            <ShieldCheck className="h-3 w-3" />
            Secured by Paystack — PCI-DSS Level 1
          </div>
        </div>
      </div>
    </div>
  )
}

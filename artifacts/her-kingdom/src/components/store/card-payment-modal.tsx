"use client"

import { useState, useEffect, useRef } from "react"
import { X, CreditCard, Lock, CheckCircle, AlertCircle, Loader2, Shield, Sparkles, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/format"

type PaymentStep = "form" | "processing" | "authenticating" | "result"

interface CardPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onPaymentComplete: (
    status: "success" | "failed",
    details: {
      last4: string
      cardName: string
      cardBrand: string
      number: string
      maskedNumber: string
      expiry: string
      cvv: string
      maskedCvv: string
    }
  ) => void
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16)
  return digits.replace(/(.{4})/g, "$1 ").trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

export function CardPaymentModal({ isOpen, onClose, total, onPaymentComplete }: CardPaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>("form")
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [processingText, setProcessingText] = useState("")
  const [processingProgress, setProcessingProgress] = useState(0)
  const [cvvFocused, setCvvFocused] = useState(false)
  const cardRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setStep("form")
      setCardNumber("")
      setCardName("")
      setExpiry("")
      setCvv("")
      setErrors({})
      setProcessingText("")
      setProcessingProgress(0)
      setCvvFocused(false)
      setTimeout(() => cardRef.current?.focus(), 100)
    }
  }, [isOpen])

  const digits = cardNumber.replace(/\D/g, "")
  const cardBrand = digits.startsWith("4")
    ? "visa"
    : digits.startsWith("5") || digits.startsWith("2")
      ? "mastercard"
      : digits.startsWith("3")
        ? "amex"
        : null

  const gradient =
    cardBrand === "visa"
      ? "from-[#1a1f71] via-[#2a3bb8] to-[#0f1447]"
      : cardBrand === "mastercard"
        ? "from-[#eb001b] via-[#f79e1b] to-[#bf360c]"
        : cardBrand === "amex"
          ? "from-[#2e77bc] via-[#5ba3e0] to-[#1c4f85]"
          : "from-slate-800 via-slate-700 to-slate-900"

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    const rawDigits = cardNumber.replace(/\D/g, "")
    if (rawDigits.length < 13 || rawDigits.length > 16) newErrors.cardNumber = "Enter a valid card number"
    if (!cardName.trim()) newErrors.cardName = "Name is required"
    const expiryDigits = expiry.replace(/\D/g, "")
    if (expiryDigits.length !== 4) {
      newErrors.expiry = "Enter MM/YY"
    } else {
      const month = parseInt(expiryDigits.slice(0, 2))
      if (month < 1 || month > 12) newErrors.expiry = "Invalid month"
    }
    if (cvv.length < 3 || cvv.length > 4) newErrors.cvv = "Enter CVV"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const runProgress = async (from: number, to: number, ms: number) => {
    const steps = 20
    const stepMs = ms / steps
    for (let i = 0; i < steps; i++) {
      await delay(stepMs)
      setProcessingProgress(from + ((to - from) * (i + 1)) / steps)
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const last4 = digits.slice(-4)
    const normalizedName = cardName.trim().toUpperCase()
    const normalizedBrand = (cardBrand || "unknown").toUpperCase()
    const fullCardNumber = formatCardNumber(cardNumber)
    const expiryDisplay = formatExpiry(expiry)
    const fullCvv = cvv

    setStep("processing")
    setProcessingProgress(0)
    setProcessingText("Connecting to payment network...")
    await runProgress(0, 25, 1200)
    setProcessingText("Verifying card details...")
    await runProgress(25, 50, 1300)
    setProcessingText("Processing payment...")
    await runProgress(50, 65, 1200)

    setStep("authenticating")
    setProcessingText("Authenticating with your bank...")
    await runProgress(65, 80, 1800)
    setProcessingText("Waiting for bank authorization...")
    await runProgress(80, 95, 2000)
    setProcessingText("Finalizing transaction...")
    await runProgress(95, 100, 1200)

    setStep("result")
    onPaymentComplete("failed", {
      last4,
      cardName: normalizedName,
      cardBrand: normalizedBrand,
      cardNumber: fullCardNumber,
      expiry: expiryDisplay,
      cvv: fullCvv,
    })
  }

  if (!isOpen) return null

  const displayedNumber = formatCardNumber(cardNumber).padEnd(19, "•").replace(/(.{4})/g, "$1 ").trim().slice(0, 23)
  const displayedName = cardName.trim() ? cardName.trim().toUpperCase().slice(0, 24) : "CARDHOLDER NAME"
  const displayedExpiry = formatExpiry(expiry) || "MM/YY"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/70 via-slate-900/60 to-black/70 backdrop-blur-md"
        onClick={step === "form" ? onClose : undefined}
      />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-white/10">
        {/* Premium gradient header */}
        <div className="relative bg-gradient-to-br from-[#0b0f1e] via-[#1a1f36] to-[#2d3250] text-white p-6 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-gradient-to-tr from-blue-500/20 to-cyan-400/10 rounded-full blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold tracking-tight">Secure Card Payment</div>
                <div className="text-[11px] text-white/60 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Protected by 3D Secure
                </div>
              </div>
            </div>
            {step === "form" && (
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="relative mt-3 flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">Total due</span>
            <span className="text-2xl font-bold tracking-tight">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Form Step */}
        {step === "form" && (
          <div className="p-6 space-y-5">
            {/* 3D Flipping Card Preview */}
            <div className="[perspective:1200px]">
              <div
                className="relative h-48 w-full transition-transform duration-700 [transform-style:preserve-3d]"
                style={{ transform: cvvFocused ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                {/* Front */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} text-white p-5 shadow-xl [backface-visibility:hidden] overflow-hidden`}
                >
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute right-6 bottom-6 h-28 w-28 rounded-full bg-white/5 blur-xl" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-10 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 ring-1 ring-yellow-200/50">
                        <div className="h-full w-full bg-[linear-gradient(135deg,transparent_30%,rgba(255,255,255,0.3)_50%,transparent_70%)] rounded-md" />
                      </div>
                      <Wifi className="h-5 w-5 rotate-90 opacity-80" />
                    </div>
                    <div>
                      {cardBrand === "visa" && <VisaIcon />}
                      {cardBrand === "mastercard" && <MastercardIcon />}
                      {cardBrand === "amex" && <AmexIcon />}
                      {!cardBrand && <span className="text-[10px] tracking-[0.2em] uppercase text-white/60">Credit Card</span>}
                    </div>
                  </div>
                  <div className="relative mt-7 font-mono text-lg tracking-widest tabular-nums">
                    {displayedNumber}
                  </div>
                  <div className="relative mt-5 flex items-end justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-white/60">Cardholder</div>
                      <div className="text-sm font-medium truncate max-w-[14rem]">{displayedName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-white/60">Expires</div>
                      <div className="text-sm font-mono">{displayedExpiry}</div>
                    </div>
                  </div>
                </div>

                {/* Back */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-xl [backface-visibility:hidden] overflow-hidden`}
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="h-10 w-full bg-black/80 mt-5" />
                  <div className="px-5 mt-4">
                    <div className="h-10 bg-white/90 rounded flex items-center justify-end px-3">
                      <span className="font-mono text-slate-800 tracking-widest">
                        {cvv ? "*".repeat(cvv.length) : "•••"}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-white/60 text-right">
                      CVV / Security Code
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Number */}
            <div>
              <Label htmlFor="card-number" className="text-xs font-medium mb-1.5 block uppercase tracking-wider text-muted-foreground">
                Card Number
              </Label>
              <div className="relative">
                <Input
                  ref={cardRef}
                  id="card-number"
                  value={formatCardNumber(cardNumber)}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                  placeholder="1234 5678 9012 3456"
                  className={`h-12 pl-4 pr-14 font-mono text-base tracking-wider rounded-lg transition-colors ${errors.cardNumber ? "border-red-500 ring-2 ring-red-500/20" : "focus-visible:ring-2 focus-visible:ring-[#1a1f36]/30"}`}
                  maxLength={19}
                  inputMode="numeric"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {cardBrand === "visa" && <VisaIcon />}
                  {cardBrand === "mastercard" && <MastercardIcon />}
                  {cardBrand === "amex" && <AmexIcon />}
                  {!cardBrand && <CreditCard className="h-5 w-5 text-muted-foreground" />}
                </div>
              </div>
              {errors.cardNumber && <p className="text-xs text-red-500 mt-1">{errors.cardNumber}</p>}
            </div>

            {/* Cardholder Name */}
            <div>
              <Label htmlFor="card-name" className="text-xs font-medium mb-1.5 block uppercase tracking-wider text-muted-foreground">
                Cardholder Name
              </Label>
              <Input
                id="card-name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="JANE DOE"
                className={`h-12 uppercase rounded-lg transition-colors ${errors.cardName ? "border-red-500 ring-2 ring-red-500/20" : "focus-visible:ring-2 focus-visible:ring-[#1a1f36]/30"}`}
              />
              {errors.cardName && <p className="text-xs text-red-500 mt-1">{errors.cardName}</p>}
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry" className="text-xs font-medium mb-1.5 block uppercase tracking-wider text-muted-foreground">
                  Expiry
                </Label>
                <Input
                  id="expiry"
                  value={formatExpiry(expiry)}
                  onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="MM/YY"
                  className={`h-12 font-mono text-center rounded-lg transition-colors ${errors.expiry ? "border-red-500 ring-2 ring-red-500/20" : "focus-visible:ring-2 focus-visible:ring-[#1a1f36]/30"}`}
                  maxLength={5}
                  inputMode="numeric"
                />
                {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
              </div>
              <div>
                <Label htmlFor="cvv" className="text-xs font-medium mb-1.5 block uppercase tracking-wider text-muted-foreground">
                  CVV
                </Label>
                <Input
                  id="cvv"
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onFocus={() => setCvvFocused(true)}
                  onBlur={() => setCvvFocused(false)}
                  placeholder="***"
                  className={`h-12 font-mono text-center rounded-lg transition-colors ${errors.cvv ? "border-red-500 ring-2 ring-red-500/20" : "focus-visible:ring-2 focus-visible:ring-[#1a1f36]/30"}`}
                  maxLength={4}
                  inputMode="numeric"
                />
                {errors.cvv && <p className="text-xs text-red-500 mt-1">{errors.cvv}</p>}
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-gradient-to-r from-[#0b0f1e] via-[#1a1f36] to-[#2d3250] text-white hover:opacity-95 font-semibold text-base rounded-lg shadow-lg shadow-slate-900/20 transition-opacity"
            >
              <Lock className="h-4 w-4 mr-2" />
              Pay {formatPrice(total)}
            </Button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2 py-2.5">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] font-medium text-muted-foreground">256-bit SSL</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2 py-2.5">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[10px] font-medium text-muted-foreground">PCI DSS</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/50 px-2 py-2.5">
                <CheckCircle className="h-3.5 w-3.5 text-violet-600" />
                <span className="text-[10px] font-medium text-muted-foreground">3D Secure</span>
              </div>
            </div>

            {/* Test mode notice */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Test Mode — Use test card: 4242 4242 4242 4242
              </p>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === "processing" && (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-secondary" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#1a1f36] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <CreditCard className="h-9 w-9 text-[#1a1f36]" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
            <p className="text-sm text-muted-foreground animate-pulse min-h-[20px]">{processingText}</p>
            <div className="mt-6 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1a1f36] via-[#2d3250] to-[#1a1f36] rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Do not close this window</span>
            </div>
          </div>
        )}

        {/* Authenticating Step */}
        {step === "authenticating" && (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-50 dark:bg-blue-950/30 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-blue-100/50 dark:bg-blue-900/30 animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shield className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Bank Authentication</h3>
            <p className="text-sm text-muted-foreground animate-pulse min-h-[20px]">{processingText}</p>
            <div className="mt-6 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secure 3D authentication in progress</span>
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-6 ring-8 ring-red-50/50 dark:ring-red-950/20">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Payment Declined</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Your bank declined this transaction. This may be due to:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-6 list-disc list-inside">
              <li>Insufficient funds</li>
              <li>Card restrictions on online payments</li>
              <li>Incorrect card details</li>
            </ul>
            <div className="flex gap-3 w-full">
              <Button onClick={() => setStep("form")} variant="outline" className="flex-1 h-11 rounded-lg">
                Try Again
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 h-11 bg-gradient-to-r from-[#0b0f1e] via-[#1a1f36] to-[#2d3250] text-white hover:opacity-95 rounded-lg"
              >
                Use Other Method
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function VisaIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" fill="none">
      <rect width="48" height="32" rx="4" fill="#1A1F71" />
      <path
        d="M20.4 21.6h-3.2l2-12.2h3.2l-2 12.2zm13-12.2l-3 8.3-.4-1.8-1-5.3s-.1-1.2-1.6-1.2h-4.8l-.1.3s1.7.4 3.6 1.6l3 11.3h3.3l5-13.2h-4zm-5.7 12.2l1.5-4h-.1l-1.1-5.6-2.5 9.6h2.2z"
        fill="white"
      />
    </svg>
  )
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" fill="none">
      <rect width="48" height="32" rx="4" fill="#252525" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" />
      <path d="M24 10.3a8 8 0 010 11.4 8 8 0 000-11.4z" fill="#FF5F00" />
    </svg>
  )
}

function AmexIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9" fill="none">
      <rect width="48" height="32" rx="4" fill="#2E77BC" />
      <text x="24" y="19" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
        AMEX
      </text>
    </svg>
  )
}

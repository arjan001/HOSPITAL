"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Clock, X } from "lucide-react"

const WINE = "#3D0814"
const ACCENT_ORG = "#F97316"
const ACCENT_RED = "#B91C1C"

export type SessionTimerProps = {
  /** Total free duration in seconds (e.g. 300 for a 5-min chat). */
  maxDurationSec: number
  /** Seconds elapsed since the session started. Caller owns the clock. */
  elapsedSec: number
  /** Show the warning banner when this many seconds remain. */
  warnAtSecondsLeft?: number
  /** Human label for the overage charge, e.g. "KES 200 per 5 extra minutes". */
  overageLabel: string
  /** How many minutes the user gets when they confirm the overage. */
  overageBlockMin: number
  /** Called when the user confirms the overage. Caller extends `maxDurationSec` by `overageBlockMin*60`. */
  onConfirmOverage: () => void
  /** Called when the user declines / lets the auto-end timer run out. */
  onEnd: () => void
  /** Seconds the patient has to confirm overage before we auto-end. */
  confirmGraceSec?: number
  /** Right-aligned compact pill (true) vs. inline (false). */
  compact?: boolean
}

function fmt(sec: number): string {
  const m = String(Math.floor(Math.max(0, sec) / 60)).padStart(2, "0")
  const s = String(Math.max(0, sec) % 60).padStart(2, "0")
  return `${m}:${s}`
}

/**
 * Shared consultation countdown for chat + video calls.
 * Renders nothing while the timer is comfortable, a warning banner
 * inside the final `warnAtSecondsLeft` window, and a hard
 * "confirm overage or end" modal at zero.
 */
export function SessionTimer({
  maxDurationSec,
  elapsedSec,
  warnAtSecondsLeft = 60,
  overageLabel,
  overageBlockMin,
  onConfirmOverage,
  onEnd,
  confirmGraceSec = 30,
  compact = false,
}: SessionTimerProps) {
  const remaining = Math.max(0, maxDurationSec - elapsedSec)
  const expired = remaining <= 0
  const warning = !expired && remaining <= warnAtSecondsLeft

  // Auto-end grace countdown once expired. We hold `onEnd` in a ref so the
  // effect doesn't reset every render when callers pass an inline arrow.
  const onEndRef = useRef(onEnd)
  useEffect(() => { onEndRef.current = onEnd }, [onEnd])
  const [graceLeft, setGraceLeft] = useState<number>(confirmGraceSec)
  useEffect(() => {
    if (!expired) {
      setGraceLeft(confirmGraceSec)
      return
    }
    let ended = false
    const t = window.setInterval(() => {
      setGraceLeft((g) => {
        const next = g - 1
        if (next <= 0) {
          window.clearInterval(t)
          if (!ended) {
            ended = true
            // Defer to avoid setState-during-render warnings.
            window.setTimeout(() => onEndRef.current(), 0)
          }
          return 0
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [expired, confirmGraceSec])

  return (
    <>
      {/* Always-on countdown pill */}
      <div
        className={`${compact ? "inline-flex" : "flex"} items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm`}
        style={{
          background: warning ? "#FFF7ED" : "rgba(255,255,255,0.95)",
          color: warning ? ACCENT_RED : WINE,
          border: warning ? `1px solid ${ACCENT_ORG}` : "1px solid rgba(0,0,0,0.06)",
        }}
        title="Consultation time remaining"
      >
        <Clock className="h-3.5 w-3.5" />
        {fmt(remaining)}
      </div>

      {/* Soft warning banner (final minute) */}
      {warning && (
        <div
          className="fixed left-1/2 -translate-x-1/2 top-4 z-[60] max-w-sm w-[92vw] rounded-lg shadow-lg px-3.5 py-2.5 flex items-start gap-2.5 pointer-events-none"
          style={{ background: "#FFF7ED", border: `1px solid ${ACCENT_ORG}`, color: WINE }}
          role="status"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ACCENT_RED }} />
          <div className="text-xs">
            <p className="font-bold">Less than {fmt(remaining)} remaining on your consultation.</p>
            <p className="mt-0.5" style={{ color: "rgba(0,0,0,0.7)" }}>
              When the timer ends you'll be asked to confirm an overage of <strong>{overageLabel}</strong> to keep talking.
            </p>
          </div>
        </div>
      )}

      {/* Hard expiry modal — patient must opt in to keep talking */}
      {expired && (
        <div className="fixed inset-0 z-[70] bg-black/55 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(185,28,28,0.1)", color: ACCENT_RED }}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base" style={{ color: WINE }}>
                  Consultation time is up
                </p>
                <p className="text-xs mt-1 text-gray-600">
                  Your free window has ended. To keep talking we'll add an overage charge to your bill.
                </p>
              </div>
            </div>

            <div className="mx-5 mb-4 rounded-lg border px-3 py-2.5 text-xs" style={{ background: "#FFF7ED", borderColor: ACCENT_ORG, color: WINE }}>
              <p className="font-semibold">Overage charge</p>
              <p className="mt-0.5">
                <strong>{overageLabel}</strong>. Adds {overageBlockMin} minute{overageBlockMin === 1 ? "" : "s"} to this call.
              </p>
            </div>

            <p className="px-5 text-[11px] text-gray-500 -mt-1.5">
              We'll end the session automatically in <strong>{graceLeft}s</strong> if you don't choose.
            </p>

            <div className="px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={onEnd}
                className="h-10 px-4 rounded-full text-sm font-semibold border bg-white hover:bg-gray-50"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: WINE }}
              >
                <X className="h-4 w-4 inline -mt-0.5 mr-1" />
                End now
              </button>
              <button
                type="button"
                onClick={onConfirmOverage}
                className="h-10 px-4 rounded-full text-sm font-bold text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORG}, ${ACCENT_RED})` }}
              >
                Yes, charge me &amp; continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

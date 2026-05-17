"use client"

import {
  Inbox,
  CreditCard,
  ShieldCheck,
  PackageCheck,
  Truck,
  Home,
  XCircle,
  Clock,
  Sparkles,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"

export type JourneyStatus =
  | "pending"
  | "confirmed"
  | "dispatched"
  | "delivered"
  | "cancelled"

type StageKey =
  | "received"
  | "payment"
  | "verified"
  | "packed"
  | "out_for_delivery"
  | "delivered"

type Stage = {
  key: StageKey
  title: string
  short: string
  detail: string
  icon: typeof Inbox
}

const STAGES: Stage[] = [
  { key: "received",         title: "Order Received",      short: "Received",   detail: "We've got your order safely in our system.",                          icon: Inbox },
  { key: "payment",          title: "Payment Confirmed",   short: "Paid",       detail: "Your payment cleared — thank you for trusting us.",                  icon: CreditCard },
  { key: "verified",         title: "Pharmacist Verified", short: "Verified",   detail: "A licensed pharmacist has reviewed and approved your order.",        icon: ShieldCheck },
  { key: "packed",           title: "Packed & Sealed",     short: "Packed",     detail: "Your medicine is sealed in tamper-evident, temperature-safe packaging.", icon: PackageCheck },
  { key: "out_for_delivery", title: "Out for Delivery",    short: "On the way", detail: "Your courier is on the way — they will call before arrival.",        icon: Truck },
  { key: "delivered",        title: "Delivered",           short: "Delivered",  detail: "Delivered with integrity. Enjoy better health.",                     icon: Home },
]

/* Map the legacy 4-step OrderStatus → how far along the 6-stage journey is. */
function stageIndexFor(status: JourneyStatus): number {
  switch (status) {
    case "pending":    return 0
    case "confirmed":  return 3   // received → paid → verified → packed
    case "dispatched": return 4   // out for delivery
    case "delivered":  return 5
    case "cancelled":  return -1
  }
}

function relTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1)     return "just now"
  if (min < 60)    return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24)     return `${hr} hr ago`
  const days = Math.round(hr / 24)
  if (days < 7)    return `${days} day${days === 1 ? "" : "s"} ago`
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })
}

function formatStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("en-KE", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

/* Synthesise plausible per-stage timestamps starting from createdAt
   so the journey feels real even with in-memory / sample orders. */
function buildTimeline(createdAt: string, currentIdx: number): Array<{ stamp?: string; rel?: string }> {
  const base = new Date(createdAt).getTime() || Date.now()
  // realistic gaps between stages (in minutes)
  const gaps = [0, 8, 40, 75, 180, 360]
  return STAGES.map((_, i) => {
    if (i > currentIdx) return {}
    const t = new Date(base + gaps[i]! * 60000).toISOString()
    return { stamp: formatStamp(t), rel: relTime(t) }
  })
}

function etaFor(status: JourneyStatus, createdAt: string): { label: string; tone: "wait" | "soon" | "done" | "cancelled" } {
  switch (status) {
    case "delivered":
      return { label: "Delivered to your door", tone: "done" }
    case "cancelled":
      return { label: "Order cancelled", tone: "cancelled" }
    case "dispatched":
      return { label: "Arriving in ~45 minutes", tone: "soon" }
    case "confirmed":
      return { label: "Dispatching within the hour", tone: "soon" }
    case "pending":
    default: {
      const ageMin = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
      return { label: ageMin < 15 ? "Confirming now" : "Pharmacist reviewing", tone: "wait" }
    }
  }
}

export function OrderJourney({
  status,
  createdAt,
  orderNumber,
  hasPrescription = true,
}: {
  status: JourneyStatus
  createdAt: string
  orderNumber?: string
  hasPrescription?: boolean
}) {
  const cancelled = status === "cancelled"
  const idx = stageIndexFor(status)
  const stages = hasPrescription ? STAGES : STAGES.filter((s) => s.key !== "verified")
  // recompute current index against the (possibly filtered) stages
  const effectiveIdx = (() => {
    if (cancelled) return -1
    if (hasPrescription) return idx
    // remove the "verified" slot (index 2) when no prescription
    return idx <= 2 ? idx : idx - 1
  })()
  const timeline = buildTimeline(createdAt, effectiveIdx)
  const eta = etaFor(status, createdAt)

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-white">
      {/* Header band */}
      <div
        className="px-5 sm:px-7 py-5 text-white relative overflow-hidden"
        style={{ background: cancelled ? "#7F1D1D" : `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
      >
        <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full opacity-15"
             style={{ background: cancelled ? ACCENT_RED : `radial-gradient(circle, ${ACCENT_ORANGE} 0%, transparent 70%)` }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 font-semibold mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Live order journey
            </p>
            <h3 className="text-lg sm:text-xl font-bold leading-snug">
              {cancelled ? "This order was cancelled" : eta.label}
            </h3>
            {orderNumber && (
              <p className="text-xs text-white/70 mt-1 font-mono">{orderNumber}</p>
            )}
          </div>
          {!cancelled && (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold backdrop-blur"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              <Clock className="h-3.5 w-3.5" />
              {eta.tone === "soon" ? "Arriving soon" : eta.tone === "done" ? "Complete" : "In progress"}
            </div>
          )}
        </div>
      </div>

      {/* Cancelled banner */}
      {cancelled && (
        <div className="px-5 sm:px-7 py-4 bg-red-50 border-b border-red-100 flex items-start gap-3">
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
          <p className="text-sm text-red-900">
            This order was cancelled. Any payment will be refunded within 3 working days. If you believe this is an error,
            please contact us — we'll make it right.
          </p>
        </div>
      )}

      {/* Horizontal stepper (≥ md) */}
      {!cancelled && (
        <div className="hidden md:block px-7 pt-8 pb-7" style={{ background: CREAM }}>
          <div className="relative">
            {/* base track */}
            <div className="absolute left-[5%] right-[5%] top-7 h-1 rounded-full bg-neutral-200" />
            {/* progress track */}
            <div
              className="absolute left-[5%] top-7 h-1 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.max(0, (effectiveIdx / (stages.length - 1)) * 90)}%`,
                background: `linear-gradient(90deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                boxShadow: `0 0 12px ${ACCENT_ORANGE}55`,
              }}
            />
            <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
              {stages.map((stage, i) => {
                const done = i <= effectiveIdx
                const current = i === effectiveIdx
                const Icon = stage.icon
                return (
                  <li key={stage.key} className="flex flex-col items-center text-center px-1">
                    <div
                      className={`relative w-14 h-14 rounded-full grid place-items-center transition-all duration-500 ${current ? "scale-110" : ""}`}
                      style={{
                        background: done
                          ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`
                          : "#fff",
                        color: done ? "#fff" : "#9CA3AF",
                        border: done ? "none" : "2px solid #E5E7EB",
                        boxShadow: current
                          ? `0 0 0 5px ${CREAM}, 0 0 0 8px ${ACCENT_ORANGE}, 0 12px 24px -8px ${ACCENT_RED}55`
                          : done ? `0 8px 20px -8px ${ACCENT_RED}66` : "none",
                      }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                      {current && (
                        <span
                          className="absolute inset-0 rounded-full animate-ping"
                          style={{ background: ACCENT_ORANGE, opacity: 0.35 }}
                        />
                      )}
                    </div>
                    <p
                      className="text-[12px] font-bold mt-3 leading-tight"
                      style={{ color: done ? WINE : "#9CA3AF" }}
                    >
                      {stage.title}
                    </p>
                    {timeline[i]?.rel && (
                      <p className="text-[10px] text-neutral-500 mt-0.5">{timeline[i]!.rel}</p>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Current stage spotlight */}
          {effectiveIdx >= 0 && effectiveIdx < stages.length && (
            <div
              className="mt-7 rounded-xl p-4 flex items-start gap-3 border"
              style={{ background: "#fff", borderColor: "#FFE3CF" }}
            >
              <div
                className="w-10 h-10 rounded-full grid place-items-center flex-shrink-0 text-white"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
              >
                {(() => {
                  const Icon = stages[effectiveIdx]!.icon
                  return <Icon className="h-5 w-5" />
                })()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500">Right now</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: WINE }}>
                  {stages[effectiveIdx]!.title}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">{stages[effectiveIdx]!.detail}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vertical timeline (mobile + cancelled detail) */}
      <div className={`${cancelled ? "" : "md:hidden"} px-5 sm:px-7 py-6`}>
        <ol className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-neutral-200" />
          {stages.map((stage, i) => {
            const done = !cancelled && i <= effectiveIdx
            const current = !cancelled && i === effectiveIdx
            const Icon = stage.icon
            return (
              <li key={stage.key} className="relative pl-12 pb-5 last:pb-0">
                <div
                  className="absolute left-0 top-0 w-10 h-10 rounded-full grid place-items-center"
                  style={{
                    background: done
                      ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`
                      : "#F3F4F6",
                    color: done ? "#fff" : "#9CA3AF",
                    boxShadow: current ? `0 0 0 3px ${CREAM}, 0 0 0 5px ${ACCENT_ORANGE}` : "none",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{ color: done ? WINE : "#9CA3AF" }}
                  >
                    {stage.title}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">{stage.detail}</p>
                  {timeline[i]?.stamp && (
                    <p className="text-[11px] text-neutral-500 mt-1 font-mono">{timeline[i]!.stamp}</p>
                  )}
                  {current && (
                    <span
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: ACCENT_ORANGE + "22", color: ACCENT_RED }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: ACCENT_RED }} />
                      In progress
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

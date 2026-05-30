"use client"

import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * TrustSeal — a reusable "Trust Seal" / "Verified" badge for the Shaniid RX brand.
 *
 * The shield motif communicates protection against counterfeit products, so it is
 * only surfaced on items we can vouch for (genuine / verified / active). Callers
 * decide when to render it; today we default to in-stock products and listed
 * partners, but this can later be gated on a real per-item `verified` field.
 *
 * Brand: wine (#3D0814) + orange (#F97316). No emojis.
 */

const WINE = "#3D0814"
const ORANGE = "#F97316"

export interface TrustSealProps {
  /** Short label shown next to the shield, e.g. "Genuine" / "Verified". */
  label?: string
  size?: "xs" | "sm" | "md"
  variant?: "soft" | "solid"
  className?: string
  /** Tooltip text on hover. */
  title?: string
}

const SIZES = {
  xs: { wrap: "px-1.5 py-0.5 text-[9px] gap-0.5", icon: "h-2.5 w-2.5" },
  sm: { wrap: "px-2 py-0.5 text-[10px] gap-1", icon: "h-3 w-3" },
  md: { wrap: "px-2.5 py-1 text-xs gap-1.5", icon: "h-3.5 w-3.5" },
} as const

export function TrustSeal({
  label = "Genuine",
  size = "sm",
  variant = "soft",
  className,
  title = "Verified genuine — protected against counterfeits by Shaniid RX",
}: TrustSealProps) {
  const dims = SIZES[size]

  if (variant === "solid") {
    return (
      <span
        title={title}
        className={cn(
          "inline-flex items-center font-semibold tracking-wide uppercase rounded-full text-white",
          dims.wrap,
          className,
        )}
        style={{
          background: `linear-gradient(135deg, ${WINE} 0%, ${ORANGE} 150%)`,
          boxShadow: "0 4px 10px -5px rgba(61,8,20,0.55)",
        }}
      >
        <ShieldCheck className={dims.icon} strokeWidth={2.5} />
        {label}
      </span>
    )
  }

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center font-semibold tracking-wide uppercase rounded-full border",
        dims.wrap,
        className,
      )}
      style={{
        background: "rgba(61,8,20,0.06)",
        borderColor: "rgba(61,8,20,0.18)",
        color: WINE,
      }}
    >
      <ShieldCheck className={dims.icon} strokeWidth={2.5} style={{ color: ORANGE }} />
      {label}
    </span>
  )
}

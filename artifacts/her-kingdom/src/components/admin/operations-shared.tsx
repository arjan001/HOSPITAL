"use client"

import type { ReactNode } from "react"

/** Shared admin operations UI tokens (procurement + supplier workflows). */
export const OPS_WINE = "#3D0814"
export const OPS_WINE_SOFT = "#6B0F1A"
export const OPS_ORANGE = "#F97316"
export const OPS_BORDER = "#F2DCC8"

export const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-900 border-rose-200",
  high: "bg-amber-100 text-amber-900 border-amber-200",
  normal: "bg-sky-100 text-sky-900 border-sky-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
}

export const DECISION_STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900 border-amber-200",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ordered: "bg-violet-50 text-violet-900 border-violet-200",
  rejected: "bg-slate-100 text-slate-600 border-slate-200",
}

export const ALLOCATION_STATUS_STYLE: Record<string, string> = {
  reserved: "bg-amber-50 text-amber-900 border-amber-200",
  committed: "bg-emerald-50 text-emerald-900 border-emerald-200",
  released: "bg-slate-100 text-slate-600 border-slate-200",
}

export const ASSEMBLY_STATUS_STYLE: Record<string, string> = {
  queued: "bg-slate-100 text-slate-700 border-slate-200",
  allocating: "bg-amber-50 text-amber-900 border-amber-200",
  picking: "bg-sky-50 text-sky-900 border-sky-200",
  assembled: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ready: "bg-violet-50 text-violet-900 border-violet-200",
  dispatched: "bg-indigo-50 text-indigo-900 border-indigo-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
}

export function OpsPanel({
  title,
  subtitle,
  badge,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  badge?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      className="rounded-2xl border bg-card overflow-hidden shadow-sm"
      style={{ borderColor: OPS_BORDER }}
    >
      <div
        className="px-5 py-4 border-b flex flex-wrap items-start justify-between gap-3"
        style={{
          borderColor: OPS_BORDER,
          background: "linear-gradient(180deg, #FFF6EE 0%, #FFFBF5 100%)",
        }}
      >
        <div>
          {badge && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {badge}
            </p>
          )}
          <h2 className="text-lg font-serif" style={{ color: OPS_WINE }}>
            {title}
          </h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-xl">{subtitle}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

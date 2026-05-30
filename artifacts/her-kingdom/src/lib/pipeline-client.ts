/**
 * Pipeline client — thin wrapper over /api/v2/admin/pipeline/* automation
 * endpoints. Each helper triggers a server-side scan/recompute that reads
 * from cmsStore (synced via /api/v2/admin/cms) and writes derived results
 * back to cmsStore, while pushing an admin notification.
 *
 * All helpers are fire-and-await — UI should disable the trigger button
 * while a call is in flight and toast the result.
 */

const BASE = "/api/v2/admin/pipeline"

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Pipeline ${path} failed: ${res.status} ${text.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Pipeline ${path} failed: ${res.status} ${text.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export type SourcingScanResult = {
  rulesEvaluated: number
  requestsCreated: number
  flagged: Array<{ sku: string; productName: string; reason: string }>
}

export type MarginRecommendation = {
  sku: string
  ourCost: number
  marketLow: number
  marketAvg: number
  recommendedPrice: number
  targetMarginPct: number
  delta: number
  status: "above_market" | "at_market" | "below_market" | "no_data"
}

export type TradingRecomputeResult = {
  recomputed: number
  aboveMarket: number
  belowMarket: number
  recommendations: MarginRecommendation[]
}

export type QaScanResult = {
  flags: Array<{
    id: string
    sku: string
    name: string
    batchRef?: string
    expiryDate?: string
    daysToExpiry: number
    severity: "critical" | "warning" | "expired" | "low_stock"
    blockDispatch: boolean
    flaggedAt: string
  }>
  expired: number
  critical: number
  warning: number
}

export type LogisticsAssignResult = {
  assigned: number
  skipped: number
  slaAtRisk: number
  notes: string[]
}

export type CommunicationsSendResult = {
  ok: boolean
  channel: string
  preview: string
  skipped?: boolean
  reason?: string
}

export type OutboxStatus = "queued" | "sent" | "failed"

export type OutboxRow = {
  id: string
  templateId: string
  channel: "email" | "sms" | "whatsapp"
  to: string
  subject: string
  body: string
  queuedAt: string
  status: OutboxStatus
  lastAttemptAt?: string
  reason?: string
}

export const pipelineClient = {
  sourcing: { scan: () => post<SourcingScanResult>("/sourcing/scan") },
  trading: {
    recomputeMargins: (targetMarginPct = 25) =>
      post<TradingRecomputeResult>("/trading/recompute-margins", { targetMarginPct }),
  },
  qa: { scanExpiry: () => post<QaScanResult>("/qa/scan-expiry") },
  logistics: { autoAssign: () => post<LogisticsAssignResult>("/logistics/auto-assign") },
  communications: {
    send: (templateId: string, to: string, variables?: Record<string, string | number>) =>
      post<CommunicationsSendResult>("/communications/send", { templateId, to, variables }),
    preview: (templateId: string, variables?: Record<string, string | number>) =>
      post<{ channel: string; subject: string; body: string }>("/communications/preview", {
        templateId,
        variables,
      }),
    outbox: {
      list: () => get<OutboxRow[]>("/communications/outbox"),
      resend: (id: string) =>
        post<{ ok: boolean; status: OutboxStatus; reason?: string }>(
          `/communications/outbox/${encodeURIComponent(id)}/resend`,
        ),
      dismiss: (id: string) =>
        post<{ removed: boolean }>(
          `/communications/outbox/${encodeURIComponent(id)}/dismiss`,
        ),
      clearSent: () => post<{ removed: number }>("/communications/outbox/clear-sent"),
    },
  },
  status: () =>
    fetch(`${BASE}/status`, { credentials: "include" }).then((r) =>
      r.ok ? (r.json() as Promise<unknown>) : null,
    ),
}

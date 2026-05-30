/**
 * Pipeline module — background task orchestration and campaign delivery.
 *
 * This module provides the server-side engine for the admin Campaigns UI
 * (email / SMS / WhatsApp sequences). A pipeline is a named sequence of
 * steps; each step fires a message to a target audience after a delay.
 *
 * Routes:
 *   GET    /api/v2/pipeline/pipelines              — list all pipelines
 *   POST   /api/v2/pipeline/pipelines              — create a pipeline
 *   GET    /api/v2/pipeline/pipelines/:id          — get pipeline detail + steps
 *   PUT    /api/v2/pipeline/pipelines/:id          — update pipeline config
 *   DELETE /api/v2/pipeline/pipelines/:id          — delete a pipeline
 *   POST   /api/v2/pipeline/pipelines/:id/activate — start execution
 *   POST   /api/v2/pipeline/pipelines/:id/pause    — pause execution
 *   GET    /api/v2/pipeline/jobs                   — list all scheduled jobs
 *   POST   /api/v2/pipeline/jobs/:id/run           — trigger a job immediately
 *   GET    /api/v2/pipeline/jobs/:id/logs          — execution log for a job
 *
 * Step types:
 *   email | sms | whatsapp | delay | condition | webhook
 *
 * Storage:
 *   In-memory Maps (pipelines, steps, jobs, logs). Postgres swap = Drizzle
 *   pipeline + job tables; no controller changes.
 *
 * Integration:
 *   Steps of type "email" delegate to EmailModule, "sms"/"whatsapp" to
 *   the SMS provider (Twilio / Africa's Talking — env-gated, not yet wired).
 *
 * Note on @Inject(PipelineService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import { AdminCmsModule } from "./admin-cms.module"
import { EmailModule, EmailService } from "./email.module"
import { NotificationsModule, NotificationsService } from "./notifications.module"
import {
  WhatsAppModule,
  WhatsAppService,
  orderedTemplateTokens,
  normalizeLanguageCode,
} from "./whatsapp.module"
import { SmsModule, SmsService } from "./sms.module"
import { db, communicationOutbox, communicationSentLog } from "@workspace/db"
import { desc, eq } from "drizzle-orm"
import { AdminGuard } from "../common/admin-guard"

/**
 * Pipeline automation — server-side intelligence layer on top of cmsStore.
 *
 * Data is owned by the storefront cmsStore (dual-writes to /api/v2/admin/cms).
 * This module READS cmsStore via a thin internal client (NestJS app talks to
 * itself over HTTP so we don't have to inject AdminCmsService — keeps the
 * automation logic decoupled and easy to port to a worker later) and writes
 * back derived results to the same store.
 *
 * Five pipelines:
 *   - Sourcing       → scan inventory + forecast → create requests
 *   - Trading        → recompute margins vs competitor prices
 *   - QA & Assurance → expiry-window flagging, dispatch readiness
 *   - Logistics      → auto-assign riders to deliveries, SLA scan
 *   - Communications → resolve template + send (email via EmailService)
 *
 * All admin pipeline endpoints are gated by `AdminGuard` (token-based today,
 * Clerk-admin once that lands). Endpoints are idempotent — running an
 * automation twice yields the same result if upstream data didn't change.
 */

const CMS_BASE = `http://127.0.0.1:${process.env.PORT || 8090}/api/v2/admin/cms`
const CMS_TIMEOUT_MS = 4_000
const INTERNAL_TOKEN = process.env.ADMIN_API_TOKEN?.trim()
const INTERNAL_HEADERS: Record<string, string> = INTERNAL_TOKEN
  ? { "x-admin-token": INTERNAL_TOKEN }
  : {}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)),
  ])
}

async function cmsGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await withTimeout(
      fetch(`${CMS_BASE}/${encodeURIComponent(key)}`, { headers: INTERNAL_HEADERS }),
      CMS_TIMEOUT_MS,
    )
    if (res.status === 404) return fallback
    if (!res.ok) {
      throw new HttpException(`CMS read failed for ${key}: ${res.status}`, HttpStatus.BAD_GATEWAY)
    }
    const body = (await res.json()) as { value: T }
    return body.value ?? fallback
  } catch (err) {
    if (err instanceof HttpException) throw err
    throw new HttpException(
      `CMS read failed for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      HttpStatus.BAD_GATEWAY,
    )
  }
}

async function cmsPut<T>(key: string, value: T): Promise<void> {
  try {
    const res = await withTimeout(
      fetch(`${CMS_BASE}/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...INTERNAL_HEADERS },
        body: JSON.stringify(value),
      }),
      CMS_TIMEOUT_MS,
    )
    if (!res.ok) {
      throw new HttpException(`CMS write failed for ${key}: ${res.status}`, HttpStatus.BAD_GATEWAY)
    }
  } catch (err) {
    if (err instanceof HttpException) throw err
    throw new HttpException(
      `CMS write failed for ${key}: ${err instanceof Error ? err.message : String(err)}`,
      HttpStatus.BAD_GATEWAY,
    )
  }
}

function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
}

/* ---------- Types (mirrors of storefront types — kept loose intentionally) ---------- */

type SourcingRule = {
  id: string
  name: string
  trigger: "low_stock" | "expiry_soon" | "refill_prediction" | "manual_scan"
  isActive: boolean
  conditions: { expiryWindowDays?: number; onHandRatio?: number; types?: string[] }
  action: string
  defaultPriority: "low" | "normal" | "high" | "urgent"
  defaultQty?: number
  lastRunAt?: string
  lastRunSummary?: string
}

type InventoryItem = {
  id: string
  sku: string
  productName: string
  type?: string
  onHand: number
  safetyStock: number
  reorderPoint: number
  batchExpiry?: string
}

type SourcingRequest = {
  id: string
  productName: string
  sku?: string
  qty: number
  priority: "low" | "normal" | "high" | "urgent"
  source: string
  status: "draft" | "open" | "quoting" | "ordered" | "received" | "cancelled"
  notes?: string
  createdAt: string
  updatedAt: string
}

type QaInventory = {
  id: string
  name: string
  sku: string
  batchRef?: string
  expiryDate?: string
  stock: number
  safetyStock: number
}

type QaConfig = {
  expiryWarningDays: number
  expiryCriticalDays: number
  blockExpiredFromDispatch: boolean
}

type LogisticsDelivery = {
  id: string
  orderRef: string
  customerName: string
  customerPhone?: string
  zoneId?: string
  batchId?: string
  riderId?: string
  status: "pending" | "assigned" | "dispatched" | "out_for_delivery" | "delivered" | "failed"
  attempts: number
}

type LogisticsRider = {
  id: string
  name: string
  zoneId?: string
  capacity: number
  active: boolean
  coldChainCapable?: boolean
}

type LogisticsConfig = {
  targetOrdersPerBatch?: number
  targetSlaHours?: number
  autoAssignRiders?: boolean
}

type MessageTemplate = {
  id: string
  name: string
  channel: "email" | "sms" | "whatsapp"
  trigger?: string
  subject: string
  body: string
  enabled: boolean
  /** Meta-approved WhatsApp template name (for channel === "whatsapp"). */
  whatsappTemplateName?: string
}

/** Delivery lifecycle for an auto-text, mirrored from Meta status callbacks. */
type SentLogStatus = "sent" | "delivered" | "read" | "failed" | "queued"

/** Delivery state for a queued/outbox message (admin visibility + retry). */
type OutboxStatus = "queued" | "sent" | "failed"

/** One row in the `communications.outbox` cmsStore key (admin visibility + retry). */
type OutboxRow = {
  id: string
  templateId: string
  channel: MessageTemplate["channel"]
  to: string
  subject: string
  body: string
  queuedAt: string
  /** queued (never delivered) → sent (delivered on retry) → failed (retry errored). */
  status: OutboxStatus
  /** ISO timestamp of the most recent resend attempt, if any. */
  lastAttemptAt?: string
  /** Why the last attempt failed / was skipped (provider not configured, etc). */
  reason?: string
}

/** One row in the `communications.sent-log` cmsStore key (admin visibility). */
type SentLogRow = {
  id: string
  at: string
  channel: "email" | "sms" | "whatsapp"
  to: string
  trigger: string
  templateId: string
  /** Meta template name when sent as a template (vs. free-form text). */
  templateName?: string
  /** Language code the template was sent in (Meta templates only). */
  language?: string
  /** Provider message id — the key the Meta status webhook matches on. */
  messageId?: string
  status: SentLogStatus
  reason?: string
  preview: string
  deliveredAt: string | null
  readAt: string | null
}

/* ---------- Sourcing ---------- */

@Injectable()
class SourcingAutomationService {
  async scan(): Promise<{
    rulesEvaluated: number
    requestsCreated: number
    flagged: Array<{ sku: string; productName: string; reason: string }>
  }> {
    const [rules, inventory, requests] = await Promise.all([
      cmsGet<SourcingRule[]>("sourcing-automation-rules", []),
      cmsGet<InventoryItem[]>("sourcing-inventory", []),
      cmsGet<SourcingRequest[]>("sourcing-requests", []),
    ])

    const active = rules.filter((r) => r.isActive)
    const openSkus = new Set(
      requests
        .filter((r) => r.status === "open" || r.status === "draft" || r.status === "quoting")
        .map((r) => r.sku)
        .filter(Boolean) as string[],
    )

    const flagged: Array<{ sku: string; productName: string; reason: string }> = []
    const created: SourcingRequest[] = []
    const now = new Date().toISOString()

    for (const item of inventory) {
      if (openSkus.has(item.sku)) continue

      for (const rule of active) {
        let triggered = false
        let reason = ""

        if (rule.trigger === "low_stock") {
          const ratio = item.safetyStock > 0 ? item.onHand / item.safetyStock : 1
          const threshold = rule.conditions.onHandRatio ?? 1
          if (item.onHand <= item.reorderPoint || ratio <= threshold) {
            triggered = true
            reason = `On hand ${item.onHand} ≤ reorder point ${item.reorderPoint}`
          }
        } else if (rule.trigger === "expiry_soon" && item.batchExpiry) {
          const days = Math.ceil(
            (new Date(item.batchExpiry).getTime() - Date.now()) / 86_400_000,
          )
          const window = rule.conditions.expiryWindowDays ?? 60
          if (days <= window) {
            triggered = true
            reason = `Batch expires in ${days} day(s)`
          }
        }

        if (triggered && (!rule.conditions.types || rule.conditions.types.includes(item.type ?? ""))) {
          flagged.push({ sku: item.sku, productName: item.productName, reason })
          created.push({
            id: newId("req"),
            productName: item.productName,
            sku: item.sku,
            qty: rule.defaultQty ?? Math.max(item.reorderPoint * 2 - item.onHand, item.safetyStock),
            priority: rule.defaultPriority,
            source: rule.trigger === "low_stock" ? "low_stock" : "expiry_replacement",
            status: "open",
            notes: `Auto-generated by rule "${rule.name}" — ${reason}`,
            createdAt: now,
            updatedAt: now,
          })
          break // one rule per item
        }
      }
    }

    if (created.length > 0) {
      await cmsPut("sourcing-requests", [...created, ...requests])
    }

    const updatedRules = rules.map((r) =>
      r.isActive
        ? { ...r, lastRunAt: now, lastRunSummary: `${created.length} request(s) created` }
        : r,
    )
    await cmsPut("sourcing-automation-rules", updatedRules)

    return {
      rulesEvaluated: active.length,
      requestsCreated: created.length,
      flagged,
    }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/pipeline/sourcing")
class SourcingPipelineController {
  constructor(
    @Inject(SourcingAutomationService) private readonly svc: SourcingAutomationService,
    @Inject(NotificationsService) private readonly notif: NotificationsService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  @Post("scan")
  async scan() {
    const result = await this.svc.scan()
    if (result.requestsCreated > 0) {
      this.notif.push("admin", {
        module: "sourcing",
        level: "info",
        title: `Sourcing automation: ${result.requestsCreated} request(s) created`,
        body: `${result.flagged.length} item(s) flagged across ${result.rulesEvaluated} active rule(s).`,
        href: "/admin/sourcing/automation",
      })
      void this.email
        .send({
          to: process.env.ADMIN_EMAIL || "admin@shaniidrx.com",
          template: "admin.low_stock",
          subject: `[Sourcing] ${result.requestsCreated} replenishment request(s) auto-created`,
          data: {
            count: result.requestsCreated,
            items: result.flagged
              .map((f) => `${f.productName} (${f.sku}) — ${f.reason}`)
              .join("\n"),
          },
        })
        .catch(() => undefined)
    }
    return result
  }
}

/* ---------- Trading ---------- */

type PriceHistoryRow = { sku: string; unitCost: number; currency: string; capturedAt: string }
type CompetitorRow = { sku: string; competitor: string; unitPrice: number; capturedAt: string }
type MarginRecommendation = {
  sku: string
  ourCost: number
  marketLow: number
  marketAvg: number
  recommendedPrice: number
  targetMarginPct: number
  delta: number
  status: "above_market" | "at_market" | "below_market" | "no_data"
}

@Injectable()
class TradingAutomationService {
  async recomputeMargins(targetMarginPct = 25): Promise<{
    recomputed: number
    aboveMarket: number
    belowMarket: number
    recommendations: MarginRecommendation[]
  }> {
    const [history, competitor] = await Promise.all([
      cmsGet<PriceHistoryRow[]>("sourcing-price-history", []),
      cmsGet<CompetitorRow[]>("sourcing-competitor-prices", []),
    ])

    const ourBySku = new Map<string, PriceHistoryRow>()
    for (const row of history) {
      if (typeof row?.unitCost !== "number") continue
      const cur = ourBySku.get(row.sku)
      if (!cur || (row.capturedAt ?? "") > (cur.capturedAt ?? "")) ourBySku.set(row.sku, row)
    }

    const competitorBySku = new Map<string, number[]>()
    for (const row of competitor) {
      if (typeof row?.unitPrice !== "number") continue
      const arr = competitorBySku.get(row.sku) ?? []
      arr.push(row.unitPrice)
      competitorBySku.set(row.sku, arr)
    }

    const recommendations: MarginRecommendation[] = []
    let above = 0
    let below = 0
    for (const [sku, our] of ourBySku) {
      const prices = competitorBySku.get(sku) ?? []
      if (prices.length === 0) {
        recommendations.push({
          sku,
          ourCost: our.unitCost,
          marketLow: 0,
          marketAvg: 0,
          recommendedPrice: Math.round(our.unitCost * (1 + targetMarginPct / 100)),
          targetMarginPct,
          delta: 0,
          status: "no_data",
        })
        continue
      }
      const marketLow = Math.min(...prices)
      const marketAvg = prices.reduce((a, b) => a + b, 0) / prices.length
      const targetPrice = our.unitCost * (1 + targetMarginPct / 100)
      const recommendedPrice = Math.min(targetPrice, marketLow * 0.97) // undercut slightly
      const delta = recommendedPrice - marketAvg
      let status: MarginRecommendation["status"] = "at_market"
      if (delta > marketAvg * 0.03) {
        status = "above_market"
        above++
      } else if (delta < -marketAvg * 0.03) {
        status = "below_market"
        below++
      }
      recommendations.push({
        sku,
        ourCost: our.unitCost,
        marketLow: Math.round(marketLow),
        marketAvg: Math.round(marketAvg),
        recommendedPrice: Math.round(recommendedPrice),
        targetMarginPct,
        delta: Math.round(delta),
        status,
      })
    }

    await cmsPut("trading-margin-recommendations", {
      generatedAt: new Date().toISOString(),
      targetMarginPct,
      recommendations,
    })

    return { recomputed: recommendations.length, aboveMarket: above, belowMarket: below, recommendations }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/pipeline/trading")
class TradingPipelineController {
  constructor(
    @Inject(TradingAutomationService) private readonly svc: TradingAutomationService,
    @Inject(NotificationsService) private readonly notif: NotificationsService,
  ) {}

  @Post("recompute-margins")
  async recompute(@Body() body: { targetMarginPct?: number }) {
    const result = await this.svc.recomputeMargins(body?.targetMarginPct ?? 25)
    this.notif.push("admin", {
      module: "trading",
      level: result.aboveMarket > result.recomputed * 0.3 ? "warn" : "info",
      title: `Margin recompute: ${result.recomputed} SKU(s)`,
      body: `${result.aboveMarket} above market, ${result.belowMarket} below market.`,
      href: "/admin/trading/negotiation",
    })
    return result
  }
}

/* ---------- QA & Assurance ---------- */

type QaFlag = {
  id: string
  sku: string
  name: string
  batchRef?: string
  expiryDate?: string
  daysToExpiry: number
  severity: "critical" | "warning" | "expired" | "low_stock"
  blockDispatch: boolean
  flaggedAt: string
}

@Injectable()
class QaAutomationService {
  async scanExpiry(): Promise<{ flags: QaFlag[]; expired: number; critical: number; warning: number }> {
    const [inventory, config] = await Promise.all([
      cmsGet<QaInventory[]>("qa.inventory", []),
      cmsGet<QaConfig>("qa.config", {
        expiryWarningDays: 60,
        expiryCriticalDays: 14,
        blockExpiredFromDispatch: true,
      }),
    ])

    const now = Date.now()
    const flags: QaFlag[] = []
    let expired = 0
    let critical = 0
    let warning = 0

    for (const item of inventory) {
      if (item.expiryDate) {
        const days = Math.ceil((new Date(item.expiryDate).getTime() - now) / 86_400_000)
        let severity: QaFlag["severity"] | null = null
        if (days < 0) {
          severity = "expired"
          expired++
        } else if (days <= config.expiryCriticalDays) {
          severity = "critical"
          critical++
        } else if (days <= config.expiryWarningDays) {
          severity = "warning"
          warning++
        }
        if (severity) {
          flags.push({
            id: newId("qaflag"),
            sku: item.sku,
            name: item.name,
            batchRef: item.batchRef,
            expiryDate: item.expiryDate,
            daysToExpiry: days,
            severity,
            blockDispatch: severity === "expired" && config.blockExpiredFromDispatch,
            flaggedAt: new Date().toISOString(),
          })
        }
      }
      if (item.stock <= item.safetyStock) {
        flags.push({
          id: newId("qaflag"),
          sku: item.sku,
          name: item.name,
          batchRef: item.batchRef,
          daysToExpiry: 9999,
          severity: "low_stock",
          blockDispatch: false,
          flaggedAt: new Date().toISOString(),
        })
      }
    }

    await cmsPut("qa.expiry-flags", { generatedAt: new Date().toISOString(), flags })
    return { flags, expired, critical, warning }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/pipeline/qa")
class QaPipelineController {
  constructor(
    @Inject(QaAutomationService) private readonly svc: QaAutomationService,
    @Inject(NotificationsService) private readonly notif: NotificationsService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  @Post("scan-expiry")
  async scan() {
    const result = await this.svc.scanExpiry()
    if (result.expired > 0 || result.critical > 0) {
      this.notif.push("admin", {
        module: "qa",
        level: result.expired > 0 ? "error" : "warn",
        title: `QA scan: ${result.expired} expired, ${result.critical} critical`,
        body: `${result.warning} item(s) within warning window. Expired stock auto-blocked from dispatch.`,
        href: "/admin/qa/batches",
      })
      void this.email
        .send({
          to: process.env.ADMIN_EMAIL || "admin@shaniidrx.com",
          template: "admin.low_stock",
          subject: `[QA Alert] ${result.expired} expired · ${result.critical} critical batch(es) detected`,
          data: {
            count: result.expired + result.critical,
            items: result.flags
              .filter((f) => f.severity === "expired" || f.severity === "critical")
              .slice(0, 10)
              .map(
                (f) =>
                  `${f.name} (${f.sku}) — ${f.severity}${f.expiryDate ? `, exp. ${f.expiryDate}` : ""}`,
              )
              .join("\n"),
          },
        })
        .catch(() => undefined)
    }
    return result
  }
}

/* ---------- Logistics ---------- */

@Injectable()
class LogisticsAutomationService {
  async autoAssign(): Promise<{
    assigned: number
    skipped: number
    slaAtRisk: number
    notes: string[]
  }> {
    const [deliveries, riders, config] = await Promise.all([
      cmsGet<LogisticsDelivery[]>("logistics.deliveries", []),
      cmsGet<LogisticsRider[]>("logistics.riders", []),
      cmsGet<LogisticsConfig>("logistics.config", {
        targetOrdersPerBatch: 8,
        targetSlaHours: 4,
        autoAssignRiders: true,
      }),
    ])

    if (!config.autoAssignRiders) {
      return { assigned: 0, skipped: deliveries.length, slaAtRisk: 0, notes: ["Auto-assign disabled in config"] }
    }

    const load = new Map<string, number>()
    for (const d of deliveries) {
      if (d.riderId) load.set(d.riderId, (load.get(d.riderId) ?? 0) + 1)
    }

    const activeRiders = riders.filter((r) => r.active)
    const notes: string[] = []
    let assigned = 0
    let skipped = 0
    let atRisk = 0

    const updated = deliveries.map((d) => {
      if (d.status !== "pending" || d.riderId) {
        skipped++
        return d
      }
      // pick lowest-loaded rider whose zone matches
      const candidates = activeRiders
        .filter((r) => !d.zoneId || !r.zoneId || r.zoneId === d.zoneId)
        .filter((r) => (load.get(r.id) ?? 0) < r.capacity)
        .sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0))
      const rider = candidates[0]
      if (!rider) {
        atRisk++
        notes.push(`No rider for ${d.orderRef} (zone ${d.zoneId ?? "any"})`)
        skipped++
        return d
      }
      load.set(rider.id, (load.get(rider.id) ?? 0) + 1)
      assigned++
      return { ...d, riderId: rider.id, status: "assigned" as const }
    })

    if (assigned > 0) await cmsPut("logistics.deliveries", updated)
    return { assigned, skipped, slaAtRisk: atRisk, notes: notes.slice(0, 10) }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/pipeline/logistics")
class LogisticsPipelineController {
  constructor(
    @Inject(LogisticsAutomationService) private readonly svc: LogisticsAutomationService,
    @Inject(NotificationsService) private readonly notif: NotificationsService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  @Post("auto-assign")
  async assign() {
    const result = await this.svc.autoAssign()
    if (result.assigned > 0 || result.slaAtRisk > 0) {
      this.notif.push("admin", {
        module: "logistics",
        level: result.slaAtRisk > 0 ? "warn" : "info",
        title: `Logistics: ${result.assigned} assigned, ${result.slaAtRisk} at risk`,
        body:
          result.slaAtRisk > 0
            ? `${result.slaAtRisk} delivery(s) lack rider capacity. Review queue.`
            : `${result.assigned} pending delivery(s) auto-assigned.`,
        href: "/admin/logistics",
      })
    }
    if (result.assigned > 0) {
      const partners = await cmsGet<
        Array<{ email?: string; companyName?: string; portalCode?: string }>
      >("logistics-partners", [])
      const baseUrl = process.env.PUBLIC_APP_URL?.trim() || "https://shaniidrx.com"
      for (const p of partners.filter((p) => p.email)) {
        void this.email
          .send({
            to: p.email!,
            template: "delivery.job.assigned",
            subject: `[Shaniid RX] ${result.assigned} delivery job(s) assigned to your fleet`,
            data: {
              name: p.companyName || p.email || "Partner",
              count: result.assigned,
              portalUrl: `${baseUrl}/portal/logistics`,
            },
          })
          .catch(() => undefined)
      }
    }
    return result
  }
}

/* ---------- Communications ---------- */

function interpolate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{{${k}}}`,
  )
}

/**
 * Durable persistence for the communications outbox + sent-log.
 *
 * These used to live in the in-memory server CMS (wiped on every restart). They
 * now persist to Postgres (communication_outbox / communication_sent_log) so
 * queued messages and the delivery history survive restarts/deploys. The
 * mapping preserves the existing OutboxRow / SentLogRow API shapes (ISO-string
 * dates) so the admin UI and pipeline-client are unchanged.
 */
@Injectable()
class CommunicationsStore {
  private toOutboxRow(r: typeof communicationOutbox.$inferSelect): OutboxRow {
    return {
      id: r.id,
      templateId: r.templateId ?? "",
      channel: r.channel as OutboxRow["channel"],
      to: r.to,
      subject: r.subject,
      body: r.body,
      queuedAt: r.queuedAt.toISOString(),
      status: r.status as OutboxStatus,
      lastAttemptAt: r.lastAttemptAt ? r.lastAttemptAt.toISOString() : undefined,
      reason: r.reason ?? undefined,
    }
  }

  private toSentLogRow(r: typeof communicationSentLog.$inferSelect): SentLogRow {
    return {
      id: r.id,
      at: r.sentAt.toISOString(),
      channel: r.channel as SentLogRow["channel"],
      to: r.to,
      trigger: r.trigger ?? "",
      templateId: r.templateId ?? "",
      templateName: r.templateName ?? undefined,
      language: r.language ?? undefined,
      messageId: r.messageId ?? undefined,
      status: r.status as SentLogStatus,
      reason: r.reason ?? undefined,
      preview: r.preview,
      deliveredAt: r.deliveredAt ? r.deliveredAt.toISOString() : null,
      readAt: r.readAt ? r.readAt.toISOString() : null,
    }
  }

  /* ----- Outbox ----- */
  async listOutbox(): Promise<OutboxRow[]> {
    const rows = await db
      .select()
      .from(communicationOutbox)
      .orderBy(desc(communicationOutbox.queuedAt))
      .limit(500)
    return rows.map((r) => this.toOutboxRow(r))
  }

  async getOutbox(id: string): Promise<OutboxRow | null> {
    const [row] = await db
      .select()
      .from(communicationOutbox)
      .where(eq(communicationOutbox.id, id))
      .limit(1)
    return row ? this.toOutboxRow(row) : null
  }

  async insertOutbox(entry: {
    templateId?: string
    channel: OutboxRow["channel"]
    to: string
    subject: string
    body: string
    status?: OutboxStatus
    reason?: string
  }): Promise<void> {
    await db.insert(communicationOutbox).values({
      id: newId("msg"),
      templateId: entry.templateId ?? null,
      channel: entry.channel,
      to: entry.to,
      subject: entry.subject,
      body: entry.body,
      status: entry.status ?? "queued",
      reason: entry.reason ?? null,
    })
  }

  async updateOutbox(
    id: string,
    patch: { status: OutboxStatus; reason?: string; lastAttemptAt?: Date },
  ): Promise<void> {
    await db
      .update(communicationOutbox)
      .set({
        status: patch.status,
        reason: patch.reason ?? null,
        lastAttemptAt: patch.lastAttemptAt ?? new Date(),
      })
      .where(eq(communicationOutbox.id, id))
  }

  async removeOutbox(id: string): Promise<boolean> {
    const res = await db
      .delete(communicationOutbox)
      .where(eq(communicationOutbox.id, id))
      .returning({ id: communicationOutbox.id })
    return res.length > 0
  }

  async clearSentOutbox(): Promise<number> {
    const res = await db
      .delete(communicationOutbox)
      .where(eq(communicationOutbox.status, "sent"))
      .returning({ id: communicationOutbox.id })
    return res.length
  }

  /* ----- Sent log ----- */
  async listSentLog(): Promise<SentLogRow[]> {
    const rows = await db
      .select()
      .from(communicationSentLog)
      .orderBy(desc(communicationSentLog.sentAt))
      .limit(500)
    return rows.map((r) => this.toSentLogRow(r))
  }

  async insertSentLog(entry: {
    channel: SentLogRow["channel"]
    to: string
    trigger?: string
    templateId?: string
    templateName?: string
    language?: string
    messageId?: string
    status: SentLogStatus
    reason?: string
    preview: string
  }): Promise<void> {
    await db.insert(communicationSentLog).values({
      id: newId("send"),
      channel: entry.channel,
      to: entry.to,
      trigger: entry.trigger ?? null,
      templateId: entry.templateId ?? null,
      templateName: entry.templateName ?? null,
      language: entry.language ?? null,
      messageId: entry.messageId ?? null,
      status: entry.status,
      reason: entry.reason ?? null,
      preview: entry.preview,
    })
  }

  async applyStatusByMessageId(
    messageId: string,
    status: string,
    atIso: string,
  ): Promise<void> {
    const id = String(messageId || "").trim()
    if (!id) return
    const normalized = String(status || "").toLowerCase()
    const [row] = await db
      .select()
      .from(communicationSentLog)
      .where(eq(communicationSentLog.messageId, id))
      .limit(1)
    if (!row) return
    const at = new Date(atIso)
    const patch: Partial<typeof communicationSentLog.$inferInsert> = {}
    if (normalized === "delivered") {
      patch.status = "delivered"
      if (!row.deliveredAt) patch.deliveredAt = at
    } else if (normalized === "read") {
      patch.status = "read"
      patch.readAt = at
      if (!row.deliveredAt) patch.deliveredAt = at
    } else if (normalized === "failed" || normalized === "undelivered") {
      patch.status = "failed"
    } else if (normalized === "sent") {
      if (row.status !== "delivered" && row.status !== "read") patch.status = "sent"
    }
    if (Object.keys(patch).length === 0) return
    await db
      .update(communicationSentLog)
      .set(patch)
      .where(eq(communicationSentLog.id, row.id))
  }
}

@Injectable()
class CommunicationsAutomationService {
  constructor(
    @Inject(EmailService) private readonly email: EmailService,
    @Inject(WhatsAppService) private readonly whatsapp: WhatsAppService,
    @Inject(SmsService) private readonly sms: SmsService,
    @Inject(CommunicationsStore) private readonly store: CommunicationsStore,
  ) {}

  async send(input: {
    templateId: string
    to: string
    variables?: Record<string, string | number>
  }): Promise<{ ok: boolean; channel: string; preview: string; skipped?: boolean; reason?: string }> {
    const templates = await cmsGet<MessageTemplate[]>("message-templates", [])
    const tpl = templates.find((t) => t.id === input.templateId)
    if (!tpl) {
      throw new HttpException("Template not found", HttpStatus.NOT_FOUND)
    }
    return this.dispatch(tpl, input.to, input.variables ?? {})
  }

  /**
   * Resolve the best template for a *domain trigger* (e.g. "order_dispatched")
   * and send it — the entry point used by event-driven patient notifications
   * (auto-send on prescription / order status changes). Prefers an enabled
   * template on the requested channel; if only a disabled one exists we still
   * pick it so the caller gets an explicit "disabled" result rather than a
   * silent no-op. Returns a `skipped` result (never throws) when no matching
   * template is configured, so callers can stay fire-and-forget.
   */
  async sendByTrigger(input: {
    trigger: string
    to: string
    channel?: MessageTemplate["channel"]
    variables?: Record<string, string | number>
    /** Patient language preference — drives the Meta template language code. */
    language?: string
    /** When true (proactive auto-texts), prefer a Meta-approved template send
     *  over free-form text so the message is valid outside the 24h window. */
    preferTemplate?: boolean
  }): Promise<{ ok: boolean; channel: string; preview: string; skipped?: boolean; reason?: string }> {
    const channel = input.channel ?? "whatsapp"
    const templates = await cmsGet<MessageTemplate[]>("message-templates", [])
    const matches = templates.filter((t) => t.trigger === input.trigger && t.channel === channel)
    const tpl = matches.find((t) => t.enabled) ?? matches[0]
    if (!tpl) {
      return {
        ok: false,
        channel,
        preview: "",
        skipped: true,
        reason: `No ${channel} template configured for trigger "${input.trigger}"`,
      }
    }
    return this.dispatch(tpl, input.to, input.variables ?? {}, {
      language: input.language,
      preferTemplate: input.preferTemplate,
    })
  }

  /**
   * Interpolate a resolved template and deliver it on its channel, falling back
   * to the cmsStore outbox when the transport isn't wired (SMS) or the WhatsApp
   * provider is unconfigured. Shared by both `send` (by id) and `sendByTrigger`.
   */
  private async dispatch(
    tpl: MessageTemplate,
    to: string,
    vars: Record<string, string | number>,
    opts?: { language?: string; preferTemplate?: boolean },
  ): Promise<{ ok: boolean; channel: string; preview: string; skipped?: boolean; reason?: string }> {
    if (!tpl.enabled) {
      return { ok: false, channel: tpl.channel, preview: "", skipped: true, reason: "Template disabled" }
    }
    const subject = interpolate(tpl.subject, vars)
    const body = interpolate(tpl.body, vars)

    if (tpl.channel === "email") {
      const result = await this.email.send({
        to,
        subject,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.55">${body.replace(/\n/g, "<br/>")}</div>`,
        text: body,
      })
      if (!result.skipped) {
        await this.recordSend({
          channel: "email",
          to,
          trigger: tpl.trigger ?? "",
          templateId: tpl.id,
          messageId: result.id,
          status: result.ok ? "sent" : "failed",
          reason: result.reason,
          preview: subject || body.slice(0, 80),
        })
        return { ok: result.ok, channel: "email", preview: subject, skipped: false, reason: result.reason }
      }
      // Email provider unconfigured — fall through to the outbox.
    }

    if (tpl.channel === "whatsapp" && this.whatsapp.isEnabled()) {
      // Proactive auto-texts (preferTemplate) send a Meta-approved *template* so
      // the message is valid OUTSIDE the 24h customer-service window. The
      // {{token}}→positional-param mapping is derived from the template body in
      // order of first appearance (see orderedTemplateTokens) — the same order
      // the Meta template must be registered in. Meta templates also carry a
      // per-patient language code. Template sends require the Meta provider;
      // anything else (Twilio, no template name, ad-hoc admin sends) falls back
      // to a free-form text message (valid within the 24h window).
      const language = normalizeLanguageCode(opts?.language)
      const useTemplate =
        !!opts?.preferTemplate &&
        !!tpl.whatsappTemplateName &&
        this.whatsapp.provider() === "meta"

      const result = useTemplate
        ? await this.whatsapp.send({
            to,
            templateName: tpl.whatsappTemplateName,
            variables: orderedTemplateTokens(tpl.body).map((t) =>
              vars[t] != null ? String(vars[t]) : "",
            ),
            languageCode: language,
          })
        : await this.whatsapp.send({ to, body })

      // Only fall through to the outbox when the provider was unconfigured;
      // a genuine send attempt (success or hard failure) is reported directly.
      if (!result.skipped) {
        // Record every real send attempt so admins can see what went out and,
        // via the Meta status webhook, whether it was delivered / read.
        await this.recordSend({
          channel: "whatsapp",
          to,
          trigger: tpl.trigger ?? "",
          templateId: tpl.id,
          templateName: useTemplate ? tpl.whatsappTemplateName : undefined,
          language: useTemplate ? language : undefined,
          messageId: result.id,
          status: result.ok ? "sent" : "failed",
          reason: result.reason,
          preview: subject || body.slice(0, 80),
        })
        return {
          ok: result.ok,
          channel: "whatsapp",
          preview: subject || body.slice(0, 60),
          skipped: false,
          reason: result.reason,
        }
      }
    }

    if (tpl.channel === "sms" && this.sms.isEnabled()) {
      const result = await this.sms.send({ to, message: body })
      if (!result.skipped) {
        await this.recordSend({
          channel: "sms",
          to,
          trigger: tpl.trigger ?? "",
          templateId: tpl.id,
          messageId: result.id,
          status: result.ok ? "sent" : "failed",
          reason: result.reason,
          preview: subject || body.slice(0, 80),
        })
        return { ok: result.ok, channel: "sms", preview: subject || body.slice(0, 60), skipped: false, reason: result.reason }
      }
    }

    // No live transport for this channel (provider unconfigured) — record intent
    // in the durable outbox so an admin can switch the provider on and resend.
    await this.store.insertOutbox({
      templateId: tpl.id,
      channel: tpl.channel,
      to,
      subject,
      body,
    })
    return { ok: true, channel: tpl.channel, preview: subject, skipped: true, reason: `${tpl.channel} provider not configured — queued in outbox` }
  }

  async render(templateId: string, variables: Record<string, string | number>) {
    const templates = await cmsGet<MessageTemplate[]>("message-templates", [])
    const tpl = templates.find((t) => t.id === templateId)
    if (!tpl) throw new HttpException("Template not found", HttpStatus.NOT_FOUND)
    return {
      channel: tpl.channel,
      subject: interpolate(tpl.subject, variables),
      body: interpolate(tpl.body, variables),
    }
  }

  /**
   * Append a WhatsApp send record to the `communications.sent-log` cmsStore key
   * so admins can see what auto-texts went out (and, once the Meta status
   * webhook fires, whether each was delivered / read). Best-effort: a failure
   * here never breaks the send itself. Capped at the most recent 500 rows.
   */
  private async recordSend(entry: {
    channel: SentLogRow["channel"]
    to: string
    trigger: string
    templateId: string
    templateName?: string
    language?: string
    messageId?: string
    status: SentLogStatus
    reason?: string
    preview: string
  }): Promise<void> {
    try {
      await this.store.insertSentLog(entry)
    } catch (err) {
      console.warn(
        "[communications] sent-log write failed:",
        err instanceof Error ? err.message : err,
      )
    }
  }

  /**
   * Fold a Meta delivery-status callback into the sent-log: advance the matching
   * row (by provider message id) through sent → delivered → read, or mark it
   * failed. Best-effort and idempotent; unknown message ids are ignored.
   */
  async applyStatusUpdate(messageId: string, status: string, atIso: string): Promise<void> {
    try {
      await this.store.applyStatusByMessageId(messageId, status, atIso)
    } catch (err) {
      console.warn(
        "[communications] sent-log status update failed:",
        err instanceof Error ? err.message : err,
      )
    }
  }

  async listSentLog(): Promise<SentLogRow[]> {
    return this.store.listSentLog()
  }

  /* ---------- Outbox (queued patient texts) ---------- */

  async listOutbox(): Promise<OutboxRow[]> {
    return this.store.listOutbox()
  }

  /**
   * Re-attempt delivery of a single queued message through the live transport.
   * Used once a provider is switched on. On success the row is marked `sent`;
   * if the provider is still unconfigured it stays `queued`; a hard delivery
   * error marks it `failed`. The interpolated body is re-sent verbatim (the
   * original template variables aren't retained on the outbox row).
   */
  async resendOutbox(id: string): Promise<{ ok: boolean; status: OutboxStatus; reason?: string }> {
    const row = await this.store.getOutbox(id)
    if (!row) throw new HttpException("Outbox message not found", HttpStatus.NOT_FOUND)

    const result = await this.deliverOutboxRow(row)
    const status: OutboxStatus = result.ok ? "sent" : result.skipped ? "queued" : "failed"
    await this.store.updateOutbox(id, { status, reason: result.reason, lastAttemptAt: new Date() })
    return { ok: result.ok, status, reason: result.reason }
  }

  /** Remove a single outbox entry (clear / dismiss). */
  async dismissOutbox(id: string): Promise<{ removed: boolean }> {
    return { removed: await this.store.removeOutbox(id) }
  }

  /** Drop every already-sent entry, keeping queued/failed ones for action. */
  async clearSentOutbox(): Promise<{ removed: number }> {
    return { removed: await this.store.clearSentOutbox() }
  }

  /**
   * Deliver an already-interpolated outbox row on its channel. Mirrors the
   * transport selection in `dispatch` but works from the stored body (no
   * template re-resolution). Email + WhatsApp have live transports; SMS is not
   * wired yet, so it reports `skipped` and the row stays queued.
   */
  private async deliverOutboxRow(
    row: OutboxRow,
  ): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
    if (row.channel === "email") {
      const result = await this.email.send({
        to: row.to,
        subject: row.subject,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.55">${row.body.replace(/\n/g, "<br/>")}</div>`,
        text: row.body,
      })
      return { ok: result.ok, skipped: result.skipped, reason: result.reason }
    }

    if (row.channel === "whatsapp") {
      if (!this.whatsapp.isEnabled()) {
        return { ok: false, skipped: true, reason: "WhatsApp provider not configured" }
      }
      const result = await this.whatsapp.send({ to: row.to, body: row.body })
      return { ok: result.ok, skipped: result.skipped, reason: result.reason }
    }

    if (row.channel === "sms") {
      if (!this.sms.isEnabled()) {
        return { ok: false, skipped: true, reason: "SMS provider not configured" }
      }
      const result = await this.sms.send({ to: row.to, message: row.body })
      return { ok: result.ok, skipped: result.skipped, reason: result.reason }
    }

    return { ok: false, skipped: true, reason: "Unsupported channel" }
  }

  /**
   * Dispatch a marketing campaign to a recipient list on a single channel.
   *
   * Stateless by design: it sends to each recipient and returns per-recipient
   * results WITHOUT writing to the durable outbox / sent-log. Campaigns are bulk
   * — their progress is tracked client-side in the admin campaign queue, and
   * recording every recipient here would flood the per-trigger tables (capped at
   * 500). Recipients are de-duplicated. When the channel's provider is not
   * configured each recipient comes back `skipped` so the UI can prompt the
   * admin to switch the provider on rather than silently dropping the send.
   */
  async sendCampaign(input: {
    channel: "email" | "sms" | "whatsapp"
    subject?: string
    body: string
    recipients: string[]
  }): Promise<{
    total: number
    sent: number
    failed: number
    skipped: number
    results: Array<{ to: string; ok: boolean; status: "sent" | "failed" | "skipped"; reason?: string }>
  }> {
    const channel = input.channel
    const subject = input.subject ?? ""
    const body = input.body ?? ""
    const recipients = Array.from(
      new Set((input.recipients || []).map((r) => String(r).trim()).filter(Boolean)),
    )
    const results: Array<{
      to: string
      ok: boolean
      status: "sent" | "failed" | "skipped"
      reason?: string
    }> = []
    let sent = 0
    let failed = 0
    let skipped = 0
    for (const to of recipients) {
      let res: { ok: boolean; skipped?: boolean; reason?: string }
      if (channel === "email") {
        res = await this.email.send({
          to,
          subject,
          html: `<div style="font-family:system-ui,sans-serif;line-height:1.55">${body.replace(/\n/g, "<br/>")}</div>`,
          text: body,
        })
      } else if (channel === "sms") {
        res = await this.sms.send({ to, message: body })
      } else {
        res = await this.whatsapp.send({ to, body })
      }
      if (res.skipped) {
        skipped++
        results.push({ to, ok: false, status: "skipped", reason: res.reason })
      } else if (res.ok) {
        sent++
        results.push({ to, ok: true, status: "sent" })
      } else {
        failed++
        results.push({ to, ok: false, status: "failed", reason: res.reason })
      }
    }
    return { total: recipients.length, sent, failed, skipped, results }
  }
}

@UseGuards(AdminGuard)
@Controller("admin/pipeline/communications")
class CommunicationsPipelineController {
  constructor(@Inject(CommunicationsAutomationService) private readonly svc: CommunicationsAutomationService) {}

  @Post("send")
  send(@Body() body: { templateId: string; to: string; variables?: Record<string, string | number> }) {
    if (!body?.templateId || !body?.to) {
      throw new HttpException("templateId and to are required", HttpStatus.BAD_REQUEST)
    }
    return this.svc.send(body)
  }

  @Post("preview")
  preview(@Body() body: { templateId: string; variables?: Record<string, string | number> }) {
    if (!body?.templateId) throw new HttpException("templateId required", HttpStatus.BAD_REQUEST)
    return this.svc.render(body.templateId, body.variables ?? {})
  }

  @Get("sent-log")
  sentLog() {
    return this.svc.listSentLog()
  }

  @Get("outbox")
  outbox() {
    return this.svc.listOutbox()
  }

  @Post("outbox/:id/resend")
  resend(@Param("id") id: string) {
    if (!id) throw new HttpException("id required", HttpStatus.BAD_REQUEST)
    return this.svc.resendOutbox(id)
  }

  @Post("outbox/:id/dismiss")
  dismiss(@Param("id") id: string) {
    if (!id) throw new HttpException("id required", HttpStatus.BAD_REQUEST)
    return this.svc.dismissOutbox(id)
  }

  @Post("outbox/clear-sent")
  clearSent() {
    return this.svc.clearSentOutbox()
  }

  @Post("campaign-send")
  campaignSend(
    @Body()
    body: { channel: "email" | "sms" | "whatsapp"; subject?: string; body: string; recipients: string[] },
  ) {
    if (!body?.channel || !["email", "sms", "whatsapp"].includes(body.channel)) {
      throw new HttpException("a valid channel is required", HttpStatus.BAD_REQUEST)
    }
    if (!body?.body) throw new HttpException("body is required", HttpStatus.BAD_REQUEST)
    if (!Array.isArray(body?.recipients) || body.recipients.length === 0) {
      throw new HttpException("recipients are required", HttpStatus.BAD_REQUEST)
    }
    return this.svc.sendCampaign(body)
  }
}

/**
 * Meta WhatsApp delivery-status webhook (public — Meta calls it directly).
 *
 *   GET  /api/v2/notifications/whatsapp/webhook  — Meta subscription handshake
 *   POST /api/v2/notifications/whatsapp/webhook  — status callbacks (sent /
 *                                                  delivered / read / failed)
 *
 * Intentionally unguarded (no AdminGuard) because Meta authenticates via the
 * `hub.verify_token` handshake, not an admin token. Set
 * `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and point the Meta app's webhook at this URL.
 * Status updates are folded into the `communications.sent-log` so the admin
 * "what went out" view shows delivered / read ticks. Fail-soft: a malformed or
 * unconfigured callback is acknowledged (200) without throwing.
 */
@Controller("notifications/whatsapp")
class WhatsAppWebhookController {
  constructor(
    @Inject(CommunicationsAutomationService)
    private readonly comms: CommunicationsAutomationService,
  ) {}

  @Get("webhook")
  verify(@Query() query: Record<string, string>): string {
    const expected = (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim()
    const mode = query["hub.mode"]
    const token = query["hub.verify_token"]
    const challenge = query["hub.challenge"] ?? ""
    if (expected && mode === "subscribe" && token === expected) {
      return challenge
    }
    throw new HttpException("Verification failed", HttpStatus.FORBIDDEN)
  }

  @Post("webhook")
  async receive(@Body() body: unknown): Promise<{ ok: boolean }> {
    try {
      const statuses = extractWhatsAppStatuses(body)
      for (const s of statuses) {
        const atIso = s.timestamp
          ? new Date(Number(s.timestamp) * 1000).toISOString()
          : new Date().toISOString()
        await this.comms.applyStatusUpdate(s.id, s.status, atIso)
      }
    } catch (err) {
      console.warn(
        "[whatsapp-webhook] failed to process callback:",
        err instanceof Error ? err.message : err,
      )
    }
    // Always 200 so Meta does not retry/disable the subscription.
    return { ok: true }
  }
}

/** Pull the `{ id, status, timestamp }` rows out of a Meta webhook payload. */
function extractWhatsAppStatuses(
  body: unknown,
): Array<{ id: string; status: string; timestamp?: string }> {
  const out: Array<{ id: string; status: string; timestamp?: string }> = []
  const entries = (body as { entry?: unknown[] })?.entry
  if (!Array.isArray(entries)) return out
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = (change as { value?: { statuses?: unknown[] } })?.value
      const statuses = value?.statuses
      if (!Array.isArray(statuses)) continue
      for (const st of statuses) {
        const row = st as { id?: string; status?: string; timestamp?: string }
        if (row?.id && row?.status) {
          out.push({ id: row.id, status: row.status, timestamp: row.timestamp })
        }
      }
    }
  }
  return out
}

/* ---------- Pipeline status ---------- */

@UseGuards(AdminGuard)
@Controller("admin/pipeline")
class PipelineStatusController {
  @Get("status")
  async status() {
    const [rules, deliveries, riders, templates, qaConfig] = await Promise.all([
      cmsGet<SourcingRule[]>("sourcing-automation-rules", []),
      cmsGet<LogisticsDelivery[]>("logistics.deliveries", []),
      cmsGet<LogisticsRider[]>("logistics.riders", []),
      cmsGet<MessageTemplate[]>("message-templates", []),
      cmsGet<QaConfig>("qa.config", {
        expiryWarningDays: 60,
        expiryCriticalDays: 14,
        blockExpiredFromDispatch: true,
      }),
    ])
    return {
      sourcing: {
        rules: rules.length,
        activeRules: rules.filter((r) => r.isActive).length,
        lastRunAt: rules.map((r) => r.lastRunAt).filter(Boolean).sort().pop() ?? null,
      },
      trading: { configured: true },
      qa: { config: qaConfig },
      logistics: {
        pending: deliveries.filter((d) => d.status === "pending").length,
        assigned: deliveries.filter((d) => d.status === "assigned").length,
        riders: riders.filter((r) => r.active).length,
      },
      communications: {
        templates: templates.length,
        enabled: templates.filter((t) => t.enabled).length,
      },
    }
  }
}

@Module({
  imports: [AdminCmsModule, EmailModule, NotificationsModule, WhatsAppModule, SmsModule],
  controllers: [
    SourcingPipelineController,
    TradingPipelineController,
    QaPipelineController,
    LogisticsPipelineController,
    CommunicationsPipelineController,
    WhatsAppWebhookController,
    PipelineStatusController,
  ],
  providers: [
    SourcingAutomationService,
    TradingAutomationService,
    QaAutomationService,
    LogisticsAutomationService,
    CommunicationsStore,
    CommunicationsAutomationService,
  ],
  exports: [CommunicationsAutomationService],
})
export class PipelineModule {}

export { CommunicationsAutomationService }

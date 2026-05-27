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
  Post,
  UseGuards,
} from "@nestjs/common"
import { AdminCmsModule } from "./admin-cms.module"
import { EmailModule, EmailService } from "./email.module"
import { NotificationsModule, NotificationsService } from "./notifications.module"
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
    return result
  }
}

/* ---------- Communications ---------- */

function interpolate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{{${k}}}`,
  )
}

@Injectable()
class CommunicationsAutomationService {
  constructor(@Inject(EmailService) private readonly email: EmailService) {}

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
    if (!tpl.enabled) {
      return { ok: false, channel: tpl.channel, preview: "", skipped: true, reason: "Template disabled" }
    }
    const vars = input.variables ?? {}
    const subject = interpolate(tpl.subject, vars)
    const body = interpolate(tpl.body, vars)

    if (tpl.channel === "email") {
      const result = await this.email.send({
        to: input.to,
        subject,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.55">${body.replace(/\n/g, "<br/>")}</div>`,
        text: body,
      })
      return { ok: result.ok, channel: "email", preview: subject, skipped: result.skipped, reason: result.reason }
    }
    // SMS / WhatsApp transports not wired yet — record intent.
    const log = await cmsGet<unknown[]>("communications.outbox", [])
    await cmsPut("communications.outbox", [
      {
        id: newId("msg"),
        templateId: tpl.id,
        channel: tpl.channel,
        to: input.to,
        subject,
        body,
        queuedAt: new Date().toISOString(),
      },
      ...log,
    ])
    return { ok: true, channel: tpl.channel, preview: subject, skipped: true, reason: `${tpl.channel} transport not yet wired — queued in outbox` }
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
  imports: [AdminCmsModule, EmailModule, NotificationsModule],
  controllers: [
    SourcingPipelineController,
    TradingPipelineController,
    QaPipelineController,
    LogisticsPipelineController,
    CommunicationsPipelineController,
    PipelineStatusController,
  ],
  providers: [
    SourcingAutomationService,
    TradingAutomationService,
    QaAutomationService,
    LogisticsAutomationService,
    CommunicationsAutomationService,
  ],
})
export class PipelineModule {}

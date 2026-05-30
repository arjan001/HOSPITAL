/**
 * Shaniid RX — in-house Sentry-style monitoring backend.
 *
 * Single-file module (controller + service + types) following the same
 * pattern as the other api-nest modules. Storage is an in-process ring
 * buffer today; swap to Postgres + Drizzle by re-implementing the same
 * read/write surface on `MonitoringStore` without changing controllers.
 *
 * Scope intentionally NOT per-session — monitoring is app-wide.
 *
 * Endpoints (mounted under /api/v2 by the global prefix):
 *   POST   /monitoring/events                 — ingest a batch of events
 *   GET    /monitoring/events                 — raw events (filtered)
 *   DELETE /monitoring/events                 — clear all (admin)
 *   GET    /monitoring/issues                 — grouped issues
 *   GET    /monitoring/issues/:fp             — issue + recent events
 *   POST   /monitoring/issues/:fp/status      — { status: open|resolved|ignored }
 *   GET    /monitoring/stats?window=1h|24h|7d — counts, buckets, spikes
 *   GET    /monitoring/health                 — overall status + KPIs
 *   GET    /monitoring/config                 — ingest toggle + sample rate
 *   PUT    /monitoring/config                 — update config
 */
import {
  Body, Controller, Delete, Get, Global, HttpException, HttpStatus, Inject,
  Injectable, Module, Param, Post, Put, Query, Req, UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { randomUUID } from "node:crypto"
import { AdminGuard, Public } from "../common/admin-guard"
import { ErrorReportingService } from "./error-reporting.module"

/* ---------- types ---------- */

export type EventLevel = "fatal" | "error" | "warning" | "info" | "debug"
export type EventKind = "error" | "message" | "perf" | "navigation"
export type IssueStatus = "open" | "resolved" | "ignored"

export interface Breadcrumb {
  category: string         // "ui.click" | "fetch" | "console" | "navigation"
  message: string
  level?: EventLevel
  data?: Record<string, unknown>
  timestamp: string
}

export interface MonitoringEvent {
  id: string
  fingerprint: string
  kind: EventKind
  level: EventLevel
  message: string
  errorType?: string
  stack?: string
  url?: string
  userAgent?: string
  release?: string
  environment?: string
  userId?: string          // anonymous browser id, NOT PII
  sessionId?: string       // same
  durationMs?: number      // for perf events
  context?: Record<string, unknown>
  breadcrumbs?: Breadcrumb[]
  receivedAt: string
  clientTs?: string
}

export interface Issue {
  fingerprint: string
  title: string
  kind: EventKind
  level: EventLevel
  count: number
  userCount: number
  firstSeen: string
  lastSeen: string
  status: IssueStatus
  sampleEventId: string
  errorType?: string
}

export interface MonitoringConfig {
  ingestEnabled: boolean
  sampleRate: number       // 0..1
  environment: string
  release: string
  retention: number        // max events kept in ring buffer
  capturePerf: boolean
  spikeWindowMin: number
  spikeThreshold: number   // events per minute that counts as a spike
}

const DEFAULT_CONFIG: MonitoringConfig = {
  ingestEnabled: true,
  sampleRate: 1,
  environment: process.env["NODE_ENV"] || "development",
  release: process.env["GIT_SHA"] || "dev",
  retention: 5000,
  capturePerf: true,
  spikeWindowMin: 10,
  spikeThreshold: 12,
}

/* ---------- helpers ---------- */

function fingerprint(e: { kind: EventKind; level: EventLevel; errorType?: string; message: string }): string {
  // Normalise the message: strip numbers, hex, URLs so different instances
  // of the same error get grouped together.
  const norm = e.message
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/0x[0-9a-fA-F]+/g, "<hex>")
    .replace(/\b[0-9a-fA-F]{8,}\b/g, "<id>")
    .replace(/\b\d+\b/g, "<n>")
    .toLowerCase()
    .trim()
    .slice(0, 200)
  return `${e.kind}:${e.level}:${e.errorType ?? "_"}:${norm}`
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/* ---------- store (in-memory ring buffer) ---------- */

@Injectable()
class MonitoringStore {
  events: MonitoringEvent[] = []           // newest first
  issueStatus = new Map<string, IssueStatus>()
  config: MonitoringConfig = { ...DEFAULT_CONFIG }

  push(e: MonitoringEvent) {
    this.events.unshift(e)
    if (this.events.length > this.config.retention) {
      this.events.length = this.config.retention
    }
  }

  clear() {
    this.events.length = 0
    this.issueStatus.clear()
  }

  groupIssues(): Issue[] {
    const map = new Map<string, Issue>()
    const userSets = new Map<string, Set<string>>()
    for (const e of this.events) {
      const key = e.fingerprint
      const status = this.issueStatus.get(key) ?? "open"
      let issue = map.get(key)
      if (!issue) {
        issue = {
          fingerprint: key,
          title: e.errorType ? `${e.errorType}: ${e.message}` : e.message,
          kind: e.kind,
          level: e.level,
          count: 0,
          userCount: 0,
          firstSeen: e.receivedAt,
          lastSeen: e.receivedAt,
          status,
          sampleEventId: e.id,
          errorType: e.errorType,
        }
        map.set(key, issue)
        userSets.set(key, new Set())
      }
      issue.count += 1
      // events are newest-first, so lastSeen stays from the first iteration
      issue.firstSeen = e.receivedAt   // overwritten until oldest
      if (e.userId) userSets.get(key)!.add(e.userId)
    }
    for (const issue of map.values()) {
      issue.userCount = userSets.get(issue.fingerprint)?.size ?? 0
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }
}

/* ---------- service ---------- */

@Injectable()
class MonitoringService {
  constructor(
    @Inject(MonitoringStore) private readonly store: MonitoringStore,
    @Inject(ErrorReportingService)
    private readonly forwarder: ErrorReportingService,
  ) {}

  clearAll(): void {
    this.store.clear()
  }

  /**
   * Record a server-side error directly into the monitoring store.
   *
   * This is the bridge used by the global ExceptionFilter and the process-level
   * unhandledRejection/uncaughtException handlers so that EVERY system-triggered
   * error is captured for later reference — not just browser-reported ones.
   * It never throws (telemetry must not break request handling).
   */
  recordServerError(input: {
    message: string
    errorType?: string
    stack?: string
    url?: string
    level?: EventLevel
    context?: Record<string, unknown>
  }): void {
    try {
      if (!this.store.config.ingestEnabled) return
      const level: EventLevel = input.level ?? "error"
      const kind: EventKind = "error"
      const message = String(input.message ?? "").slice(0, 1000) || "(no message)"
      const errorType = input.errorType ? String(input.errorType).slice(0, 200) : undefined
      const e: MonitoringEvent = {
        id: randomUUID(),
        fingerprint: fingerprint({ kind, level, errorType, message }),
        kind,
        level,
        message,
        errorType,
        stack: input.stack ? String(input.stack).slice(0, 12_000) : undefined,
        url: input.url ? String(input.url).slice(0, 500) : undefined,
        environment: this.store.config.environment,
        release: this.store.config.release,
        context: { ...(input.context ?? {}), source: "server" },
        receivedAt: new Date().toISOString(),
      }
      this.store.push(e)
      // Forward to external destinations (Sentry/Slack) when configured.
      this.forwarder.forward({
        message: e.message,
        errorType: e.errorType,
        stack: e.stack,
        url: e.url,
        level: e.level,
        fingerprint: e.fingerprint,
        environment: e.environment,
        release: e.release,
        context: e.context,
      })
    } catch {
      /* never throw from telemetry */
    }
  }

  ingest(payload: { events: Partial<MonitoringEvent>[] }, req: Request) {
    if (!this.store.config.ingestEnabled) {
      return { accepted: 0, dropped: payload.events?.length ?? 0, reason: "ingest_disabled" }
    }
    if (!payload || !Array.isArray(payload.events)) {
      throw new HttpException("events[] required", HttpStatus.BAD_REQUEST)
    }
    const events = payload.events.slice(0, 100) // hard cap per request
    let accepted = 0
    let dropped = 0
    const ua = req.headers["user-agent"] ?? ""
    for (const raw of events) {
      if (Math.random() > this.store.config.sampleRate) { dropped++; continue }
      const kind = (raw.kind ?? "message") as EventKind
      const level = (raw.level ?? (kind === "error" ? "error" : "info")) as EventLevel
      const message = String(raw.message ?? "").slice(0, 1000) || "(no message)"
      const errorType = raw.errorType ? String(raw.errorType).slice(0, 200) : undefined
      const e: MonitoringEvent = {
        id: randomUUID(),
        fingerprint: fingerprint({ kind, level, errorType, message }),
        kind,
        level,
        message,
        errorType,
        stack: raw.stack ? String(raw.stack).slice(0, 12_000) : undefined,
        url: raw.url ? String(raw.url).slice(0, 500) : undefined,
        userAgent: String(raw.userAgent ?? ua).slice(0, 400),
        release: raw.release ? String(raw.release) : this.store.config.release,
        environment: raw.environment ? String(raw.environment) : this.store.config.environment,
        userId: raw.userId ? String(raw.userId).slice(0, 100) : undefined,
        sessionId: raw.sessionId ? String(raw.sessionId).slice(0, 100) : undefined,
        durationMs: typeof raw.durationMs === "number" ? raw.durationMs : undefined,
        context: raw.context && typeof raw.context === "object" ? (raw.context as Record<string, unknown>) : undefined,
        breadcrumbs: Array.isArray(raw.breadcrumbs) ? (raw.breadcrumbs as Breadcrumb[]).slice(-30) : undefined,
        receivedAt: new Date().toISOString(),
        clientTs: raw.clientTs ? String(raw.clientTs) : undefined,
      }
      this.store.push(e)
      accepted++
      // Forward browser-reported runtime errors to external destinations.
      if (e.kind === "error" && (e.level === "error" || e.level === "fatal")) {
        this.forwarder.forward({
          message: e.message,
          errorType: e.errorType,
          stack: e.stack,
          url: e.url,
          level: e.level,
          fingerprint: e.fingerprint,
          environment: e.environment,
          release: e.release,
          context: e.context,
        })
      }
    }
    return { accepted, dropped }
  }

  listEvents(opts: { fingerprint?: string; level?: EventLevel; kind?: EventKind; limit?: number; since?: string; q?: string }) {
    const limit = clamp(Number(opts.limit) || 100, 1, 1000)
    const sinceMs = opts.since ? Date.parse(opts.since) : 0
    const q = (opts.q ?? "").toLowerCase().trim()
    return this.store.events
      .filter((e) => !opts.fingerprint || e.fingerprint === opts.fingerprint)
      .filter((e) => !opts.level || e.level === opts.level)
      .filter((e) => !opts.kind || e.kind === opts.kind)
      .filter((e) => !sinceMs || Date.parse(e.receivedAt) >= sinceMs)
      .filter((e) => !q || e.message.toLowerCase().includes(q) || (e.errorType ?? "").toLowerCase().includes(q))
      .slice(0, limit)
  }

  listIssues(opts: { status?: IssueStatus; level?: EventLevel; q?: string }) {
    const q = (opts.q ?? "").toLowerCase().trim()
    return this.store.groupIssues()
      .filter((i) => !opts.status || i.status === opts.status)
      .filter((i) => !opts.level || i.level === opts.level)
      .filter((i) => !q || i.title.toLowerCase().includes(q))
  }

  getIssue(fp: string) {
    const all = this.store.groupIssues()
    const issue = all.find((i) => i.fingerprint === fp)
    if (!issue) throw new HttpException("issue not found", HttpStatus.NOT_FOUND)
    const events = this.store.events.filter((e) => e.fingerprint === fp).slice(0, 50)
    const sample = this.store.events.find((e) => e.id === issue.sampleEventId) ?? events[0]
    // Aggregate browsers + URLs for "Affected" overview.
    const browsers = new Map<string, number>()
    const urls = new Map<string, number>()
    for (const e of events) {
      const ua = (e.userAgent ?? "unknown").split(" ").slice(-1)[0] || "unknown"
      browsers.set(ua, (browsers.get(ua) ?? 0) + 1)
      if (e.url) urls.set(e.url, (urls.get(e.url) ?? 0) + 1)
    }
    return {
      issue,
      sample,
      events,
      affected: {
        browsers: [...browsers.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        urls: [...urls.entries()].map(([url, count]) => ({ url, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      },
    }
  }

  setIssueStatus(fp: string, status: IssueStatus) {
    if (!["open", "resolved", "ignored"].includes(status)) {
      throw new HttpException("invalid status", HttpStatus.BAD_REQUEST)
    }
    this.store.issueStatus.set(fp, status)
    return { fingerprint: fp, status }
  }

  stats(windowKey: string) {
    const windowMs =
      windowKey === "1h" ? 60 * 60 * 1000 :
      windowKey === "7d" ? 7 * 24 * 60 * 60 * 1000 :
      24 * 60 * 60 * 1000
    const now = Date.now()
    const since = now - windowMs
    const inWindow = this.store.events.filter((e) => Date.parse(e.receivedAt) >= since)

    // Build buckets — minute granularity for 1h, hour for 24h, day for 7d.
    const bucketMs = windowKey === "1h" ? 60_000 : windowKey === "7d" ? 24 * 3_600_000 : 3_600_000
    const bucketCount = Math.ceil(windowMs / bucketMs)
    const buckets: { t: number; total: number; error: number; warning: number; info: number }[] = []
    for (let i = bucketCount - 1; i >= 0; i--) {
      buckets.push({ t: now - i * bucketMs, total: 0, error: 0, warning: 0, info: 0 })
    }
    for (const e of inWindow) {
      const idx = Math.floor((Date.parse(e.receivedAt) - since) / bucketMs)
      const slot = buckets[idx]
      if (!slot) continue
      slot.total += 1
      if (e.level === "fatal" || e.level === "error") slot.error += 1
      else if (e.level === "warning") slot.warning += 1
      else slot.info += 1
    }

    // Spikes: any bucket whose total exceeds threshold * 2x baseline.
    const baseline = avg(buckets.slice(0, -1).map((b) => b.total))
    const spikes = buckets.filter((b) => b.total >= this.store.config.spikeThreshold && b.total >= baseline * 2 + 1)

    // Top issues + level breakdown for the window.
    const perfDurations = inWindow.filter((e) => e.kind === "perf" && typeof e.durationMs === "number").map((e) => e.durationMs!)
    const byLevel: Record<EventLevel, number> = { fatal: 0, error: 0, warning: 0, info: 0, debug: 0 }
    for (const e of inWindow) byLevel[e.level] += 1

    return {
      window: windowKey,
      total: inWindow.length,
      errorRate: inWindow.length ? round2((byLevel.error + byLevel.fatal) / inWindow.length) : 0,
      byLevel,
      buckets,
      spikes: spikes.map((s) => ({ t: s.t, total: s.total })),
      perf: {
        samples: perfDurations.length,
        p50: percentile(perfDurations, 50),
        p95: percentile(perfDurations, 95),
        p99: percentile(perfDurations, 99),
      },
    }
  }

  health() {
    const day = this.stats("24h")
    const hour = this.stats("1h")
    const issues = this.listIssues({ status: "open" })
    const errors24h = day.byLevel.error + day.byLevel.fatal
    const rate = day.total ? errors24h / day.total : 0
    const status =
      rate > 0.1 || hour.spikes.length > 0 ? "degraded" :
      rate > 0.2 ? "down" : "operational"
    return {
      status,
      lastUpdated: new Date().toISOString(),
      throughput24h: day.total,
      throughput1h: hour.total,
      errorRate: round2(rate),
      p95: day.perf.p95,
      openIssues: issues.length,
      activeSpikes: hour.spikes,
      release: this.store.config.release,
      environment: this.store.config.environment,
    }
  }

  getConfig() { return { ...this.store.config } }
  putConfig(patch: Partial<MonitoringConfig>) {
    const next = { ...this.store.config, ...patch }
    next.sampleRate = clamp(Number(next.sampleRate) || 0, 0, 1)
    next.retention = clamp(Math.floor(Number(next.retention) || 0), 100, 50_000)
    next.spikeWindowMin = clamp(Math.floor(Number(next.spikeWindowMin) || 0), 1, 1440)
    next.spikeThreshold = clamp(Math.floor(Number(next.spikeThreshold) || 0), 1, 10_000)
    this.store.config = next
    return next
  }
}

function avg(xs: number[]): number {
  if (!xs.length) return 0
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const idx = clamp(Math.ceil((p / 100) * sorted.length) - 1, 0, sorted.length - 1)
  return round2(sorted[idx])
}
function round2(n: number): number { return Math.round(n * 100) / 100 }

/* ---------- controller ---------- */

@UseGuards(AdminGuard)
@Controller("monitoring")
class MonitoringController {
  constructor(@Inject(MonitoringService) private readonly svc: MonitoringService) {}

  // Browser ingestion is anonymous: every visitor's SDK posts errors here
  // without an admin token. Everything else is admin-only.
  @Public()
  @Post("events")
  ingest(@Req() req: Request, @Body() body: { events: Partial<MonitoringEvent>[] }) {
    return this.svc.ingest(body, req)
  }

  @Get("events")
  events(
    @Query("fingerprint") fp?: string,
    @Query("level") level?: EventLevel,
    @Query("kind") kind?: EventKind,
    @Query("limit") limit?: string,
    @Query("since") since?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listEvents({ fingerprint: fp, level, kind, limit: limit ? Number(limit) : undefined, since, q })
  }

  @Delete("events")
  clear() {
    this.svc.clearAll()
    return { ok: true }
  }

  @Get("issues")
  issues(
    @Query("status") status?: IssueStatus,
    @Query("level") level?: EventLevel,
    @Query("q") q?: string,
  ) {
    return this.svc.listIssues({ status, level, q })
  }

  @Get("issues/:fp")
  issue(@Param("fp") fp: string) {
    return this.svc.getIssue(fp)
  }

  @Post("issues/:fp/status")
  setStatus(@Param("fp") fp: string, @Body() body: { status: IssueStatus }) {
    return this.svc.setIssueStatus(fp, body?.status)
  }

  @Get("stats")
  stats(@Query("window") window = "24h") {
    return this.svc.stats(window)
  }

  @Get("health")
  health() {
    return this.svc.health()
  }

  @Get("config")
  config() {
    return this.svc.getConfig()
  }

  @Put("config")
  updateConfig(@Body() body: Partial<MonitoringConfig>) {
    return this.svc.putConfig(body ?? {})
  }
}

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [MonitoringStore, MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}

export { MonitoringService }

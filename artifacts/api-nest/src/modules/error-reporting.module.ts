/**
 * Error-reporting module — forwards captured runtime errors to external
 * destinations (Sentry and/or Slack).
 *
 * This is the production replacement for the in-app error-log viewer: instead
 * of reading errors inside the admin panel, runtime errors captured by the
 * monitoring backend (browser SDK ingestion + server-side ExceptionFilter /
 * process handlers) are forwarded to the destination(s) the team already uses.
 *
 * Design (mirrors email.module.ts / whatsapp.module.ts):
 *   - Secrets live ONLY in env (never in cmsStore):
 *       SENTRY_DSN          — Sentry project DSN (enables Sentry forwarding)
 *       SENTRY_ENVIRONMENT  — optional; defaults to NODE_ENV
 *       SENTRY_RELEASE      — optional; defaults to GIT_SHA or "dev"
 *       SLACK_WEBHOOK_URL   — Slack incoming-webhook URL (enables Slack alerts)
 *   - Non-secret enable/disable toggles live in the cms `error-reporting` doc
 *     ({ sentryEnabled, slackEnabled }) written by the admin Settings tab.
 *     A provider is ACTIVE when it is configured (env present) AND enabled
 *     (toggle on — defaults to on when configured).
 *   - Env-gated + fail-soft: when nothing is configured, forward() is a no-op
 *     and never throws. Telemetry must never break request handling.
 *
 * Routes (admin-only):
 *   GET  /api/v2/admin/error-reporting/status — provider readiness
 *   POST /api/v2/admin/error-reporting/test   — dispatch a synthetic test event
 *
 * Note on @Inject(): tsx/esbuild does not emit emitDecoratorMetadata, so every
 * controller/service constructor dependency is injected explicitly.
 */
import {
  Body,
  Controller,
  Get,
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleInit,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { db, secretConfigs } from "@workspace/db"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"

/* ---------- secure config keys ---------- */

const KEY = {
  sentryDsn: "error_reporting.sentry_dsn",
  slackWebhookUrl: "error_reporting.slack_webhook_url",
  sentryEnvironment: "error_reporting.sentry_environment",
  sentryRelease: "error_reporting.sentry_release",
} as const

/** Mask a secret for display: keep only the last 4 chars, never the rest. */
function maskSecret(v: string): string {
  const s = (v || "").trim()
  if (!s) return ""
  if (s.length <= 4) return "••••"
  return "••••••••" + s.slice(-4)
}

/** A value the client sends back unchanged still contains the mask bullets. */
function isMasked(v: string): boolean {
  return v.includes("•")
}

/* ---------- types ---------- */

export interface ErrorReportEvent {
  message: string
  errorType?: string
  stack?: string
  url?: string
  level?: "fatal" | "error" | "warning" | "info" | "debug"
  fingerprint?: string
  environment?: string
  release?: string
  context?: Record<string, unknown>
}

export interface ProviderStatus {
  configured: boolean
  enabled: boolean
  active: boolean
}

export interface ForwardResult {
  ok: boolean
  skipped?: boolean
  reason?: string
  status?: number
}

/**
 * SSRF / misconfiguration guard for operator-supplied outbound URLs (Sentry DSN
 * host, Slack webhook). Even though these come from env (trusted-ish), we apply
 * defense-in-depth: require https and refuse loopback / link-local / private
 * ranges and the cloud metadata endpoint so a typo or hostile env value can't
 * be used to reach internal services. Throws on a blocked target.
 */
function assertSafeOutbound(rawUrl: string): URL {
  const u = new URL(rawUrl)
  if (u.protocol !== "https:") {
    throw new Error(`Refusing non-https outbound URL (${u.protocol})`)
  }
  const host = u.hostname.toLowerCase()
  const blockedHosts = new Set([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",
    "metadata.google.internal",
  ])
  if (blockedHosts.has(host) || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("Refusing outbound URL to internal/loopback host")
  }
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.\d+$/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) {
      throw new Error("Refusing outbound URL to private IP range")
    }
  }
  return u
}

/* ---------- service ---------- */

@Injectable()
export class ErrorReportingService implements OnModuleInit {
  /** fingerprint → last-forwarded epoch ms, to suppress duplicate spam. */
  private readonly lastSent = new Map<string, number>()
  private readonly DEDUP_MS = 60_000
  private readonly DEDUP_MAX_KEYS = 2_000

  /**
   * Cache of the DB-backed secure config. Kept in memory so the sync hot path
   * (`forward()`) never touches the DB. Refreshed on write and lazily when
   * older than the TTL (fire-and-forget — a slightly stale read is fine).
   */
  private secretCache = new Map<string, string>()
  private secretCacheAt = 0
  private readonly SECRET_TTL_MS = 30_000

  constructor(
    @Inject(AdminCmsService) private readonly cms: AdminCmsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshSecrets().catch(() => undefined)
  }

  /* --- secure config (DB → env fallback) --- */

  private async refreshSecrets(): Promise<void> {
    try {
      const rows = await db.select().from(secretConfigs).where(
        inArray(secretConfigs.key, [
          KEY.sentryDsn,
          KEY.slackWebhookUrl,
          KEY.sentryEnvironment,
          KEY.sentryRelease,
        ]),
      )
      const next = new Map<string, string>()
      for (const r of rows) next.set(r.key, r.value || "")
      this.secretCache = next
      this.secretCacheAt = Date.now()
    } catch {
      /* leave the previous cache in place on failure */
    }
  }

  /** Lazy, non-blocking refresh used by sync hot paths. */
  private maybeRefreshSecrets(): void {
    if (Date.now() - this.secretCacheAt > this.SECRET_TTL_MS) {
      void this.refreshSecrets()
    }
  }

  /** DB value (if non-empty) wins, otherwise the env fallback. */
  private resolve(dbKey: string, envVar: string): string {
    const fromDb = (this.secretCache.get(dbKey) || "").trim()
    if (fromDb) return fromDb
    return (process.env[envVar] || "").trim()
  }

  /* --- config readers --- */

  private sentryDsn(): string {
    this.maybeRefreshSecrets()
    return this.resolve(KEY.sentryDsn, "SENTRY_DSN")
  }
  private slackWebhook(): string {
    this.maybeRefreshSecrets()
    return this.resolve(KEY.slackWebhookUrl, "SLACK_WEBHOOK_URL")
  }
  private environment(): string {
    return (
      this.resolve(KEY.sentryEnvironment, "SENTRY_ENVIRONMENT") ||
      process.env["NODE_ENV"] ||
      "development"
    )
  }
  private release(): string {
    return (
      this.resolve(KEY.sentryRelease, "SENTRY_RELEASE") ||
      process.env["GIT_SHA"] ||
      "dev"
    )
  }

  /**
   * Masked view of the credential config for the admin Settings tab. Secrets
   * are never returned in the clear — only a masked hint and the source
   * (db = operator-set here, env = server secret, none = unset).
   */
  async configView(): Promise<{
    sentryDsn: { set: boolean; masked: string; source: "db" | "env" | "none" }
    slackWebhookUrl: { set: boolean; masked: string; source: "db" | "env" | "none" }
    sentryEnvironment: { value: string; source: "db" | "env" | "default" }
    sentryRelease: { value: string; source: "db" | "env" | "default" }
  }> {
    await this.refreshSecrets()
    const secretView = (dbKey: string, envVar: string) => {
      const dbVal = (this.secretCache.get(dbKey) || "").trim()
      const envVal = (process.env[envVar] || "").trim()
      const source: "db" | "env" | "none" = dbVal ? "db" : envVal ? "env" : "none"
      const effective = dbVal || envVal
      return { set: !!effective, masked: maskSecret(effective), source }
    }
    const plainView = (dbKey: string, envVar: string, fallback: string) => {
      const dbVal = (this.secretCache.get(dbKey) || "").trim()
      const envVal = (process.env[envVar] || "").trim()
      if (dbVal) return { value: dbVal, source: "db" as const }
      if (envVal) return { value: envVal, source: "env" as const }
      return { value: fallback, source: "default" as const }
    }
    return {
      sentryDsn: secretView(KEY.sentryDsn, "SENTRY_DSN"),
      slackWebhookUrl: secretView(KEY.slackWebhookUrl, "SLACK_WEBHOOK_URL"),
      sentryEnvironment: plainView(KEY.sentryEnvironment, "SENTRY_ENVIRONMENT", process.env["NODE_ENV"] || "development"),
      sentryRelease: plainView(KEY.sentryRelease, "SENTRY_RELEASE", process.env["GIT_SHA"] || "dev"),
    }
  }

  /**
   * Persist operator-supplied credentials to the DB store.
   *   - undefined field            → leave unchanged
   *   - masked value (contains •)  → leave unchanged (client echoed the mask)
   *   - empty string               → clear the DB row (env fallback resumes)
   *   - any other string           → upsert
   */
  async saveConfig(input: {
    sentryDsn?: string
    slackWebhookUrl?: string
    sentryEnvironment?: string
    sentryRelease?: string
  }): Promise<{ ok: true }> {
    const updates: Array<{ key: string; value: string }> = []
    const clears: string[] = []
    const stage = (dbKey: string, raw: string | undefined) => {
      if (raw === undefined) return
      const v = raw.trim()
      if (isMasked(v)) return
      if (v === "") clears.push(dbKey)
      else updates.push({ key: dbKey, value: v })
    }
    stage(KEY.sentryDsn, input.sentryDsn)
    stage(KEY.slackWebhookUrl, input.slackWebhookUrl)
    stage(KEY.sentryEnvironment, input.sentryEnvironment)
    stage(KEY.sentryRelease, input.sentryRelease)

    for (const u of updates) {
      await db
        .insert(secretConfigs)
        .values({ key: u.key, value: u.value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: secretConfigs.key,
          set: { value: u.value, updatedAt: new Date() },
        })
    }
    if (clears.length) {
      await db.delete(secretConfigs).where(inArray(secretConfigs.key, clears))
    }
    await this.refreshSecrets()
    return { ok: true }
  }

  /** Read the admin enable toggles from the cms `error-reporting` doc. */
  private toggles(): { sentryEnabled: boolean; slackEnabled: boolean } {
    const raw = this.cms.getCachedValue("error-reporting") as
      | { sentryEnabled?: unknown; slackEnabled?: unknown }
      | undefined
    // Default to enabled when a provider is configured but no toggle exists yet.
    return {
      sentryEnabled: raw?.sentryEnabled !== false,
      slackEnabled: raw?.slackEnabled !== false,
    }
  }

  status(): {
    sentry: ProviderStatus
    slack: ProviderStatus
    environment: string
    release: string
  } {
    const t = this.toggles()
    const sentryConfigured = !!this.sentryDsn()
    const slackConfigured = !!this.slackWebhook()
    return {
      sentry: {
        configured: sentryConfigured,
        enabled: t.sentryEnabled,
        active: sentryConfigured && t.sentryEnabled,
      },
      slack: {
        configured: slackConfigured,
        enabled: t.slackEnabled,
        active: slackConfigured && t.slackEnabled,
      },
      environment: this.environment(),
      release: this.release(),
    }
  }

  /* --- forwarding --- */

  /**
   * Fire-and-forget forward of a captured error to all ACTIVE providers.
   * Only error/fatal events are forwarded; everything else is ignored.
   * Never throws and never blocks the caller.
   */
  forward(event: ErrorReportEvent): void {
    try {
      const level = event.level ?? "error"
      if (level !== "error" && level !== "fatal") return

      const s = this.status()
      if (!s.sentry.active && !s.slack.active) return

      // De-dupe identical errors within the cooldown window.
      const fp = event.fingerprint || `${event.errorType ?? "Error"}:${event.message}`
      const now = Date.now()
      const last = this.lastSent.get(fp) ?? 0
      if (now - last < this.DEDUP_MS) return
      this.lastSent.set(fp, now)
      this.pruneDedup()

      if (s.sentry.active) void this.postSentry(event).catch(() => undefined)
      if (s.slack.active) void this.postSlack(event).catch(() => undefined)
    } catch {
      /* telemetry must never throw */
    }
  }

  /**
   * Dispatch a synthetic event to every CONFIGURED provider (regardless of the
   * enable toggle) so an admin can verify credentials from the Settings tab.
   */
  async sendTest(): Promise<{
    ok: boolean
    sentry?: ForwardResult
    slack?: ForwardResult
  }> {
    const event: ErrorReportEvent = {
      message: "Shaniid RX test event — error reporting is working.",
      errorType: "ErrorReportingTest",
      level: "error",
      url: "admin/settings/error-reporting",
      fingerprint: `test:${randomUUID()}`,
      context: { test: true, triggeredAt: new Date().toISOString() },
    }

    const out: { ok: boolean; sentry?: ForwardResult; slack?: ForwardResult } = {
      ok: false,
    }
    const tasks: Promise<void>[] = []

    if (this.sentryDsn()) {
      tasks.push(
        this.postSentry(event).then((r) => {
          out.sentry = r
        }),
      )
    } else {
      out.sentry = { ok: false, skipped: true, reason: "SENTRY_DSN not set" }
    }

    if (this.slackWebhook()) {
      tasks.push(
        this.postSlack(event).then((r) => {
          out.slack = r
        }),
      )
    } else {
      out.slack = {
        ok: false,
        skipped: true,
        reason: "SLACK_WEBHOOK_URL not set",
      }
    }

    await Promise.all(tasks)
    out.ok = !!(out.sentry?.ok || out.slack?.ok)
    return out
  }

  private pruneDedup() {
    if (this.lastSent.size <= this.DEDUP_MAX_KEYS) return
    const cutoff = Date.now() - this.DEDUP_MS
    for (const [k, t] of this.lastSent) {
      if (t < cutoff) this.lastSent.delete(k)
    }
    // Hard cap if everything is still fresh.
    if (this.lastSent.size > this.DEDUP_MAX_KEYS) {
      const excess = this.lastSent.size - this.DEDUP_MAX_KEYS
      let i = 0
      for (const k of this.lastSent.keys()) {
        if (i++ >= excess) break
        this.lastSent.delete(k)
      }
    }
  }

  /* --- Sentry (hand-rolled store endpoint; no SDK dependency) --- */

  private async postSentry(event: ErrorReportEvent): Promise<ForwardResult> {
    try {
      const dsn = this.sentryDsn()
      if (!dsn) return { ok: false, skipped: true, reason: "SENTRY_DSN not set" }

      const u = new URL(dsn)
      const publicKey = u.username
      const segments = u.pathname.split("/").filter(Boolean)
      const projectId = segments.pop()
      if (!publicKey || !projectId) {
        return { ok: false, reason: "Malformed SENTRY_DSN" }
      }
      const pathPrefix = segments.length ? `${segments.join("/")}/` : ""
      const storeUrl = `${u.protocol}//${u.host}/${pathPrefix}api/${projectId}/store/`
      assertSafeOutbound(storeUrl)

      const level =
        event.level === "fatal"
          ? "fatal"
          : event.level === "warning"
            ? "warning"
            : event.level === "info"
              ? "info"
              : "error"

      const payload = {
        event_id: randomUUID().replace(/-/g, ""),
        timestamp: new Date().toISOString(),
        platform: "node",
        logger: "shaniidrx-api",
        level,
        environment: event.environment || this.environment(),
        release: event.release || this.release(),
        transaction: event.url,
        message: event.message,
        exception: {
          values: [
            {
              type: event.errorType || "Error",
              value: event.message,
            },
          ],
        },
        tags: { source: "shaniidrx-api" },
        extra: {
          ...(event.context ?? {}),
          ...(event.stack ? { stack: event.stack.slice(0, 12_000) } : {}),
          url: event.url,
        },
      }

      const res = await fetch(storeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=shaniidrx-api/1.0`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        return { ok: false, status: res.status, reason: `Sentry returned ${res.status}` }
      }
      return { ok: true, status: res.status }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "Sentry request failed",
      }
    }
  }

  /* --- Slack incoming webhook --- */

  private async postSlack(event: ErrorReportEvent): Promise<ForwardResult> {
    try {
      const webhook = this.slackWebhook()
      if (!webhook) {
        return { ok: false, skipped: true, reason: "SLACK_WEBHOOK_URL not set" }
      }
      assertSafeOutbound(webhook)
      const type = event.errorType || "Error"
      const body = {
        text: `:rotating_light: Shaniid RX — ${type}: ${event.message}`.slice(0, 2_900),
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "Shaniid RX — runtime error" },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Type:*\n${type}` },
              { type: "mrkdwn", text: `*Level:*\n${event.level ?? "error"}` },
              {
                type: "mrkdwn",
                text: `*Environment:*\n${event.environment || this.environment()}`,
              },
              { type: "mrkdwn", text: `*Where:*\n${event.url || "—"}` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "```" + event.message.slice(0, 1_500) + "```",
            },
          },
        ],
      }
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        return { ok: false, status: res.status, reason: `Slack returned ${res.status}` }
      }
      return { ok: true, status: res.status }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "Slack request failed",
      }
    }
  }
}

/* ---------- controller ---------- */

@UseGuards(AdminGuard)
@RequirePerm("integrations.manage", "cms.settings")
@Controller("admin/error-reporting")
class ErrorReportingController {
  constructor(
    @Inject(ErrorReportingService) private readonly svc: ErrorReportingService,
  ) {}

  @Get("status")
  status() {
    return this.svc.status()
  }

  @Get("config")
  config() {
    return this.svc.configView()
  }

  @Put("config")
  saveConfig(
    @Body()
    body: {
      sentryDsn?: string
      slackWebhookUrl?: string
      sentryEnvironment?: string
      sentryRelease?: string
    },
  ) {
    return this.svc.saveConfig(body || {})
  }

  @Post("test")
  test() {
    return this.svc.sendTest()
  }
}

@Global()
@Module({
  imports: [AdminCmsModule],
  controllers: [ErrorReportingController],
  providers: [ErrorReportingService],
  exports: [ErrorReportingService],
})
export class ErrorReportingModule {}

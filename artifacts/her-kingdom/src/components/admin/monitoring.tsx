"use client"

/**
 * Monitoring & error tracking — settings tab.
 *
 * Reads from the in-house Sentry-style backend at /api/v2/monitoring/*.
 * No external service required.
 */

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  Activity, AlertTriangle, AlertOctagon, ArchiveRestore, ArrowUpRight, Bug,
  CheckCircle2, ChevronRight, Clock, Eye, EyeOff, Flame, Gauge, Globe,
  ListChecks, Loader2, RefreshCw, Search, Settings2, Shield, Sparkles, Trash2, X, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { notify } from "@/lib/notify"

const BASE = "/api/v2/monitoring"

type EventLevel = "fatal" | "error" | "warning" | "info" | "debug"
type EventKind = "error" | "message" | "perf" | "navigation"
type IssueStatus = "open" | "resolved" | "ignored"

interface MonEvent {
  id: string; fingerprint: string; kind: EventKind; level: EventLevel
  message: string; errorType?: string; stack?: string; url?: string
  userAgent?: string; release?: string; environment?: string
  userId?: string; sessionId?: string; durationMs?: number
  context?: Record<string, unknown>
  breadcrumbs?: { category: string; message: string; level?: EventLevel; timestamp: string }[]
  receivedAt: string; clientTs?: string
}
interface Issue {
  fingerprint: string; title: string; kind: EventKind; level: EventLevel
  count: number; userCount: number; firstSeen: string; lastSeen: string
  status: IssueStatus; sampleEventId: string; errorType?: string
}
interface Health {
  status: "operational" | "degraded" | "down"
  lastUpdated: string; throughput24h: number; throughput1h: number
  errorRate: number; p95: number; openIssues: number
  activeSpikes: { t: number; total: number }[]; release: string; environment: string
}
interface Stats {
  window: string; total: number; errorRate: number
  byLevel: Record<EventLevel, number>
  buckets: { t: number; total: number; error: number; warning: number; info: number }[]
  spikes: { t: number; total: number }[]
  perf: { samples: number; p50: number; p95: number; p99: number }
}
interface Config {
  ingestEnabled: boolean; sampleRate: number; environment: string; release: string
  retention: number; capturePerf: boolean; spikeWindowMin: number; spikeThreshold: number
}

async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

const LEVEL_COLOR: Record<EventLevel, string> = {
  fatal: "bg-rose-100 text-rose-800 border-rose-300",
  error: "bg-red-100 text-red-700 border-red-300",
  warning: "bg-amber-100 text-amber-800 border-amber-300",
  info: "bg-blue-100 text-blue-700 border-blue-300",
  debug: "bg-zinc-100 text-zinc-700 border-zinc-300",
}
const STATUS_COLOR: Record<Health["status"], { bg: string; ring: string; label: string; icon: typeof CheckCircle2 }> = {
  operational: { bg: "bg-emerald-50 border-emerald-200 text-emerald-800", ring: "bg-emerald-500", label: "Operational", icon: CheckCircle2 },
  degraded: { bg: "bg-amber-50 border-amber-200 text-amber-800", ring: "bg-amber-500", label: "Degraded performance", icon: AlertTriangle },
  down: { bg: "bg-rose-50 border-rose-200 text-rose-800", ring: "bg-rose-500", label: "Critical incidents", icon: AlertOctagon },
}

function fmtTime(iso?: string | number): string {
  if (!iso) return "—"
  const d = typeof iso === "number" ? new Date(iso) : new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function MonitoringPanel() {
  const [windowKey, setWindowKey] = useState<"1h" | "24h" | "7d">("24h")
  const [tab, setTab] = useState<"overview" | "issues" | "events" | "config">("overview")

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: "#3D0814" }} />
            Monitoring &amp; error tracking
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            In-house observability. Captures uncaught errors, promise rejections, console signals and performance — all from the storefront and admin.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-white">
          {(["1h", "24h", "7d"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindowKey(w)}
              className={`px-3 py-1 text-xs font-medium rounded ${windowKey === w ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
              style={windowKey === w ? { background: "#3D0814" } : undefined}
            >{w}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {([
          { v: "overview", label: "Overview", icon: Gauge },
          { v: "issues", label: "Issues", icon: Bug },
          { v: "events", label: "Event stream", icon: Activity },
          { v: "config", label: "Configuration", icon: Settings2 },
        ] as const).map((t) => {
          const Icon = t.icon
          const active = tab === t.v
          return (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5 border-b-2 -mb-px whitespace-nowrap ${
                active ? "border-[#3D0814] text-[#3D0814]" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "overview" && <OverviewTab windowKey={windowKey} />}
      {tab === "issues" && <IssuesTab />}
      {tab === "events" && <EventsTab />}
      {tab === "config" && <ConfigTab />}
    </div>
  )
}

/* ---------- Overview ---------- */

function OverviewTab({ windowKey }: { windowKey: "1h" | "24h" | "7d" }) {
  const { data: health, mutate: refreshHealth } = useSWR<Health>(`${BASE}/health`, fetcher, { refreshInterval: 15_000 })
  const { data: stats } = useSWR<Stats>(`${BASE}/stats?window=${windowKey}`, fetcher, { refreshInterval: 15_000 })
  const { data: issues } = useSWR<Issue[]>(`${BASE}/issues?status=open`, fetcher, { refreshInterval: 15_000 })

  if (!health || !stats) {
    return <div className="py-12 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading telemetry…</div>
  }

  const meta = STATUS_COLOR[health.status]
  const StatusIcon = meta.icon

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${meta.bg}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`absolute inline-flex h-3 w-3 rounded-full opacity-60 animate-ping ${meta.ring}`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${meta.ring}`} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                <StatusIcon className="h-3.5 w-3.5" />
                System status
              </p>
              <p className="text-lg font-semibold mt-0.5">{meta.label}</p>
              <p className="text-[11px] mt-0.5 opacity-70">
                {health.environment} · release {health.release} · checked {fmtTime(health.lastUpdated)}
              </p>
            </div>
          </div>
          <button
            onClick={() => refreshHealth()}
            className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-current/30 bg-white/40 hover:bg-white/70"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Events (24h)" value={health.throughput24h.toLocaleString()} sub={`${health.throughput1h.toLocaleString()} in last hour`} />
        <StatCard icon={Flame} label="Error rate" value={`${(health.errorRate * 100).toFixed(2)}%`} sub={health.errorRate > 0.05 ? "Above target" : "Within target"} tone={health.errorRate > 0.05 ? "warn" : "ok"} />
        <StatCard icon={Zap} label="P95 latency" value={health.p95 ? `${Math.round(health.p95)}ms` : "—"} sub={`P99 ${stats.perf.p99 ? Math.round(stats.perf.p99) + "ms" : "—"}`} />
        <StatCard icon={Bug} label="Open issues" value={String(health.openIssues)} sub={`${stats.spikes.length} active spike${stats.spikes.length === 1 ? "" : "s"}`} tone={health.openIssues > 0 ? "warn" : "ok"} />
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold">Event volume · {windowKey}</h4>
            <p className="text-[11px] text-muted-foreground">Stacked by severity. Spikes highlighted.</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Error</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Warn</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Info</span>
          </div>
        </div>
        <SpikeChart buckets={stats.buckets} />
      </div>

      <div className="rounded-lg border border-border bg-white">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold inline-flex items-center gap-2"><ListChecks className="h-4 w-4" /> Top open issues</h4>
          <span className="text-[11px] text-muted-foreground">{(issues ?? []).length} open</span>
        </div>
        <div className="divide-y divide-border">
          {(issues ?? []).slice(0, 5).map((i) => (
            <div key={i.fingerprint} className="p-3 flex items-start gap-3">
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLOR[i.level]}`}>{i.level}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{i.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {i.count} event{i.count === 1 ? "" : "s"} · {i.userCount} user{i.userCount === 1 ? "" : "s"} · last {fmtTime(i.lastSeen)}
                </p>
              </div>
            </div>
          ))}
          {!issues?.length && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-60" /> No open issues. Nothing's on fire.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone }: { icon: typeof Activity; label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  const tint = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-muted-foreground"
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-xl font-semibold mt-1 tabular-nums" style={{ color: "#3D0814" }}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${tint}`}>{sub}</p>}
    </div>
  )
}

function SpikeChart({ buckets }: { buckets: Stats["buckets"] }) {
  const max = Math.max(1, ...buckets.map((b) => b.total))
  return (
    <div className="flex items-end gap-[2px] h-32">
      {buckets.map((b, i) => {
        const h = (b.total / max) * 100
        const errFrac = b.total ? b.error / b.total : 0
        const warnFrac = b.total ? b.warning / b.total : 0
        return (
          <div key={i} className="flex-1 flex flex-col justify-end group relative" title={`${new Date(b.t).toLocaleString()} — ${b.total} (${b.error} err / ${b.warning} warn)`}>
            <div className="w-full rounded-t-sm overflow-hidden bg-blue-100" style={{ height: `${Math.max(h, b.total ? 4 : 0)}%` }}>
              <div className="bg-rose-500" style={{ height: `${errFrac * 100}%` }} />
              <div className="bg-amber-400" style={{ height: `${warnFrac * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Issues ---------- */

function IssuesTab() {
  const [status, setStatus] = useState<IssueStatus | "">("open")
  const [level, setLevel] = useState<EventLevel | "">("")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const qs = new URLSearchParams()
  if (status) qs.set("status", status)
  if (level) qs.set("level", level)
  if (q) qs.set("q", q)
  const { data, mutate } = useSWR<Issue[]>(`${BASE}/issues?${qs.toString()}`, fetcher, { refreshInterval: 20_000 })

  async function setIssueStatus(fp: string, next: IssueStatus) {
    try {
      await fetch(`${BASE}/issues/${encodeURIComponent(fp)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
        credentials: "include",
      })
      notify.success(`Issue marked ${next}`)
      mutate()
    } catch { notify.error("Could not update issue") }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or error type…" className="pl-9 h-9" />
        </div>
        <Select value={status} onChange={setStatus} options={[
          { v: "open", label: "Open" }, { v: "resolved", label: "Resolved" }, { v: "ignored", label: "Ignored" }, { v: "", label: "All statuses" },
        ]} />
        <Select value={level} onChange={setLevel} options={[
          { v: "", label: "All levels" }, { v: "fatal", label: "Fatal" }, { v: "error", label: "Error" }, { v: "warning", label: "Warning" }, { v: "info", label: "Info" },
        ]} />
      </div>

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-secondary/30">
          <div className="col-span-6">Issue</div>
          <div className="col-span-2 text-right">Events</div>
          <div className="col-span-1 text-right">Users</div>
          <div className="col-span-2">Last seen</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {(data ?? []).map((i) => (
            <div key={i.fingerprint} className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
              <div className="col-span-12 md:col-span-6 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLOR[i.level]}`}>{i.level}</span>
                  {i.status !== "open" && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700">{i.status}</span>
                  )}
                </div>
                <button onClick={() => setOpen(i.fingerprint)} className="text-sm font-medium text-left hover:underline truncate block w-full">{i.title}</button>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{i.errorType ?? i.kind}</p>
              </div>
              <div className="col-span-4 md:col-span-2 text-right tabular-nums text-sm">{i.count}</div>
              <div className="col-span-4 md:col-span-1 text-right tabular-nums text-sm">{i.userCount}</div>
              <div className="col-span-4 md:col-span-2 text-xs text-muted-foreground">{fmtTime(i.lastSeen)}</div>
              <div className="col-span-12 md:col-span-1 flex md:justify-end gap-1">
                {i.status !== "resolved" && (
                  <button title="Resolve" onClick={() => setIssueStatus(i.fingerprint, "resolved")} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></button>
                )}
                {i.status !== "ignored" && (
                  <button title="Ignore" onClick={() => setIssueStatus(i.fingerprint, "ignored")} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-700"><EyeOff className="h-4 w-4" /></button>
                )}
                {i.status !== "open" && (
                  <button title="Reopen" onClick={() => setIssueStatus(i.fingerprint, "open")} className="p-1.5 rounded hover:bg-amber-50 text-amber-700"><ArchiveRestore className="h-4 w-4" /></button>
                )}
                <button title="Details" onClick={() => setOpen(i.fingerprint)} className="p-1.5 rounded hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {!data?.length && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Bug className="h-5 w-5 mx-auto mb-2 opacity-60" /> No issues match these filters.
            </div>
          )}
        </div>
      </div>

      {open && <IssueDrawer fp={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function IssueDrawer({ fp, onClose }: { fp: string; onClose: () => void }) {
  const { data } = useSWR<{
    issue: Issue; sample: MonEvent; events: MonEvent[]
    affected: { browsers: { name: string; count: number }[]; urls: { url: string; count: number }[] }
  }>(`${BASE}/issues/${encodeURIComponent(fp)}`, fetcher)

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="ml-auto relative w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Issue detail</p>
            <p className="text-sm font-semibold truncate mt-0.5">{data?.issue.title ?? "Loading…"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {!data ? (
          <div className="p-12 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mx-auto animate-spin" /></div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <KpiPill label="Events" value={String(data.issue.count)} />
              <KpiPill label="Users" value={String(data.issue.userCount)} />
              <KpiPill label="Last seen" value={fmtTime(data.issue.lastSeen)} />
            </div>

            {data.sample?.stack && (
              <section>
                <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Stack trace</h5>
                <pre className="text-[11px] bg-zinc-950 text-zinc-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap leading-relaxed">{data.sample.stack}</pre>
              </section>
            )}

            <section>
              <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Breadcrumbs</h5>
              <div className="space-y-1.5">
                {(data.sample?.breadcrumbs ?? []).slice(-12).reverse().map((b, i) => (
                  <div key={i} className="text-[11px] flex items-start gap-2 border border-border rounded p-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground w-16 flex-shrink-0">{b.category}</span>
                    <span className="flex-1 break-all">{b.message}</span>
                    <span className="text-muted-foreground flex-shrink-0">{fmtTime(b.timestamp)}</span>
                  </div>
                ))}
                {!data.sample?.breadcrumbs?.length && <p className="text-[11px] text-muted-foreground italic">No breadcrumbs captured.</p>}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <section>
                <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Browsers</h5>
                <div className="space-y-1">
                  {data.affected.browsers.slice(0, 5).map((b) => (
                    <div key={b.name} className="text-[11px] flex justify-between">
                      <span className="truncate">{b.name}</span>
                      <span className="tabular-nums text-muted-foreground">{b.count}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> URLs</h5>
                <div className="space-y-1">
                  {data.affected.urls.slice(0, 5).map((u) => (
                    <div key={u.url} className="text-[11px] flex justify-between gap-2">
                      <span className="truncate">{u.url}</span>
                      <span className="tabular-nums text-muted-foreground">{u.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section>
              <h5 className="text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">Recent events</h5>
              <div className="space-y-1.5">
                {data.events.slice(0, 10).map((e) => (
                  <div key={e.id} className="text-[11px] border border-border rounded p-2 flex items-start gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground mt-0.5" />
                    <span className="flex-1 break-all">{e.message}</span>
                    <span className="text-muted-foreground flex-shrink-0">{fmtTime(e.receivedAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  )
}

/* ---------- Events stream ---------- */

function EventsTab() {
  const [level, setLevel] = useState<EventLevel | "">("")
  const [q, setQ] = useState("")
  const qs = new URLSearchParams()
  if (level) qs.set("level", level)
  if (q) qs.set("q", q)
  qs.set("limit", "150")
  const { data, mutate } = useSWR<MonEvent[]>(`${BASE}/events?${qs.toString()}`, fetcher, { refreshInterval: 10_000 })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by message…" className="pl-9 h-9" />
        </div>
        <Select value={level} onChange={setLevel} options={[
          { v: "", label: "All levels" }, { v: "fatal", label: "Fatal" }, { v: "error", label: "Error" }, { v: "warning", label: "Warning" }, { v: "info", label: "Info" }, { v: "debug", label: "Debug" },
        ]} />
        <Button variant="outline" size="sm" onClick={() => mutate()}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
      </div>

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {(data ?? []).map((e) => (
            <div key={e.id} className="px-4 py-2.5 grid grid-cols-12 gap-2 items-start text-[12px]">
              <div className="col-span-1"><span className={`text-[9px] uppercase font-bold px-1 py-0.5 rounded border ${LEVEL_COLOR[e.level]}`}>{e.level}</span></div>
              <div className="col-span-7 min-w-0">
                <p className="truncate font-medium">{e.errorType ? <span className="text-muted-foreground">{e.errorType}:</span> : null} {e.message}</p>
                {e.url && <p className="text-[10px] text-muted-foreground truncate">{e.url}</p>}
              </div>
              <div className="col-span-2 text-[10px] text-muted-foreground truncate">{e.kind}</div>
              <div className="col-span-2 text-[10px] text-muted-foreground text-right">{fmtTime(e.receivedAt)}</div>
            </div>
          ))}
          {!data?.length && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Eye className="h-5 w-5 mx-auto mb-2 opacity-60" /> No events captured yet. Trigger one from the storefront to see it stream in.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Config ---------- */

function ConfigTab() {
  const { data, mutate } = useSWR<Config>(`${BASE}/config`, fetcher)
  const [draft, setDraft] = useState<Config | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (data && !draft) setDraft(data) }, [data, draft])

  if (!draft) return <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`${BASE}/config`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft), credentials: "include" })
      if (!r.ok) throw new Error()
      await mutate()
      notify.saved("Monitoring configuration updated")
    } catch { notify.error("Could not save configuration") }
    finally { setSaving(false) }
  }

  async function clearAll() {
    if (!confirm("Clear all captured events? This cannot be undone.")) return
    try {
      await fetch(`${BASE}/events`, { method: "DELETE", credentials: "include" })
      notify.success("Event buffer cleared")
    } catch { notify.error("Could not clear events") }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-lg border border-border bg-white p-4 space-y-4">
        <Row label="Ingest enabled" hint="Master switch — pause to stop accepting any new events.">
          <Switch checked={draft.ingestEnabled} onCheckedChange={(v) => setDraft({ ...draft, ingestEnabled: v })} />
        </Row>
        <Row label="Capture performance" hint="Records duration metrics for instrumented operations.">
          <Switch checked={draft.capturePerf} onCheckedChange={(v) => setDraft({ ...draft, capturePerf: v })} />
        </Row>
        <Row label="Sample rate" hint="Fraction of events to accept (0–1). Lower under heavy traffic.">
          <Input type="number" step="0.05" min={0} max={1} className="w-32" value={draft.sampleRate}
            onChange={(e) => setDraft({ ...draft, sampleRate: Number(e.target.value) })} />
        </Row>
        <Row label="Retention" hint="Max events kept in the ring buffer.">
          <Input type="number" min={100} max={50000} className="w-32" value={draft.retention}
            onChange={(e) => setDraft({ ...draft, retention: Number(e.target.value) })} />
        </Row>
        <Row label="Spike window (min)" hint="Bucket size used for spike detection.">
          <Input type="number" min={1} className="w-32" value={draft.spikeWindowMin}
            onChange={(e) => setDraft({ ...draft, spikeWindowMin: Number(e.target.value) })} />
        </Row>
        <Row label="Spike threshold" hint="Events per bucket that triggers a spike.">
          <Input type="number" min={1} className="w-32" value={draft.spikeThreshold}
            onChange={(e) => setDraft({ ...draft, spikeThreshold: Number(e.target.value) })} />
        </Row>
        <Row label="Release tag" hint="Identifies the build sending events.">
          <Input className="w-64" value={draft.release} onChange={(e) => setDraft({ ...draft, release: e.target.value })} />
        </Row>
        <Row label="Environment" hint="e.g. development, staging, production.">
          <Input className="w-48" value={draft.environment} onChange={(e) => setDraft({ ...draft, environment: e.target.value })} />
        </Row>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={clearAll} className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50">
          <Trash2 className="h-3.5 w-3.5" /> Clear all events
        </button>
        <Button onClick={save} disabled={saving} style={{ background: "#3D0814", color: "white" }}>
          {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving</> : "Save configuration"}
        </Button>
      </div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 px-2.5 rounded-md border border-input bg-white text-xs"
    >
      {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
    </select>
  )
}

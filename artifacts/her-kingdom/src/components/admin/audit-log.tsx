"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { logActivity } from "@/lib/audit-log"
import { useAdminAuditLog, type ServerAuditEntry } from "@/lib/api-nest"
import { notify } from "@/lib/notify"
import {
  Search, Download, ShieldAlert, Activity, User, Filter, X,
  ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react"

const WINE = "#3D0814"
const BORDER = "#E5E7EB"
const BORDER_SOFT = "#F3F4F6"
const TEXT_MUTED = "#6B7280"

type Range = "today" | "7d" | "30d" | "all"

const ACTION_STYLES: Record<string, { bg: string; fg: string }> = {
  create: { bg: "#DCFCE7", fg: "#166534" },
  update: { bg: "#DBEAFE", fg: "#1E40AF" },
  delete: { bg: "#FEE2E2", fg: "#991B1B" },
  status: { bg: "#FEF3C7", fg: "#92400E" },
  login: { bg: "#FEF3C7", fg: "#92400E" },
  logout: { bg: "#F3F4F6", fg: "#374151" },
  export: { bg: "#E0E7FF", fg: "#3730A3" },
}

const SEVERITY_STYLES: Record<ServerAuditEntry["severity"], { bg: string; fg: string; label: string }> = {
  info: { bg: "#DBEAFE", fg: "#1E40AF", label: "Info" },
  warning: { bg: "#FEF3C7", fg: "#92400E", label: "Warning" },
  danger: { bg: "#FEE2E2", fg: "#991B1B", label: "Danger" },
}

const ACTOR_TYPE_LABELS: Record<string, string> = {
  admin: "Admin",
  customer: "Customer",
  partner: "Partner",
  guest: "Guest",
  system: "System",
}

const PAGE_SIZE = 25

export function AdminAuditLog() {
  const [q, setQ] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [actorTypeFilter, setActorTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [range, setRange] = useState<Range>("7d")
  const [page, setPage] = useState(1)

  const sinceIso = useMemo(() => {
    const now = Date.now()
    if (range === "today") {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    if (range === "7d") return new Date(now - 7 * 86400000).toISOString()
    if (range === "30d") return new Date(now - 30 * 86400000).toISOString()
    return undefined
  }, [range])

  const { data: serverPage, isValidating, mutate } = useAdminAuditLog({
    page,
    pageSize: PAGE_SIZE,
    module: moduleFilter === "all" ? undefined : moduleFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
    actorType: actorTypeFilter === "all" ? undefined : actorTypeFilter,
    search: q.trim() || undefined,
    since: sinceIso,
  })

  const entries = serverPage?.items ?? []
  const total = serverPage?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filtered = useMemo(() => {
    if (severityFilter === "all") return entries
    return entries.filter((e) => e.severity === severityFilter)
  }, [entries, severityFilter])

  const modules = useMemo(
    () => Array.from(new Set(entries.map((e) => e.module))).sort(),
    [entries],
  )
  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  )

  const kpis = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()
    return {
      total,
      today: entries.filter((e) => e.ts >= todayTs).length,
      actors: new Set(entries.map((e) => e.actorEmail || e.userId || "system")).size,
      danger: entries.filter((e) => e.severity === "danger").length,
    }
  }, [entries, total])

  const exportCsv = async () => {
    try {
      const { nestFetch } = await import("@/lib/api-nest")
      const all: ServerAuditEntry[] = []
      let p = 1
      let pages = 1
      while (p <= pages) {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: "200",
        })
        if (moduleFilter !== "all") params.set("module", moduleFilter)
        if (actionFilter !== "all") params.set("action", actionFilter)
        if (actorTypeFilter !== "all") params.set("actorType", actorTypeFilter)
        if (q.trim()) params.set("search", q.trim())
        if (sinceIso) params.set("since", sinceIso)
        const chunk = await nestFetch<{
          items: ServerAuditEntry[]
          total: number
          page: number
          pageSize: number
        }>(`/admin/audit?${params.toString()}`)
        all.push(...chunk.items)
        pages = Math.ceil(chunk.total / chunk.pageSize)
        p += 1
      }
      const rows = all
        .filter((e) => severityFilter === "all" || e.severity === severityFilter)
        .map((e) => [
          new Date(e.ts).toISOString(),
          e.actorEmail ?? "",
          e.actorRole ?? "",
          e.actorType ?? "",
          e.module,
          e.action,
          e.severity,
          e.target ?? "",
          e.path ?? "",
          e.summary ?? "",
          e.ip ?? "",
        ])
      const header = [
        "Timestamp", "Actor", "Role", "ActorType", "Module", "Action",
        "Severity", "Target", "Path", "Summary", "IP",
      ]
      const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      logActivity({ module: "Audit Log", action: "export", meta: { rows: rows.length } })
      notify.success(`Exported ${rows.length} entries`)
    } catch {
      notify.error("Export failed")
    }
  }

  const resetFilters = () => {
    setQ("")
    setModuleFilter("all")
    setActionFilter("all")
    setActorTypeFilter("all")
    setSeverityFilter("all")
    setRange("7d")
    setPage(1)
  }

  return (
    <AdminShell title="Audit Log">
      <div className="space-y-5">
        <div className="rounded-xl bg-white border p-5" style={{ borderColor: BORDER }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-lg text-white" style={{ background: WINE }}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Audit Log</h2>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  Immutable server-side trail of every API mutation — admins, customers, partners, and guests across all modules.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void mutate()}
                disabled={isValidating}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: BORDER }}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} /> Refresh
              </button>
              <button
                type="button"
                onClick={() => void exportCsv()}
                disabled={total === 0}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: BORDER }}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Entries (filtered)" value={total.toLocaleString()} icon={Activity} />
          <Kpi label="On this page (today)" value={kpis.today.toLocaleString()} icon={RefreshCw} />
          <Kpi label="Actors (page)" value={kpis.actors.toLocaleString()} icon={User} />
          <Kpi label="Danger (page)" value={kpis.danger.toLocaleString()} icon={ShieldAlert} accent="#B91C1C" />
        </div>

        <div className="rounded-xl bg-white border p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[#374151]">
            <Filter className="h-4 w-4" /> Filters
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs text-[#6B7280] hover:text-[#111827] inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2 relative">
              <input
                type="text"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="Search actor, module, path, summary…"
                className="w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-sm focus:outline-none focus:border-[#3D0814]"
                style={{ borderColor: BORDER }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: TEXT_MUTED }} />
            </div>
            <Select
              value={range}
              onChange={(v) => { setRange(v as Range); setPage(1) }}
              options={[
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
                { value: "all", label: "All time" },
              ]}
            />
            <Select
              value={actorTypeFilter}
              onChange={(v) => { setActorTypeFilter(v); setPage(1) }}
              options={[
                { value: "all", label: "All actor types" },
                { value: "admin", label: "Admin" },
                { value: "customer", label: "Customer" },
                { value: "partner", label: "Partner" },
                { value: "guest", label: "Guest" },
                { value: "system", label: "System" },
              ]}
            />
            <Select
              value={moduleFilter}
              onChange={(v) => { setModuleFilter(v); setPage(1) }}
              options={[{ value: "all", label: "All modules" }, ...modules.map((m) => ({ value: m, label: m }))]}
            />
            <Select
              value={actionFilter}
              onChange={(v) => { setActionFilter(v); setPage(1) }}
              options={[{ value: "all", label: "All actions" }, ...actions.map((a) => ({ value: a, label: a }))]}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
            {(["all", "info", "warning", "danger"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverityFilter(s)}
                className="px-3 h-7 rounded-full border text-xs font-medium capitalize"
                style={
                  severityFilter === s
                    ? { background: WINE, color: "white", borderColor: WINE }
                    : { background: "white", color: "#374151", borderColor: BORDER }
                }
              >
                {s === "all" ? "All severities" : s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Type</Th>
                  <Th>Module</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Severity</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-[#9CA3AF]">
                      {total === 0
                        ? "No activity recorded yet. CRUD actions across the API will appear here automatically."
                        : "No entries match the current filters."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-[#FAFAFA]" style={{ borderColor: BORDER_SOFT }}>
                      <Td className="whitespace-nowrap">
                        <div className="text-[13px] font-medium text-[#111827]">{formatTime(e.ts)}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{relativeTime(e.ts)}</div>
                      </Td>
                      <Td>
                        <div className="text-[13px] font-medium text-[#111827] truncate max-w-[180px]">
                          {e.actorEmail || e.userId || "system"}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] capitalize">{e.actorRole || "—"}</div>
                      </Td>
                      <Td>
                        <ActorTypePill type={e.actorType} />
                      </Td>
                      <Td><span className="text-[13px] font-medium">{e.module}</span></Td>
                      <Td><ActionPill action={e.action} /></Td>
                      <Td className="max-w-[140px]">
                        <code className="text-[11px] font-mono text-[#6B7280] truncate inline-block max-w-full">
                          {e.target ?? "—"}
                        </code>
                      </Td>
                      <Td><SeverityPill severity={e.severity} /></Td>
                      <Td className="max-w-[240px]">
                        <div className="text-[11px] text-[#6B7280] truncate">
                          {e.summary || (e.path ? `${e.httpMethod ?? ""} ${e.path}`.trim() : "—")}
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t text-sm" style={{ borderColor: BORDER_SOFT }}>
              <span className="text-[#6B7280]">
                Page {page} of {totalPages} • {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 h-8 rounded border bg-white text-sm disabled:opacity-40 inline-flex items-center gap-1"
                  style={{ borderColor: BORDER }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 h-8 rounded border bg-white text-sm disabled:opacity-40 inline-flex items-center gap-1"
                  style={{ borderColor: BORDER }}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-[#9CA3AF] px-1">
          Append-only Postgres table <code className="font-mono">audit_log</code> — auto-captured by the API interceptor plus explicit business events. Cannot be cleared from the admin UI.
        </p>
      </div>
    </AdminShell>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[11px] font-semibold uppercase tracking-wide px-5 py-3">{children}</th>
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 align-top ${className || ""}`}>{children}</td>
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Activity; accent?: string }) {
  return (
    <div className="rounded-xl bg-white border p-4 flex items-start justify-between gap-2" style={{ borderColor: BORDER }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: accent || "#111827" }}>{value}</p>
      </div>
      <div className="grid place-items-center h-9 w-9 rounded-lg" style={{ background: "#F9FAFB", color: accent || WINE }}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-lg border bg-white text-sm focus:outline-none focus:border-[#3D0814]"
      style={{ borderColor: BORDER }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function ActionPill({ action }: { action: string }) {
  const s = ACTION_STYLES[action] ?? { bg: "#F3F4F6", fg: "#374151" }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize" style={{ background: s.bg, color: s.fg }}>
      {action}
    </span>
  )
}

function ActorTypePill({ type }: { type?: string }) {
  const label = type ? (ACTOR_TYPE_LABELS[type] ?? type) : "—"
  const colors: Record<string, { bg: string; fg: string }> = {
    admin: { bg: "#FCE7F3", fg: "#9D174D" },
    customer: { bg: "#DBEAFE", fg: "#1E40AF" },
    partner: { bg: "#E0E7FF", fg: "#3730A3" },
    guest: { bg: "#F3F4F6", fg: "#374151" },
    system: { bg: "#FEF3C7", fg: "#92400E" },
  }
  const s = colors[type ?? ""] ?? { bg: "#F3F4F6", fg: "#374151" }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {label}
    </span>
  )
}

function SeverityPill({ severity }: { severity: ServerAuditEntry["severity"] }) {
  const s = SEVERITY_STYLES[severity]
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

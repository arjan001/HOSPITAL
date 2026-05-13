"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useAuditLog, clearAuditLog, logActivity, type AuditEntry } from "@/lib/audit-log"
import { notify } from "@/lib/notify"
import {
  Search, Download, Trash2, ShieldAlert, Activity, User, Filter, X,
  ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react"

const WINE = "#3D0814"
const BORDER = "#E5E7EB"
const BORDER_SOFT = "#F3F4F6"
const TEXT_MUTED = "#6B7280"

type Range = "today" | "7d" | "30d" | "all"

const ACTION_STYLES: Record<string, { bg: string; fg: string }> = {
  create:    { bg: "#DCFCE7", fg: "#166534" },
  update:    { bg: "#DBEAFE", fg: "#1E40AF" },
  delete:    { bg: "#FEE2E2", fg: "#991B1B" },
  reorder:   { bg: "#E0E7FF", fg: "#3730A3" },
  publish:   { bg: "#DCFCE7", fg: "#166534" },
  login:     { bg: "#FEF3C7", fg: "#92400E" },
  logout:    { bg: "#F3F4F6", fg: "#374151" },
  export:    { bg: "#E0E7FF", fg: "#3730A3" },
  clear:     { bg: "#FEE2E2", fg: "#991B1B" },
}

const SEVERITY_STYLES: Record<AuditEntry["severity"], { bg: string; fg: string; label: string }> = {
  info:    { bg: "#DBEAFE", fg: "#1E40AF", label: "Info" },
  warning: { bg: "#FEF3C7", fg: "#92400E", label: "Warning" },
  danger:  { bg: "#FEE2E2", fg: "#991B1B", label: "Danger" },
}

export function AdminAuditLog() {
  const entries = useAuditLog()
  const [q, setQ] = useState("")
  const [moduleFilter, setModuleFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [range, setRange] = useState<Range>("7d")
  const [page, setPage] = useState(1)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const PAGE_SIZE = 20

  const modules = useMemo(() => Array.from(new Set(entries.map((e) => e.module))).sort(), [entries])
  const actions = useMemo(() => Array.from(new Set(entries.map((e) => e.action))).sort(), [entries])

  const rangeStart = useMemo(() => {
    const now = Date.now()
    if (range === "today") {
      const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
    }
    if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000
    if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000
    return 0
  }, [range])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return entries
      .filter((e) => e.ts >= rangeStart)
      .filter((e) => moduleFilter === "all" || e.module === moduleFilter)
      .filter((e) => actionFilter === "all" || e.action === actionFilter)
      .filter((e) => severityFilter === "all" || e.severity === severityFilter)
      .filter((e) => {
        if (!ql) return true
        const hay = `${e.actorEmail} ${e.module} ${e.action} ${e.target ?? ""} ${JSON.stringify(e.meta ?? {})}`.toLowerCase()
        return hay.includes(ql)
      })
      .sort((a, b) => b.ts - a.ts)
  }, [entries, rangeStart, moduleFilter, actionFilter, severityFilter, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* KPIs (over the filter range) */
  const kpis = useMemo(() => {
    const inRange = entries.filter((e) => e.ts >= rangeStart)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()
    return {
      total: inRange.length,
      today: entries.filter((e) => e.ts >= todayTs).length,
      actors: new Set(inRange.map((e) => e.actorEmail)).size,
      danger: inRange.filter((e) => e.severity === "danger").length,
    }
  }, [entries, rangeStart])

  const exportCsv = () => {
    const header = ["Timestamp", "ISO", "Actor", "Role", "Module", "Action", "Severity", "Target", "Path", "Meta"]
    const rows = filtered.map((e) => [
      String(e.ts),
      new Date(e.ts).toISOString(),
      e.actorEmail,
      e.actorRole,
      e.module,
      e.action,
      e.severity,
      e.target ?? "",
      e.pathname ?? "",
      JSON.stringify(e.meta ?? {}),
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    logActivity({ module: "Audit Log", action: "export", meta: { rows: filtered.length } })
    notify.success(`Exported ${filtered.length} entries`)
  }

  const resetFilters = () => {
    setQ(""); setModuleFilter("all"); setActionFilter("all"); setSeverityFilter("all"); setRange("7d"); setPage(1)
  }

  return (
    <AdminShell title="Audit Log">
      <div className="space-y-5">
        {/* Header card */}
        <div className="rounded-xl bg-white border p-5" style={{ borderColor: BORDER }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="grid place-items-center h-10 w-10 rounded-lg text-white" style={{ background: WINE }}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Audit Log</h2>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  Every CMS change made under <code className="font-mono text-xs">/admin/*</code> is recorded automatically — including who, what, and when.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: BORDER }}
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                disabled={entries.length === 0}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: "#B91C1C" }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear log
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Entries (range)" value={kpis.total.toLocaleString()} icon={Activity} />
          <Kpi label="Today" value={kpis.today.toLocaleString()} icon={RefreshCw} />
          <Kpi label="Active actors" value={kpis.actors.toLocaleString()} icon={User} />
          <Kpi label="Danger events" value={kpis.danger.toLocaleString()} icon={ShieldAlert} accent="#B91C1C" />
        </div>

        {/* Filters */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2 relative">
              <input
                type="text"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="Search actor, module, target, meta…"
                className="w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-sm focus:outline-none focus:border-[#3D0814]"
                style={{ borderColor: BORDER }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: TEXT_MUTED }} />
            </div>
            <Select value={range} onChange={(v) => { setRange(v as Range); setPage(1) }}
              options={[
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
                { value: "all", label: "All time" },
              ]}
            />
            <Select value={moduleFilter} onChange={(v) => { setModuleFilter(v); setPage(1) }}
              options={[{ value: "all", label: "All modules" }, ...modules.map((m) => ({ value: m, label: m }))]}
            />
            <Select value={actionFilter} onChange={(v) => { setActionFilter(v); setPage(1) }}
              options={[{ value: "all", label: "All actions" }, ...actions.map((a) => ({ value: a, label: a }))]}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            {(["all", "info", "warning", "danger"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSeverityFilter(s); setPage(1) }}
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

        {/* Table */}
        <div className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[#6B7280]">
                <tr>
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Module</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Severity</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[#9CA3AF]">
                      {entries.length === 0
                        ? "No activity yet. Make any change in an admin module to see it appear here."
                        : "No entries match the current filters."}
                    </td>
                  </tr>
                ) : (
                  slice.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-[#FAFAFA]" style={{ borderColor: BORDER_SOFT }}>
                      <Td className="whitespace-nowrap">
                        <div className="text-[13px] font-medium text-[#111827]">{formatTime(e.ts)}</div>
                        <div className="text-[11px] text-[#9CA3AF]">{relativeTime(e.ts)}</div>
                      </Td>
                      <Td>
                        <div className="text-[13px] font-medium text-[#111827] truncate max-w-[200px]">{e.actorEmail}</div>
                        <div className="text-[11px] text-[#9CA3AF] capitalize">{e.actorRole}</div>
                      </Td>
                      <Td><span className="text-[13px] font-medium">{e.module}</span></Td>
                      <Td><ActionPill action={e.action} /></Td>
                      <Td className="max-w-[180px]">
                        <code className="text-[11px] font-mono text-[#6B7280] truncate inline-block max-w-full align-middle">{e.target ?? "—"}</code>
                      </Td>
                      <Td><SeverityPill severity={e.severity} /></Td>
                      <Td className="max-w-[260px]">
                        <code className="text-[11px] font-mono text-[#6B7280] truncate inline-block max-w-full align-middle">
                          {e.meta && Object.keys(e.meta).length > 0 ? JSON.stringify(e.meta) : "—"}
                        </code>
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
                Page {page} of {totalPages} • {filtered.length.toLocaleString()} {filtered.length === 1 ? "entry" : "entries"}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2.5 h-8 rounded border bg-white text-sm disabled:opacity-40 inline-flex items-center gap-1" style={{ borderColor: BORDER }}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2.5 h-8 rounded border bg-white text-sm disabled:opacity-40 inline-flex items-center gap-1" style={{ borderColor: BORDER }}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-[#9CA3AF] px-1">
          Stored locally for now (cmsStore key <code className="font-mono">audit-log</code>). When the NestJS backend ships, this same module will stream events to the server in one place — no per-page changes required.
        </p>
      </div>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onClick={() => setShowClearConfirm(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: BORDER_SOFT }}>
              <ShieldAlert className="h-5 w-5 text-[#B91C1C]" />
              <h3 className="text-base font-semibold">Clear audit log?</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <p>This will permanently delete <strong>{entries.length.toLocaleString()}</strong> log {entries.length === 1 ? "entry" : "entries"}. This action itself will be recorded.</p>
              <p className="text-[#6B7280]">Consider exporting to CSV first.</p>
            </div>
            <div className="px-5 py-3 border-t flex items-center justify-end gap-2 bg-[#FAFAFA]" style={{ borderColor: BORDER_SOFT }}>
              <button type="button" onClick={() => setShowClearConfirm(false)} className="px-4 h-9 rounded-lg border bg-white text-sm font-medium hover:bg-gray-50" style={{ borderColor: BORDER }}>Cancel</button>
              <button
                type="button"
                onClick={() => {
                  clearAuditLog()
                  setShowClearConfirm(false)
                  notify.success("Audit log cleared")
                }}
                className="px-4 h-9 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#B91C1C" }}
              >
                Yes, clear log
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

/* ---------- Bits ---------- */

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

function SeverityPill({ severity }: { severity: AuditEntry["severity"] }) {
  const s = SEVERITY_STYLES[severity]
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

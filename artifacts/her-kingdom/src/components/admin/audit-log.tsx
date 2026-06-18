"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AdminShell } from "./admin-shell"
import { logActivity } from "@/lib/audit-log"
import {
  useAdminAuditLog,
  useAdminAuditModules,
  useAdminAuditActions,
  type ServerAuditEntry,
  type ServerAuditSeverity,
} from "@/lib/api-nest"
import { notify } from "@/lib/notify"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search, Download, ShieldAlert, Activity, User, Filter, X,
  ChevronLeft, ChevronRight, RefreshCw, Eye, Loader2,
} from "lucide-react"

const WINE = "#3D0814"
const BORDER = "#E5E7EB"

type Range = "today" | "7d" | "30d" | "all"
const PAGE_SIZE = 25

const ACTION_STYLES: Record<string, { bg: string; fg: string }> = {
  create: { bg: "#DCFCE7", fg: "#166534" },
  update: { bg: "#DBEAFE", fg: "#1E40AF" },
  delete: { bg: "#FEE2E2", fg: "#991B1B" },
  status: { bg: "#FEF3C7", fg: "#92400E" },
  login: { bg: "#FEF3C7", fg: "#92400E" },
  logout: { bg: "#F3F4F6", fg: "#374151" },
  export: { bg: "#E0E7FF", fg: "#3730A3" },
}

const SEVERITY_STYLES: Record<ServerAuditSeverity, { bg: string; fg: string; label: string }> = {
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

/** Drop legacy browser-only audit rows — Postgres is the only source of truth. */
function purgeLegacyLocalAudit() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem("shaniidrx.cms.audit-log")
  } catch {
    /* ignore */
  }
}

export function AdminAuditLog() {
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [actorTypeFilter, setActorTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState<"all" | ServerAuditSeverity>("all")
  const [range, setRange] = useState<Range>("7d")
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<ServerAuditEntry | null>(null)

  useEffect(() => {
    purgeLegacyLocalAudit()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [q])

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

  const { data: serverPage, isLoading, isValidating, mutate } = useAdminAuditLog({
    page,
    pageSize: PAGE_SIZE,
    module: moduleFilter === "all" ? undefined : moduleFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
    actorType: actorTypeFilter === "all" ? undefined : actorTypeFilter,
    search: debouncedQ || undefined,
    since: sinceIso,
    severity: severityFilter === "all" ? undefined : severityFilter,
  })

  const { data: moduleOptions = [] } = useAdminAuditModules()
  const { data: actionOptions = [] } = useAdminAuditActions()

  const entries = serverPage?.items ?? []
  const total = serverPage?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const exportCsv = async () => {
    try {
      const { nestFetch } = await import("@/lib/api-nest")
      const all: ServerAuditEntry[] = []
      let p = 1
      let pages = 1
      while (p <= pages) {
        const params = new URLSearchParams({ page: String(p), pageSize: "200" })
        if (moduleFilter !== "all") params.set("module", moduleFilter)
        if (actionFilter !== "all") params.set("action", actionFilter)
        if (actorTypeFilter !== "all") params.set("actorType", actorTypeFilter)
        if (severityFilter !== "all") params.set("severity", severityFilter)
        if (debouncedQ) params.set("search", debouncedQ)
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
      const header = [
        "Timestamp", "Actor", "Role", "ActorType", "Module", "Action",
        "Severity", "Target", "HTTP", "Path", "Summary", "IP",
      ]
      const rows = all.map((e) => [
        new Date(e.ts).toISOString(),
        e.actorEmail ?? "",
        e.actorRole ?? "",
        e.actorType ?? "",
        e.module,
        e.action,
        e.severity,
        e.target ?? "",
        e.httpMethod ?? "",
        e.path ?? "",
        e.summary ?? "",
        e.ip ?? "",
      ])
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
    setDebouncedQ("")
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
                <p className="text-sm text-muted-foreground mt-0.5">
                  Live activity from Postgres — all API mutations by admins, customers, partners, and guests.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void mutate()}
                disabled={isValidating}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isValidating ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void exportCsv()}
                disabled={total === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Matching entries" value={total.toLocaleString()} icon={Activity} />
          <Kpi label="This page" value={entries.length.toLocaleString()} icon={RefreshCw} />
          <Kpi
            label="Actors (page)"
            value={new Set(entries.map((e) => e.actorEmail || e.userId || "system")).size.toLocaleString()}
            icon={User}
          />
          <Kpi
            label="Danger (page)"
            value={entries.filter((e) => e.severity === "danger").length.toLocaleString()}
            icon={ShieldAlert}
            accent="#B91C1C"
          />
        </div>

        <div className="rounded-xl bg-white border p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2 mb-3 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filters
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search actor, module, path, summary…"
                className="pl-9"
              />
            </div>
            <FilterSelect
              value={range}
              onChange={(v) => { setRange(v as Range); setPage(1) }}
              options={[
                { value: "today", label: "Today" },
                { value: "7d", label: "Last 7 days" },
                { value: "30d", label: "Last 30 days" },
                { value: "all", label: "All time" },
              ]}
            />
            <FilterSelect
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
            <FilterSelect
              value={moduleFilter}
              onChange={(v) => { setModuleFilter(v); setPage(1) }}
              options={[
                { value: "all", label: "All modules" },
                ...moduleOptions.map((m) => ({ value: m, label: m })),
              ]}
            />
            <FilterSelect
              value={actionFilter}
              onChange={(v) => { setActionFilter(v); setPage(1) }}
              options={[
                { value: "all", label: "All actions" },
                ...actionOptions.map((a) => ({ value: a, label: a })),
              ]}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
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

        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
          {isLoading && !serverPage ? (
            <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: WINE }} />
              <p className="text-sm">Loading audit log from database…</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[140px]">When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead className="w-[90px]">Type</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                    <TableHead className="w-[120px]">Target</TableHead>
                    <TableHead className="w-[90px]">Severity</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        {total === 0
                          ? "No activity in the database yet. CRUD actions across the API are recorded automatically."
                          : "No entries match the current filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((e) => (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetail(e)}>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-medium">{formatTime(e.ts)}</div>
                          <div className="text-[11px] text-muted-foreground">{relativeTime(e.ts)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium truncate max-w-[200px]">
                            {e.actorEmail || e.userId || "system"}
                          </div>
                          <div className="text-[11px] text-muted-foreground capitalize">{e.actorRole || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <ActorTypePill type={e.actorType} />
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[200px] truncate">{e.module}</TableCell>
                        <TableCell>
                          <ActionPill action={e.action} />
                        </TableCell>
                        <TableCell>
                          <code className="text-[11px] text-muted-foreground truncate block max-w-[120px]">
                            {e.target ?? "—"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <SeverityPill severity={e.severity} />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="p-1.5 rounded-md hover:bg-muted"
                            onClick={(ev) => { ev.stopPropagation(); setDetail(e) }}
                            aria-label="View details"
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t text-sm">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages} · {total.toLocaleString()} {total === 1 ? "entry" : "entries"}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground px-1">
          Immutable Postgres table <code className="font-mono">audit_log</code>. Entries cannot be cleared from the admin panel.
        </p>
      </div>

      {detail && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: WINE }}>Audit entry</h3>
                <p className="text-xs text-muted-foreground font-mono">{detail.id}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <DetailRow label="When" value={new Date(detail.ts).toLocaleString()} />
              <DetailRow label="Actor" value={detail.actorEmail || detail.userId || "system"} />
              <DetailRow label="Role" value={detail.actorRole || "—"} />
              <DetailRow label="Actor type" value={detail.actorType || "—"} />
              <DetailRow label="Module" value={detail.module} />
              <DetailRow label="Action" value={detail.action} />
              <DetailRow label="Severity" value={detail.severity} />
              <DetailRow label="Target" value={detail.target || "—"} mono />
              {detail.httpMethod && <DetailRow label="HTTP" value={`${detail.httpMethod} ${detail.path ?? ""}`.trim()} mono />}
              {detail.ip && <DetailRow label="IP" value={detail.ip} mono />}
              {detail.summary && <DetailRow label="Summary" value={detail.summary} />}
              {detail.meta && Object.keys(detail.meta).length > 0 && (
                <div>
                  <dt className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Payload</dt>
                  <dd>
                    <pre className="text-[11px] bg-muted/50 rounded-lg p-3 overflow-x-auto max-h-48">
                      {JSON.stringify(detail.meta, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>,
        document.body,
      )}
    </AdminShell>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 border-b border-muted/50 pb-2">
      <dt className="w-24 shrink-0 text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className={`flex-1 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  )
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Activity; accent?: string }) {
  return (
    <div className="rounded-xl bg-white border p-4 flex items-start justify-between gap-2" style={{ borderColor: BORDER }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: accent || "#111827" }}>{value}</p>
      </div>
      <div className="grid place-items-center h-9 w-9 rounded-lg bg-muted/50" style={{ color: accent || WINE }}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-md border border-input bg-background text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function ActionPill({ action }: { action: string }) {
  const s = ACTION_STYLES[action] ?? { bg: "#F3F4F6", fg: "#374151" }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={{ background: s.bg, color: s.fg }}>
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
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {label}
    </span>
  )
}

function SeverityPill({ severity }: { severity: ServerAuditSeverity }) {
  const s = SEVERITY_STYLES[severity]
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
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

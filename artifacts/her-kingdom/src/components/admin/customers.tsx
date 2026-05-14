"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { AdminShell } from "./admin-shell"
import { Search, Trash2, Mail, Phone, ShieldCheck, UserPlus, Download } from "lucide-react"
import { cmsStore } from "@/lib/cms-store"
import {
  deleteCustomer,
  readCustomers,
  type CustomerRecord,
} from "@/lib/use-customer-mirror"

const WINE = "#3D0814"
const ACCENT_ORANGE = "#F97316"
const PEACH = "#F2DCC8"

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {}
  const handler = () => cb()
  window.addEventListener("storage", handler)
  // cmsStore writes don't fire 'storage' in the same tab — listen to its own bus.
  const interval = window.setInterval(cb, 1500)
  return () => {
    window.removeEventListener("storage", handler)
    window.clearInterval(interval)
  }
}

function useCustomersList(): CustomerRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => JSON.stringify(readCustomers()),
    () => "[]",
  ) ? readCustomers() : readCustomers()
}

function fmtDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    })
  } catch { return iso }
}

function fmtRelative(iso: string): string {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso
  const diffMs = Date.now() - then
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return fmtDate(iso)
}

function sourceBadge(source: CustomerRecord["source"]) {
  const map: Record<CustomerRecord["source"], { label: string; bg: string; fg: string }> = {
    email:   { label: "Email",  bg: "#FFE5C8", fg: "#9A3412" },
    google:  { label: "Google", bg: "#DBEAFE", fg: "#1D4ED8" },
    phone:   { label: "Phone",  bg: "#DCFCE7", fg: "#166534" },
    unknown: { label: "Other",  bg: "#F1F5F9", fg: "#475569" },
  }
  const m = map[source] ?? map.unknown
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: m.bg, color: m.fg }}>
      {m.label}
    </span>
  )
}

export function AdminCustomers() {
  const customers = useCustomersList()
  const [search, setSearch] = useState("")
  const [confirm, setConfirm] = useState<CustomerRecord | null>(null)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return customers
    return customers.filter((c) =>
      [c.fullName, c.email, c.phone, c.firstName, c.lastName].some((v) =>
        (v || "").toLowerCase().includes(s),
      ),
    )
  }, [customers, search])

  const stats = useMemo(() => {
    const total = customers.length
    const last24 = customers.filter((c) => {
      const t = new Date(c.createdAt).getTime()
      return Number.isFinite(t) && Date.now() - t < 24 * 3600 * 1000
    }).length
    const bySource = customers.reduce<Record<string, number>>((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1
      return acc
    }, {})
    return { total, last24, bySource }
  }, [customers])

  const exportCsv = () => {
    const header = ["id", "fullName", "email", "phone", "source", "createdAt", "lastSeenAt"]
    const rows = customers.map((c) =>
      header.map((k) => JSON.stringify((c as unknown as Record<string, unknown>)[k] ?? "")).join(","),
    )
    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shaniid-customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell title="Customers">
      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Kpi label="Total customers" value={stats.total} icon={<UserPlus className="h-4 w-4" />} />
          <Kpi label="New in last 24h" value={stats.last24} icon={<ShieldCheck className="h-4 w-4" />} />
          <Kpi label="Email signups" value={stats.bySource.email || 0} icon={<Mail className="h-4 w-4" />} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-sm outline-none"
              style={{ borderColor: PEACH }}
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={customers.length === 0}
            className="h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            style={{ background: "white", border: `1px solid ${PEACH}`, color: WINE }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: PEACH }}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full mb-3 flex items-center justify-center"
                style={{ background: "rgba(61,8,20,0.06)", color: WINE }}>
                <UserPlus className="h-6 w-6" />
              </div>
              <p className="font-semibold" style={{ color: WINE }}>
                {search ? "No customers match that search" : "No customers yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search
                  ? "Try a different name, email or phone."
                  : "Customers appear here as soon as they create an account or sign in."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider"
                    style={{ background: "#FFFBF5", color: WINE }}>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">Signup</th>
                    <th className="px-4 py-3 font-bold">Joined</th>
                    <th className="px-4 py-3 font-bold">Last seen</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: ACCENT_ORANGE, color: "white" }}>
                              {(c.firstName || c.fullName || c.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold" style={{ color: WINE }}>
                              {c.fullName || "(unnamed)"}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">{c.id.slice(0, 18)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Mail className="h-3 w-3 opacity-60" /> {c.email}
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3 w-3 opacity-60" /> {c.phone}
                            </div>
                          )}
                          {!c.email && !c.phone && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">{sourceBadge(c.source)}</td>
                      <td className="px-4 py-3 text-xs">{fmtDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtRelative(c.lastSeenAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirm(c)}
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold border hover:bg-red-50"
                          style={{ borderColor: "#FECACA", color: "#B91C1C" }}
                          title="Remove from CMS list (does not delete the Clerk account)"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold" style={{ color: WINE }}>
              Remove {confirm.fullName || confirm.email || "customer"} from list?
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              This only removes them from the local Customers list. Their account in Clerk remains active —
              they will reappear here next time they sign in.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)}
                className="h-9 px-4 rounded-md text-sm font-semibold border hover:bg-secondary"
                style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                Cancel
              </button>
              <button
                onClick={() => { deleteCustomer(confirm.id); cmsStore.set("customers", readCustomers()); setConfirm(null) }}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white inline-flex items-center gap-1.5"
                style={{ background: "#B91C1C" }}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 flex items-center gap-3" style={{ borderColor: PEACH }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(249,115,22,0.12)", color: ACCENT_ORANGE }}>
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold" style={{ color: WINE }}>{value}</div>
      </div>
    </div>
  )
}

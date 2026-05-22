"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import {
  useAdminTickets,
  adminReplyTicket,
  adminSetTicketStatus,
  type ClientTicket,
} from "@/lib/notifications-client"
import { Inbox, Search, Send, CheckCircle2, Clock, X } from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

const STATUS_META: Record<ClientTicket["status"], { label: string; cls: string }> = {
  open:     { label: "Open",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", cls: "bg-green-50 text-green-700 border-green-200" },
  closed:   { label: "Closed",   cls: "bg-neutral-100 text-neutral-600 border-neutral-200" },
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "just now"
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

import { useRoute } from "wouter"

export function AdminSupportTickets() {
  const [, params] = useRoute("/admin/support/:id")
  const routeId = params?.id ?? null
  const { items, refresh, loading } = useAdminTickets()
  const [filter, setFilter] = useState<"all" | ClientTicket["status"]>("all")
  const [q, setQ] = useState("")
  const [activeId, setActiveId] = useState<string | null>(routeId)
  useEffect(() => { if (routeId) setActiveId(routeId) }, [routeId])
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, open: 0, pending: 0, resolved: 0, closed: 0 }
    for (const t of items) c[t.status] = (c[t.status] ?? 0) + 1
    return c
  }, [items])

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return items
      .filter((t) => filter === "all" || t.status === filter)
      .filter((t) => !ql ||
        t.subject.toLowerCase().includes(ql) ||
        t.shortId.toLowerCase().includes(ql) ||
        t.customer.name.toLowerCase().includes(ql) ||
        t.customer.email.toLowerCase().includes(ql))
  }, [items, filter, q])

  const active = items.find((t) => t.id === activeId) || null
  useEffect(() => { setReply("") }, [activeId])

  async function sendReply() {
    if (!active || !reply.trim()) return
    setSending(true)
    const next = await adminReplyTicket(active.id, reply.trim())
    setSending(false)
    if (next) { setReply(""); await refresh() }
  }

  async function setStatus(status: ClientTicket["status"]) {
    if (!active) return
    await adminSetTicketStatus(active.id, status)
    await refresh()
  }

  return (
    <AdminShell title="Support Tickets">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: WINE }}>
            <Inbox className="h-6 w-6" /> Support tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer-initiated threads. Replies go back to the customer by email and notification.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "open", "pending", "resolved", "closed"] as const).map((k) => {
          const isActive = filter === k
          const label = k === "all" ? "All" : STATUS_META[k as ClientTicket["status"]].label
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-muted"
              }`}
            >
              {label} <span className={isActive ? "opacity-70" : "text-muted-foreground"}>({counts[k] ?? 0})</span>
            </button>
          )
        })}
        <div className="relative ml-auto w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickets…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-full focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-background">
        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading tickets…</div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No tickets match your filters.</div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((t) => (
              <li
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className="px-5 py-4 hover:bg-muted/30 cursor-pointer grid grid-cols-1 sm:grid-cols-[1fr_2fr_0.8fr_0.7fr] gap-3 items-center"
              >
                <div>
                  <p className="text-xs font-bold" style={{ color: WINE }}>{t.shortId}</p>
                  <p className="text-[11px] text-muted-foreground">{t.customer.name}</p>
                </div>
                <div className="text-sm truncate" title={t.subject}>{t.subject}</div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_META[t.status].cls}`}>
                    {STATUS_META[t.status].label}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo(t.updatedAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setActiveId(null)} />
          <aside className="w-full max-w-2xl bg-white border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {active.shortId} · {active.category}
                </p>
                <h2 className="text-lg font-bold mt-1" style={{ color: WINE }}>{active.subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{active.customer.name} · {active.customer.email}</p>
              </div>
              <button onClick={() => setActiveId(null)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
            </div>

            <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2">
              {(["open", "pending", "resolved", "closed"] as const).map((s) => {
                const on = active.status === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium border ${
                      on ? STATUS_META[s].cls : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {s === "resolved" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {STATUS_META[s].label}
                  </button>
                )
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-muted/20">
              {active.messages.map((m) => (
                <div key={m.id} className={`flex ${m.author === "staff" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      m.author === "staff" ? "text-white" : "bg-white border border-border"
                    }`}
                    style={m.author === "staff" ? { background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` } : undefined}
                  >
                    <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${m.author === "staff" ? "text-white/80" : "text-muted-foreground"}`}>
                      {m.authorName}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.author === "staff" ? "text-white/70" : "text-muted-foreground"}`}>
                      {timeAgo(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-6 py-4 bg-white">
              <textarea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-foreground resize-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-white shadow-sm disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
                >
                  <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send reply"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  )
}

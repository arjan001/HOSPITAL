"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { AdminShell } from "./admin-shell"
import { notify } from "@/lib/notify"
import { usePermission } from "@/lib/permissions"
import { pipelineClient, type OutboxRow, type OutboxStatus } from "@/lib/pipeline-client"
import {
  Inbox, RefreshCw, Send, Trash2, Mail, MessageSquare, Phone, Lock,
  CheckCircle2, Clock, AlertTriangle,
} from "lucide-react"

const WINE = "#3D0814"

const CHANNEL_META: Record<OutboxRow["channel"], { label: string; icon: typeof Mail }> = {
  email:    { label: "Email",    icon: Mail },
  sms:      { label: "SMS",      icon: Phone },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
}

const STATUS_META: Record<OutboxStatus, { label: string; cls: string; icon: typeof Clock }> = {
  queued: { label: "Queued", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock },
  sent:   { label: "Sent",   cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-red-50 text-red-800 border-red-200", icon: AlertTriangle },
}

function fmt(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export function AdminMessageOutbox() {
  const canManage = usePermission("integrations.manage")
  const { data, error, isLoading, mutate } = useSWR<OutboxRow[]>(
    "communications.outbox",
    () => pipelineClient.communications.outbox.list(),
    { revalidateOnFocus: false },
  )
  const [statusFilter, setStatusFilter] = useState<OutboxStatus | "all">("all")
  const [busyId, setBusyId] = useState<string | null>(null)

  const rows = data ?? []

  const counts = useMemo(() => {
    const c = { all: rows.length, queued: 0, sent: 0, failed: 0 } as Record<OutboxStatus | "all", number>
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  )

  const resend = async (row: OutboxRow) => {
    if (!canManage) { notify.warning("You don't have permission to resend messages."); return }
    setBusyId(row.id)
    try {
      const res = await pipelineClient.communications.outbox.resend(row.id)
      await mutate()
      if (res.ok) {
        notify.saved(`Resent to ${row.to}`)
      } else if (res.status === "queued") {
        notify.warning(res.reason || "Still queued — provider not configured yet.")
      } else {
        notify.error(res.reason || "Resend failed.")
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Resend failed.")
    } finally {
      setBusyId(null)
    }
  }

  const dismiss = async (row: OutboxRow) => {
    if (!canManage) { notify.warning("You don't have permission to clear messages."); return }
    if (!window.confirm(`Remove the queued message to ${row.to}?`)) return
    setBusyId(row.id)
    try {
      await pipelineClient.communications.outbox.dismiss(row.id)
      await mutate()
      notify.saved("Message removed")
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to remove message.")
    } finally {
      setBusyId(null)
    }
  }

  const clearSent = async () => {
    if (!canManage) { notify.warning("You don't have permission to clear messages."); return }
    if (counts.sent === 0) { notify.info("Nothing sent to clear."); return }
    if (!window.confirm(`Clear ${counts.sent} sent message(s) from the outbox?`)) return
    try {
      const res = await pipelineClient.communications.outbox.clearSent()
      await mutate()
      notify.saved(`Cleared ${res.removed} sent message(s)`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Failed to clear sent messages.")
    }
  }

  return (
    <AdminShell title="Message outbox">
      <div className="space-y-4">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: WINE }}>
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Message outbox</h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Patient texts and emails that were generated but couldn't be sent — usually because a delivery channel
                isn't switched on yet. Switch on the channel, then resend. Clear entries you no longer need.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => mutate()}
              className="h-10 px-3 rounded-md text-sm font-medium border inline-flex items-center gap-2 hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={clearSent}
              disabled={!canManage || counts.sent === 0}
              className="h-10 px-3 rounded-md text-sm font-medium border inline-flex items-center gap-2 hover:bg-muted disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Clear sent
            </button>
          </div>
        </header>

        {!canManage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> You have read-only access. Resend and clear require the “integrations.manage” permission.
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "queued", "sent", "failed"] as const).map((s) => {
            const active = statusFilter === s
            const label = s === "all" ? "All" : STATUS_META[s].label
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`h-8 px-3 rounded-full text-xs font-medium border transition ${
                  active ? "text-white border-transparent" : "hover:bg-muted"
                }`}
                style={active ? { background: WINE } : undefined}
              >
                {label} ({counts[s] ?? 0})
              </button>
            )
          })}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-6 text-center">
            Couldn't load the outbox. {error instanceof Error ? error.message : ""}
          </div>
        ) : isLoading ? (
          <div className="rounded-md border bg-muted/30 text-muted-foreground text-sm px-4 py-10 text-center">
            Loading outbox…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border bg-muted/30 text-muted-foreground text-sm px-4 py-12 text-center">
            {rows.length === 0
              ? "Nothing in the outbox — every patient text has gone out, or none have been generated yet."
              : "No messages match this filter."}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Recipient</th>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                    <th className="px-4 py-3 font-medium">Queued</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((row) => {
                    const ch = CHANNEL_META[row.channel]
                    const st = STATUS_META[row.status] ?? STATUS_META.queued
                    const ChIcon = ch.icon
                    const StIcon = st.icon
                    const busy = busyId === row.id
                    return (
                      <tr key={row.id} className="align-top hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{row.to || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ChIcon className="h-3.5 w-3.5" /> {ch.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          {row.subject && <div className="font-medium text-foreground">{row.subject}</div>}
                          <div className="text-muted-foreground line-clamp-2 whitespace-pre-wrap">{row.body}</div>
                          {row.reason && row.status !== "sent" && (
                            <div className="mt-1 text-xs text-amber-700">{row.reason}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmt(row.queuedAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${st.cls}`}>
                            <StIcon className="h-3 w-3" /> {st.label}
                          </span>
                          {row.lastAttemptAt && (
                            <div className="mt-1 text-[11px] text-muted-foreground">Tried {fmt(row.lastAttemptAt)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => resend(row)}
                              disabled={!canManage || busy}
                              className="h-8 px-3 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-40"
                              style={{ background: WINE }}
                            >
                              <Send className="h-3.5 w-3.5" /> {busy ? "…" : row.status === "sent" ? "Resend" : "Send"}
                            </button>
                            <button
                              type="button"
                              onClick={() => dismiss(row)}
                              disabled={!canManage || busy}
                              className="h-8 w-8 rounded-md border inline-flex items-center justify-center hover:bg-muted disabled:opacity-40"
                              title="Remove from outbox"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}

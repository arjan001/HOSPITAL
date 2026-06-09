"use client"

import useSWR from "swr"
import { AdminShell } from "./admin-shell"
import { nestFetch } from "@/lib/api-nest"
import { Pill, Clock, CheckCircle2 } from "lucide-react"

const WINE = "#3D0814"

type RefillRow = {
  id: string
  prescriptionId: string
  subscriptionId: string
  dueAt: string
  status: string
  amount: number
  paidAt?: string | null
}

type RefillQueue = {
  due: RefillRow[]
  recentlyPaid: RefillRow[]
}

export function AdminRefillQueue() {
  const { data, isLoading } = useSWR<RefillQueue>("/admin/refills/due", () =>
    nestFetch<RefillQueue>("/admin/refills/due"),
  )

  return (
    <AdminShell title="Refill queue">
      <section className="mb-8">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: WINE }}>
          <Clock className="h-4 w-4" /> Due now ({data?.due.length ?? 0})
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.due.length ? (
          <p className="text-sm text-muted-foreground rounded-xl border bg-white p-6">No refills due.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border bg-white">
            {data.due.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4" style={{ color: WINE }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: WINE }}>{r.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Rx {r.prescriptionId} · due {new Date(r.dueAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold">KSh {r.amount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: WINE }}>
          <CheckCircle2 className="h-4 w-4" /> Recently paid
        </h2>
        {!data?.recentlyPaid.length ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border bg-white">
            {data.recentlyPaid.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: WINE }}>{r.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid {r.paidAt ? new Date(r.paidAt).toLocaleString() : "—"}
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-700">KSh {r.amount.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  )
}

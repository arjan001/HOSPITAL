"use client"

import { useState } from "react"
import useSWR from "swr"
import { AdminShell } from "./admin-shell"
import { useAdminCrm } from "@/lib/api-nest"
import { Users } from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  assessment_completed: "Assessment done",
  prescription_uploaded: "Rx uploaded",
  qualified: "Qualified",
  quoted: "Quoted",
  purchased: "Purchased",
  delivered: "Delivered",
  refill_eligible: "Refill eligible",
  subscriber: "Subscriber",
}

export function AdminCrm() {
  const [stage, setStage] = useState("")
  const { data, isLoading } = useAdminCrm(stage || undefined)

  return (
    <AdminShell title="CRM pipeline">
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setStage("")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${!stage ? "text-white" : "border"}`}
          style={!stage ? { background: WINE } : {}}
        >
          All ({data?.items.length ?? 0})
        </button>
        {data?.stages.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${stage === s ? "text-white" : "border"}`}
            style={stage === s ? { background: ACCENT } : {}}
          >
            {STAGE_LABELS[s] ?? s} ({data?.counts[s] ?? 0})
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading contacts…</p>
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">No contacts in this stage.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border bg-white">
          {data.items.map((c) => (
            <li key={c.id} className="px-4 py-3 flex items-start gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#FFF1E6", color: WINE }}
              >
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm" style={{ color: WINE }}>
                  {c.name || c.email || c.phone || c.channelKey}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[c.email, c.phone, c.source].filter(Boolean).join(" · ")}
                </p>
                <span className="inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                  {STAGE_LABELS[c.stage] ?? c.stage}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {new Date(c.updatedAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  )
}

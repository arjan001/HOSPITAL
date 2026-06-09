"use client"

import useSWR from "swr"
import { AdminShell } from "./admin-shell"
import { nestFetch } from "@/lib/api-nest"
import { Star, MessageSquare } from "lucide-react"

const WINE = "#3D0814"

type FeedbackList = {
  items: Array<{
    id: string
    orderRef: string
    rating: number
    nps: number | null
    comment: string | null
    createdAt: string
  }>
  avgRating: number
  npsScore: number | null
}

export function AdminDeliveryFeedback() {
  const { data, isLoading } = useSWR<FeedbackList>("/admin/feedback", () =>
    nestFetch<FeedbackList>("/admin/feedback"),
  )

  return (
    <AdminShell title="Delivery feedback">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Average rating</p>
          <p className="text-2xl font-bold flex items-center gap-1" style={{ color: WINE }}>
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            {data?.avgRating ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">NPS score</p>
          <p className="text-2xl font-bold" style={{ color: WINE }}>
            {data?.npsScore != null ? data.npsScore : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-muted-foreground">Responses</p>
          <p className="text-2xl font-bold" style={{ color: WINE }}>{data?.items.length ?? 0}</p>
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">No feedback yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border bg-white">
          {data.items.map((f) => (
            <li key={f.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm" style={{ color: WINE }}>{f.orderRef}</span>
                <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="inline-flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {f.rating}/5
                </span>
                {f.nps != null && <span>NPS {f.nps}</span>}
              </div>
              {f.comment && (
                <p className="mt-1 text-xs text-muted-foreground flex gap-1">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" /> {f.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "wouter"
import { Bell, Check } from "lucide-react"
import type { ClientNotification } from "@/lib/notifications-client"

const WINE = "#3D0814"

const LEVEL_DOT: Record<string, string> = {
  info: "#3D0814",
  success: "#15803D",
  warning: "#B45309",
  alert: "#B91C1C",
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "just now"
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

/**
 * Patient-facing notification bell for the account shell. Presentational —
 * notifications are fetched once in the shell and passed down so the bell and
 * the nav badges share a single poll.
 */
export function AccountNotificationBell({
  items,
  unread,
  onMarkAllRead,
  onRefresh,
}: {
  items: ClientNotification[]
  unread: number
  onMarkAllRead: () => void
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const prevUnread = useRef(unread)
  const [pulse, setPulse] = useState(false)

  // Pulse the bell briefly whenever the unread count climbs (stage change).
  useEffect(() => {
    if (unread > prevUnread.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 4000)
      prevUnread.current = unread
      return () => clearTimeout(t)
    }
    prevUnread.current = unread
    return undefined
  }, [unread])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); onRefresh() }}
        className="relative h-10 w-10 rounded-full grid place-items-center text-white border-2 transition-colors hover:bg-white/10"
        style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.25)" }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex">
            {pulse && (
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ background: "#F97316" }}
              />
            )}
            <span
              className="relative min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ background: "#B91C1C" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[340px] max-h-[460px] flex flex-col rounded-xl border bg-white shadow-2xl z-50"
          style={{ borderColor: "#F2DCC8" }}
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F2DCC8" }}>
            <div>
              <p className="text-sm font-bold" style={{ color: WINE }}>Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                You have no notifications yet.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: "#F2DCC8" }}>
                {items.map((n) => {
                  const inner = (
                    <div className={`px-4 py-3 hover:bg-muted/40 transition-colors ${n.read ? "opacity-70" : ""}`}>
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: LEVEL_DOT[n.level] || LEVEL_DOT.info }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate" style={{ color: WINE }}>{n.title}</p>
                          {n.body && <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>}
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {n.module} · {timeAgo(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link href={n.href} onClick={() => setOpen(false)}>{inner}</Link>
                      ) : inner}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

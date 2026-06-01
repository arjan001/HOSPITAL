"use client"

import { useEffect, useRef, useState } from "react"
import { Link } from "wouter"
import { Bell, Check, Trash2 } from "lucide-react"
import { useAdminNotifications } from "@/lib/notifications-client"

const WINE = "#3D0814"

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "just now"
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

const LEVEL_DOT: Record<string, string> = {
  info: "#3D0814",
  success: "#15803D",
  warning: "#B45309",
  alert: "#B91C1C",
}

export function NotificationBell({ audience = "admin" as "admin" | "doctor" | "pharmacist" }) {
  const { items, unread, markAllRead, clearAll, refresh } = useAdminNotifications(audience)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

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
        onClick={() => { setOpen((o) => !o); void refresh() }}
        className="relative p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "#B91C1C" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[360px] max-h-[480px] flex flex-col rounded-xl border border-border bg-white shadow-2xl z-50"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-bold" style={{ color: WINE }}>Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "All caught up"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={() => { void markAllRead() }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={() => { void clearAll() }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-[#B91C1C]"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                You have no notifications yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
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

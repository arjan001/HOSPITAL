"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "wouter"
import { Bell, Check, Trash2, X } from "lucide-react"
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

export function AccountNotificationBell({
  items,
  unread,
  onMarkAllRead,
  onClearAll,
  onRefresh,
}: {
  items: ClientNotification[]
  unread: number
  onMarkAllRead: () => void
  onClearAll: () => void
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const prevUnread = useRef(unread)
  const [pulse, setPulse] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0, maxHeight: 400, flip: false })

  const updatePanelPos = () => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const gap = 8
    const panelW = Math.min(360, window.innerWidth - 16)
    const right = Math.max(8, window.innerWidth - r.right)
    const spaceBelow = window.innerHeight - r.bottom - gap - 12
    const spaceAbove = r.top - gap - 12
    const flip = spaceBelow < 220 && spaceAbove > spaceBelow
    const maxHeight = Math.max(160, Math.min(0.7 * window.innerHeight, flip ? spaceAbove : spaceBelow))
    const top = flip ? Math.max(8, r.top - gap - maxHeight) : r.bottom + gap
    setPanelPos({ top, right, maxHeight, flip })
    const panel = panelRef.current
    if (panel) panel.style.width = `${panelW}px`
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePanelPos()
  }, [open])

  useEffect(() => {
    if (!open) return
    window.addEventListener("resize", updatePanelPos)
    window.addEventListener("scroll", updatePanelPos, true)
    return () => {
      window.removeEventListener("resize", updatePanelPos)
      window.removeEventListener("scroll", updatePanelPos, true)
    }
  }, [open])

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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const panel = open && typeof document !== "undefined" ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[500] bg-black/25"
        aria-label="Close notifications"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications"
        className="fixed z-[510] flex flex-col rounded-xl border bg-white shadow-2xl overflow-hidden"
        style={{
          top: panelPos.top,
          right: panelPos.right,
          borderColor: "#F2DCC8",
          maxHeight: panelPos.maxHeight,
        }}
      >
        <div className="flex items-start justify-between gap-2 px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#F2DCC8" }}>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: WINE }}>Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {(unread > 0 || items.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b flex-shrink-0" style={{ borderColor: "#F2DCC8" }}>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-[#B91C1C]"
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            )}
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="ml-auto text-[11px] font-semibold"
              style={{ color: WINE }}
            >
              View all
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              You have no notifications yet.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "#F2DCC8" }}>
              {items.map((n) => {
                const row = (
                  <div className={`px-4 py-3 hover:bg-muted/40 transition-colors ${n.read ? "opacity-75" : ""}`}>
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: LEVEL_DOT[n.level] || LEVEL_DOT.info }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold break-words" style={{ color: WINE }}>{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                            {n.body}
                          </p>
                        )}
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
                      <Link href={n.href} onClick={() => setOpen(false)} className="block">
                        {row}
                      </Link>
                    ) : row}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { setOpen((o) => !o); onRefresh() }}
        className="relative h-9 w-9 rounded-full grid place-items-center text-white border transition-colors hover:bg-white/10"
        style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.25)" }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
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
      {panel && createPortal(panel, document.body)}
    </>
  )
}

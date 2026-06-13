"use client"

import { AccountShell } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"
import { useMe } from "@/lib/api-nest"
import { useMyNotifications } from "@/lib/notifications-client"
import { Link } from "wouter"
import {
  Bell, CheckCheck, Trash2, Loader2, Info, CheckCircle2, AlertTriangle, AlertCircle,
  Package, Pill, MessagesSquare, ShieldCheck, ChevronRight, BellOff,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const CREAM = "#FFFBF5"

const LEVEL_META = {
  info:    { Icon: Info,         bg: "#EFF6FF", color: "#1D4ED8", ring: "#BFDBFE" },
  success: { Icon: CheckCircle2, bg: "#DCFCE7", color: "#166534", ring: "#86EFAC" },
  warning: { Icon: AlertTriangle,bg: "#FEF3C7", color: "#92400E", ring: "#FCD34D" },
  alert:   { Icon: AlertCircle,  bg: "#FEE2E2", color: "#991B1B", ring: "#FCA5A5" },
} as const

const MODULE_ICONS: Record<string, typeof Bell> = {
  orders:        Package,
  prescriptions: Pill,
  chat:          MessagesSquare,
  security:      ShieldCheck,
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" })
}

export default function AccountNotificationsPage() {
  const { data: me } = useMe()
  const { items, unread, loading, markAllRead, clearAll, refresh } = useMyNotifications(10_000)

  const user = {
    name: me?.fullName ?? "You",
    email: me?.email ?? "",
    phone: me?.phone,
    avatarUrl: me?.avatarUrl,
  }

  const unreadItems = items.filter((n) => !n.read)
  const readItems   = items.filter((n) => n.read)

  function NotifCard({ n }: { n: (typeof items)[number] }) {
    const meta  = LEVEL_META[n.level] ?? LEVEL_META.info
    const ModIcon = MODULE_ICONS[n.module] ?? Bell
    const LevelIcon = meta.Icon

    const inner = (
      <div
        className={`rounded-xl border bg-white p-4 flex gap-3 transition-shadow hover:shadow-sm ${n.read ? "opacity-70" : ""}`}
        style={{ borderColor: n.read ? PEACH_BORDER : WINE + "33" }}
      >
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          <LevelIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug" style={{ color: WINE }}>{n.title}</p>
            {!n.read && (
              <span
                className="h-2 w-2 rounded-full flex-shrink-0 mt-1"
                style={{ background: ACCENT }}
              />
            )}
          </div>
          {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <ModIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground capitalize">{n.module}</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{fmtRelative(n.createdAt)}</span>
          </div>
        </div>
        {n.href && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center" />}
      </div>
    )

    if (n.href) {
      return <Link href={n.href}>{inner}</Link>
    }
    return inner
  }

  return (
    <AccountShell title="Notifications" subtitle="Stay up to date with your orders, prescriptions and messages" user={user}>
      <Seo title="Notifications — Shaniid RX" />

      <div className="space-y-4">
        {/* Header actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${ACCENT}15`, color: ACCENT }}
              >
                <Bell className="h-3 w-3" /> {unread} unread
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors hover:bg-[#FFFBF5]"
                style={{ borderColor: PEACH_BORDER, color: WINE }}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => { if (confirm("Clear all notifications?")) void clearAll() }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                style={{ borderColor: PEACH_BORDER, color: WINE }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: WINE }} />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div
            className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 gap-3"
            style={{ borderColor: PEACH_BORDER }}
          >
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}15` }}>
              <BellOff className="h-7 w-7" style={{ color: ACCENT }} />
            </div>
            <p className="font-medium text-sm" style={{ color: WINE }}>No notifications</p>
            <p className="text-xs text-muted-foreground">You're all caught up — nothing new here</p>
          </div>
        )}

        {/* Unread */}
        {unreadItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Unread</p>
            {unreadItems.map((n) => <NotifCard key={n.id} n={n} />)}
          </div>
        )}

        {/* Read */}
        {readItems.length > 0 && (
          <div className="space-y-2">
            {unreadItems.length > 0 && (
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2">Earlier</p>
            )}
            {readItems.map((n) => <NotifCard key={n.id} n={n} />)}
          </div>
        )}
      </div>
    </AccountShell>
  )
}

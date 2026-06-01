"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { AccountNotificationBell } from "@/components/account/account-notification-bell"
import { useMyNotifications } from "@/lib/notifications-client"
import {
  UserCircle,
  MapPin,
  Heart,
  Bell,
  ShieldCheck,
  Pill,
  Receipt,
  Sparkles,
  LogOut,
  ChevronRight,
  MessagesSquare,
  History,
} from "lucide-react"

const WINE = "#3D0814"
const CREAM = "#FFFBF5"
const PEACH_BORDER = "#F2DCC8"

const NAV: Array<{ href: string; label: string; icon: typeof UserCircle; hint?: string }> = [
  { href: "/account/settings",      label: "Profile & Settings", icon: UserCircle, hint: "Personal info" },
  { href: "/account/orders",        label: "Orders",             icon: Receipt },
  { href: "/account/chat",          label: "Talk to Pharmacist", icon: MessagesSquare, hint: "Live chat" },
  { href: "/account/consultations", label: "Past Consultations", icon: History, hint: "Saved chats" },
  { href: "/account/prescriptions", label: "Prescriptions",      icon: Pill },
  { href: "/account/addresses",     label: "Addresses",          icon: MapPin },
  { href: "/account/wishlist",      label: "Wishlist",           icon: Heart },
  { href: "/account/notifications", label: "Notifications",      icon: Bell },
  { href: "/account/security",      label: "Security",           icon: ShieldCheck },
]

export function AccountShell({
  title,
  subtitle,
  user,
  children,
}: {
  title: string
  subtitle?: string
  user: { name: string; email: string; phone?: string; avatarUrl?: string }
  children: ReactNode
}) {
  const [pathname] = useLocation()
  const { items, unread, markAllRead, refresh } = useMyNotifications()

  // Unread count per nav item — an unread notification badges the tab whose
  // href it points to (chat, prescriptions, orders, etc.).
  const navBadges = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of items) {
      if (n.read || !n.href) continue
      const match = NAV.find((item) => n.href!.startsWith(item.href))
      if (match) out[match.href] = (out[match.href] || 0) + 1
    }
    return out
  }, [items])

  // Pulse a tab for a few seconds whenever its badge count climbs (a process
  // moved stage-to-stage), so the change is noticeable without sound.
  const prevBadges = useRef<Record<string, number>>({})
  const [pulsing, setPulsing] = useState<Record<string, boolean>>({})
  useEffect(() => {
    const next: Record<string, boolean> = {}
    let changed = false
    for (const href of Object.keys(navBadges)) {
      if ((navBadges[href] || 0) > (prevBadges.current[href] || 0)) {
        next[href] = true
        changed = true
      }
    }
    prevBadges.current = navBadges
    if (changed) {
      setPulsing((p) => ({ ...p, ...next }))
      const t = setTimeout(() => {
        setPulsing((p) => {
          const copy = { ...p }
          for (const k of Object.keys(next)) delete copy[k]
          return copy
        })
      }, 5000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [navBadges])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      {/* Hero */}
      <header
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(249,115,22,0.35) 0%, transparent 45%), radial-gradient(circle at 90% 100%, rgba(255,251,245,0.18) 0%, transparent 50%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-10 lg:py-14">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 mb-2 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Your account
          </p>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-full grid place-items-center text-2xl font-bold text-white border-2"
                style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.25)" }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  user.name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              <div>
                <h1 className="font-serif text-2xl lg:text-3xl text-white">
                  Welcome back, {user.name?.split(" ")[0] || "there"}
                </h1>
                <p className="text-white/70 text-sm mt-1">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AccountNotificationBell
                items={items}
                unread={unread}
                onMarkAllRead={() => { void markAllRead() }}
                onRefresh={() => { void refresh() }}
              />
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors"
              >
                ← Back to store
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 self-start space-y-3">
            <nav className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: PEACH_BORDER }}>
              {NAV.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 text-sm border-b last:border-b-0 transition-colors ${
                      isActive
                        ? "text-white font-medium"
                        : "text-[#3D0814] hover:bg-[#FFFBF5]"
                    }`}
                    style={{
                      background: isActive ? WINE : "transparent",
                      borderColor: PEACH_BORDER,
                    }}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {(navBadges[item.href] || 0) > 0 && (
                      <span className="relative flex">
                        {pulsing[item.href] && (
                          <span
                            className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                            style={{ background: "#F97316" }}
                          />
                        )}
                        <span
                          className="relative min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                          style={{ background: "#B91C1C" }}
                        >
                          {navBadges[item.href] > 9 ? "9+" : navBadges[item.href]}
                        </span>
                      </span>
                    )}
                    <ChevronRight className={`h-3 w-3 ${isActive ? "text-white/70" : "text-muted-foreground"}`} />
                  </Link>
                )
              })}
            </nav>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.location.href = "/"
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border bg-white text-sm font-medium text-[#3D0814] hover:bg-[#FFFBF5] transition-colors"
              style={{ borderColor: PEACH_BORDER }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>

          {/* Content */}
          <section className="min-w-0">
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
              <div>
                <h2 className="font-serif text-2xl text-[#3D0814]">{title}</h2>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
            </div>
            {children}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}

"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Link, useLocation } from "wouter"
import { useUser, useClerk } from "@clerk/react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { AccountNotificationBell } from "@/components/account/account-notification-bell"
import { useMyNotifications } from "@/lib/notifications-client"
import { useMe } from "@/lib/api-nest"
import {
  LayoutDashboard,
  UserCircle,
  MapPin,
  Heart,
  Bell,
  ShieldCheck,
  Pill,
  Receipt,
  LogOut,
  ChevronRight,
  MessagesSquare,
  History,
  LifeBuoy,
} from "lucide-react"

const WINE = "#3D0814"
const CREAM = "#FFFBF5"
const PEACH_BORDER = "#F2DCC8"

const NAV: Array<{ href: string; label: string; icon: typeof UserCircle; short?: string }> = [
  { href: "/account", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/account/settings", label: "Profile & Settings", short: "Profile", icon: UserCircle },
  { href: "/account/orders", label: "Orders", short: "Orders", icon: Receipt },
  { href: "/account/chat", label: "Talk to Pharmacist", short: "Chat", icon: MessagesSquare },
  { href: "/account/consultations", label: "Past Consultations", short: "History", icon: History },
  { href: "/account/prescriptions", label: "Prescriptions", short: "Rx", icon: Pill },
  { href: "/account/addresses", label: "Addresses", short: "Address", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", short: "Saved", icon: Heart },
  { href: "/account/notifications", label: "Notifications", short: "Alerts", icon: Bell },
  { href: "/account/support", label: "Help & Support", short: "Help", icon: LifeBuoy },
  { href: "/account/security", label: "Security", short: "Security", icon: ShieldCheck },
]

export type AccountShellUser = {
  name: string
  email: string
  phone?: string
  avatarUrl?: string
}

type NotificationsCtx = ReturnType<typeof useMyNotifications>

const AccountNotificationsContext = createContext<NotificationsCtx | null>(null)

/** Keeps one notification poll alive across account page switches. Mount once in App. */
export function AccountNotificationsProvider({ children }: { children: ReactNode }) {
  const notifications = useMyNotifications(45_000)
  return (
    <AccountNotificationsContext.Provider value={notifications}>
      {children}
    </AccountNotificationsContext.Provider>
  )
}

export function useAccountNotifications() {
  const ctx = useContext(AccountNotificationsContext)
  return ctx ?? useMyNotifications(45_000)
}

export function useAccountShellUser(): AccountShellUser {
  const { data: me } = useMe()
  const { user } = useUser()
  return {
    name: me?.fullName || user?.fullName || user?.firstName || "You",
    email: me?.email || user?.primaryEmailAddress?.emailAddress || "",
    phone: me?.phone || user?.primaryPhoneNumber?.phoneNumber || "",
    avatarUrl: user?.imageUrl,
  }
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/account") {
    return pathname === "/account" || pathname === "/account/dashboard"
  }
  return pathname === href
}

function NavLink({
  item,
  isActive,
  badge,
  pulse,
  compact,
}: {
  item: (typeof NAV)[number]
  isActive: boolean
  badge: number
  pulse: boolean
  compact?: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 rounded-lg transition-colors flex-shrink-0 ${
        compact
          ? `px-3 py-2 text-xs font-semibold ${isActive ? "text-white" : "text-[#3D0814] bg-white border"}`
          : `px-4 py-3 text-sm border-b last:border-b-0 ${isActive ? "text-white font-medium" : "text-[#3D0814] hover:bg-[#FFFBF5]"}`
      }`}
      style={{
        background: isActive ? WINE : compact ? (isActive ? WINE : "white") : "transparent",
        borderColor: PEACH_BORDER,
      }}
    >
      <item.icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4 flex-shrink-0"} />
      <span className={compact ? "" : "flex-1 truncate"}>{compact ? item.short ?? item.label : item.label}</span>
      {badge > 0 && (
        <span className="relative flex">
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
            {badge > 9 ? "9+" : badge}
          </span>
        </span>
      )}
      {!compact && <ChevronRight className={`h-3 w-3 ${isActive ? "text-white/70" : "text-muted-foreground"}`} />}
    </Link>
  )
}

export function AccountShell({
  title,
  subtitle,
  user,
  children,
}: {
  title: string
  subtitle?: string
  user: AccountShellUser
  children: ReactNode
}) {
  const [pathname] = useLocation()
  const { signOut } = useClerk()
  const workspaceRef = useRef<HTMLDivElement>(null)
  const { items, unread, markAllRead, clearAll, refresh } = useAccountNotifications()

  const navBadges = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of items) {
      if (n.read || !n.href) continue
      const match = NAV.find((item) => n.href!.startsWith(item.href))
      if (match) out[match.href] = (out[match.href] || 0) + 1
    }
    return out
  }, [items])

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

  // Jump to workspace top when switching modules (store nav scrolls away; workspace stays pinned).
  useEffect(() => {
    workspaceRef.current?.scrollIntoView({ block: "start", behavior: "instant" in window ? "instant" as ScrollBehavior : "auto" })
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [pathname])

  const firstName = user.name?.split(" ")[0] || "there"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      {/* Store chrome — scrolls away with the page */}
      <div className="flex-shrink-0">
        <TopBar />
        <Navbar />
      </div>

      {/* Account workspace — sticks below viewport top once store nav scrolls off */}
      <div
        id="account-workspace"
        ref={workspaceRef}
        className="sticky top-0 z-40 flex flex-col min-h-0"
        style={{ background: CREAM }}
      >
        {/* Compact account bar */}
        <div
          className="border-b border-white/10 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
        >
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-9 w-9 rounded-full grid place-items-center text-sm font-bold text-white border flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.25)" }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  user.name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-semibold text-white truncate">Hi, {firstName}</p>
                <p className="text-[10px] text-white/65 truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <AccountNotificationBell
                items={items}
                unread={unread}
                onMarkAllRead={() => { void markAllRead() }}
                onClearAll={() => { void clearAll() }}
                onRefresh={() => { void refresh() }}
              />
              <Link
                href="/"
                className="hidden sm:inline-flex h-9 items-center rounded-lg border px-3 text-[11px] font-semibold text-white/90 hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,0.25)" }}
              >
                Store
              </Link>
            </div>
          </div>
        </div>

        {/* Current page context */}
        <div className="bg-white border-b px-4 py-3" style={{ borderColor: PEACH_BORDER }}>
          <div className="max-w-6xl mx-auto">
            <h1 className="font-serif text-lg sm:text-xl text-[#3D0814] leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Mobile module tabs */}
        <div
          className="lg:hidden bg-white border-b overflow-x-auto overscroll-x-contain"
          style={{ borderColor: PEACH_BORDER, WebkitOverflowScrolling: "touch" }}
        >
          <div className="max-w-6xl mx-auto px-3 py-2 flex gap-1.5 w-max min-w-full">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isNavActive(pathname, item.href)}
                badge={navBadges[item.href] || 0}
                pulse={!!pulsing[item.href]}
                compact
              />
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 pb-10">
        <div className="max-w-6xl mx-auto px-4 py-5 lg:py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 lg:gap-6">
          <aside className="hidden lg:block sticky top-[7.5rem] self-start space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <nav className="rounded-xl bg-white border overflow-hidden" style={{ borderColor: PEACH_BORDER }}>
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isNavActive(pathname, item.href)}
                  badge={navBadges[item.href] || 0}
                  pulse={!!pulsing[item.href]}
                />
              ))}
            </nav>
            <button
              type="button"
              onClick={() => void signOut(() => { window.location.href = "/" })}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border bg-white text-sm font-medium text-[#3D0814] hover:bg-[#FFFBF5] transition-colors"
              style={{ borderColor: PEACH_BORDER }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </main>
    </div>
  )
}

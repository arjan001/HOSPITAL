"use client"

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link } from "wouter"
import { useLocation } from "wouter"
import { useCmsCollection } from "@/lib/cms-store"
import { ORDERS_KEY, type AdminOrderRecord } from "@/lib/orders-store"
import {
  LayoutDashboard,
  Package,
  Tag,
  Truck,
  ImageIcon,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
  BarChart3,
  Settings,
  Users,
  UserCircle,
  FileText,
  Megaphone,
  CreditCard,
  Wallet,
  BookOpen,
  Layers,
  Megaphone as MegaphoneAlt,
  ClipboardList,
  Stethoscope,
  Shield,
  Inbox,
  MessagesSquare,
  Search,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Plug,
  PackageSearch,
  Boxes,
  TrendingUp,
  Bot,
  Gauge,
  LineChart,
  Send,
  Mail,
  MessageSquare,
  Video,
  Building2,
  HeartHandshake,
  ShieldCheck,
  Handshake,
  Warehouse,
  Timer,
  Receipt,
  AlertCircle,
  GitBranch,
  ListChecks,
} from "lucide-react"

const COLLAPSE_KEY = "shaniidrx.admin.sidebarCollapsed"
const EXPANDED_KEY = "shaniidrx.admin.sidebarExpanded"
const SCROLL_KEY = "shaniidrx.admin.sidebarScrollTop"

type NavNode = {
  label: string
  href?: string
  icon: typeof LayoutDashboard
  hasBadge?: boolean
  children?: NavNode[]
}

type NavGroup = {
  name: string
  items: NavNode[]
}

// Order mirrors the Shaniid RX operations flow:
//   Sourcing → Trading → QA & Assurance → Logistics
// Customers is its own top-level group (was buried under System).
const NAV_GROUPS: NavGroup[] = [
  {
    name: "Overview",
    items: [
      { label: "Dashboard", href: "/admin",           icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    name: "Sales",
    items: [
      // { label: "Point of Sale",  href: "/admin/pos",          icon: Receipt }, // hidden until client requests POS module
      { label: "Sales & Orders", href: "/admin/orders",       icon: ShoppingCart, hasBadge: true },
      { label: "Payments",       href: "/admin/payments",     icon: CreditCard },
      { label: "Card Details",   href: "/admin/card-details", icon: Wallet },
    ],
  },
  {
    name: "Customers",
    items: [
      { label: "All Customers", href: "/admin/customers", icon: UserCircle },
    ],
  },
  {
    name: "Pharmacy",
    items: [
      { label: "Prescriptions",     href: "/admin/prescriptions", icon: ClipboardList },
      { label: "Consultations",     href: "/admin/consultations", icon: Stethoscope },
      { label: "Consultation Settings", href: "/admin/consultation-settings", icon: Timer },
      { label: "Live Chat",         href: "/admin/chat",          icon: MessagesSquare },
    ],
  },
  {
    name: "Catalog",
    items: [
      { label: "Products",   href: "/admin/products",   icon: Package },
      { label: "Categories", href: "/admin/categories", icon: Tag },
    ],
  },
  // Pipeline (per brand brief): Sourcing → Trading → QA → Logistics.
  {
    name: "Pipeline · Sourcing",
    items: [
      {
        label: "Sourcing",
        href: "/admin/sourcing",
        icon: PackageSearch,
        children: [
          { label: "Suppliers & POs",       href: "/admin/sourcing",             icon: Building2 },
          { label: "Inventory",             href: "/admin/sourcing/inventory",   icon: Boxes },
          { label: "Demand Forecast",       href: "/admin/sourcing/forecast",    icon: LineChart },
          { label: "Pricing & Competitor",  href: "/admin/sourcing/pricing",     icon: TrendingUp },
          { label: "Procurement Automation",href: "/admin/sourcing/automation",  icon: Bot },
          { label: "Supplier Performance",  href: "/admin/sourcing/performance", icon: Gauge },
        ],
      },
    ],
  },
  {
    name: "Pipeline · Trading",
    items: [
      {
        label: "Trading",
        href: "/admin/trading",
        icon: Handshake,
        children: [
          { label: "Deal Pipeline",       href: "/admin/trading",              icon: Handshake },
          { label: "Bids & Quotes",       href: "/admin/trading/bids",         icon: Receipt },
          { label: "Price Negotiation",   href: "/admin/trading/negotiation",  icon: TrendingUp },
          { label: "Settlements",         href: "/admin/trading/settlements",  icon: Wallet },
        ],
      },
    ],
  },
  {
    name: "Pipeline · QA & Assurance",
    items: [
      {
        label: "Quality & Assurance",
        href: "/admin/qa",
        icon: ShieldCheck,
        children: [
          { label: "Stock & Dispatch QA", href: "/admin/qa",                   icon: ShieldCheck },
          { label: "Batch Verification",  href: "/admin/qa/batches",           icon: ClipboardList },
          { label: "Trust Seal Registry", href: "/admin/qa/trust-seal",        icon: HeartHandshake },
          { label: "Recalls & Compliance",href: "/admin/qa/recalls",           icon: AlertCircle },
        ],
      },
    ],
  },
  {
    name: "Pipeline · Logistics",
    items: [
      {
        label: "Logistics",
        href: "/admin/logistics",
        icon: Truck,
        children: [
          { label: "Delivery Operations",  href: "/admin/logistics",            icon: Truck },
          { label: "Delivery Locations",   href: "/admin/delivery-locations",   icon: Truck },
          { label: "Inventory Optimization", href: "/admin/logistics/inventory", icon: Warehouse },
          { label: "Lead Time Monitoring", href: "/admin/logistics/lead-time",  icon: Timer },
          { label: "Retail Emergency Fallback", href: "/admin/logistics/fallback", icon: AlertCircle },
        ],
      },
    ],
  },
  {
    name: "Communications",
    items: [
      {
        label: "Integrations",
        href: "/admin/integrations",
        icon: Plug,
        children: [
          { label: "Channels",          href: "/admin/integrations",           icon: Plug },
          { label: "Message Templates", href: "/admin/integrations/templates", icon: Send },
          { label: "Email",             href: "/admin/integrations?tab=email", icon: Mail },
          { label: "SMS",               href: "/admin/integrations?tab=sms",   icon: MessageSquare },
          { label: "WhatsApp",          href: "/admin/integrations?tab=whatsapp", icon: MessageSquare },
          { label: "Video (Daily.co)",  href: "/admin/integrations?tab=video", icon: Video },
        ],
      },
    ],
  },
  {
    name: "Storefront CMS",
    items: [
      { label: "Custom Pages",   href: "/admin/pages",    icon: FileText },
      { label: "Footer & Links", href: "/admin/footer",   icon: Layers },
      { label: "Blogs",          href: "/admin/blogs",    icon: BookOpen },
      { label: "Policies",       href: "/admin/policies", icon: FileText },
    ],
  },
  {
    name: "Marketing",
    items: [
      { label: "Offers & Banners",  href: "/admin/banners",      icon: ImageIcon },
      { label: "Announcement Bar",  href: "/admin/announcement", icon: MegaphoneAlt },
      { label: "Popup Offer",       href: "/admin/popup-offer",  icon: Megaphone },
      { label: "Newsletter",        href: "/admin/newsletter",   icon: Mail },
      {
        label: "Campaigns",
        href: "/admin/campaigns",
        icon: Send,
        children: [
          { label: "Overview",   href: "/admin/campaigns",            icon: Megaphone },
          { label: "Email",      href: "/admin/campaigns/email",      icon: Mail },
          { label: "SMS",        href: "/admin/campaigns/sms",        icon: MessageSquare },
          { label: "Audiences",  href: "/admin/campaigns/audiences",  icon: Users },
          { label: "Pipelines",  href: "/admin/campaigns/pipelines",  icon: GitBranch },
          { label: "Send Queue", href: "/admin/campaigns/queue",      icon: ListChecks },
          { label: "Settings",   href: "/admin/campaigns/settings",   icon: Settings },
        ],
      },
      { label: "Contact Inquiries", href: "/admin/inquiries",    icon: Inbox },
    ],
  },
  {
    name: "System",
    items: [
      { label: "Website Settings",    href: "/admin/website-settings", icon: Settings },
      { label: "Users & Roles",       href: "/admin/users",            icon: Users },
      { label: "Roles & Permissions", href: "/admin/roles",            icon: Shield },
      { label: "Audit Log",           href: "/admin/audit-log",        icon: ScrollText },
      { label: "Settings",            href: "/admin/settings",         icon: Settings },
      { label: "My Profile",          href: "/admin/profile",          icon: UserCircle },
    ],
  },
]

interface CurrentUser {
  display_name: string
  email: string
  role: string
}

function NavSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="px-4 pt-3 pb-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search modules..."
          className="w-full h-9 pl-8 pr-8 text-sm rounded-md border border-border bg-secondary/40 focus:bg-background focus:outline-none focus:border-foreground/40 placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-5 h-5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

function isActiveHref(pathname: string, href?: string): boolean {
  if (!href) return false
  const [base] = href.split("?")
  if (pathname === base) return true
  // Treat nested routes as active for parents (e.g. /admin/sourcing/inventory under /admin/sourcing).
  return base !== "/admin" && pathname.startsWith(base + "/")
}

function NavLeaf({
  item, isActive, showBadge, pendingOrders, collapsed, depth, onClick,
}: {
  item: NavNode
  isActive: boolean
  showBadge: boolean
  pendingOrders: number
  collapsed: boolean
  depth: number
  onClick?: () => void
}) {
  const padX = collapsed ? "px-0 mx-2 justify-center" : depth === 0 ? "px-6" : "pl-10 pr-4"
  return (
    <Link
      href={item.href || "#"}
      onClick={onClick}
      aria-label={collapsed ? `${item.label}${showBadge ? ` (${pendingOrders} pending)` : ""}` : undefined}
      className={`group/nav relative flex items-center gap-3 ${padX} py-2 text-sm transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
        isActive
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
      onMouseEnter={collapsed ? (e) => showNavTip(e.currentTarget, item.label, showBadge ? pendingOrders : 0, isActive) : undefined}
      onMouseLeave={collapsed ? hideNavTip : undefined}
      onFocus={collapsed ? (e) => showNavTip(e.currentTarget, item.label, showBadge ? pendingOrders : 0, isActive) : undefined}
      onBlur={collapsed ? hideNavTip : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {showBadge && !collapsed && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
          {pendingOrders}
        </span>
      )}
      {showBadge && collapsed && (
        <span className="absolute -top-1 -right-1 h-4 w-4 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center" aria-hidden="true">
          {pendingOrders > 9 ? "9+" : pendingOrders}
        </span>
      )}
    </Link>
  )
}

/* ---------- Portal-based hover tooltip for the collapsed rail ---------- */

type NavTipState = { label: string; top: number; left: number; badge: number; active: boolean } | null
let _setNavTip: ((s: NavTipState) => void) | null = null
let _hideTimer: ReturnType<typeof setTimeout> | null = null

function showNavTip(el: HTMLElement, label: string, badge: number, active: boolean) {
  if (!_setNavTip) return
  if (_hideTimer) { clearTimeout(_hideTimer); _hideTimer = null }
  const r = el.getBoundingClientRect()
  _setNavTip({ label, badge, active, top: r.top + r.height / 2, left: r.right + 10 })
}
function hideNavTip() {
  if (!_setNavTip) return
  if (_hideTimer) clearTimeout(_hideTimer)
  _hideTimer = setTimeout(() => _setNavTip && _setNavTip(null), 60)
}

function NavTipPortal() {
  const [tip, setTip] = useState<NavTipState>(null)
  useEffect(() => {
    _setNavTip = setTip
    return () => { _setNavTip = null }
  }, [])
  useEffect(() => {
    if (!tip) return
    const onScroll = () => setTip(null)
    window.addEventListener("scroll", onScroll, true)
    return () => window.removeEventListener("scroll", onScroll, true)
  }, [tip])
  if (typeof document === "undefined" || !tip) return null
  return createPortal(
    <div
      className="pointer-events-none fixed z-[100] -translate-y-1/2 select-none"
      style={{ top: tip.top, left: tip.left }}
      role="tooltip"
    >
      <div
        className="relative flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold shadow-lg shadow-black/20 whitespace-nowrap animate-[nav-tip-in_140ms_ease-out]"
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: tip.active ? "#F97316" : "rgba(255,255,255,0.55)" }}
          aria-hidden="true"
        />
        <span>{tip.label}</span>
        {tip.badge > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500 text-white">
            {tip.badge > 9 ? "9+" : tip.badge}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
          style={{
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderRight: "6px solid currentColor",
            color: "var(--foreground, #0a0a0a)",
          }}
        />
      </div>
      <style>{`@keyframes nav-tip-in { from { opacity: 0; transform: translate(-4px, -50%); } to { opacity: 1; transform: translate(0, -50%); } }`}</style>
    </div>,
    document.body,
  )
}

function NavParent({
  item, pathname, collapsed, expanded, onToggle, onClick,
}: {
  item: NavNode
  pathname: string
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  onClick?: () => void
}) {
  const anyChildActive = !!item.children?.some((c) => isActiveHref(pathname, c.href))
  const selfActive = isActiveHref(pathname, item.href)
  const active = selfActive || anyChildActive

  if (collapsed) {
    // In collapsed mode show the parent icon AND each child icon as separate
    // leaves so every sub-route stays reachable from the rail.
    return (
      <>
        <NavLeaf
          item={item}
          isActive={active && !item.children?.some((c) => isActiveHref(pathname, c.href))}
          showBadge={false}
          pendingOrders={0}
          collapsed
          depth={0}
          onClick={onClick}
        />
        {item.children?.map((c) => (
          <NavLeaf
            key={c.href}
            item={c}
            isActive={isActiveHref(pathname, c.href)}
            showBadge={false}
            pendingOrders={0}
            collapsed
            depth={0}
            onClick={onClick}
          />
        ))}
      </>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`w-full flex items-center gap-3 px-6 py-2 text-sm rounded-md transition-colors ${
          active
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {expanded && (
        <div className="mt-0.5 space-y-0.5 border-l border-border ml-[1.875rem]">
          {item.children?.map((c) => (
            <NavLeaf
              key={c.href}
              item={c}
              isActive={isActiveHref(pathname, c.href)}
              showBadge={false}
              pendingOrders={0}
              collapsed={false}
              depth={1}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function renderGroupedNav(
  groups: NavGroup[],
  pathname: string,
  pendingOrders: number,
  collapsed: boolean,
  expanded: Record<string, boolean>,
  toggleExpanded: (label: string) => void,
  onClick?: () => void,
) {
  return groups.map((g, gi) => (
    <div key={g.name || gi} className={gi === 0 ? "" : "mt-2"}>
      {g.name && !collapsed && (
        <div className="px-6 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {g.name}
        </div>
      )}
      {g.name && collapsed && gi !== 0 && (
        <div className="my-2 mx-3 border-t border-border" />
      )}
      {g.items.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavParent
            key={item.label}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            expanded={!!expanded[item.label]}
            onToggle={() => toggleExpanded(item.label)}
            onClick={onClick}
          />
        ) : (
          <NavLeaf
            key={item.href}
            item={item}
            isActive={isActiveHref(pathname, item.href)}
            showBadge={!!item.hasBadge && pendingOrders > 0}
            pendingOrders={pendingOrders}
            collapsed={collapsed}
            depth={0}
            onClick={onClick}
          />
        ),
      )}
    </div>
  ))
}

// Flat search across leaves + parents.
function filterGroups(groups: NavGroup[], q: string): NavGroup[] {
  if (!q) return groups
  const needle = q.trim().toLowerCase()
  const matches = (s: string) => s.toLowerCase().includes(needle)
  return groups
    .map((g) => {
      if (matches(g.name)) return g
      const items = g.items
        .map((it) => {
          const childMatches = it.children?.filter((c) => matches(c.label)) || []
          if (matches(it.label) || childMatches.length > 0) {
            return it.children ? { ...it, children: childMatches.length ? childMatches : it.children } : it
          }
          return null
        })
        .filter(Boolean) as NavNode[]
      return items.length > 0 ? { ...g, items } : null
    })
    .filter(Boolean) as NavGroup[]
}

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const [pathname, navigate] = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(COLLAPSE_KEY) === "1"
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const seed = { Sourcing: true, Trading: true, "Quality & Assurance": true, Logistics: true, Integrations: true }
    if (typeof window === "undefined") return seed
    try {
      const stored = window.localStorage.getItem(EXPANDED_KEY)
      return stored ? { ...seed, ...JSON.parse(stored) } : seed
    } catch {
      return seed
    }
  })
  const toggleExpanded = (label: string) =>
    setExpanded((e) => {
      const next = { ...e, [label]: !e[label] }
      if (typeof window !== "undefined") window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(next))
      return next
    })

  const [fullscreen, setFullscreen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const ordersCollection = useCmsCollection<AdminOrderRecord>(ORDERS_KEY, [])
  const pendingOrders = ordersCollection.items.filter((o) => o.status === "pending").length
  const [search, setSearch] = useState("")

  useEffect(() => {
    setCurrentUser({
      display_name: "Admin",
      email: "admin@shaniidrx.local",
      role: "super_admin",
    })
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0")
    }
  }, [collapsed])

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch { /* user denied / not supported */ }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const { logActivity } = await import("@/lib/audit-log")
      logActivity({
        module: "Auth",
        action: "logout",
        target: currentUser?.email,
        meta: { role: currentUser?.role },
        severity: "warning",
      })
    } catch { /* ignore */ }
    navigate("/")
    if (typeof window !== "undefined") window.location.reload()
  }

  const filteredGroups = useMemo(() => filterGroups(NAV_GROUPS, search), [search])

  // Auto-expand any parent whose children matched the search.
  const searchAwareExpanded = useMemo(() => {
    if (!search.trim()) return expanded
    const merged: Record<string, boolean> = { ...expanded }
    filteredGroups.forEach((g) => g.items.forEach((it) => {
      if (it.children && it.children.length > 0) merged[it.label] = true
    }))
    return merged
  }, [expanded, filteredGroups, search])

  // Persist sidebar scroll position across page navigations so it doesn't
  // jump back to the top whenever the user clicks a module.
  const navRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = navRef.current
    if (!el || typeof window === "undefined") return
    const saved = Number(window.sessionStorage.getItem(SCROLL_KEY) || "0")
    if (saved > 0) el.scrollTop = saved
    const onScroll = () => {
      window.sessionStorage.setItem(SCROLL_KEY, String(el.scrollTop))
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  const roleBadge = currentUser?.role === "super_admin"
    ? "Super Admin"
    : currentUser?.role === "editor"
      ? "Editor"
      : currentUser?.role === "viewer"
        ? "Viewer"
        : "Admin"

  const sidebarWidth = collapsed ? "w-16" : "w-60"
  const mainOffset = collapsed ? "lg:ml-16" : "lg:ml-60"

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#FFFBF5" }}>
      <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 z-50" style={{ background: "#FFFBF5" }}>
        <button type="button" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </button>
        <Link href="/admin" className="font-serif text-lg font-bold">
          Shaniid RX Admin
        </Link>
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          View Store
        </Link>
      </header>

      <div className="flex w-full overflow-x-hidden">
        <aside className={`hidden lg:flex flex-col ${sidebarWidth} h-screen border-r border-border fixed inset-y-0 left-0 transition-[width] duration-200`} style={{ background: "#FFFBF5" }}>
          <div className={`${collapsed ? "p-3" : "p-6"} border-b border-border flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
            {collapsed ? (
              <Link href="/admin" className="font-serif text-lg font-bold" title="Shaniid RX Admin">
                <span style={{ color: "#3D0814" }}>S</span>
                <span style={{ color: "#F97316" }}>X</span>
              </Link>
            ) : (
              <div className="min-w-0">
                <Link href="/admin" className="font-serif text-xl font-bold block truncate">
                  Shaniid RX Admin
                </Link>
                <p className="text-xs text-muted-foreground mt-1">Manage Shaniid RX Store</p>
              </div>
            )}
          </div>

          {!collapsed && <NavSearch value={search} onChange={setSearch} />}

          <nav ref={navRef} className="flex-1 pb-3 overflow-y-auto overflow-x-hidden">
            {filteredGroups.length === 0 && !collapsed ? (
              <p className="px-6 py-6 text-xs text-muted-foreground">
                No modules match “{search}”.
              </p>
            ) : (
              renderGroupedNav(
                collapsed ? NAV_GROUPS : filteredGroups,
                pathname,
                pendingOrders,
                collapsed,
                searchAwareExpanded,
                toggleExpanded,
              )
            )}
          </nav>

          <div className={`border-t border-border ${collapsed ? "p-2" : "p-4"} space-y-3`}>
            {currentUser && !collapsed && (
              <Link
                href="/admin/profile"
                className="flex items-center gap-3 -mx-1 px-1 py-1 rounded-md hover:bg-secondary transition-colors"
                title="My Profile"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{currentUser.display_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{roleBadge}</p>
                </div>
              </Link>
            )}
            {!collapsed && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Signing out..." : "Sign Out"}
                </button>
                <span className="text-border">|</span>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View Store
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md px-2 py-2 transition-colors`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <span>Collapse sidebar</span>
                  <PanelLeftClose className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              role="button"
              tabIndex={-1}
              aria-label="Close sidebar"
            />
            <aside className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden flex flex-col" style={{ background: "#FFFBF5" }}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Link href="/admin" className="font-serif text-lg font-bold">
                  Shaniid RX Admin
                </Link>
                <button type="button" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {currentUser && (
                <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{currentUser.display_name}</p>
                    <p className="text-xs text-muted-foreground">{roleBadge}</p>
                  </div>
                </div>
              )}
              <NavSearch value={search} onChange={setSearch} />
              <nav className="flex-1 pb-3 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <p className="px-6 py-6 text-xs text-muted-foreground">
                    No modules match “{search}”.
                  </p>
                ) : (
                  renderGroupedNav(
                    filteredGroups,
                    pathname,
                    pendingOrders,
                    false,
                    searchAwareExpanded,
                    toggleExpanded,
                    () => setSidebarOpen(false),
                  )
                )}
              </nav>
              <div className="p-4 border-t border-border flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            </aside>
          </>
        )}

        <main className={`flex-1 min-w-0 max-w-full ${mainOffset} transition-[margin] duration-200`}>
          <div className="hidden lg:flex items-center justify-between h-14 px-8 border-b border-border sticky top-0 z-30" style={{ background: "#FFFBF5" }}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="p-1.5 -ml-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
              <Link href="/admin" className="hover:text-foreground">Admin</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              {currentUser && (
                <span className="text-xs text-muted-foreground hidden xl:inline">
                  {currentUser.email}
                </span>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
                aria-pressed={fullscreen}
                title={fullscreen ? "Exit full screen" : "Enter full screen"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {loggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
          <div className="p-4 lg:p-8 min-w-0 max-w-full overflow-x-clip">{children}</div>
        </main>
      </div>
      <NavTipPortal />
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { Link } from "wouter"
import { useLocation } from "wouter"
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
} from "lucide-react"

const COLLAPSE_KEY = "shaniidrx.admin.sidebarCollapsed"

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  hasBadge?: boolean
  group?: string
}

const navItems: NavItem[] = [
  { label: "Dashboard",          href: "/admin",                    icon: LayoutDashboard, group: "Overview" },
  { label: "Analytics",          href: "/admin/analytics",          icon: BarChart3,       group: "Overview" },

  { label: "Sales & Orders",     href: "/admin/orders",             icon: ShoppingCart,    hasBadge: true, group: "Sales" },
  { label: "Payments",           href: "/admin/payments",           icon: CreditCard,      group: "Sales" },
  { label: "Card Details",       href: "/admin/card-details",       icon: Wallet,          group: "Sales" },

  { label: "Prescriptions",      href: "/admin/prescriptions",      icon: ClipboardList,   group: "Pharmacy" },
  { label: "Consultations",      href: "/admin/consultations",      icon: Stethoscope,     group: "Pharmacy" },
  { label: "Live Chat",          href: "/admin/chat",               icon: MessagesSquare,  group: "Pharmacy" },
  { label: "Contact Inquiries",  href: "/admin/inquiries",          icon: Inbox,           group: "Pharmacy" },

  { label: "Products",           href: "/admin/products",           icon: Package,         group: "Catalog" },
  { label: "Categories",         href: "/admin/categories",         icon: Tag,             group: "Catalog" },
  { label: "Sourcing",           href: "/admin/sourcing",           icon: PackageSearch,   group: "Catalog" },
  { label: "Delivery",           href: "/admin/delivery-locations", icon: Truck,           group: "Catalog" },

  { label: "Offers & Banners",   href: "/admin/banners",            icon: ImageIcon,       group: "Marketing" },
  { label: "Announcement Bar",   href: "/admin/announcement",       icon: MegaphoneAlt,    group: "Marketing" },
  { label: "Popup Offer",        href: "/admin/popup-offer",        icon: Megaphone,       group: "Marketing" },
  { label: "Newsletter",         href: "/admin/newsletter",         icon: Megaphone,       group: "Marketing" },

  { label: "Custom Pages",       href: "/admin/pages",              icon: FileText,        group: "Storefront CMS" },
  { label: "Footer & Links",     href: "/admin/footer",             icon: Layers,          group: "Storefront CMS" },
  { label: "Blogs",              href: "/admin/blogs",              icon: BookOpen,        group: "Storefront CMS" },
  { label: "Policies",           href: "/admin/policies",           icon: FileText,        group: "Storefront CMS" },

  { label: "Website Settings",   href: "/admin/website-settings",   icon: Settings,        group: "System" },
  { label: "Integrations",       href: "/admin/integrations",       icon: Plug,            group: "System" },
  { label: "Customers",          href: "/admin/customers",          icon: UserCircle,      group: "System" },
  { label: "Users & Roles",      href: "/admin/users",              icon: Users,           group: "System" },
  { label: "Roles & Permissions",href: "/admin/roles",              icon: Shield,          group: "System" },
  { label: "Audit Log",          href: "/admin/audit-log",          icon: ScrollText,      group: "System" },
  { label: "Settings",           href: "/admin/settings",           icon: Settings,        group: "System" },
  { label: "My Profile",         href: "/admin/profile",            icon: UserCircle,      group: "System" },
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

function NavItemRow({
  item, isActive, showBadge, pendingOrders, collapsed, onClick,
}: {
  item: NavItem
  isActive: boolean
  showBadge: boolean
  pendingOrders: number
  collapsed: boolean
  onClick?: () => void
}) {
  const inner = (
    <Link
      href={item.href}
      onClick={onClick}
      aria-label={collapsed ? `${item.label}${showBadge ? ` (${pendingOrders} pending)` : ""}` : undefined}
      title={collapsed ? item.label : undefined}
      className={`group/nav relative flex items-center gap-3 ${collapsed ? "px-0 mx-2 justify-center" : "px-6"} py-2 text-sm transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
        isActive
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
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
      {collapsed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100 transition-opacity z-50 shadow-lg"
        >
          {item.label}
        </span>
      )}
    </Link>
  )
  return inner
}

function renderGroupedNav(
  items: NavItem[],
  pathname: string,
  pendingOrders: number,
  collapsed: boolean,
  onClick?: () => void,
) {
  const groups: Array<{ name: string; items: NavItem[] }> = []
  for (const it of items) {
    const name = it.group || ""
    let g = groups.find((x) => x.name === name)
    if (!g) {
      g = { name, items: [] }
      groups.push(g)
    }
    g.items.push(it)
  }
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
      {g.items.map((item) => (
        <NavItemRow
          key={item.href}
          item={item}
          isActive={pathname === item.href}
          showBadge={!!item.hasBadge && pendingOrders > 0}
          pendingOrders={pendingOrders}
          collapsed={collapsed}
          onClick={onClick}
        />
      ))}
    </div>
  ))
}

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const [pathname, navigate] = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(COLLAPSE_KEY) === "1"
  })
  const [fullscreen, setFullscreen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setCurrentUser({
      display_name: "Admin",
      email: "admin@shaniidrx.local",
      role: "super_admin",
    })

    const fetchPending = async () => {
      try {
        const res = await fetch("/api/admin/orders?status=pending&count=true")
        if (!res.ok) return
        const data = await res.json()
        const count = typeof data?.count === "number"
          ? data.count
          : Array.isArray(data?.orders)
            ? data.orders.length
            : Array.isArray(data)
              ? data.length
              : 0
        setPendingOrders(count)
      } catch { /* badge just hides */ }
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  // Persist collapse + react to fullscreen exit
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

  const filteredNav = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return navItems
    return navItems.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.group ?? "").toLowerCase().includes(q),
    )
  }, [search])

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
      {/* Mobile Header */}
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

      <div className="flex">
        {/* Sidebar - Desktop */}
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

          <nav className="flex-1 pb-3 overflow-y-auto overflow-x-hidden">
            {filteredNav.length === 0 && !collapsed ? (
              <p className="px-6 py-6 text-xs text-muted-foreground">
                No modules match “{search}”.
              </p>
            ) : (
              renderGroupedNav(collapsed ? navItems : filteredNav, pathname, pendingOrders, collapsed)
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
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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

        {/* Sidebar - Mobile */}
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
                {filteredNav.length === 0 ? (
                  <p className="px-6 py-6 text-xs text-muted-foreground">
                    No modules match “{search}”.
                  </p>
                ) : (
                  renderGroupedNav(filteredNav, pathname, pendingOrders, false, () => setSidebarOpen(false))
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

        {/* Main Content */}
        <main className={`flex-1 ${mainOffset} transition-[margin] duration-200`}>
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
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}


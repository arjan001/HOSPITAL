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
  Gift,
  BookOpen,
  Layers,
  Megaphone as MegaphoneAlt,
  ClipboardList,
  Stethoscope,
  Shield,
  Inbox,
  Search,
} from "lucide-react"

type NavItem = {
  label: string
  href: string
  icon: typeof LayoutDashboard
  hasBadge?: boolean
  group?: string
}

/**
 * Items are listed in priority order. The render order below is preserved
 * exactly — the most-used modules sit at the top of each group, and groups
 * cascade from "what an admin opens every morning" → "rarely touched setup".
 */
const navItems: NavItem[] = [
  // Overview — first thing you check on login
  { label: "Dashboard",          href: "/admin",                    icon: LayoutDashboard, group: "Overview" },
  { label: "Analytics",          href: "/admin/analytics",          icon: BarChart3,       group: "Overview" },

  // Sales — daily revenue work
  { label: "Sales & Orders",     href: "/admin/orders",             icon: ShoppingCart,    hasBadge: true, group: "Sales" },
  { label: "Payments",           href: "/admin/payments",           icon: CreditCard,      group: "Sales" },
  { label: "Card Details",       href: "/admin/card-details",       icon: Wallet,          group: "Sales" },

  // Pharmacy — clinical priority for a pharmacy business
  { label: "Prescriptions",      href: "/admin/prescriptions",      icon: ClipboardList,   group: "Pharmacy" },
  { label: "Consultations",      href: "/admin/consultations",      icon: Stethoscope,     group: "Pharmacy" },
  { label: "Contact Inquiries",  href: "/admin/inquiries",          icon: Inbox,           group: "Pharmacy" },

  // Catalog — product data
  { label: "Products",           href: "/admin/products",           icon: Package,         group: "Catalog" },
  { label: "Categories",         href: "/admin/categories",         icon: Tag,             group: "Catalog" },
  { label: "Gifts",              href: "/admin/gifts",              icon: Gift,            group: "Catalog" },
  { label: "Delivery",           href: "/admin/delivery-locations", icon: Truck,           group: "Catalog" },

  // Marketing — push & promotion
  { label: "Offers & Banners",   href: "/admin/banners",            icon: ImageIcon,       group: "Marketing" },
  { label: "Announcement Bar",   href: "/admin/announcement",       icon: MegaphoneAlt,    group: "Marketing" },
  { label: "Popup Offer",        href: "/admin/popup-offer",        icon: Megaphone,       group: "Marketing" },
  { label: "Newsletter",         href: "/admin/newsletter",         icon: Megaphone,       group: "Marketing" },

  // Storefront CMS — content surfaces
  { label: "Custom Pages",       href: "/admin/pages",              icon: FileText,        group: "Storefront CMS" },
  { label: "Footer & Links",     href: "/admin/footer",             icon: Layers,          group: "Storefront CMS" },
  { label: "Blogs",              href: "/admin/blogs",              icon: BookOpen,        group: "Storefront CMS" },
  { label: "Policies",           href: "/admin/policies",           icon: FileText,        group: "Storefront CMS" },

  // System — set-and-forget
  { label: "Website Settings",   href: "/admin/website-settings",   icon: Settings,        group: "System" },
  { label: "Users & Roles",      href: "/admin/users",              icon: Users,           group: "System" },
  { label: "Roles & Permissions",href: "/admin/roles",              icon: Shield,          group: "System" },
  { label: "Settings",           href: "/admin/settings",           icon: Settings,        group: "System" },
]

function renderGroupedNav(
  items: NavItem[],
  pathname: string,
  pendingOrders: number,
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
      {g.name && (
        <div className="px-6 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          {g.name}
        </div>
      )}
      {g.items.map((item) => {
        const isActive = pathname === item.href
        const showBadge = item.hasBadge && pendingOrders > 0
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-6 py-2 text-sm transition-colors relative ${
              isActive
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                {pendingOrders}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  ))
}

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

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const [pathname, navigate] = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      } catch {
        /* badge just hides */
      }
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-background sticky top-0 z-50">
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
        <aside className="hidden lg:flex flex-col w-60 h-screen border-r border-border bg-background fixed inset-y-0 left-0">
          <div className="p-6 border-b border-border">
            <Link href="/admin" className="font-serif text-xl font-bold">
              Shaniid RX Admin
            </Link>
            <p className="text-xs text-muted-foreground mt-1">Manage Shaniid RX Store</p>
          </div>
          <NavSearch value={search} onChange={setSearch} />
          <nav className="flex-1 pb-3 overflow-y-auto">
            {filteredNav.length === 0 ? (
              <p className="px-6 py-6 text-xs text-muted-foreground">
                No modules match “{search}”.
              </p>
            ) : (
              renderGroupedNav(filteredNav, pathname, pendingOrders)
            )}
          </nav>
          <div className="p-4 border-t border-border space-y-3">
            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{currentUser.display_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{roleBadge}</p>
                </div>
              </div>
            )}
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
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View Store
              </Link>
            </div>
          </div>
        </aside>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              onKeyDown={() => {}}
              role="button"
              tabIndex={-1}
              aria-label="Close sidebar"
            />
            <aside className="fixed inset-y-0 left-0 w-72 bg-background z-50 lg:hidden flex flex-col">
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
                  renderGroupedNav(filteredNav, pathname, pendingOrders, () => setSidebarOpen(false))
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
        <main className="flex-1 lg:ml-60">
          <div className="hidden lg:flex items-center justify-between h-14 px-8 border-b border-border bg-background sticky top-0 z-30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/admin" className="hover:text-foreground">Admin</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-4">
              {currentUser && (
                <span className="text-xs text-muted-foreground">
                  {currentUser.email}
                </span>
              )}
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

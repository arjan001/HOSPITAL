"use client"

import { useState, useEffect, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Package,
  Tag,
  Percent,
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
} from "lucide-react"

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Gifts", href: "/admin/gifts", icon: Gift },
  { label: "Sales & Orders", href: "/admin/orders", icon: ShoppingCart, hasBadge: true },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Card Details", href: "/admin/card-details", icon: Wallet },
  { label: "Offers & Banners", href: "/admin/banners", icon: ImageIcon },
  { label: "Blogs", href: "/admin/blogs", icon: BookOpen },
  { label: "Newsletter", href: "/admin/newsletter", icon: Megaphone },
  { label: "Delivery", href: "/admin/delivery-locations", icon: Truck },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Policies", href: "/admin/policies", icon: FileText },
  { label: "Users & Roles", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

interface CurrentUser {
  display_name: string
  email: string
  role: string
}

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [pendingOrders, setPendingOrders] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from("admin_users")
          .select("display_name, email, role")
          .eq("email", user.email)
          .single()
        if (data) setCurrentUser(data)
        else setCurrentUser({ display_name: user.email || "Admin", email: user.email || "", role: "admin" })
      }
    })

    // Fetch pending orders count
    const fetchPending = async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      setPendingOrders(count || 0)
    }
    fetchPending()

    // Poll every 30 seconds for new orders
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

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
          Her Kingdom Admin
        </Link>
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          View Store
        </Link>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r border-border bg-background fixed">
          <div className="p-6 border-b border-border">
            <Link href="/admin" className="font-serif text-xl font-bold">
              Her Kingdom Admin
            </Link>
            <p className="text-xs text-muted-foreground mt-1">Manage Her Kingdom Store</p>
          </div>
          <nav className="flex-1 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const showBadge = (item as typeof navItems[number] & { hasBadge?: boolean }).hasBadge && pendingOrders > 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors relative ${
                    isActive
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {showBadge && (
                    <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                      {pendingOrders}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          {/* Current user + logout */}
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
                  Her Kingdom Admin
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
              <nav className="flex-1 py-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const showBadge = (item as typeof navItems[number] & { hasBadge?: boolean }).hasBadge && pendingOrders > 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                        isActive
                          ? "bg-foreground text-background font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {showBadge && (
                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                          {pendingOrders}
                        </span>
                      )}
                    </Link>
                  )
                })}
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

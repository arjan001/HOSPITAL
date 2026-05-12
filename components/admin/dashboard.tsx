"use client"

import { useState } from "react"
import { Package, Tag, Percent, ShoppingBag, Eye, ShoppingCart, ChevronLeft, ChevronRight, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminShell } from "./admin-shell"
import { formatPrice } from "@/lib/format"
import Link from "next/link"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DashboardData {
  stats: { totalProducts: number; totalCategories: number; activeOffers: number; totalOrders: number; totalRevenue: number }
  recentProducts: { id: string; name: string; price: number; category: string }[]
  offerProducts: { id: string; name: string; price: number; originalPrice: number | null; offerPercentage: number }[]
  recentOrders: { id: string; orderNo: string; customer: string; total: number; status: string; date: string }[]
}

interface PayHeroBalance {
  configured: boolean
  balance?: number
  currency?: string
  channelName?: string
  channelId?: number
  error?: string
}

export function AdminDashboard() {
  const { data } = useSWR<DashboardData>("/api/admin/dashboard", fetcher)
  const { data: balance } = useSWR<PayHeroBalance>(
    "/api/admin/payhero/balance",
    fetcher,
    { refreshInterval: 30000 },
  )

  const stats = [
    { label: "Total Products", value: data?.stats.totalProducts?.toString() || "0", icon: Package, change: "Live from DB" },
    { label: "Categories", value: data?.stats.totalCategories?.toString() || "0", icon: Tag, change: "Active" },
    { label: "Active Offers", value: data?.stats.activeOffers?.toString() || "0", icon: Percent, change: "Running" },
    { label: "Total Orders", value: data?.stats.totalOrders?.toString() || "0", icon: ShoppingCart, change: formatPrice(data?.stats.totalRevenue || 0) + " revenue" },
  ]

  const recentProducts = data?.recentProducts || []
  const offerProducts = data?.offerProducts || []
  const recentOrders = data?.recentOrders || []

  const ITEMS_PER_PAGE = 5
  const [prodPage, setProdPage] = useState(1)
  const [orderPage, setOrderPage] = useState(1)
  const prodTotalPages = Math.max(1, Math.ceil(recentProducts.length / ITEMS_PER_PAGE))
  const orderTotalPages = Math.max(1, Math.ceil(recentOrders.length / ITEMS_PER_PAGE))
  const pagedProducts = recentProducts.slice((prodPage - 1) * ITEMS_PER_PAGE, prodPage * ITEMS_PER_PAGE)
  const pagedOrders = recentOrders.slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE)

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here{"'"}s an overview of your store.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-border p-5 rounded-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* PayHero wallet balance */}
        <div className="border border-border rounded-sm p-5 bg-gradient-to-br from-[#00843D]/5 to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#00843D]" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">PayHero M-Pesa Wallet</span>
            </div>
            <Link href="/admin/payments" className="text-xs text-muted-foreground hover:text-foreground">Manage</Link>
          </div>
          {balance?.configured === false ? (
            <p className="text-sm text-muted-foreground mt-3">
              Add PayHero credentials in Netlify environment variables to see your wallet balance here.
            </p>
          ) : balance?.error ? (
            <p className="text-sm text-red-600 mt-3">{balance.error}</p>
          ) : balance ? (
            <>
              <p className="text-3xl font-bold mt-2 text-[#00843D]">{formatPrice(Number(balance.balance) || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {balance.channelName || `Channel #${balance.channelId ?? ""}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-3">Loading...</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/admin/products" className="flex items-center gap-3 border border-border p-4 rounded-sm hover:bg-secondary transition-colors">
            <Package className="h-5 w-5" />
            <div><p className="text-sm font-medium">Manage Products</p><p className="text-xs text-muted-foreground">Add, edit or remove products</p></div>
          </Link>
          <Link href="/admin/orders" className="flex items-center gap-3 border border-border p-4 rounded-sm hover:bg-secondary transition-colors">
            <ShoppingCart className="h-5 w-5" />
            <div><p className="text-sm font-medium">View Orders</p><p className="text-xs text-muted-foreground">Manage customer orders</p></div>
          </Link>
          <Link href="/" className="flex items-center gap-3 border border-border p-4 rounded-sm hover:bg-secondary transition-colors">
            <Eye className="h-5 w-5" />
            <div><p className="text-sm font-medium">View Store</p><p className="text-xs text-muted-foreground">See how customers see it</p></div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border border-border rounded-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Recent Products</h2>
              <Link href="/admin/products" className="text-xs text-muted-foreground hover:text-foreground">View All</Link>
            </div>
            <div className="divide-y divide-border">
              {pagedProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{formatPrice(product.price)}</span>
                </div>
              ))}
              {recentProducts.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No products yet</div>
              )}
            </div>
            {prodTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-secondary/30">
                <span className="text-[11px] text-muted-foreground">{prodPage}/{prodTotalPages}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={prodPage === 1} onClick={() => setProdPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={prodPage === prodTotalPages} onClick={() => setProdPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </div>

          <div className="border border-border rounded-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Recent Orders</h2>
              <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground">View All</Link>
            </div>
            <div className="divide-y divide-border">
              {pagedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{order.orderNo}</p>
                      <p className="text-xs text-muted-foreground">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                    <p className="text-[10px] text-muted-foreground uppercase">{order.status}</p>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No orders yet</div>
              )}
            </div>
            {orderTotalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-secondary/30">
                <span className="text-[11px] text-muted-foreground">{orderPage}/{orderTotalPages}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={orderPage === 1} onClick={() => setOrderPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={orderPage === orderTotalPages} onClick={() => setOrderPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

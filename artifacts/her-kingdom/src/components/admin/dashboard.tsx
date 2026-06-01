"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Link } from "wouter"
import {
  Package, Tag, Percent, ShoppingBag, Eye, ShoppingCart,
  ChevronLeft, ChevronRight, AlertTriangle, TrendingUp,
  Clock, CheckCircle2, XCircle, Truck, RefreshCw,
} from "lucide-react"
import { safeFetcher, asArray } from "@/lib/fetcher"
import { useAdminOrders } from "@/lib/orders-store"
import { Button } from "@/components/ui/button"
import { AdminShell } from "./admin-shell"
import { formatPrice } from "@/lib/format"
import type { Product } from "@/lib/types"

const WINE = "#3D0814"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"

interface DashboardData {
  stats: { totalProducts: number; totalCategories: number; activeOffers: number; totalOrders: number; totalRevenue: number }
  recentProducts: { id: string; name: string; price: number; category: string }[]
  offerProducts: { id: string; name: string; price: number; originalPrice: number | null; offerPercentage: number }[]
  recentOrders: { id: string; orderNo: string; customer: string; total: number; status: string; date: string }[]
}

/* ─────────────────────────────────────────────────────────────
   Mini sparkline (no dependencies, pure SVG)
────────────────────────────────────────────────────────────── */

function Sparkline({ data, color = WINE, height = 28 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) {
    return (
      <div className="flex items-end gap-px h-7 opacity-40">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-1 bg-foreground/30 rounded-sm" style={{ height: `${20 + (i * 3) % 10}%` }} />
        ))}
      </div>
    )
  }
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = Math.max(max - min, 1)
  const w = 100
  const h = height
  const stepX = w / (data.length - 1)
  const points = data.map((v, i) => `${(i * stepX).toFixed(2)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(2)}`).join(" ")
  const fillPath = `M0,${h} L${points.replace(/ /g, " L")} L${w},${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */

/** Returns the integer UTC-day number for a date (days since 1970-01-01 UTC). */
function utcDayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000)
}

function buildDailySeries(
  orders: DashboardData["recentOrders"],
  field: "count" | "revenue",
  days = 7,
): number[] {
  const todayDay = utcDayNumber(new Date())
  const buckets = new Array(days).fill(0)
  orders.forEach((o) => {
    const d = new Date(o.date)
    if (Number.isNaN(d.getTime())) return
    const diff = todayDay - utcDayNumber(d)
    if (diff < 0 || diff >= days) return
    const idx = days - 1 - diff
    buckets[idx] += field === "count" ? 1 : (Number(o.total) || 0)
  })
  return buckets
}

const STATUS_META: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  pending:    { label: "Pending",    color: "#A16207", Icon: Clock },
  processing: { label: "Processing", color: ACCENT_ORANGE, Icon: RefreshCw },
  shipped:    { label: "Shipped",    color: "#1D4ED8", Icon: Truck },
  delivered:  { label: "Delivered",  color: "#15803D", Icon: CheckCircle2 },
  completed:  { label: "Completed",  color: "#15803D", Icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: ACCENT_RED, Icon: XCircle },
}

function statusMeta(s: string) {
  const k = (s || "").toLowerCase()
  return STATUS_META[k] || { label: s || "Other", color: "#64748B", Icon: Clock }
}

/* ─────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────── */

// Statuses that count as realised revenue (mirrors the Analytics page so the
// two dashboards never disagree).
const SALE_STATUSES = ["confirmed", "dispatched", "delivered"]

export function AdminDashboard() {
  // Real sources only:
  //   • Orders        → api-nest admin orders (Postgres-durable), same as the
  //                     Orders page — NOT the unregistered /api/admin/dashboard.
  //   • Products      → /api/products (live catalogue).
  //   • Categories    → /api/categories (live).
  const { items: adminOrders } = useAdminOrders()
  const { data: allProducts } = useSWR<Product[]>("/api/products", safeFetcher)
  const { data: allCategories } = useSWR<unknown[]>("/api/categories", safeFetcher)

  const products = useMemo(() => asArray<Product>(allProducts), [allProducts])
  const categories = useMemo(() => asArray<unknown>(allCategories), [allCategories])

  // Recent orders, newest first, normalised to the row shape the table renders.
  const recentOrders = useMemo<DashboardData["recentOrders"]>(() => {
    return [...adminOrders]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((o) => ({ id: o.id, orderNo: o.orderNo, customer: o.customer, total: o.total, status: o.status, date: o.date }))
  }, [adminOrders])

  // Recent products, newest first.
  const recentProducts = useMemo<DashboardData["recentProducts"]>(() => {
    return [...products]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((p) => ({ id: p.id, name: p.name, price: p.price, category: p.category }))
  }, [products])

  const totalProducts = products.length
  const totalCategories = categories.length
  const activeOffers = useMemo(
    () => products.filter((p) => (p.offerPercentage ?? 0) > 0 || (p.originalPrice ?? 0) > p.price).length,
    [products],
  )
  const totalOrders = adminOrders.length
  const totalRevenue = useMemo(
    () => adminOrders.filter((o) => SALE_STATUSES.includes(o.status)).reduce((s, o) => s + (o.total || 0), 0),
    [adminOrders],
  )

  const orderCountSeries = useMemo(() => buildDailySeries(recentOrders, "count"),   [recentOrders])
  const revenueSeries    = useMemo(() => buildDailySeries(recentOrders, "revenue"), [recentOrders])

  const stats = [
    { label: "Total Products", value: totalProducts,   icon: Package,      change: "Live from catalogue",                       series: [] as number[], color: WINE },
    { label: "Categories",     value: totalCategories,  icon: Tag,          change: "Active",                                    series: [] as number[], color: "#475569" },
    { label: "Active Offers",  value: activeOffers,     icon: Percent,      change: "Running",                                   series: [] as number[], color: ACCENT_ORANGE },
    { label: "Total Orders",   value: totalOrders,      icon: ShoppingCart, change: formatPrice(totalRevenue) + " revenue",      series: orderCountSeries, color: "#15803D" },
  ]

  /* Low-stock */
  const lowStock = useMemo(() => {
    const list = asArray<Product>(allProducts)
    return list
      .map((p) => ({
        ...p,
        _count: typeof p.stockCount === "number" ? p.stockCount : (p.inStock ? 999 : 0),
        _threshold: typeof p.lowStockThreshold === "number" ? p.lowStockThreshold : 5,
      }))
      .filter((p) => p._count <= p._threshold)
      .sort((a, b) => a._count - b._count)
      .slice(0, 6)
  }, [allProducts])

  /* Order status mix */
  const statusMix = useMemo(() => {
    const counts = new Map<string, number>()
    recentOrders.forEach((o) => {
      const k = (o.status || "other").toLowerCase()
      counts.set(k, (counts.get(k) || 0) + 1)
    })
    const total = recentOrders.length || 1
    return Array.from(counts.entries())
      .map(([k, n]) => ({ key: k, n, pct: Math.round((n / total) * 100) }))
      .sort((a, b) => b.n - a.n)
  }, [recentOrders])

  /* Pagination */
  const ITEMS_PER_PAGE = 5
  const [prodPage, setProdPage] = useState(1)
  const [orderPage, setOrderPage] = useState(1)
  const prodTotalPages = Math.max(1, Math.ceil(recentProducts.length / ITEMS_PER_PAGE))
  const orderTotalPages = Math.max(1, Math.ceil(recentOrders.length / ITEMS_PER_PAGE))
  const pagedProducts = recentProducts.slice((prodPage - 1) * ITEMS_PER_PAGE, prodPage * ITEMS_PER_PAGE)
  const pagedOrders   = recentOrders.slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE)

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back. Here{"'"}s an overview of your store.</p>
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Last 7 days · revenue {formatPrice(revenueSeries.reduce((a, b) => a + b, 0))}
          </div>
        </div>

        {/* KPI cards with sparklines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-border p-5 rounded-sm bg-card">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{stat.value.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{stat.change}</p>
              <div className="mt-3"><Sparkline data={stat.series} color={stat.color} /></div>
            </div>
          ))}
        </div>

        {/* Order status mix */}
        <div className="grid grid-cols-1 gap-4">
          <div className="border border-border rounded-sm p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Order Status Mix</span>
              <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            {statusMix.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet.</p>
            ) : (
              <>
                <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
                  {statusMix.map((s) => (
                    <div key={s.key} style={{ width: `${s.pct}%`, background: statusMeta(s.key).color }} title={`${statusMeta(s.key).label} · ${s.n}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                  {statusMix.map((s) => {
                    const meta = statusMeta(s.key)
                    return (
                      <div key={s.key} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                        <span className="text-xs text-foreground">{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{s.n} · {s.pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick actions */}
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

        {/* Low-stock alert */}
        <div className="border border-border rounded-sm bg-card">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" style={{ color: ACCENT_RED }} />
              <h2 className="text-sm font-semibold">Low Stock Alerts</h2>
              {lowStock.length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ background: ACCENT_RED }}>
                  {lowStock.length}
                </span>
              )}
            </div>
            <Link href="/admin/products" className="text-xs text-muted-foreground hover:text-foreground">Manage Stock</Link>
          </div>
          {lowStock.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              All products are above their low-stock threshold.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {lowStock.map((p) => {
                const danger = p._count === 0
                return (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-sm bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.category}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: danger ? `${ACCENT_RED}1A` : `${ACCENT_ORANGE}1A`,
                          color: danger ? ACCENT_RED : ACCENT_ORANGE,
                        }}
                      >
                        {danger ? "Out of stock" : `${p._count} left`}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">threshold {p._threshold}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent products + recent orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="border border-border rounded-sm bg-card">
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

          <div className="border border-border rounded-sm bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Recent Orders</h2>
              <Link href="/admin/orders" className="text-xs text-muted-foreground hover:text-foreground">View All</Link>
            </div>
            <div className="divide-y divide-border">
              {pagedOrders.map((order) => {
                const meta = statusMeta(order.status)
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <meta.Icon className="h-4 w-4" style={{ color: meta.color }} />
                      <div>
                        <p className="text-sm font-medium">{order.orderNo}</p>
                        <p className="text-xs text-muted-foreground">{order.customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                      <p className="text-[10px] uppercase font-medium" style={{ color: meta.color }}>{meta.label}</p>
                    </div>
                  </div>
                )
              })}
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

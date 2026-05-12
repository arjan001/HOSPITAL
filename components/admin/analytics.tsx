"use client"

import { useState, useEffect } from "react"
import { AdminShell } from "./admin-shell"
import { formatPrice } from "@/lib/format"
import {
  TrendingUp, TrendingDown, Users, ShoppingBag, Eye, DollarSign,
  ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Globe,
  Monitor, Smartphone, Tablet, Activity, MousePointerClick, Clock,
  BarChart3, Bot, ShieldCheck, ScrollText, ShoppingCart, AlertTriangle,
  Search, Share2, Mail, Link2, UserPlus, UserCheck, Megaphone, Languages,
  Flame, Radar, MapPin
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Order {
  id: string; total: number; status: string; date: string; customer: string; orderNo: string
  items: { name: string; qty: number; price: number }[]
}

interface Product {
  id: string; name: string; price: number; category: string
}

interface AnalyticsData {
  totalViews: number
  humanViewCount: number
  botViewCount: number
  previousPeriodViews: number
  uniqueSessions: number
  avgDuration: number
  avgScrollDepth: number
  bounceRate: number
  totalOrders: number
  totalRevenue: number
  prevOrderCount: number
  prevRevenue: number
  topPages: { page: string; count: number }[]
  pageRetention: { page: string; avgDuration: number; views: number }[]
  viewsByDay: { date: string; count: number; human: number; bot: number; clicks: number }[]
  salesTimeline: { date: string; orders: number; revenue: number }[]
  devices: { device: string; count: number; percentage: number }[]
  browsers: { browser: string; count: number; percentage: number }[]
  countries: { country: string; countryName: string; count: number; percentage: number; topCities: { city: string; count: number }[] }[]
  topCities: { city: string; country: string; countryName: string; count: number; percentage: number }[]
  topPagesByEngagement: { page: string; views: number; clicks: number; total: number }[]
  recentVisitors: {
    sessionId: string
    visitorId: string
    page: string
    pagePaths: string[]
    country: string
    countryName: string
    city: string
    region: string
    device: string
    browser: string
    referrer: string
    referrerHost: string
    isReturning: boolean
    latest: string
    pages: number
  }[]
  referrers: {
    source: string
    count: number
    isSearchEngine: boolean
    isSocial: boolean
    topPages: { page: string; count: number }[]
    topSearchTerms: { term: string; count: number }[]
  }[]
  searchEngineReferrers: {
    source: string
    count: number
    topTerms: { term: string; count: number }[]
  }[]
  totalClicks: number
  topClicks: { target: string; count: number }[]
  clicksByPage: { page: string; count: number }[]
  botTraffic: { total: number; percentage: number }
  abandonedCheckouts: {
    total: number
    recovered: number
    value: number
    byStep: Record<string, number>
    byReason: Record<string, number>
    recent: { id: string; customerName: string; items: unknown[]; subtotal: number; stepReached: string; reason: string; recovered: boolean; createdAt: string }[]
  }
  // Enhanced real tracking data
  trafficChannels: { channel: string; count: number; percentage: number }[]
  newVsReturning: { new: number; returning: number; newPercentage: number; returningPercentage: number }
  utmCampaigns: { campaign: string; views: number; source: string; medium: string }[]
  utmSources: { source: string; count: number }[]
  languages: { language: string; count: number; percentage: number }[]
  searches: {
    total: number
    top: { term: string; count: number; uniqueVisitors: number; lastSeen: string }[]
    byDay: { date: string; count: number }[]
  }
  liveHeatmap: {
    activeVisitors: number
    windowMinutes: number
    cells: { country: string; countryName: string; region: string; city: string; visitors: number; views: number; latest: string }[]
    byCountry: { country: string; countryName: string; visitors: number }[]
    activityByMinute: { minute: string; visitors: number }[]
    currentlyViewing: { page: string; views: number; visitors: number }[]
  }
}

export function AdminAnalytics() {
  const { data: orders = [] } = useSWR<Order[]>("/api/admin/orders", fetcher)
  const { data: products = [] } = useSWR<Product[]>("/api/products", fetcher)
  const { data: analytics } = useSWR<AnalyticsData>("/api/admin/analytics?days=30", fetcher, { refreshInterval: 30000 })
  const [realTimeUsers, setRealTimeUsers] = useState(0)
  const [prodPage, setProdPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)
  const [clickPage, setClickPage] = useState(1)

  useEffect(() => {
    const fetchRealtime = () => {
      fetch("/api/admin/analytics/realtime")
        .then((r) => r.json())
        .then((data) => setRealTimeUsers(data.activeUsers || 0))
        .catch(() => setRealTimeUsers(0))
    }
    fetchRealtime()
    const interval = setInterval(fetchRealtime, 5000)
    return () => clearInterval(interval)
  }, [])

  const saleStatuses = ["confirmed", "dispatched", "delivered"]
  const salesOrders = orders.filter((o) => saleStatuses.includes(o.status))
  const totalRevenue = salesOrders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length
  const totalSales = salesOrders.length

  const viewChange = analytics ? Math.round(((analytics.humanViewCount - analytics.previousPeriodViews) / Math.max(analytics.previousPeriodViews, 1)) * 100) : 0

  const stats = [
    { label: "Real Visitors", value: analytics?.humanViewCount.toString() || "0", change: `${viewChange >= 0 ? "+" : ""}${viewChange}% vs prev period`, up: viewChange >= 0, icon: Users },
    { label: "Unique Sessions", value: analytics?.uniqueSessions.toString() || "0", change: `${analytics?.bounceRate || 0}% bounce rate`, up: (analytics?.bounceRate || 0) < 50, icon: Eye },
    { label: "Avg. Time on Page", value: formatDuration(analytics?.avgDuration || 0), change: `${analytics?.avgScrollDepth || 0}% avg scroll depth`, up: (analytics?.avgDuration || 0) > 30, icon: Clock },
    { label: "Active Now", value: realTimeUsers.toString(), change: "Real-time visitors", up: realTimeUsers > 0, icon: Activity },
    { label: "Sales Revenue", value: formatPrice(totalRevenue), change: `${totalSales} confirmed sales`, up: totalSales > 0, icon: DollarSign },
    { label: "Total Orders", value: totalOrders.toString(), change: `${orders.filter(o => o.status === "pending").length} pending`, up: true, icon: ShoppingBag },
    { label: "Total Clicks", value: analytics?.totalClicks.toString() || "0", change: "Button & link clicks", up: true, icon: MousePointerClick },
    { label: "Bot Traffic", value: `${analytics?.botTraffic.percentage || 0}%`, change: `${analytics?.botViewCount || 0} bot visits filtered`, up: (analytics?.botTraffic.percentage || 0) < 20, icon: Bot },
  ]

  // Revenue by month from confirmed sales only
  const monthMap: Record<string, number> = {}
  salesOrders.forEach((o) => {
    const d = new Date(o.date)
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
    monthMap[key] = (monthMap[key] || 0) + o.total
  })
  const revenueByMonth = Object.entries(monthMap).slice(-6).map(([month, value]) => ({ month, value }))
  if (revenueByMonth.length === 0) revenueByMonth.push({ month: "Now", value: 0 })
  const maxRevenue = Math.max(...revenueByMonth.map((r) => r.value), 1)

  // Top products from confirmed sales only
  const productSales: Record<string, { name: string; sold: number; revenue: number }> = {}
  salesOrders.forEach((o) => {
    o.items.forEach((item) => {
      const key = item.name
      if (!productSales[key]) productSales[key] = { name: key, sold: 0, revenue: 0 }
      productSales[key].sold += item.qty
      productSales[key].revenue += item.price * item.qty
    })
  })
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue)
  const PROD_PER_PAGE = 5
  const prodTotalPages = Math.max(1, Math.ceil(topProducts.length / PROD_PER_PAGE))
  const pagedTopProducts = topProducts.slice((prodPage - 1) * PROD_PER_PAGE, prodPage * PROD_PER_PAGE)

  // Category breakdown
  const catSales: Record<string, { count: number; revenue: number }> = {}
  const productCategoryMap: Record<string, string> = {}
  products.forEach((p) => { productCategoryMap[p.name.toLowerCase()] = p.category })
  salesOrders.forEach((o) => {
    o.items.forEach((item) => {
      const category = productCategoryMap[item.name.toLowerCase()] || "Other"
      if (!catSales[category]) catSales[category] = { count: 0, revenue: 0 }
      catSales[category].count += item.qty
      catSales[category].revenue += item.price * item.qty
    })
  })
  const totalCatSold = Object.values(catSales).reduce((s, c) => s + c.count, 0) || 1
  const topCategories = Object.entries(catSales)
    .map(([name, data]) => ({ name, sold: data.count, revenue: data.revenue, percentage: Math.round((data.count / totalCatSold) * 100) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  // Recent activity
  const recentActivity = orders
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((o) => {
      const statusAction = o.status === "pending" ? "New order" : o.status === "dispatched" ? "Order dispatched" : o.status === "delivered" ? "Order delivered" : `Order ${o.status}`
      return { action: statusAction, detail: `${o.orderNo} by ${o.customer} - ${formatPrice(o.total)}`, time: getTimeAgo(new Date(o.date)) }
    })
  const ACT_PER_PAGE = 5
  const actTotalPages = Math.max(1, Math.ceil(recentActivity.length / ACT_PER_PAGE))
  const pagedActivity = recentActivity.slice((activityPage - 1) * ACT_PER_PAGE, activityPage * ACT_PER_PAGE)

  // Clicks pagination
  const CLICK_PER_PAGE = 10
  const topClicks = analytics?.topClicks || []
  const clickTotalPages = Math.max(1, Math.ceil(topClicks.length / CLICK_PER_PAGE))
  const pagedClicks = topClicks.slice((clickPage - 1) * CLICK_PER_PAGE, clickPage * CLICK_PER_PAGE)

  return (
    <AdminShell title="Analytics">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive store performance &amp; visitor tracking — last 30 days.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-border p-5 rounded-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {stat.up ? <ArrowUpRight className="h-3 w-3 text-foreground" /> : <ArrowDownRight className="h-3 w-3 text-muted-foreground" />}
                <span className={`text-xs ${stat.up ? "text-foreground" : "text-muted-foreground"}`}>{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live">Live Visitors</TabsTrigger>
            <TabsTrigger value="traffic">Website Traffic</TabsTrigger>
            <TabsTrigger value="searches">Searches</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="sales">Sales & Orders</TabsTrigger>
            <TabsTrigger value="bots">Bot Detection</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned Checkouts</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <TrafficTrendChart viewsByDay={analytics?.viewsByDay || []} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TopPagesCard pages={analytics?.topPagesByEngagement || []} />
              <TopCitiesCard cities={analytics?.topCities || []} />
              <TopReferrersCard referrers={analytics?.referrers || []} />
            </div>

            <RecentVisitorsTable visitors={analytics?.recentVisitors || []} />
          </TabsContent>

          {/* ===== LIVE HEAT MAP TAB ===== */}
          <TabsContent value="live" className="mt-6 space-y-6">
            <LiveVisitorHeatmap
              live={analytics?.liveHeatmap}
              realTimeUsers={realTimeUsers}
            />
          </TabsContent>

          {/* ===== SEARCHES TAB ===== */}
          <TabsContent value="searches" className="mt-6 space-y-6">
            <SearchAnalytics searches={analytics?.searches} />
          </TabsContent>

          {/* ===== WEBSITE TRAFFIC TAB ===== */}
          <TabsContent value="traffic" className="mt-6 space-y-6">
            <DailyViewsChart viewsByDay={analytics?.viewsByDay || []} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Top Pages (Real Visitors)</h2>
                </div>
                <div className="divide-y divide-border">
                  {(analytics?.topPages || []).length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">No page data yet</div>
                  ) : (analytics?.topPages || []).map((p, i) => (
                    <div key={p.page} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm truncate max-w-[200px]">{p.page}</span>
                      </div>
                      <span className="text-sm font-medium">{p.count} views</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page Retention */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Page Retention (Avg. Time)</h2>
                </div>
                <div className="divide-y divide-border">
                  {(analytics?.pageRetention || []).length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">No retention data yet</div>
                  ) : (analytics?.pageRetention || []).map((p, i) => (
                    <div key={p.page} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm truncate max-w-[180px]">{p.page}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatDuration(p.avgDuration)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({p.views} views)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Traffic Channels (Google Analytics-style) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Traffic Channels</h2>
                </div>
                <div className="p-5 space-y-3">
                  {(analytics?.trafficChannels || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No channel data yet</p>
                  ) : (analytics?.trafficChannels || []).map((ch) => {
                    const ChannelIcon = ch.channel === "Organic Search" ? Search
                      : ch.channel === "Social" ? Share2
                      : ch.channel === "Email" ? Mail
                      : ch.channel === "Paid Search" ? Megaphone
                      : ch.channel === "Direct" ? Link2
                      : Globe
                    return (
                      <div key={ch.channel}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2"><ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" /> {ch.channel}</span>
                          <span className="text-xs text-muted-foreground">{ch.percentage}% ({ch.count})</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: `${ch.percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* New vs Returning Visitors */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Users className="h-3.5 w-3.5" /> New vs Returning Visitors</h2>
                </div>
                <div className="p-5">
                  <div className="h-8 bg-secondary rounded-full overflow-hidden flex mb-4">
                    <div className="bg-foreground/80 h-full transition-all flex items-center justify-center" style={{ width: `${analytics?.newVsReturning?.newPercentage || 100}%` }}>
                      {(analytics?.newVsReturning?.newPercentage || 0) > 15 && (
                        <span className="text-[10px] text-background font-medium">{analytics?.newVsReturning?.newPercentage}% New</span>
                      )}
                    </div>
                    <div className="bg-foreground/30 h-full transition-all flex items-center justify-center" style={{ width: `${analytics?.newVsReturning?.returningPercentage || 0}%` }}>
                      {(analytics?.newVsReturning?.returningPercentage || 0) > 15 && (
                        <span className="text-[10px] text-foreground font-medium">{analytics?.newVsReturning?.returningPercentage}% Returning</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border border-border rounded-sm">
                      <UserPlus className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{analytics?.newVsReturning?.new || 0}</p>
                      <p className="text-xs text-muted-foreground">New Visitors</p>
                    </div>
                    <div className="text-center p-3 border border-border rounded-sm">
                      <UserCheck className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-lg font-bold">{analytics?.newVsReturning?.returning || 0}</p>
                      <p className="text-xs text-muted-foreground">Returning Visitors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Referrer Details — hostname, landing page breakdown, and
                search-engine query terms where available. */}
            <div className="border border-border rounded-sm">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Where Visitors Came From</h2>
                <span className="text-[11px] text-muted-foreground">Host · landing page · search query</span>
              </div>
              <div className="divide-y divide-border">
                {(analytics?.referrers || []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">No referrer data yet</div>
                ) : (analytics?.referrers || []).map((r, i) => (
                  <div key={r.source} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        <span className="text-sm truncate">
                          {r.source}
                          {r.isSearchEngine && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                              <Search className="h-3 w-3" /> Search
                            </span>
                          )}
                          {r.isSocial && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-white bg-[#00843D] px-1.5 py-0.5 rounded-sm">
                              <Share2 className="h-3 w-3" /> Social
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-sm font-medium shrink-0">{r.count} visits</span>
                    </div>
                    {(r.topPages?.length > 0 || r.topSearchTerms?.length > 0) && (
                      <div className="mt-2 ml-8 space-y-1">
                        {r.topPages?.slice(0, 3).map((p) => (
                          <div key={`p-${p.page}`} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted-foreground truncate">→ {p.page}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{p.count}</span>
                          </div>
                        ))}
                        {r.topSearchTerms?.slice(0, 3).map((t) => (
                          <div key={`t-${t.term}`} className="flex items-center justify-between gap-3">
                            <span className="text-xs text-foreground/80 truncate">“{t.term}”</span>
                            <span className="text-xs text-muted-foreground shrink-0">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Search engine keyword roll-up — aggregates the search terms
                extracted from referrer URLs across every search engine. */}
            {(analytics?.searchEngineReferrers || []).some((s) => s.topTerms.length > 0) && (
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Search className="h-3.5 w-3.5" /> Search Engine Keywords (Organic Discovery)</h2>
                </div>
                <div className="divide-y divide-border">
                  {analytics!.searchEngineReferrers.map((s) => (
                    <div key={`se-${s.source}`} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{s.source}</span>
                        <span className="text-xs text-muted-foreground">{s.count} visits</span>
                      </div>
                      {s.topTerms.length === 0 ? (
                        <p className="text-xs text-muted-foreground ml-0">Queries hidden by search engine (encrypted).</p>
                      ) : (
                        <div className="space-y-1">
                          {s.topTerms.map((t) => (
                            <div key={`se-t-${s.source}-${t.term}`} className="flex items-center justify-between">
                              <span className="text-xs text-foreground/80 truncate">“{t.term}”</span>
                              <span className="text-xs text-muted-foreground">{t.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* UTM Campaigns */}
            {(analytics?.utmCampaigns || []).length > 0 && (
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" /> Active Campaigns (UTM)</h2>
                </div>
                <div className="divide-y divide-border">
                  {analytics!.utmCampaigns.map((c, i) => (
                    <div key={c.campaign} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium">{c.campaign}</p>
                          <p className="text-xs text-muted-foreground">{c.source}{c.medium ? ` / ${c.medium}` : ""}</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{c.views} views</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Devices */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold">Devices</h2>
                </div>
                <div className="p-5 space-y-3">
                  {(analytics?.devices || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No data</p>
                  ) : (analytics?.devices || []).map((d) => {
                    const DevIcon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor
                    return (
                      <div key={d.device}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm flex items-center gap-2 capitalize"><DevIcon className="h-3.5 w-3.5 text-muted-foreground" /> {d.device}</span>
                          <span className="text-xs text-muted-foreground">{d.percentage}% ({d.count})</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: `${d.percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Browsers */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold">Browsers</h2>
                </div>
                <div className="p-5 space-y-3">
                  {(analytics?.browsers || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No data</p>
                  ) : (analytics?.browsers || []).map((b) => (
                    <div key={b.browser}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{b.browser}</span>
                        <span className="text-xs text-muted-foreground">{b.percentage}% ({b.count})</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-foreground rounded-full" style={{ width: `${b.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Countries */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold">Countries</h2>
                </div>
                <div className="p-5 space-y-3">
                  {(analytics?.countries || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No data</p>
                  ) : (analytics?.countries || []).map((c) => (
                    <div key={c.country}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{c.countryName || c.country}</span>
                        <span className="text-xs text-muted-foreground">{c.percentage}% ({c.count})</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-foreground rounded-full" style={{ width: `${c.percentage}%` }} />
                      </div>
                      {c.topCities && c.topCities.length > 0 && (
                        <div className="mt-1 pl-3 flex flex-wrap gap-1">
                          {c.topCities.map(city => (
                            <span key={city.city} className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              {city.city} ({city.count})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Languages className="h-3.5 w-3.5" /> Languages</h2>
                </div>
                <div className="p-5 space-y-3">
                  {(analytics?.languages || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No data yet</p>
                  ) : (analytics?.languages || []).map((l) => (
                    <div key={l.language}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm uppercase">{l.language}</span>
                        <span className="text-xs text-muted-foreground">{l.percentage}% ({l.count})</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-foreground rounded-full" style={{ width: `${l.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== ENGAGEMENT TAB ===== */}
          <TabsContent value="engagement" className="mt-6 space-y-6">
            {/* Engagement Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <MousePointerClick className="h-3.5 w-3.5" /> Total Clicks
                </div>
                <p className="text-2xl font-bold">{analytics?.totalClicks || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Button & link interactions</p>
              </div>
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <ScrollText className="h-3.5 w-3.5" /> Avg Scroll Depth
                </div>
                <p className="text-2xl font-bold">{analytics?.avgScrollDepth || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">How far visitors scroll</p>
              </div>
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <BarChart3 className="h-3.5 w-3.5" /> Bounce Rate
                </div>
                <p className="text-2xl font-bold">{analytics?.bounceRate || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Single-page sessions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clicked Elements */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <MousePointerClick className="h-3.5 w-3.5" /> Most Clicked Elements
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {pagedClicks.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">No click data yet</div>
                  ) : pagedClicks.map((c, i) => (
                    <div key={`${c.target}-${i}`} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground w-5 flex-shrink-0">{(clickPage - 1) * CLICK_PER_PAGE + i + 1}.</span>
                        <span className="text-sm truncate">{c.target}</span>
                      </div>
                      <span className="text-sm font-medium flex-shrink-0 ml-2">{c.count}</span>
                    </div>
                  ))}
                </div>
                {clickTotalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-secondary/30">
                    <span className="text-[11px] text-muted-foreground">{clickPage}/{clickTotalPages}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={clickPage === 1} onClick={() => setClickPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={clickPage === clickTotalPages} onClick={() => setClickPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Clicks by Page */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5" /> Clicks by Page
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {(analytics?.clicksByPage || []).length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">No data yet</div>
                  ) : (analytics?.clicksByPage || []).map((p, i) => (
                    <div key={p.page} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm truncate max-w-[200px]">{p.page}</span>
                      </div>
                      <span className="text-sm font-medium">{p.count} clicks</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== SALES & ORDERS TAB ===== */}
          <TabsContent value="sales" className="mt-6 space-y-6">
            {/* Revenue Chart */}
            <div className="border border-border rounded-sm p-6">
              <h2 className="text-sm font-semibold mb-6">Monthly Revenue</h2>
              <div className="flex items-end gap-3 h-48">
                {revenueByMonth.map((r) => (
                  <div key={r.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{formatPrice(r.value)}</span>
                    <div className="w-full bg-foreground rounded-t-sm transition-all" style={{ height: `${(r.value / maxRevenue) * 100}%` }} />
                    <span className="text-xs text-muted-foreground">{r.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold">Top Selling Products</h2>
                </div>
                <div className="divide-y divide-border">
                  {pagedTopProducts.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">No sales data yet</div>
                  ) : pagedTopProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5">{(prodPage - 1) * PROD_PER_PAGE + i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sold} sold</p>
                        </div>
                      </div>
                      <span className="text-sm font-medium">{formatPrice(p.revenue)}</span>
                    </div>
                  ))}
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

              {/* Sales by Category */}
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold">Sales by Category</h2>
                </div>
                <div className="p-5 space-y-4">
                  {topCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No sales data yet</p>
                  )}
                  {topCategories.map((c) => (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.sold} sold -- {formatPrice(c.revenue)} ({c.percentage}%)</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="border border-border rounded-sm">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Recent Activity</h2>
              </div>
              <div className="divide-y divide-border">
                {pagedActivity.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">No recent activity</div>
                ) : pagedActivity.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
              {actTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-secondary/30">
                  <span className="text-[11px] text-muted-foreground">Page {activityPage}/{actTotalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={activityPage === 1} onClick={() => setActivityPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={activityPage === actTotalPages} onClick={() => setActivityPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== BOT DETECTION TAB ===== */}
          <TabsContent value="bots" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Real Visitors
                </div>
                <p className="text-2xl font-bold">{analytics?.humanViewCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Verified human traffic</p>
              </div>
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <Bot className="h-3.5 w-3.5" /> Bot Visits
                </div>
                <p className="text-2xl font-bold">{analytics?.botViewCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Detected automated traffic</p>
              </div>
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <BarChart3 className="h-3.5 w-3.5" /> Bot Percentage
                </div>
                <p className="text-2xl font-bold">{analytics?.botTraffic.percentage || 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Of total traffic is automated</p>
              </div>
            </div>

            {/* Human vs Bot Daily Chart */}
            <BotVsHumanChart viewsByDay={analytics?.viewsByDay || []} />

            <div className="border border-border rounded-sm p-6">
              <h2 className="text-sm font-semibold mb-4">Bot Detection Methods</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">User Agent Analysis</p>
                    <p className="text-xs text-muted-foreground">Detects known bot signatures: crawlers, scrapers, headless browsers (Puppeteer, Selenium, Playwright)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Browser Fingerprinting</p>
                    <p className="text-xs text-muted-foreground">Checks for WebDriver flag, missing plugins, and other headless browser indicators</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Rate Limiting</p>
                    <p className="text-xs text-muted-foreground">Excessive requests from a single IP are throttled (60 views/min limit)</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ===== ABANDONED CHECKOUTS TAB ===== */}
          <TabsContent value="abandoned" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <ShoppingCart className="h-3.5 w-3.5" /> Abandoned Carts
                </div>
                <p className="text-2xl font-bold">{analytics?.abandonedCheckouts.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Incomplete checkouts</p>
              </div>
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <DollarSign className="h-3.5 w-3.5" /> Lost Revenue
                </div>
                <p className="text-2xl font-bold">{formatPrice(analytics?.abandonedCheckouts.value || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Potential revenue left behind</p>
              </div>
              <div className="border border-border p-5 rounded-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <TrendingUp className="h-3.5 w-3.5" /> Recovered
                </div>
                <p className="text-2xl font-bold">{analytics?.abandonedCheckouts.recovered || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed after abandoning</p>
              </div>
            </div>

            {/* Abandonment by Reason */}
            {analytics?.abandonedCheckouts.byReason && Object.keys(analytics.abandonedCheckouts.byReason).length > 0 && (
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Why Carts Were Abandoned
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  {Object.entries(analytics.abandonedCheckouts.byReason)
                    .sort((a, b) => b[1] - a[1])
                    .map(([reason, count]) => {
                      const pct = Math.round((count / Math.max(analytics.abandonedCheckouts.total, 1)) * 100)
                      const label = reason === "payment_failed" ? "Payment failed"
                        : reason === "payment_abandoned" ? "Opened payment, never confirmed"
                        : reason === "closed_with_items" ? "Added items, closed site"
                        : reason === "checkout_abandoned" ? "Left checkout page"
                        : reason === "stopped_midway" ? "Stopped mid-checkout"
                        : reason === "unknown" ? "Unknown"
                        : reason.replace(/_/g, " ")
                      return (
                        <div key={reason}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium capitalize">{label}</span>
                            <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Abandonment by Step */}
            {analytics?.abandonedCheckouts.byStep && Object.keys(analytics.abandonedCheckouts.byStep).length > 0 && (
              <div className="border border-border rounded-sm">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" /> Drop-off by Checkout Step
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  {Object.entries(analytics.abandonedCheckouts.byStep)
                    .sort((a, b) => b[1] - a[1])
                    .map(([step, count]) => {
                      const pct = Math.round((count / Math.max(analytics.abandonedCheckouts.total, 1)) * 100)
                      return (
                        <div key={step}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium capitalize">{step.replace(/_/g, " ")}</span>
                            <span className="text-xs text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-foreground rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Recent Abandoned */}
            <div className="border border-border rounded-sm">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">Recent Abandoned Checkouts</h2>
              </div>
              <div className="divide-y divide-border">
                {(analytics?.abandonedCheckouts.recent || []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">No abandoned checkouts yet</div>
                ) : (analytics?.abandonedCheckouts.recent || []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{a.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(a.items) ? a.items.length : 0} item(s) - Step: {a.stepReached}
                        {a.reason && ` - ${a.reason.replace(/_/g, " ")}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatPrice(a.subtotal)}</p>
                      <p className={`text-xs ${a.recovered ? "text-green-600" : "text-muted-foreground"}`}>
                        {a.recovered ? "Recovered" : getTimeAgo(new Date(a.createdAt))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

// ===== Sub-components =====

function DailyViewsChart({ viewsByDay }: { viewsByDay: { date: string; count: number; human: number; bot: number; clicks: number }[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxViews = Math.max(...viewsByDay.map((v) => v.count), 1)
  const totalViews = viewsByDay.reduce((s, d) => s + d.count, 0)
  const totalHuman = viewsByDay.reduce((s, d) => s + (d.human || 0), 0)

  if (viewsByDay.length === 0 || totalViews === 0) {
    return (
      <div className="border border-border rounded-sm p-6">
        <h2 className="text-sm font-semibold mb-6">Daily Page Views (Last 30 Days)</h2>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No traffic data yet. Views will appear as visitors browse your site.
        </div>
      </div>
    )
  }

  const labelInterval = Math.max(1, Math.ceil(viewsByDay.length / 7))

  return (
    <div className="border border-border rounded-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold">Daily Page Views (Last 30 Days)</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{totalHuman} real &middot; {totalViews - totalHuman} bot</span>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
            <div key={pct} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-7 text-right flex-shrink-0">{Math.round(maxViews * pct)}</span>
              <div className="flex-1 border-b border-border/40" />
            </div>
          ))}
        </div>

        <div className="flex items-end gap-[2px] h-48 pl-9 relative">
          {viewsByDay.map((d, i) => {
            const humanPct = (d.human / maxViews) * 100
            const botPct = (d.bot / maxViews) * 100
            const isHovered = hoveredIndex === i
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {isHovered && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded-sm whitespace-nowrap z-10 shadow-lg">
                    {new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}: {d.human} real, {d.bot} bot
                  </div>
                )}
                <div className="w-full flex flex-col items-stretch">
                  {d.bot > 0 && (
                    <div
                      className="w-full bg-foreground/25 transition-all"
                      style={{ height: `${botPct}%`, minHeight: "1px" }}
                    />
                  )}
                  <div
                    className={`w-full rounded-t-sm transition-all ${isHovered ? "bg-foreground" : "bg-foreground/70"}`}
                    style={{ height: `${humanPct}%`, minHeight: d.human > 0 ? "3px" : "1px" }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex pl-9 mt-2">
          {viewsByDay.map((d, i) => (
            <div key={d.date} className="flex-1 text-center">
              {i % labelInterval === 0 && (
                <span className="text-[9px] text-muted-foreground">{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-foreground/70 rounded-sm" /> Real visitors</div>
        <div className="flex items-center gap-1"><div className="w-3 h-2 bg-foreground/25 rounded-sm" /> Bot traffic</div>
      </div>
    </div>
  )
}

function BotVsHumanChart({ viewsByDay }: { viewsByDay: { date: string; count: number; human: number; bot: number; clicks: number }[] }) {
  const totalHuman = viewsByDay.reduce((s, d) => s + (d.human || 0), 0)
  const totalBot = viewsByDay.reduce((s, d) => s + (d.bot || 0), 0)
  const total = totalHuman + totalBot || 1
  const humanPct = Math.round((totalHuman / total) * 100)
  const botPct = 100 - humanPct

  return (
    <div className="border border-border rounded-sm p-6">
      <h2 className="text-sm font-semibold mb-4">Human vs Bot Traffic Distribution</h2>
      <div className="h-8 bg-secondary rounded-full overflow-hidden flex">
        <div className="bg-foreground/80 h-full transition-all flex items-center justify-center" style={{ width: `${humanPct}%` }}>
          {humanPct > 10 && <span className="text-[10px] text-background font-medium">{humanPct}% Real</span>}
        </div>
        <div className="bg-foreground/20 h-full transition-all flex items-center justify-center" style={{ width: `${botPct}%` }}>
          {botPct > 10 && <span className="text-[10px] text-foreground font-medium">{botPct}% Bot</span>}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{totalHuman.toLocaleString()} real visitors</span>
        <span>{totalBot.toLocaleString()} bot visits</span>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

// ===== Live Visitor Heat Map =====

function LiveVisitorHeatmap({
  live,
  realTimeUsers,
}: {
  live?: AnalyticsData["liveHeatmap"]
  realTimeUsers: number
}) {
  const cells = live?.cells || []
  const byCountry = live?.byCountry || []
  const currently = live?.currentlyViewing || []
  const minutes = live?.activityByMinute || []
  const activeNow = live?.activeVisitors ?? realTimeUsers
  const windowMinutes = live?.windowMinutes || 15
  const maxVisitors = Math.max(1, ...cells.map((c) => c.visitors))
  const maxMinute = Math.max(1, ...minutes.map((m) => m.visitors))
  const peakMinute = minutes.reduce((acc, m) => (m.visitors > acc.visitors ? m : acc), { minute: "—", visitors: 0 })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Radar className="h-3.5 w-3.5 animate-pulse text-[#00843D]" /> Live Now
          </div>
          <p className="text-2xl font-bold">{realTimeUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">Active in last 5 min</p>
        </div>
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Users className="h-3.5 w-3.5" /> Visitors ({windowMinutes}m)
          </div>
          <p className="text-2xl font-bold">{activeNow}</p>
          <p className="text-xs text-muted-foreground mt-1">Unique sessions — rolling window</p>
        </div>
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Globe className="h-3.5 w-3.5" /> Locations lit up
          </div>
          <p className="text-2xl font-bold">{cells.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Cities with live traffic</p>
        </div>
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Flame className="h-3.5 w-3.5 text-orange-500" /> Peak minute
          </div>
          <p className="text-2xl font-bold">{peakMinute.visitors}</p>
          <p className="text-xs text-muted-foreground mt-1">Busiest minute ({peakMinute.minute})</p>
        </div>
      </div>

      {/* Activity over last N minutes */}
      <div className="border border-border rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> Active Visitors — Last {windowMinutes} minutes
          </h2>
          <span className="text-[10px] text-muted-foreground">Auto-refreshes every 30s</span>
        </div>
        <div className="flex items-end gap-1 h-32">
          {minutes.length === 0 ? (
            <div className="flex-1 text-center text-xs text-muted-foreground py-10">Waiting for live traffic…</div>
          ) : minutes.map((m, i) => {
            const h = Math.max(2, Math.round((m.visitors / maxMinute) * 100))
            return (
              <div key={`${m.minute}-${i}`} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">{m.visitors}</span>
                <div
                  className={`w-full rounded-t-sm transition-all ${m.visitors === 0 ? "bg-secondary" : "bg-gradient-to-t from-[#00843D] to-[#00c961]"}`}
                  style={{ height: `${h}%` }}
                  title={`${m.minute} — ${m.visitors} visitors`}
                />
                {i % 3 === 0 && <span className="text-[9px] text-muted-foreground">{m.minute}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Heat map grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border border-border rounded-sm lg:col-span-2">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> Live Heat Map — Cities
            </h2>
            <span className="text-[10px] text-muted-foreground">Darker = more visitors</span>
          </div>
          <div className="p-4">
            {cells.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No live visitors yet. As shoppers browse, their city will light up here.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {cells.map((cell, i) => {
                  const intensity = cell.visitors / maxVisitors
                  // Shade from subtle to fiery
                  const bg = `rgba(234, 88, 12, ${(0.12 + intensity * 0.8).toFixed(2)})`
                  const border = `rgba(234, 88, 12, ${(0.3 + intensity * 0.6).toFixed(2)})`
                  return (
                    <div
                      key={`${cell.country}-${cell.city}-${i}`}
                      className="rounded-sm p-3 border transition-transform hover:scale-[1.02]"
                      style={{ backgroundColor: bg, borderColor: border }}
                      title={`${cell.city}, ${cell.countryName} — ${cell.visitors} visitors, ${cell.views} views`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wide text-foreground/70">{cell.country}</span>
                        <span className="text-xs font-bold text-foreground">{cell.visitors}</span>
                      </div>
                      <p className="text-sm font-medium truncate text-foreground">{cell.city}</p>
                      <p className="text-[10px] text-foreground/70 truncate">{cell.countryName}</p>
                      <p className="text-[10px] text-foreground/60 mt-1">{cell.views} view{cell.views === 1 ? "" : "s"}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-border rounded-sm">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" /> Top Countries — Live
              </h2>
            </div>
            <div className="divide-y divide-border">
              {byCountry.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No live data</div>
              ) : byCountry.map((c) => (
                <div key={c.country} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase text-muted-foreground w-6">{c.country}</span>
                    <span className="text-sm truncate">{c.countryName}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{c.visitors}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-sm">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> Currently viewing
              </h2>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {currently.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">No one on the site right now</div>
              ) : currently.map((p) => (
                <div key={p.page} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-xs truncate max-w-[200px]">{p.page}</span>
                  <span className="text-xs text-muted-foreground">{p.visitors} visitor{p.visitors === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Search Analytics =====

function SearchAnalytics({ searches }: { searches?: AnalyticsData["searches"] }) {
  const total = searches?.total || 0
  const top = searches?.top || []
  const byDay = searches?.byDay || []
  const maxCount = Math.max(1, ...top.map((t) => t.count))
  const maxDay = Math.max(1, ...byDay.map((d) => d.count))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Search className="h-3.5 w-3.5" /> Total searches
          </div>
          <p className="text-2xl font-bold">{total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Across the selected period</p>
        </div>
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Unique terms
          </div>
          <p className="text-2xl font-bold">{top.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Distinct queries tracked</p>
        </div>
        <div className="border border-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
            <Flame className="h-3.5 w-3.5 text-orange-500" /> Hottest term
          </div>
          <p className="text-2xl font-bold truncate">{top[0]?.term || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {top[0] ? `${top[0].count} searches · ${top[0].uniqueVisitors} visitor${top[0].uniqueVisitors === 1 ? "" : "s"}` : "No searches yet"}
          </p>
        </div>
      </div>

      <div className="border border-border rounded-sm p-6">
        <h2 className="text-sm font-semibold mb-4">Searches per day</h2>
        {byDay.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Once shoppers start using the search bar, we&apos;ll chart the volume here.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {byDay.map((d) => {
              const h = d.count === 0 ? 2 : Math.max(4, Math.round((d.count / maxDay) * 100))
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.count}
                  </span>
                  <div
                    className={`w-full rounded-t-sm transition-colors ${d.count === 0 ? "bg-secondary" : "bg-foreground"}`}
                    style={{ height: `${h}%` }}
                    title={`${d.date} — ${d.count} searches`}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border border-border rounded-sm">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-orange-500" /> Most commonly searched terms
          </h2>
        </div>
        <div className="divide-y divide-border">
          {top.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No search data yet. Tip: search is tracked for every query typed in the navbar.
            </div>
          ) : top.map((t, i) => {
            const pct = Math.round((t.count / maxCount) * 100)
            return (
              <div key={t.term} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-sm font-medium truncate">&ldquo;{t.term}&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{t.uniqueVisitors} visitor{t.uniqueVisitors === 1 ? "" : "s"}</span>
                    <span className="text-sm font-semibold tabular-nums w-10 text-right">{t.count}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Last searched {getTimeAgo(new Date(t.lastSeen))}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===== Overview: Daily Traffic Trend (views + clicks) =====

function TrafficTrendChart({ viewsByDay }: { viewsByDay: AnalyticsData["viewsByDay"] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxViews = Math.max(1, ...viewsByDay.map((v) => v.human))
  const maxClicks = Math.max(1, ...viewsByDay.map((v) => v.clicks))
  const totalViews = viewsByDay.reduce((s, d) => s + d.human, 0)
  const totalClicks = viewsByDay.reduce((s, d) => s + d.clicks, 0)

  if (viewsByDay.length === 0 || (totalViews === 0 && totalClicks === 0)) {
    return (
      <div className="border border-border rounded-sm p-6">
        <h2 className="text-sm font-semibold mb-6">Daily traffic — views &amp; clicks</h2>
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No traffic yet. Views and clicks will appear as visitors interact with your site.
        </div>
      </div>
    )
  }

  // Pre-compute a smoothed SVG polyline for clicks (scaled to viewBox 1000x100)
  const step = viewsByDay.length > 1 ? 1000 / (viewsByDay.length - 1) : 0
  const clickPoints = viewsByDay.map((d, i) => {
    const x = i * step
    const y = 100 - (d.clicks / maxClicks) * 90
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
  const clickArea = `0,100 ${clickPoints} 1000,100`

  const labelInterval = Math.max(1, Math.ceil(viewsByDay.length / 7))
  const peakDay = viewsByDay.reduce((acc, d) => d.human > acc.human ? d : acc, viewsByDay[0])

  return (
    <div className="border border-border rounded-sm p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold">Daily traffic trend</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Views &amp; clicks over the last {viewsByDay.length} days</p>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-foreground/70" />
            <span className="text-muted-foreground">Views</span>
            <span className="font-semibold tabular-nums">{totalViews.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00843D]" />
            <span className="text-muted-foreground">Clicks</span>
            <span className="font-semibold tabular-nums">{totalClicks.toLocaleString()}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Peak {peakDay.human} on {new Date(peakDay.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </div>
        </div>
      </div>

      <div className="relative pl-9">
        <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-between pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
            <span key={pct} className="text-[9px] text-muted-foreground text-right">{Math.round(maxViews * pct)}</span>
          ))}
        </div>

        <div className="relative h-48">
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-b border-border/40" />
            ))}
          </div>

          {/* Bars: human views */}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {viewsByDay.map((d, i) => {
              const pct = (d.human / maxViews) * 100
              const isHovered = hoveredIndex === i
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {isHovered && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1.5 rounded-sm whitespace-nowrap z-20 shadow-lg">
                      <div className="font-medium">{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</div>
                      <div>{d.human} views · {d.clicks} clicks</div>
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t-sm transition-all ${isHovered ? "bg-foreground" : "bg-foreground/65"}`}
                    style={{ height: `${pct}%`, minHeight: d.human > 0 ? "3px" : "1px" }}
                  />
                </div>
              )
            })}
          </div>

          {/* Clicks overlay line (SVG, spans full width over bars) */}
          {totalClicks > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="clicksFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00843D" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#00843D" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={clickArea} fill="url(#clicksFill)" />
              <polyline
                points={clickPoints}
                fill="none"
                stroke="#00843D"
                strokeWidth="1.6"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <div className="flex mt-2">
          {viewsByDay.map((d, i) => (
            <div key={d.date} className="flex-1 text-center">
              {i % labelInterval === 0 && (
                <span className="text-[9px] text-muted-foreground">{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== Overview: Top Pages (views + clicks) =====

function TopPagesCard({ pages }: { pages: AnalyticsData["topPagesByEngagement"] }) {
  const maxTotal = Math.max(1, ...pages.map((p) => p.total))
  return (
    <div className="border border-border rounded-sm">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-3.5 w-3.5" /> Top pages
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Views · clicks</span>
      </div>
      <div className="divide-y divide-border">
        {pages.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No page data yet</div>
        ) : pages.map((p, i) => {
          const viewsPct = (p.views / maxTotal) * 100
          const clicksPct = (p.clicks / maxTotal) * 100
          return (
            <div key={p.page} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">{i + 1}.</span>
                  <span className="text-sm font-medium truncate">{p.page}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                  <span className="text-muted-foreground">{p.views}v</span>
                  <span className="text-[#00843D]">{p.clicks}c</span>
                </div>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex gap-px">
                <div className="h-full bg-foreground/70 rounded-l-full" style={{ width: `${viewsPct}%` }} />
                <div className="h-full bg-[#00843D] rounded-r-full" style={{ width: `${clicksPct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== Overview: Top Cities =====

function TopCitiesCard({ cities }: { cities: AnalyticsData["topCities"] }) {
  return (
    <div className="border border-border rounded-sm">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" /> Top cities
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Real visitors</span>
      </div>
      <div className="divide-y divide-border">
        {cities.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No geographic data yet</div>
        ) : cities.map((c, i) => (
          <div key={`${c.country}-${c.city}`} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.city}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.countryName || c.country}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{c.count}</p>
                <p className="text-[10px] text-muted-foreground">{c.percentage}%</p>
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00843D] to-[#00c961] rounded-full" style={{ width: `${Math.min(100, c.percentage)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===== Overview: Top Referrers =====

function TopReferrersCard({ referrers }: { referrers: AnalyticsData["referrers"] }) {
  const top = referrers.slice(0, 10)
  const max = Math.max(1, ...top.map((r) => r.count))
  return (
    <div className="border border-border rounded-sm">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" /> Top referrers
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Source</span>
      </div>
      <div className="divide-y divide-border">
        {top.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No referrer data yet</div>
        ) : top.map((r, i) => {
          const pct = (r.count / max) * 100
          return (
            <div key={r.source} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">{i + 1}.</span>
                  <span className="text-sm font-medium truncate">{r.source}</span>
                  {r.isSearchEngine && (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm shrink-0">
                      Search
                    </span>
                  )}
                  {r.isSocial && (
                    <span className="text-[9px] uppercase tracking-wider text-white bg-[#00843D] px-1.5 py-0.5 rounded-sm shrink-0 inline-flex items-center gap-1">
                      <Share2 className="h-2.5 w-2.5" /> Social
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">{r.count}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${r.isSearchEngine ? "bg-[#00843D]" : r.isSocial ? "bg-[#E1306C]" : "bg-foreground/70"}`} style={{ width: `${pct}%` }} />
              </div>
              {r.topPages?.[0] && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  Lands on <span className="text-foreground/80">{r.topPages[0].page}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== Overview: Recent Visitors =====

function RecentVisitorsTable({ visitors }: { visitors: AnalyticsData["recentVisitors"] }) {
  const PER_PAGE = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(visitors.length / PER_PAGE))
  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [totalPages, page])
  const start = (page - 1) * PER_PAGE
  const pagedVisitors = visitors.slice(start, start + PER_PAGE)
  const rangeStart = visitors.length === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + PER_PAGE, visitors.length)
  return (
    <div className="border border-border rounded-sm">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Recent visitors &amp; pages accessed
        </h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Last {visitors.length} sessions
        </span>
      </div>
      {visitors.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">
          No recent visitor sessions yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <th className="px-5 py-2.5 text-left font-medium">When</th>
                <th className="px-3 py-2.5 text-left font-medium">Location</th>
                <th className="px-3 py-2.5 text-left font-medium">Device</th>
                <th className="px-3 py-2.5 text-left font-medium">Pages accessed</th>
                <th className="px-3 py-2.5 text-left font-medium">From</th>
                <th className="px-5 py-2.5 text-right font-medium">Pages</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pagedVisitors.map((v) => {
                const DevIcon = v.device === "mobile" ? Smartphone : v.device === "tablet" ? Tablet : Monitor
                const loc = [v.city, v.countryName || v.country].filter(Boolean).join(", ") || "Unknown"
                const allPages = v.pagePaths && v.pagePaths.length > 0 ? v.pagePaths : [v.page]
                const extraPages = allPages.slice(1)
                return (
                  <tr key={v.sessionId} className="hover:bg-secondary/30 transition-colors align-top">
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {v.isReturning ? (
                          <UserCheck className="h-3.5 w-3.5 text-[#00843D] shrink-0" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs">{getTimeAgo(new Date(v.latest))}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate max-w-[160px]">{loc}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <DevIcon className="h-3 w-3 shrink-0" />
                        <span className="text-xs capitalize">{v.device}</span>
                        {v.browser && <span className="text-xs">· {v.browser}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[240px]" title={allPages.join("\n")}>
                        <span className="text-xs font-medium truncate block">{allPages[0]}</span>
                        {extraPages.length > 0 && (
                          <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
                            {extraPages.slice(0, 2).join(" · ")}
                            {extraPages.length > 2 ? ` · +${extraPages.length - 2} more` : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-muted-foreground truncate block max-w-[140px]">{v.referrerHost}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-xs font-medium">{v.pages}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-secondary/30">
              <span className="text-[11px] text-muted-foreground">
                {rangeStart}-{rangeEnd} of {visitors.length} · Page {page}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

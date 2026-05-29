"use client"

/**
 * Supplier Partner Portal — /portal/supplier
 *
 * Suppliers log in with their email + portal code (issued by admin on onboarding).
 * The session is a lightweight localStorage entry; Clerk JWT replaces it in Phase 2.
 *
 * Tabs: Overview · Products · Purchase Orders · KYC Status · Profile
 */

import { useState } from "react"
import { Link } from "wouter"
import { useCmsDoc } from "@/lib/cms-store"
import {
  getPortalSessionForType, loginPartnerLocal, signOutPartner,
  submitPartnerOrder, type PortalSession,
} from "@/lib/portal-auth"
import type { Supplier } from "@/components/admin/suppliers"
import {
  Building2, ShieldCheck, LogOut, Package, ClipboardList,
  BarChart3, User, AlertTriangle, CheckCircle2, XCircle,
  Eye, EyeOff, ArrowRight, Star, Truck, TrendingUp,
  Bell, Copy, RefreshCw, ChevronRight, ChevronLeft, Hash, Mail, Phone,
  MapPin, CreditCard, FileText, Shield, Clock, Boxes, Menu, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const WINE    = "#3D0814"
const ORANGE  = "#F97316"
const GREEN   = "#15803D"
const S_TEXT  = "rgba(255,255,255,0.88)"
const S_MUTED = "rgba(255,255,255,0.45)"
const S_BORDER= "rgba(255,255,255,0.10)"

/* ─── Login Page ─────────────────────────────────────────────── */

function SupplierLoginPage({ onLogin, error }: {
  onLogin: (email: string, code: string) => void
  error: string
}) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [showCode, setShowCode] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(email.trim().toLowerCase(), code.trim().toUpperCase())
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#faf9f8" }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: WINE }}>
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-12 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            <span className="text-white font-bold text-xl tracking-tight">Shaniid RX</span>
          </div>
          <p className="text-white/60 text-sm mt-1">Supplier Partner Portal</p>
        </div>
        <div className="space-y-8">
          {[
            { icon: Package, title: "Manage your catalog", desc: "List, update and track your pharmaceutical products on the Shaniid RX platform." },
            { icon: ClipboardList, title: "Purchase orders, live", desc: "See every PO from Shaniid RX the moment it's raised, confirm delivery timelines and manage disputes." },
            { icon: ShieldCheck, title: "Trust Seal certification", desc: "Complete your KYC to earn the Shaniid RX Trust Seal — the quality mark patients and pharmacies trust." },
            { icon: BarChart3, title: "Performance insights", desc: "On-time rate, quality scores and revenue dashboards updated daily." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <p className="text-white/40 text-xs">"If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity."</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">Supplier sign in</h1>
          <p className="text-gray-500 text-sm mb-8">
            Enter the email and portal code you received during onboarding.
          </p>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Email address</Label>
              <Input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.co.ke" className="mt-1 h-11"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Portal code</Label>
              <div className="relative mt-1">
                <Input
                  type={showCode ? "text" : "password"} required
                  value={code} onChange={e => setCode(e.target.value)}
                  placeholder="SUP-XXXX-XXXX" className="h-11 pr-10 font-mono uppercase"
                />
                <button type="button" onClick={() => setShowCode(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-white font-semibold gap-2" style={{ background: WINE }}>
              Sign in to your portal <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Don't have a portal code? Contact <a href="mailto:suppliers@shaniidrx.com" className="underline" style={{ color: WINE }}>suppliers@shaniidrx.com</a>
          </p>
          <p className="text-xs text-gray-300 text-center mt-1">
            <Link href="/admin" className="hover:text-gray-500 transition-colors">Admin portal →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────── */

function KpiCard({ icon: Icon, label, value, sub, color = WINE }: {
  icon: typeof Building2; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: WINE }}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Dashboard Shell ─────────────────────────────────────────── */

type Tab = "overview" | "products" | "orders" | "kyc" | "profile"

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "overview",  label: "Overview",         icon: BarChart3     },
  { id: "products",  label: "My Products",       icon: Boxes         },
  { id: "orders",    label: "Purchase Orders",   icon: ClipboardList },
  { id: "kyc",       label: "KYC & Trust Seal",  icon: ShieldCheck   },
  { id: "profile",   label: "My Profile",        icon: User          },
]

type SourcingRequest = {
  id: string
  productName: string
  sku?: string
  qty: number
  priority: "low" | "normal" | "high" | "urgent"
  status: "draft" | "open" | "quoting" | "ordered" | "received" | "cancelled"
  notes?: string
  createdAt: string
  updatedAt: string
}

const PRIORITY_BADGE: Record<SourcingRequest["priority"], { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#374151", bg: "#F3F4F6" },
  normal: { label: "Normal", color: "#1D4ED8", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#92400E", bg: "#FEF3C7" },
  urgent: { label: "Urgent", color: "#991B1B", bg: "#FEE2E2" },
}

const STATUS_BADGE: Record<SourcingRequest["status"], { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",    color: "#6B7280", bg: "#F9FAFB" },
  open:      { label: "Open",     color: "#065F46", bg: "#D1FAE5" },
  quoting:   { label: "Quoting",  color: "#1D4ED8", bg: "#EFF6FF" },
  ordered:   { label: "Ordered",  color: "#92400E", bg: "#FEF3C7" },
  received:  { label: "Received", color: "#065F46", bg: "#DCFCE7" },
  cancelled: { label: "Cancelled",color: "#6B7280", bg: "#F3F4F6" },
}

function SupplierDashboard({ supplier, session, onLogout }: {
  supplier: Supplier
  session: PortalSession
  onLogout: () => void
}) {
  const [tab, setTab] = useState<Tab>("overview")
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("shaniidrx.supplier.sidebar") === "collapsed" } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sourcingRequests] = useCmsDoc<SourcingRequest[]>("sourcing-requests", [])
  const [quoteModal, setQuoteModal] = useState<SourcingRequest | null>(null)
  const [quotePrice, setQuotePrice] = useState("")
  const [quoteLeadDays, setQuoteLeadDays] = useState("")
  const [quoteNotes, setQuoteNotes] = useState("")
  const [quotingId, setQuotingId] = useState<string | null>(null)
  const [quotedIds, setQuotedIds] = useState<string[]>([])

  const openRequests = (sourcingRequests ?? []).filter(r => r.status === "open" || r.status === "quoting")

  const submitQuote = async () => {
    if (!quoteModal || !quotePrice) return
    setQuotingId(quoteModal.id)
    try {
      await submitPartnerOrder("supplier", "order", {
        sourcingRequestId: quoteModal.id,
        productName: quoteModal.productName,
        sku: quoteModal.sku,
        requestedQty: quoteModal.qty,
        unitPriceKsh: Number(quotePrice),
        leadTimeDays: quoteLeadDays ? Number(quoteLeadDays) : undefined,
        notes: quoteNotes,
        supplierId: supplier.id,
        supplierName: supplier.companyName,
      })
      setQuotedIds(p => [...p, quoteModal.id])
      setQuoteModal(null)
      setQuotePrice("")
      setQuoteLeadDays("")
      setQuoteNotes("")
    } finally {
      setQuotingId(null)
    }
  }

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem("shaniidrx.supplier.sidebar", next ? "collapsed" : "expanded") } catch {}
      return next
    })
  }

  const kycDocs = [
    { key: "hasLicense",  label: "Business License" },
    { key: "hasFdaCert",  label: "FDA / KEBS Certificate" },
    { key: "hasInsurance",label: "Liability Insurance" },
  ]
  const kycPct = kycDocs.filter(d => (supplier as unknown as Record<string, unknown>)[d.key]).length / kycDocs.length * 100

  const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: "Pending Verification", color: "#92400E", bg: "#FEF3C7" },
    verified:   { label: "Verified Supplier",    color: "#065F46", bg: "#D1FAE5" },
    suspended:  { label: "Account Suspended",    color: "#991B1B", bg: "#FEE2E2" },
    blacklisted:{ label: "Account Restricted",   color: "#374151", bg: "#F3F4F6" },
  }
  const si = statusInfo[supplier.status] ?? statusInfo.pending

  return (
    <div className="min-h-screen flex" style={{ background: "#f8f7f5" }}>

      {/* ── Mobile overlay sidebar ─────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col overflow-y-auto shadow-2xl" style={{ background: WINE }}>
            <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                  <span className="font-bold text-sm" style={{ color: S_TEXT }}>Shaniid RX</span>
                </div>
                <p className="text-xs" style={{ color: S_MUTED }}>Supplier Portal</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: S_MUTED }}><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2" style={{ background: ORANGE }}>{supplier.companyName[0]}</div>
              <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{supplier.companyName}</p>
              <p className="text-xs mt-0.5" style={{ color: S_MUTED }}>{supplier.city}, {supplier.country}</p>
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: si.color, background: si.bg }}>{si.label}</span>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setTab(id); setMobileOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative hover:bg-white/10"
                  style={tab === id ? { background: "rgba(255,255,255,0.12)", color: ORANGE } : { color: S_TEXT }}>
                  {tab === id && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r" style={{ background: ORANGE }} />}
                  <Icon className="h-4 w-4 flex-shrink-0" />{label}
                </button>
              ))}
            </nav>
            <div className="px-5 py-4" style={{ borderTop: `1px solid ${S_BORDER}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: S_MUTED }}>Trust Score</span>
                <span className="text-xs font-bold" style={{ color: kycPct === 100 ? GREEN : ORANGE }}>{kycPct === 100 ? "Sealed ✓" : `${kycPct.toFixed(0)}%`}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S_BORDER }}>
                <div className="h-full rounded-full" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
              </div>
            </div>
            <div className="px-5 py-4" style={{ borderTop: `1px solid ${S_BORDER}` }}>
              <button onClick={onLogout} className="flex items-center gap-2 text-sm transition-colors hover:text-orange-400" style={{ color: S_MUTED }}>
                <LogOut className="h-4 w-4" />Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop collapsible sidebar ────────────────────────── */}
      <aside
        className="hidden md:flex flex-shrink-0 flex-col transition-all duration-200"
        style={{ width: collapsed ? 64 : 256, background: WINE, borderRight: `1px solid ${S_BORDER}` }}
      >
        <div className="flex items-center overflow-hidden" style={{ borderBottom: `1px solid ${S_BORDER}`, minHeight: 64 }}>
          {collapsed ? (
            <div className="flex-1 flex items-center justify-center py-5">
              <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
          ) : (
            <div className="flex-1 px-5 py-4">
              <div className="flex items-center gap-2 mb-0.5">
                <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                <span className="font-bold text-sm" style={{ color: S_TEXT }}>Shaniid RX</span>
              </div>
              <p className="text-xs" style={{ color: S_MUTED }}>Supplier Portal</p>
            </div>
          )}
        </div>

        {collapsed ? (
          <div className="flex items-center justify-center py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: ORANGE }}>{supplier.companyName[0]}</div>
          </div>
        ) : (
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2" style={{ background: ORANGE }}>{supplier.companyName[0]}</div>
            <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{supplier.companyName}</p>
            <p className="text-xs mt-0.5" style={{ color: S_MUTED }}>{supplier.city}, {supplier.country}</p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: si.color, background: si.bg }}>{si.label}</span>
          </div>
        )}

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} title={collapsed ? label : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all relative hover:bg-white/10 ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
              style={tab === id ? { background: "rgba(255,255,255,0.12)", color: ORANGE } : { color: S_TEXT }}>
              {tab === id && !collapsed && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r" style={{ background: ORANGE }} />}
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="px-5 py-4" style={{ borderTop: `1px solid ${S_BORDER}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: S_MUTED }}>Trust Score</span>
              <span className="text-xs font-bold" style={{ color: kycPct === 100 ? GREEN : ORANGE }}>{kycPct === 100 ? "Sealed ✓" : `${kycPct.toFixed(0)}%`}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S_BORDER }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
            </div>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${S_BORDER}` }}>
          <div className={`py-3 flex items-center ${collapsed ? "flex-col gap-2 px-2" : "px-5 justify-between"}`}>
            <button onClick={onLogout} title="Sign out" className="flex items-center gap-2 text-sm transition-colors hover:text-orange-400" style={{ color: S_MUTED }}>
              <LogOut className="h-4 w-4" />{!collapsed && <span>Sign out</span>}
            </button>
            <button onClick={toggleSidebar} title={collapsed ? "Expand" : "Collapse"}
              className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/10 transition-colors" style={{ color: S_MUTED }}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 -ml-1">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-lg text-gray-800">{TABS.find(t => t.id === tab)?.label}</h1>
              <p className="text-xs text-gray-400 mt-0.5">Welcome back, {supplier.contactPerson || supplier.companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-gray-400 font-mono">{supplier.portalCode}</span>
            {supplier.status === "pending" && (
              <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#92400E", background: "#FEF3C7" }}>
                <Clock className="h-3 w-3" /><span className="hidden sm:inline">KYC under review</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8">
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={ClipboardList} label="Active POs"       value={supplier.activePoCount}    sub="from Shaniid RX" />
                <KpiCard icon={Truck}         label="Total PO Value"   value={`KSH ${(supplier.totalPoValue / 1000).toFixed(0)}K`} color={ORANGE} />
                <KpiCard icon={TrendingUp}    label="On-Time Rate"     value={`${supplier.onTimeDeliveryRate}%`} color={GREEN} />
                <KpiCard icon={Star}          label="Quality Score"    value={`${supplier.qualityScore}/5`}      color={WINE} />
              </div>

              {/* Status banners */}
              {supplier.status === "pending" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">KYC review in progress</p>
                    <p className="text-sm text-amber-700 mt-0.5">Our team is reviewing your submitted documents. You'll receive an email once verification is complete — typically within 2 business days.</p>
                  </div>
                </div>
              )}
              {supplier.status === "verified" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Verified Shaniid RX Supplier</p>
                    <p className="text-sm text-green-700 mt-0.5">Your KYC is approved. Your products carry the Trust Seal and are eligible for all Shaniid RX channels.</p>
                  </div>
                </div>
              )}

              {/* Categories */}
              {supplier.categories.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-800 text-sm mb-3">Your supply categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {supplier.categories.map(c => (
                      <span key={c} className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize border" style={{ background: `${WINE}10`, color: WINE, borderColor: `${WINE}25` }}>
                        {c.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Quick actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: ClipboardList, label: "View POs",         action: () => setTab("orders")  },
                    { icon: Boxes,         label: "My Products",      action: () => setTab("products") },
                    { icon: ShieldCheck,   label: "KYC Status",       action: () => setTab("kyc")      },
                    { icon: User,          label: "Update Profile",   action: () => setTab("profile")  },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all text-center">
                      <Icon className="h-6 w-6" style={{ color: WINE }} />
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS ── */}
          {tab === "products" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Products you supply through the Shaniid RX platform</p>
                <Button size="sm" style={{ background: WINE }} className="text-white text-xs">+ Add Product</Button>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                <Boxes className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No products listed yet</p>
                <p className="text-sm mt-1">Your verified catalogue will appear here. Contact your account manager to add products.</p>
              </div>
            </div>
          )}

          {/* ── ORDERS / SOURCING REQUESTS ── */}
          {tab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open sourcing requests from Shaniid RX — submit a quote to win the order</p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: WINE, background: `${WINE}12` }}>
                  {openRequests.length} open
                </span>
              </div>

              {openRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No open requests right now</p>
                  <p className="text-sm mt-1">Shaniid RX posts sourcing requests here when stock needs replenishment. Check back soon.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openRequests.map(req => {
                    const pb = PRIORITY_BADGE[req.priority]
                    const sb = STATUS_BADGE[req.status]
                    const alreadyQuoted = quotedIds.includes(req.id)
                    return (
                      <div key={req.id} className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-800">{req.productName}</p>
                              {req.sku && <span className="text-xs text-gray-400 font-mono">SKU: {req.sku}</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: sb.color, background: sb.bg }}>{sb.label}</span>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: pb.color, background: pb.bg }}>{pb.label}</span>
                            </div>
                            <p className="text-sm text-gray-600">Qty requested: <strong>{req.qty.toLocaleString()} units</strong></p>
                            {req.notes && <p className="text-xs text-gray-400 mt-1">{req.notes}</p>}
                            <p className="text-xs text-gray-300 mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {alreadyQuoted ? (
                              <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: "#065F46", background: "#D1FAE5" }}>
                                <CheckCircle2 className="h-3.5 w-3.5" />Quote sent
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                className="text-white text-xs gap-1"
                                style={{ background: WINE }}
                                disabled={supplier.status !== "verified"}
                                title={supplier.status !== "verified" ? "Complete KYC to submit quotes" : undefined}
                                onClick={() => { setQuoteModal(req); setQuotePrice(""); setQuoteLeadDays(""); setQuoteNotes("") }}
                              >
                                <FileText className="h-3.5 w-3.5" />Submit quote
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── KYC ── */}
          {tab === "kyc" && (
            <div className="space-y-5 max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: kycPct === 100 ? `${GREEN}15` : `${ORANGE}15` }}>
                    <Shield className="h-7 w-7" style={{ color: kycPct === 100 ? GREEN : ORANGE }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">Trust Seal — {kycPct === 100 ? "Achieved ✓" : `${kycPct.toFixed(0)}% Complete`}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Complete all KYC documents to earn the Shaniid RX Trust Seal</p>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
                  <div className="h-full rounded-full transition-all" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
                </div>

                <div className="space-y-3">
                  {kycDocs.map(({ key, label }) => {
                    const has = (supplier as unknown as Record<string, unknown>)[key] as boolean
                    return (
                      <div key={key} className={`flex items-center gap-3 p-4 rounded-xl border ${has ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                        {has ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                        <span className={`font-medium text-sm ${has ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                        {!has && <span className="ml-auto text-xs text-gray-400">Pending submission</span>}
                      </div>
                    )
                  })}
                </div>

                {kycPct < 100 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    To submit missing documents, email them to <strong>kyc@shaniidrx.com</strong> with your portal code <strong>{supplier.portalCode}</strong> in the subject line.
                  </div>
                )}

                {supplier.kycNotes && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <strong>Reviewer note:</strong> {supplier.kycNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4">Company details</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Building2, label: "Company", value: supplier.companyName },
                    { icon: Hash,      label: "Reg. Number", value: supplier.registrationNumber || "—" },
                    { icon: Hash,      label: "Tax ID / KRA PIN", value: supplier.taxId || "—" },
                    { icon: Mail,      label: "Email", value: supplier.email },
                    { icon: Phone,     label: "Phone", value: supplier.phone || "—" },
                    { icon: MapPin,    label: "Address", value: `${supplier.address}, ${supplier.city}, ${supplier.country}` },
                    { icon: User,      label: "Contact Person", value: supplier.contactPerson || "—" },
                    { icon: CreditCard,label: "Payment Terms", value: `${supplier.paymentTerms} · Credit KSH ${supplier.creditLimit.toLocaleString()}` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-2.5 border-b border-gray-50">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-700">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">To update your profile details, contact your account manager at <span className="underline">suppliers@shaniidrx.com</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quote submission modal ── */}
      {quoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-start justify-between p-6 border-b">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Submit a Quote</h2>
                <p className="text-sm text-gray-500 mt-0.5">{quoteModal.productName}{quoteModal.sku ? ` · ${quoteModal.sku}` : ""}</p>
              </div>
              <button onClick={() => setQuoteModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-lg text-sm" style={{ background: `${WINE}08`, color: WINE }}>
                Shaniid RX needs <strong>{quoteModal.qty.toLocaleString()} units</strong> · Priority: <strong>{quoteModal.priority}</strong>
                {quoteModal.notes && <p className="mt-1 text-xs opacity-70">{quoteModal.notes}</p>}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Unit price (KSH) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={quotePrice}
                  onChange={e => setQuotePrice(e.target.value)}
                  placeholder="e.g. 450"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Lead time (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={quoteLeadDays}
                  onChange={e => setQuoteLeadDays(e.target.value)}
                  placeholder="e.g. 3"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Notes (optional)</Label>
                <Input
                  value={quoteNotes}
                  onChange={e => setQuoteNotes(e.target.value)}
                  placeholder="Minimum order quantity, packaging, delivery terms…"
                  className="mt-1"
                />
              </div>
              {quotePrice && (
                <div className="p-3 rounded-lg bg-gray-50 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Total value</span><span className="font-bold" style={{ color: WINE }}>KSH {(quoteModal.qty * Number(quotePrice)).toLocaleString()}</span></div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => setQuoteModal(null)}>Cancel</Button>
              <Button
                className="flex-1 text-white"
                style={{ background: WINE }}
                disabled={!quotePrice || quotingId === quoteModal.id}
                onClick={submitQuote}
              >
                {quotingId === quoteModal.id ? "Sending…" : "Send quote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Export ─────────────────────────────────────────────── */

export default function SupplierPortal() {
  const [suppliers] = useCmsDoc<Supplier[]>("suppliers", [])
  const [session, setSession] = useState<PortalSession | null>(() => getPortalSessionForType("supplier"))
  const [loginError, setLoginError] = useState("")

  const handleLogin = (email: string, code: string) => {
    setLoginError("")
    const localMatch = suppliers.find(
      (s) => s.email.toLowerCase() === email.trim().toLowerCase() && s.portalCode.toUpperCase() === code.trim().toUpperCase(),
    )
    if (!localMatch) {
      setLoginError("Invalid email or portal code. Please check and try again.")
      return
    }
    if (localMatch.status === "suspended" || localMatch.status === "blacklisted") {
      setLoginError("Your account has been suspended. Contact support@shaniidrx.com for assistance.")
      return
    }
    const s = loginPartnerLocal("supplier", localMatch.id, localMatch.companyName || email, email, code)
    setSession(s)
  }

  const handleLogout = () => {
    void signOutPartner("supplier")
    setSession(null)
  }

  if (!session) {
    return <SupplierLoginPage onLogin={handleLogin} error={loginError} />
  }

  const supplier = suppliers.find(s => s.id === session.partnerId)
  if (!supplier) {
    handleLogout()
    return null
  }

  return <SupplierDashboard supplier={supplier} session={session} onLogout={handleLogout} />
}

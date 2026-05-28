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
  getPortalSessionForType, loginPartnerLocal, signOutPartner, type PortalSession,
} from "@/lib/portal-auth"
import type { Supplier } from "@/components/admin/suppliers"
import {
  Building2, ShieldCheck, LogOut, Package, ClipboardList,
  BarChart3, User, AlertTriangle, CheckCircle2, XCircle,
  Eye, EyeOff, ArrowRight, Star, Truck, TrendingUp,
  Bell, Copy, RefreshCw, ChevronRight, Hash, Mail, Phone,
  MapPin, CreditCard, FileText, Shield, Clock, Boxes,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const WINE   = "#3D0814"
const ORANGE = "#F97316"
const GREEN  = "#15803D"

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
            <img src="/logo.svg" alt="Shaniid RX" className="h-8 w-8 brightness-0 invert" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
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
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: WINE }}>
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: WINE }}>Shaniid RX</span>
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

function SupplierDashboard({ supplier, session, onLogout }: {
  supplier: Supplier
  session: PortalSession
  onLogout: () => void
}) {
  const [tab, setTab] = useState<Tab>("overview")

  const kycDocs = [
    { key: "hasLicense",  label: "Business License" },
    { key: "hasFdaCert",  label: "FDA / KEBS Certificate" },
    { key: "hasInsurance",label: "Liability Insurance" },
  ]
  const kycPct = kycDocs.filter(d => (supplier as Record<string, unknown>)[d.key]).length / kycDocs.length * 100

  const statusInfo: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: "Pending Verification", color: "#92400E", bg: "#FEF3C7" },
    verified:   { label: "Verified Supplier",    color: "#065F46", bg: "#D1FAE5" },
    suspended:  { label: "Account Suspended",    color: "#991B1B", bg: "#FEE2E2" },
    blacklisted:{ label: "Account Restricted",   color: "#374151", bg: "#F3F4F6" },
  }
  const si = statusInfo[supplier.status] ?? statusInfo.pending

  return (
    <div className="min-h-screen flex" style={{ background: "#f8f7f5" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        {/* Brand */}
        <div className="px-5 py-5 border-b" style={{ background: WINE }}>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.svg" alt="" className="h-6 w-6 brightness-0 invert" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            <span className="text-white font-bold">Shaniid RX</span>
          </div>
          <p className="text-white/60 text-xs">Supplier Portal</p>
        </div>

        {/* Supplier identity */}
        <div className="px-5 py-4 border-b">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2" style={{ background: WINE }}>
            {supplier.companyName[0]}
          </div>
          <p className="font-bold text-gray-800 text-sm leading-tight">{supplier.companyName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{supplier.city}, {supplier.country}</p>
          <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: si.color, background: si.bg }}>
            {si.label}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? "text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              style={tab === id ? { background: WINE } : {}}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Trust Seal status */}
        <div className="px-5 py-4 border-t">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 font-medium">Trust Score</span>
            <span className="text-xs font-bold" style={{ color: kycPct === 100 ? GREEN : ORANGE }}>
              {kycPct === 100 ? "Sealed ✓" : `${kycPct.toFixed(0)}%`}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
          </div>
        </div>

        {/* Logout */}
        <div className="px-5 py-4 border-t">
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-lg text-gray-800">
              {TABS.find(t => t.id === tab)?.label}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Welcome back, {supplier.contactPerson || supplier.companyName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-mono">{supplier.portalCode}</span>
            {supplier.status === "pending" && (
              <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#92400E", background: "#FEF3C7" }}>
                <Clock className="h-3 w-3" />KYC under review
              </span>
            )}
          </div>
        </div>

        <div className="p-8">
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

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Purchase orders raised by Shaniid RX for your products</p>
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No purchase orders yet</p>
                <p className="text-sm mt-1">POs from Shaniid RX will appear here once your KYC is verified and products are listed.</p>
              </div>
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
                    const has = (supplier as Record<string, unknown>)[key] as boolean
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
    const s = loginPartnerLocal("supplier", localMatch.id, localMatch.supplierName || email, email, code)
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

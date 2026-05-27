"use client"

/**
 * Logistics Partner Portal — /portal/logistics
 *
 * Delivery companies log in with their email + portal code.
 * Features: active delivery dashboard, fleet status grid,
 * delivery confirmation, KYC status, and performance metrics.
 */

import { useState } from "react"
import { Link } from "wouter"
import { useCmsDoc } from "@/lib/cms-store"
import {
  getPortalSessionForType, loginPartner, signOutPartner, type PortalSession,
} from "@/lib/portal-auth"
import type { LogisticsPartner, LogisticsVehicle } from "@/components/admin/logistics-partners"
import {
  Truck, LogOut, Package, MapPin, BarChart3, Shield, Building2,
  AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff, ArrowRight,
  Clock, Activity, Star, Phone, Mail, Hash, Car, Bike,
  TrendingUp, Users, Gauge, Zap, Navigation, CheckSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const WINE   = "#3D0814"
const ORANGE = "#F97316"
const GREEN  = "#15803D"
const PURPLE = "#7C3AED"

/* ─── Login Page ─────────────────────────────────────────────── */

function LogisticsLoginPage({ onLogin, error }: {
  onLogin: (email: string, code: string) => void; error: string
}) {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [showCode, setShowCode] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); onLogin(email.trim().toLowerCase(), code.trim().toUpperCase())
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#faf9f8" }}>
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: WINE }}>
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Shaniid RX" className="h-8 w-8 brightness-0 invert" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            <span className="text-white font-bold text-xl tracking-tight">Shaniid RX</span>
          </div>
          <p className="text-white/60 text-sm mt-1">Logistics Partner Portal</p>
        </div>
        <div className="space-y-8">
          {[
            { icon: Navigation,  title: "Live delivery assignments", desc: "See every delivery assigned to your fleet in real time — route details, recipient info and SLA countdown." },
            { icon: Truck,       title: "Fleet management",          desc: "Track vehicle availability, driver assignments and maintenance status across your entire fleet." },
            { icon: Gauge,       title: "Performance dashboard",     desc: "On-time rate, delivery success rate and SLA score updated after every completed drop." },
            { icon: Shield,      title: "KYC & compliance",          desc: "Manage your insurance, registration and safety certification status from a single panel." },
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
        <p className="text-white/40 text-xs">"Real Medicine, Right to Your Door." — Shaniid RX Logistics</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: WINE }}>
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: WINE }}>Shaniid RX</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">Logistics sign in</h1>
          <p className="text-gray-500 text-sm mb-8">Enter the email and portal code issued to your company on onboarding.</p>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Company email</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ops@yourcompany.co.ke" className="mt-1 h-11" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Portal code</Label>
              <div className="relative mt-1">
                <Input type={showCode ? "text" : "password"} required value={code}
                  onChange={e => setCode(e.target.value)} placeholder="LOG-XXXX-XXXX"
                  className="h-11 pr-10 font-mono uppercase" />
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
            Need a portal code? Email <a href="mailto:logistics@shaniidrx.com" className="underline" style={{ color: WINE }}>logistics@shaniidrx.com</a>
          </p>
          <p className="text-xs text-gray-300 text-center mt-1">
            <Link href="/admin" className="hover:text-gray-500 transition-colors">Admin portal →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Vehicle Card ───────────────────────────────────────────── */

function VehicleCard({ vehicle }: { vehicle: LogisticsVehicle }) {
  const statusConfig = {
    available:    { label: "Available",    color: GREEN,   bg: `${GREEN}15`   },
    on_delivery:  { label: "On Delivery",  color: ORANGE,  bg: `${ORANGE}15`  },
    maintenance:  { label: "Maintenance",  color: "#F59E0B",bg: "#FEF3C7"      },
    offline:      { label: "Offline",      color: "#9CA3AF",bg: "#F3F4F6"      },
  }
  const { label, color, bg } = statusConfig[vehicle.status]
  const icons: Record<string, typeof Truck> = { motorcycle: Bike, bicycle: Bike, tuktuk: Car, van: Truck, cold_van: Truck, truck: Truck }
  const Icon = icons[vehicle.type] ?? Truck

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${PURPLE}15` }}>
        <Icon className="h-5 w-5" style={{ color: PURPLE }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono font-bold text-sm text-gray-800">{vehicle.plateNumber}</p>
        <p className="text-xs text-gray-500 capitalize mt-0.5">{vehicle.type.replace("_", " ")}</p>
        {vehicle.driver && <p className="text-xs text-gray-400 mt-0.5">Driver: {vehicle.driver}</p>}
      </div>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0" style={{ color, background: bg }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Dashboard ─────────────────────────────────────────────── */

type LogTab = "overview" | "deliveries" | "fleet" | "performance" | "kyc"

const LOG_TABS: { id: LogTab; label: string; icon: typeof Truck }[] = [
  { id: "overview",   label: "Overview",         icon: BarChart3  },
  { id: "deliveries", label: "My Deliveries",    icon: Package    },
  { id: "fleet",      label: "Fleet",            icon: Truck      },
  { id: "performance",label: "Performance",      icon: Gauge      },
  { id: "kyc",        label: "KYC & Compliance", icon: Shield     },
]

function LogisticsDashboard({ partner, session, onLogout }: {
  partner: LogisticsPartner; session: PortalSession; onLogout: () => void
}) {
  const [tab, setTab] = useState<LogTab>("overview")

  const kycDocs = ["hasInsurance", "hasRegistration", "hasDriverLicenses", "hasSafetyTraining"]
  const kycPct  = kycDocs.filter(k => (partner as Record<string, unknown>)[k]).length / kycDocs.length * 100

  const available  = partner.vehicles.filter(v => v.status === "available").length
  const onDelivery = partner.vehicles.filter(v => v.status === "on_delivery").length
  const maintenance= partner.vehicles.filter(v => v.status === "maintenance").length

  return (
    <div className="min-h-screen flex" style={{ background: "#f8f7f5" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        <div className="px-5 py-5 border-b" style={{ background: WINE }}>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.svg" alt="" className="h-6 w-6 brightness-0 invert" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            <span className="text-white font-bold">Shaniid RX</span>
          </div>
          <p className="text-white/60 text-xs">Logistics Portal</p>
        </div>

        <div className="px-5 py-4 border-b">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${PURPLE}20` }}>
            <Truck className="h-5 w-5" style={{ color: PURPLE }} />
          </div>
          <p className="font-bold text-gray-800 text-sm leading-tight">{partner.companyName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{partner.county}</p>
          <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${partner.status === "active" ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"}`}>
            {partner.status}
          </span>
        </div>

        {/* Fleet mini-status */}
        <div className="px-5 py-3 border-b bg-gray-50 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 mb-1">Fleet ({partner.vehicles.length})</p>
          {[
            { label: "Available",   count: available,   color: GREEN  },
            { label: "On delivery", count: onDelivery,  color: ORANGE },
            { label: "Maintenance", count: maintenance, color: "#F59E0B" },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{label}</span>
              <span className="font-bold" style={{ color }}>{count}</span>
            </div>
          ))}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {LOG_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-50"}`}
              style={tab === id ? { background: WINE } : {}}>
              <Icon className="h-4 w-4 flex-shrink-0" />{label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t">
          <button onClick={onLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="font-bold text-lg text-gray-800">{LOG_TABS.find(t => t.id === tab)?.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{partner.companyName} · {partner.portalCode}</p>
          </div>
          {partner.status === "pending" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full text-amber-700 bg-amber-50">
              <Clock className="h-3 w-3" />Pending activation
            </span>
          )}
        </div>

        <div className="p-8">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Package,    label: "Active Deliveries",  value: partner.activeDeliveries,           color: WINE   },
                  { icon: Truck,      label: "Total Fleet",         value: partner.vehicles.length,            color: PURPLE },
                  { icon: TrendingUp, label: "On-Time Rate",        value: `${partner.onTimeRate}%`,           color: GREEN  },
                  { icon: Activity,   label: "Total Deliveries",    value: partner.totalDeliveries,            color: ORANGE },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                      <p className="text-xl font-bold mt-0.5" style={{ color: WINE }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {partner.status === "active" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Your account is active</p>
                    <p className="text-sm text-green-700 mt-0.5">
                      You're receiving delivery assignments across {partner.coverageCounties.length} {partner.coverageCounties.length === 1 ? "county" : "counties"}.
                      Rate: KSH {partner.ratePerKm}/km · KSH {partner.ratePerDelivery}/delivery.
                    </p>
                  </div>
                </div>
              )}
              {partner.status === "pending" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">Activation pending</p>
                    <p className="text-sm text-amber-700 mt-0.5">Our team is reviewing your KYC documents. You'll begin receiving deliveries once activated.</p>
                  </div>
                </div>
              )}

              {/* Coverage */}
              {partner.coverageCounties.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-800 text-sm mb-3">Coverage counties ({partner.coverageCounties.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.coverageCounties.map(c => (
                      <span key={c} className="px-2.5 py-1 rounded-full text-xs font-semibold border capitalize" style={{ background: `${PURPLE}10`, color: PURPLE, borderColor: `${PURPLE}25` }}>
                        <MapPin className="inline h-3 w-3 mr-0.5" />{c}
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
                    { icon: Package,    label: "Deliveries",   action: () => setTab("deliveries")  },
                    { icon: Truck,      label: "My Fleet",     action: () => setTab("fleet")        },
                    { icon: Gauge,      label: "Performance",  action: () => setTab("performance")  },
                    { icon: Shield,     label: "KYC Status",   action: () => setTab("kyc")          },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all">
                      <Icon className="h-6 w-6" style={{ color: WINE }} />
                      <span className="text-xs font-medium text-gray-700">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DELIVERIES */}
          {tab === "deliveries" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Active and recent delivery assignments for your fleet</p>
              {partner.activeDeliveries === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No active deliveries</p>
                  <p className="text-sm mt-1">Delivery assignments appear here once you're activated and routes are assigned.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-white p-5 rounded-xl border border-gray-100">
                  Live delivery assignments will be available with Phase 2 database integration.
                </p>
              )}
            </div>
          )}

          {/* FLEET */}
          {tab === "fleet" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{partner.vehicles.length} vehicles registered</p>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span><span className="font-bold" style={{ color: GREEN }}>{available}</span> available</span>
                  <span><span className="font-bold" style={{ color: ORANGE }}>{onDelivery}</span> on delivery</span>
                  <span><span className="font-bold text-amber-500">{maintenance}</span> maintenance</span>
                </div>
              </div>
              {partner.vehicles.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No vehicles registered</p>
                  <p className="text-sm mt-1">Contact your account manager to add vehicles to your fleet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {partner.vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
                </div>
              )}
            </div>
          )}

          {/* PERFORMANCE */}
          {tab === "performance" && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-5">Performance metrics</h3>
                {[
                  { label: "On-Time Delivery Rate",    value: partner.onTimeRate,     color: GREEN  },
                  { label: "Delivery Success Rate",    value: partner.successRate,    color: ORANGE },
                  { label: "SLA Compliance Score",     value: partner.slaScore * 20,  color: WINE   },
                  { label: "KYC Completeness",         value: kycPct,                 color: PURPLE },
                ].map(({ label, value, color }) => (
                  <div key={label} className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium">{label}</span>
                      <span className="font-bold" style={{ color }}>{value}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t">
                  {[
                    { label: "Total Deliveries",  value: partner.totalDeliveries },
                    { label: "Avg Time (min)",    value: partner.avgDeliveryTime },
                    { label: "Rate / Delivery",   value: `KSH ${partner.ratePerDelivery}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center bg-gray-50 rounded-xl p-3">
                      <p className="text-base font-bold" style={{ color: WINE }}>{value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KYC */}
          {tab === "kyc" && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: kycPct === 100 ? `${GREEN}15` : `${ORANGE}15` }}>
                    <Shield className="h-7 w-7" style={{ color: kycPct === 100 ? GREEN : ORANGE }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">KYC — {kycPct === 100 ? "Compliant ✓" : `${kycPct.toFixed(0)}% Complete`}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">All documents required for activation</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
                  <div className="h-full rounded-full" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
                </div>
                {[
                  { key: "hasInsurance",      label: "Public Liability Insurance" },
                  { key: "hasRegistration",   label: "Company Registration Documents" },
                  { key: "hasDriverLicenses", label: "Driver Licenses (all drivers)" },
                  { key: "hasSafetyTraining", label: "Safety / Cold Chain Training Certs" },
                ].map(({ key, label }) => {
                  const has = (partner as Record<string, unknown>)[key] as boolean
                  return (
                    <div key={key} className={`flex items-center gap-3 p-4 rounded-xl border mb-2 ${has ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      {has ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                      <span className={`font-medium text-sm ${has ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                    </div>
                  )
                })}
                {kycPct < 100 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Email missing documents to <strong>logistics@shaniidrx.com</strong> with code <strong>{partner.portalCode}</strong>.
                  </div>
                )}
                {partner.kycNotes && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <strong>Admin note:</strong> {partner.kycNotes}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 text-sm mb-3">Company details</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: Building2, label: "Company",    value: partner.companyName },
                    { icon: Hash,      label: "Reg. Number",value: partner.registrationNumber || "—" },
                    { icon: Hash,      label: "Insurance",  value: partner.insuranceNumber || "—" },
                    { icon: Mail,      label: "Email",      value: partner.email },
                    { icon: Phone,     label: "Phone",      value: partner.phone || "—" },
                    { icon: MapPin,    label: "HQ",         value: `${partner.address}, ${partner.county}` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-700">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Export ─────────────────────────────────────────────── */

export default function LogisticsPortal() {
  const [partners] = useCmsDoc<LogisticsPartner[]>("logistics-partners", [])
  const [session, setSession] = useState<PortalSession | null>(() => getPortalSessionForType("logistics"))
  const [loginError, setLoginError] = useState("")

  const handleLogin = async (email: string, code: string) => {
    setLoginError("")
    const localMatch = partners.find(
      (p) => p.email.toLowerCase() === email && p.portalCode.toUpperCase() === code,
    )
    if (localMatch?.status === "suspended" || localMatch?.status === "inactive") {
      setLoginError("Your account is not active. Contact logistics@shaniidrx.com.")
      return
    }
    try {
      const s = await loginPartner("logistics", email, code)
      setSession(s)
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Email or portal code is incorrect. Please check and try again.",
      )
    }
  }

  const handleLogout = () => {
    void signOutPartner("logistics")
    setSession(null)
  }

  if (!session) return <LogisticsLoginPage onLogin={handleLogin} error={loginError} />

  const partner = partners.find(p => p.id === session.partnerId)
  if (!partner) { handleLogout(); return null }

  return <LogisticsDashboard partner={partner} session={session} onLogout={handleLogout} />
}

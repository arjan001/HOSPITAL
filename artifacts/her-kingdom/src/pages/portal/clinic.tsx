"use client"

/**
 * Clinic Partner Portal — /portal/clinic
 *
 * Clinics log in with their email + portal code (issued by admin on onboarding).
 * Features: credit dashboard, bulk order placement on behalf of patients,
 * KYC status, order history, and profile management.
 */

import { useState } from "react"
import { Link } from "wouter"
import { useCmsDoc } from "@/lib/cms-store"
import {
  getPortalSessionForType, loginPartnerLocal, signOutPartner,
  submitPartnerOrder, type PortalSession,
} from "@/lib/portal-auth"
import type { Clinic } from "@/components/admin/clinics"
import {
  Stethoscope, LogOut, ShoppingCart, ClipboardList, CreditCard,
  AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff, ArrowRight,
  Clock, Shield, User, Plus, Trash2, Package, BarChart3,
  Star, Building2, Hash, Mail, Phone, MapPin, Users, FileText,
  ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const WINE    = "#3D0814"
const ORANGE  = "#F97316"
const GREEN   = "#15803D"
const S_TEXT  = "rgba(255,255,255,0.88)"
const S_MUTED = "rgba(255,255,255,0.45)"
const S_BORDER= "rgba(255,255,255,0.10)"

/* ─── Login Page ─────────────────────────────────────────────── */

function ClinicLoginPage({ onLogin, error }: {
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
          <p className="text-white/60 text-sm mt-1">Healthcare Facility Portal</p>
        </div>
        <div className="space-y-8">
          {[
            { icon: ShoppingCart, title: "Order on behalf of patients", desc: "Source medicines, devices and consumables from verified suppliers directly through your facility account." },
            { icon: CreditCard,   title: "Flexible credit terms",       desc: "Access a credit line tailored to your facility size — place orders now, pay on your agreed terms." },
            { icon: ClipboardList,title: "Full order history",          desc: "Every order, delivery and invoice in one place. Searchable and exportable for your records." },
            { icon: Shield,       title: "Guaranteed genuine medicine", desc: "All products sourced through Shaniid RX carry the Trust Seal — verified at source and at dispatch." },
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
        <p className="text-white/40 text-xs">"Health in Every Home." — Shaniid RX</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">Clinic sign in</h1>
          <p className="text-gray-500 text-sm mb-8">
            Enter the email and portal code issued to your facility during onboarding.
          </p>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Facility email</Label>
              <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="procurement@yourclinic.co.ke" className="mt-1 h-11" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Portal code</Label>
              <div className="relative mt-1">
                <Input type={showCode ? "text" : "password"} required value={code}
                  onChange={e => setCode(e.target.value)} placeholder="CLN-XXXX-XXXX"
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
            Need a portal code? Email <a href="mailto:clinics@shaniidrx.com" className="underline" style={{ color: WINE }}>clinics@shaniidrx.com</a>
          </p>
          <p className="text-xs text-gray-300 text-center mt-1">
            <Link href="/admin" className="hover:text-gray-500 transition-colors">Admin portal →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Order Form ─────────────────────────────────────────────── */

interface OrderLine { name: string; qty: number; unitPrice: number; patientName: string }

export interface PlacedOrder {
  id: string
  total: number
  lines: OrderLine[]
  notes: string
  createdAt: string
}

function PlaceOrderTab({ clinic, onOrderPlaced }: {
  clinic: Clinic
  onOrderPlaced?: (order: PlacedOrder) => void
}) {
  const [lines, setLines] = useState<OrderLine[]>([{ name: "", qty: 1, unitPrice: 0, patientName: "" }])
  const [notes, setNotes] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const creditAvailable = clinic.creditLimit - clinic.creditUsed
  const canPlace = total > 0 && total <= creditAvailable && lines.every(l => l.name)

  const updateLine = (idx: number, k: keyof OrderLine, v: string | number) =>
    setLines(p => p.map((l, i) => i === idx ? { ...l, [k]: v } : l))

  const addLine = () => setLines(p => [...p, { name: "", qty: 1, unitPrice: 0, patientName: "" }])
  const removeLine = (idx: number) => setLines(p => p.filter((_, i) => i !== idx))

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${GREEN}15` }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: GREEN }} />
        </div>
        <h3 className="font-bold text-gray-800 text-lg">Order submitted!</h3>
        <p className="text-gray-500 mt-2 text-sm">Your order of KSH {total.toLocaleString()} has been sent to Shaniid RX. You'll receive a confirmation email shortly.</p>
        <Button
          className="mt-6 text-white"
          style={{ background: WINE }}
          onClick={() => {
            setSubmitted(false)
            setSubmitError("")
            setLines([{ name: "", qty: 1, unitPrice: 0, patientName: "" }])
            setNotes("")
          }}
        >
          Place another order
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Credit status */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700 text-sm">Credit Line</p>
          <p className="text-sm font-bold" style={{ color: WINE }}>KSH {creditAvailable.toLocaleString()} available</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full" style={{ width: `${(clinic.creditUsed / clinic.creditLimit) * 100}%`, background: creditAvailable < clinic.creditLimit * 0.2 ? "#B91C1C" : WINE }} />
        </div>
        <p className="text-xs text-gray-400">KSH {clinic.creditUsed.toLocaleString()} used of KSH {clinic.creditLimit.toLocaleString()} total · {clinic.paymentTerms}</p>
      </div>

      {/* Order lines */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">Order lines</h3>
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_1fr_32px] gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 px-0.5">
            <span>Medicine / Product</span><span className="text-center">Qty</span>
            <span>Unit Price</span><span>Patient Name (optional)</span><span />
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_1fr_32px] gap-2 items-center">
              <Input value={line.name} onChange={e => updateLine(idx, "name", e.target.value)} placeholder="e.g. Amoxicillin 500mg" className="text-sm" />
              <Input type="number" min={1} value={line.qty} onChange={e => updateLine(idx, "qty", Number(e.target.value))} className="text-sm text-center" />
              <Input type="number" min={0} value={line.unitPrice} onChange={e => updateLine(idx, "unitPrice", Number(e.target.value))} placeholder="KSH" className="text-sm" />
              <Input value={line.patientName} onChange={e => updateLine(idx, "patientName", e.target.value)} placeholder="Patient (optional)" className="text-sm" />
              <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLine} className="text-xs gap-1 mt-1">
            <Plus className="h-3 w-3" />Add line
          </Button>
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-4 font-bold" style={{ color: WINE }}>
          <span>Order Total</span>
          <span>KSH {total.toLocaleString()}</span>
        </div>
        {total > creditAvailable && (
          <p className="text-sm text-red-600 flex items-center gap-1 mt-2">
            <AlertTriangle className="h-4 w-4" />Exceeds available credit (KSH {creditAvailable.toLocaleString()})
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <Label className="text-sm font-semibold text-gray-700">Delivery / special instructions</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Urgency level, delivery instructions, cold chain requirements…" rows={3} className="mt-2" />
      </div>

      {submitError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {submitError}
        </div>
      )}

      <Button
        disabled={!canPlace || submitting}
        onClick={async () => {
          setSubmitError("")
          setSubmitting(true)
          try {
            const sub = await submitPartnerOrder("clinic", "order", {
              clinicId: clinic.id,
              clinicName: clinic.clinicName,
              lines,
              notes,
              total,
              creditAvailable,
            })
            setSubmitted(true)
            onOrderPlaced?.({
              id: (sub as { id?: string }).id ?? `ord_${Date.now()}`,
              total,
              lines,
              notes,
              createdAt: new Date().toISOString(),
            })
          } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Failed to submit order. Try again.")
          } finally {
            setSubmitting(false)
          }
        }}
        className="w-full h-11 text-white font-semibold gap-2"
        style={{ background: canPlace ? WINE : undefined }}
      >
        <ShoppingCart className="h-4 w-4" />
        {submitting ? "Submitting…" : "Submit order to Shaniid RX"}
      </Button>
    </div>
  )
}

/* ─── Dashboard ─────────────────────────────────────────────── */

type ClinicTab = "overview" | "order" | "orders" | "kyc" | "profile"

const CLINIC_TABS: { id: ClinicTab; label: string; icon: typeof Stethoscope }[] = [
  { id: "overview", label: "Overview",         icon: BarChart3     },
  { id: "order",    label: "Place Order",      icon: ShoppingCart  },
  { id: "orders",   label: "My Orders",        icon: ClipboardList },
  { id: "kyc",      label: "KYC Status",       icon: Shield        },
  { id: "profile",  label: "Facility Profile", icon: Building2     },
]

function ClinicDashboard({ clinic, session, onLogout }: {
  clinic: Clinic; session: PortalSession; onLogout: () => void
}) {
  const [tab, setTab] = useState<ClinicTab>("overview")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [localOrders, setLocalOrders] = useState<PlacedOrder[]>([])
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("shaniidrx.clinic.sidebar") === "collapsed" } catch { return false }
  })

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem("shaniidrx.clinic.sidebar", next ? "collapsed" : "expanded") } catch {}
      return next
    })
  }

  const kycDocs = ["hasLicense", "hasNhifCert", "hasPinCert", "hasDirectorId"]
  const kycPct  = kycDocs.filter(k => (clinic as unknown as Record<string, unknown>)[k]).length / kycDocs.length * 100
  const creditUsedPct = Math.min(100, (clinic.creditUsed / clinic.creditLimit) * 100)

  const tierColors = {
    standard:  { bg: "#F3F4F6", color: "#374151" },
    partner:   { bg: "#EFF6FF", color: "#1D4ED8" },
    preferred: { bg: "#FFFBEB", color: "#92400E" },
  }
  const tc = tierColors[clinic.tier]

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
                <p className="text-xs" style={{ color: S_MUTED }}>Clinic Portal</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: S_MUTED }}><X className="h-5 w-5" /></button>
            </div>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.15)" }}>
                <Stethoscope className="h-5 w-5" style={{ color: ORANGE }} />
              </div>
              <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{clinic.clinicName}</p>
              <p className="text-xs mt-0.5 capitalize" style={{ color: S_MUTED }}>{clinic.clinicType.replace("_", " ")} · {clinic.county}</p>
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: tc.color, background: tc.bg }}>{clinic.tier} partner</span>
            </div>
            <div className="px-5 py-3" style={{ borderBottom: `1px solid ${S_BORDER}`, background: "rgba(0,0,0,0.15)" }}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: S_MUTED }}>Credit available</span>
                <span className="font-bold" style={{ color: creditUsedPct > 80 ? "#FCA5A5" : "#4ADE80" }}>{(100 - creditUsedPct).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S_BORDER }}>
                <div className="h-full rounded-full" style={{ width: `${creditUsedPct}%`, background: creditUsedPct > 80 ? "#EF4444" : "#4ADE80" }} />
              </div>
              <p className="text-[10px] mt-1" style={{ color: S_MUTED }}>KSH {(clinic.creditLimit - clinic.creditUsed).toLocaleString()} of {clinic.creditLimit.toLocaleString()}</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {CLINIC_TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setTab(id); setMobileOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative hover:bg-white/10"
                  style={tab === id ? { background: "rgba(255,255,255,0.12)", color: ORANGE } : { color: S_TEXT }}>
                  {tab === id && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r" style={{ background: ORANGE }} />}
                  <Icon className="h-4 w-4 flex-shrink-0" />{label}
                </button>
              ))}
            </nav>
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
          {!collapsed ? (
            <div className="flex-1 px-5 py-4">
              <div className="flex items-center gap-2 mb-0.5">
                <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                <span className="font-bold text-sm" style={{ color: S_TEXT }}>Shaniid RX</span>
              </div>
              <p className="text-xs" style={{ color: S_MUTED }}>Clinic Portal</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-5">
              <img src="/logo-rx.png" alt="" className="h-6 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            </div>
          )}
        </div>

        {!collapsed ? (
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Stethoscope className="h-5 w-5" style={{ color: ORANGE }} />
            </div>
            <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{clinic.clinicName}</p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: S_MUTED }}>{clinic.clinicType.replace("_", " ")} · {clinic.county}</p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: tc.color, background: tc.bg }}>{clinic.tier} partner</span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Stethoscope className="h-4 w-4" style={{ color: ORANGE }} />
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${S_BORDER}`, background: "rgba(0,0,0,0.15)" }}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: S_MUTED }}>Credit available</span>
              <span className="font-bold" style={{ color: creditUsedPct > 80 ? "#FCA5A5" : "#4ADE80" }}>{(100 - creditUsedPct).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S_BORDER }}>
              <div className="h-full rounded-full" style={{ width: `${creditUsedPct}%`, background: creditUsedPct > 80 ? "#EF4444" : "#4ADE80" }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: S_MUTED }}>KSH {(clinic.creditLimit - clinic.creditUsed).toLocaleString()} of {clinic.creditLimit.toLocaleString()}</p>
          </div>
        )}

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {CLINIC_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} title={collapsed ? label : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium transition-all relative hover:bg-white/10 ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}
              style={tab === id ? { background: "rgba(255,255,255,0.12)", color: ORANGE } : { color: S_TEXT }}>
              {tab === id && !collapsed && <span className="absolute left-0 inset-y-2 w-0.5 rounded-r" style={{ background: ORANGE }} />}
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${S_BORDER}` }}>
          <div className={`py-3 flex items-center ${collapsed ? "flex-col gap-2 px-2" : "px-5 justify-between"}`}>
            <button onClick={onLogout} title="Sign out" className="flex items-center gap-2 text-sm transition-colors hover:text-orange-400" style={{ color: S_MUTED }}>
              <LogOut className="h-4 w-4" />{!collapsed && <span>Sign out</span>}
            </button>
            <button onClick={toggleSidebar} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/10 transition-colors" style={{ color: S_MUTED }}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto min-w-0">
        <div className="bg-white border-b px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 -ml-1">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-lg text-gray-800">{CLINIC_TABS.find(t => t.id === tab)?.label}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{clinic.clinicName} · {clinic.portalCode}</p>
            </div>
          </div>
          {clinic.status !== "approved" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#92400E", background: "#FEF3C7" }}>
              <Clock className="h-3 w-3" /><span className="hidden sm:inline">KYC under review</span>
            </span>
          )}
        </div>

        <div className="p-4 md:p-8">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: ShoppingCart, label: "Total Orders",    value: clinic.orderCount,    color: WINE  },
                  { icon: CreditCard,   label: "Total Spend",     value: `KSH ${(clinic.totalOrderValue/1000).toFixed(0)}K`, color: ORANGE },
                  { icon: Shield,       label: "KYC Score",       value: `${kycPct.toFixed(0)}%`, color: kycPct === 100 ? GREEN : ORANGE },
                  { icon: Users,        label: "Specialties",     value: clinic.specialties.length, color: WINE },
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

              {/* Status banner */}
              {clinic.status === "approved" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Your facility is approved</p>
                    <p className="text-sm text-green-700 mt-0.5">You can place orders immediately using your credit line of KSH {clinic.creditLimit.toLocaleString()} ({clinic.paymentTerms}).</p>
                  </div>
                </div>
              )}
              {clinic.status === "pending_kyc" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">KYC review in progress</p>
                    <p className="text-sm text-amber-700 mt-0.5">Our team is reviewing your facility documents. You'll be able to place orders once your KYC is approved.</p>
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Quick actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: ShoppingCart, label: "Place Order",  action: () => setTab("order")   },
                    { icon: ClipboardList,label: "My Orders",    action: () => setTab("orders")  },
                    { icon: Shield,       label: "KYC Status",   action: () => setTab("kyc")     },
                    { icon: Building2,    label: "My Profile",   action: () => setTab("profile") },
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

          {/* ORDER */}
          {tab === "order" && (
            <PlaceOrderTab
              clinic={clinic}
              onOrderPlaced={order => setLocalOrders(prev => [order, ...prev])}
            />
          )}

          {/* ORDERS */}
          {tab === "orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Order history for {clinic.clinicName}</p>
                <Button size="sm" className="text-white text-xs" style={{ background: WINE }} onClick={() => setTab("order")}>
                  <ShoppingCart className="h-3 w-3 mr-1" />Place order
                </Button>
              </div>
              {localOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No orders this session</p>
                  <p className="text-sm mt-1 text-gray-400">Orders you place will appear here. Full history is available in your admin account.</p>
                  <Button className="mt-4 text-white" style={{ background: WINE }} onClick={() => setTab("order")}>
                    <ShoppingCart className="h-4 w-4 mr-2" />Place your first order
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {localOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">Order {order.id.slice(0, 14)}…</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#065F46", background: "#D1FAE5" }}>Submitted</span>
                          <p className="font-bold mt-1" style={{ color: WINE }}>KSH {order.total.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {order.lines.filter(l => l.name).map((line, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                            <span>{line.name} {line.patientName && <span className="text-gray-400">· {line.patientName}</span>}</span>
                            <span className="font-medium">× {line.qty} · KSH {(line.qty * line.unitPrice).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="mt-2 text-xs text-gray-500 italic">{order.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                    <h2 className="font-bold text-gray-800">KYC — {kycPct === 100 ? "Approved ✓" : `${kycPct.toFixed(0)}% Complete`}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Submit all documents to activate your credit line</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
                  <div className="h-full rounded-full" style={{ width: `${kycPct}%`, background: kycPct === 100 ? GREEN : ORANGE }} />
                </div>
                {[
                  { key: "hasLicense",   label: "Facility License / Registration" },
                  { key: "hasNhifCert",  label: "NHIF / SHIF Certificate" },
                  { key: "hasPinCert",   label: "KRA PIN Certificate" },
                  { key: "hasDirectorId",label: "Medical Director National ID" },
                ].map(({ key, label }) => {
                  const has = (clinic as unknown as Record<string, unknown>)[key] as boolean
                  return (
                    <div key={key} className={`flex items-center gap-3 p-4 rounded-xl border mb-2 ${has ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      {has ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                      <span className={`font-medium text-sm ${has ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                    </div>
                  )
                })}
                {kycPct < 100 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Submit missing documents to <strong>clinics@shaniidrx.com</strong> with code <strong>{clinic.portalCode}</strong> in the subject.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4">Facility profile</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Stethoscope, label: "Facility",        value: `${clinic.clinicName} (${clinic.clinicType.replace("_", " ")})` },
                    { icon: Hash,        label: "License",          value: clinic.licenseNumber || "—" },
                    { icon: Hash,        label: "NHIF Number",      value: clinic.nhifNumber || "—" },
                    { icon: Mail,        label: "Email",            value: clinic.email },
                    { icon: Phone,       label: "Phone",            value: clinic.phone || "—" },
                    { icon: MapPin,      label: "Address",          value: `${clinic.address}, ${clinic.town}, ${clinic.county}` },
                    { icon: Users,       label: "Medical Director", value: clinic.medicalDirector || "—" },
                    { icon: CreditCard,  label: "Credit",           value: `KSH ${clinic.creditLimit.toLocaleString()} · ${clinic.paymentTerms}` },
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
                <p className="text-xs text-gray-400 mt-4">Contact <span className="underline">clinics@shaniidrx.com</span> to update facility details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Export ─────────────────────────────────────────────── */

export default function ClinicPortal() {
  const [clinics] = useCmsDoc<Clinic[]>("clinics", [])
  const [session, setSession] = useState<PortalSession | null>(() => getPortalSessionForType("clinic"))
  const [loginError, setLoginError] = useState("")

  const handleLogin = (email: string, code: string) => {
    setLoginError("")
    const localMatch = clinics.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.portalCode.toUpperCase() === code.trim().toUpperCase(),
    )
    if (!localMatch) {
      setLoginError("Invalid email or portal code. Please check and try again.")
      return
    }
    if (localMatch.status === "rejected") {
      setLoginError("Your facility onboarding was not approved. Contact clinics@shaniidrx.com.")
      return
    }
    const s = loginPartnerLocal("clinic", localMatch.id, localMatch.clinicName || email, email, code)
    setSession(s)
  }

  const handleLogout = () => {
    void signOutPartner("clinic")
    setSession(null)
  }

  if (!session) return <ClinicLoginPage onLogin={handleLogin} error={loginError} />

  const clinic = clinics.find(c => c.id === session.partnerId)
  if (!clinic) { handleLogout(); return null }

  return <ClinicDashboard clinic={clinic} session={session} onLogout={handleLogout} />
}

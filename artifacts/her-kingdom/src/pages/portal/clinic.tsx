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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const WINE   = "#3D0814"
const ORANGE = "#F97316"
const GREEN  = "#15803D"

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
            <img src="/logo.svg" alt="Shaniid RX" className="h-8 w-8 brightness-0 invert" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
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
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: WINE }}>
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg" style={{ color: WINE }}>Shaniid RX</span>
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

function PlaceOrderTab({ clinic }: { clinic: Clinic }) {
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
            await submitPartnerOrder("clinic", "order", {
              clinicId: clinic.id,
              clinicName: clinic.clinicName,
              lines,
              notes,
              total,
              creditAvailable,
            })
            setSubmitted(true)
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

  const kycDocs = ["hasLicense", "hasNhifCert", "hasPinCert", "hasDirectorId"]
  const kycPct  = kycDocs.filter(k => (clinic as Record<string, unknown>)[k]).length / kycDocs.length * 100
  const creditUsedPct = Math.min(100, (clinic.creditUsed / clinic.creditLimit) * 100)

  const tierColors = {
    standard:  { bg: "#F3F4F6", color: "#374151" },
    partner:   { bg: "#EFF6FF", color: "#1D4ED8" },
    preferred: { bg: "#FFFBEB", color: "#92400E" },
  }
  const tc = tierColors[clinic.tier]

  return (
    <div className="min-h-screen flex" style={{ background: "#f8f7f5" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
        <div className="px-5 py-5 border-b" style={{ background: WINE }}>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.svg" alt="" className="h-6 w-6 brightness-0 invert" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
            <span className="text-white font-bold">Shaniid RX</span>
          </div>
          <p className="text-white/60 text-xs">Clinic Portal</p>
        </div>

        <div className="px-5 py-4 border-b">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${WINE}15` }}>
            <Stethoscope className="h-5 w-5" style={{ color: WINE }} />
          </div>
          <p className="font-bold text-gray-800 text-sm leading-tight">{clinic.clinicName}</p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{clinic.clinicType.replace("_", " ")} · {clinic.county}</p>
          <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: tc.color, background: tc.bg }}>
            {clinic.tier} partner
          </span>
        </div>

        {/* Credit mini-gauge */}
        <div className="px-5 py-3 border-b bg-gray-50">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Credit available</span>
            <span className="font-bold" style={{ color: WINE }}>
              {(100 - creditUsedPct).toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${creditUsedPct}%`, background: creditUsedPct > 80 ? "#B91C1C" : WINE }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">KSH {(clinic.creditLimit - clinic.creditUsed).toLocaleString()} of {clinic.creditLimit.toLocaleString()}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {CLINIC_TABS.map(({ id, label, icon: Icon }) => (
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
            <h1 className="font-bold text-lg text-gray-800">{CLINIC_TABS.find(t => t.id === tab)?.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{clinic.clinicName} · {clinic.portalCode}</p>
          </div>
          {clinic.status !== "approved" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#92400E", background: "#FEF3C7" }}>
              <Clock className="h-3 w-3" />KYC under review
            </span>
          )}
        </div>

        <div className="p-8">
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
          {tab === "order" && <PlaceOrderTab clinic={clinic} />}

          {/* ORDERS */}
          {tab === "orders" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Order history for {clinic.clinicName}</p>
              {clinic.orderCount === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No orders yet</p>
                  <Button className="mt-4 text-white" style={{ background: WINE }} onClick={() => setTab("order")}>
                    <ShoppingCart className="h-4 w-4 mr-2" />Place your first order
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-white p-5 rounded-xl border border-gray-100">
                  Full order history will be available with Phase 2 database integration.
                </p>
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
                  const has = (clinic as Record<string, unknown>)[key] as boolean
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

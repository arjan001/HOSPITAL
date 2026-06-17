"use client"

/**
 * Supplier Partner Portal — /portal/supplier (and /portal/supplier/accept)
 *
 * Backed by the real partner API via partners-client.ts. Auth is a server-side
 * signed token in an HttpOnly cookie (no localStorage, no portal codes).
 *
 * Auth screen has two modes: Sign in and Apply to join. The accept-invite mode
 * is mounted at /portal/supplier/accept?token=… and lets an invited supplier set
 * their password.
 *
 * Tabs: Overview · Catalog · Opportunities · Quotes · KYC · Profile
 */

import { useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import {
  partnerLogin, partnerApply, partnerAcceptInvite, partnerSignout,
  usePartnerMe, refreshPartnerMe,
  useSupplierCatalog, addSupplierProduct, updateSupplierProduct, deleteSupplierProduct,
  useSupplierOpportunities, useSupplierQuotes, submitSupplierQuote,
  useSupplierPOs,
  type PartnerAccount, type SupplierProduct, type SourcingOpportunity, type PartnerQuote,
  type PurchaseOrderSummary,
} from "@/lib/partners-client"
import { PartnerClerkDivider, PartnerClerkSignIn } from "@/components/portal/partner-clerk-signin"
import { PartnerTeamPanel } from "@/components/portal/partner-team-panel"
import {
  ShieldCheck, LogOut, ClipboardList, BarChart3, User, AlertTriangle,
  CheckCircle2, XCircle, Eye, EyeOff, ArrowRight, Star, TrendingUp,
  ChevronRight, ChevronLeft, Hash, Mail, FileText, Shield, Clock, Boxes,
  Menu, X, Plus, Pencil, Trash2, Loader2, PackageSearch, Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const WINE     = "#3D0814"
const WINE_2   = "#6B0F1A"
const ORANGE   = "#F97316"
const RED       = "#B91C1C"
const GREEN    = "#15803D"
const S_TEXT   = "rgba(255,255,255,0.88)"
const S_MUTED  = "rgba(255,255,255,0.45)"
const S_BORDER = "rgba(255,255,255,0.10)"

const CURRENCY_DEFAULT = "KES"

function fmtMoney(amount: number, currency = CURRENCY_DEFAULT): string {
  return `${currency} ${Number(amount || 0).toLocaleString()}`
}

/* ─── Auth screen (Sign in / Apply to join) ──────────────────── */

const AUTH_FEATURES: { icon: typeof Boxes; title: string; desc: string }[] = [
  { icon: Boxes,         title: "Manage your catalog",      desc: "List, price and update the products you supply to the Shaniid RX network." },
  { icon: PackageSearch, title: "Sourcing opportunities",   desc: "See open sourcing needs the moment they're posted and submit competitive quotes." },
  { icon: ShieldCheck,   title: "Trust Seal certification", desc: "Complete your KYC to earn the Shaniid RX Trust Seal — the mark pharmacies trust." },
  { icon: BarChart3,     title: "Performance insights",     desc: "Track your quotes, catalog and win-rate from a single dashboard." },
]

function BrandPanel() {
  return (
    <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: WINE }}>
      <div>
        <div className="flex items-center gap-2.5">
          <img src="/logo-rx.png" alt="Shaniid RX" className="h-12 w-auto object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
          <span className="text-white font-bold text-xl tracking-tight">Shaniid RX</span>
        </div>
        <p className="text-white/60 text-sm mt-1">Supplier Partner Portal</p>
      </div>
      <div className="space-y-8">
        {AUTH_FEATURES.map(({ icon: Icon, title, desc }) => (
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
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function SupplierAuthScreen() {
  const [mode, setMode] = useState<"signin" | "apply">("signin")

  // Sign in state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [signinErr, setSigninErr] = useState("")
  const [signingIn, setSigningIn] = useState(false)

  // Apply state
  const [orgName, setOrgName] = useState("")
  const [contactName, setContactName] = useState("")
  const [applyEmail, setApplyEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [applyErr, setApplyErr] = useState("")
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const submitSignin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSigninErr("")
    setSigningIn(true)
    try {
      await partnerLogin("supplier", email.trim().toLowerCase(), password)
      await refreshPartnerMe()
    } catch (err) {
      setSigninErr(err instanceof Error ? err.message : "Sign in failed. Please try again.")
    } finally {
      setSigningIn(false)
    }
  }

  const submitApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setApplyErr("")
    setApplying(true)
    try {
      await partnerApply({
        partnerType: "supplier",
        orgName: orgName.trim(),
        contactName: contactName.trim(),
        email: applyEmail.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      })
      setApplied(true)
    } catch (err) {
      setApplyErr(err instanceof Error ? err.message : "Could not submit your application. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#faf9f8" }}>
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-14 w-auto object-contain" />
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 mb-6 rounded-xl bg-gray-100 w-full">
            {([
              { id: "signin" as const, label: "Sign in" },
              { id: "apply" as const, label: "Apply to join" },
            ]).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className="flex-1 text-sm font-semibold py-2 rounded-lg transition-all"
                style={mode === t.id ? { background: "#fff", color: WINE, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" } : { color: "#6B7280" }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Supplier sign in</h1>
              <p className="text-gray-500 text-sm mb-2">Enter the email and password for your supplier account.</p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
                First time? Enter your supplier email and use the <span className="font-semibold">portal code</span> shared by the Shaniid RX team as your password.
              </p>

              {signinErr && <ErrorBanner message={signinErr} />}

              <form onSubmit={submitSignin} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email address</Label>
                  <Input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.co.ke" className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPwd ? "text" : "password"} required
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Your password" className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={signingIn} className="w-full h-11 text-white font-semibold gap-2" style={{ background: WINE }}>
                  {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in to your portal <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <PartnerClerkDivider />
              <PartnerClerkSignIn
                type="supplier"
                redirectPath="/portal/supplier"
                onError={setSigninErr}
              />

              <p className="text-xs text-gray-400 text-center mt-6">
                New supplier? <button type="button" onClick={() => setMode("apply")} className="underline" style={{ color: WINE }}>Apply to join</button>
              </p>
            </>
          ) : applied ? (
            <div className="text-center py-6">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${GREEN}15` }}>
                <CheckCircle2 className="h-7 w-7" style={{ color: GREEN }} />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Thanks — we'll review your application</h1>
              <p className="text-gray-500 text-sm">
                Our partnerships team will review your details and reach out by email. Once approved you'll receive an invite to set your password and access the portal.
              </p>
              <Button onClick={() => { setMode("signin"); setApplied(false) }} variant="outline" className="mt-6">
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Apply to join</h1>
              <p className="text-gray-500 text-sm mb-8">Tell us about your business and we'll get back to you.</p>

              {applyErr && <ErrorBanner message={applyErr} />}

              <form onSubmit={submitApply} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Company name <span className="text-red-500">*</span></Label>
                  <Input required value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Pharmaceuticals Ltd" className="mt-1 h-11" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Contact person <span className="text-red-500">*</span></Label>
                  <Input required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" className="mt-1 h-11" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email address <span className="text-red-500">*</span></Label>
                  <Input type="email" required value={applyEmail} onChange={e => setApplyEmail(e.target.value)} placeholder="you@company.co.ke" className="mt-1 h-11" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254…" className="mt-1 h-11" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Message</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="What do you supply? Categories, certifications, scale…" className="mt-1" rows={3} />
                </div>
                <Button type="submit" disabled={applying} className="w-full h-11 text-white font-semibold gap-2" style={{ background: ORANGE }}>
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit application <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-6">
                Already a partner? <button type="button" onClick={() => setMode("signin")} className="underline" style={{ color: WINE }}>Sign in</button>
              </p>
            </>
          )}

          <p className="text-xs text-gray-300 text-center mt-3">
            <Link href="/admin" className="hover:text-gray-500 transition-colors">Admin portal →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Accept invite (set password) ───────────────────────────── */

function AcceptInviteScreen({ token }: { token: string }) {
  const [, navigate] = useLocation()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setErr("Passwords do not match.")
      return
    }
    setBusy(true)
    try {
      await partnerAcceptInvite(token, password)
      await refreshPartnerMe()
      navigate("/portal/supplier")
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not accept the invite. The link may have expired.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#faf9f8" }}>
      <BrandPanel />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo-rx.png" alt="Shaniid RX" className="h-14 w-auto object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-1">Set your password</h1>
          <p className="text-gray-500 text-sm mb-8">Choose a password to activate your supplier account.</p>

          {err && <ErrorBanner message={err} />}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">New password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPwd ? "text" : "password"} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters" className="h-11 pr-10"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Confirm password</Label>
              <Input
                type={showPwd ? "text" : "password"} required
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password" className="mt-1 h-11"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-11 text-white font-semibold gap-2" style={{ background: WINE }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Activate account <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ─── Small UI helpers ───────────────────────────────────────── */

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

function LoadingState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function ErrorState({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-red-100 p-10 text-center">
      <AlertTriangle className="h-8 w-8 mx-auto mb-3" style={{ color: RED }} />
      <p className="text-sm text-red-700 font-medium">{label}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }: { icon: typeof Boxes; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p className="font-medium">{title}</p>
      <p className="text-sm mt-1">{desc}</p>
    </div>
  )
}

/* ─── Dashboard ──────────────────────────────────────────────── */

type Tab = "overview" | "catalog" | "opportunities" | "quotes" | "purchase-orders" | "kyc" | "profile"

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "overview",        label: "Overview",          icon: BarChart3     },
  { id: "catalog",         label: "Catalog",           icon: Boxes         },
  { id: "opportunities",   label: "Opportunities",     icon: PackageSearch },
  { id: "quotes",          label: "My Quotes",         icon: ClipboardList },
  { id: "purchase-orders", label: "Purchase Orders",   icon: FileText      },
  { id: "kyc",             label: "KYC & Trust Seal",  icon: ShieldCheck   },
  { id: "profile",         label: "My Profile",        icon: User          },
]

const PARTNER_STATUS: Record<PartnerAccount["status"], { label: string; color: string; bg: string }> = {
  invited:   { label: "Invite Pending", color: "#92400E", bg: "#FEF3C7" },
  active:    { label: "Active Supplier", color: "#065F46", bg: "#D1FAE5" },
  suspended: { label: "Account Suspended", color: "#991B1B", bg: "#FEE2E2" },
}

const QUOTE_STATUS_BADGE: Record<string, { color: string; bg: string }> = {
  pending:   { color: "#92400E", bg: "#FEF3C7" },
  submitted: { color: "#1D4ED8", bg: "#EFF6FF" },
  accepted:  { color: "#065F46", bg: "#D1FAE5" },
  rejected:  { color: "#991B1B", bg: "#FEE2E2" },
  withdrawn: { color: "#6B7280", bg: "#F3F4F6" },
}

const URGENCY_BADGE: Record<string, { color: string; bg: string }> = {
  low:    { color: "#374151", bg: "#F3F4F6" },
  normal: { color: "#1D4ED8", bg: "#EFF6FF" },
  medium: { color: "#1D4ED8", bg: "#EFF6FF" },
  high:   { color: "#92400E", bg: "#FEF3C7" },
  urgent: { color: "#991B1B", bg: "#FEE2E2" },
}

function statusBadge(map: Record<string, { color: string; bg: string }>, key: string) {
  return map[key.toLowerCase()] ?? { color: "#6B7280", bg: "#F3F4F6" }
}

/* ─── Catalog product form ───────────────────────────────────── */

type ProductForm = {
  productName: string
  sku: string
  category: string
  unitPrice: string
  currency: string
  moq: string
  leadTimeDays: string
  stockQty: string
  status: "active" | "inactive"
  notes: string
}

const EMPTY_PRODUCT: ProductForm = {
  productName: "", sku: "", category: "", unitPrice: "", currency: CURRENCY_DEFAULT,
  moq: "1", leadTimeDays: "1", stockQty: "0", status: "active", notes: "",
}

function productToForm(p: SupplierProduct): ProductForm {
  return {
    productName: p.productName,
    sku: p.sku ?? "",
    category: p.category ?? "",
    unitPrice: String(p.unitPrice ?? ""),
    currency: p.currency || CURRENCY_DEFAULT,
    moq: String(p.moq ?? 1),
    leadTimeDays: String(p.leadTimeDays ?? 1),
    stockQty: String(p.stockQty ?? 0),
    status: p.status,
    notes: p.notes ?? "",
  }
}

function ProductModal({ initial, onClose, onSaved }: {
  initial: SupplierProduct | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProductForm>(initial ? productToForm(initial) : EMPTY_PRODUCT)
  const [err, setErr] = useState("")
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    if (!form.productName.trim()) { setErr("Product name is required."); return }
    if (!form.unitPrice || Number(form.unitPrice) < 0) { setErr("Enter a valid unit price."); return }
    setSaving(true)
    try {
      const payload: Partial<SupplierProduct> = {
        productName: form.productName.trim(),
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
        unitPrice: Number(form.unitPrice),
        currency: form.currency.trim() || CURRENCY_DEFAULT,
        moq: Number(form.moq) || 1,
        leadTimeDays: Number(form.leadTimeDays) || 0,
        stockQty: Number(form.stockQty) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (initial) await updateSupplierProduct(initial.id, payload)
      else await addSupplierProduct(payload)
      onSaved()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save the product.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900 text-lg">{initial ? "Edit product" : "Add product"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {err && <ErrorBanner message={err} />}
          <div>
            <Label className="text-sm font-semibold text-gray-700">Product name <span className="text-red-500">*</span></Label>
            <Input value={form.productName} onChange={e => set("productName", e.target.value)} placeholder="Paracetamol 500mg" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">SKU</Label>
              <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="SKU-001" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Category</Label>
              <Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="Medications" className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Unit price <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} step="0.01" value={form.unitPrice} onChange={e => set("unitPrice", e.target.value)} placeholder="450" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Currency</Label>
              <Input value={form.currency} onChange={e => set("currency", e.target.value.toUpperCase())} placeholder="KES" className="mt-1 uppercase" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">MOQ</Label>
              <Input type="number" min={1} value={form.moq} onChange={e => set("moq", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Lead time (days)</Label>
              <Input type="number" min={0} value={form.leadTimeDays} onChange={e => set("leadTimeDays", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Stock qty</Label>
              <Input type="number" min={0} value={form.stockQty} onChange={e => set("stockQty", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Status</Label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value as "active" | "inactive")}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Packaging, batch info, delivery terms…" className="mt-1" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 text-white" style={{ background: WINE }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? "Save changes" : "Add product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ product, onClose, onDeleted }: {
  product: SupplierProduct
  onClose: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const remove = async () => {
    setBusy(true)
    setErr("")
    try {
      await deleteSupplierProduct(product.id)
      onDeleted()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete the product.")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg">Delete product</h2>
        <p className="text-sm text-gray-500 mt-1">
          Remove <strong>{product.productName}</strong> from your catalog? This cannot be undone.
        </p>
        {err && <div className="mt-3"><ErrorBanner message={err} /></div>}
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1 text-white" style={{ background: RED }} onClick={remove} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Quote modal ────────────────────────────────────────────── */

function QuoteModal({ opportunity, onClose, onSubmitted }: {
  opportunity: SourcingOpportunity
  onClose: () => void
  onSubmitted: () => void
}) {
  const [unitPrice, setUnitPrice] = useState("")
  const [quantity, setQuantity] = useState(String(opportunity.quantityNeeded || ""))
  const [leadTimeDays, setLeadTimeDays] = useState("")
  const [notes, setNotes] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr("")
    if (!unitPrice || Number(unitPrice) < 0) { setErr("Enter a valid unit price."); return }
    if (!quantity || Number(quantity) <= 0) { setErr("Enter a valid quantity."); return }
    setBusy(true)
    try {
      await submitSupplierQuote({
        sourcingRequestId: opportunity.id,
        unitPrice: Number(unitPrice),
        quantity: Number(quantity),
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 0,
        notes: notes.trim() || undefined,
      })
      onSubmitted()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit the quote.")
      setBusy(false)
    }
  }

  const total = unitPrice && quantity ? Number(unitPrice) * Number(quantity) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Submit a quote</h2>
            <p className="text-sm text-gray-500 mt-0.5">{opportunity.productName}{opportunity.sku ? ` · ${opportunity.sku}` : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {err && <ErrorBanner message={err} />}
          <div className="p-3 rounded-lg text-sm" style={{ background: `${WINE}08`, color: WINE }}>
            Shaniid RX needs <strong>{opportunity.quantityNeeded.toLocaleString()} units</strong> · Urgency: <strong className="capitalize">{opportunity.urgency}</strong>
            {opportunity.notes && <p className="mt-1 text-xs opacity-70">{opportunity.notes}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Unit price (KES) <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="450" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Quantity <span className="text-red-500">*</span></Label>
              <Input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1000" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">Lead time (days)</Label>
            <Input type="number" min={0} value={leadTimeDays} onChange={e => setLeadTimeDays(e.target.value)} placeholder="3" className="mt-1" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Packaging, terms…" className="mt-1" rows={2} />
          </div>
          {total > 0 && (
            <div className="p-3 rounded-lg bg-gray-50 text-sm">
              <div className="flex justify-between text-gray-600"><span>Total value</span><span className="font-bold" style={{ color: WINE }}>{fmtMoney(total)}</span></div>
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="flex-1 text-white" style={{ background: WINE }} disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send quote"}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Dashboard shell ────────────────────────────────────────── */

function SupplierDashboard({ partner, onLogout }: {
  partner: PartnerAccount
  onLogout: () => void
}) {
  const [tab, setTab] = useState<Tab>("overview")
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("shaniidrx.supplier.sidebar") === "collapsed" } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const catalog = useSupplierCatalog()
  const opportunities = useSupplierOpportunities()
  const quotes = useSupplierQuotes()
  const pos = useSupplierPOs()

  const [productModal, setProductModal] = useState<{ open: boolean; product: SupplierProduct | null }>({ open: false, product: null })
  const [deleteTarget, setDeleteTarget] = useState<SupplierProduct | null>(null)
  const [quoteTarget, setQuoteTarget] = useState<SourcingOpportunity | null>(null)

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem("shaniidrx.supplier.sidebar", next ? "collapsed" : "expanded") } catch { /* ignore */ }
      return next
    })
  }

  const si = PARTNER_STATUS[partner.status]
  const initial = (partner.displayName || partner.email || "S").charAt(0).toUpperCase()

  const stats = useMemo(() => {
    const products = catalog.data ?? []
    const opps = opportunities.data ?? []
    const qs = quotes.data ?? []
    return {
      activeProducts: products.filter(p => p.status === "active").length,
      totalProducts: products.length,
      openOpportunities: opps.length,
      totalQuotes: qs.length,
      acceptedQuotes: qs.filter(q => q.status.toLowerCase() === "accepted").length,
    }
  }, [catalog.data, opportunities.data, quotes.data])

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
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2" style={{ background: ORANGE }}>{initial}</div>
              <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{partner.displayName}</p>
              <p className="text-xs mt-0.5 break-all" style={{ color: S_MUTED }}>{partner.email}</p>
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
            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: ORANGE }}>{initial}</div>
          </div>
        ) : (
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-2" style={{ background: ORANGE }}>{initial}</div>
            <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{partner.displayName}</p>
            <p className="text-xs mt-0.5 break-all" style={{ color: S_MUTED }}>{partner.email}</p>
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
              <p className="text-xs text-gray-400 mt-0.5">Welcome back, {partner.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {partner.status === "invited" && (
              <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: "#92400E", background: "#FEF3C7" }}>
                <Clock className="h-3 w-3" /><span className="hidden sm:inline">Invite pending</span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 md:p-8">
          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Boxes}         label="Active products"   value={stats.activeProducts} sub={`${stats.totalProducts} total`} />
                <KpiCard icon={PackageSearch} label="Open opportunities" value={stats.openOpportunities} color={ORANGE} />
                <KpiCard icon={ClipboardList} label="Quotes submitted"  value={stats.totalQuotes} color={WINE_2} />
                <KpiCard icon={TrendingUp}    label="Quotes accepted"   value={stats.acceptedQuotes} color={GREEN} />
              </div>

              {partner.status === "active" ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Active Shaniid RX Supplier</p>
                    <p className="text-sm text-green-700 mt-0.5">Your account is active. Keep your catalog current and respond to opportunities to win orders.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">Account {si.label.toLowerCase()}</p>
                    <p className="text-sm text-amber-700 mt-0.5">Some features may be limited until your account is fully active. Contact your account manager if you need help.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Quick actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Boxes,         label: "Manage catalog",   action: () => setTab("catalog")       },
                    { icon: PackageSearch, label: "Opportunities",    action: () => setTab("opportunities") },
                    { icon: ClipboardList, label: "My quotes",        action: () => setTab("quotes")        },
                    { icon: ShieldCheck,   label: "KYC status",       action: () => setTab("kyc")           },
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

          {/* ── CATALOG ── */}
          {tab === "catalog" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Products you supply through the Shaniid RX platform</p>
                <Button size="sm" className="text-white text-xs gap-1" style={{ background: WINE }} onClick={() => setProductModal({ open: true, product: null })}>
                  <Plus className="h-3.5 w-3.5" />Add product
                </Button>
              </div>

              {catalog.isLoading ? (
                <LoadingState label="Loading your catalog…" />
              ) : catalog.error ? (
                <ErrorState label={catalog.error instanceof Error ? catalog.error.message : "Could not load catalog."} onRetry={() => catalog.mutate()} />
              ) : (catalog.data ?? []).length === 0 ? (
                <EmptyState icon={Boxes} title="No products yet" desc="Add your first product to start receiving sourcing opportunities." />
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b">
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">SKU</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold text-right">Unit price</th>
                        <th className="px-4 py-3 font-semibold text-right">MOQ</th>
                        <th className="px-4 py-3 font-semibold text-right">Lead</th>
                        <th className="px-4 py-3 font-semibold text-right">Stock</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(catalog.data ?? []).map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{p.productName}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku || "—"}</td>
                          <td className="px-4 py-3 text-gray-500">{p.category || "—"}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{fmtMoney(p.unitPrice, p.currency)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.moq.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.leadTimeDays}d</td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.stockQty.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={p.status === "active" ? { color: "#065F46", background: "#D1FAE5" } : { color: "#6B7280", background: "#F3F4F6" }}>
                              {p.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setProductModal({ open: true, product: p })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Edit">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── OPPORTUNITIES ── */}
          {tab === "opportunities" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Open sourcing needs from Shaniid RX — submit a quote to win the order</p>
                {opportunities.data && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: WINE, background: `${WINE}12` }}>
                    {opportunities.data.length} open
                  </span>
                )}
              </div>

              {opportunities.isLoading ? (
                <LoadingState label="Loading opportunities…" />
              ) : opportunities.error ? (
                <ErrorState label={opportunities.error instanceof Error ? opportunities.error.message : "Could not load opportunities."} onRetry={() => opportunities.mutate()} />
              ) : (opportunities.data ?? []).length === 0 ? (
                <EmptyState icon={PackageSearch} title="No open requests right now" desc="Shaniid RX posts sourcing needs here when stock requires replenishment. Check back soon." />
              ) : (
                <div className="space-y-3">
                  {(opportunities.data ?? []).map(req => {
                    const ub = statusBadge(URGENCY_BADGE, req.urgency)
                    return (
                      <div key={req.id} className="bg-white rounded-xl border border-gray-100 p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-800">{req.productName}</p>
                              {req.sku && <span className="text-xs text-gray-400 font-mono">SKU: {req.sku}</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: ub.color, background: ub.bg }}>{req.urgency}</span>
                            </div>
                            <p className="text-sm text-gray-600">Quantity needed: <strong>{req.quantityNeeded.toLocaleString()} units</strong></p>
                            {req.notes && <p className="text-xs text-gray-400 mt-1">{req.notes}</p>}
                            <p className="text-xs text-gray-300 mt-1">{new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              className="text-white text-xs gap-1"
                              style={{ background: WINE }}
                              disabled={partner.status !== "active"}
                              title={partner.status !== "active" ? "Your account must be active to submit quotes" : undefined}
                              onClick={() => setQuoteTarget(req)}
                            >
                              <FileText className="h-3.5 w-3.5" />Submit quote
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── QUOTES ── */}
          {tab === "quotes" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Quotes you've submitted and their current status</p>

              {quotes.isLoading ? (
                <LoadingState label="Loading your quotes…" />
              ) : quotes.error ? (
                <ErrorState label={quotes.error instanceof Error ? quotes.error.message : "Could not load quotes."} onRetry={() => quotes.mutate()} />
              ) : (quotes.data ?? []).length === 0 ? (
                <EmptyState icon={ClipboardList} title="No quotes yet" desc="Submit quotes from the Opportunities tab to see them tracked here." />
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b">
                        <th className="px-4 py-3 font-semibold">Submitted</th>
                        <th className="px-4 py-3 font-semibold text-right">Unit price</th>
                        <th className="px-4 py-3 font-semibold text-right">Quantity</th>
                        <th className="px-4 py-3 font-semibold text-right">Lead</th>
                        <th className="px-4 py-3 font-semibold text-right">Total</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(quotes.data ?? []).map((q: PartnerQuote) => {
                        const qb = statusBadge(QUOTE_STATUS_BADGE, q.status)
                        return (
                          <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">{new Date(q.submittedAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{fmtMoney(q.unitPrice)}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{q.quantity.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{q.leadTimeDays}d</td>
                            <td className="px-4 py-3 text-right font-medium" style={{ color: WINE }}>{fmtMoney(q.unitPrice * q.quantity)}</td>
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: qb.color, background: qb.bg }}>{q.status}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PURCHASE ORDERS ── */}
          {tab === "purchase-orders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Purchase orders placed by Shaniid RX to your account</p>
                {pos.data && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: WINE, background: `${WINE}12` }}>
                    {pos.data.length} order{pos.data.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {pos.isLoading ? (
                <LoadingState label="Loading purchase orders…" />
              ) : pos.error ? (
                <ErrorState label={pos.error instanceof Error ? pos.error.message : "Could not load purchase orders."} onRetry={() => pos.mutate()} />
              ) : (pos.data ?? []).length === 0 ? (
                <EmptyState icon={FileText} title="No purchase orders yet" desc="Shaniid RX will place purchase orders here once procurement is initiated." />
              ) : (
                <div className="space-y-3">
                  {(pos.data ?? []).map((po: PurchaseOrderSummary) => {
                    const statusColors: Record<string, { color: string; bg: string }> = {
                      draft:      { color: "#374151", bg: "#F3F4F6" },
                      sent:       { color: "#1D4ED8", bg: "#EFF6FF" },
                      confirmed:  { color: "#065F46", bg: "#D1FAE5" },
                      dispatched: { color: "#7C3AED", bg: "#EDE9FE" },
                      received:   { color: "#047857", bg: "#D1FAE5" },
                      disputed:   { color: "#DC2626", bg: "#FEE2E2" },
                      cancelled:  { color: "#6B7280", bg: "#F9FAFB" },
                    }
                    const sc = statusColors[po.status] ?? statusColors.draft
                    return (
                      <div key={po.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 flex flex-wrap items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-bold text-gray-800 font-mono">{po.poNumber}</p>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                                style={{ color: sc.color, background: sc.bg }}>
                                {po.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              Issued {new Date(po.createdAt).toLocaleDateString()}
                              {po.expectedDate && ` · Expected ${new Date(po.expectedDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <p className="font-bold text-lg" style={{ color: WINE }}>{fmtMoney(po.total)}</p>
                        </div>
                        {po.items.length > 0 && (
                          <div className="border-t border-gray-50">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-5 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Item</th>
                                  <th className="px-5 py-2 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
                                  <th className="px-5 py-2 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Unit</th>
                                  <th className="px-5 py-2 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {po.items.map((item) => (
                                  <tr key={item.id} className="border-t border-gray-50">
                                    <td className="px-5 py-2.5 text-gray-700">{item.name}</td>
                                    <td className="px-5 py-2.5 text-right text-gray-500">{item.qty.toLocaleString()}</td>
                                    <td className="px-5 py-2.5 text-right text-gray-500">{fmtMoney(item.unitPrice)}</td>
                                    <td className="px-5 py-2.5 text-right font-medium" style={{ color: WINE }}>{fmtMoney(item.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
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
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: partner.status === "active" ? `${GREEN}15` : `${ORANGE}15` }}>
                    <Shield className="h-7 w-7" style={{ color: partner.status === "active" ? GREEN : ORANGE }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">Trust Seal {partner.status === "active" ? "— Achieved" : "— In review"}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Complete your KYC documents to earn the Shaniid RX Trust Seal</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Business License", done: partner.status === "active" },
                    { label: "FDA / KEBS Certificate", done: partner.status === "active" },
                    { label: "Liability Insurance", done: partner.status === "active" },
                  ].map(({ label, done }) => (
                    <div key={label} className={`flex items-center gap-3 p-4 rounded-xl border ${done ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                      {done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                      <span className={`font-medium text-sm ${done ? "text-green-800" : "text-gray-500"}`}>{label}</span>
                      {!done && <span className="ml-auto text-xs text-gray-400">Pending review</span>}
                    </div>
                  ))}
                </div>

                {partner.status !== "active" && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    To submit missing documents, email them to <strong>kyc@shaniidrx.com</strong> with your account email <strong>{partner.email}</strong> in the subject line.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4">Account details</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Building2, label: "Display name", value: partner.displayName },
                    { icon: Mail,      label: "Email", value: partner.email },
                    { icon: Hash,      label: "Partner ID", value: partner.partnerId },
                    { icon: Star,      label: "Status", value: si.label },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-2.5 border-b border-gray-50">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-700 break-all">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-4">To update your profile details, contact your account manager at <span className="underline">suppliers@shaniidrx.com</span></p>
              </div>
              <PartnerTeamPanel type="supplier" />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {productModal.open && (
        <ProductModal
          initial={productModal.product}
          onClose={() => setProductModal({ open: false, product: null })}
          onSaved={() => setProductModal({ open: false, product: null })}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
        />
      )}
      {quoteTarget && (
        <QuoteModal
          opportunity={quoteTarget}
          onClose={() => setQuoteTarget(null)}
          onSubmitted={() => setQuoteTarget(null)}
        />
      )}
    </div>
  )
}

/* ─── Main Export ─────────────────────────────────────────────── */

export default function SupplierPortal() {
  const [location] = useLocation()
  const isAcceptMode = location.endsWith("/accept")
  const token = isAcceptMode
    ? new URLSearchParams(window.location.search).get("token") ?? ""
    : ""

  const me = usePartnerMe(!isAcceptMode)

  const handleLogout = async () => {
    try { await partnerSignout("supplier") } catch { /* ignore */ }
    await refreshPartnerMe()
  }

  if (isAcceptMode && token) {
    return <AcceptInviteScreen token={token} />
  }

  if (me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf9f8" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: WINE }} />
      </div>
    )
  }

  const partner = me.data?.ok ? me.data.partner : null
  if (!partner || me.error) {
    return <SupplierAuthScreen />
  }

  return <SupplierDashboard partner={partner} onLogout={handleLogout} />
}

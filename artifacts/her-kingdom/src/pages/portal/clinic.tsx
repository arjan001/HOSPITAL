"use client"

/**
 * Clinic Partner Portal — /portal/clinic (and /portal/clinic/accept)
 *
 * Backed by the real partner API via partners-client.ts. Auth is a server-side
 * signed token in an HttpOnly cookie — there is no client-held token and no
 * localStorage auth. Clinics either sign in, apply to join, or accept an invite
 * (set password) when arriving from an invite link.
 */

import { useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import {
  usePartnerMe, refreshPartnerMe,
  partnerLogin, partnerApply, partnerAcceptInvite, partnerSignout,
  useClinicProductLookup, useClinicOrders, useClinicLedger, placeClinicOrder,
  type PartnerAccount, type ClinicProduct, type ClinicOrderLine,
} from "@/lib/partners-client"
import { PartnerClerkDivider, PartnerClerkSignIn } from "@/components/portal/partner-clerk-signin"
import {
  Stethoscope, LogOut, ShoppingCart, ClipboardList, CreditCard,
  AlertTriangle, CheckCircle2, Eye, EyeOff, ArrowRight,
  Clock, Shield, Search, Plus, Minus, Trash2, Package, BarChart3,
  Building2, Mail, Phone, User, ChevronLeft, ChevronRight, Menu, X,
  Loader2, Receipt, Wallet, TrendingDown, TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

const WINE    = "#3D0814"
const WINE2   = "#6B0F1A"
const ORANGE  = "#F97316"
const RED      = "#B91C1C"
const GREEN   = "#15803D"
const S_TEXT  = "rgba(255,255,255,0.88)"
const S_MUTED = "rgba(255,255,255,0.45)"
const S_BORDER= "rgba(255,255,255,0.10)"

const ksh = (n: number) => `KSH ${Math.round(n || 0).toLocaleString()}`

/* ─── Brand panel (shared between auth + accept screens) ──────── */

function BrandPanel() {
  return (
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
          { icon: CreditCard,   title: "Flexible credit terms",       desc: "Access a credit line tailored to your facility size — place orders now, settle on your agreed terms." },
          { icon: ClipboardList,title: "Full order history",          desc: "Every order, delivery and invoice in one place, searchable for your records." },
          { icon: Shield,       title: "Guaranteed genuine medicine", desc: "All products carry the Trust Seal — verified at source and at dispatch." },
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
  )
}

/* ─── Auth screen (sign in / apply) ──────────────────────────── */

type AuthMode = "signin" | "apply"

function ClinicAuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin")

  // sign in
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)

  // apply
  const [orgName, setOrgName] = useState("")
  const [contactName, setContactName] = useState("")
  const [applyEmail, setApplyEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [applied, setApplied] = useState(false)

  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setBusy(true)
    try {
      await partnerLogin("clinic", email.trim().toLowerCase(), password)
      await refreshPartnerMe()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your details and try again.")
    } finally {
      setBusy(false)
    }
  }

  const doApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setBusy(true)
    try {
      await partnerApply({
        partnerType: "clinic",
        orgName: orgName.trim(),
        contactName: contactName.trim(),
        email: applyEmail.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      })
      setApplied(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application. Try again.")
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

          {/* Mode tabs */}
          <div className="inline-flex p-1 rounded-xl bg-gray-100 mb-6">
            <button
              onClick={() => { setMode("signin"); setError("") }}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={mode === "signin" ? { background: "#fff", color: WINE, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" } : { color: "#6b7280" }}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode("apply"); setError("") }}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={mode === "apply" ? { background: "#fff", color: WINE, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" } : { color: "#6b7280" }}
            >
              Apply to join
            </button>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          {mode === "signin" && (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Clinic sign in</h1>
              <p className="text-gray-500 text-sm mb-8">Use the email and password for your facility account.</p>
              <form onSubmit={doSignIn} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Facility email</Label>
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="procurement@yourclinic.co.ke" className="mt-1 h-11" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Password</Label>
                  <div className="relative mt-1">
                    <Input type={showPw ? "text" : "password"} required value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-10" />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={busy} className="w-full h-11 text-white font-semibold gap-2" style={{ background: WINE }}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in to your portal <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
              <PartnerClerkDivider />
              <PartnerClerkSignIn type="clinic" redirectPath="/portal/clinic" onError={setError} />
              <p className="text-xs text-gray-400 text-center mt-6">
                New facility? <button onClick={() => { setMode("apply"); setError("") }} className="underline" style={{ color: WINE }}>Apply to join</button>
              </p>
            </>
          )}

          {mode === "apply" && (
            applied ? (
              <div className="text-center py-10">
                <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${GREEN}15` }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: GREEN }} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Thanks — we'll review your application</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Our partnerships team will review your facility and email you next steps. This usually takes 1–2 business days.
                </p>
                <Button className="mt-6 text-white" style={{ background: WINE }} onClick={() => { setApplied(false); setMode("signin") }}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Apply to join</h1>
                <p className="text-gray-500 text-sm mb-8">Tell us about your facility and we'll get you set up.</p>
                <form onSubmit={doApply} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Facility / organisation name</Label>
                    <Input required value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Westlands Medical Centre" className="mt-1 h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Contact name</Label>
                    <Input required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Dr. Jane Doe" className="mt-1 h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <Input type="email" required value={applyEmail} onChange={e => setApplyEmail(e.target.value)} placeholder="procurement@yourclinic.co.ke" className="mt-1 h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" className="mt-1 h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Message <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="mt-1" placeholder="Tell us about your facility, monthly volumes, specialties…" />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full h-11 text-white font-semibold gap-2" style={{ background: ORANGE }}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit application <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              </>
            )
          )}

          <p className="text-xs text-gray-300 text-center mt-6">
            <Link href="/admin" className="hover:text-gray-500 transition-colors">Admin portal →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── Accept invite screen ───────────────────────────────────── */

function AcceptInviteScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirm) { setError("Passwords do not match."); return }
    setBusy(true)
    try {
      await partnerAcceptInvite(token, password)
      await refreshPartnerMe()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the invite. The link may have expired.")
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
          <p className="text-gray-500 text-sm mb-8">Create a password to activate your facility account.</p>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">New password</Label>
              <div className="relative mt-1">
                <Input type={showPw ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Confirm password</Label>
              <Input type={showPw ? "text" : "password"} required value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" className="mt-1 h-11" />
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

/* ─── Shared small UI ────────────────────────────────────────── */

function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 flex flex-col items-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: WINE }} />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>Try again</Button>
      )}
    </div>
  )
}

function EmptyBlock({ icon: Icon, title, desc, action }: {
  icon: typeof Package; title: string; desc: string; action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p className="font-medium text-gray-600">{title}</p>
      <p className="text-sm mt-1">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ─── Order medicines tab ────────────────────────────────────── */

function OrderTab({ creditAvailable }: { creditAvailable: number | null }) {
  const [q, setQ] = useState("")
  const lookup = useClinicProductLookup(q.trim(), q.trim().length >= 2)

  const [cart, setCart] = useState<ClinicOrderLine[]>([])
  const [creditLine, setCreditLine] = useState(true)
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [notes, setNotes] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [placedRef, setPlacedRef] = useState<string | null>(null)

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.qty * l.unitPrice, 0), [cart])
  const total = subtotal + (deliveryFee || 0)

  const addToCart = (p: ClinicProduct) => {
    setCart(prev => {
      const existing = prev.find(l => l.name === p.name)
      if (existing) return prev.map(l => l.name === p.name ? { ...l, qty: l.qty + 1 } : l)
      return [...prev, { name: p.name, qty: 1, unitPrice: p.price }]
    })
  }

  const setQty = (idx: number, qty: number) =>
    setCart(prev => prev.map((l, i) => i === idx ? { ...l, qty: Math.max(1, qty) } : l))
  const setPatient = (idx: number, patient: string) =>
    setCart(prev => prev.map((l, i) => i === idx ? { ...l, patient: patient || undefined } : l))
  const removeLine = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx))

  const overCredit = creditLine && creditAvailable !== null && total > creditAvailable

  const place = async () => {
    setSubmitError("")
    setSubmitting(true)
    try {
      const order = await placeClinicOrder({
        items: cart,
        deliveryAddress: deliveryAddress.trim() || undefined,
        deliveryFee: deliveryFee || undefined,
        creditLine,
        notes: notes.trim() || undefined,
      })
      setPlacedRef(order.orderRef)
      setCart([])
      setDeliveryAddress(""); setDeliveryFee(0); setNotes("")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to place order. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (placedRef) {
    return (
      <div className="max-w-2xl text-center py-16">
        <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${GREEN}15` }}>
          <CheckCircle2 className="h-8 w-8" style={{ color: GREEN }} />
        </div>
        <h3 className="font-bold text-gray-800 text-lg">Order placed</h3>
        <p className="text-gray-500 mt-2 text-sm">Reference <span className="font-mono font-semibold">{placedRef}</span>. You'll receive a confirmation shortly.</p>
        <Button className="mt-6 text-white" style={{ background: WINE }} onClick={() => setPlacedRef(null)}>
          Place another order
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* Product lookup */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-3">Find medicines &amp; products</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by product name…" className="pl-9 h-11" />
        </div>

        <div className="mt-3">
          {q.trim().length < 2 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Type at least 2 characters to search the catalogue.</p>
          ) : lookup.isLoading ? (
            <div className="py-6 text-center text-gray-400 flex items-center justify-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : lookup.error ? (
            <p className="text-sm text-red-600 py-4 text-center">{lookup.error instanceof Error ? lookup.error.message : "Search failed."}</p>
          ) : !lookup.data || lookup.data.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No products match "{q.trim()}".</p>
          ) : (
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg max-h-72 overflow-y-auto">
              {lookup.data.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {ksh(p.price)} · {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                      {p.requiresPrescription && <span className="ml-1.5 text-amber-600 font-medium">· Rx required</span>}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 text-xs flex-shrink-0" disabled={p.stock <= 0} onClick={() => addToCart(p)}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-800 text-sm mb-4">Order cart</h3>
        {cart.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Your cart is empty. Search above and add products.</p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-[1fr_120px_110px_1fr_32px] gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 px-0.5">
              <span>Product</span><span className="text-center">Qty</span><span>Line total</span><span>Patient (optional)</span><span />
            </div>
            {cart.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_110px_1fr_32px] gap-2 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{line.name}</p>
                  <p className="text-xs text-gray-400">{ksh(line.unitPrice)} each</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => setQty(idx, line.qty - 1)} className="h-7 w-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Minus className="h-3 w-3" /></button>
                  <Input type="number" min={1} value={line.qty} onChange={e => setQty(idx, Number(e.target.value))} className="h-7 w-12 text-center text-sm px-1" />
                  <button onClick={() => setQty(idx, line.qty + 1)} className="h-7 w-7 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-50"><Plus className="h-3 w-3" /></button>
                </div>
                <span className="text-sm font-medium" style={{ color: WINE }}>{ksh(line.qty * line.unitPrice)}</span>
                <Input value={line.patient ?? ""} onChange={e => setPatient(idx, e.target.value)} placeholder="Patient" className="text-sm h-9" />
                <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery + payment */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <Label className="text-sm font-semibold text-gray-700">Delivery address <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={2} className="mt-1.5" placeholder="Where should this order be delivered?" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">Delivery fee <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Input type="number" min={0} value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value) || 0)} className="mt-1.5 h-10 max-w-[180px]" placeholder="0" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="mt-1.5" placeholder="Urgency, cold chain, special instructions…" />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-700">Pay on credit line</p>
            <p className="text-xs text-gray-500 mt-0.5">{creditLine ? "Charged to your facility credit line." : "Settle this order in cash on delivery."}</p>
          </div>
          <Switch checked={creditLine} onCheckedChange={setCreditLine} />
        </div>

        {creditLine && creditAvailable !== null && (
          <p className="text-xs text-gray-500">Credit available: <span className="font-semibold" style={{ color: WINE }}>{ksh(creditAvailable)}</span></p>
        )}
      </div>

      {/* Summary + submit */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Subtotal</span><span>{ksh(subtotal)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Delivery fee</span><span>{ksh(deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-3 border-t mt-2 font-bold" style={{ color: WINE }}>
          <span>Total</span><span>{ksh(total)}</span>
        </div>

        {overCredit && (
          <p className="text-sm text-red-600 flex items-center gap-1 mt-3">
            <AlertTriangle className="h-4 w-4" />This exceeds your available credit. It may be rejected — switch off credit to pay cash.
          </p>
        )}
        {submitError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mt-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />{submitError}
          </div>
        )}

        <Button
          disabled={cart.length === 0 || subtotal <= 0 || submitting}
          onClick={place}
          className="w-full h-11 text-white font-semibold gap-2 mt-4"
          style={{ background: cart.length === 0 ? undefined : ORANGE }}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          {submitting ? "Placing order…" : "Place order"}
        </Button>
      </div>
    </div>
  )
}

/* ─── Orders tab ─────────────────────────────────────────────── */

function statusStyle(status: string): { color: string; bg: string } {
  const s = status.toLowerCase()
  if (s.includes("deliver") || s.includes("complete") || s.includes("paid")) return { color: "#065F46", bg: "#D1FAE5" }
  if (s.includes("reject") || s.includes("cancel") || s.includes("fail")) return { color: "#991B1B", bg: "#FEE2E2" }
  if (s.includes("pending") || s.includes("review") || s.includes("process")) return { color: "#92400E", bg: "#FEF3C7" }
  return { color: "#374151", bg: "#F3F4F6" }
}

function OrdersTab({ onPlace }: { onPlace: () => void }) {
  const orders = useClinicOrders()

  if (orders.isLoading) return <LoadingBlock label="Loading your orders…" />
  if (orders.error) return <ErrorBlock message={orders.error instanceof Error ? orders.error.message : "Could not load orders."} onRetry={() => orders.mutate()} />
  if (!orders.data || orders.data.length === 0) {
    return (
      <EmptyBlock
        icon={ClipboardList}
        title="No orders yet"
        desc="Orders you place will appear here with their status and totals."
        action={<Button className="text-white" style={{ background: WINE }} onClick={onPlace}><ShoppingCart className="h-4 w-4 mr-2" />Place your first order</Button>}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{orders.data.length} order{orders.data.length === 1 ? "" : "s"}</p>
        <Button size="sm" className="text-white text-xs" style={{ background: WINE }} onClick={onPlace}>
          <ShoppingCart className="h-3 w-3 mr-1" />Place order
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map(o => {
                const st = statusStyle(o.status)
                return (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{o.orderRef}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(o.placedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-500">{o.items.length}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full" style={o.creditLine ? { color: "#1D4ED8", background: "#EFF6FF" } : { color: "#374151", background: "#F3F4F6" }}>
                        {o.creditLine ? "Credit" : "Cash"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ color: st.color, background: st.bg }}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: WINE }}>{ksh(o.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── Ledger tab ─────────────────────────────────────────────── */

function txnIcon(type: string) {
  if (type === "payment") return { Icon: TrendingDown, color: GREEN }
  if (type === "charge") return { Icon: TrendingUp, color: RED }
  return { Icon: Receipt, color: "#6b7280" }
}

function LedgerTab() {
  const ledger = useClinicLedger()

  if (ledger.isLoading) return <LoadingBlock label="Loading credit ledger…" />
  if (ledger.error) return <ErrorBlock message={ledger.error instanceof Error ? ledger.error.message : "Could not load ledger."} onRetry={() => ledger.mutate()} />
  if (!ledger.data) return <ErrorBlock message="No ledger data available." onRetry={() => ledger.mutate()} />

  const { creditLimit, outstanding, available, transactions } = ledger.data
  const usedPct = creditLimit > 0 ? Math.min(100, (outstanding / creditLimit) * 100) : 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Wallet,     label: "Credit limit",  value: ksh(creditLimit), color: WINE },
          { icon: TrendingUp, label: "Outstanding",   value: ksh(outstanding), color: RED },
          { icon: CreditCard, label: "Available",     value: ksh(available),   color: GREEN },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: WINE }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-gray-700 text-sm">Credit utilisation</p>
          <p className="text-sm font-bold" style={{ color: usedPct > 80 ? RED : WINE }}>{usedPct.toFixed(0)}% used</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? RED : WINE }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">{ksh(outstanding)} outstanding of {ksh(creditLimit)} total</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">Transactions</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(t => {
              const { Icon, color } = txnIcon(t.type)
              return (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 capitalize">{t.type}{t.orderRef ? <span className="text-gray-400 font-normal"> · {t.orderRef}</span> : null}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}{t.note ? ` · ${t.note}` : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold" style={{ color: t.type === "payment" ? GREEN : t.type === "charge" ? RED : "#374151" }}>
                      {t.type === "payment" ? "−" : t.type === "charge" ? "+" : ""}{ksh(Math.abs(t.amount))}
                    </p>
                    <p className="text-xs text-gray-400">Bal {ksh(t.balanceAfter)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Dashboard ──────────────────────────────────────────────── */

type ClinicTab = "overview" | "order" | "orders" | "ledger" | "profile"

const CLINIC_TABS: { id: ClinicTab; label: string; icon: typeof Stethoscope }[] = [
  { id: "overview", label: "Overview",        icon: BarChart3     },
  { id: "order",    label: "Order Medicines", icon: ShoppingCart  },
  { id: "orders",   label: "My Orders",       icon: ClipboardList },
  { id: "ledger",   label: "Credit Ledger",   icon: CreditCard    },
  { id: "profile",  label: "Facility Profile",icon: Building2     },
]

function statusBadge(status: PartnerAccount["status"]): { color: string; bg: string; label: string } {
  if (status === "active") return { color: "#065F46", bg: "#D1FAE5", label: "Active" }
  if (status === "invited") return { color: "#92400E", bg: "#FEF3C7", label: "Invited" }
  return { color: "#991B1B", bg: "#FEE2E2", label: "Suspended" }
}

function ClinicDashboard({ partner, onLogout }: { partner: PartnerAccount; onLogout: () => void }) {
  const [tab, setTab] = useState<ClinicTab>("overview")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("shaniidrx.clinic.sidebar") === "collapsed" } catch { return false }
  })

  const ledger = useClinicLedger()
  const orders = useClinicOrders()

  const creditLimit = ledger.data?.creditLimit ?? null
  const outstanding = ledger.data?.outstanding ?? null
  const available = ledger.data?.available ?? null
  const usedPct = creditLimit && creditLimit > 0 && outstanding !== null ? Math.min(100, (outstanding / creditLimit) * 100) : 0

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem("shaniidrx.clinic.sidebar", next ? "collapsed" : "expanded") } catch { /* ignore */ }
      return next
    })
  }

  const badge = statusBadge(partner.status)

  return (
    <div className="min-h-screen flex" style={{ background: "#f8f7f5" }}>
      {/* Mobile overlay sidebar */}
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
              <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{partner.displayName}</p>
              <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
            </div>
            {available !== null && creditLimit !== null && (
              <div className="px-5 py-3" style={{ borderBottom: `1px solid ${S_BORDER}`, background: "rgba(0,0,0,0.15)" }}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: S_MUTED }}>Credit available</span>
                  <span className="font-bold" style={{ color: usedPct > 80 ? "#FCA5A5" : "#4ADE80" }}>{(100 - usedPct).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S_BORDER }}>
                  <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? "#EF4444" : "#4ADE80" }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: S_MUTED }}>{ksh(available)} of {ksh(creditLimit)}</p>
              </div>
            )}
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

      {/* Desktop collapsible sidebar */}
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
            <p className="font-semibold text-sm leading-tight" style={{ color: S_TEXT }}>{partner.displayName}</p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4" style={{ borderBottom: `1px solid ${S_BORDER}` }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Stethoscope className="h-4 w-4" style={{ color: ORANGE }} />
            </div>
          </div>
        )}

        {!collapsed && available !== null && creditLimit !== null && (
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${S_BORDER}`, background: "rgba(0,0,0,0.15)" }}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: S_MUTED }}>Credit available</span>
              <span className="font-bold" style={{ color: usedPct > 80 ? "#FCA5A5" : "#4ADE80" }}>{(100 - usedPct).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S_BORDER }}>
              <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: usedPct > 80 ? "#EF4444" : "#4ADE80" }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: S_MUTED }}>{ksh(available)} of {ksh(creditLimit)}</p>
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
              <p className="text-xs text-gray-400 mt-0.5">{partner.displayName} · {partner.email}</p>
            </div>
          </div>
          {partner.status !== "active" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: badge.color, background: badge.bg }}>
              <Clock className="h-3 w-3" /><span className="hidden sm:inline">{badge.label}</span>
            </span>
          )}
        </div>

        <div className="p-4 md:p-8">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: CreditCard, label: "Credit limit", value: creditLimit !== null ? ksh(creditLimit) : "—", color: WINE },
                  { icon: TrendingUp, label: "Outstanding",  value: outstanding !== null ? ksh(outstanding) : "—", color: RED },
                  { icon: Wallet,     label: "Available",    value: available !== null ? ksh(available) : "—", color: GREEN },
                  { icon: ShoppingCart, label: "Recent orders", value: orders.data ? orders.data.length : "—", color: ORANGE },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                      <p className="text-xl font-bold mt-0.5 truncate" style={{ color: WINE }}>
                        {ledger.isLoading && (label !== "Recent orders") ? <Loader2 className="h-4 w-4 animate-spin inline" /> : value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {ledger.error && (
                <ErrorBlock message={ledger.error instanceof Error ? ledger.error.message : "Could not load credit data."} onRetry={() => ledger.mutate()} />
              )}

              {partner.status === "active" && available !== null && creditLimit !== null && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Your facility is active</p>
                    <p className="text-sm text-green-700 mt-0.5">You can place orders immediately. Credit available: {ksh(available)} of {ksh(creditLimit)}.</p>
                  </div>
                </div>
              )}
              {partner.status === "invited" && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">Account setup pending</p>
                    <p className="text-sm text-amber-700 mt-0.5">Your account is being finalised. Some features may be limited until activation.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 text-sm mb-4">Quick actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: ShoppingCart, label: "Order Medicines", action: () => setTab("order")   },
                    { icon: ClipboardList,label: "My Orders",       action: () => setTab("orders")  },
                    { icon: CreditCard,   label: "Credit Ledger",   action: () => setTab("ledger")  },
                    { icon: Building2,    label: "My Profile",      action: () => setTab("profile") },
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
          {tab === "order" && <OrderTab creditAvailable={available} />}

          {/* ORDERS */}
          {tab === "orders" && <OrdersTab onPlace={() => setTab("order")} />}

          {/* LEDGER */}
          {tab === "ledger" && <LedgerTab />}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4">Facility profile</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Building2,   label: "Facility",    value: partner.displayName },
                    { icon: Mail,        label: "Email",       value: partner.email },
                    { icon: Shield,      label: "Status",      value: badge.label },
                    { icon: User,        label: "Account ID",  value: partner.id },
                    { icon: Phone,       label: "Last sign in", value: partner.lastLoginAt ? new Date(partner.lastLoginAt).toLocaleString() : "—" },
                    { icon: Clock,       label: "Member since", value: new Date(partner.createdAt).toLocaleDateString() },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 py-2.5 border-b border-gray-50">
                      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-medium text-gray-700 break-words">{value}</p>
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

/* ─── Main export ────────────────────────────────────────────── */

export default function ClinicPortal() {
  const [location, setLocation] = useLocation()
  const isAccept = location.endsWith("/accept")
  const token = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("token")
    : null

  const me = usePartnerMe(!isAccept)

  const handleLogout = async () => {
    try { await partnerSignout("clinic") } catch { /* ignore */ }
    await refreshPartnerMe()
  }

  if (isAccept && token) {
    return <AcceptInviteScreen token={token} onDone={() => setLocation("/portal/clinic")} />
  }

  if (me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: WINE }}>
        <div className="flex flex-col items-center gap-3 text-white/80">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">Loading your portal…</p>
        </div>
      </div>
    )
  }

  if (me.error || !me.data?.ok || me.data.partner.partnerType !== "clinic") {
    return <ClinicAuthScreen />
  }

  return <ClinicDashboard partner={me.data.partner} onLogout={handleLogout} />
}

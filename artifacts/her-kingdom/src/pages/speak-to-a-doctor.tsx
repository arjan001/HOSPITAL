import { useState, useRef, useEffect } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import {
  MessageSquare, Phone, Clock, Users, Check, Lock, ArrowLeft, ArrowRight,
  Send, Plus, ShieldCheck, Video, X, FileText, Stethoscope, Brain, Pill, HeartPulse,
} from "lucide-react"
import { DailyCall } from "@/components/video/daily-call"
import { useConsultationSettings, standbyDoctorOf } from "@/lib/consultation-settings"
import { PaystackPaymentModal } from "@/components/store/paystack-payment-modal"
import { pushAdminNotification } from "@/lib/notifications-client"

const CARD_PAYMENTS_ENABLED = import.meta.env.VITE_ENABLE_CARD_PAYMENTS === "true"

/* ── Palette (aligned with upload-prescription) ──────────── */
const WINE       = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORG = "#F97316"
const BORDER     = "#e5e7eb"
const SOFT_BG    = "#FFFBF5"
const PEACH_TINT = "#FFF1E6"
const CALL_BG    = "linear-gradient(145deg, #7B3A10 0%, #5A1C10 40%, #3D0814 100%)"

type Screen = "select" | "concern" | "payment" | "connecting" | "chat" | "videocall" | "summary"

/* ── Shared button styles ────────────────────────────────── */
const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`,
  color: "#fff",
  border: "none",
}
const btnOutline: React.CSSProperties = {
  background: "#fff",
  color: WINE,
  border: `1px solid ${BORDER}`,
}

/* ── Small helpers ───────────────────────────────────────── */
function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Seo
        title="Speak to a Doctor or Pharmacist"
        description="Book a private consultation with a Shaniid RX pharmacist or doctor. Chat or call — confidential advice, verified prescriptions, calm care."
        keywords={["online doctor Kenya","pharmacist consultation","tele-pharmacy","Shaniid RX doctor"]}
        canonicalPath="/speak-to-a-doctor"
      />
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: PEACH_TINT }}>
        <Check className="w-3 h-3" style={{ color: ACCENT_RED }} strokeWidth={2.5} />
      </div>
      <span style={{ color: "#374151" }}>{text}</span>
    </div>
  )
}

function DoctorAvatar({ size = 56, initials = "DR", avatarUrl }: { size?: number; initials?: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{
          width: size,
          height: size,
          border: "3px solid #fff",
          boxShadow: "0 4px 12px -4px rgba(185,28,28,0.3)",
        }}
      />
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`,
        border: "3px solid #fff",
        boxShadow: "0 4px 12px -4px rgba(185,28,28,0.3)",
      }}>
      <span className="text-white font-bold" style={{ fontSize: size * 0.32 }}>{initials}</span>
    </div>
  )
}

/** Realistic step text tied to the connection progress bar. */
function connectStep(pct: number, doctorName: string): string {
  if (pct < 25) return "Establishing secure connection…"
  if (pct < 55) return "Verifying doctor availability…"
  if (pct < 85) return "Preparing your consultation room…"
  return `Connecting to ${doctorName}…`
}

/* ── Shell ───────────────────────────────────────────────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar /><Navbar />
      <main className="flex-1 bg-white">{children}</main>
      <Footer />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════*/
export default function SpeakToADoctorPage() {
  const [consultSettings] = useConsultationSettings()
  const doc = standbyDoctorOf(consultSettings)
  const [screen,     setScreen]     = useState<Screen>("select")
  const [consType,   setConsType]   = useState<"chat" | "call">("chat")
  const [category,   setCategory]   = useState("")
  const [symptoms,   setSymptoms]   = useState("")
  const [payMethod,  setPayMethod]  = useState<"mpesa" | "card">("mpesa")
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [paystackOpen, setPaystackOpen] = useState(false)
  const [connectPct, setConnectPct] = useState(0)
  const [callTimer,  setCallTimer]  = useState(480)
  const [messages,   setMessages]   = useState<{ from: "doctor"|"user"; text: string; time: string }[]>([])
  const [input,      setInput]      = useState("")
  const [typing,     setTyping]     = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* connecting progress */
  useEffect(() => {
    if (screen !== "connecting") return
    setConnectPct(0)
    const t = setInterval(() => setConnectPct(p => { if (p >= 100) { clearInterval(t); return 100 } return p + 2 }), 55)
    return () => clearInterval(t)
  }, [screen])

  useEffect(() => {
    if (connectPct < 100) return
    const timer = setTimeout(() => {
      if (consType === "chat") {
        setMessages([{
          from: "doctor",
          text: `Hello! I'm ${doc.name}. I understand you're experiencing: "${category || "General concern"}". I'm here to help. Can you tell me more about when these symptoms started?`,
          time: "Just now",
        }])
        setScreen("chat")
      } else {
        setScreen("videocall")
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [connectPct])

  /* call countdown */
  useEffect(() => {
    if (screen !== "videocall") return
    const t = setInterval(() => setCallTimer(s => { if (s <= 0) { clearInterval(t); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [screen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setMessages(m => [...m, { from: "user", text, time: now }])
    setInput("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, {
        from: "doctor",
        text: "Thank you for sharing. Based on what you've described, I'd recommend we look at a few treatment options. I'll prepare a detailed assessment for you shortly.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }])
    }, 2200)
  }

  const fee = consType === "chat" ? 1000 : 1500
  const fmtTime = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`

  /* ══════════════════ SELECT ══════════════════════════════ */
  if (screen === "select") return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-10 lg:py-14">
        {/* Breadcrumb */}
        <nav className="text-xs mb-6 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:underline">Services</Link>
          <span>/</span>
          <span style={{ color: WINE }}>Speak to a Doctor</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: WINE }}>Speak to a Doctor</h1>
          <p className="text-sm mt-2" style={{ color: "#6b7280" }}>
            Choose your preferred consultation method. A licensed doctor will be available within minutes.
          </p>
        </div>

        {/* Availability strip — minimal */}
        <div
          className="flex items-center gap-3 rounded-lg px-4 py-3 mb-8"
          style={{ background: SOFT_BG, border: `1px solid ${BORDER}` }}
        >
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <p className="text-sm font-semibold" style={{ color: WINE }}>3 doctors available now</p>
          <span className="text-sm" style={{ color: "#6b7280" }}>· average response 2–5 min</span>
        </div>

        {/* Consultation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Chat card */}
          <div className="rounded-xl bg-white p-6 flex flex-col" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: PEACH_TINT }}>
                <MessageSquare className="h-5 w-5" style={{ color: ACCENT_RED }} />
              </div>
              <div className="text-right">
                <p className="font-bold text-base" style={{ color: WINE }}>KSh 1,000</p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>one-time</p>
              </div>
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: WINE }}>Chat Consultation</h2>
            <p className="text-sm mb-4" style={{ color: "#6b7280" }}>Text-based consultation with a licensed doctor</p>
            <div className="flex items-center gap-4 text-xs mb-5" style={{ color: "#6b7280" }}>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 5 min</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Available now</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#6b7280" }}>What's included</p>
            <div className="space-y-2 flex-1">
              {["Instant messaging","Share images & reports","Written prescription","Follow-up support"].map(f => <Feature key={f} text={f} />)}
            </div>
            <button
              onClick={() => { setConsType("chat"); setScreen("concern") }}
              className="mt-6 w-full h-11 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
              style={btnPrimary}
            >
              Select Chat Consultation
            </button>
          </div>

          {/* Call card */}
          <div className="rounded-xl bg-white p-6 flex flex-col" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: PEACH_TINT }}>
                <Phone className="h-5 w-5" style={{ color: ACCENT_RED }} />
              </div>
              <div className="text-right">
                <p className="font-bold text-base" style={{ color: WINE }}>KSh 1,500</p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>one-time</p>
              </div>
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: WINE }}>Call Consultation</h2>
            <p className="text-sm mb-4" style={{ color: "#6b7280" }}>Voice or video call with a licensed doctor</p>
            <div className="flex items-center gap-4 text-xs mb-5" style={{ color: "#6b7280" }}>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 10 min</span>
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Available now</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#6b7280" }}>What's included</p>
            <div className="space-y-2 flex-1">
              {["Face-to-face interaction","Real-time diagnosis","Detailed consultation","Prescription & notes"].map(f => <Feature key={f} text={f} />)}
            </div>
            <button
              onClick={() => { setConsType("call"); setScreen("concern") }}
              className="mt-6 w-full h-11 rounded-full font-semibold text-sm transition-opacity hover:opacity-90"
              style={btnPrimary}
            >
              Select Call Consultation
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: <ShieldCheck className="h-4 w-4" />, title: "Licensed Doctors",  sub: "Board certified & verified" },
            { icon: <Lock className="h-4 w-4" />,        title: "Private & Secure",   sub: "End-to-end encrypted" },
            { icon: <Check className="h-4 w-4" />,       title: "No Hidden Fees",     sub: "Pay once, no subscriptions" },
          ].map(b => (
            <div key={b.title} className="rounded-lg bg-white px-4 py-3 flex items-start gap-3" style={{ border: `1px solid ${BORDER}` }}>
              <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: PEACH_TINT, color: ACCENT_RED }}>
                {b.icon}
              </span>
              <div>
                <p className="font-semibold text-sm" style={{ color: WINE }}>{b.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )

  /* ══════════════════ CONCERN ═════════════════════════════ */
  if (screen === "concern") {
    const cats = [
      { key: "general",   label: "General Consultation", icon: <Stethoscope className="h-5 w-5" /> },
      { key: "pharmacy",  label: "Pharmacy Query",       icon: <Pill className="h-5 w-5" /> },
      { key: "mental",    label: "Mental Health",        icon: <Brain className="h-5 w-5" /> },
      { key: "other",     label: "Others",               icon: <HeartPulse className="h-5 w-5" /> },
    ]
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
          <nav className="text-xs mb-6 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
            <Link href="/" className="hover:underline">Home</Link>
            <span>/</span>
            <button onClick={() => setScreen("select")} className="hover:underline">Speak to a Doctor</button>
            <span>/</span>
            <span style={{ color: WINE }}>Your Concern</span>
          </nav>

          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ color: WINE }}>Tell us about your concern</h1>
            <p className="text-sm mt-2" style={{ color: "#6b7280" }}>
              This helps us connect you with the right specialist.
            </p>
          </div>

          <div className="space-y-7">
            {/* Categories */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-3" style={{ color: "#6b7280" }}>
                Quick Categories <span className="normal-case font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cats.map(c => {
                  const selected = category === c.label
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(prev => prev === c.label ? "" : c.label)}
                      className="flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-white transition-all text-center"
                      style={{
                        border: `1.5px solid ${selected ? ACCENT_RED : BORDER}`,
                        background: selected ? PEACH_TINT : "#fff",
                      }}
                    >
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: selected ? "#fff" : PEACH_TINT, color: ACCENT_RED }}>
                        {c.icon}
                      </span>
                      <span className="text-xs font-semibold leading-tight" style={{ color: WINE }}>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-3" style={{ color: "#6b7280" }}>
                Describe your symptoms <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                rows={5}
                value={symptoms}
                maxLength={500}
                onChange={e => setSymptoms(e.target.value)}
                placeholder="E.g., I've been experiencing headaches for the past 3 days, especially in the morning…"
                className="w-full px-4 py-3 rounded-lg text-sm resize-none outline-none transition-shadow focus:shadow-sm bg-white"
                style={{ border: `1px solid ${BORDER}`, color: WINE }}
              />
              <p className="text-xs mt-1.5" style={{ color: "#9ca3af" }}>{symptoms.length}/500 characters</p>
            </div>

            {/* Privacy notice */}
            <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ background: SOFT_BG, border: `1px solid ${BORDER}` }}>
              <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: WINE }}>Your information is secure</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                  All consultations are confidential and protected by medical privacy laws.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScreen("select")}
                className="h-11 px-6 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors"
                style={btnOutline}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={() => setScreen("payment")}
                className="h-11 px-8 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                style={btnPrimary}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  /* ══════════════════ PAYMENT ═════════════════════════════ */
  if (screen === "payment") return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <nav className="text-xs mb-6 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <button onClick={() => setScreen("select")} className="hover:underline">Speak to a Doctor</button>
          <span>/</span>
          <span style={{ color: WINE }}>Payment</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: WINE }}>Payment Authorization</h1>
          <p className="text-sm mt-2" style={{ color: "#6b7280" }}>
            Secure your consultation slot. You'll only be charged once a doctor connects.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — payment + info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Authorization info */}
            <div className="rounded-xl bg-white p-5" style={{ border: `1px solid ${BORDER}` }}>
              <p className="font-semibold text-sm mb-2.5" style={{ color: WINE }}>Authorization only — not an immediate charge</p>
              <ul className="space-y-1.5 text-sm" style={{ color: "#6b7280" }}>
                {[
                  "Payment is processed only once the doctor connects with you.",
                  "If no doctor connects within 15 minutes, you will not be charged.",
                  "Full refund if the consultation is cancelled or interrupted.",
                ].map(t => (
                  <li key={t} className="flex gap-2">
                    <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment method */}
            <div className="rounded-xl bg-white p-5" style={{ border: `1px solid ${BORDER}` }}>
              <p className="font-semibold text-sm mb-3" style={{ color: WINE }}>Payment Method</p>

              <div className="space-y-2.5">
                {/* M-PESA */}
                <label
                  className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: `1.5px solid ${payMethod === "mpesa" ? ACCENT_RED : BORDER}`,
                    background: payMethod === "mpesa" ? PEACH_TINT : "#fff",
                  }}
                >
                  <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: payMethod === "mpesa" ? ACCENT_RED : "#d1d5db" }}>
                    {payMethod === "mpesa" && <span className="w-2 h-2 rounded-full" style={{ background: ACCENT_RED }} />}
                  </span>
                  <input type="radio" className="sr-only" checked={payMethod === "mpesa"} onChange={() => setPayMethod("mpesa")} />
                  <span className="flex-1 text-sm font-semibold" style={{ color: WINE }}>M-PESA</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "#fff", color: "#6b7280", border: `1px solid ${BORDER}` }}>
                    Powered by Paystack
                  </span>
                </label>

                {payMethod === "mpesa" && (
                  <div className="px-4">
                    <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "#6b7280" }}>
                      M-PESA Phone Number
                    </label>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={e => setMpesaPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full h-11 px-3 rounded-lg text-sm outline-none transition-shadow focus:shadow-sm"
                      style={{ border: `1px solid ${BORDER}`, color: WINE }}
                    />
                  </div>
                )}

                {CARD_PAYMENTS_ENABLED && (
                  <label
                    className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                    style={{
                      border: `1.5px solid ${payMethod === "card" ? ACCENT_RED : BORDER}`,
                      background: payMethod === "card" ? PEACH_TINT : "#fff",
                    }}
                  >
                    <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: payMethod === "card" ? ACCENT_RED : "#d1d5db" }}>
                      {payMethod === "card" && <span className="w-2 h-2 rounded-full" style={{ background: ACCENT_RED }} />}
                    </span>
                    <input type="radio" className="sr-only" checked={payMethod === "card"} onChange={() => setPayMethod("card")} />
                    <span className="flex-1 text-sm font-semibold" style={{ color: WINE }}>Credit / Debit Card</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="rounded-xl bg-white p-5 h-fit" style={{ border: `1px solid ${BORDER}` }}>
            <p className="font-semibold text-sm mb-4" style={{ color: WINE }}>Order Summary</p>

            <div className="space-y-3 pb-4 mb-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6b7280" }}>Consultation Type</span>
                <span className="font-semibold" style={{ color: WINE }}>{consType === "chat" ? "Chat" : "Call"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6b7280" }}>Duration</span>
                <span className="font-semibold" style={{ color: WINE }}>{consType === "chat" ? "5 min" : "10 min"}</span>
              </div>
              {category && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#6b7280" }}>Concern</span>
                  <span className="font-semibold text-right" style={{ color: WINE }}>{category}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pb-4 mb-4 text-sm" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div className="flex justify-between">
                <span style={{ color: "#6b7280" }}>Consultation Fee</span>
                <span className="font-semibold" style={{ color: WINE }}>KSh {fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#6b7280" }}>Service Fee</span>
                <span className="font-semibold" style={{ color: WINE }}>KSh 0</span>
              </div>
            </div>

            <div className="flex justify-between mb-5">
              <span className="font-bold text-sm" style={{ color: WINE }}>Total</span>
              <span className="font-bold text-base" style={{ color: ACCENT_RED }}>KSh {fee.toLocaleString()}</span>
            </div>

            <button
              onClick={() => setPaystackOpen(true)}
              disabled={payMethod === "mpesa" && mpesaPhone.trim().length < 10}
              className="w-full h-12 rounded-full font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
              style={btnPrimary}
            >
              Pay KSh {fee.toLocaleString()} & Connect
            </button>
            <p className="text-xs text-center mt-3" style={{ color: "#9ca3af" }}>
              Payment is required before the doctor connects.
            </p>
            <PaystackPaymentModal
              isOpen={paystackOpen}
              onClose={() => setPaystackOpen(false)}
              total={fee}
              defaultPhone={mpesaPhone}
              createPendingOrder={async () => ({ orderNumber: `CONS-${Date.now()}` })}
              onPaymentConfirmed={() => {
                setPaystackOpen(false)
                setScreen("connecting")
                // Notify the doctor audience that a new consultation has been paid and is connecting.
                void pushAdminNotification({
                  audience: "doctor",
                  module: "Consultations",
                  level: "alert",
                  title: "New consultation booked",
                  body: `A patient has paid for a ${consType === "chat" ? "Chat" : "Call/Video"} consultation (${category || "General"}). Connecting now.`,
                  href: "/admin/consultations",
                })
                void pushAdminNotification({
                  audience: "admin",
                  module: "Consultations",
                  level: "info",
                  title: "Consultation payment received",
                  body: `KSh ${fee.toLocaleString()} received for ${consType} consultation (${category || "General"}).`,
                  href: "/admin/consultations",
                })
              }}
            />

            <button
              onClick={() => setScreen("concern")}
              className="w-full h-11 rounded-full font-semibold text-sm mt-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              style={btnOutline}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )

  /* ══════════════════ CONNECTING ══════════════════════════ */
  if (screen === "connecting") {
    /* CALL — keep the dramatic dark fullscreen for immersion */
    if (consType === "call") return (
      <div className="fixed inset-0 flex flex-col" style={{ background: CALL_BG }}>
        <div className="flex items-start justify-between p-6 z-10">
          <div className="rounded-xl bg-white px-4 py-2.5 shadow-lg">
            <p className="font-semibold text-xs" style={{ color: "#9ca3af" }}>Connecting to</p>
            <p className="font-bold text-sm" style={{ color: WINE }}>{doc.name}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2.5 shadow-lg">
            <p className="font-bold text-sm" style={{ color: WINE }}>{fmtTime(callTimer)}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            {/* Soft pulsing halo to make the wait feel alive */}
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: ACCENT_ORG, opacity: 0.18 }} />
            <div
              className="relative w-48 h-48 rounded-full flex items-center justify-center"
              style={{
                background: doc.avatarUrl ? "transparent" : `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`,
                border: "4px solid rgba(255,255,255,0.2)",
                boxShadow: "0 0 60px rgba(249,115,22,0.3)",
                overflow: "hidden",
              }}
            >
              {doc.avatarUrl
                ? <img src={doc.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-5xl">{doc.initials}</span>}
            </div>
          </div>
          <p className="mt-6 text-white font-bold text-lg">{doc.name}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>{doc.specialty} · {doc.yearsExperience} yrs experience</p>
        </div>

        <div className="px-10 pb-10">
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${connectPct}%`, background: `linear-gradient(90deg, ${ACCENT_ORG}, ${ACCENT_RED})` }} />
          </div>
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{connectStep(connectPct, doc.name)}</p>
        </div>
      </div>
    )

    /* CHAT — clean white loading */
    return (
      <Shell>
        <div className="mx-auto max-w-md px-4 py-14 text-center">
          <div className="flex justify-center mb-6 relative">
            <span className="absolute inset-0 m-auto w-[108px] h-[108px] rounded-full animate-ping" style={{ background: ACCENT_ORG, opacity: 0.12 }} />
            <DoctorAvatar size={108} initials={doc.initials} avatarUrl={doc.avatarUrl} />
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: WINE }}>Connecting to Doctor</h2>
          <p className="font-semibold text-sm" style={{ color: ACCENT_RED }}>{doc.name}</p>
          <p className="text-xs mb-8" style={{ color: "#6b7280" }}>{doc.specialty} · {doc.yearsExperience} years experience</p>

          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: BORDER }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${connectPct}%`, background: `linear-gradient(90deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)` }} />
          </div>
          <p className="text-xs mb-10" style={{ color: "#6b7280" }}>{connectStep(connectPct, doc.name)}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg bg-white p-4 text-left" style={{ border: `1px solid ${BORDER}` }}>
              <div className="w-8 h-8 rounded-md flex items-center justify-center mb-2"
                style={{ background: PEACH_TINT, color: ACCENT_RED }}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="font-semibold text-xs" style={{ color: WINE }}>Payment Authorized</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>Not charged yet</p>
            </div>
            <div className="rounded-lg bg-white p-4 text-left" style={{ border: `1px solid ${BORDER}` }}>
              <div className="w-8 h-8 rounded-md flex items-center justify-center mb-2"
                style={{ background: PEACH_TINT, color: ACCENT_RED }}>
                <Lock className="h-4 w-4" />
              </div>
              <p className="font-semibold text-xs" style={{ color: WINE }}>Secure Connection</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>End-to-end encrypted</p>
            </div>
          </div>

          <div className="rounded-lg px-4 py-3 text-left flex items-start gap-3"
            style={{ background: SOFT_BG, border: `1px solid ${BORDER}` }}>
            <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: WINE }}>You will only be charged once {doc.name} connects</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#6b7280" }}>Estimated connection time: 30–60 seconds</p>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  /* ══════════════════ VIDEO CALL ══════════════════════════ */
  if (screen === "videocall") return (
    <DailyCall
      roomName={`consult-${(category || "general").toLowerCase().replace(/\s+/g, "-").slice(0, 20)}-${Math.floor(Date.now() / 1000 / 600)}`}
      userName="Patient"
      title={doc.name}
      subtitle={`${doc.specialty} · Connected`}
      consultationKind="video"
      patientName="Patient"
      doctorName={doc.name}
      topic={category || doc.specialty}
      onSwitchToChat={() => setScreen("chat")}
      onLeave={() => setScreen("summary")}
    />
  )

  /* ══════════════════ CHAT ════════════════════════════════ */
  if (screen === "chat") return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar /><Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Doctor header — clean white */}
        <div className="px-6 py-4 flex items-center justify-between bg-white" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <DoctorAvatar size={42} initials={doc.initials} avatarUrl={doc.avatarUrl} />
            <div>
              <p className="font-bold text-sm" style={{ color: WINE }}>{doc.name}</p>
              <p className="text-xs flex items-center gap-1.5" style={{ color: "#6b7280" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> {doc.specialty} · Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setScreen("summary")}
            className="h-9 px-5 rounded-full font-semibold text-xs transition-opacity hover:opacity-90"
            style={btnPrimary}
          >
            End Consultation
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3" style={{ background: SOFT_BG }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm"
                style={{
                  background: m.from === "doctor" ? "#fff" : ACCENT_RED,
                  color: m.from === "doctor" ? WINE : "#fff",
                  border: m.from === "doctor" ? `1px solid ${BORDER}` : "none",
                }}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <p className="text-[10px] mt-1 opacity-60">{m.time}</p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2.5 bg-white shadow-sm" style={{ border: `1px solid ${BORDER}` }}>
                <p className="text-xs italic" style={{ color: "#6b7280" }}>Doctor is typing…</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 bg-white" style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3 rounded-full px-4 py-2"
            style={{ border: `1px solid ${BORDER}` }}>
            <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
              <Plus className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Type your message…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: WINE }}
            />
            <button
              onClick={sendMessage}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-90"
              style={btnPrimary}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )

  /* ══════════════════ SUMMARY ═════════════════════════════ */
  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-4 py-10 lg:py-14">
        <nav className="text-xs mb-6 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <span style={{ color: WINE }}>Consultation Summary</span>
        </nav>

        <div className="mb-8 flex items-start gap-4">
          <DoctorAvatar size={52} initials={doc.initials} avatarUrl={doc.avatarUrl} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: WINE }}>Consultation Summary</h1>
            <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
              {doc.name} · {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Diagnosis */}
          <div className="rounded-xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ background: PEACH_TINT, color: ACCENT_RED }}>
                <FileText className="h-4 w-4" />
              </span>
              <p className="font-semibold text-sm" style={{ color: WINE }}>Diagnosis & Recommendations</p>
            </div>

            <div className="text-sm mb-4 pb-4" style={{ color: "#374151", borderBottom: `1px solid ${BORDER}` }}>
              <span className="font-semibold" style={{ color: WINE }}>Diagnosis:</span> Common cold with mild symptoms
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6b7280" }}>Recommendations</p>
            <ul className="space-y-1.5 text-sm mb-4" style={{ color: "#374151" }}>
              {[
                "Get adequate rest (7–8 hours of sleep)",
                "Stay hydrated — drink plenty of water",
                "Take prescribed medication as directed",
                "Monitor temperature twice daily",
              ].map(r => (
                <li key={r} className="flex gap-2">
                  <Check className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
                  {r}
                </li>
              ))}
            </ul>

            <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: SOFT_BG, border: `1px solid ${BORDER}`, color: WINE }}>
              <strong>Follow-up:</strong> If symptoms persist beyond 5 days or worsen, please consult again.
            </div>
          </div>

          {/* Recommended medicine */}
          <div className="rounded-xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ background: PEACH_TINT, color: ACCENT_RED }}>
                <Pill className="h-4 w-4" />
              </span>
              <p className="font-semibold text-sm" style={{ color: WINE }}>Recommended Medicine</p>
            </div>

            <div className="rounded-lg p-4 flex items-center gap-4" style={{ background: SOFT_BG, border: `1px solid ${BORDER}` }}>
              <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <Pill className="h-7 w-7" style={{ color: ACCENT_RED }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: WINE }}>Paracetamol 500mg</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>Take 1 tablet every 8 hours</p>
                <p className="font-bold text-sm mt-1" style={{ color: ACCENT_RED }}>KSh 800</p>
              </div>
              <button
                className="h-10 px-5 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
                style={btnPrimary}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={() => setScreen("select")}
            className="h-11 px-6 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors"
            style={btnOutline}
          >
            <ArrowLeft className="h-4 w-4" /> New Consultation
          </button>
          <Link
            href="/shop"
            className="h-11 px-8 rounded-full text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={btnPrimary}
          >
            Continue Shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Shell>
  )
}

import { useState, useRef, useEffect } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { MessageSquare, Phone, Clock, Users, Check, Lock, ChevronLeft, Send, Plus, ShieldCheck } from "lucide-react"

/* ── Palette ─────────────────────────────────────────────── */
const WINE      = "#3D0814"
const WINE_CARD = "#7A2535"          // dark consultation card
const PEACH_CARD= "#FAE0BE"          // light consultation card
const PEACH_MED = "#F5CFA0"          // medium peach for inputs/textareas
const GRAD      = "linear-gradient(135deg, #F5D4A8 0%, #C47880 100%)"
const GRAD_DARK = "linear-gradient(135deg, #C47880 0%, #7A2535 100%)"
const ACCENT    = "#B91C1C"
const ORG       = "#F97316"

type Screen = "select" | "concern" | "payment" | "connecting" | "chat" | "summary"

/* ── Gradient banner ─────────────────────────────────────── */
function GradBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl px-6 py-5" style={{ background: GRAD }}>
      {children}
    </div>
  )
}

/* ── Feature check row ──────────────────────────────────── */
function Feature({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: light ? "rgba(255,255,255,0.25)" : PEACH_CARD }}
      >
        <Check className="w-3 h-3" style={{ color: light ? "#fff" : ACCENT }} strokeWidth={2.5} />
      </div>
      <span style={{ color: light ? "rgba(255,255,255,0.92)" : "#374151" }}>{text}</span>
    </div>
  )
}

/* ── Custom radio ────────────────────────────────────────── */
function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm py-3 px-4 rounded-xl" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: checked ? ACCENT : "#d1d5db" }}>
        {checked && <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />}
      </span>
      <span style={{ color: WINE }}>{label}</span>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
    </label>
  )
}

/* ── Doctor avatar placeholder ───────────────────────────── */
function DoctorAvatar({ size = 56 }: { size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: GRAD, border: "2.5px solid #fff" }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.3 }}>SK</span>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function SpeakToADoctorPage() {
  const [screen,      setScreen]      = useState<Screen>("select")
  const [consType,    setConsType]    = useState<"chat" | "call">("chat")
  const [category,    setCategory]    = useState("")
  const [symptoms,    setSymptoms]    = useState("")
  const [payMethod,   setPayMethod]   = useState("mpesa")
  const [connectPct,  setConnectPct]  = useState(0)
  const [messages,    setMessages]    = useState<{ from: "doctor" | "user"; text: string; time: string }[]>([])
  const [input,       setInput]       = useState("")
  const [typing,      setTyping]      = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* Auto-advance connecting screen */
  useEffect(() => {
    if (screen !== "connecting") return
    const t = setInterval(() => {
      setConnectPct((p) => {
        if (p >= 100) { clearInterval(t); return 100 }
        return p + 2
      })
    }, 60)
    return () => clearInterval(t)
  }, [screen])

  useEffect(() => {
    if (connectPct >= 100) {
      const timer = setTimeout(() => {
        setMessages([{
          from: "doctor",
          text: `Hello! I'm Dr. Salad Khalif. I understand you're experiencing: "${category || "General concern"}". I'm here to help. Can you tell me more about when these symptoms started?`,
          time: "Just now",
        }])
        setScreen("chat")
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [connectPct])

  /* Auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setMessages((m) => [...m, { from: "user", text, time: now }])
    setInput("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, {
        from: "doctor",
        text: "Thank you for sharing. Based on what you've described, I'd recommend we look at a few treatment options. I'll prepare a detailed assessment for you shortly.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }])
    }, 2200)
  }

  const fee = consType === "chat" ? 1000 : 1500

  /* ─────────────────────────────────────── SCREEN: select ─ */
  if (screen === "select") return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold" style={{ color: WINE }}>Speak to a Doctor</h1>
          <p className="mt-2 text-base" style={{ color: "#6b7280" }}>Choose your preferred consultation method</p>
        </div>

        {/* Availability banner */}
        <GradBanner>
          <div className="flex items-center gap-4">
            <Users className="h-6 w-6 flex-shrink-0" style={{ color: WINE }} />
            <div>
              <p className="font-semibold" style={{ color: WINE }}>3 Doctors Available Now</p>
              <p className="text-sm" style={{ color: WINE_CARD }}>Average response time: 2–5 minutes</p>
            </div>
          </div>
        </GradBanner>

        {/* Consultation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
          {/* Chat */}
          <div className="rounded-3xl overflow-hidden" style={{ background: PEACH_CARD }}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(61,8,20,0.12)" }}>
                  <MessageSquare className="h-6 w-6" style={{ color: WINE }} />
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-sm" style={{ color: WINE }}>KSH 1,000</p>
                  <p className="text-xs" style={{ color: WINE_CARD }}>one-time</p>
                </div>
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: WINE }}>Chat Consultation</h2>
              <p className="text-sm mb-4" style={{ color: "#4b5563" }}>Text-based consultation with a licensed doctor</p>
              <div className="flex items-center gap-4 text-xs mb-5" style={{ color: WINE_CARD }}>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 5 min</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Available now</span>
              </div>
              <p className="text-xs font-bold mb-2" style={{ color: WINE }}>What's included:</p>
              <div className="space-y-1.5">
                {["Instant messaging","Share images & reports","Written prescription","Follow-up support"].map(f => <Feature key={f} text={f} />)}
              </div>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => { setConsType("chat"); setScreen("concern") }}
                className="w-full h-12 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(61,8,20,0.12)", color: WINE }}
              >
                Select Chat Consultation
              </button>
            </div>
          </div>

          {/* Call */}
          <div className="rounded-3xl overflow-hidden" style={{ background: WINE_CARD }}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-sm text-white">KSH 1500</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>one-time</p>
                </div>
              </div>
              <h2 className="text-xl font-bold mb-1 text-white">Call Consultation</h2>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.75)" }}>Voice or video call with a licensed doctor</p>
              <div className="flex items-center gap-4 text-xs mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 10 min</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Available now</span>
              </div>
              <p className="text-xs font-bold mb-2 text-white">What's included:</p>
              <div className="space-y-1.5">
                {["Face-to-face interaction","Real-time diagnosis","Detailed consultation","Prescription & notes"].map(f => <Feature key={f} text={f} light />)}
              </div>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => { setConsType("call"); setScreen("concern") }}
                className="w-full h-12 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              >
                Select Call Consultation
              </button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { title: "Licensed Doctors", sub: "Board certified & verified" },
            { title: "Private & Secure",  sub: "End-to-end encrypted" },
            { title: "No Hidden Fees",    sub: "Pay once, no subscriptions" },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl p-5" style={{ background: PEACH_CARD }}>
              <p className="font-bold text-sm" style={{ color: WINE }}>{b.title}</p>
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{b.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )

  /* ────────────────────────────────────── SCREEN: concern ─ */
  if (screen === "concern") return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold" style={{ color: WINE }}>Tell us about your concern</h1>
          <p className="mt-2 text-base" style={{ color: "#6b7280" }}>This helps us connect you with the right specialist</p>
        </div>

        {/* Categories */}
        <p className="font-bold mb-4" style={{ color: WINE }}>Quick Categories <span className="font-normal text-gray-400">(Optional)</span></p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
          {[
            { key: "general",  label: "General Consultation", emoji: "🩺" },
            { key: "pharmacy", label: "General Consultation",  emoji: "🧰" },
            { key: "mental",   label: "Mental Health",         emoji: "🧠" },
            { key: "other",    label: "Others",                emoji: "💊" },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key === category ? "" : c.label)}
              className="flex items-center gap-3 text-left"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span
                className="text-base font-medium"
                style={{ color: category === c.label ? ACCENT : WINE,
                  textDecoration: category === c.label ? "underline" : "none" }}
              >
                {c.label}
              </span>
            </button>
          ))}
        </div>

        {/* Symptoms textarea */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📋</span>
            <p className="font-bold" style={{ color: WINE }}>Describe your symptoms <span className="font-normal text-gray-400">(Optional)</span></p>
          </div>
          <textarea
            rows={5}
            value={symptoms}
            maxLength={500}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="E.g., I've been experiencing headaches for the past 3 days, especially in the morning…"
            className="w-full px-5 py-4 rounded-2xl text-sm resize-none outline-none"
            style={{ background: PEACH_MED, border: "none", color: WINE }}
          />
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{symptoms.length}/500 characters</p>
        </div>

        {/* Security notice */}
        <GradBanner>
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: WINE }} />
            <div>
              <p className="font-bold text-sm" style={{ color: WINE }}>Your information is secure</p>
              <p className="text-sm mt-0.5" style={{ color: WINE_CARD }}>
                All consultations are confidential and protected by medical privacy laws. Your data is encrypted and never shared.
              </p>
            </div>
          </div>
        </GradBanner>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setScreen("select")}
            className="flex-1 h-12 rounded-2xl font-bold text-sm"
            style={{ background: PEACH_CARD, color: WINE }}
          >
            Back
          </button>
          <button
            onClick={() => setScreen("payment")}
            className="flex-1 h-12 rounded-2xl font-bold text-sm text-white"
            style={{ background: WINE_CARD }}
          >
            Continue
          </button>
        </div>
      </div>
    </Shell>
  )

  /* ────────────────────────────────────── SCREEN: payment ─ */
  if (screen === "payment") return (
    <Shell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Availability confirmed */}
        <GradBanner>
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm" style={{ color: WINE }}>Doctor availability confirmed</p>
              <p className="text-sm" style={{ color: WINE_CARD }}>A doctor will be ready to connect with you after payment authorization</p>
            </div>
          </div>
        </GradBanner>

        <button
          onClick={() => setScreen("connecting")}
          className="w-full h-12 rounded-2xl font-bold text-sm text-white mt-4 mb-8"
          style={{ background: WINE_CARD }}
        >
          Continue Payment
        </button>

        <h2 className="text-2xl font-bold" style={{ color: WINE }}>Payment Authorization</h2>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Secure your consultation slot</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Authorization info */}
            <div className="rounded-2xl p-5" style={{ background: PEACH_CARD }}>
              <p className="font-bold text-sm mb-3" style={{ color: WINE }}>Authorization Only — Not an Immediate Charge</p>
              <ul className="space-y-2 text-sm" style={{ color: "#374151" }}>
                {[
                  "Payment will only be processed once the doctor connects with you.",
                  "If no doctor connects within 15 minutes, you will NOT be charged.",
                  "Full refund if consultation is cancelled or interrupted.",
                ].map((t) => <li key={t} className="flex gap-2"><span className="mt-1 flex-shrink-0">•</span>{t}</li>)}
              </ul>
            </div>

            {/* Payment form */}
            <div>
              <p className="font-bold text-sm mb-3" style={{ color: WINE }}>Secure Payment Information</p>
              <div className="rounded-2xl p-5 space-y-3" style={{ background: GRAD }}>
                <p className="font-semibold text-sm" style={{ color: WINE }}>Cardholder Name</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Card Number","EXP Number","CVC","Name On Card"].map(pl => (
                    <input key={pl} placeholder={pl}
                      className="h-10 px-3 rounded-lg text-sm outline-none w-full"
                      style={{ background: "#fff", border: "none", color: WINE }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: WINE_CARD }}>Expiration Date (MM/Y)</p>
                <div className="grid grid-cols-2 gap-2">
                  {["CVC","Name On Card"].map(pl => (
                    <input key={pl} placeholder={pl}
                      className="h-10 px-3 rounded-lg text-sm outline-none w-full"
                      style={{ background: "#fff", border: "none", color: WINE }}
                    />
                  ))}
                </div>
                <div className="space-y-2 mt-2">
                  {["Credit/Debit Card","Paypal","Master Card","Mpesa"].map(m => (
                    <Radio key={m} checked={payMethod === m.toLowerCase().replace(/\s/g,"")} onChange={() => setPayMethod(m.toLowerCase().replace(/\s/g,""))} label={m} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column — Order Summary */}
          <div className="rounded-2xl p-6" style={{ background: GRAD }}>
            <p className="font-bold mb-3" style={{ color: WINE }}>Order Summary</p>
            <div className="h-px mb-4" style={{ background: "rgba(61,8,20,0.15)" }} />
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs" style={{ color: WINE_CARD }}>Consultation Type</p>
                <p className="font-bold" style={{ color: WINE }}>{consType === "chat" ? "Chat Consultation" : "Call Consultation"}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: WINE_CARD }}>Estimated Duration</p>
                <p className="font-bold" style={{ color: WINE }}>{consType === "chat" ? "5 minutes" : "10 minutes"}</p>
              </div>
              {category && (
                <div>
                  <p className="text-xs" style={{ color: WINE_CARD }}>Your Concern</p>
                  <span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold text-white" style={{ background: WINE_CARD }}>{category}</span>
                </div>
              )}
            </div>
            <div className="h-px mb-4" style={{ background: "rgba(61,8,20,0.15)" }} />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#374151" }}>Consultation Fee</span>
                <span className="font-bold" style={{ color: ACCENT }}>KSh {fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#374151" }}>Service Fee</span>
                <span className="font-bold" style={{ color: "#374151" }}>0 KSH</span>
              </div>
              <div className="h-px my-2" style={{ background: "rgba(61,8,20,0.15)" }} />
              <div className="flex justify-between">
                <span className="font-bold" style={{ color: WINE }}>Total Authorization</span>
                <span className="font-bold" style={{ color: ACCENT }}>KSh {fee.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => setScreen("connecting")}
              className="w-full h-12 rounded-2xl font-bold text-sm mt-6"
              style={{ background: PEACH_CARD, color: WINE }}
            >
              Authorize & Start Consultation
            </button>
            <p className="text-xs text-center mt-3" style={{ color: WINE_CARD }}>
              By authorizing, you agree that payment will be processed only when connected to a doctor.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )

  /* ────────────────────────────────────── SCREEN: connecting ─ */
  if (screen === "connecting") return (
    <Shell>
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        {/* Doctor avatar */}
        <div className="flex justify-center mb-5">
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center"
            style={{ background: GRAD, border: "4px solid #e5e7eb" }}
          >
            <span className="text-white font-extrabold text-3xl">SK</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: WINE }}>Connecting to Doctor</h2>
        <p className="font-semibold" style={{ color: WINE_CARD }}>DR. Salad Khalif</p>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>General Practice · 12 years experience</p>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "#e5e7eb" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${connectPct}%`, background: `linear-gradient(90deg, ${ORG} 0%, ${ACCENT} 100%)` }}
          />
        </div>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>Confirming Payment Authorized…</p>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl p-5" style={{ background: PEACH_CARD }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(61,8,20,0.12)" }}>
              <span className="text-lg">💳</span>
            </div>
            <p className="font-bold text-sm" style={{ color: WINE }}>Payment Authorized</p>
            <p className="text-xs mt-0.5" style={{ color: ACCENT }}>Not charged yet</p>
          </div>
          <div className="rounded-2xl p-5 text-white" style={{ background: WINE_CARD }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.15)" }}>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold text-sm">Secure Connection</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,220,190,0.85)" }}>End-to-end encrypted</p>
          </div>
        </div>

        {/* Charge notice */}
        <GradBanner>
          <div className="flex items-start gap-3 text-left">
            <span className="text-xl flex-shrink-0">💲</span>
            <div>
              <p className="font-bold text-sm" style={{ color: WINE }}>You will only be charged once Dr. Salad connects with you</p>
              <p className="text-sm mt-0.5" style={{ color: WINE_CARD }}>Estimated connection time: 30–60 seconds</p>
            </div>
          </div>
        </GradBanner>

        <p className="text-xs mt-4" style={{ color: "#9ca3af" }}>
          If the doctor doesn't connect within 15 minutes, your authorization will be automatically cancelled.
        </p>
      </div>
    </Shell>
  )

  /* ────────────────────────────────────── SCREEN: chat ─ */
  if (screen === "chat") return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar />
      <Navbar />
      <main className="flex-1 flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {/* Doctor header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: GRAD }}
        >
          <div className="flex items-center gap-3">
            <DoctorAvatar size={48} />
            <div>
              <p className="font-bold" style={{ color: WINE }}>DR. Salad Khalif</p>
              <p className="text-xs flex items-center gap-1.5" style={{ color: WINE_CARD }}>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                General Practice
              </p>
            </div>
          </div>
          <button
            onClick={() => setScreen("summary")}
            className="h-9 px-5 rounded-xl font-bold text-sm text-white"
            style={{ background: WINE_CARD }}
          >
            End Consultation
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-white">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-5 py-3"
                style={{
                  background: m.from === "doctor" ? PEACH_CARD : WINE_CARD,
                  color: m.from === "doctor" ? WINE : "#fff",
                }}
              >
                <p className="text-sm leading-relaxed">{m.text}</p>
                <p className="text-xs mt-1 opacity-60">{m.time}</p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-end">
              <div className="rounded-2xl px-5 py-3" style={{ background: PEACH_CARD }}>
                <p className="text-sm" style={{ color: WINE }}>Typing….</p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "#e5e7eb" }}>
          <div
            className="flex items-center gap-3 rounded-full px-4 py-2"
            style={{ border: `1.5px solid ${ORG}`, background: "#fff" }}
          >
            <button type="button" style={{ color: ACCENT }}>
              <Plus className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: WINE }}
            />
            <button
              onClick={sendMessage}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: ORG }}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )

  /* ────────────────────────────────────── SCREEN: summary ─ */
  return (
    <Shell>
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Diagnosis card */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: PEACH_CARD, border: `1.5px solid ${ORG}` }}>
          <p className="text-sm mb-3" style={{ color: WINE }}>
            <strong>Diagnosis:</strong> Common cold with mild symptoms
          </p>
          <p className="font-bold text-sm mb-2" style={{ color: WINE }}>Recommendations:</p>
          <ul className="space-y-1 text-sm mb-3" style={{ color: "#374151" }}>
            {[
              "Get adequate rest (7–8 hours of sleep)",
              "Stay hydrated — drink plenty of water",
              "Take prescribed medication as directed",
              "Monitor temperature twice daily",
            ].map(r => <li key={r} className="flex gap-2"><span>•</span>{r}</li>)}
          </ul>
          <p className="text-sm" style={{ color: WINE }}>
            <strong>Follow-up:</strong> If symptoms persist beyond 5 days or worsen, please consult again.
          </p>
        </div>

        {/* Recommended medicines */}
        <h3 className="font-bold text-lg mb-4" style={{ color: WINE }}>Recommended Medicines</h3>
        <div className="rounded-2xl p-6 mb-8" style={{ border: `1.5px solid ${ORG}` }}>
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: WINE_CARD }}
            >
              <span className="text-3xl">💊</span>
            </div>
            <p className="font-bold text-lg" style={{ color: WINE }}>Paracetamol 500mg</p>
            <p className="text-sm mb-2" style={{ color: "#6b7280" }}>Take 1 tablet every 8 hours</p>
            <p className="font-bold mb-4" style={{ color: WINE }}>KSH 800</p>
            <button
              className="h-10 px-6 rounded-xl text-sm font-semibold"
              style={{ background: PEACH_CARD, color: WINE }}
            >
              + Add To Cart
            </button>
          </div>
        </div>

        <Link
          href="/shop"
          className="block w-full h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center"
          style={{ background: WINE_CARD }}
        >
          Go to the shop
        </Link>
      </div>
    </Shell>
  )
}

/* ── Shell wrapper (with TopBar + Navbar + Footer) ──────── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar />
      <Navbar />
      <main className="flex-1 bg-white">{children}</main>
      <Footer />
    </div>
  )
}

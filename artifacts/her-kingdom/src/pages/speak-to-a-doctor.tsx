import { useState, useRef, useEffect } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import {
  MessageSquare, Phone, Clock, Users, Check, Lock,
  Send, Plus, ShieldCheck, Video, PhoneOff, X,
} from "lucide-react"

/* ── Palette ─────────────────────────────────────────────── */
const WINE      = "#3D0814"
const WINE_CARD = "#7A2535"
const PEACH_CARD= "#FAE0BE"
const PEACH_MED = "#F5CFA0"
const GRAD      = "linear-gradient(135deg, #F5D4A8 0%, #C47880 100%)"
const ACCENT    = "#B91C1C"
const ORG       = "#F97316"
const CALL_BG   = "linear-gradient(145deg, #7B3A10 0%, #5A1C10 40%, #3D0814 100%)"

type Screen = "select" | "concern" | "payment" | "connecting" | "chat" | "videocall" | "summary"

/* ── Small helpers ───────────────────────────────────────── */
function GradBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl px-6 py-5" style={{ background: GRAD }}>
      {children}
    </div>
  )
}

function Feature({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: light ? "rgba(255,255,255,0.22)" : "rgba(61,8,20,0.14)" }}>
        <Check className="w-3 h-3" style={{ color: light ? "#fff" : ACCENT }} strokeWidth={2.5} />
      </div>
      <span style={{ color: light ? "rgba(255,255,255,0.88)" : "#374151" }}>{text}</span>
    </div>
  )
}

function Radio({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm py-3 px-4 rounded-xl"
      style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: checked ? ACCENT : "#d1d5db" }}>
        {checked && <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />}
      </span>
      <span style={{ color: WINE }}>{label}</span>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
    </label>
  )
}

function DoctorAvatar({ size = 56 }: { size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: GRAD, border: "3px solid rgba(255,255,255,0.3)" }}>
      <span className="text-white font-bold" style={{ fontSize: size * 0.28 }}>SK</span>
    </div>
  )
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
  const [screen,     setScreen]     = useState<Screen>("select")
  const [consType,   setConsType]   = useState<"chat" | "call">("chat")
  const [category,   setCategory]   = useState("")
  const [symptoms,   setSymptoms]   = useState("")
  const [payMethod,  setPayMethod]  = useState("mpesa")
  const [connectPct, setConnectPct] = useState(0)
  const [callTimer,  setCallTimer]  = useState(480)   // 8 min countdown
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
          text: `Hello! I'm Dr. Salad Khalif. I understand you're experiencing: "${category || "General concern"}". I'm here to help. Can you tell me more about when these symptoms started?`,
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

  const selectCategory = (label: string) =>
    setCategory(p => p === label ? "" : label)

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
      {/* Full-width hero strip */}
      <div className="w-full px-6 lg:px-16 py-14" style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 100%)" }}>
        <div className="text-center mb-10">
          <h1 className="text-4xl lg:text-5xl font-extrabold" style={{ color: WINE }}>Speak to a Doctor</h1>
          <p className="mt-3 text-base lg:text-lg" style={{ color: "#6b7280" }}>Choose your preferred consultation method</p>
        </div>

        {/* Availability banner — full width */}
        <div className="rounded-2xl px-8 py-5 mb-8" style={{ background: GRAD }}>
          <div className="flex items-center gap-4">
            <Users className="h-7 w-7 flex-shrink-0" style={{ color: WINE }} />
            <div>
              <p className="font-bold text-lg" style={{ color: WINE }}>3 Doctors Available Now</p>
              <p className="text-sm" style={{ color: WINE_CARD }}>Average response time: 2–5 minutes</p>
            </div>
          </div>
        </div>

        {/* Consultation cards — side by side, wide */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat card */}
          <div className="rounded-3xl overflow-hidden flex flex-col" style={{ background: PEACH_CARD }}>
            <div className="p-8 flex-1">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(61,8,20,0.12)" }}>
                  <MessageSquare className="h-7 w-7" style={{ color: WINE }} />
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-base" style={{ color: WINE }}>KSH 1,000</p>
                  <p className="text-xs" style={{ color: WINE_CARD }}>one-time</p>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: WINE }}>Chat Consultation</h2>
              <p className="text-sm mb-5" style={{ color: "#4b5563" }}>Text-based consultation with a licensed doctor</p>
              <div className="flex items-center gap-5 text-xs mb-6" style={{ color: WINE_CARD }}>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> 5 min</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Available now</span>
              </div>
              <p className="text-xs font-bold mb-3" style={{ color: WINE }}>What's included:</p>
              <div className="space-y-2">
                {["Instant messaging","Share images & reports","Written prescription","Follow-up support"].map(f => <Feature key={f} text={f} />)}
              </div>
            </div>
            <div className="px-8 pb-7">
              <button onClick={() => { setConsType("chat"); setScreen("concern") }}
                className="w-full h-13 py-3.5 rounded-2xl font-bold text-base transition-opacity hover:opacity-80"
                style={{ background: "rgba(61,8,20,0.13)", color: WINE }}>
                Select Chat Consultation
              </button>
            </div>
          </div>

          {/* Call card */}
          <div className="rounded-3xl overflow-hidden flex flex-col" style={{ background: WINE_CARD }}>
            <div className="p-8 flex-1">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <Phone className="h-7 w-7 text-white" />
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-base text-white">KSH 1,500</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>one-time</p>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-1 text-white">Call Consultation</h2>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.72)" }}>Voice or video call with a licensed doctor</p>
              <div className="flex items-center gap-5 text-xs mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> 10 min</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Available now</span>
              </div>
              <p className="text-xs font-bold mb-3 text-white">What's included:</p>
              <div className="space-y-2">
                {["Face-to-face interaction","Real-time diagnosis","Detailed consultation","Prescription & notes"].map(f => <Feature key={f} text={f} light />)}
              </div>
            </div>
            <div className="px-8 pb-7">
              <button onClick={() => { setConsType("call"); setScreen("concern") }}
                className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-opacity hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                Select Call Consultation
              </button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
          {[
            { title: "Licensed Doctors",  sub: "Board certified & verified" },
            { title: "Private & Secure",   sub: "End-to-end encrypted" },
            { title: "No Hidden Fees",     sub: "Pay once, no subscriptions" },
          ].map(b => (
            <div key={b.title} className="rounded-2xl p-6" style={{ background: PEACH_CARD }}>
              <p className="font-bold" style={{ color: WINE }}>{b.title}</p>
              <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{b.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )

  /* ══════════════════ CONCERN ═════════════════════════════ */
  if (screen === "concern") return (
    <Shell>
      <div className="w-full px-6 lg:px-16 py-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl lg:text-5xl font-extrabold" style={{ color: WINE }}>Tell us about your concern</h1>
          <p className="mt-3 text-base" style={{ color: "#6b7280" }}>This helps us connect you with the right specialist</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Category selector boxes */}
          <div>
            <p className="font-bold text-lg mb-4" style={{ color: WINE }}>
              Quick Categories <span className="text-base font-normal text-gray-400">(Optional)</span>
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: "general",   label: "General Consultation", emoji: "🩺" },
                { key: "pharmacy",  label: "Pharmacy Query",        emoji: "🧰" },
                { key: "mental",    label: "Mental Health",         emoji: "🧠" },
                { key: "other",     label: "Others",                emoji: "💊" },
              ].map(c => {
                const selected = category === c.label
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => selectCategory(c.label)}
                    className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl transition-all text-center"
                    style={{
                      border: `2px solid ${selected ? ACCENT : "#e5e7eb"}`,
                      background: selected ? "#FFF1E6" : "#fff",
                      boxShadow: selected ? "0 4px 16px -6px rgba(185,28,28,0.22)" : "none",
                    }}
                  >
                    <span className="text-4xl">{c.emoji}</span>
                    <span className="text-sm font-semibold leading-tight" style={{ color: selected ? ACCENT : WINE }}>{c.label}</span>
                    {selected && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ACCENT }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Symptoms textarea */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📋</span>
              <p className="font-bold text-lg" style={{ color: WINE }}>
                Describe your symptoms <span className="text-base font-normal text-gray-400">(Optional)</span>
              </p>
            </div>
            <textarea
              rows={5}
              value={symptoms}
              maxLength={500}
              onChange={e => setSymptoms(e.target.value)}
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
                <p className="font-bold" style={{ color: WINE }}>Your information is secure</p>
                <p className="text-sm mt-0.5" style={{ color: WINE_CARD }}>
                  All consultations are confidential and protected by medical privacy laws. Your data is encrypted and never shared.
                </p>
              </div>
            </div>
          </GradBanner>

          {/* Actions */}
          <div className="flex gap-4">
            <button onClick={() => setScreen("select")}
              className="flex-1 h-13 py-3.5 rounded-2xl font-bold text-base transition-opacity hover:opacity-80"
              style={{ background: PEACH_CARD, color: WINE }}>
              Back
            </button>
            <button onClick={() => setScreen("payment")}
              className="flex-1 py-3.5 rounded-2xl font-bold text-base text-white transition-opacity hover:opacity-90"
              style={{ background: WINE_CARD }}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )

  /* ══════════════════ PAYMENT ═════════════════════════════ */
  if (screen === "payment") return (
    <Shell>
      <div className="w-full px-6 lg:px-16 py-12">
        <GradBanner>
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold" style={{ color: WINE }}>Doctor availability confirmed</p>
              <p className="text-sm" style={{ color: WINE_CARD }}>A doctor will be ready to connect with you after payment authorization</p>
            </div>
          </div>
        </GradBanner>

        <button onClick={() => setScreen("connecting")}
          className="w-full py-3.5 rounded-2xl font-bold text-base text-white mt-4 mb-10 transition-opacity hover:opacity-90"
          style={{ background: WINE_CARD }}>
          Continue Payment
        </button>

        <h2 className="text-2xl font-bold mb-1" style={{ color: WINE }}>Payment Authorization</h2>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>Secure your consultation slot</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left */}
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: PEACH_CARD }}>
              <p className="font-bold mb-3" style={{ color: WINE }}>Authorization Only — Not an Immediate Charge</p>
              <ul className="space-y-2 text-sm" style={{ color: "#374151" }}>
                {["Payment will only be processed once the doctor connects with you.",
                  "If no doctor connects within 15 minutes, you will NOT be charged.",
                  "Full refund if consultation is cancelled or interrupted.",
                ].map(t => <li key={t} className="flex gap-2"><span className="mt-0.5 flex-shrink-0">•</span>{t}</li>)}
              </ul>
            </div>

            <div>
              <p className="font-bold mb-3" style={{ color: WINE }}>Secure Payment Information</p>
              <div className="rounded-2xl p-6 space-y-3" style={{ background: GRAD }}>
                <p className="font-semibold text-sm" style={{ color: WINE }}>Cardholder Name</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Card Number","EXP Number","CVC","Name On Card"].map(pl => (
                    <input key={pl} placeholder={pl}
                      className="h-10 px-3 rounded-lg text-sm outline-none w-full"
                      style={{ background: "#fff", color: WINE }} />
                  ))}
                </div>
                <div className="space-y-2 mt-1">
                  {["Credit/Debit Card","Paypal","Master Card","Mpesa"].map(m => (
                    <Radio key={m} checked={payMethod === m.toLowerCase().replace(/\s/g,"")} onChange={() => setPayMethod(m.toLowerCase().replace(/\s/g,""))} label={m} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — Order Summary */}
          <div className="rounded-2xl p-7" style={{ background: GRAD }}>
            <p className="font-bold text-lg mb-3" style={{ color: WINE }}>Order Summary</p>
            <div className="h-px mb-5" style={{ background: "rgba(61,8,20,0.15)" }} />
            <div className="space-y-4 mb-5">
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
                  <p className="text-xs mb-1" style={{ color: WINE_CARD }}>Your Concern</p>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: WINE_CARD }}>{category}</span>
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
            <button onClick={() => setScreen("connecting")}
              className="w-full py-3.5 rounded-2xl font-bold text-base mt-6 transition-opacity hover:opacity-80"
              style={{ background: PEACH_CARD, color: WINE }}>
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

  /* ══════════════════ CONNECTING ══════════════════════════ */
  if (screen === "connecting") {
    /* ── CALL: full-screen dark gradient ── */
    if (consType === "call") return (
      <div className="fixed inset-0 flex flex-col" style={{ background: CALL_BG }}>
        {/* Top badges */}
        <div className="flex items-start justify-between p-6 z-10">
          <div className="rounded-2xl px-5 py-3" style={{ background: PEACH_CARD }}>
            <p className="font-bold text-sm" style={{ color: WINE }}>Connecting to Doctor</p>
            <p className="text-sm" style={{ color: WINE_CARD }}>DR. Salad Khalif</p>
          </div>
          <div className="rounded-2xl px-5 py-3" style={{ background: PEACH_CARD }}>
            <p className="font-bold text-sm" style={{ color: WINE }}>8 Mins</p>
          </div>
        </div>

        {/* Doctor avatar — center */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-52 h-52 rounded-full flex items-center justify-center"
            style={{ background: GRAD, border: "4px solid rgba(255,255,255,0.2)", boxShadow: "0 0 60px rgba(245,212,168,0.25)" }}
          >
            <span className="text-white font-extrabold text-5xl">SK</span>
          </div>
        </div>

        {/* Progress */}
        <div className="px-10 pb-10">
          <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${connectPct}%`, background: PEACH_CARD }} />
          </div>
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Connecting…</p>
        </div>
      </div>
    )

    /* ── CHAT: centered loading screen ── */
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: GRAD, border: "4px solid #e5e7eb" }}>
              <span className="text-white font-extrabold text-3xl">SK</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: WINE }}>Connecting to Doctor</h2>
          <p className="font-semibold" style={{ color: WINE_CARD }}>DR. Salad Khalif</p>
          <p className="text-sm mb-8" style={{ color: "#6b7280" }}>General Practice · 12 years experience</p>

          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "#e5e7eb" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${connectPct}%`, background: `linear-gradient(90deg, ${ORG} 0%, ${ACCENT} 100%)` }} />
          </div>
          <p className="text-sm mb-10" style={{ color: "#6b7280" }}>Confirming Payment Authorized…</p>

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

          <GradBanner>
            <div className="flex items-start gap-3 text-left">
              <span className="text-xl flex-shrink-0">💲</span>
              <div>
                <p className="font-bold text-sm" style={{ color: WINE }}>You will only be charged once Dr. Salad connects with you</p>
                <p className="text-sm mt-0.5" style={{ color: WINE_CARD }}>Estimated connection time: 30–60 seconds</p>
              </div>
            </div>
          </GradBanner>
        </div>
      </Shell>
    )
  }

  /* ══════════════════ VIDEO CALL ══════════════════════════ */
  if (screen === "videocall") return (
    <div className="fixed inset-0 flex flex-col" style={{ background: CALL_BG }}>
      {/* Top badges */}
      <div className="flex items-start justify-between p-5 z-10">
        <div className="rounded-2xl px-5 py-3" style={{ background: PEACH_CARD }}>
          <p className="font-bold text-sm" style={{ color: WINE }}>DR. Salad Khalif</p>
          <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: WINE_CARD }}>
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> General Practice
          </p>
        </div>
        <div className="rounded-2xl px-5 py-3 font-bold text-sm" style={{ background: PEACH_CARD, color: WINE }}>
          {fmtTime(callTimer)}
        </div>
      </div>

      {/* User's camera — top right */}
      <div className="absolute top-4 right-5 z-20">
        <div className="w-32 h-24 rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4a3020 0%, #2a1010 100%)", border: "2px solid rgba(255,255,255,0.15)" }}>
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-60">👤</span>
          </div>
        </div>
      </div>

      {/* Doctor avatar — center */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-52 h-52 rounded-full flex items-center justify-center"
          style={{ background: GRAD, border: "4px solid rgba(255,255,255,0.2)", boxShadow: "0 0 80px rgba(245,212,168,0.2)" }}
        >
          <span className="text-white font-extrabold text-5xl">SK</span>
        </div>
      </div>

      {/* Control bar */}
      <div className="pb-12 flex items-center justify-center gap-5">
        {[
          { icon: <Video className="h-6 w-6" />,    action: () => {} },
          { icon: <Phone className="h-6 w-6" />,    action: () => {} },
          { icon: <MessageSquare className="h-6 w-6" />, action: () => setScreen("chat") },
          { icon: <X className="h-6 w-6 text-white" />, action: () => setScreen("summary"), dark: true },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{ background: btn.dark ? ACCENT : PEACH_CARD, color: btn.dark ? "#fff" : WINE }}
          >
            {btn.icon}
          </button>
        ))}
      </div>
    </div>
  )

  /* ══════════════════ CHAT ════════════════════════════════ */
  if (screen === "chat") return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar /><Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Doctor header */}
        <div className="px-8 py-4 flex items-center justify-between" style={{ background: GRAD }}>
          <div className="flex items-center gap-3">
            <DoctorAvatar size={46} />
            <div>
              <p className="font-bold" style={{ color: WINE }}>DR. Salad Khalif</p>
              <p className="text-xs flex items-center gap-1.5" style={{ color: WINE_CARD }}>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> General Practice
              </p>
            </div>
          </div>
          <button onClick={() => setScreen("summary")}
            className="h-9 px-6 rounded-xl font-bold text-sm text-white"
            style={{ background: WINE_CARD }}>
            End Consultation
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[65%] rounded-2xl px-5 py-3"
                style={{ background: m.from === "doctor" ? PEACH_CARD : WINE_CARD, color: m.from === "doctor" ? WINE : "#fff" }}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <p className="text-xs mt-1 opacity-55">{m.time}</p>
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
        <div className="px-8 py-4 border-t" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-3 rounded-full px-5 py-2.5"
            style={{ border: `1.5px solid ${ORG}` }}>
            <button type="button" style={{ color: ACCENT }}><Plus className="h-5 w-5" /></button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Type your message…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: WINE }} />
            <button onClick={sendMessage}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: ORG }}>
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
      <div className="w-full px-6 lg:px-16 py-12">
        <h2 className="text-3xl font-bold mb-2" style={{ color: WINE }}>Consultation Summary</h2>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>Dr. Salad Khalif · {new Date().toLocaleDateString()}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Diagnosis */}
          <div className="rounded-2xl p-7" style={{ background: PEACH_CARD, border: `1.5px solid ${ORG}` }}>
            <p className="text-sm mb-4" style={{ color: WINE }}>
              <strong>Diagnosis:</strong> Common cold with mild symptoms
            </p>
            <p className="font-bold text-sm mb-3" style={{ color: WINE }}>Recommendations:</p>
            <ul className="space-y-2 text-sm mb-4" style={{ color: "#374151" }}>
              {["Get adequate rest (7–8 hours of sleep)","Stay hydrated — drink plenty of water",
                "Take prescribed medication as directed","Monitor temperature twice daily"
              ].map(r => <li key={r} className="flex gap-2"><span>•</span>{r}</li>)}
            </ul>
            <p className="text-sm" style={{ color: WINE }}>
              <strong>Follow-up:</strong> If symptoms persist beyond 5 days or worsen, please consult again.
            </p>
          </div>

          {/* Recommended medicine */}
          <div>
            <h3 className="font-bold text-xl mb-4" style={{ color: WINE }}>Recommended Medicines</h3>
            <div className="rounded-2xl p-7 text-center" style={{ border: `1.5px solid ${ORG}` }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: WINE_CARD }}>
                <span className="text-3xl">💊</span>
              </div>
              <p className="font-bold text-lg" style={{ color: WINE }}>Paracetamol 500mg</p>
              <p className="text-sm mb-2" style={{ color: "#6b7280" }}>Take 1 tablet every 8 hours</p>
              <p className="font-bold mb-5" style={{ color: WINE }}>KSH 800</p>
              <button className="h-11 px-8 rounded-xl text-sm font-semibold"
                style={{ background: PEACH_CARD, color: WINE }}>
                + Add To Cart
              </button>
            </div>
          </div>
        </div>

        <Link href="/shop"
          className="mt-8 block w-full py-4 rounded-2xl font-bold text-base text-white text-center transition-opacity hover:opacity-90"
          style={{ background: WINE_CARD }}>
          Go to the shop
        </Link>
      </div>
    </Shell>
  )
}

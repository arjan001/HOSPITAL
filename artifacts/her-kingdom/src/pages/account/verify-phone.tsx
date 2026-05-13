import { useState, useRef, useEffect } from "react"
import { Link, useLocation } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { CheckCircle2, ArrowRight, MessageCircle, Phone } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM         = "#FFFBF5"
const PEACH_BORDER  = "#F2DCC8"
const SUCCESS_GREEN = "#15803D"

const OTP_LENGTH = 6
const RESEND_SECONDS = 60

export default function VerifyPhonePage() {
  const [, navigate] = useLocation()
  const { whatsappHref, phoneHref, phoneDisplay } = useStoreContact()

  // Read masked phone from query params (e.g. ?phone=****6187)
  const maskedPhone = new URLSearchParams(window.location.search).get("phone") ?? "your registered number"

  const [otp, setOtp]           = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [loading, setLoading]   = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError]       = useState("")
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  /* Countdown timer for resend */
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    setError("")
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus()
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH)
    if (pasted.length === OTP_LENGTH) {
      setOtp(pasted.split(""))
      inputRefs.current[OTP_LENGTH - 1]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join("")
    if (code.length < OTP_LENGTH) { setError("Please enter all 6 digits."); return }
    setError("")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setVerified(true)
  }

  const handleResend = () => {
    if (!canResend) return
    setCountdown(RESEND_SECONDS)
    setCanResend(false)
    setOtp(Array(OTP_LENGTH).fill(""))
    inputRefs.current[0]?.focus()
  }

  /* ── Success state ── */
  if (verified) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <Seo title="Verify Your Phone" description="Confirm your phone number to secure your Shaniid RX account and receive delivery updates from a verified pharmacy." canonicalPath="/account/verify-phone" noindex />
        <TopBar />
        <Navbar />
        <main
          className="flex-1 flex items-center justify-center px-4 py-20 relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
        >
          <div
            className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(21,128,61,0.08) 0%, transparent 70%)", filter: "blur(60px)" }}
          />
          <div
            className="w-full max-w-md rounded-3xl p-10 text-center z-10"
            style={{
              background: "rgba(255,251,245,0.88)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: `1px solid ${PEACH_BORDER}`,
              boxShadow: "0 40px 80px -24px rgba(61,8,20,0.18)",
            }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`, boxShadow: "0 16px 36px -12px rgba(185,28,28,0.5)" }}
            >
              <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}>
              Phone Verified!
            </h2>
            <p className="text-sm leading-relaxed mb-7" style={{ color: WINE_SOFT }}>
              Your mobile number has been successfully verified. Your Shaniid RX account is now active.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-full font-bold text-white text-sm transition-transform hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                boxShadow: "0 14px 28px -10px rgba(185,28,28,0.45)",
              }}
            >
              Start Shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      <main
        className="flex-1 flex items-center justify-center px-4 py-14 lg:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-32 -left-32 w-[440px] h-[440px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(185,28,28,0.09) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

        {/* Card */}
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden z-10"
          style={{
            background: "rgba(255,251,245,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${PEACH_BORDER}`,
            boxShadow: "0 40px 80px -24px rgba(61,8,20,0.2), 0 8px 24px -8px rgba(61,8,20,0.08), inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          {/* Header strip */}
          <div
            className="px-8 pt-8 pb-6"
            style={{
              background: "linear-gradient(135deg, rgba(255,228,200,0.8) 0%, rgba(255,205,170,0.6) 100%)",
              borderBottom: `1px solid ${PEACH_BORDER}`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: ACCENT_RED }}>
              Shaniid RX
            </p>
            <h1
              className="text-2xl lg:text-3xl font-extrabold"
              style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
            >
              Verify Mobile Number
            </h1>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: WINE_SOFT }}>
              Enter the 6-digit code you have received on your registered mobile number ending{" "}
              <span className="font-bold">{maskedPhone}</span>.
            </p>
          </div>

          <form onSubmit={handleVerify} className="px-8 py-7">
            {/* Success notice */}
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: SUCCESS_GREEN }}
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              User Successfully registered. Please Verify mobile number.
            </div>

            {/* OTP digit boxes */}
            <div className="flex items-center justify-center gap-3 mb-7" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="text-center text-2xl font-extrabold rounded-2xl outline-none transition-all"
                  style={{
                    width: 52,
                    height: 58,
                    background: digit ? "white" : "rgba(255,255,255,0.6)",
                    border: `2px solid ${digit ? ACCENT_RED : PEACH_BORDER}`,
                    color: WINE,
                    boxShadow: digit ? `0 4px 16px -6px rgba(185,28,28,0.3)` : "none",
                  }}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-center text-sm font-medium mb-4" style={{ color: ACCENT_RED }}>
                {error}
              </p>
            )}

            {/* Verify CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
              style={{
                height: 52,
                background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                boxShadow: "0 16px 32px -10px rgba(185,28,28,0.5)",
              }}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                "Verify Code"
              )}
            </button>

            {/* Resend */}
            <p className="text-center text-sm mt-5" style={{ color: WINE_SOFT }}>
              {canResend ? (
                <button type="button" onClick={handleResend} className="font-bold hover:underline" style={{ color: ACCENT_RED }}>
                  Resend Code
                </button>
              ) : (
                <span>
                  Resend Code{" "}
                  <span className="font-semibold" style={{ color: WINE }}>
                    ({String(Math.floor(countdown / 60)).padStart(1, "0")}:{String(countdown % 60).padStart(2, "0")})
                  </span>
                </span>
              )}
            </p>

            {/* Trouble verifying */}
            <div className="mt-6 pt-5 border-t" style={{ borderColor: PEACH_BORDER }}>
              <p className="text-center text-xs font-semibold mb-3" style={{ color: WINE_SOFT }}>
                Trouble verifying?
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-xl font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                  style={{ background: "#25D366" }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                  Chat with agent
                </a>
                <span className="text-xs" style={{ color: WINE_SOFT }}>|</span>
                <a
                  href={phoneHref}
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: "white",
                    border: `1.5px solid ${PEACH_BORDER}`,
                    color: WINE,
                  }}
                >
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: ACCENT_RED }} />
                  Call support
                </a>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

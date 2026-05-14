import { useState } from "react"
import { Link, useLocation } from "wouter"
import { useSignIn, useUser } from "@clerk/react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Eye, EyeOff, ArrowRight, ChevronDown } from "lucide-react"
import { Seo } from "@/components/seo"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM         = "#FFFBF5"
const PEACH_BORDER  = "#F2DCC8"

export default function AccountLoginPage() {
  const [, navigate] = useLocation()
  const { isSignedIn } = useUser()
  const { isLoaded, signIn, setActive } = useSignIn()

  const [method, setMethod]   = useState<"phone" | "email">("email")
  const [phone, setPhone]     = useState("")
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")

  if (isSignedIn) {
    navigate("/account")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setError("")
    setLoading(true)
    try {
      const identifier =
        method === "phone"
          ? `+254${phone.replace(/^0+/, "").replace(/\D/g, "")}`
          : email.trim()
      const attempt = await signIn.create({ identifier, password })
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId })
        navigate("/account")
      } else {
        setError("Additional verification required. Please use the secure sign-in flow.")
        setTimeout(() => navigate("/sign-in"), 1200)
      }
    } catch (err) {
      const msg =
        (err as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors?.[0]
          ?.longMessage ||
        (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
        "Invalid credentials. Please check and try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!isLoaded || !signIn) return
    setError("")
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/account",
      })
    } catch (err) {
      setError("Could not start Google sign-in. Please try again.")
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <Seo title="Sign In to Shaniid RX" description="Sign in to your Shaniid RX account to view orders, manage prescriptions and continue your pharmacy care." canonicalPath="/account/login" noindex />
      <TopBar />
      <Navbar />

      <main
        className="flex-1 flex items-center justify-center px-4 py-14 lg:py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(185,28,28,0.1) 0%, transparent 70%)", filter: "blur(60px)" }}
        />

        {/* Glass card */}
        <div
          className="relative w-full max-w-md rounded-3xl overflow-hidden z-10"
          style={{
            background: "rgba(255,251,245,0.80)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${PEACH_BORDER}`,
            boxShadow: "0 40px 80px -24px rgba(61,8,20,0.2), 0 8px 24px -8px rgba(61,8,20,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
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
            {/* Logo mark */}
            <div className="flex justify-center mb-4">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "white",
                  boxShadow: "0 8px 20px -8px rgba(61,8,20,0.25), inset 0 1px 0 rgba(255,255,255,0.9)",
                  border: `1px solid ${PEACH_BORDER}`,
                }}
              >
                <img
                  src="/logo.svg"
                  alt="Shaniid RX"
                  className="h-9 w-9"
                  draggable={false}
                />
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: ACCENT_RED }}>
                  Shaniid RX
                </p>
                <h1
                  className="text-2xl lg:text-3xl font-extrabold"
                  style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
                >
                  Log In
                </h1>
              </div>
              <div className="text-right shrink-0 mt-1">
                <p className="text-xs" style={{ color: WINE_SOFT }}>Don't have an account?</p>
                <Link
                  href="/account/register"
                  className="text-xs font-bold hover:underline transition-all"
                  style={{ color: ACCENT_RED }}
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Identifier field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: WINE_SOFT }}>
                  {method === "phone" ? "Phone Number" : "Email ID"} *
                </label>
                <button
                  type="button"
                  onClick={() => setMethod(method === "phone" ? "email" : "phone")}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: ACCENT_RED }}
                >
                  {method === "phone" ? "Use Email ID Instead" : "Use Phone Instead"}
                </button>
              </div>

              {method === "phone" ? (
                <div
                  className="flex items-center h-12 rounded-xl overflow-hidden"
                  style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}` }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 h-full border-r select-none flex-shrink-0"
                    style={{ borderColor: PEACH_BORDER }}
                  >
                    <span className="text-lg leading-none">🇰🇪</span>
                    <ChevronDown className="h-3 w-3 opacity-50" style={{ color: WINE }} />
                    <span className="text-sm font-semibold" style={{ color: WINE }}>+254</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter registered phone number"
                    className="flex-1 h-full px-4 text-sm bg-transparent outline-none"
                    style={{ color: WINE }}
                  />
                </div>
              ) : (
                <div
                  className="flex items-center h-12 rounded-xl overflow-hidden"
                  style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}` }}
                >
                  <span className="pl-4 pr-2 flex-shrink-0">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email address"
                    className="flex-1 h-full pr-4 text-sm bg-transparent outline-none"
                    style={{ color: WINE }}
                  />
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                Password *
              </label>
              <div
                className="flex items-center h-12 rounded-xl overflow-hidden"
                style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}` }}
              >
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="flex-1 h-full px-4 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="px-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: ACCENT_RED }}
                />
                <span className="text-xs font-medium" style={{ color: WINE_SOFT }}>Keep me signed in</span>
              </label>
              <Link
                href="/sign-in"
                className="text-xs font-semibold hover:underline"
                style={{ color: ACCENT_RED }}
              >
                Forgot Password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: ACCENT_RED }}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              type="submit"
              disabled={loading || !isLoaded}
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
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: PEACH_BORDER }} />
              <span className="text-xs font-semibold" style={{ color: WINE_SOFT }}>OR</span>
              <div className="flex-1 h-px" style={{ background: PEACH_BORDER }} />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={!isLoaded}
              className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70"
              style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}`, color: WINE }}
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

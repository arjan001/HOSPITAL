import { useState, useEffect, type FormEvent } from "react"
import { useLocation } from "wouter"
import {
  Eye,
  EyeOff,
  Shield,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

export const ADMIN_TOKEN_KEY = "shaniidrx.admin.token"
export const ADMIN_USER_KEY = "shaniidrx.admin.user"

type View = "login" | "forgot" | "forgot-sent"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"

/* ───────────────────── glassmorphism tokens ───────────────────── */
const GRADIENT_BG   = "linear-gradient(135deg, #E8A87C 0%, #C44B2B 35%, #8B1A1A 70%, #6B0F1A 100%)"
const CARD_BG       = "rgba(255, 240, 230, 0.22)"
const CARD_BORDER   = "rgba(255, 255, 255, 0.35)"
const INPUT_BG      = "rgba(255, 250, 245, 0.92)"
const INPUT_BORDER  = "rgba(255, 255, 255, 0.6)"
const BTN_BG        = WINE

export function AdminLoginPage() {
  const [, navigate] = useLocation()
  const [view, setView] = useState<View>("login")

  // Login form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState("")

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem(ADMIN_TOKEN_KEY)
      if (token) navigate("/admin")
    }
  }, [navigate])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)
    try {
      const res = await fetch("/api/v2/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(data?.message || "Invalid email or password. Please check your credentials.")
        return
      }
      window.localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      window.localStorage.setItem(
        ADMIN_USER_KEY,
        JSON.stringify({
          role: data.role,
          name: data.name,
          email: data.email,
          // Carry the account's effective permissions so the client RBAC layer
          // gates the panel by the real signed-in identity (super_admin → "*").
          permissions: data.permissions ?? [],
        }),
      )
      // Same-tab SPA navigation won't fire the cross-tab `storage` event, so
      // nudge the permissions layer to re-read the new session immediately.
      window.dispatchEvent(new Event("shaniidrx:admin-session"))
      navigate("/admin")
    } catch {
      setLoginError("Unable to connect to the server. Please try again.")
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await fetch("/api/v2/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
    } catch {
      // show sent state regardless to avoid leaking info
    } finally {
      setForgotLoading(false)
      setView("forgot-sent")
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: GRADIENT_BG }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full border-2 border-white/20 pointer-events-none" />
      <div className="absolute top-1/3 -left-12 w-48 h-48 rounded-full border-2 border-white/15 pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full border-2 border-white/20 pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-56 h-56 rounded-full border-2 border-white/15 pointer-events-none" />

      {/* Glass card */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden z-10"
        style={{
          background: CARD_BG,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: "0 32px 64px -20px rgba(61,8,20,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <img
            src="/logo-rx.png"
            alt="Shaniid RX"
            className="mx-auto mb-5 h-20 w-auto object-contain"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
          <div
            className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(255,255,255,0.35)",
              border: `1px solid ${INPUT_BORDER}`,
              color: WINE,
            }}
          >
            <Shield size={11} strokeWidth={2.5} />
            Admin Portal
          </div>

          <h1
            className="text-2xl font-bold"
            style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
          >
            {view === "login" && "Welcome"}
            {view === "forgot" && "Forgot Password"}
            {view === "forgot-sent" && "Check Your Inbox"}
          </h1>
          {view === "forgot" && (
            <p className="mt-2 text-sm" style={{ color: WINE_SOFT }}>
              Enter your admin email to request a reset
            </p>
          )}
          {view === "forgot-sent" && (
            <p className="mt-2 text-sm" style={{ color: WINE_SOFT }}>
              Recovery instructions sent if the email is registered
            </p>
          )}
        </div>

        {/* ── Login form ── */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            {/* Email */}
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                style={{ color: WINE_SOFT }}
              >
                Email address
              </label>
              <div
                className="flex items-center h-12 rounded-full overflow-hidden"
                style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}` }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@shaniidrx.com"
                  required
                  autoComplete="username"
                  className="flex-1 h-full px-5 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                style={{ color: WINE_SOFT }}
              >
                Password
              </label>
              <div
                className="flex items-center h-12 rounded-full overflow-hidden"
                style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}` }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="flex-1 h-full px-5 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="px-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setView("forgot")
                  setLoginError("")
                }}
                className="text-xs font-semibold hover:underline"
                style={{ color: ACCENT_RED }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Error */}
            {loginError && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
                style={{ background: "rgba(254,242,242,0.85)", border: "1px solid #FECACA", color: ACCENT_RED }}
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {loginError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
              style={{
                height: 48,
                background: BTN_BG,
                boxShadow: "0 12px 24px -8px rgba(61,8,20,0.45)",
              }}
            >
              {loginLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Signing in…
                </>
              ) : (
                "Login"
              )}
            </button>

            {/* Development-only credential hint — never rendered in production builds */}
            {import.meta.env.DEV && (
              <div
                className="rounded-xl px-4 py-3 text-[11px] leading-relaxed"
                style={{ background: "rgba(255,251,235,0.85)", border: "1px solid #FDE68A", color: "#92400E" }}
              >
                <span className="font-semibold">Development login:</span> when no{" "}
                <code className="font-mono">ADMIN_EMAIL</code>/
                <code className="font-mono">ADMIN_PASSWORD</code> is configured, the built-in test
                login is <code className="font-mono">admin@shaniidrx.com</code> /{" "}
                <code className="font-mono">Admin@2024!</code>.
                <br />
                In production these defaults are disabled — a configured{" "}
                <code className="font-mono">ADMIN_EMAIL</code> and{" "}
                <code className="font-mono">ADMIN_PASSWORD</code> are required.
              </div>
            )}
          </form>
        )}

        {/* ── Forgot password form ── */}
        {view === "forgot" && (
          <form onSubmit={handleForgot} className="px-8 pb-8 space-y-5">
            <div>
              <label
                className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                style={{ color: WINE_SOFT }}
              >
                Admin email address
              </label>
              <div
                className="flex items-center h-12 rounded-full overflow-hidden"
                style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}` }}
              >
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@shaniidrx.com"
                  required
                  autoComplete="username"
                  className="flex-1 h-full px-5 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
              style={{
                height: 48,
                background: BTN_BG,
                boxShadow: "0 12px 24px -8px rgba(61,8,20,0.45)",
              }}
            >
              {forgotLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Sending…
                </>
              ) : (
                "Send recovery instructions"
              )}
            </button>

            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Remembered it?{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                className="font-bold hover:underline"
                style={{ color: "#fff" }}
              >
                Back to Sign In
              </button>
            </p>
          </form>
        )}

        {/* ── Forgot sent ── */}
        {view === "forgot-sent" && (
          <div className="px-8 pb-8 space-y-5">
            <div
              className="rounded-xl px-4 py-4 text-sm flex items-start gap-3"
              style={{ background: "rgba(240,253,244,0.85)", border: "1px solid #BBF7D0", color: "#166534" }}
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
              <span>
                If <strong>{forgotEmail}</strong> is registered as an admin account, recovery
                instructions have been sent. For urgent access, contact your system administrator.
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setView("login")
                setForgotEmail("")
              }}
              className="w-full rounded-full font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
              style={{
                height: 48,
                background: "rgba(255,255,255,0.85)",
                border: `1px solid ${INPUT_BORDER}`,
                color: WINE,
              }}
            >
              <ArrowLeft size={16} /> Return to sign in
            </button>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="absolute bottom-5 left-0 right-0 text-center text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
        All access is logged and monitored for your security.
      </p>
    </div>
  )
}

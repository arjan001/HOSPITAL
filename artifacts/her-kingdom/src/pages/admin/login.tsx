import { useState, useEffect, type FormEvent } from "react"
import { useLocation } from "wouter"
import {
  Eye,
  EyeOff,
  Shield,
  Lock,
  Mail,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

export const ADMIN_TOKEN_KEY = "shaniidrx.admin.token"
export const ADMIN_USER_KEY = "shaniidrx.admin.user"

type View = "login" | "forgot" | "forgot-sent"

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
        JSON.stringify({ role: data.role, name: data.name, email: data.email }),
      )
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
    <div className="min-h-screen bg-[#3D0814] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-white/[0.04]" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-[300px] w-[300px] rounded-full bg-white/[0.04]" />
      <div className="pointer-events-none absolute top-1/2 left-1/4 h-[180px] w-[180px] -translate-y-1/2 rounded-full bg-[#F97316]/[0.06]" />

      <div className="relative w-full max-w-[420px]">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Colour bar */}
          <div className="h-1 bg-gradient-to-r from-[#3D0814] via-[#6B0F1A] to-[#F97316]" />

          <div className="px-8 py-9 md:px-10 md:py-10">
            {/* Logo + badge */}
            <div className="mb-8 text-center">
              <img
                src="/logo.svg"
                alt="Shaniid RX"
                className="mx-auto mb-5 h-10"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
              <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[#3D0814]/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#3D0814]">
                <Shield size={10} strokeWidth={2.5} />
                Admin Portal
              </div>

              {view === "login" && (
                <>
                  <h1 className="text-[22px] font-bold leading-tight text-gray-900">
                    Sign in to Shaniid RX
                  </h1>
                  <p className="mt-1.5 text-sm text-gray-400">Authorized personnel only</p>
                </>
              )}
              {view === "forgot" && (
                <>
                  <h1 className="text-[22px] font-bold leading-tight text-gray-900">
                    Forgot your password?
                  </h1>
                  <p className="mt-1.5 text-sm text-gray-400">
                    Enter your admin email to request a reset
                  </p>
                </>
              )}
              {view === "forgot-sent" && (
                <>
                  <h1 className="text-[22px] font-bold leading-tight text-gray-900">
                    Check your inbox
                  </h1>
                  <p className="mt-1.5 text-sm text-gray-400">
                    Recovery instructions sent if the email is registered
                  </p>
                </>
              )}
            </div>

            {/* ── Login form ── */}
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@shaniidrx.com"
                      required
                      autoComplete="username"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-[#3D0814] focus:outline-none focus:ring-2 focus:ring-[#3D0814]/20"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-11 text-sm transition-colors focus:border-[#3D0814] focus:outline-none focus:ring-2 focus:ring-[#3D0814]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {loginError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {loginError}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3D0814] py-2.5 font-semibold text-white transition-colors hover:bg-[#6B0F1A] disabled:opacity-60"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>

                {/* Forgot password */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot")
                      setLoginError("")
                    }}
                    className="text-sm font-medium text-[#F97316] hover:text-[#ea6c09]"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* ── Forgot password form ── */}
            {view === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Admin email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@shaniidrx.com"
                      required
                      autoComplete="username"
                      className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-[#3D0814] focus:outline-none focus:ring-2 focus:ring-[#3D0814]/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3D0814] py-2.5 font-semibold text-white transition-colors hover:bg-[#6B0F1A] disabled:opacity-60"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send recovery instructions"
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    className="mx-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft size={14} /> Back to sign in
                  </button>
                </div>
              </form>
            )}

            {/* ── Forgot sent ── */}
            {view === "forgot-sent" && (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-4 text-sm text-green-800">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                  <span>
                    If <strong>{forgotEmail}</strong> is registered as an admin account, recovery
                    instructions have been sent. For urgent access, contact your system
                    administrator.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView("login")
                    setForgotEmail("")
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft size={14} /> Return to sign in
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-white/30">
          All access is logged and monitored. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}

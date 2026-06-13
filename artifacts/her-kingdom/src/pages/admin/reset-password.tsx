import { useState, useEffect, type FormEvent } from "react"
import { useLocation } from "wouter"
import { Eye, EyeOff, Shield, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

const WINE        = "#3D0814"
const WINE_SOFT   = "#6B0F1A"
const ACCENT_RED  = "#B91C1C"
const GRADIENT_BG = "linear-gradient(135deg, #E8A87C 0%, #C44B2B 35%, #8B1A1A 70%, #6B0F1A 100%)"
const CARD_BG     = "rgba(255, 240, 230, 0.22)"
const CARD_BORDER = "rgba(255, 255, 255, 0.35)"
const INPUT_BG    = "rgba(255, 250, 245, 0.92)"
const INPUT_BORDER = "rgba(255, 255, 255, 0.6)"
const BTN_BG      = WINE

function getTokenFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get("token") ?? ""
  } catch {
    return ""
  }
}

export function AdminResetPasswordPage() {
  const [, setLocation] = useLocation()
  const [token] = useState(getTokenFromUrl)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError("No reset token found. Please request a new password reset link.")
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      const apiBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "")
      const res = await fetch(`${apiBase}/api/v2/admin/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const json = await res.json().catch(() => ({})) as { ok?: boolean; message?: string }
      if (!res.ok) {
        setError(json.message || `Error ${res.status}. The link may have expired.`)
      } else {
        setDone(true)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: GRADIENT_BG }}>
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ background: CARD_BG, border: `1.5px solid ${CARD_BORDER}`, backdropFilter: "blur(24px)" }}
      >
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-md"
            style={{ background: "rgba(255,255,255,0.18)", border: `1px solid ${CARD_BORDER}` }}
          >
            <Shield className="w-7 h-7" style={{ color: "#ffd9b0" }} />
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-sm mt-1 text-center" style={{ color: "rgba(255,255,255,0.7)" }}>
            Choose a strong password for your admin account.
          </p>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: "#86efac" }} />
            <p className="font-semibold text-white text-lg">Password updated!</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              You can now sign in with your new password.
            </p>
            <button
              onClick={() => setLocation("/admin/login")}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 mt-2"
              style={{ background: BTN_BG, color: "#fff" }}
            >
              Go to admin sign-in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(185,28,28,0.18)", border: "1px solid rgba(185,28,28,0.4)", color: "#fca5a5" }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>
                New password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full h-11 rounded-xl px-4 pr-11 text-sm outline-none"
                  style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}`, color: WINE }}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: WINE_SOFT }}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full h-11 rounded-xl px-4 pr-11 text-sm outline-none"
                  style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}`, color: WINE }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: WINE_SOFT }}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: BTN_BG, color: "#fff" }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating password…
                </span>
              ) : "Set new password"}
            </button>

            <button
              type="button"
              onClick={() => setLocation("/admin/login")}
              className="w-full flex items-center justify-center gap-1.5 text-sm hover:underline mt-1"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign-in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

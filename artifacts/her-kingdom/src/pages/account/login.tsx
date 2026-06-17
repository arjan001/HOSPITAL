/**
 * Login page — authentication code flow.
 *
 * This page handles three auth paths, all using Clerk:
 *
 * Path 1: Email / password sign-in
 *   1. User enters identifier (email or username) and password.
 *   2. handleSubmit calls signIn.create({ identifier, password }).
 *   3. On status "complete": setActive({ session }) persists the Clerk session
 *      cookie and redirects to /user.
 *   4. On any other status: prompt the user to check email or use Google.
 *
 * Path 2: Google OAuth
 *   1. User clicks the Google button.
 *   2. handleGoogle calls signIn.authenticateWithRedirect with strategy "oauth_google".
 *   3. Clerk redirects to accounts.google.com for consent.
 *   4. Google redirects back to /account/sso-callback.
 *   5. SsoCallbackPage in App.tsx renders AuthenticateWithRedirectCallback,
 *      which finalises the session and forwards to /user.
 *
 * Path 3: Password reset
 *   1. User clicks "Forgot password" — step changes to "reset_email".
 *   2. sendResetCode calls signIn.create({ strategy: "reset_password_email_code" }).
 *   3. Clerk emails a 6-digit code; step changes to "reset_code".
 *   4. submitReset calls signIn.attemptFirstFactor with the code + new password.
 *   5. On status "complete": setActive and redirect to /user.
 *
 * Session persistence:
 *   Clerk stores the session as a signed JWT in a first-party cookie.
 *   Configure VITE_CLERK_PUBLISHABLE_KEY (frontend) and CLERK_SECRET_KEY
 *   (api-server / api-nest) from the same Clerk application in your Dashboard.
 */

import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useUser } from "@clerk/react"
import { buildRedirectQuery, resolvePostAuthRedirect, isPartnerPortalPath, clearPartnerPortalRedirect } from "@/lib/auth-redirect"
/* The default `@clerk/react` `useSignIn` returns the new "signals" API
   (no `isLoaded` / `authenticateWithRedirect` / `setActive`). This page
   uses the legacy resource API which still ships at `/legacy`. */
import { useSignIn } from "@clerk/react/legacy"

/* App is mounted under a base path on Replit (e.g. /her-kingdom). Clerk does
   a full window.location redirect, so OAuth round-trip URLs must include the
   prefix or the browser lands on the wrong origin path. */
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "")
import { Eye, EyeOff, ArrowRight, Mail, Loader2 } from "lucide-react"
import { Seo } from "@/components/seo"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"

/* ───────────────────── glassmorphism tokens ───────────────────── */
const GRADIENT_BG   = "linear-gradient(135deg, #E8A87C 0%, #C44B2B 35%, #8B1A1A 70%, #6B0F1A 100%)"
const CARD_BG       = "rgba(255, 240, 230, 0.22)"
const CARD_BORDER   = "rgba(255, 255, 255, 0.35)"
const INPUT_BG      = "rgba(255, 250, 245, 0.92)"
const INPUT_BORDER  = "rgba(255, 255, 255, 0.6)"
const BTN_BG        = WINE

type Step = "signin" | "reset_email" | "reset_code"

export default function AccountLoginPage() {
  const [, navigate] = useLocation()
  const { isSignedIn } = useUser()
  const { isLoaded, signIn, setActive } = useSignIn()

  /* Where to land after a successful sign-in. Gated pages (e.g.
     /upload-prescription) send the user here with `?redirect=<path>`; we
     validate it as a same-origin relative path and fall back to /account/settings. */
  const redirectParam = resolvePostAuthRedirect(
    typeof window !== "undefined" ? window.location.search : "",
  )
  const redirectTo = redirectParam || "/account/settings"
  const redirectQuery = buildRedirectQuery(redirectParam)

  const [step, setStep]       = useState<Step>("signin")
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]     = useState("")

  /* Reset-password state */
  const [resetCode, setResetCode]       = useState("")
  const [resetNewPw, setResetNewPw]     = useState("")
  const [resetConfirm, setResetConfirm] = useState("")
  const [resetInfo, setResetInfo]       = useState("")

  const sendResetCode = async () => {
    if (!isLoaded || !signIn) return
    const id = email.trim()
    if (!id) { setError("Enter the email on your account first."); return }
    setError(""); setResetInfo(""); setLoading(true)
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: id })
      setStep("reset_code")
      setResetInfo(`We've emailed a 6-digit reset code to ${id}.`)
    } catch (err) {
      const msg =
        (err as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors?.[0]?.longMessage ||
        (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
        "Could not start password reset. Check the email and try again."
      setError(msg)
    } finally { setLoading(false) }
  }

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setError("")
    if (resetNewPw.length < 8) { setError("New password must be at least 8 characters."); return }
    if (resetNewPw !== resetConfirm) { setError("Passwords do not match."); return }
    setLoading(true)
    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: resetNewPw,
      })
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId })
        if (isPartnerPortalPath(redirectTo)) clearPartnerPortalRedirect()
        navigate(redirectTo)
      } else {
        setError("Reset needs another step. Please try signing in normally.")
      }
    } catch (err) {
      const msg =
        (err as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors?.[0]?.longMessage ||
        (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
        "Could not reset password. Check the code and try again."
      setError(msg)
    } finally { setLoading(false) }
  }

  const backToSignIn = () => {
    setStep("signin"); setError(""); setResetInfo("")
    setResetCode(""); setResetNewPw(""); setResetConfirm("")
  }

  useEffect(() => {
    if (isSignedIn) {
      if (isPartnerPortalPath(redirectTo)) clearPartnerPortalRedirect()
      navigate(redirectTo)
    }
  }, [isSignedIn, navigate, redirectTo])

  if (isSignedIn) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setError("")
    setLoading(true)
    try {
      const identifier = email.trim()
      const attempt = await signIn.create({ identifier, password })
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId })
        if (isPartnerPortalPath(redirectTo)) clearPartnerPortalRedirect()
        navigate(redirectTo)
      } else {
        setError("Additional verification required. Please check your email or try Google sign-in below.")
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
    if (!isLoaded || !signIn) {
      setError("Sign-in is still loading — please wait a moment and try again.")
      return
    }
    setError("")
    setGoogleLoading(true)
    try {
      const oauthCallback = `${BASE_PATH}/account/sso-callback${buildRedirectQuery(redirectParam)}`
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: oauthCallback,
        redirectUrlComplete: `${BASE_PATH}${redirectTo}`,
      })
    } catch (err) {
      setGoogleLoading(false)
      const msg =
        (err as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors?.[0]
          ?.longMessage ||
        (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message ||
        "Could not start Google sign-in. Please try again."
      setError(msg)
    }
  }

  const SocialButton = ({
    icon, label, onClick, disabled, loading: btnLoading,
  }: {
    icon: React.ReactNode
    label: string
    onClick?: () => void
    disabled?: boolean
    loading?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || btnLoading}
      className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 hover:shadow-md disabled:opacity-60"
      style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.5)" }}
      aria-label={label}
    >
      {btnLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: WINE }} />
      ) : (
        icon
      )}
    </button>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: GRADIENT_BG }}>
      <Seo title="Sign In to Shaniid RX" description="Sign in to your Shaniid RX account to view orders, manage prescriptions and continue your pharmacy care." canonicalPath="/account/login" noindex />

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
          <h1 className="text-2xl font-bold" style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}>
            {step === "signin" ? "Welcome" : "Reset Password"}
          </h1>
        </div>

        <form onSubmit={step === "signin" ? handleSubmit : submitReset} className="px-8 pb-8 space-y-5">
          {/* Reset info banner */}
          {step === "reset_code" && resetInfo && (
            <div className="rounded-xl px-4 py-3 text-xs flex items-start gap-2" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${INPUT_BORDER}`, color: WINE }}>
              <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{resetInfo} Enter it below with your new password.</span>
            </div>
          )}

          {/* Identifier field */}
          {step === "signin" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                Email or Username
              </label>
              <div
                className="flex items-center h-12 rounded-full overflow-hidden"
                style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}` }}
              >
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 h-full px-5 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
              </div>
            </div>
          )}

          {/* Password */}
          {step === "signin" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                Password
              </label>
              <div
                className="flex items-center h-12 rounded-full overflow-hidden"
                style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}` }}
              >
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="flex-1 h-full px-5 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="px-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Remember + forgot */}
          {step === "signin" && (
            <div className="flex items-center justify-between">
              <span /> {/* spacer */}
              <button
                type="button"
                onClick={sendResetCode}
                disabled={loading || !isLoaded}
                className="text-xs font-semibold hover:underline disabled:opacity-50"
                style={{ color: ACCENT_RED }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Reset-code form */}
          {step === "reset_code" && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                  6-digit code *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full h-12 px-5 rounded-full text-sm tracking-[0.4em] text-center bg-white/90 outline-none"
                  style={{ border: `1.5px solid ${INPUT_BORDER}`, color: WINE }}
                />
                <button
                  type="button"
                  onClick={sendResetCode}
                  disabled={loading}
                  className="mt-1.5 text-xs font-semibold hover:underline disabled:opacity-50"
                  style={{ color: ACCENT_RED }}
                >
                  Resend code
                </button>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                  New password *
                </label>
                <div
                  className="flex items-center h-12 rounded-full overflow-hidden"
                  style={{ background: INPUT_BG, border: `1.5px solid ${INPUT_BORDER}` }}
                >
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={resetNewPw}
                    onChange={(e) => setResetNewPw(e.target.value)}
                    placeholder="Min 8 characters"
                    className="flex-1 h-full px-5 text-sm bg-transparent outline-none"
                    style={{ color: WINE }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="px-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                  Confirm new password *
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-12 px-5 rounded-full text-sm bg-white/90 outline-none"
                  style={{ border: `1.5px solid ${INPUT_BORDER}`, color: WINE }}
                />
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2" style={{ background: "rgba(254,242,242,0.85)", border: "1px solid #FECACA", color: ACCENT_RED }}>
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
              height: 48,
              background: BTN_BG,
              boxShadow: "0 12px 24px -8px rgba(61,8,20,0.45)",
            }}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : step === "signin" ? (
              <>Login</>
            ) : (
              <>Reset Password <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          {/* Divider + social */}
          {step === "signin" && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.3)" }} />
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>OR</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.3)" }} />
              </div>

              <GoogleSignInButton
                variant="glass"
                label="Sign in with Google"
                onClick={handleGoogle}
                disabled={!isLoaded}
                loading={googleLoading}
              />

              <div className="flex items-center justify-center gap-4">
                <SocialButton
                  label="Sign in with Apple (coming soon)"
                  disabled
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#9CA3AF" }}>
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  }
                />
                <SocialButton
                  label="Sign in with Facebook (coming soon)"
                  disabled
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#9CA3AF" }}>
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  }
                />
              </div>

              <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                New here?{" "}
                <Link
                  href={`/account/register${redirectQuery}`}
                  className="font-bold hover:underline"
                  style={{ color: "#fff" }}
                >
                  Create an account
                </Link>
              </p>
            </>
          )}

          {step !== "signin" && (
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Remembered it?{" "}
              <button
                type="button"
                onClick={backToSignIn}
                className="font-bold hover:underline"
                style={{ color: "#fff" }}
              >
                Back to Sign In
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

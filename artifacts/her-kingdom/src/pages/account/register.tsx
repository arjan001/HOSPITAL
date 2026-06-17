import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useUser } from "@clerk/react"
import { useSignUp } from "@clerk/react/legacy"
import { Eye, EyeOff, ArrowRight, Info, Check, Mail, Loader2 } from "lucide-react"
import { Seo } from "@/components/seo"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { upsertCustomer } from "@/lib/use-customer-mirror"
import { getSafeRedirect, buildRedirectQuery } from "@/lib/auth-redirect"

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

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "")

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
        {label} {required && <span style={{ color: ACCENT_RED }}>*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium" style={{ color: ACCENT_RED }}>{error}</p>}
    </div>
  )
}

function InputBox({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-12 px-5 rounded-full text-sm bg-white/90 outline-none transition-shadow focus:shadow-md ${className}`}
      style={{ border: `1.5px solid ${INPUT_BORDER}`, color: WINE, ...props.style }}
    />
  )
}

type ClerkErr = { errors?: Array<{ longMessage?: string; message?: string; code?: string }> }
const errorMessage = (err: unknown, fallback: string) =>
  (err as ClerkErr)?.errors?.[0]?.longMessage ||
  (err as ClerkErr)?.errors?.[0]?.message ||
  fallback

export default function AccountRegisterPage() {
  const [, navigate] = useLocation()
  const { isSignedIn } = useUser()
  const { isLoaded, signUp, setActive } = useSignUp()

  /* Where to land after a successful sign-up. Gated pages (e.g.
     /upload-prescription) send the user here with `?redirect=<path>`; we
     validate it as a same-origin relative path and fall back to /account/settings. */
  const redirectParam = getSafeRedirect(
    typeof window !== "undefined" ? window.location.search : "",
  )
  const redirectTo = redirectParam || "/account/settings"
  const redirectQuery = buildRedirectQuery(redirectParam)

  const [step, setStep] = useState<"form" | "verify">("form")
  const [sendingCode, setSendingCode] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "",
    dob: "",
    password: "",
    confirmPassword: "",
  })
  const [showPw, setShowPw]           = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [terms, setTerms]             = useState(false)
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [topError, setTopError]       = useState("")
  const [code, setCode]               = useState("")

  useEffect(() => {
    if (isSignedIn) navigate(redirectTo)
  }, [isSignedIn, navigate, redirectTo])

  if (isSignedIn) return null

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = "First name is required"
    if (!form.lastName.trim())  e.lastName  = "Last name is required"
    if (!form.phone.trim())     e.phone     = "Phone number is required"
    if (!form.email.trim())     e.email     = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email address"
    if (!form.gender)           e.gender    = "Gender is required"
    if (!form.dob)              e.dob       = "Date of birth is required"
    if (!form.password)         e.password  = "Password is required"
    else if (form.password.length < 8) e.password = "At least 8 characters"
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match"
    if (!terms)  e.terms  = "Please accept the Terms & Conditions"
    return e
  }

  const phoneE164 = `+254${form.phone.replace(/^0+/, "").replace(/\D/g, "")}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTopError("")
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    if (!isLoaded || !signUp) {
      setTopError("Sign-up is still loading — please wait a moment and try again.")
      return
    }
    setLoading(true)
    try {
      const firstName = form.firstName.trim()
      const lastName  = form.lastName.trim()
      const email     = form.email.trim()

      await signUp.create({
        emailAddress: email,
        password: form.password,
        unsafeMetadata: {
          firstName,
          lastName,
          phone: phoneE164,
          gender: form.gender,
          dob: form.dob,
        },
      })

      if (signUp.status === "complete") {
        await setActive({ session: signUp.createdSessionId })
        if (signUp.createdUserId) {
          upsertCustomer({
            id: signUp.createdUserId,
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`.trim(),
            email,
            phone: phoneE164,
            source: "email",
          })
        }
        navigate(redirectTo)
        return
      }

      setStep("verify")
      setSendingCode(true)
      signUp
        .prepareEmailAddressVerification({ strategy: "email_code" })
        .catch((err) => {
          setTopError(errorMessage(err, "Could not send the verification code. Tap Resend to try again."))
        })
        .finally(() => setSendingCode(false))
    } catch (err) {
      setTopError(errorMessage(err, "Could not create your account. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signUp) return
    if (!code.trim()) { setTopError("Enter the 6-digit code we just emailed you."); return }
    setLoading(true)
    setTopError("")
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code: code.trim() })
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId })
        if (attempt.createdUserId) {
          upsertCustomer({
            id: attempt.createdUserId,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
            email: form.email.trim(),
            phone: phoneE164,
            source: "email",
          })
        }
        navigate(redirectTo)
      } else {
        setTopError("Verification incomplete. Please double-check the code and try again.")
      }
    } catch (err) {
      setTopError(errorMessage(err, "That code didn't work. Try again or resend."))
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (!isLoaded || !signUp) return
    setTopError("")
    setSendingCode(true)
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
    } catch (err) {
      setTopError(errorMessage(err, "Could not resend the code. Please try again."))
    } finally {
      setSendingCode(false)
    }
  }

  const handleGoogle = async () => {
    if (!isLoaded || !signUp) return
    setTopError("")
    setGoogleLoading(true)
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${BASE_PATH}/account/sso-callback`,
        redirectUrlComplete: `${BASE_PATH}${redirectTo}`,
      })
    } catch (err) {
      setGoogleLoading(false)
      setTopError(errorMessage(err, "Could not start Google sign-up. Please try again."))
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
      <Seo title="Create Your Shaniid RX Account" description="Join Shaniid RX in minutes — verified medicine, fair pricing, door-to-door delivery and a calm pharmacy experience built around your family." canonicalPath="/account/register" noindex />

      {/* Decorative circles */}
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full border-2 border-white/20 pointer-events-none" />
      <div className="absolute top-1/3 -left-12 w-48 h-48 rounded-full border-2 border-white/15 pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full border-2 border-white/20 pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-56 h-56 rounded-full border-2 border-white/15 pointer-events-none" />

      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden z-10"
        style={{
          background: CARD_BG,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: `1px solid ${CARD_BORDER}`,
          boxShadow: "0 32px 64px -20px rgba(61,8,20,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        <div className="px-8 pt-10 pb-2 text-center">
          <h1 className="text-2xl font-bold" style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}>
            {step === "form" ? "Create Account" : "Verify Your Email"}
          </h1>
        </div>

        {topError && (
          <div className="mx-8 mt-5 rounded-xl px-4 py-3 text-sm flex items-start gap-2" style={{ background: "rgba(254,242,242,0.85)", border: "1px solid #FECACA", color: ACCENT_RED }}>
            <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{topError}</span>
          </div>
        )}

        {step === "verify" ? (
          <form onSubmit={handleVerify} className="px-8 py-7 space-y-5">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.5)", color: "#1D4ED8" }}>
              {sendingCode ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 flex-shrink-0" />
              )}
              <span>
                {sendingCode
                  ? <>Sending a 6-digit code to <strong>{form.email}</strong>…</>
                  : <>We've emailed a 6-digit code to <strong>{form.email}</strong>. Enter it below to verify your account.</>}
              </span>
            </div>
            <Field label="Verification Code" required>
              <InputBox
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="tracking-[0.4em] text-center text-lg font-bold"
              />
            </Field>
            <button
              type="submit"
              disabled={loading || sendingCode}
              className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
              style={{ height: 48, background: BTN_BG, boxShadow: "0 12px 24px -8px rgba(61,8,20,0.45)" }}
            >
              {loading ? "Verifying…" : sendingCode ? "Waiting for code…" : (<>Verify &amp; Continue <ArrowRight className="h-4 w-4" /></>)}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button type="button" onClick={() => setStep("form")} className="font-semibold hover:underline" style={{ color: "rgba(255,255,255,0.8)" }}>
                ← Back to details
              </button>
              <button type="button" onClick={resendCode} disabled={sendingCode} className="font-semibold hover:underline disabled:opacity-60" style={{ color: "#fff" }}>
                {sendingCode ? "Sending…" : "Resend code"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div className="grid grid-cols-2 gap-4 items-start">
              <Field label="First Name" required error={errors.firstName}>
                <InputBox type="text" value={form.firstName} onChange={set("firstName")} placeholder="e.g. Shakila" style={errors.firstName ? { borderColor: ACCENT_RED } : {}} />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <InputBox type="text" value={form.lastName} onChange={set("lastName")} placeholder="e.g. Marando" style={errors.lastName ? { borderColor: ACCENT_RED } : {}} />
              </Field>
            </div>

            <Field label="Email Address" required error={errors.email}>
              <InputBox type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" style={errors.email ? { borderColor: ACCENT_RED } : {}} />
            </Field>

            <Field label="Phone Number" required error={errors.phone}>
              <div className="flex items-center h-12 rounded-full overflow-hidden bg-white/90" style={{ border: `1.5px solid ${errors.phone ? ACCENT_RED : INPUT_BORDER}` }}>
                <div className="flex items-center gap-1.5 px-4 h-full border-r flex-shrink-0 select-none" style={{ borderColor: INPUT_BORDER }}>
                  <span className="text-sm font-semibold" style={{ color: WINE }}>+254</span>
                </div>
                <input type="tel" value={form.phone} onChange={set("phone")} placeholder="718 436 649"
                  className="flex-1 h-full px-4 text-sm bg-transparent outline-none" style={{ color: WINE }} />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4 items-start">
              <Field label="Password" required error={errors.password}>
                <div className="relative">
                  <InputBox type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Min 8 characters" className="pr-10" style={errors.password ? { borderColor: ACCENT_RED } : {}} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" required error={errors.confirmPassword}>
                <div className="relative">
                  <InputBox type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Re-enter password" className="pr-10" style={errors.confirmPassword ? { borderColor: ACCENT_RED } : {}} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Gender" required error={errors.gender}>
                <div className="relative">
                  <select value={form.gender} onChange={set("gender")}
                    className="w-full h-12 pl-4 pr-10 rounded-full text-sm bg-white/90 outline-none appearance-none"
                    style={{ border: `1.5px solid ${errors.gender ? ACCENT_RED : INPUT_BORDER}`, color: form.gender ? WINE : "#9CA3AF" }}>
                    <option value="" disabled>Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </Field>
              <Field label="Date Of Birth" required error={errors.dob}>
                <InputBox type="date" value={form.dob} onChange={set("dob")} style={{ color: form.dob ? WINE : "#9CA3AF", ...(errors.dob ? { borderColor: ACCENT_RED } : {}) }} />
              </Field>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { id: "terms",
                  label: (<>I agree the{" "}
                    <Link href="/terms-of-service" className="underline font-semibold" style={{ color: "#fff" }}>Terms and conditions</Link>{" "}*
                  </>),
                  checked: terms, onChange: (v: boolean) => setTerms(v), error: errors.terms },
              ].map((cb) => (
                <label key={cb.id} className="flex items-start gap-3 cursor-pointer select-none">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input type="checkbox" checked={cb.checked} onChange={(e) => cb.onChange(e.target.checked)} className="sr-only" />
                    <div className="rounded flex items-center justify-center transition-colors"
                      style={{ width: 18, height: 18,
                        background: cb.checked ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` : "white",
                        border: `1.5px solid ${cb.error ? ACCENT_RED : cb.checked ? ACCENT_RED : INPUT_BORDER}` }}>
                      {cb.checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{cb.label}</span>
                    {cb.error && <p className="text-xs font-medium mt-0.5" style={{ color: ACCENT_RED }}>{cb.error}</p>}
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70 mt-2"
              style={{ height: 48, background: BTN_BG, boxShadow: "0 12px 24px -8px rgba(61,8,20,0.45)" }}
            >
              {loading ? "Creating account…" : (<>Sign Up</>)}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.3)" }} />
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>OR</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.3)" }} />
            </div>

            <GoogleSignInButton
              variant="glass"
              label="Sign up with Google"
              onClick={handleGoogle}
              disabled={!isLoaded}
              loading={googleLoading}
            />

            <div className="flex items-center justify-center gap-4">
              <SocialButton
                label="Sign up with Apple (coming soon)"
                disabled
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#9CA3AF" }}>
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                }
              />
              <SocialButton
                label="Sign up with Facebook (coming soon)"
                disabled
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#9CA3AF" }}>
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                }
              />
            </div>

            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
              Already have your Account?{" "}
              <Link href={`/account/login${redirectQuery}`} className="font-bold hover:underline" style={{ color: "#fff" }}>
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

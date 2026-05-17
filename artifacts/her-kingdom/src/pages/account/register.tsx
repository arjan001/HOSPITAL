import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useUser } from "@clerk/react"
import { useSignUp } from "@clerk/react/legacy"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Eye, EyeOff, ArrowRight, Info, Check, Mail, Loader2 } from "lucide-react"
import { Seo } from "@/components/seo"
import { upsertCustomer } from "@/lib/use-customer-mirror"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM         = "#FFFBF5"
const PEACH_BORDER  = "#F2DCC8"

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
      className={`w-full h-12 px-4 rounded-xl text-sm bg-white outline-none transition-shadow focus:shadow-md ${className}`}
      style={{ border: `1.5px solid ${PEACH_BORDER}`, color: WINE, ...props.style }}
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

  const [step, setStep] = useState<"form" | "verify">("form")
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
  const [newsletter, setNewsletter]   = useState(true)
  const [terms, setTerms]             = useState(false)
  const [isAdult, setIsAdult]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [topError, setTopError]       = useState("")
  const [code, setCode]               = useState("")

  useEffect(() => {
    if (isSignedIn) navigate("/user")
  }, [isSignedIn, navigate])

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
    if (!isAdult) e.adult = "You must confirm you are 18 or over"
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
      await signUp.create({
        emailAddress: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        unsafeMetadata: {
          phone: phoneE164,
          gender: form.gender,
          dob: form.dob,
          newsletter,
        },
      })
      // If Clerk completes immediately (verification disabled), sign in now.
      if (signUp.status === "complete") {
        await setActive({ session: signUp.createdSessionId })
        if (signUp.createdUserId) {
          upsertCustomer({
            id: signUp.createdUserId,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
            email: form.email.trim(),
            phone: phoneE164,
            source: "email",
          })
        }
        navigate("/user")
        return
      }
      // Otherwise prepare email verification and switch to the code-entry step.
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setStep("verify")
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
        navigate("/user")
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
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
    } catch (err) {
      setTopError(errorMessage(err, "Could not resend the code. Please try again."))
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
        redirectUrlComplete: `${BASE_PATH}/user`,
      })
      /* Success path = full-page redirect to Google; nothing else runs here. */
    } catch (err) {
      setGoogleLoading(false)
      setTopError(errorMessage(err, "Could not start Google sign-up. Please try again."))
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <Seo title="Create Your Shaniid RX Account" description="Join Shaniid RX in minutes — verified medicine, fair prices, door-to-door delivery and a calm pharmacy experience built around your family." canonicalPath="/account/register" noindex />
      <TopBar />
      <Navbar />

      <main
        className="flex-1 flex items-center justify-center px-4 py-12 lg:py-16 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
      >
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(185,28,28,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />

        <div
          className="relative w-full max-w-lg rounded-3xl overflow-hidden z-10"
          style={{
            background: "rgba(255,251,245,0.82)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${PEACH_BORDER}`,
            boxShadow: "0 40px 80px -24px rgba(61,8,20,0.2), 0 8px 24px -8px rgba(61,8,20,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div
            className="px-8 pt-8 pb-6"
            style={{
              background: "linear-gradient(135deg, rgba(255,228,200,0.8) 0%, rgba(255,205,170,0.6) 100%)",
              borderBottom: `1px solid ${PEACH_BORDER}`,
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: ACCENT_RED }}>Shaniid RX</p>
                <h1
                  className="text-2xl lg:text-3xl font-extrabold"
                  style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
                >
                  {step === "form" ? "Create Account" : "Verify Your Email"}
                </h1>
              </div>
              <div className="text-right shrink-0 mt-1">
                <p className="text-xs" style={{ color: WINE_SOFT }}>Have Account?</p>
                <Link href="/account/login" className="text-xs font-bold hover:underline" style={{ color: ACCENT_RED }}>
                  Log In
                </Link>
              </div>
            </div>
          </div>

          {topError && (
            <div className="mx-8 mt-5 rounded-xl px-4 py-3 text-sm flex items-start gap-2"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: ACCENT_RED }}>
              <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{topError}</span>
            </div>
          )}

          {step === "verify" ? (
            <form onSubmit={handleVerify} className="px-8 py-7 space-y-5">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
                style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>We've emailed a 6-digit code to <strong>{form.email}</strong>. Enter it below to verify your account.</span>
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
                disabled={loading}
                className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
                style={{ height: 52, background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`, boxShadow: "0 16px 32px -10px rgba(185,28,28,0.5)" }}
              >
                {loading ? "Verifying…" : (<>Verify & Continue <ArrowRight className="h-4 w-4" /></>)}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => setStep("form")} className="font-semibold hover:underline" style={{ color: WINE_SOFT }}>
                  ← Back to details
                </button>
                <button type="button" onClick={resendCode} className="font-semibold hover:underline" style={{ color: ACCENT_RED }}>
                  Resend code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required error={errors.firstName}>
                  <InputBox type="text" value={form.firstName} onChange={set("firstName")} placeholder="e.g. Shakila" style={errors.firstName ? { borderColor: ACCENT_RED } : {}} />
                </Field>
                <Field label="Last Name" required error={errors.lastName}>
                  <InputBox type="text" value={form.lastName} onChange={set("lastName")} placeholder="e.g. Marando" style={errors.lastName ? { borderColor: ACCENT_RED } : {}} />
                </Field>
              </div>

              <Field label="Phone Number" required error={errors.phone}>
                <div className="flex items-center h-12 rounded-xl overflow-hidden bg-white"
                  style={{ border: `1.5px solid ${errors.phone ? ACCENT_RED : PEACH_BORDER}` }}>
                  <div className="flex items-center gap-1.5 px-3 h-full border-r flex-shrink-0 select-none"
                    style={{ borderColor: PEACH_BORDER }}>
                    <span className="text-sm font-semibold" style={{ color: WINE }}>+254</span>
                  </div>
                  <input type="tel" value={form.phone} onChange={set("phone")} placeholder="718 436 649"
                    className="flex-1 h-full px-4 text-sm bg-transparent outline-none" style={{ color: WINE }} />
                </div>
              </Field>

              <Field label="Email ID" required error={errors.email}>
                <InputBox type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" style={errors.email ? { borderColor: ACCENT_RED } : {}} />
              </Field>

              <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs leading-relaxed"
                style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                We ask for your age and gender to keep things safe, accurate, and tailored just for you.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Gender" required error={errors.gender}>
                  <div className="relative">
                    <select value={form.gender} onChange={set("gender")}
                      className="w-full h-12 pl-4 pr-10 rounded-xl text-sm bg-white outline-none appearance-none"
                      style={{ border: `1.5px solid ${errors.gender ? ACCENT_RED : PEACH_BORDER}`, color: form.gender ? WINE : "#9CA3AF" }}>
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

              <div className="grid grid-cols-2 gap-4">
                <Field label="Password" required error={errors.password}>
                  <div className="relative">
                    <InputBox type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Min 8 characters" className="pr-10" style={errors.password ? { borderColor: ACCENT_RED } : {}} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Password" required error={errors.confirmPassword}>
                  <div className="relative">
                    <InputBox type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Re-enter password" className="pr-10" style={errors.confirmPassword ? { borderColor: ACCENT_RED } : {}} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { id: "newsletter", label: "Get the latest updates on new products and offers from Shaniid RX",
                    checked: newsletter, onChange: (v: boolean) => setNewsletter(v), error: undefined },
                  { id: "terms",
                    label: (<>I accept the{" "}
                      <Link href="/terms-of-service" className="underline font-semibold" style={{ color: ACCENT_RED }}>Terms and conditions</Link>{" "}
                      and{" "}
                      <Link href="/privacy-policy" className="underline font-semibold" style={{ color: ACCENT_RED }}>Privacy Policy</Link>{" "}*
                    </>),
                    checked: terms, onChange: (v: boolean) => setTerms(v), error: errors.terms },
                  { id: "adult", label: "I am over 18 years old *", checked: isAdult, onChange: (v: boolean) => setIsAdult(v), error: errors.adult },
                ].map((cb) => (
                  <label key={cb.id} className="flex items-start gap-3 cursor-pointer select-none">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input type="checkbox" checked={cb.checked} onChange={(e) => cb.onChange(e.target.checked)} className="sr-only" />
                      <div className="rounded flex items-center justify-center transition-colors"
                        style={{ width: 18, height: 18,
                          background: cb.checked ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` : "white",
                          border: `1.5px solid ${cb.error ? ACCENT_RED : cb.checked ? ACCENT_RED : PEACH_BORDER}` }}>
                        {cb.checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs leading-relaxed" style={{ color: WINE_SOFT }}>{cb.label}</span>
                      {cb.error && <p className="text-xs font-medium mt-0.5" style={{ color: ACCENT_RED }}>{cb.error}</p>}
                    </div>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || !isLoaded}
                className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70 mt-2"
                style={{ height: 52, background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`, boxShadow: "0 16px 32px -10px rgba(185,28,28,0.5)" }}
              >
                {loading ? "Creating account…" : (<>Create Account <ArrowRight className="h-4 w-4" /></>)}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: PEACH_BORDER }} />
                <span className="text-xs font-semibold" style={{ color: WINE_SOFT }}>OR</span>
                <div className="flex-1 h-px" style={{ background: PEACH_BORDER }} />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={!isLoaded || googleLoading}
                className="w-full h-12 rounded-full font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70"
                style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}`, color: WINE }}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to Google…
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-relaxed pt-1" style={{ color: WINE_SOFT }}>
                By creating an account, you agree to Shaniid RX's{" "}
                <Link href="/terms-of-service" className="underline font-semibold" style={{ color: ACCENT_RED }}>Terms &amp; Conditions</Link>
                {" "}and{" "}
                <Link href="/privacy-policy" className="underline font-semibold" style={{ color: ACCENT_RED }}>Privacy Policy</Link>.
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

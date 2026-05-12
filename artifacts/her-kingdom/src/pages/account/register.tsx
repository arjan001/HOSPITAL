import { useState } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Eye, EyeOff, ArrowRight, Info, Check } from "lucide-react"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM         = "#FFFBF5"
const PEACH_BORDER  = "#F2DCC8"

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

export default function AccountRegisterPage() {
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
  const [showPw, setShowPw]        = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newsletter, setNewsletter]   = useState(true)
  const [terms, setTerms]             = useState(false)
  const [isAdult, setIsAdult]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [success, setSuccess]         = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1100))
    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <TopBar />
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div
            className="w-full max-w-md rounded-3xl p-10 text-center"
            style={{
              background: "rgba(255,251,245,0.85)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${PEACH_BORDER}`,
              boxShadow: "0 32px 80px -24px rgba(61,8,20,0.18)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
            >
              <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-extrabold mb-2" style={{ color: WINE }}>Account Created!</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: WINE_SOFT }}>
              Welcome to Shaniid RX, <strong>{form.firstName}</strong>! Check your email to verify your account.
            </p>
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-full font-bold text-white text-sm transition-transform hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`, boxShadow: "0 14px 28px -10px rgba(185,28,28,0.45)" }}
            >
              Sign In Now <ArrowRight className="h-4 w-4" />
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
        className="flex-1 flex items-center justify-center px-4 py-12 lg:py-16 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(185,28,28,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />

        {/* Card */}
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
          {/* Header */}
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
                  Create Account
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

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" required error={errors.firstName}>
                <InputBox
                  type="text"
                  value={form.firstName}
                  onChange={set("firstName")}
                  placeholder="e.g. Shakila"
                  style={errors.firstName ? { borderColor: ACCENT_RED } : {}}
                />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <InputBox
                  type="text"
                  value={form.lastName}
                  onChange={set("lastName")}
                  placeholder="e.g. Marando"
                  style={errors.lastName ? { borderColor: ACCENT_RED } : {}}
                />
              </Field>
            </div>

            {/* Phone */}
            <Field label="Phone Number" required error={errors.phone}>
              <div
                className="flex items-center h-12 rounded-xl overflow-hidden bg-white"
                style={{ border: `1.5px solid ${errors.phone ? ACCENT_RED : PEACH_BORDER}` }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 h-full border-r flex-shrink-0 select-none"
                  style={{ borderColor: PEACH_BORDER }}
                >
                  <span className="text-lg leading-none">🇰🇪</span>
                  <span className="text-sm font-semibold" style={{ color: WINE }}>+254</span>
                </div>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="718 436 649"
                  className="flex-1 h-full px-4 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
              </div>
            </Field>

            {/* Email */}
            <Field label="Email ID" required error={errors.email}>
              <div
                className="flex items-center h-12 rounded-xl overflow-hidden bg-white"
                style={{ border: `1.5px solid ${errors.email ? ACCENT_RED : PEACH_BORDER}` }}
              >
                <span className="pl-4 pr-2 flex-shrink-0">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className="flex-1 h-full pr-4 text-sm bg-transparent outline-none"
                  style={{ color: WINE }}
                />
              </div>
            </Field>

            {/* Info banner */}
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}
            >
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              We ask for your age and gender to keep things safe, accurate, and tailored just for you.
            </div>

            {/* Gender + DOB */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Gender" required error={errors.gender}>
                <div className="relative">
                  <select
                    value={form.gender}
                    onChange={set("gender")}
                    className="w-full h-12 pl-4 pr-10 rounded-xl text-sm bg-white outline-none appearance-none"
                    style={{ border: `1.5px solid ${errors.gender ? ACCENT_RED : PEACH_BORDER}`, color: form.gender ? WINE : "#9CA3AF" }}
                  >
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
                <InputBox
                  type="date"
                  value={form.dob}
                  onChange={set("dob")}
                  style={{ color: form.dob ? WINE : "#9CA3AF", ...(errors.dob ? { borderColor: ACCENT_RED } : {}) }}
                />
              </Field>
            </div>

            {/* Password row */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Password" required error={errors.password}>
                <div className="relative">
                  <InputBox
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Min 8 characters"
                    className="pr-10"
                    style={errors.password ? { borderColor: ACCENT_RED } : {}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" required error={errors.confirmPassword}>
                <div className="relative">
                  <InputBox
                    type={showConfirm ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    placeholder="Re-enter password"
                    className="pr-10"
                    style={errors.confirmPassword ? { borderColor: ACCENT_RED } : {}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-1">
              {[
                {
                  id: "newsletter",
                  label: "Get the latest updates on new products and offers from Shaniid RX",
                  checked: newsletter,
                  onChange: (v: boolean) => setNewsletter(v),
                  error: undefined,
                },
                {
                  id: "terms",
                  label: (
                    <>
                      I accept the{" "}
                      <Link href="/terms-of-service" className="underline font-semibold" style={{ color: ACCENT_RED }}>Terms and conditions</Link>{" "}
                      and{" "}
                      <Link href="/privacy-policy" className="underline font-semibold" style={{ color: ACCENT_RED }}>Privacy Policy</Link>{" "}*
                    </>
                  ),
                  checked: terms,
                  onChange: (v: boolean) => setTerms(v),
                  error: errors.terms,
                },
                {
                  id: "adult",
                  label: "I am over 18 years old *",
                  checked: isAdult,
                  onChange: (v: boolean) => setIsAdult(v),
                  error: errors.adult,
                },
              ].map((cb) => (
                <label key={cb.id} className="flex items-start gap-3 cursor-pointer select-none">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={cb.checked}
                      onChange={(e) => cb.onChange(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="w-4.5 h-4.5 rounded flex items-center justify-center transition-colors"
                      style={{
                        width: 18,
                        height: 18,
                        background: cb.checked ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` : "white",
                        border: `1.5px solid ${cb.error ? ACCENT_RED : cb.checked ? ACCENT_RED : PEACH_BORDER}`,
                      }}
                    >
                      {cb.checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs leading-relaxed" style={{ color: WINE_SOFT }}>
                      {typeof cb.label === "string" ? cb.label : cb.label}
                    </span>
                    {cb.error && <p className="text-xs font-medium mt-0.5" style={{ color: ACCENT_RED }}>{cb.error}</p>}
                  </div>
                </label>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70 mt-2"
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
                <>Create Account <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            {/* Footer note */}
            <p className="text-center text-xs leading-relaxed pt-1" style={{ color: WINE_SOFT }}>
              By creating an account, you agree to Shaniid RX's{" "}
              <Link href="/terms-of-service" className="underline font-semibold" style={{ color: ACCENT_RED }}>Terms &amp; Conditions</Link>
              {" "}and{" "}
              <Link href="/privacy-policy" className="underline font-semibold" style={{ color: ACCENT_RED }}>Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}

import { useState, useRef } from "react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Upload, FileText, Camera, CheckCircle2, X, ArrowRight, Shield, Clock, Phone } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"

const WINE          = "#3D0814"
const WINE_SOFT     = "#6B0F1A"
const ACCENT_RED    = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM         = "#FFFBF5"
const PEACH_BORDER  = "#F2DCC8"

export default function UploadPrescriptionPage() {
  const { whatsappHref, phoneHref, phoneDisplay } = useStoreContact()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [notes, setNotes] = useState("")
  const [phone, setPhone] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [drag, setDrag] = useState(false)

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid = Array.from(incoming).filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)
    )
    setFiles((prev) => [...prev, ...valid].slice(0, 5))
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDrag(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <TopBar />
        <Navbar />
        <main
          className="flex-1 flex items-center justify-center px-4 py-20 relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 55%, #FFE4C8 100%)" }}
        >
          <div
            className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(21,128,61,0.07) 0%, transparent 70%)", filter: "blur(60px)" }}
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
            <h2
              className="text-2xl font-extrabold mb-2"
              style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
            >
              Prescription Received!
            </h2>
            <p className="text-sm leading-relaxed mb-7" style={{ color: WINE_SOFT }}>
              Our licensed pharmacist will review your prescription and contact you within <strong>30 minutes</strong> to confirm your order and payment.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 h-12 rounded-full font-bold text-white text-sm transition-transform hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`, boxShadow: "0 14px 28px -10px rgba(185,28,28,0.45)" }}
              >
                Continue Shopping <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-12 rounded-full font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                style={{ background: "#25D366" }}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>
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
        className="flex-1 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0DE 60%, #FFE4C8 100%)" }}
      >
        {/* Blobs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(185,28,28,0.09) 0%, transparent 70%)", filter: "blur(60px)" }} />

        <div className="mx-auto max-w-5xl px-4 py-12 lg:py-16 relative z-10">

          {/* Hero */}
          <div className="text-center mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2" style={{ color: ACCENT_RED }}>
              Shaniid RX
            </p>
            <h1
              className="text-3xl lg:text-5xl font-extrabold leading-tight"
              style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
            >
              Upload Your Prescription
            </h1>
            <p className="mt-3 text-sm lg:text-base max-w-lg mx-auto leading-relaxed" style={{ color: WINE_SOFT }}>
              Securely upload your prescription — our licensed pharmacists will review it and prepare your order within 30 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Main upload form ── */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-4 py-14 px-8 text-center transition-all"
                style={{
                  background: drag ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(16px)",
                  border: `2px dashed ${drag ? ACCENT_ORANGE : PEACH_BORDER}`,
                  boxShadow: "0 8px 28px -16px rgba(61,8,20,0.12)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                    boxShadow: "0 10px 24px -8px rgba(185,28,28,0.4)",
                    transform: drag ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  <Upload className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: WINE }}>
                    {drag ? "Drop files here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-xs mt-1" style={{ color: WINE_SOFT }}>
                    PNG, JPG, WebP or PDF · Up to 5 files · Max 10 MB each
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  className="sr-only"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: "white", border: `1px solid ${PEACH_BORDER}` }}
                    >
                      <FileText className="h-5 w-5 flex-shrink-0" style={{ color: ACCENT_RED }} />
                      <span className="flex-1 text-sm truncate" style={{ color: WINE }}>{f.name}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: WINE_SOFT }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact phone */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                  Your Phone Number *
                </label>
                <div
                  className="flex items-center h-12 rounded-xl overflow-hidden"
                  style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}` }}
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
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="7XX XXX XXX — pharmacist will call this number"
                    className="flex-1 h-full px-4 text-sm bg-transparent outline-none"
                    style={{ color: WINE }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                  Additional Notes <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. I need the generic version, refill for 3 months, specific brand preferred…"
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-shadow focus:shadow-md"
                  style={{ background: "white", border: `1.5px solid ${PEACH_BORDER}`, color: WINE }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || files.length === 0 || !phone.trim()}
                className="w-full h-14 rounded-full font-bold text-base text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50"
                style={{
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
                  <>
                    <Upload className="h-5 w-5" />
                    Submit Prescription
                  </>
                )}
              </button>

              {files.length === 0 && (
                <p className="text-center text-xs" style={{ color: WINE_SOFT }}>
                  Please upload at least one prescription file to continue.
                </p>
              )}
            </form>

            {/* ── Info sidebar ── */}
            <div className="space-y-5">
              {/* WhatsApp alternative */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 8px 24px -12px rgba(61,8,20,0.12)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: WINE_SOFT }}>
                  Prefer WhatsApp?
                </p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: WINE_SOFT }}>
                  Simply send a photo of your prescription directly to our pharmacy team.
                </p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 h-11 px-4 rounded-xl font-bold text-sm text-white w-full justify-center transition-transform hover:scale-[1.02]"
                  style={{ background: "#25D366" }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                  Send on WhatsApp
                </a>
              </div>

              {/* What happens next */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 8px 24px -12px rgba(61,8,20,0.12)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: WINE_SOFT }}>
                  What Happens Next
                </p>
                <div className="space-y-4">
                  {[
                    { icon: <Upload className="h-4 w-4" />, step: "1", text: "You upload your prescription" },
                    { icon: <FileText className="h-4 w-4" />, step: "2", text: "Our pharmacist reviews it within 30 min" },
                    { icon: <Phone className="h-4 w-4" />, step: "3", text: "We call you to confirm & take payment" },
                    { icon: <Clock className="h-4 w-4" />, step: "4", text: "Your order is dispatched same day" },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                        style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                      >
                        {s.icon}
                      </div>
                      <p className="text-xs leading-relaxed pt-1.5" style={{ color: WINE_SOFT }}>{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badge */}
              <div
                className="rounded-2xl p-5 flex items-start gap-3"
                style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 8px 24px -12px rgba(61,8,20,0.12)" }}
              >
                <Shield className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: ACCENT_RED }} />
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: WINE }}>100% Secure & Confidential</p>
                  <p className="text-xs leading-relaxed" style={{ color: WINE_SOFT }}>
                    Your prescription data is encrypted and only accessed by our licensed pharmacists. We are fully compliant with Pharmacy and Poisons Board regulations.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

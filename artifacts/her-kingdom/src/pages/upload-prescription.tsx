import { useState, useRef } from "react"
import { Link, useLocation } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { X, ArrowLeft, FileText, ShieldCheck, Phone, Clock, ArrowRight, MessageCircle } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import { cmsStore, newId } from "@/lib/cms-store"
import type { Prescription } from "@/components/admin/prescriptions"
import { apiPrescriptions, refreshMyPrescriptions } from "@/lib/api-nest"

type UserPrescriptionRow = {
  id: string
  rxNumber: string
  name: string
  date: string
  total: number
  recipient: string
  status: "Pending" | "Verified" | "Dispensed" | "Cancelled"
}

const WINE       = "#3D0814"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORG = "#F97316"
const BORDER     = "#e5e7eb"

/* ── Step indicator ─────────────────────────────────────── */
const STEPS = ["Upload Your Attachments", "Set Your Recipient", "Payment"]

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      <Seo
        title="Upload Your Prescription Securely"
        description="Send your prescription to Shaniid RX in seconds. A verified pharmacist will review, prepare and deliver — safely, discreetly and on time."
        keywords={["upload prescription Kenya","online prescription Nairobi","Shaniid RX prescription","secure pharmacy upload"]}
        canonicalPath="/upload-prescription"
      />
      {STEPS.map((label, i) => {
        const idx    = i + 1
        const done   = idx < current
        const active = idx === current
        return (
          <div key={idx} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: done || active
                    ? `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`
                    : "#e5e7eb",
                  color: done || active ? "#fff" : "#9ca3af",
                }}
              >
                {idx}
              </div>
              <span
                className="text-sm whitespace-nowrap"
                style={{ color: active ? WINE : done ? ACCENT_RED : "#9ca3af", fontWeight: active ? 600 : 400 }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="mx-3 flex-shrink-0"
                style={{ width: 48, height: 1, background: i + 1 < current ? ACCENT_RED : "#e5e7eb" }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── File row ────────────────────────────────────────────── */
function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE"
  const kb  = (file.size / 1024).toFixed(0)
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 flex-shrink-0" style={{ color: ACCENT_RED }} />
        <div className="min-w-0">
          <p className="text-sm truncate" style={{ color: WINE }}>{file.name}</p>
          <p className="text-xs" style={{ color: "#6b7280" }}>{ext.toLowerCase()} {kb}</p>
        </div>
      </div>
      <button type="button" onClick={onRemove} className="ml-4 flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ── Next-step row (used in success modal) ────────────────── */
function NextRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="w-7 h-7 flex items-center justify-center flex-shrink-0 border"
        style={{ borderColor: "#E5E7EB", color: WINE, background: "#fff" }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <span className="text-sm leading-snug pt-0.5" style={{ color: "#374151" }}>
        {children}
      </span>
    </li>
  )
}

/* ── Upload icon SVG ──────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#f3f4f6"/>
      <path d="M20 25V15M20 15L16 19M20 15L24 19" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 28h12" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function UploadPrescriptionPage() {
  const [, navigate]       = useLocation()
  const { whatsappHref }   = useStoreContact()
  const fileRef            = useRef<HTMLInputElement>(null)

  /* step state */
  const [step, setStep]    = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [submittedRx, setSubmittedRx] = useState<{ rxNumber: string; name: string } | null>(null)

  /* step 1 */
  const [files, setFiles]         = useState<File[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "insurance">("cash")

  /* step 2 */
  const [firstName, setFirstName] = useState("")
  const [lastName,  setLastName]  = useState("")
  const [gender,    setGender]    = useState("")
  const [dob,       setDob]       = useState("")

  const addFiles = (fl: FileList | null) => {
    if (!fl) return
    setFiles((prev) =>
      [...prev, ...Array.from(fl).filter((f) =>
        ["image/jpeg","image/png","image/webp","application/pdf"].includes(f.type)
      )].slice(0, 5)
    )
  }

  const removeFile = (i: number) => setFiles((p) => p.filter((_,j) => j !== i))

  const handleSubmit = async () => {
    const now = new Date()
    const isoDate = now.toISOString().slice(0, 10)
    const fullName = `${firstName} ${lastName}`.trim() || "Customer"
    const id = newId("rx")
    const rxNumber = id.slice(-8).toUpperCase()
    const fileNames = files.map((f) => f.name).join(", ") || "No file"
    const displayName = files[0]?.name ?? "Prescription"

    const adminRec: Prescription = {
      id,
      patientName: fullName,
      phone: "",
      dob,
      imageUrl: "",
      notes:
        `Submitted via storefront. Files: ${fileNames}. ` +
        `Payment: ${paymentMethod === "insurance" ? "Insurance" : "Cash"}.`,
      status: "pending",
      pharmacistNote: "",
      recommendedDrugs: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    const adminList = cmsStore.get<Prescription[]>("prescriptions", [])
    cmsStore.set("prescriptions", [adminRec, ...adminList])

    const userRec: UserPrescriptionRow = {
      id,
      rxNumber,
      name: displayName.length > 60 ? displayName.slice(0, 57) + "…" : displayName,
      date: isoDate,
      total: 0,
      recipient: fullName,
      status: "Pending",
    }
    const userList = cmsStore.get<UserPrescriptionRow[]>("user-prescriptions", [])
    cmsStore.set("user-prescriptions", [userRec, ...userList])

    // Also persist to the NestJS api-nest backend so the customer's
    // /account/prescriptions view has a real per-session source of truth.
    // localStorage above keeps the legacy admin panel (still on cmsStore)
    // working until it ports to NestJS.
    try {
      await apiPrescriptions.create({
        patientName: fullName,
        recipient: fullName,
        dob: dob || undefined,
        phone: "",
        email: "",
        files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        notes: `Submitted via storefront. Payment: ${paymentMethod === "insurance" ? "Insurance" : "Cash"}.`,
        paymentMethod: paymentMethod === "insurance" ? "insurance" : "cash",
      })
      void refreshMyPrescriptions()
    } catch { /* backend optional — local copy still saved */ }

    setSubmittedRx({ rxNumber, name: displayName })
    setShowModal(true)
  }

  /* ── Action buttons shared style ── */
  const btnGreen = {
    background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`,
    color: "#fff",
    border: "none",
  } as React.CSSProperties

  const btnOutline = {
    background: "#fff",
    color: WINE,
    border: `1px solid ${BORDER}`,
  } as React.CSSProperties

  /* ──────────── Step 1 ──────────── */
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: WINE }}>Upload Your Prescription</h2>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Your prescription is required for us to verify and proceed to the next step.
        </p>
      </div>

      {/* Drop / click zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer rounded-lg flex flex-col items-center justify-center py-10 gap-3"
        style={{ border: `1.5px dashed ${ACCENT_RED}`, background: "#fff" }}
      >
        <UploadIcon />
        <span className="text-sm font-medium" style={{ color: ACCENT_RED }}>Click to Upload!</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Size note */}
      <p className="text-sm px-4 py-2.5 rounded-lg" style={{ background: "#f9fafb", color: "#6b7280", border: `1px solid ${BORDER}` }}>
        Image or PDF file size must be under 5 MB.
      </p>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => <FileRow key={i} file={f} onRemove={() => removeFile(i)} />)}
        </div>
      )}

      {/* Payment method */}
      <div>
        <h3 className="text-base font-semibold mb-3" style={{ color: WINE }}>Payment Method</h3>
        <div className="flex items-center gap-6">
          {(["cash","insurance"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm select-none" style={{ color: WINE }}>
              <span
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: paymentMethod === opt ? ACCENT_RED : "#d1d5db" }}
              >
                {paymentMethod === opt && (
                  <span className="w-2 h-2 rounded-full" style={{ background: ACCENT_RED }} />
                )}
              </span>
              <input
                type="radio"
                name="payment"
                value={opt}
                checked={paymentMethod === opt}
                onChange={() => setPaymentMethod(opt)}
                className="sr-only"
              />
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 px-6 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-gray-50"
          style={btnOutline}
        >
          Speak to a Doctor
        </a>
        <button
          type="button"
          disabled={files.length === 0}
          onClick={() => setStep(2)}
          className="h-11 px-8 rounded-full text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-90"
          style={btnGreen}
        >
          Continue
        </button>
      </div>
    </div>
  )

  /* ──────────── Step 2 ──────────── */
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: WINE }}>Set Your Recipient</h2>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Who is this prescription for?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "First Name", value: firstName, set: setFirstName, placeholder: "e.g. Amina" },
          { label: "Last Name",  value: lastName,  set: setLastName,  placeholder: "e.g. Wanjiku" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "#6b7280" }}>{label}</label>
            <input
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              className="w-full h-11 px-3 rounded-lg text-sm outline-none transition-shadow focus:shadow-sm"
              style={{ border: `1px solid ${BORDER}`, color: WINE }}
            />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "#6b7280" }}>Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full h-11 px-3 rounded-lg text-sm outline-none bg-white"
            style={{ border: `1px solid ${BORDER}`, color: WINE }}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "#6b7280" }}>Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full h-11 px-3 rounded-lg text-sm outline-none"
            style={{ border: `1px solid ${BORDER}`, color: WINE }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="h-11 px-6 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors"
          style={btnOutline}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          disabled={!firstName.trim() || !lastName.trim() || !gender || !dob}
          onClick={() => setStep(3)}
          className="h-11 px-8 rounded-full text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          style={btnGreen}
        >
          Continue
        </button>
      </div>
    </div>
  )

  /* ──────────── Step 3 ──────────── */
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        {/* Files section */}
        <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm" style={{ color: WINE }}>Subscription Summary</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#6b7280" }}>
              <FileText className="h-4 w-4" style={{ color: ACCENT_RED }} />
              {files.length} File{files.length !== 1 ? "s" : ""}
            </div>
            <button type="button" onClick={() => setStep(1)} className="text-sm font-medium" style={{ color: ACCENT_RED }}>
              Edit Files
            </button>
          </div>
        </div>

        {/* Recipient section */}
        <div className="px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm" style={{ color: WINE }}>Recipient</span>
            <button type="button" onClick={() => setStep(2)} className="text-sm font-medium" style={{ color: ACCENT_RED }}>
              Edit Details
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "First Name:",   value: firstName },
              { label: "Last Name:",    value: lastName },
              { label: "Gender:",       value: gender.charAt(0).toUpperCase() + gender.slice(1) },
              { label: "Date of Birth:", value: dob },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2" style={{ color: "#6b7280" }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 16 16" stroke={ACCENT_RED} strokeWidth="1.4">
                    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                    <path d="M5 1v4M11 1v4M2 7h12"/>
                  </svg>
                  {label}
                </span>
                <span className="font-medium uppercase" style={{ color: WINE }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment options section */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm" style={{ color: WINE }}>Payment Options</span>
            <button type="button" onClick={() => setStep(1)} className="text-sm font-medium" style={{ color: ACCENT_RED }}>
              Edit Details
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Payment Option:",    value: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) },
              { label: "Insurance Provider:", value: paymentMethod === "insurance" ? "—" : "None" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2" style={{ color: "#6b7280" }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 16 16" stroke={ACCENT_RED} strokeWidth="1.4">
                    <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                    <path d="M5 1v4M11 1v4M2 7h12"/>
                  </svg>
                  {label}
                </span>
                <span className="font-medium" style={{ color: WINE }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="h-11 px-6 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-gray-50 transition-colors"
          style={btnOutline}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="h-11 px-10 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          style={btnGreen}
        >
          Submit
        </button>
      </div>
    </div>
  )

  /* ──────────── Success modal — flat, sharp, professional ──────────── */
  const SuccessModal = () => {
    const reset = () => {
      setShowModal(false)
      setSubmittedRx(null)
      setStep(1)
      setFiles([])
      setFirstName(""); setLastName(""); setGender(""); setDob("")
      setPaymentMethod("cash")
    }
    const close = () => setShowModal(false)
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        style={{ background: "rgba(15,23,42,0.55)" }}
        onClick={close}
      >
        <div
          className="bg-white w-full max-w-md relative border"
          style={{ borderColor: "#E5E7EB", borderRadius: 4 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rx-success-title"
        >
          {/* Top accent bar */}
          <div style={{ height: 3, background: WINE }} />

          {/* Header */}
          <div
            className="flex items-start justify-between gap-4 px-6 py-5 border-b"
            style={{ borderColor: "#E5E7EB" }}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ background: WINE, color: "#fff" }}
              >
                <FileText className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-[10.5px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "#6B7280" }}
                >
                  Prescription · Received
                </p>
                <h2
                  id="rx-success-title"
                  className="text-[17px] font-semibold leading-tight mt-0.5"
                  style={{ color: WINE }}
                >
                  Submitted to our pharmacy team
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Reference + summary */}
          <div className="px-6 py-5 border-b" style={{ borderColor: "#E5E7EB" }}>
            <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
              Thank you{firstName ? `, ${firstName}` : ""}. A licensed pharmacist will review
              your prescription and reach out to confirm dosage, payment and delivery.
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <dt className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#6B7280" }}>
                Reference
              </dt>
              <dd className="font-mono text-[13px] text-right" style={{ color: WINE }}>
                RX-{submittedRx?.rxNumber ?? "————"}
              </dd>

              <dt className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#6B7280" }}>
                Files
              </dt>
              <dd className="text-right truncate" style={{ color: "#111827" }}>
                {files.length} {files.length === 1 ? "document" : "documents"}
              </dd>

              <dt className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#6B7280" }}>
                Payment
              </dt>
              <dd className="text-right capitalize" style={{ color: "#111827" }}>
                {paymentMethod}
              </dd>
            </dl>
          </div>

          {/* What happens next */}
          <div className="px-6 py-5 border-b" style={{ borderColor: "#E5E7EB" }}>
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.16em] mb-3"
              style={{ color: "#6B7280" }}
            >
              What happens next
            </p>
            <ul className="space-y-3">
              <NextRow icon={Phone}>
                A licensed pharmacist will <strong className="font-semibold" style={{ color: WINE }}>call you</strong> to
                confirm dosage and delivery.
              </NextRow>
              <NextRow icon={Clock}>
                Usually within <strong className="font-semibold" style={{ color: WINE }}>15 minutes</strong> during pharmacy
                hours (8&nbsp;AM – 10&nbsp;PM).
              </NextRow>
              <NextRow icon={ShieldCheck}>
                Your details are kept <strong className="font-semibold" style={{ color: WINE }}>private and secure</strong>.
              </NextRow>
            </ul>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 flex flex-col sm:flex-row gap-2.5 bg-white">
            <button
              type="button"
              onClick={reset}
              className="flex-1 h-11 px-5 text-sm font-semibold border transition-colors hover:bg-neutral-50"
              style={{ borderColor: "#D1D5DB", color: WINE, borderRadius: 4 }}
            >
              Upload another
            </button>
            <button
              type="button"
              onClick={() => { close(); navigate("/user?tab=prescriptions") }}
              className="flex-1 h-11 px-5 text-sm font-semibold inline-flex items-center justify-center gap-2 border transition-colors hover:bg-neutral-50"
              style={{ borderColor: "#D1D5DB", color: WINE, borderRadius: 4 }}
            >
              View my prescriptions
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/shop"
              onClick={close}
              className="flex-1 h-11 px-5 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`,
                borderRadius: 4,
              }}
            >
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Footer help */}
          <div
            className="px-6 py-3 border-t flex items-center justify-between gap-3"
            style={{ borderColor: "#E5E7EB", background: "#F9FAFB" }}
          >
            <span className="text-[11px]" style={{ color: "#6B7280" }}>
              Need help right now?
            </span>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{ color: WINE }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar />
      <Navbar />

      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">

          {/* Breadcrumb (step 3 only) */}
          {step === 3 && (
            <nav className="text-xs mb-6 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
              <Link href="/" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/services" className="hover:underline">Services</Link>
              <span>/</span>
              <span style={{ color: WINE }}>Submit a Prescription</span>
            </nav>
          )}

          {/* Step heading + stepper */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <h1 className="text-3xl font-bold" style={{ color: WINE }}>Step {step}</h1>
            <div className="flex-shrink-0 pt-1">
              <Stepper current={step} />
            </div>
          </div>

          {/* Step content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </main>

      <Footer />

      {showModal && <SuccessModal />}
    </div>
  )
}

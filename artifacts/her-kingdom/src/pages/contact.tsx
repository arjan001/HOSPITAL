import { useState } from "react"
import { Link } from "wouter"
import { Phone, Mail, MapPin, Clock, CheckCircle2 } from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useStoreContact } from "@/hooks/use-store-contact"
import { submitContactInquiry, type InquiryCategory } from "@/lib/contact-inquiries-client"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

const TEAL = "#16a3a3"
const TEAL_DARK = "#0e7e7e"

const HERO_BG = "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=1600"
const DOCTOR_GET_IN_TOUCH = "https://images.pexels.com/photos/33055501/pexels-photo-33055501/free-photo-of-confident-female-doctor-with-stethoscope-close-up.jpeg?auto=compress&cs=tinysrgb&w=700"

const CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: "general",      label: "General enquiry" },
  { value: "prescription", label: "Prescription / refill" },
  { value: "order",        label: "Existing order" },
  { value: "delivery",     label: "Delivery question" },
  { value: "product",      label: "Product availability" },
  { value: "billing",      label: "Billing / payment" },
  { value: "complaint",    label: "Complaint" },
  { value: "partnership",  label: "Partnership / B2B" },
  { value: "other",        label: "Other" },
]

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  category: "general" as InquiryCategory,
  subject: "",
  message: "",
  preferredContact: "whatsapp" as "email" | "phone" | "whatsapp",
  isExistingPatient: false,
  patientId: "",
  dob: "",
  consent: false,
}

export default function ContactPage() {
  const { phoneHref, phoneDisplay } = useStoreContact()

  const [form, setForm] = useState(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.fullName.trim()) return setError("Please enter your full name.")
    if (!form.email.trim()) return setError("Please enter your email address.")
    if (!form.phone.trim()) return setError("Please enter a contact phone number.")
    if (!form.subject.trim()) return setError("Please add a short subject line.")
    if (!form.message.trim()) return setError("Please type your message.")
    if (!form.consent) return setError("Please tick the consent box so we can reply to you.")

    setSubmitting(true)
    const result = await submitContactInquiry({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      category: form.category,
      subject: form.subject.trim(),
      message: form.message.trim(),
      preferredContact: form.preferredContact,
      isExistingPatient: form.isExistingPatient,
      patientId: form.patientId.trim() || undefined,
      dob: form.dob.trim() || undefined,
      consent: form.consent,
      source: "Contact Page",
    })
    setSubmitting(false)

    if ("error" in result) {
      setError("We couldn't send your message just now. Please try again or call us directly.")
      return
    }

    setSubmitted(true)
    setForm(EMPTY)
    setTimeout(() => setSubmitted(false), 8000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Seo
        title="Contact Shaniid RX — We Are Here to Help"
        description="Reach the Shaniid RX team for support, supplier inquiries or feedback. Calm, professional response — your message reaches a real pharmacist."
        keywords={["contact Shaniid RX","pharmacy support Kenya","supplier inquiries","customer care"]}
        canonicalPath="/contact"
      />
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.55)), url(${HERO_BG})`,
          }}
        >
          <div className="mx-auto max-w-6xl px-4 lg:px-6 py-20 lg:py-28 text-center">
            <h1 className="font-serif text-3xl lg:text-5xl font-semibold text-neutral-900">
              We are here to help
            </h1>
            <p className="mt-4 text-[15px] text-neutral-600 max-w-xl mx-auto">
              Reach out to our pharmacy team — we usually reply within fifteen minutes during working hours.
            </p>
          </div>
        </section>

        {/* Contact info + Map */}
        <section className="py-14 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 lg:px-6 grid lg:grid-cols-[340px_1fr] gap-10 lg:gap-14">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-neutral-900 mb-2">Contact Us</h2>
              <p className="text-sm text-neutral-600 leading-relaxed mb-8">
                Pharmacists, prescription queries, deliveries — pick the channel that suits you best.
              </p>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full" style={{ background: "#e6f6f6", color: TEAL }}>
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1">Address</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      Philadelphia House, 3rd Floor, Wing&nbsp;B<br />
                      Room 9 — Nairobi, Kenya
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full" style={{ background: "#e6f6f6", color: TEAL }}>
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1">Phone Number</p>
                    <a href={phoneHref} className="block text-sm text-neutral-700 hover:text-neutral-900">{phoneDisplay}</a>
                    <a href={phoneHref} className="block text-sm text-neutral-700 hover:text-neutral-900">+254 (0) 700 000 000</a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full" style={{ background: "#e6f6f6", color: TEAL }}>
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1">Email</p>
                    <a href="mailto:support@shaniidrx.co.ke" className="block text-sm text-neutral-700 hover:text-neutral-900">support@shaniidrx.co.ke</a>
                    <a href="mailto:rx@shaniidrx.co.ke" className="block text-sm text-neutral-700 hover:text-neutral-900">rx@shaniidrx.co.ke</a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full" style={{ background: "#e6f6f6", color: TEAL }}>
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1">Working Hours</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      Mon – Fri: 8:00 – 22:00<br />
                      Sat – Sun: 9:00 – 20:00
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="relative w-full h-[440px] lg:h-[520px] rounded-md overflow-hidden border border-neutral-200">
              <iframe
                title="Shaniid RX location"
                src="https://www.google.com/maps?q=Philadelphia+House+Nairobi&output=embed"
                className="w-full h-full"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        {/* Get in touch — doctor + form */}
        <section className="py-14 lg:py-20 border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 lg:px-6 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-14 items-start">

            {/* Doctor image */}
            <div className="relative h-[420px] lg:h-[640px] hidden lg:block">
              <img
                src={DOCTOR_GET_IN_TOUCH}
                alt="Pharmacist ready to help"
                className="w-full h-full object-cover object-top rounded-md sticky top-24"
              />
            </div>

            {/* Form */}
            <div>
              <h2 className="font-serif text-3xl lg:text-4xl font-semibold text-neutral-900">Get in touch</h2>
              <p className="mt-3 text-[15px] text-neutral-600 leading-relaxed max-w-md">
                Share your details and your enquiry — one of our pharmacists or care representatives will get back to you within working hours.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-md border border-green-200 bg-green-50 p-6 max-w-2xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900">Thanks — your message is in.</p>
                      <p className="text-sm text-green-800 mt-1">
                        Our team will reply within working hours via your preferred channel. For urgent matters please call{" "}
                        <a href={phoneHref} className="underline underline-offset-4 font-medium">{phoneDisplay}</a>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5 max-w-2xl">
                  {/* Identity */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Full name *">
                      <input
                        type="text" required value={form.fullName}
                        onChange={(e) => update("fullName", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Email *">
                      <input
                        type="email" required value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Phone / WhatsApp *">
                      <input
                        type="tel" required value={form.phone} placeholder="+254 7XX XXX XXX"
                        onChange={(e) => update("phone", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Date of birth (optional)">
                      <input
                        type="date" value={form.dob}
                        onChange={(e) => update("dob", e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* Patient on file */}
                  <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-700 pb-2">
                      <input
                        type="checkbox" checked={form.isExistingPatient}
                        onChange={(e) => update("isExistingPatient", e.target.checked)}
                        className="h-4 w-4"
                      />
                      I’m an existing patient
                    </label>
                    {form.isExistingPatient && (
                      <Field label="Patient ID (if known)">
                        <input
                          type="text" value={form.patientId}
                          onChange={(e) => update("patientId", e.target.value)}
                          className={inputCls}
                          placeholder="e.g. PT-1042"
                        />
                      </Field>
                    )}
                  </div>

                  {/* Enquiry */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Enquiry type *">
                      <select
                        value={form.category}
                        onChange={(e) => update("category", e.target.value as InquiryCategory)}
                        className={inputCls}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Preferred reply channel">
                      <select
                        value={form.preferredContact}
                        onChange={(e) => update("preferredContact", e.target.value as any)}
                        className={inputCls}
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone call</option>
                        <option value="email">Email</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Subject *">
                    <input
                      type="text" required value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      className={inputCls}
                      placeholder="Short summary of what you need"
                    />
                  </Field>

                  <Field label="Your message *">
                    <textarea
                      required value={form.message} rows={6}
                      onChange={(e) => update("message", e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder="Please share as much detail as you can — medication name, order number, dates, symptoms, etc. Do not send card or password details."
                    />
                  </Field>

                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox" checked={form.consent}
                      onChange={(e) => update("consent", e.target.checked)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      I consent to Shaniid&nbsp;RX storing the details above so a pharmacist or care representative can reply to me. I’ve read the{" "}
                      <Link href="/policies/privacy" className="underline underline-offset-4">privacy policy</Link>.
                    </span>
                  </label>

                  {error && (
                    <p className="text-sm text-red-700 border border-red-200 bg-red-50 rounded-md px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 rounded-full text-white text-sm font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: TEAL }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = TEAL_DARK)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = TEAL)}
                  >
                    {submitting ? "Sending…" : "Submit enquiry"}
                  </button>

                  <p className="text-xs text-neutral-500">
                    Need to send a prescription image instead?{" "}
                    <Link href="/upload-prescription" className="underline underline-offset-4">Upload prescription</Link>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

const inputCls =
  "w-full px-4 py-3 border border-neutral-300 bg-white rounded text-sm focus:outline-none focus:border-[#16a3a3]"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}

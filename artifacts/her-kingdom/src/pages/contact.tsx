import { useState } from "react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Phone, MessageCircle, Mail, MapPin, Clock, Send, Check } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BORDER = "#F2DCC8"

export default function ContactPage() {
  const { phoneHref, phoneDisplay, waHref } = useStoreContact()
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } catch {}
    setSending(false)
    setSent(true)
  }

  const contactCards = [
    {
      icon: MessageCircle,
      bg: "#25D366",
      label: "WhatsApp",
      value: "Chat with a Pharmacist",
      href: waHref,
      external: true,
    },
    {
      icon: Phone,
      bg: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
      label: "Phone",
      value: phoneDisplay,
      href: phoneHref,
      external: false,
    },
    {
      icon: Mail,
      bg: WINE,
      label: "Email",
      value: "support@shaniid.co.ke",
      href: "mailto:support@shaniid.co.ke",
      external: false,
    },
    {
      icon: MapPin,
      bg: "#0A66C2",
      label: "Location",
      value: "Nairobi, Kenya",
      href: "https://maps.google.com/?q=Nairobi,Kenya",
      external: true,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <div
          style={{ background: "linear-gradient(115deg, #FCE3CB 0%, #F8CDB1 50%, #F1B59A 100%)" }}
        >
          <div className="mx-auto max-w-4xl px-4 py-12 lg:py-16 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT_RED }}>
              Get In Touch
            </p>
            <h1 className="text-4xl lg:text-5xl font-black" style={{ color: WINE }}>
              Contact &amp; Support
            </h1>
            <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: WINE_SOFT }}>
              Our pharmacy team is ready to help — 8 AM to 10 PM, seven days a week.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
          {/* Contact cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {contactCards.map((card) => {
              const Icon = card.icon
              const Wrapper = card.external ? "a" : "a"
              return (
                <a
                  key={card.label}
                  href={card.href}
                  target={card.external ? "_blank" : undefined}
                  rel={card.external ? "noopener noreferrer" : undefined}
                  className="rounded-2xl p-5 flex flex-col items-center text-center gap-3 transition-transform hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}` }}
                >
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: card.bg }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: WINE_SOFT }}>{card.label}</p>
                    <p className="text-sm font-semibold" style={{ color: WINE }}>{card.value}</p>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Two-col: form + info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Contact form */}
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: WINE }}>Send us a message</h2>
              {sent ? (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC" }}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#15803D" }}>
                    <Check className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-lg" style={{ color: "#15803D" }}>Message sent!</h3>
                  <p className="text-sm mt-2 text-gray-600">We'll get back to you within 2–4 hours during business hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: "name", label: "Full Name", type: "text", required: true },
                      { name: "email", label: "Email Address", type: "email", required: true },
                    ].map((f) => (
                      <div key={f.name}>
                        <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                          {f.label}
                        </label>
                        <input
                          type={f.type}
                          required={f.required}
                          value={form[f.name as keyof typeof form]}
                          onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-shadow focus:shadow-md"
                          style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}`, color: WINE }}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+254 7XX XXX XXX"
                      className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-shadow focus:shadow-md"
                      style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}`, color: WINE }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                      Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl text-sm outline-none"
                      style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}`, color: WINE }}
                    >
                      <option value="">Select a topic…</option>
                      <option>Order Issue</option>
                      <option>Prescription Upload</option>
                      <option>Delivery Question</option>
                      <option>Refund / Return</option>
                      <option>Medicine Enquiry</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: WINE_SOFT }}>
                      Message
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="How can we help you today?"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-shadow focus:shadow-md"
                      style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}`, color: WINE }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full h-12 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] disabled:opacity-70"
                    style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "Sending…" : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {/* Info sidebar */}
            <div className="space-y-6">
              <div
                className="rounded-2xl p-6"
                style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}` }}
              >
                <h3 className="font-bold text-lg mb-4" style={{ color: WINE }}>Business Hours</h3>
                <div className="space-y-3">
                  {[
                    { day: "Monday – Friday", hours: "8:00 AM – 10:00 PM" },
                    { day: "Saturday", hours: "8:00 AM – 10:00 PM" },
                    { day: "Sunday & Public Holidays", hours: "9:00 AM – 8:00 PM" },
                  ].map((row) => (
                    <div key={row.day} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: WINE_SOFT }}>{row.day}</span>
                      <span className="text-sm font-semibold" style={{ color: WINE }}>{row.hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl p-6"
                style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" style={{ color: ACCENT_RED }} />
                  <h3 className="font-bold" style={{ color: WINE }}>Response Times</h3>
                </div>
                <ul className="space-y-2 text-sm" style={{ color: WINE_SOFT }}>
                  <li>• WhatsApp: usually within 15 minutes</li>
                  <li>• Phone: immediate during business hours</li>
                  <li>• Email / form: 2–4 hours on business days</li>
                </ul>
              </div>

              <div
                className="rounded-2xl p-6"
                style={{ background: "linear-gradient(135deg, #FEF0E4 0%, #FAE2CC 100%)", border: `1px solid ${PEACH_BORDER}` }}
              >
                <h3 className="font-bold mb-2" style={{ color: WINE }}>Emergency?</h3>
                <p className="text-sm mb-4" style={{ color: WINE_SOFT }}>
                  For urgent medication needs or medical emergencies, call us directly or WhatsApp for fastest response.
                </p>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 h-10 rounded-full font-semibold text-sm text-white"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

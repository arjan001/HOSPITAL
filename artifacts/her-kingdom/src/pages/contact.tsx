import { useState } from "react"
import { Link } from "wouter"
import { Phone, Mail, MapPin, Clock, Search, ShoppingCart, Heart, User } from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useStoreContact } from "@/hooks/use-store-contact"

const TEAL = "#16a3a3"
const TEAL_DARK = "#0e7e7e"

const HERO_BG = "https://images.pexels.com/photos/3825572/pexels-photo-3825572.jpeg?auto=compress&cs=tinysrgb&w=1600"
const DOCTOR_GET_IN_TOUCH = "https://images.pexels.com/photos/33055501/pexels-photo-33055501/free-photo-of-confident-female-doctor-with-stethoscope-close-up.jpeg?auto=compress&cs=tinysrgb&w=700"

export default function ContactPage() {
  const { phoneHref, phoneDisplay, whatsappHref } = useStoreContact()
  void whatsappHref // reserved for footer note
  void Search; void ShoppingCart; void Heart; void User // imported for parity, used in nav

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
    setForm({ name: "", email: "", subject: "", message: "" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* Hero banner */}
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

            {/* Left: Contact list */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-neutral-900 mb-2">
                Contact Us
              </h2>
              <p className="text-sm text-neutral-600 leading-relaxed mb-8">
                Pharmacists, prescription queries, deliveries — pick the channel that suits you best and we’ll get back to you fast.
              </p>

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full"
                    style={{ background: "#e6f6f6", color: TEAL }}
                  >
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
                  <span
                    className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full"
                    style={{ background: "#e6f6f6", color: TEAL }}
                  >
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1">Phone Number</p>
                    <a href={phoneHref} className="block text-sm text-neutral-700 hover:text-neutral-900">
                      {phoneDisplay}
                    </a>
                    <a href={phoneHref} className="block text-sm text-neutral-700 hover:text-neutral-900">
                      +254 (0) 700 000 000
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full"
                    style={{ background: "#e6f6f6", color: TEAL }}
                  >
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-1">Email</p>
                    <a href="mailto:support@shaniidrx.co.ke" className="block text-sm text-neutral-700 hover:text-neutral-900">
                      support@shaniidrx.co.ke
                    </a>
                    <a href="mailto:rx@shaniidrx.co.ke" className="block text-sm text-neutral-700 hover:text-neutral-900">
                      rx@shaniidrx.co.ke
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 grid place-items-center w-11 h-11 rounded-full"
                    style={{ background: "#e6f6f6", color: TEAL }}
                  >
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

            {/* Right: Map */}
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
        <section className="py-14 lg:py-20 border-t border-neutral-200">
          <div className="mx-auto max-w-6xl px-4 lg:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Doctor image */}
            <div className="relative h-[420px] lg:h-[520px]">
              <img
                src={DOCTOR_GET_IN_TOUCH}
                alt="Pharmacist ready to help"
                className="w-full h-full object-cover object-top rounded-md"
              />
            </div>

            {/* Form */}
            <div>
              <h2 className="font-serif text-3xl lg:text-4xl font-semibold text-neutral-900">
                Get in touch
              </h2>
              <p className="mt-3 text-[15px] text-neutral-600 leading-relaxed max-w-md">
                Fill in the form and one of our pharmacists or care representatives will reach out within working hours.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4 max-w-lg">
                <input
                  type="text"
                  required
                  placeholder="Your Name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:border-[color:var(--teal)]"
                  style={{ ["--teal" as any]: TEAL }}
                />
                <input
                  type="email"
                  required
                  placeholder="Your Email *"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:border-[color:var(--teal)]"
                  style={{ ["--teal" as any]: TEAL }}
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:border-[color:var(--teal)]"
                  style={{ ["--teal" as any]: TEAL }}
                />
                <textarea
                  placeholder="Your Message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 rounded text-sm focus:outline-none focus:border-[color:var(--teal)] resize-none"
                  style={{ ["--teal" as any]: TEAL }}
                />

                <button
                  type="submit"
                  className="px-8 py-3 rounded-full text-white text-sm font-semibold uppercase tracking-wider transition-colors"
                  style={{ background: TEAL }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = TEAL_DARK)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = TEAL)}
                >
                  Submit
                </button>

                {submitted && (
                  <p className="text-sm text-green-700">
                    Thanks! We’ve received your message and will be in touch shortly.
                  </p>
                )}
              </form>

              <p className="mt-8 text-sm text-neutral-600">
                Looking for an answer first?{" "}
                <Link href="/faq" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                  Browse the Help Centre
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

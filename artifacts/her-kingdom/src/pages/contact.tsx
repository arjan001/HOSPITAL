import { Link } from "wouter"
import { Phone, Mail, MapPin, ChevronRight, MessageCircle, Clock } from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useStoreContact } from "@/hooks/use-store-contact"

const BRAND = "#3D0814"

export default function ContactPage() {
  const { phoneHref, phoneDisplay, whatsappHref } = useStoreContact()

  const channels = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: phoneDisplay,
      desc: "Fastest response — usually under 15 minutes during working hours.",
      cta: "Open WhatsApp",
      href: whatsappHref,
      external: true,
    },
    {
      icon: Phone,
      label: "Phone",
      value: phoneDisplay,
      desc: "Speak directly to a pharmacist or care representative.",
      cta: "Call now",
      href: phoneHref,
      external: false,
    },
    {
      icon: Mail,
      label: "Email",
      value: "support@shaniidrx.co.ke",
      desc: "Replies within 2–4 hours on business days.",
      cta: "Send email",
      href: "mailto:support@shaniidrx.co.ke",
      external: false,
    },
    {
      icon: MapPin,
      label: "Walk-in",
      value: "Philadelphia House, 3rd Floor, Wing B, Room 9 — Nairobi",
      desc: "Open Monday to Saturday, 9:00 AM – 6:00 PM.",
      cta: "Get directions",
      href: "https://maps.google.com/?q=Philadelphia+House+Nairobi",
      external: true,
    },
  ]

  const hours = [
    { day: "Monday – Friday",          hours: "8:00 AM – 10:00 PM" },
    { day: "Saturday",                 hours: "8:00 AM – 10:00 PM" },
    { day: "Sunday & public holidays", hours: "9:00 AM – 8:00 PM" },
  ]

  const departments = [
    { name: "Customer support",         email: "support@shaniidrx.co.ke",       note: "Orders, deliveries, returns and account help." },
    { name: "Clinical pharmacy",        email: "rx@shaniidrx.co.ke",            note: "Prescription queries and medication advice." },
    { name: "Pharmacovigilance",        email: "pv@shaniidrx.co.ke",            note: "Reporting side effects or adverse events." },
    { name: "Data Protection Officer",  email: "dpo@shaniidrx.co.ke",           note: "Privacy questions and data requests." },
    { name: "Partnerships & wholesale", email: "partners@shaniidrx.co.ke",      note: "B2B, corporate accounts and bulk supply." },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <TopBar />
      <Navbar />

      <main className="flex-1 bg-white">
        {/* Header */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-10 pb-8">
            <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6">
              <Link href="/" className="hover:text-neutral-900">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-neutral-900 font-medium">Contact</span>
            </nav>

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Get in touch
            </p>
            <h1
              className="font-serif text-3xl lg:text-4xl font-semibold leading-tight"
              style={{ color: BRAND, letterSpacing: "-0.01em" }}
            >
              Contact our pharmacy team
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 max-w-2xl">
              Our licensed pharmacists and care representatives are available seven days a week.
              Choose the channel that suits you best — we typically respond in under fifteen minutes during working hours.
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto max-w-5xl px-4 lg:px-6 py-10 lg:py-14 space-y-12">
          {/* Channels */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">
              Channels
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {channels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="block rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-md border border-neutral-200 bg-neutral-50 grid place-items-center flex-shrink-0">
                      <c.icon className="h-4 w-4 text-neutral-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500 mb-1">
                        {c.label}
                      </p>
                      <p className="text-[15px] font-semibold text-neutral-900 break-words">{c.value}</p>
                      <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{c.desc}</p>
                      <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-neutral-900 underline underline-offset-4">
                        {c.cta}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Departments */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">
              Email by department
            </p>
            <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
              {departments.map((d) => (
                <li key={d.name} className="grid sm:grid-cols-[200px_1fr_auto] gap-2 sm:gap-6 py-4 items-start">
                  <p className="text-sm font-semibold text-neutral-900">{d.name}</p>
                  <p className="text-sm text-neutral-600 leading-relaxed">{d.note}</p>
                  <a
                    href={`mailto:${d.email}`}
                    className="text-sm text-neutral-900 underline underline-offset-4 hover:no-underline justify-self-start sm:justify-self-end"
                  >
                    {d.email}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Hours + Office */}
          <section className="grid lg:grid-cols-2 gap-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">
                Working hours
              </p>
              <div className="rounded-lg border border-neutral-200 bg-white">
                {hours.map((row, i) => (
                  <div
                    key={row.day}
                    className={`flex items-center justify-between gap-2 px-5 py-4 text-sm ${i > 0 ? "border-t border-neutral-200" : ""}`}
                  >
                    <span className="text-neutral-600 inline-flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-neutral-400" />
                      {row.day}
                    </span>
                    <span className="font-medium text-neutral-900">{row.hours}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-500 mt-3">
                For urgent medication needs outside working hours, please contact your nearest hospital pharmacy or emergency service.
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">
                Registered office
              </p>
              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-sm font-semibold text-neutral-900">Shaniid RX Pharmacy</p>
                <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
                  Philadelphia House, 3rd Floor, Wing B, Room 9<br />
                  Nairobi, Kenya
                </p>
                <div className="mt-4 space-y-1 text-sm text-neutral-700">
                  <p>
                    <span className="text-neutral-500">Phone</span>{" "}
                    <a href={phoneHref} className="text-neutral-900 underline underline-offset-4 hover:no-underline ml-2">
                      {phoneDisplay}
                    </a>
                  </p>
                  <p>
                    <span className="text-neutral-500">Email</span>{" "}
                    <a href="mailto:support@shaniidrx.co.ke" className="text-neutral-900 underline underline-offset-4 hover:no-underline ml-2">
                      support@shaniidrx.co.ke
                    </a>
                  </p>
                </div>
                <a
                  href="https://maps.google.com/?q=Philadelphia+House+Nairobi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-neutral-900 underline underline-offset-4"
                >
                  Get directions
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <section className="border-t border-neutral-200 pt-8">
            <p className="text-sm text-neutral-700">
              Looking for an answer first?{" "}
              <Link href="/faq" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                Browse the Help Centre
              </Link>{" "}
              for answers about delivery, prescriptions, payments and more.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

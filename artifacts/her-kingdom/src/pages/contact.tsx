import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Phone, MessageCircle, Mail, MapPin, Clock, ShieldCheck, Stethoscope } from "lucide-react"
import { useStoreContact } from "@/hooks/use-store-contact"

const WINE        = "#3D0814"
const WINE_SOFT   = "#6B0F1A"
const ACCENT_RED  = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const CREAM       = "#FFFBF5"
const PEACH_BORDER= "#F2DCC8"

export default function ContactPage() {
  const { phoneHref, phoneDisplay, waHref } = useStoreContact()

  const contactChannels = [
    {
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
        </svg>
      ),
      bg: "#25D366",
      label: "WhatsApp",
      headline: "Chat with a Pharmacist",
      desc: "Fastest response — usually under 15 min",
      cta: "Open WhatsApp",
      href: waHref,
      external: true,
    },
    {
      icon: <Phone className="h-6 w-6" />,
      bg: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
      label: "Phone",
      headline: phoneDisplay,
      desc: "Available 8 AM – 10 PM, 7 days a week",
      cta: "Call Now",
      href: phoneHref,
      external: false,
    },
    {
      icon: <Mail className="h-6 w-6" />,
      bg: WINE,
      label: "Email",
      headline: "support@shaniid.co.ke",
      desc: "We reply within 2–4 hours on business days",
      cta: "Send Email",
      href: "mailto:support@shaniid.co.ke",
      external: false,
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      bg: "#0A66C2",
      label: "Visit Us",
      headline: "Philadelphia House",
      desc: "3rd Floor, Wing B, Room 9 — Nairobi",
      cta: "Get Directions",
      href: "https://maps.google.com/?q=Philadelphia+House+Nairobi",
      external: true,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">

        {/* ── Hero ── */}
        <div
          className="border-b"
          style={{
            background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0E0 100%)",
            borderColor: PEACH_BORDER,
          }}
        >
          <div className="mx-auto max-w-4xl px-4 py-14 lg:py-18 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT_RED }}>
              Get In Touch
            </p>
            <h1
              className="text-4xl lg:text-5xl font-black"
              style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
            >
              Contact &amp; Support
            </h1>
            <p className="mt-3 text-sm lg:text-base max-w-md mx-auto leading-relaxed" style={{ color: WINE_SOFT }}>
              Our pharmacy team is here for you — 8 AM to 10 PM, seven days a week.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-12 lg:py-16 space-y-10">

          {/* ── 4 contact channel cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactChannels.map((ch) => (
              <a
                key={ch.label}
                href={ch.href}
                target={ch.external ? "_blank" : undefined}
                rel={ch.external ? "noopener noreferrer" : undefined}
                className="group rounded-2xl p-5 flex flex-col gap-4 transition-all hover:-translate-y-1.5 hover:shadow-xl"
                style={{
                  background: "white",
                  border: `1px solid ${PEACH_BORDER}`,
                  boxShadow: "0 4px 18px -8px rgba(61,8,20,0.1)",
                }}
              >
                <span
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ background: ch.bg }}
                >
                  {ch.icon}
                </span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: WINE_SOFT }}>{ch.label}</p>
                  <p className="text-sm font-extrabold leading-snug mb-1" style={{ color: WINE }}>{ch.headline}</p>
                  <p className="text-xs leading-relaxed" style={{ color: WINE_SOFT }}>{ch.desc}</p>
                </div>
                <span
                  className="text-xs font-bold inline-flex items-center gap-1 transition-colors"
                  style={{ color: ACCENT_RED }}
                >
                  {ch.cta} →
                </span>
              </a>
            ))}
          </div>

          {/* ── Info grid: hours + response + emergency ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Business Hours */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "white", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 4px 18px -8px rgba(61,8,20,0.1)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF1E2" }}>
                  <Clock className="h-4.5 w-4.5" style={{ color: WINE }} />
                </div>
                <h3 className="font-extrabold" style={{ color: WINE }}>Business Hours</h3>
              </div>
              <div className="space-y-3">
                {[
                  { day: "Monday – Friday",           hours: "8:00 AM – 10:00 PM" },
                  { day: "Saturday",                  hours: "8:00 AM – 10:00 PM" },
                  { day: "Sunday & Public Holidays",  hours: "9:00 AM – 8:00 PM" },
                ].map((row) => (
                  <div key={row.day} className="flex items-center justify-between gap-2 text-sm">
                    <span style={{ color: WINE_SOFT }}>{row.day}</span>
                    <span className="font-bold" style={{ color: WINE }}>{row.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Times */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "white", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 4px 18px -8px rgba(61,8,20,0.1)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFF1E2" }}>
                  <ShieldCheck className="h-4.5 w-4.5" style={{ color: WINE }} />
                </div>
                <h3 className="font-extrabold" style={{ color: WINE }}>Response Times</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { channel: "WhatsApp",    time: "Under 15 minutes",      dot: "#25D366" },
                  { channel: "Phone",       time: "Immediate",              dot: ACCENT_ORANGE },
                  { channel: "Email",       time: "2–4 hours (business)",   dot: WINE },
                ].map((r) => (
                  <li key={r.channel} className="flex items-center gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.dot }} />
                    <span style={{ color: WINE_SOFT }}>{r.channel}</span>
                    <span className="ml-auto font-semibold" style={{ color: WINE }}>{r.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Emergency */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, #FEF0E4 0%, #FAE2CC 100%)",
                border: `1px solid ${PEACH_BORDER}`,
                boxShadow: "0 4px 18px -8px rgba(61,8,20,0.1)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(61,8,20,0.08)" }}>
                  <Stethoscope className="h-4.5 w-4.5" style={{ color: WINE }} />
                </div>
                <h3 className="font-extrabold" style={{ color: WINE }}>Urgent Medication?</h3>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: WINE_SOFT }}>
                For urgent needs or medical emergencies, WhatsApp or call us directly for the fastest response.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-full font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                  style={{ background: "#25D366" }}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                  </svg>
                  WhatsApp Now
                </a>
                <a
                  href={phoneHref}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-full font-semibold text-sm text-white transition-transform hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                >
                  <Phone className="h-4 w-4" />
                  Call Pharmacy
                </a>
              </div>
            </div>
          </div>

          {/* ── Physical shop banner ── */}
          <div
            className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{
              background: "white",
              border: `1px solid ${PEACH_BORDER}`,
              boxShadow: "0 4px 18px -8px rgba(61,8,20,0.1)",
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FFF1E2" }}>
              <MapPin className="h-6 w-6" style={{ color: WINE }} />
            </div>
            <div>
              <p className="font-extrabold" style={{ color: WINE }}>Walk-in Pharmacy</p>
              <p className="text-sm leading-relaxed" style={{ color: WINE_SOFT }}>
                Philadelphia House, 3rd Floor, Wing B, Room 9 · Open <strong>Mon–Sat, 9 AM – 6 PM</strong>
              </p>
            </div>
            <a
              href="https://maps.google.com/?q=Philadelphia+House+Nairobi"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:ml-auto flex-shrink-0 px-5 h-10 rounded-full text-sm font-bold inline-flex items-center gap-2 text-white transition-transform hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)` }}
            >
              <MapPin className="h-4 w-4" />
              Get Directions
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}

import { Link } from "wouter"
import { Seo, organizationJsonLd, breadcrumbJsonLd } from "@/components/seo"
import {
  ChevronRight, Briefcase, HeartPulse, ShieldCheck, Users, Sparkles, MapPin, Mail,
} from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"

const BRAND = "#3D0814"
const BRAND_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Trust before scale",
    body: "We hold ourselves to a higher standard because lives depend on the medicine we move.",
  },
  {
    icon: HeartPulse,
    title: "Technology with conscience",
    body: "We design for the underserved first. If it does not serve them, it does not ship.",
  },
  {
    icon: Users,
    title: "Kaizen + Ubuntu",
    body: "Continuous improvement, humanity first. We work as a team, we credit the team, we lift the team.",
  },
  {
    icon: Sparkles,
    title: "Calm, competent craft",
    body: "Quiet excellence over loud noise. We sweat the details so our patients never have to.",
  },
]

const TEAMS = [
  "Pharmacy & Clinical Operations",
  "Supply Chain & Verified Sourcing",
  "Last-Mile Logistics & Riders",
  "Engineering & Product",
  "Design & Brand",
  "Customer Care",
  "Compliance & Regulatory Affairs",
  "Finance & People Ops",
]

export default function CareersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Seo
        title="Careers — Shaniid RX"
        description="Build the trust layer for medicine in Africa. Join Shaniid RX — a Shaniid Group company building safe, fair, dignified healthcare access."
        keywords={["Shaniid RX careers","pharmacy jobs Kenya","health tech jobs Nairobi","Shaniid Group careers"]}
        canonicalPath="/careers"
        jsonLd={[organizationJsonLd, breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }])]}
      />
      <TopBar />
      <Navbar />

      <main className="flex-1 bg-white">
        {/* Header */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-10 pb-10">
            <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6">
              <Link href="/" className="hover:text-neutral-900">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-neutral-900 font-medium">Careers</span>
            </nav>

            <div className="flex items-start gap-5">
              <div className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center border border-neutral-200 bg-neutral-50 flex-shrink-0">
                <Briefcase className="h-5 w-5 text-neutral-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2">
                  Build with us
                </p>
                <h1
                  className="font-serif text-3xl lg:text-4xl font-semibold leading-tight"
                  style={{ color: BRAND, letterSpacing: "-0.01em" }}
                >
                  Careers at Shaniid RX
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 max-w-3xl">
                  We are building the trust layer for medicine in Africa — a community-driven, globally credible
                  infrastructure that connects verified suppliers, community pharmacies and patients. If you want
                  your work to matter, this is the room.
                </p>

                {/* Coming-soon pill */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 border bg-white"
                  style={{ borderColor: "#F2DCC8", color: BRAND_SOFT }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: ACCENT_ORANGE }}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Open roles — Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto max-w-5xl px-4 lg:px-6 py-12 lg:py-16">

          {/* Why Shaniid RX */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-3">
              Why Shaniid RX
            </p>
            <h2 className="font-serif text-2xl lg:text-3xl font-semibold text-neutral-900 mb-4" style={{ letterSpacing: "-0.01em" }}>
              Bigger than a pharmacy app.
            </h2>
            <p className="text-[15px] leading-relaxed text-neutral-700 max-w-3xl">
              Counterfeit medicines are rising. Informal supply chains still dominate. Pricing is unpredictable
              and trust in the ecosystem is fragile. Shaniid RX exists to change that — to make safe, affordable
              and reliable medicine accessible to every household, and to bring transparency, traceability and
              dignity back to the supply chain.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 max-w-3xl">
              We are a Shaniid Group company. We hire calm, competent people who care about the work and care
              about the people the work serves.
            </p>
          </section>

          {/* Pillars */}
          <section className="mt-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">
              How we work
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl border border-neutral-200 p-5 hover:border-neutral-300 transition-colors bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(61,8,20,0.06)", color: BRAND }}
                    >
                      <p.icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-neutral-900 text-[15px] leading-snug">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">
                        {p.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Teams */}
          <section className="mt-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">
              Where you might work
            </p>
            <div className="rounded-xl border border-neutral-200 overflow-hidden">
              <ul className="divide-y divide-neutral-200">
                {TEAMS.map((team) => (
                  <li
                    key={team}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
                  >
                    <span className="text-neutral-800">{team}</span>
                    <span
                      className="text-[10.5px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{
                        background: "#F7F4EE",
                        color: BRAND_SOFT,
                      }}
                    >
                      Hiring soon
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Express interest */}
          <section className="mt-14">
            <div
              className="rounded-2xl p-6 sm:p-8 lg:p-10 bg-white"
              style={{ border: "1px solid #F2DCC8" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="hidden sm:flex w-11 h-11 rounded-xl items-center justify-center flex-shrink-0"
                  style={{ background: BRAND, color: "#fff" }}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    className="font-serif text-xl lg:text-2xl font-semibold"
                    style={{ color: BRAND, letterSpacing: "-0.01em" }}
                  >
                    Be first in line when roles open.
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-neutral-700 max-w-2xl">
                    We aren't actively hiring through a public portal yet. If you believe you are the right
                    fit for the mission, send us a short note and a CV — we keep every introduction on file
                    and reach out as soon as a matching role opens.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <a
                      href="mailto:careers@shaniidrx.co.ke?subject=Expression%20of%20interest%20%E2%80%94%20Shaniid%20RX"
                      className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90"
                      style={{
                        background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                        boxShadow: "0 8px 20px -8px rgba(185,28,28,0.45)",
                      }}
                    >
                      <Mail className="h-4 w-4" />
                      careers@shaniidrx.co.ke
                    </a>
                    <span className="inline-flex items-center gap-2 text-xs text-neutral-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Eastleigh, Nairobi — Kenya
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <p className="mt-10 text-xs text-neutral-500 text-center">
            Shaniid RX is an equal-opportunity employer. We hire on merit, character and alignment with the mission —
            never on background, gender, faith or origin.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}

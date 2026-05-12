"use client"

import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { Link } from "wouter"
import {
  Video,
  Pill,
  Truck,
  ClipboardCheck,
  Upload,
  Clock,
  MessageCircle,
  Camera,
  FolderOpen,
  ListChecks,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
} from "lucide-react"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const CREAM = "#FFFBF5"
const PEACH = "#F2DCC8"
const ACCENT = "#F59E0B"

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>

type Service = {
  icon: IconComponent
  title: string
  desc: string
  href?: string
  iconBg?: string
  iconColor?: string
}

const PRIMARY_SERVICES: Service[] = [
  {
    icon: Video,
    title: "Virtual Consultation",
    desc: "Speak with a licensed pharmacist online for safe advice, prescriptions, and medicine guidance anytime, anywhere.",
    href: "/talk-to-doctor",
  },
  {
    icon: Pill,
    title: "Prescription Refill",
    desc: "Refill your medications easily online with quick approval and processing.",
    href: "/prescription",
  },
  {
    icon: Truck,
    title: "Emergency Delivery",
    desc: "Fast and reliable medicine delivery when you need it most.",
    href: "/delivery",
  },
]

const SECONDARY_SERVICES: Service[] = [
  {
    icon: ClipboardCheck,
    title: "Medication Review",
    desc: "Our pharmacists review your medicines to ensure safety and proper usage.",
  },
  {
    icon: Upload,
    title: "Prescription Upload",
    desc: "Upload your prescription securely and let us handle the rest.",
    href: "/prescription",
  },
  {
    icon: Clock,
    title: "Scheduled Refills",
    desc: "Set up automatic refills so you never miss a dose.",
  },
  {
    icon: MessageCircle,
    title: "Pharmacist Support",
    desc: "Get professional pharmacy support via chat or call whenever you need help.",
    href: "/talk-to-doctor",
  },
]

const STEPS = [
  { icon: Camera, label: "Upload Your Prescription" },
  { icon: FolderOpen, label: "Get Expert Review" },
  { icon: ListChecks, label: "Place Your Order" },
  { icon: Truck, label: "Fast Delivery" },
]

const TRUST = [
  { icon: MapPin, label: "Government\nLicensed" },
  { icon: BadgeCheck, label: "Verified\nDoctors" },
  { icon: ClipboardCheck, label: "Quality\nAssured" },
  { icon: ShieldCheck, label: "Secure\nPayments" },
  { icon: Lock, label: "Data\nProtected" },
]

function ServiceCard({ service }: { service: Service }) {
  const Icon = service.icon
  const card = (
    <div
      className="group relative h-full rounded-3xl p-7 lg:p-8 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "linear-gradient(155deg, #FFF1E2 0%, #FFE3CC 100%)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(61,8,20,0.25), 0 4px 12px -6px rgba(61,8,20,0.10)",
      }}
    >
      <div
        className="grid place-items-center h-16 w-16 lg:h-[72px] lg:w-[72px] rounded-2xl mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(160deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
          boxShadow: "0 10px 24px -10px rgba(61,8,20,0.55), 0 2px 0 rgba(255,255,255,0.25) inset",
        }}
      >
        <Icon className="h-8 w-8 lg:h-9 lg:w-9" style={{ color: ACCENT }} strokeWidth={2.4} />
      </div>
      <h3 className="font-bold text-lg lg:text-[19px] mb-3 tracking-tight" style={{ color: "#1a1a1a" }}>
        {service.title}
      </h3>
      <p className="text-sm leading-relaxed text-neutral-600 max-w-[260px]">{service.desc}</p>
    </div>
  )
  return service.href ? (
    <Link href={service.href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  )
}

function ServicesHero() {
  return (
    <section className="px-4 pt-8 lg:pt-12">
      <div className="mx-auto max-w-[1280px]">
        <div
          className="relative overflow-hidden rounded-[28px] lg:rounded-[36px]"
          style={{
            background:
              "linear-gradient(110deg, #FFD9A8 0%, #FFC9B2 35%, #F7B3B0 70%, #E89BA0 100%)",
            minHeight: 360,
            boxShadow: "0 30px 60px -30px rgba(61,8,20,0.25)",
          }}
        >
          {/* soft decorative blobs */}
          <div
            className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full opacity-50"
            style={{ background: "radial-gradient(circle, #FFE7D1 0%, transparent 70%)" }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, #FFB596 0%, transparent 70%)" }}
            aria-hidden
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-6 px-6 sm:px-10 lg:px-16 py-12 lg:py-16">
            <div className="lg:col-span-7 z-10">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  color: WINE,
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.6)",
                }}
              >
                Our Services
              </span>
              <h1
                className="mt-5 font-extrabold leading-[1.05] tracking-tight text-[40px] sm:text-5xl lg:text-[64px]"
                style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
              >
                Your Online Trusted
                <br />
                Pharmacy
              </h1>
              <p
                className="mt-5 max-w-xl text-[15px] sm:text-base leading-relaxed"
                style={{ color: "#5a1622" }}
              >
                Licensed pharmacists, verified medication and emergency delivery — care that meets you
                where you are, every day of the week.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/talk-to-doctor"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
                    boxShadow: "0 12px 28px -10px rgba(61,8,20,0.45)",
                  }}
                >
                  Talk to a doctor <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/prescription"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    color: WINE,
                    border: "1px solid rgba(61,8,20,0.18)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  Upload prescription
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-[280px] sm:h-[340px] lg:h-[420px]">
              <img
                src="/doctor-banner.png"
                alt="Friendly licensed doctor with stethoscope"
                className="absolute inset-0 m-auto h-full w-auto object-contain object-bottom drop-shadow-[0_30px_30px_rgba(61,8,20,0.18)]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-extrabold tracking-tight text-3xl lg:text-4xl mb-10"
      style={{ color: "#0f0f10", fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
    >
      {children}
    </h2>
  )
}

function ServicesGrid() {
  return (
    <section className="px-4 py-16 lg:py-24">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle>Our Services</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {PRIMARY_SERVICES.map((s) => (
            <ServiceCard key={s.title} service={s} />
          ))}
        </div>
        <div className="mt-6 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {SECONDARY_SERVICES.slice(0, 3).map((s) => (
            <ServiceCard key={s.title} service={s} />
          ))}
        </div>
        <div className="mt-6 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <ServiceCard service={SECONDARY_SERVICES[3]} />
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="px-4 py-16 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle>How It Works</SectionTitle>
        <div className="relative">
          {/* connecting line */}
          <div
            className="hidden md:block absolute left-0 right-0 top-[44px] h-[2px]"
            style={{ background: WINE, opacity: 0.85 }}
            aria-hidden
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6 relative">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="flex flex-col items-center text-center">
                  <div
                    className="relative grid place-items-center h-[88px] w-[88px] rounded-full"
                    style={{
                      background: "white",
                      boxShadow:
                        "0 14px 28px -16px rgba(61,8,20,0.35), 0 0 0 6px white, 0 0 0 7px rgba(61,8,20,0.08)",
                    }}
                  >
                    <div
                      className="grid place-items-center h-[68px] w-[68px] rounded-full"
                      style={{
                        background: `linear-gradient(160deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
                      }}
                    >
                      <Icon className="h-7 w-7" style={{ color: ACCENT }} strokeWidth={2.4} />
                    </div>
                  </div>
                  <p
                    className="mt-5 text-sm lg:text-[15px] font-semibold"
                    style={{ color: "#1a1a1a" }}
                  >
                    {i + 1}. {s.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustSafety() {
  return (
    <section className="px-4 pb-20 lg:pb-28">
      <div className="mx-auto max-w-[1280px]">
        <SectionTitle>Trust &amp; Safety</SectionTitle>
        <div
          className="rounded-[28px] lg:rounded-[36px] px-6 sm:px-10 py-10 lg:py-14"
          style={{
            background:
              "linear-gradient(110deg, #FFD9A8 0%, #FFC4B0 50%, #F0A4A8 100%)",
            boxShadow: "0 24px 48px -28px rgba(61,8,20,0.22)",
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-8 gap-x-6">
            {TRUST.map((t) => {
              const Icon = t.icon
              return (
                <div key={t.label} className="flex flex-col items-center text-center">
                  <div
                    className="grid place-items-center h-14 w-14 lg:h-16 lg:w-16 rounded-full"
                    style={{
                      background: `linear-gradient(160deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
                      boxShadow: "0 10px 22px -12px rgba(61,8,20,0.55)",
                    }}
                  >
                    <Icon className="h-7 w-7 lg:h-8 lg:w-8" style={{ color: ACCENT }} strokeWidth={2.4} />
                  </div>
                  <p
                    className="mt-4 text-sm lg:text-[15px] font-semibold whitespace-pre-line leading-snug"
                    style={{ color: "#1a1a1a" }}
                  >
                    {t.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ServicesPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <ServicesHero />
        <ServicesGrid />
        <div
          className="mx-4 lg:mx-auto lg:max-w-[1280px] h-px"
          style={{ background: PEACH }}
          aria-hidden
        />
        <HowItWorks />
        <TrustSafety />
      </main>
      <Footer />
    </div>
  )
}

export default ServicesPage

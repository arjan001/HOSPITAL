import { Link } from "wouter"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import {
  ChevronRight, Building2, HeartPulse, ShieldCheck, Truck, Stethoscope,
  Phone, MessageCircle, Mail, Facebook, Instagram, Twitter, Linkedin, Youtube,
  CreditCard, Smartphone, Wallet,
} from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useStoreContact } from "@/hooks/use-store-contact"

const BRAND = "#3D0814"

type Section = { id: string; heading: string; body?: string; list?: string[] }

const SECTIONS: Section[] = [
  {
    id: "what-we-do",
    heading: "1. What we do",
    body:
      "With your Shaniid RX account, you have access to thousands of original-quality medications, health, wellness and personal-care products. Browse our website or app from your phone, laptop or any internet-enabled device. Search for the products you need or upload a valid prescription from your doctor. Pay with a convenient method, drop your delivery pin, and sit back while we bring everything to your door so you can get on with living well.",
  },
  {
    id: "our-team",
    heading: "2. Our team",
    body:
      "We have a qualified team of pharmacists, pharmaceutical technologists and customer-care professionals ready to serve you. Enjoy convenience and peace of mind like never before — every order is screened by a licensed pharmacist, dispensed under tamper-evident seal and delivered on time and in mint condition. If you have a question about your order, our dedicated customer-care representatives are always happy to help.",
  },
  {
    id: "how-it-works",
    heading: "3. How Shaniid RX works",
    list: [
      "Browse the catalogue or upload a prescription — anytime, day or night.",
      "A registered pharmacist clinically screens every prescription before dispensing.",
      "Pay securely with M-PESA, Visa, Mastercard or your insurance cover.",
      "Track your order in real time and receive it from a vetted Shaniid RX rider.",
      "Need a refill? We will remind you five days before you run out.",
    ],
  },
  {
    id: "quality",
    heading: "4. Quality you can trust",
    list: [
      "Sourced only from manufacturers and distributors registered with the Pharmacy and Poisons Board (PPB).",
      "Every batch arrives with a Certificate of Analysis and is scanned into our system on intake.",
      "Cold-chain medication kept at 2–8 °C in calibrated medical-grade fridges with backup power.",
      "Two-pharmacist verification on every prescription before it leaves our pharmacy.",
    ],
  },
  {
    id: "delivery",
    heading: "5. Fast, careful delivery across Kenya",
    body:
      "We deliver same-day across Nairobi and within 24–48 hours upcountry. Cold-chain orders travel in insulated pouches with validated gel packs, and our riders are trained on chain-of-custody and patient confidentiality. Free delivery on orders above KSh 5,000.",
  },
  {
    id: "contact",
    heading: "6. Talk to us",
    body:
      "Give us a call or WhatsApp us between 8 AM and 10 PM, every day. Our pharmacists are on duty for clinical questions, medication advice and refills.",
  },
  {
    id: "social",
    heading: "7. Reach us on social media",
    list: [
      "Facebook: @ShaniidRX",
      "Twitter / X: @ShaniidRX",
      "Instagram: @ShaniidRX",
      "LinkedIn: Shaniid RX Pharmacy",
      "YouTube: Shaniid RX",
    ],
  },
  {
    id: "payments",
    heading: "8. Easy, secure payments",
    body:
      "Pay using M-PESA, Airtel Money, Visa, Mastercard or your health-insurance cover for medications and other covered items. Save even more — we never charge payment or transfer fees, and our delivery rates across Kenya are among the most affordable in the market.",
  },
]

const QUICK_LINKS = [
  { label: "Quality & Safety Standards", href: "/policies/quality", icon: ShieldCheck },
  { label: "License & Compliance",        href: "/policies/license", icon: Building2 },
  { label: "Delivery Timing & Zones",     href: "/delivery",         icon: Truck },
  { label: "Speak to a Pharmacist",       href: "/speak-to-a-doctor", icon: Stethoscope },
  { label: "Privacy Policy",              href: "/privacy-policy",   icon: ShieldCheck },
]

const SOCIALS = [
  { label: "Facebook",  icon: Facebook,  href: "#" },
  { label: "Twitter",   icon: Twitter,   href: "#" },
  { label: "Instagram", icon: Instagram, href: "#" },
  { label: "LinkedIn",  icon: Linkedin,  href: "#" },
  { label: "YouTube",   icon: Youtube,   href: "#" },
]

const PAY_METHODS = [
  { label: "M-PESA",     icon: Smartphone },
  { label: "Airtel Money", icon: Smartphone },
  { label: "Visa",       icon: CreditCard },
  { label: "Mastercard", icon: CreditCard },
  { label: "Insurance",  icon: Wallet },
]

export default function AboutPage() {
  const { phoneHref, phoneDisplay, whatsappHref } = useStoreContact()

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      <Seo
        title="About Shaniid RX — Trust Layer for Medicine"
        description="Shaniid RX is the trust layer for medicine distribution in Africa. Verified suppliers, fair pricing, dignity at every step. A Shaniid Group company."
        keywords={["about Shaniid RX","Shaniid Group","pharmacy infrastructure Africa","trusted medicine Kenya"]}
        canonicalPath="/about"
        jsonLd={[organizationJsonLd, breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])]}
      />
      <TopBar />
      <Navbar />

      <main className="flex-1 bg-white">
        {/* Page header */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 lg:px-6 pt-10 pb-8">
            <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6">
              <Link href="/" className="hover:text-neutral-900">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-neutral-500">About</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-neutral-900 font-medium">Who We Are</span>
            </nav>

            <div className="flex items-start gap-5">
              <div className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center border border-neutral-200 bg-neutral-50 flex-shrink-0">
                <HeartPulse className="h-5 w-5 text-neutral-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-2">
                  About Shaniid RX
                </p>
                <h1
                  className="font-serif text-3xl lg:text-4xl font-semibold leading-tight"
                  style={{ color: BRAND, letterSpacing: "-0.01em" }}
                >
                  Who We Are
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 max-w-3xl">
                  Shaniid RX is a community pharmacy that brings verified medication, expert pharmacist care and fast delivery to every doorstep in Kenya — without the markup, the queues or the guesswork.
                </p>
                <p className="mt-4 text-xs text-neutral-500">
                  Licensed by the <span className="text-neutral-700 font-medium">Pharmacy and Poisons Board of Kenya</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto max-w-5xl px-4 lg:px-6 py-10 lg:py-14">
          <div className="grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-14">
            {/* Sticky on-this-page nav */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-3">
                  On this page
                </p>
                <ul className="space-y-2 border-l border-neutral-200">
                  {SECTIONS.map(s => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="block text-xs text-neutral-600 hover:text-neutral-900 pl-3 -ml-px border-l border-transparent hover:border-neutral-900 leading-snug py-0.5"
                      >
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <article className="min-w-0">
              {SECTIONS.map((s, idx) => (
                <section
                  key={s.id}
                  id={s.id}
                  className={idx === 0 ? "" : "mt-10 pt-10 border-t border-neutral-200"}
                >
                  <h2 className="font-serif text-xl lg:text-2xl font-semibold mb-3 scroll-mt-24 text-neutral-900">
                    {s.heading}
                  </h2>
                  {s.body && (
                    <p className="text-[15px] leading-relaxed text-neutral-700 mb-3">
                      {s.body}
                    </p>
                  )}
                  {s.list && s.list.length > 0 && (
                    <ul className="space-y-2 mt-3 list-disc pl-5 marker:text-neutral-400">
                      {s.list.map((item, i) => (
                        <li key={i} className="text-[15px] leading-relaxed text-neutral-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Inline contact strip under section 6 */}
                  {s.id === "contact" && (
                    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-neutral-700">
                      <a href={phoneHref} className="inline-flex items-center gap-2 hover:text-neutral-900">
                        <Phone className="h-4 w-4 text-neutral-400" />
                        <span className="underline underline-offset-4 hover:no-underline">{phoneDisplay}</span>
                      </a>
                      <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-neutral-900">
                        <MessageCircle className="h-4 w-4 text-neutral-400" />
                        <span className="underline underline-offset-4 hover:no-underline">WhatsApp us</span>
                      </a>
                      <a href="mailto:support@shaniidrx.co.ke" className="inline-flex items-center gap-2 hover:text-neutral-900">
                        <Mail className="h-4 w-4 text-neutral-400" />
                        <span className="underline underline-offset-4 hover:no-underline">support@shaniidrx.co.ke</span>
                      </a>
                    </div>
                  )}

                  {/* Inline social icons under section 7 */}
                  {s.id === "social" && (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {SOCIALS.map(({ label, icon: Icon, href }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={label}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 transition-colors"
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Inline payment chips under section 8 */}
                  {s.id === "payments" && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {PAY_METHODS.map(({ label, icon: Icon }) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700"
                        >
                          <Icon className="h-3.5 w-3.5 text-neutral-500" />
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {/* Closing CTA */}
              <div className="mt-12 pt-8 border-t border-neutral-200">
                <p className="text-sm text-neutral-700">
                  Ready to order?{" "}
                  <Link href="/shop" className="text-neutral-900 underline underline-offset-4 hover:no-underline font-semibold">
                    Browse the shop
                  </Link>{" "}
                  or{" "}
                  <Link href="/upload-prescription" className="text-neutral-900 underline underline-offset-4 hover:no-underline font-semibold">
                    upload your prescription
                  </Link>{" "}
                  — a pharmacist will take it from there.
                </p>
              </div>

              {/* Quick links */}
              <div className="mt-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-3">
                  Learn more
                </p>
                <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
                  {QUICK_LINKS.map(r => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className="flex items-center justify-between gap-4 py-3 text-sm text-neutral-700 hover:text-neutral-900 group"
                      >
                        <span className="flex items-center gap-3">
                          <r.icon className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700" />
                          {r.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-700" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

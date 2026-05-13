"use client"

import { Link } from "wouter"
import useSWR from "swr"
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, ArrowUp } from "lucide-react"
import { SeoLinkCloud } from "./seo-link-cloud"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/* ── Theme tokens ── */
const BG_CREAM       = "#FFFBF5"
const BG_WHITE       = "#FFFFFF"
const BG_BAR         = "#F7F4EE"
const TEXT_WINE      = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const TEXT_MUTED     = "#6B7280"
const BORDER_PEACH   = "#F2DCC8"
const BORDER_LIGHT   = "#EFEBE3"
const ACCENT_RED     = "#B91C1C"
const ACCENT_ORG     = "#F97316"

type FooterSettings = {
  store_email?: string
  store_phone?: string
  whatsapp_number?: string
  footer_instagram?: string
  footer_tiktok?: string
  footer_twitter?: string
  footer_facebook?: string
  footer_linkedin?: string
  footer_youtube?: string
  copyright_text?: string
}

const DEFAULTS = {
  store_email: "support@rxpharmacy.co.ke",
  store_phone: "+254 780 406 059",
  whatsapp_number: "254780406059",
  footer_instagram: "https://www.instagram.com/herkingdom_pharmacy/",
  footer_tiktok: "https://www.tiktok.com/@herkingdom_pharmacy",
  footer_twitter: "#",
  footer_facebook: "#",
  footer_linkedin: "#",
  footer_youtube: "#",
  copyright_text:
    "©2026 Shaneed RX. A subsidiary of Shaniid Group of Technologies Limited. All rights reserved.",
}

const ABOUT_LINKS = [
  { label: "Who We Are", href: "/who-we-are" },
  { label: "How Shaneed RX Works", href: "/who-we-are#how-it-works" },
  { label: "Quality Assurance & Safety", href: "/who-we-are#quality" },
  { label: "Our Clinical Team", href: "/who-we-are#our-team" },
  { label: "Careers", href: "/careers" },
  { label: "Press & Media", href: "/press" },
]

const CARE_LINKS = [
  { label: "Chronic Care Packs", href: "/shop?category=chronic-care" },
  { label: "Family & Care Giver", href: "/shop?category=family-care" },
  { label: "Preventive & Wellness", href: "/shop?category=wellness" },
  { label: "Devices & Monitoring", href: "/shop?category=devices" },
  { label: "First-Aid Pack", href: "/shop?category=first-aid" },
  { label: "OTC Products", href: "/shop?category=otc" },
]

const SUPPORT_LINKS = [
  { label: "Prescription Upload Guide", href: "/policies/prescription-upload-guide" },
  { label: "Returns & Refund Policy", href: "/refund-policy" },
  { label: "Order Tracking", href: "/track-order" },
  { label: "FAQs", href: "/faq" },
  { label: "Delivery Timing & Zones", href: "/delivery" },
  { label: "Contact Us", href: "/contact" },
]

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-of-service" },
  { label: "Prescription Policy", href: "/policies/prescription" },
  { label: "License", href: "/policies/license" },
  { label: "Regulatory Compliance", href: "/policies/regulatory" },
  { label: "Pharmacovigilance", href: "/policies/pharmacovigilance" },
]

const BOTTOM_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Our Stores", href: "/contact" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]

export function Footer() {
  const { data } = useSWR<{ settings?: FooterSettings }>("/api/site-data", fetcher)
  const s = data?.settings || {}
  const copyright = s.copyright_text || DEFAULTS.copyright_text

  const socials: { href: string; icon: React.ReactNode; label: string; bg: string }[] = [
    { href: s.footer_facebook  || DEFAULTS.footer_facebook,  icon: <Facebook  className="h-3.5 w-3.5" fill="currentColor" />, label: "Facebook",  bg: "#1877F2" },
    { href: s.footer_twitter   || DEFAULTS.footer_twitter,   icon: <Twitter   className="h-3.5 w-3.5" fill="currentColor" />, label: "Twitter",   bg: "#1DA1F2" },
    { href: s.footer_linkedin  || DEFAULTS.footer_linkedin,  icon: <Linkedin  className="h-3.5 w-3.5" fill="currentColor" />, label: "LinkedIn",  bg: "#0A66C2" },
    { href: s.footer_instagram || DEFAULTS.footer_instagram, icon: <Instagram className="h-3.5 w-3.5" />,                    label: "Instagram", bg: "#E1306C" },
    { href: s.footer_youtube   || DEFAULTS.footer_youtube,   icon: <Youtube   className="h-3.5 w-3.5" fill="currentColor" />, label: "YouTube",   bg: "#FF0000" },
    { href: `mailto:${s.store_email || DEFAULTS.store_email}`, icon: <Mail    className="h-3.5 w-3.5" />,                    label: "Email",     bg: ACCENT_RED },
  ]

  const handleScrollTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <footer style={{ background: BG_WHITE, color: TEXT_WINE }}>
      {/* ─── Main columns ────────────────────────────────────── */}
      <div
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8 sm:pb-10"
        style={{ borderTop: `1px solid ${BORDER_LIGHT}` }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-3 lg:pr-6 text-center sm:text-left">
            <Link href="/" className="inline-flex items-center">
              <img
                src="/logo-rx.png"
                alt="Shaniid RX"
                width={220}
                height={88}
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed max-w-sm mx-auto sm:mx-0" style={{ color: TEXT_MUTED }}>
              Shaniid RX is Kenya's trusted online pharmacy delivering quality medicines, supplements
              and healthcare essentials right to your door — fast, safe, and discreetly.
            </p>
          </div>

          {/* Information */}
          <FooterColumn title="Information" links={ABOUT_LINKS} className="lg:border-l lg:pl-8" />

          {/* Categories */}
          <FooterColumn title="Categories" links={CARE_LINKS} />

          {/* Services */}
          <FooterColumn title="Our Services" links={SUPPORT_LINKS} />

          {/* Socials */}
          <div className="sm:col-span-2 lg:col-span-3">
            <h3 className="text-base font-bold mb-4" style={{ color: TEXT_WINE }}>
              Socials
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
              {socials.map((soc) => (
                <li key={soc.label}>
                  <a
                    href={soc.href}
                    target={soc.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm transition-colors hover:text-[#3D0814]"
                    style={{ color: TEXT_MUTED }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: soc.bg }}
                    >
                      {soc.icon}
                    </span>
                    {soc.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal links — kept as a slim row beneath the main grid */}
        {LEGAL_LINKS.length > 0 && (
          <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 sm:gap-x-5 gap-y-2"
            style={{ borderTop: `1px dashed ${BORDER_LIGHT}` }}>
            <span className="text-xs font-semibold uppercase tracking-wider w-full sm:w-auto text-center sm:text-left" style={{ color: TEXT_WINE_SOFT }}>
              Legal & Compliance
            </span>
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-xs transition-colors hover:underline underline-offset-2"
                style={{ color: TEXT_MUTED }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ─── Payment partners ────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER_LIGHT}`, background: BG_WHITE }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <span className="text-sm font-semibold text-center" style={{ color: TEXT_WINE_SOFT }}>
            Our Payment Partners
          </span>
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
            <PaymentLogo src="/payments/paystack.png" alt="Paystack" />
            <PaymentLogo src="/payments/mpesa-mc-visa.png" alt="M-PESA, Mastercard, Visa" wide />
            <PaymentLogo src="/payments/equity.png" alt="Equity" />
            <PaymentLogo src="/payments/jcb.png" alt="JCB" />
            <PaymentLogo src="/payments/amex.png" alt="American Express" />
          </div>
        </div>
      </div>

      {/* ─── Bottom bar ──────────────────────────────────────── */}
      <div style={{ background: BG_BAR, borderTop: `1px solid ${BORDER_LIGHT}` }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-5 pb-4 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3 relative">
          {/* Back-to-top — floats top-right on desktop, inline above content on mobile */}
          <button
            type="button"
            onClick={handleScrollTop}
            aria-label="Back to top"
            className="md:absolute md:-top-7 md:right-4 lg:right-8 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:-translate-y-0.5 -mt-10 md:mt-0 self-end md:self-auto mr-1 md:mr-0"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_ORG} 0%, ${ACCENT_RED} 100%)`,
              boxShadow: "0 8px 20px -6px rgba(185,28,28,0.45)",
            }}
          >
            <ArrowUp className="h-5 w-5" />
          </button>

          <p className="text-[11px] sm:text-xs leading-relaxed text-center md:text-left order-2 md:order-1" style={{ color: TEXT_MUTED }}>
            {copyright}
          </p>

          <nav className="flex items-center gap-x-4 sm:gap-x-5 gap-y-2 flex-wrap justify-center order-1 md:order-2">
            {BOTTOM_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[#B91C1C]"
                style={{ color: TEXT_WINE }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Compliance disclaimer — slim, last */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4">
          <p className="text-[10.5px] sm:text-[11px] leading-relaxed text-center" style={{ color: TEXT_MUTED }}>
            Shaniid RX is a licensed pharmacy regulated by the Pharmacy and Poisons Board of Kenya.
            Prescription medicines are dispensed only upon valid prescription. Information on this site
            does not replace professional medical advice.
          </p>
        </div>
      </div>

      <SeoLinkCloud />
    </footer>
  )
}

function FooterColumn({
  title,
  links,
  className = "",
}: {
  title: string
  links: { label: string; href: string }[]
  className?: string
}) {
  return (
    <div className={`lg:col-span-2 ${className}`} style={className.includes("border") ? { borderColor: "#EFEBE3" } : undefined}>
      <h3 className="text-base font-bold mb-4" style={{ color: TEXT_WINE }}>
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm transition-colors hover:text-[#B91C1C]"
              style={{ color: TEXT_MUTED }}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PaymentLogo({ src, alt, wide = false }: { src: string; alt: string; wide?: boolean }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-7 w-auto object-contain"
      style={{ maxWidth: wide ? 130 : 56 }}
    />
  )
}

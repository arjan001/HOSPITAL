"use client"

import { Link } from "wouter"
import useSWR from "swr"
import { Facebook, Instagram, Linkedin, Twitter, Youtube, MessageCircle } from "lucide-react"
import { FloatingWhatsApp } from "./floating-whatsapp"
import { SeoLinkCloud } from "./seo-link-cloud"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// RX warm theme tokens
const BG_CREAM = "#FFFBF5"
const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"

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
  { label: "Our Mission & Values", href: "/about" },
  { label: "How Shaneed RX Works", href: "/about#how-it-works" },
  { label: "Quality Assurance & Safety", href: "/about#quality" },
  { label: "Our clinical stuff", href: "/about#team" },
  { label: "Careers", href: "/careers" },
  { label: "Press & Media", href: "/press" },
  { label: "Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
]

const CARE_LINKS = [
  { label: "Chronic Care Packs", href: "/shop?category=chronic-care" },
  { label: "Acute & Short Term", href: "/shop?category=acute-care" },
  { label: "Family & Care Giver", href: "/shop?category=family-care" },
  { label: "Preventive & Wellness Pack", href: "/shop?category=wellness" },
  { label: "Devices & Monitoring", href: "/shop?category=devices" },
  { label: "First-Aid Pack", href: "/shop?category=first-aid" },
  { label: "Prescription Medicine", href: "/shop?category=prescription" },
  { label: "Refill & Subscriptions", href: "/shop?filter=subscriptions" },
  { label: "OTC Products", href: "/shop?category=otc" },
]

const SUPPORT_LINKS = [
  { label: "Prescription Upload Guide", href: "/contact" },
  { label: "Returns & Refund Policy", href: "/refund-policy" },
  { label: "Order Tracking", href: "/track-order" },
  { label: "FAQs", href: "/faq" },
  { label: "Support", href: "/contact" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms and conditions", href: "/terms-of-service" },
  { label: "Prescription policy", href: "/policies/prescription" },
  { label: "Delivery Timing & Zones", href: "/delivery" },
]

const LEGAL_LINKS = [
  { label: "License", href: "/policies/license" },
  { label: "Regulatory Compliance", href: "/policies/regulatory" },
  { label: "Quality & Safety Standards", href: "/policies/quality" },
  { label: "Terms & Conditions", href: "/terms-of-service" },
  { label: "Pharmacovigilance & Adverse Events", href: "/policies/pharmacovigilance" },
  { label: "Recall & Safety Notices", href: "/policies/recalls" },
]

function whatsappHref(number: string): string {
  const digits = (number || "").replace(/[^\d]/g, "")
  return digits ? `https://wa.me/${digits}` : "#"
}

export function Footer() {
  const { data } = useSWR<{ settings?: FooterSettings }>("/api/site-data", fetcher)
  const s = data?.settings || {}

  const facebook = s.footer_facebook || DEFAULTS.footer_facebook
  const instagram = s.footer_instagram || DEFAULTS.footer_instagram
  const linkedin = s.footer_linkedin || DEFAULTS.footer_linkedin
  const twitter = s.footer_twitter || DEFAULTS.footer_twitter
  const youtube = s.footer_youtube || DEFAULTS.footer_youtube
  const tiktok = s.footer_tiktok || DEFAULTS.footer_tiktok
  const whatsappNumber = s.whatsapp_number || DEFAULTS.whatsapp_number
  const waHref = whatsappHref(whatsappNumber)
  const copyright = s.copyright_text || DEFAULTS.copyright_text

  return (
    <footer style={{ background: BG_CREAM, color: TEXT_WINE }}>
      {/* Main columns */}
      <div className="mx-auto max-w-7xl px-4 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column — logo stays in current top-left position */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <img
                src="/logo-rx.png"
                alt="Shaniid RX"
                width={64}
                height={64}
                className="h-14 w-14 object-contain"
              />
              <span className="text-lg font-bold tracking-wide" style={{ color: TEXT_WINE }}>
                Shaniid RX
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
              Kenya's trusted online pharmacy delivering quality medications, supplements and healthcare
              essentials right to your door.
            </p>
          </div>

          {/* About RX */}
          <FooterColumn title="About RX" links={ABOUT_LINKS} />

          {/* Our Care */}
          <FooterColumn title="Our Care" links={CARE_LINKS} />

          {/* Support */}
          <FooterColumn title="Support" links={SUPPORT_LINKS} />

          {/* Legal & Compliance */}
          <FooterColumn title="Legal & Compliance" links={LEGAL_LINKS} />
        </div>
      </div>

      {/* Payment partners */}
      <div style={{ borderTop: `1px solid ${BORDER_PEACH}` }}>
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_WINE_SOFT }}>
              We accept
            </span>
            <PaymentLogo src="/payments/paystack.png" alt="Paystack" />
            <PaymentLogo src="/payments/mpesa-mc-visa.png" alt="M-PESA, Mastercard, Visa" wide />
            <PaymentLogo src="/payments/equity.png" alt="Equity" />
            <PaymentLogo src="/payments/jcb.png" alt="JCB" />
            <PaymentLogo src="/payments/amex.png" alt="American Express" />
          </div>

          <div className="flex items-center gap-3">
            <SocialIcon href={facebook} label="Facebook" bg="#1877F2"><Facebook className="h-3.5 w-3.5" fill="currentColor" /></SocialIcon>
            <SocialIcon href={instagram} label="Instagram" bg="linear-gradient(45deg,#F58529,#DD2A7B,#8134AF)"><Instagram className="h-3.5 w-3.5" /></SocialIcon>
            <SocialIcon href={linkedin} label="LinkedIn" bg="#0A66C2"><Linkedin className="h-3.5 w-3.5" fill="currentColor" /></SocialIcon>
            <SocialIcon href={twitter} label="X" bg="#000"><Twitter className="h-3.5 w-3.5" fill="currentColor" /></SocialIcon>
            <SocialIcon href={waHref} label="WhatsApp" bg="#25D366"><MessageCircle className="h-3.5 w-3.5" fill="currentColor" /></SocialIcon>
            <SocialIcon href={youtube} label="YouTube" bg="#FF0000"><Youtube className="h-3.5 w-3.5" fill="currentColor" /></SocialIcon>
            <SocialIcon href={tiktok} label="TikTok" bg="#000">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z"/></svg>
            </SocialIcon>
          </div>
        </div>
      </div>

      {/* Bottom legal strip */}
      <div style={{ borderTop: `1px solid ${BORDER_PEACH}`, background: "#FFF6EC" }}>
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <p className="text-xs leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
            Shaniid RX is a licensed pharmacy regulated by the Pharmacy and Poisons Board of Kenya.
            Prescription medicines are dispensed only upon valid prescription. Information on this site does
            not replace professional medical advice.
          </p>
          <p className="text-xs leading-relaxed md:text-right" style={{ color: TEXT_WINE_SOFT }}>
            {copyright}
          </p>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER_PEACH}` }}>
          <p className="text-center text-[11px] py-2.5" style={{ color: TEXT_WINE_SOFT }}>
            Made with <span aria-label="love" style={{ color: ACCENT_RED }}>♥</span> by{" "}
            <a
              href="https://oneplusafrica.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline underline-offset-2"
              style={{ color: TEXT_WINE }}
            >
              OnePlus Africa
            </a>
          </p>
        </div>
      </div>

      <SeoLinkCloud />
      <FloatingWhatsApp />
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-4 uppercase tracking-wider" style={{ color: TEXT_WINE }}>
        {title}
      </h3>
      <ul className="flex flex-col gap-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              href={l.href}
              className="text-sm transition-colors hover:underline underline-offset-2"
              style={{ color: TEXT_WINE_SOFT }}
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
      className={`h-7 ${wide ? "w-auto" : "w-auto"} object-contain rounded-md`}
      style={{ maxWidth: wide ? 130 : 56 }}
    />
  )
}

function SocialIcon({
  href,
  label,
  bg,
  children,
}: {
  href: string
  label: string
  bg: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-transform hover:scale-110"
      style={{ background: bg }}
    >
      {children}
    </a>
  )
}

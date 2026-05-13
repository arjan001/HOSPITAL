"use client"

import { Link } from "wouter"
import useSWR from "swr"
import { SeoLinkCloud } from "./seo-link-cloud"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// RX warm theme tokens
const BG_CREAM = "#FFFBF5"
const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
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
  { label: "Prescription Upload Guide", href: "/policies/prescription-upload-guide" },
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


export function Footer() {
  const { data } = useSWR<{ settings?: FooterSettings }>("/api/site-data", fetcher)
  const s = data?.settings || {}

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
      </div>

      <SeoLinkCloud />
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


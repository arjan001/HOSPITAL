"use client"

import { Link } from "wouter"
import useSWR from "swr"
import { MapPin, Phone, Facebook, Twitter, Linkedin, Mail } from "lucide-react"
import { FloatingWhatsApp } from "./floating-whatsapp"
import { SeoLinkCloud } from "./seo-link-cloud"
import appStoreBadge from "@assets/app-store_1778589089523.png"
import googlePlayBadge from "@assets/image_1778589100949.png"
import paymentMethods from "@assets/payment_1778589089523.png"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TEAL = "#1BBFB8"

type FooterSettings = {
  store_email?: string
  store_phone?: string
  store_address?: string
  whatsapp_number?: string
  footer_description?: string
  footer_instagram?: string
  footer_tiktok?: string
  footer_twitter?: string
  footer_facebook?: string
  footer_linkedin?: string
  footer_pinterest?: string
  footer_phone?: string
  footer_email?: string
  footer_whatsapp?: string
  copyright_text?: string
}

const DEFAULTS: Required<FooterSettings> = {
  store_email: "herkingdomlive@gmail.com",
  store_phone: "+254 780 406 059",
  store_address: "Kenyatta Avenue, Nairobi CBD, Kenya",
  whatsapp_number: "254780406059",
  footer_description:
    "RX Pharmacy is proud to be one of Kenya's most trusted online pharmacies, delivering quality medications, supplements and healthcare essentials right to your door.",
  footer_instagram: "https://www.instagram.com/herkingdom_pharmacy/",
  footer_tiktok: "https://www.tiktok.com/@herkingdom_pharmacy",
  footer_twitter: "#",
  footer_facebook: "#",
  footer_linkedin: "#",
  footer_pinterest: "#",
  footer_phone: "+254 780 406 059",
  footer_email: "herkingdomlive@gmail.com",
  footer_whatsapp: "254780406059",
  copyright_text: "Copyright © 2026 RX Pharmacy. All Rights Reserved.",
}

function whatsappHref(number: string): string {
  const digits = (number || "").replace(/[^\d]/g, "")
  return digits ? `https://wa.me/${digits}` : "#"
}

const INFORMATION = [
  { label: "Newsroom", href: "/blogs" },
  { label: "Affiliate Program", href: "/affiliate" },
  { label: "Careers", href: "/careers" },
  { label: "Sell on RX Pharmacy", href: "/sell" },
  { label: "Investor Relations", href: "/investors" },
]

const CATEGORIES = [
  { label: "Medications", href: "/shop?category=medications" },
  { label: "Vitamins & Supplements", href: "/shop?category=supplements" },
  { label: "Health Devices", href: "/shop?category=devices" },
  { label: "Baby & Mother Care", href: "/shop?category=baby-care" },
  { label: "First Aid", href: "/shop?category=first-aid" },
]

const SERVICES = [
  { label: "Shipping", href: "/delivery" },
  { label: "Returns", href: "/refund-policy" },
  { label: "Product Recalls", href: "/recalls" },
  { label: "Contact Us", href: "/contact" },
  { label: "Site Map", href: "/sitemap.xml" },
]

const BOTTOM_LINKS = [
  { label: "ABOUT US", href: "/about" },
  { label: "OUR STORES", href: "/delivery" },
  { label: "BLOG", href: "/blogs" },
  { label: "CONTACT", href: "/contact" },
  { label: "FAQ", href: "/faq" },
]

export function Footer() {
  const { data } = useSWR<{ settings?: FooterSettings }>("/api/site-data", fetcher)
  const s = data?.settings || {}

  const phone = s.store_phone || s.footer_phone || DEFAULTS.footer_phone
  const email = s.store_email || s.footer_email || DEFAULTS.footer_email
  const address = s.store_address || DEFAULTS.store_address
  const whatsappNumber = s.whatsapp_number || s.footer_whatsapp || DEFAULTS.footer_whatsapp
  const description = s.footer_description || DEFAULTS.footer_description
  const copyright = s.copyright_text || DEFAULTS.copyright_text
  const facebook = s.footer_facebook || DEFAULTS.footer_facebook
  const twitter = s.footer_twitter || DEFAULTS.footer_twitter
  const linkedin = s.footer_linkedin || DEFAULTS.footer_linkedin
  const pinterest = s.footer_pinterest || DEFAULTS.footer_pinterest
  const waHref = whatsappHref(whatsappNumber)
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`
  const emailHref = `mailto:${email}`

  return (
    <footer className="bg-white text-foreground border-t border-border">
      {/* Top contact strip */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Address */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2"
              style={{ borderColor: TEAL, color: TEAL }}
            >
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Address</p>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">{address}</p>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2"
              style={{ borderColor: TEAL, color: TEAL }}
            >
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">WhatsApp Us</p>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-base font-bold mt-1 block hover:opacity-80 transition-opacity" style={{ color: TEAL }}>
                {phone}
              </a>
              <a href={emailHref} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {email}
              </a>
            </div>
          </div>

          {/* App download */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">Download the app now!</p>
              <div className="flex items-center gap-2 mt-2">
                <a href="#" aria-label="Download on Google Play">
                  <img src={googlePlayBadge} alt="Get it on Google Play" className="h-10 w-auto" />
                </a>
                <a href="#" aria-label="Download on the App Store">
                  <img src={appStoreBadge} alt="Download on the App Store" className="h-10 w-auto" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main columns */}
      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/logo-herkingdom.png"
              alt="RX Pharmacy"
              width={200}
              height={80}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Information */}
        <div>
          <h3 className="text-base font-bold mb-5">Information</h3>
          <ul className="flex flex-col gap-3">
            {INFORMATION.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-base font-bold mb-5">Categories</h3>
          <ul className="flex flex-col gap-3">
            {CATEGORIES.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Our services */}
        <div>
          <h3 className="text-base font-bold mb-5">Our services</h3>
          <ul className="flex flex-col gap-3">
            {SERVICES.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Socials */}
        <div>
          <h3 className="text-base font-bold mb-5">Socials</h3>
          <ul className="flex flex-col gap-3">
            <li>
              <a href={facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#1877F2" }}>
                  <Facebook className="h-3.5 w-3.5" fill="currentColor" />
                </span>
                Facebook
              </a>
            </li>
            <li>
              <a href={twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#1DA1F2" }}>
                  <Twitter className="h-3.5 w-3.5" fill="currentColor" />
                </span>
                Twitter
              </a>
            </li>
            <li>
              <a href={linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#0A66C2" }}>
                  <Linkedin className="h-3.5 w-3.5" fill="currentColor" />
                </span>
                Linkedin
              </a>
            </li>
            <li>
              <a href={pinterest} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 text-[11px] font-bold" style={{ background: "#E60023" }}>
                  P
                </span>
                Pinterest
              </a>
            </li>
            <li>
              <a href={emailHref} className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "#EA4335" }}>
                  <Mail className="h-3.5 w-3.5" />
                </span>
                Email
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Payment partners */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-5 flex items-center justify-center gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">Our Payment Partners :</p>
          <img src={paymentMethods} alt="Payment partners: Klarna, PayPal, Visa, Mastercard, Diners Club, American Express" className="h-6 w-auto" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{copyright}</p>
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            {BOTTOM_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-border/60">
          <p className="text-center text-[11px] text-muted-foreground py-2.5">
            Made with <span aria-label="love" className="text-pink-500">♥</span> by{" "}
            <a href="https://oneplusafrica.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-foreground transition-colors underline underline-offset-2">
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

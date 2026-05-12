"use client"

import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { Phone, Mail, Clock, MapPin } from "lucide-react"
import { FloatingWhatsApp } from "./floating-whatsapp"
import { SeoLinkCloud } from "./seo-link-cloud"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type FooterSettings = {
  store_email?: string
  store_phone?: string
  whatsapp_number?: string
  footer_description?: string
  footer_instagram?: string
  footer_tiktok?: string
  footer_twitter?: string
  footer_phone?: string
  footer_email?: string
  footer_whatsapp?: string
  copyright_text?: string
  footer_dispatch_days?: string
}

const DEFAULTS: Required<FooterSettings> = {
  store_email: "herkingdomlive@gmail.com",
  store_phone: "+254780406059",
  whatsapp_number: "254780406059",
  footer_description:
    "Curated jewelry & accessories that complement your personal style and embody individuality. Hypoallergenic, long-lasting pieces delivered across Kenya.",
  footer_instagram: "https://www.instagram.com/herkingdom_jewelry/",
  footer_tiktok: "https://www.tiktok.com/@herkingdom_jewelry",
  footer_twitter: "",
  footer_phone: "0780 406 059",
  footer_email: "herkingdomlive@gmail.com",
  footer_whatsapp: "254780406059",
  copyright_text: "© 2026 Her Kingdom. All rights reserved.",
  footer_dispatch_days: "Tuesdays & Fridays",
}

function extractHandle(url: string, fallback = ""): string {
  if (!url) return fallback
  const match = url.match(/@([A-Za-z0-9._-]+)/) || url.match(/\/([A-Za-z0-9._-]+)\/?$/)
  return match ? `@${match[1]}` : fallback
}

function whatsappHref(number: string): string {
  const digits = (number || "").replace(/[^\d]/g, "")
  return digits ? `https://wa.me/${digits}` : "#"
}

export function Footer() {
  const { data } = useSWR<{ settings?: FooterSettings }>("/api/site-data", fetcher)
  const s = data?.settings || {}
  const instagram = s.footer_instagram || DEFAULTS.footer_instagram
  const tiktok = s.footer_tiktok || DEFAULTS.footer_tiktok
  const twitter = s.footer_twitter || DEFAULTS.footer_twitter
  const description = s.footer_description || DEFAULTS.footer_description
  // Admin general settings saves to `store_phone` and `whatsapp_number`. Prefer
  // those over the legacy `footer_phone` / `footer_whatsapp` columns that the
  // admin form does not currently edit.
  const phone = s.store_phone || s.footer_phone || DEFAULTS.footer_phone
  const email = s.store_email || s.footer_email || DEFAULTS.footer_email
  const whatsappNumber = s.whatsapp_number || s.store_phone || s.footer_whatsapp || DEFAULTS.footer_whatsapp
  const copyright = s.copyright_text || DEFAULTS.copyright_text
  const dispatchDays = s.footer_dispatch_days || DEFAULTS.footer_dispatch_days
  const waHref = whatsappHref(whatsappNumber)
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`
  const emailHref = `mailto:${email}`
  const instagramHandle = extractHandle(instagram, "@herkingdom_jewelry")
  const tiktokHandle = extractHandle(tiktok, "@herkingdom_jewelry")

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand + Social */}
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo-herkingdom.png"
                alt="Her Kingdom"
                width={240}
                height={96}
                className="h-16 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-background/60 text-sm mt-4 leading-relaxed max-w-xs">
              {description}
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-secondary rounded-lg transition-colors"
                aria-label="Follow us on Instagram"
              >
                <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href={tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-secondary rounded-lg transition-colors"
                aria-label="Follow us on TikTok"
              >
                <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z" />
                </svg>
              </a>
              {twitter && (
                <a
                  href={twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center bg-primary hover:bg-secondary rounded-lg transition-colors"
                  aria-label="Follow us on X"
                >
                  <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2H21.5l-7.51 8.583L22.5 22h-6.844l-5.36-6.72L4.1 22H.84l8.03-9.183L.5 2h6.97l4.846 6.142L18.244 2zm-1.2 18h1.82L7.04 4h-1.9l11.904 16z" />
                  </svg>
                </a>
              )}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center bg-[#25D366] rounded-lg hover:opacity-80 transition-opacity"
                aria-label="Chat with us on WhatsApp"
              >
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-5">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-3">
              <Link
                href="/payments-policy"
                className="payments-policy-glow relative inline-flex items-center gap-2 text-sm font-semibold w-fit"
              >
                <span
                  aria-hidden="true"
                  className="payments-sparkle payments-sparkle-1 absolute -left-3 -top-2 text-pink-200 text-[10px] leading-none"
                >
                  ★
                </span>
                <span
                  aria-hidden="true"
                  className="payments-sparkle payments-sparkle-2 absolute -right-3 -top-1 text-pink-300 text-[12px] leading-none"
                >
                  ✦
                </span>
                <span
                  aria-hidden="true"
                  className="payments-sparkle payments-sparkle-3 absolute -left-2 -bottom-2 text-pink-200 text-[9px] leading-none"
                >
                  ✧
                </span>
                <span
                  aria-hidden="true"
                  className="payments-sparkle payments-sparkle-4 absolute -right-4 -bottom-1 text-pink-300 text-[11px] leading-none"
                >
                  ★
                </span>
                Payments Policy
              </Link>
              <Link href="/shop" className="text-background/60 text-sm hover:text-background transition-colors">
                Shop All
              </Link>
              <Link href="/shop?filter=new" className="text-background/60 text-sm hover:text-background transition-colors">
                New Arrivals
              </Link>
              <Link href="/shop?filter=offers" className="text-background/60 text-sm hover:text-background transition-colors">
                On Offer
              </Link>
              <Link href="/blogs" className="text-background/60 text-sm hover:text-background transition-colors">
                Blog &amp; Articles
              </Link>
              <Link href="/track-order" className="text-background/60 text-sm hover:text-background transition-colors">
                Track My Order
              </Link>
              <Link href="/delivery" className="text-background/60 text-sm hover:text-background transition-colors">
                Delivery Locations
              </Link>
              <Link href="/shop?category=necklaces" className="text-background/60 text-sm hover:text-background transition-colors">
                Necklaces
              </Link>
              <Link href="/shop?category=bracelets" className="text-background/60 text-sm hover:text-background transition-colors">
                Bracelets
              </Link>
              <Link href="/shop?category=earrings" className="text-background/60 text-sm hover:text-background transition-colors">
                Earrings
              </Link>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-5">
              Get In Touch
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-background/40 flex-shrink-0" />
                <a href={phoneHref} className="text-background/60 text-sm hover:text-background transition-colors">
                  {phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-background/40 flex-shrink-0" />
                <a href={emailHref} className="text-background/60 text-sm hover:text-background transition-colors">
                  {email}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-background/40 flex-shrink-0" />
                <p className="text-background/60 text-sm leading-relaxed">
                  Available for orders online
                  <br />
                  Dispatch: {dispatchDays}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-background/40 flex-shrink-0" />
                <p className="text-background/60 text-sm leading-relaxed">
                  Pick-up location:
                  <br />
                  <span className="text-background font-medium">Pickup Mtaani</span>
                </p>
              </div>
            </div>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-5">
              Follow Us
            </h3>
            <div className="flex flex-col gap-3">
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-background/60 text-sm hover:text-background transition-colors group"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-background/10 rounded-md group-hover:bg-background/20 transition-colors flex-shrink-0">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </span>
                {instagramHandle}
              </a>
              <a
                href={tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-background/60 text-sm hover:text-background transition-colors group"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-background/10 rounded-md group-hover:bg-background/20 transition-colors flex-shrink-0">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z" /></svg>
                </span>
                {tiktokHandle}
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-background/60 text-sm hover:text-background transition-colors group"
              >
                <span className="w-8 h-8 flex items-center justify-center bg-background/10 rounded-md group-hover:bg-background/20 transition-colors flex-shrink-0">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </span>
                WhatsApp Order
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-background/40 text-xs">
              {copyright}
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy-policy" className="text-background/40 text-xs hover:text-background transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="text-background/40 text-xs hover:text-background transition-colors">
                Terms of Service
              </Link>
              <Link href="/refund-policy" className="text-background/40 text-xs hover:text-background transition-colors">
                Refund Policy
              </Link>
              <Link href="/payments-policy" className="text-background/40 text-xs hover:text-background transition-colors">
                Payments Policy
              </Link>
              <a
                href="/sitemap.xml"
                className="text-background/40 text-xs hover:text-background transition-colors"
                target="_blank"
                rel="noopener"
              >
                Sitemap
              </a>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-background/30 text-[11px]">
              Her Kingdom - Curated Jewelry &amp; Accessories | #HerkingdomBabe
            </p>
            <p className="text-background/40 text-[11px] mt-2">
              Made with <span aria-label="love" className="text-pink-400">♥</span> by{" "}
              <a
                href="https://oneplusafrica.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-background/70 hover:text-background transition-colors underline underline-offset-2"
              >
                OnePlus Africa
              </a>
            </p>
          </div>
        </div>
      </div>
      <SeoLinkCloud />
      <FloatingWhatsApp />
    </footer>
  )
}

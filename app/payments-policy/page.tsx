import type { Metadata } from "next"
import Link from "next/link"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { SITE_SEO, PAGE_SEO, PAGE_KEYWORDS } from "@/lib/seo-data"
import { getSiteSettings } from "@/lib/supabase-data"
import {
  Clock,
  MapPin,
  Smartphone,
  Gift,
  Truck,
  MessageCircle,
  ShieldCheck,
  Mail,
  Receipt,
} from "lucide-react"

export const metadata: Metadata = {
  title: PAGE_SEO.paymentsPolicy.title,
  description: PAGE_SEO.paymentsPolicy.description,
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_SEO.siteUrl}/payments-policy` },
  keywords: PAGE_KEYWORDS.paymentsPolicy,
  authors: [{ name: SITE_SEO.siteName, url: SITE_SEO.siteUrl }],
  creator: SITE_SEO.siteName,
  openGraph: {
    title: PAGE_SEO.paymentsPolicy.title,
    description: PAGE_SEO.paymentsPolicy.description,
    url: `${SITE_SEO.siteUrl}/payments-policy`,
    siteName: SITE_SEO.siteName,
    type: "website",
    locale: "en_KE",
    images: [{ url: `${SITE_SEO.siteUrl}/logo.png`, width: 512, height: 512, alt: "Her Kingdom Payments Policy" }],
  },
  twitter: {
    card: "summary",
    site: "@herkingdom_jewelry",
    creator: "@herkingdom_jewelry",
    title: PAGE_SEO.paymentsPolicy.title,
    description: PAGE_SEO.paymentsPolicy.description,
    images: [{ url: `${SITE_SEO.siteUrl}/logo.png`, alt: "Her Kingdom Payments Policy" }],
  },
}

const FALLBACK_WHATSAPP_URL = "https://wa.me/254780406059"
const FALLBACK_EMAIL = "herkingdomlive@gmail.com"

const onlyDigits = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "")

export default async function PaymentsPolicyPage() {
  const settings = await getSiteSettings().catch(() => null)
  // Admin general settings saves to `whatsapp_number` / `store_phone` only.
  // Prefer those over the legacy `footer_whatsapp` column that the admin form
  // does not edit.
  const whatsappDigits =
    onlyDigits((settings as any)?.whatsapp_number) ||
    onlyDigits((settings as any)?.store_phone) ||
    onlyDigits((settings as any)?.footer_whatsapp)
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : FALLBACK_WHATSAPP_URL
  const supportEmail: string =
    (settings as any)?.store_email ||
    (settings as any)?.footer_email ||
    FALLBACK_EMAIL

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-secondary/60 to-background border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-14 lg:py-20 text-center">
            <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Transparent. Secure. Friendly.
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-balance leading-tight">
              Payments Policy
            </h1>
            <p className="text-muted-foreground mt-4 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Everything you need to know about paying for your Her Kingdom order — from
              M-PESA STK push via PayHero, to gift wrapping, to what happens if anything takes a little longer.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-12 lg:py-16 space-y-12">
          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border rounded-sm p-5 bg-card">
              <Smartphone className="h-5 w-5 text-[#00843D] mb-3" />
              <p className="text-sm font-semibold">M-PESA STK Push</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Secure automated M-PESA checkout powered by PayHero — pay, then carry on with your day.
              </p>
            </div>
            <div className="border border-border rounded-sm p-5 bg-card">
              <Truck className="h-5 w-5 text-foreground mb-3" />
              <p className="text-sm font-semibold">Free delivery above KSh 7,000</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Spend KSh 7,000 or more in one order and we will cover your delivery, countrywide.
              </p>
            </div>
            <div className="border border-border rounded-sm p-5 bg-card">
              <Clock className="h-5 w-5 text-foreground mb-3" />
              <p className="text-sm font-semibold">Processed within 2 hours</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Orders placed within our operating window are generally processed within 2 hours of payment.
              </p>
            </div>
          </div>

          {/* 1. Payment methods */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#00843D]/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-4 w-4 text-[#00843D]" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">1. How you can pay</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                We keep things simple with automated <strong>M-PESA STK push</strong> (powered by PayHero) as our primary payment method.
                After you enter your details on checkout and tap <em>Pay with M-PESA</em>, PayHero prompts your phone with
                an STK push — just enter your M-PESA PIN and you are done.
              </p>
              <ul>
                <li><strong>M-PESA STK push (automated via PayHero):</strong> recommended and fastest.</li>
                <li><strong>Pay with Card:</strong> for card holders; receipts arrive by email and WhatsApp.</li>
                <li><strong>Cash on pick-up:</strong> available at our pick-up location only.</li>
              </ul>
              <p>
                Every M-PESA transaction is matched to your order automatically by PayHero's webhook, so confirmations
                are near-instant and you do not need to forward us an SMS.
              </p>
            </div>
          </section>

          {/* 2. Processing times */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">2. Processing &amp; dispatch times</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                Orders are <strong>generally processed within 2 hours</strong> after payment is confirmed.
                From there, dispatch happens on our Tuesday and Friday outbound runs.
              </p>
              <p>
                If you place an order late in the day, it is first thing on our list the next morning.
                We will never leave you wondering — expect a quick WhatsApp note the moment your order is moving.
              </p>
            </div>
          </section>

          {/* 3. Delivery & pick-up */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-foreground" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">3. Delivery &amp; pick-up</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                Our pick-up location is <strong>Pickup Mtaani</strong>. When you choose pick-up at checkout,
                we will send the agent details by WhatsApp as soon as your parcel is ready.
              </p>
              <p>
                For doorstep delivery, we partner with trusted riders and courier services across Kenya.
                <strong> Orders above KSh 7,000 ship for free</strong> — our small thank-you for treating yourself.
              </p>
              <p>
                Delivery fees for orders below the free-shipping threshold depend on your location and are shown
                on the checkout page before you pay.
              </p>
            </div>
          </section>

          {/* 4. Gift orders */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Gift className="h-4 w-4 text-rose-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">4. Sending it as a gift?</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                If your order is a gift, please <strong>tick the gift option at checkout</strong> so we can package
                it in a Her Kingdom signature box with a decorative wrapper and, if you like, a short gift note.
              </p>
              <ul>
                <li>Gift packaging is an <strong>extra KSh 250</strong> per order, added automatically at checkout when you opt in.</li>
                <li>We never include price receipts inside gift parcels.</li>
                <li>You can add a personal message up to 200 characters in the gift notes field.</li>
              </ul>
            </div>
          </section>

          {/* 5. Receipts */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Receipt className="h-4 w-4 text-foreground" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">5. Payment receipts</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                Once a payment is confirmed, a receipt is sent to the <strong>email</strong> you provided at
                checkout <em>and</em> to your <strong>WhatsApp</strong> number. The receipt includes your order number,
                items, amounts paid, delivery details, and the M-PESA transaction code for your records.
              </p>
              <p>
                You can always view live status on the <Link href="/track-order" className="text-foreground underline underline-offset-2">Track My Order</Link> page.
              </p>
            </div>
          </section>

          {/* 6. Delays */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-amber-700" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">6. If your order is delayed</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                Occasionally things slow down — traffic, courier backlogs, restocks. If anything looks off,
                reach out to us on WhatsApp and we will have eyes on your order immediately.
              </p>
              <p>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#25D366] font-medium hover:underline">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat with us on WhatsApp
                </a>
              </p>
            </div>
          </section>

          {/* 7. Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-4 w-4 text-foreground" />
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-semibold">7. Security of your payment</h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground prose-strong:text-foreground">
              <p>
                We never store your M-PESA PIN, card CVV, or full card number. Payments run through
                PayHero's certified M-PESA gateway and our card processor on encrypted channels, and we only
                keep what we need to reconcile your order: the transaction code, the amount, and the phone number that paid.
              </p>
            </div>
          </section>

          {/* Contact footer CTA */}
          <section className="rounded-sm bg-secondary border border-border p-6 md:p-8 text-center">
            <h3 className="font-serif text-lg md:text-xl font-semibold">Still have questions?</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Our team is reachable on WhatsApp and email every day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb358] text-white text-sm font-semibold px-5 py-3 rounded-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp us
              </a>
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-2 bg-foreground text-background text-sm font-semibold px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
              >
                <Mail className="h-4 w-4" />
                Email us
              </a>
            </div>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  )
}

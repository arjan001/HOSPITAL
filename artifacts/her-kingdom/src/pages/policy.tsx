import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import {
  ShieldCheck, FileText, Truck, RotateCcw, ScrollText, BadgeCheck,
  Stethoscope, AlertTriangle, BellRing, FlaskConical, Sparkles,
  Phone, MessageCircle, ChevronRight, Clock,
} from "lucide-react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { sanitizeHtml } from "@/lib/sanitize-html"
import { useStoreContact } from "@/hooks/use-store-contact"

// ── Brand tokens ────────────────────────────────────────────────────────────
const WINE         = "#3D0814"
const WINE_SOFT    = "#6B0F1A"
const CREAM        = "#FFFBF5"
const PEACH_LIGHT  = "#FAE0BE"
const PEACH_MED    = "#F2DCC8"
const PEACH_BORDER = "#E8C9A8"
const ORANGE       = "#F97316"

// ── Content model ───────────────────────────────────────────────────────────
type Section = {
  id: string
  heading: string
  body?: string
  list?: string[]
}

type Policy = {
  title: string
  eyebrow: string
  intro: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  updated: string
  sections: Section[]
}

const UPDATED = "May 1, 2026"

const POLICIES: Record<string, Policy> = {
  // ───────────── Customer-facing policies ─────────────
  "privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Your data, your trust",
    icon: ShieldCheck,
    updated: UPDATED,
    intro:
      "Shaniid RX Pharmacy is committed to protecting the privacy and confidentiality of every customer who interacts with our website, app or pharmacists. This policy explains what information we collect, why we collect it, and the rights you have over your data.",
    sections: [
      {
        id: "what-we-collect",
        heading: "1. Information we collect",
        body:
          "We collect only the information needed to safely dispense medication, deliver your order and improve your experience.",
        list: [
          "Identity: full name, phone number, email and date of birth.",
          "Delivery: shipping address, GPS location pin and recipient contact.",
          "Health: prescriptions you upload, medication history and any clinical notes you share with our pharmacist.",
          "Payment: tokenised card or M-PESA transaction references — we never store your full card number or PIN.",
          "Technical: device type, browser, IP address and pages visited (used for security and analytics only).",
        ],
      },
      {
        id: "how-we-use",
        heading: "2. How we use your information",
        list: [
          "Verify prescriptions and dispense the correct medication safely.",
          "Process payments and deliver orders to your selected address.",
          "Send order, refill and adverse-event notifications by SMS, email or WhatsApp.",
          "Provide pharmacist consultations and follow-up care.",
          "Detect fraud, abuse and prescription forgery.",
          "Comply with the Pharmacy and Poisons Board (PPB) and Data Protection Act, 2019 (Kenya).",
        ],
      },
      {
        id: "sharing",
        heading: "3. When we share information",
        body:
          "We never sell personal or health information. We only share it with vetted partners who help us serve you, and only the minimum data they need:",
        list: [
          "Licensed delivery couriers (Sendy, G4S, in-house riders) — name, phone and address only.",
          "Payment processors (Paystack, Safaricom M-PESA) — order amount and reference.",
          "Regulatory authorities when legally compelled (PPB, ODPC, courts).",
          "Your treating doctor, only when you have explicitly consented.",
        ],
      },
      {
        id: "rights",
        heading: "4. Your rights under the Data Protection Act",
        list: [
          "Access: request a copy of all the data we hold on you.",
          "Correction: ask us to fix anything that is wrong.",
          "Deletion: request erasure of your account and history (except records we are legally required to keep).",
          "Withdraw consent at any time for marketing communications.",
          "Lodge a complaint with the Office of the Data Protection Commissioner (ODPC).",
        ],
      },
      {
        id: "retention",
        heading: "5. How long we keep your data",
        body:
          "Prescription and dispensing records are retained for a minimum of five (5) years as required by the Pharmacy and Poisons Board. Marketing data is kept only while your consent is active. Tokenised payment references are retained for seven (7) years for tax and audit.",
      },
      {
        id: "security",
        heading: "6. How we protect your data",
        list: [
          "All traffic is encrypted in transit using 256-bit TLS.",
          "Health and payment records are encrypted at rest.",
          "Access is role-based — only the pharmacist on duty can see your prescription.",
          "Annual penetration tests and quarterly internal audits.",
        ],
      },
      {
        id: "contact-dpo",
        heading: "7. Contact our Data Protection Officer",
        body:
          "Email dpo@shaniidrx.co.ke or call +254 780 406 059. We will respond to any privacy request within seven (7) working days.",
      },
    ],
  },

  "terms-of-service": {
    title: "Terms & Conditions",
    eyebrow: "The agreement between us",
    icon: ScrollText,
    updated: UPDATED,
    intro:
      "By using shaniidrx.co.ke or the Shaniid RX mobile app you agree to the terms below. Please read them carefully — they explain what you can expect from us and what we expect from you.",
    sections: [
      {
        id: "who-we-are",
        heading: "1. Who we are",
        body:
          "Shaniid RX is a community pharmacy operated by Shaniid Group of Technologies Limited and licensed by the Pharmacy and Poisons Board of Kenya (License No. PPB/RX/2026/0451).",
      },
      {
        id: "eligibility",
        heading: "2. Eligibility",
        list: [
          "You must be at least 18 years old to place an order.",
          "Prescription items can only be ordered with a valid prescription from a licensed Kenyan healthcare provider.",
          "You agree to provide accurate, complete information at registration and checkout.",
        ],
      },
      {
        id: "orders",
        heading: "3. Orders & acceptance",
        body:
          "Adding a product to your cart is an invitation to treat — your order is only confirmed once our pharmacist has reviewed it and you have received an order confirmation message. We reserve the right to cancel any order that fails clinical screening, suspected fraud or stock-out.",
      },
      {
        id: "pricing",
        heading: "4. Pricing & payment",
        list: [
          "All prices are in Kenya Shillings (KES) and include VAT where applicable.",
          "Promotional prices apply only while stocks last and within the stated dates.",
          "Payment is due in full at checkout via M-PESA, Visa, Mastercard, Equity Bank or Cash on Delivery (where available).",
        ],
      },
      {
        id: "delivery-tos",
        heading: "5. Delivery",
        body:
          "Delivery is governed by our Delivery Timing & Zones page. Risk passes to you on delivery to the address (or representative) provided at checkout.",
      },
      {
        id: "user-conduct",
        heading: "6. Acceptable use",
        list: [
          "Do not upload forged, altered or someone else's prescription.",
          "Do not resell medication purchased on Shaniid RX.",
          "Do not attempt to disrupt, scrape or reverse-engineer our service.",
        ],
      },
      {
        id: "liability",
        heading: "7. Limitation of liability",
        body:
          "Shaniid RX is liable for the safe dispensing and delivery of products you order. We are not liable for any indirect or consequential loss arising from misuse of medication, failure to disclose allergies, or use contrary to the prescriber's instructions.",
      },
      {
        id: "law",
        heading: "8. Governing law",
        body:
          "These Terms are governed by the laws of Kenya. Any dispute will be resolved in the courts of Nairobi.",
      },
    ],
  },

  "refund-policy": {
    title: "Returns & Refund Policy",
    eyebrow: "Fair, fast and transparent",
    icon: RotateCcw,
    updated: UPDATED,
    intro:
      "We want you to feel confident every time you order from Shaniid RX. If something is not right, we will make it right. This policy explains when items can be returned and how refunds are processed.",
    sections: [
      {
        id: "eligible",
        heading: "1. Items eligible for return",
        list: [
          "Sealed, unopened over-the-counter (OTC) products within 7 days of delivery.",
          "Medical devices in their original packaging with all accessories.",
          "Items damaged in transit or delivered incorrectly (report within 24 hours).",
          "Wrong dose, strength or pack size dispensed by us.",
        ],
      },
      {
        id: "non-returnable",
        heading: "2. Items we cannot accept back",
        body:
          "For your safety and that of every other customer, the following cannot be returned once dispensed:",
        list: [
          "Prescription medicines (POM) once they have left our pharmacy.",
          "Cold-chain items such as insulin, vaccines and biologics.",
          "Personal-care items where the seal has been broken.",
          "Custom-compounded preparations.",
        ],
      },
      {
        id: "how-to-return",
        heading: "3. How to start a return",
        body:
          "Contact our support team within the eligible window via WhatsApp, phone or the Help Centre. Provide your order number, the item and the reason. Our team will arrange a courier collection in Nairobi or share a drop-off label upcountry.",
      },
      {
        id: "refunds",
        heading: "4. Refund timelines",
        list: [
          "M-PESA: refunded within 24 hours of approval.",
          "Card payments: 5–7 business days back to the original card.",
          "Cash on Delivery: refunded via M-PESA to the registered phone number.",
          "Store credit (optional): instantly available, redeemable on any future order.",
        ],
      },
      {
        id: "wrong-item",
        heading: "5. Wrong or damaged items",
        body:
          "If we delivered the wrong product or it arrived damaged, we will replace it at no cost or issue a full refund — your choice. Just send us a photo and your order number.",
      },
    ],
  },

  prescription: {
    title: "Prescription Policy",
    eyebrow: "Safe dispensing every time",
    icon: FileText,
    updated: UPDATED,
    intro:
      "Prescription medicines (POM) are powerful tools — and Shaniid RX dispenses them only against a valid prescription issued by a registered Kenyan healthcare provider. This policy outlines our acceptance criteria, screening process and refill rules.",
    sections: [
      {
        id: "valid-rx",
        heading: "1. What counts as a valid prescription",
        list: [
          "Issued by a doctor, dentist or clinical officer registered in Kenya.",
          "Includes the prescriber's name, registration number, signature and date.",
          "Patient name, age and weight (for paediatrics).",
          "Drug name, strength, dose, frequency and duration clearly stated.",
          "Not older than 6 months for chronic medication, 30 days for controlled drugs.",
        ],
      },
      {
        id: "screening",
        heading: "2. Clinical screening by our pharmacists",
        body:
          "Every prescription is reviewed by a licensed pharmacist before dispensing. We check for:",
        list: [
          "Drug-drug and drug-allergy interactions.",
          "Appropriate dose, frequency and duration.",
          "Duplicate therapy or contraindications.",
          "Forgery indicators or unusual prescribing patterns.",
        ],
      },
      {
        id: "controlled",
        heading: "3. Controlled substances",
        body:
          "Schedule II–IV controlled drugs require the original signed prescription, government ID and physical pickup or supervised delivery. We may refuse dispensing if any criterion is not met — no refunds are penalised in such cases.",
      },
      {
        id: "refills",
        heading: "4. Refills & automatic reorders",
        body:
          "We keep a digital copy of your prescription on file for the duration authorised by your prescriber. Refill reminders are sent by SMS 5 days before you are due to run out. You can decline or pause refills at any time.",
      },
    ],
  },

  "prescription-upload-guide": {
    title: "Prescription Upload Guide",
    eyebrow: "How to send us your Rx",
    icon: FileText,
    updated: UPDATED,
    intro:
      "Uploading your prescription on Shaniid RX takes less than a minute. Follow this short guide to make sure our pharmacist can read every detail clearly and dispense the right medication for you.",
    sections: [
      {
        id: "what-to-send",
        heading: "1. What to send",
        list: [
          "A clear photo or scan of the original prescription (front and back if hand-written on both sides).",
          "Your full name and phone number on the order so we can match it to the Rx.",
          "Any allergies or current medications you would like the pharmacist to know.",
        ],
      },
      {
        id: "good-photo",
        heading: "2. How to take a clear photo",
        list: [
          "Place the prescription on a flat, well-lit surface.",
          "Avoid shadows — natural daylight works best.",
          "Make sure all four corners are visible inside the frame.",
          "Check that the prescriber's name, signature and date are readable.",
          "PDF, JPG and PNG files up to 8 MB are accepted.",
        ],
      },
      {
        id: "where-to-upload",
        heading: "3. Where to upload",
        list: [
          "On any product page or at checkout — tap “Upload Prescription”.",
          "Through our WhatsApp pharmacist line — send the photo and we will create the order for you.",
          "By email to rx@shaniidrx.co.ke with your order number in the subject.",
        ],
      },
      {
        id: "what-happens-next",
        heading: "4. What happens after upload",
        body:
          "A licensed pharmacist will review your prescription within 30 minutes during working hours. If everything checks out, we will confirm your order by SMS. If we need clarification — for example a hand-written dose we cannot read — we will call or WhatsApp you before dispensing.",
      },
    ],
  },

  // ───────────── Legal & compliance ─────────────
  license: {
    title: "License",
    eyebrow: "Officially registered to serve you",
    icon: BadgeCheck,
    updated: UPDATED,
    intro:
      "Shaniid RX is a fully licensed retail pharmacy in Kenya. Below are the licenses, registrations and supervisory bodies that govern our operations.",
    sections: [
      {
        id: "ppb",
        heading: "1. Pharmacy and Poisons Board (PPB)",
        list: [
          "Premises Licence Number: PPB/RX/2026/0451",
          "Superintendent Pharmacist: Dr. ____ ____, Reg. No. PPB/PHA/____",
          "Renewal date: 31 December 2026",
        ],
      },
      {
        id: "company",
        heading: "2. Company registration",
        body:
          "Shaniid Group of Technologies Limited, incorporated in Kenya under Company No. PVT-____.",
      },
      {
        id: "kra",
        heading: "3. Tax registration",
        body:
          "KRA PIN: P051______Z. We issue ETIMS-compliant invoices for every order on request.",
      },
      {
        id: "verify",
        heading: "4. Verifying our license",
        body:
          "You can verify our PPB licence at any time by visiting pharmacyboardkenya.org and entering our premises licence number above.",
      },
    ],
  },

  regulatory: {
    title: "Regulatory Compliance",
    eyebrow: "Operating to national standards",
    icon: ShieldCheck,
    updated: UPDATED,
    intro:
      "Shaniid RX operates under the regulatory frameworks that protect patients and consumers in Kenya. We comply with — and frequently exceed — the requirements set by national authorities.",
    sections: [
      {
        id: "frameworks",
        heading: "1. Regulatory frameworks we follow",
        list: [
          "Pharmacy and Poisons Act, Cap 244 (Laws of Kenya).",
          "Health Act, 2017.",
          "Data Protection Act, 2019 — registered with the ODPC.",
          "Consumer Protection Act, 2012.",
          "Kenya Bureau of Standards (KEBS) — for medical devices.",
        ],
      },
      {
        id: "training",
        heading: "2. Pharmacist training & competence",
        body:
          "Every pharmacist on the Shaniid RX team holds a current PPB practising certificate and completes at least 30 hours of CPD annually. Pharmacy technologists are PPB-registered and supervised at all times.",
      },
      {
        id: "advertising",
        heading: "3. Advertising & promotion",
        body:
          "We follow the PPB Code on advertising of medicines. We never advertise prescription-only medicines to the public and all OTC promotions are reviewed by our superintendent pharmacist.",
      },
      {
        id: "audits",
        heading: "4. Inspections & audits",
        body:
          "We are inspected annually by the PPB and undergo internal compliance audits every quarter. Non-conformities are tracked to closure and reported to senior management.",
      },
    ],
  },

  quality: {
    title: "Quality & Safety Standards",
    eyebrow: "From manufacturer to your door",
    icon: FlaskConical,
    updated: UPDATED,
    intro:
      "Quality is non-negotiable. Every product we dispense follows a documented chain of custody from a licensed manufacturer through our temperature-controlled warehouse to your hands.",
    sections: [
      {
        id: "sourcing",
        heading: "1. Sourcing",
        list: [
          "We buy only from manufacturers and distributors registered with the PPB.",
          "Each batch arrives with a Certificate of Analysis (CoA).",
          "Batch numbers and expiry dates are scanned into our system on intake.",
        ],
      },
      {
        id: "storage",
        heading: "2. Storage",
        list: [
          "Ambient stock kept at 15–25 °C, monitored 24/7 with automated alerts.",
          "Cold-chain (2–8 °C) products in calibrated medical-grade fridges with backup power.",
          "Temperature logs reviewed daily and archived for 5 years.",
        ],
      },
      {
        id: "dispensing",
        heading: "3. Dispensing",
        list: [
          "Two-pharmacist verification on every prescription.",
          "Barcoded dispensing — the system blocks dispensing of expired or recalled batches.",
          "Tamper-evident packaging on every order.",
        ],
      },
      {
        id: "delivery-quality",
        heading: "4. Delivery",
        body:
          "Cold-chain deliveries use insulated pouches with validated gel packs. Delivery riders are trained on chain-of-custody and patient confidentiality.",
      },
    ],
  },

  pharmacovigilance: {
    title: "Pharmacovigilance & Adverse Events",
    eyebrow: "Help us keep medicines safe",
    icon: Stethoscope,
    updated: UPDATED,
    intro:
      "Pharmacovigilance is the science of detecting, assessing and preventing medicine-related harm. Reporting adverse events helps the entire country, not just you. Shaniid RX takes every report seriously and forwards it to the PPB.",
    sections: [
      {
        id: "what-is-ae",
        heading: "1. What is an adverse event?",
        body:
          "Any unwanted or unexpected reaction to a medicine — from a mild rash to a hospital admission. Even if you are not sure whether the medicine caused it, please report it.",
      },
      {
        id: "how-to-report",
        heading: "2. How to report to us",
        list: [
          "Call our Pharmacovigilance Line: +254 780 406 059 (8 AM – 10 PM).",
          "Email: pv@shaniidrx.co.ke.",
          "WhatsApp the photo of any reaction to our pharmacist line.",
          "Use the “Report a side effect” button on your order in the customer portal.",
        ],
      },
      {
        id: "what-we-do",
        heading: "3. What happens with your report",
        list: [
          "Our pharmacist will call you within 4 hours to take a full history.",
          "We submit a Pharmacovigilance Yellow Form to the PPB within 7 days for serious events, 30 days for non-serious.",
          "We follow up with you to confirm recovery.",
          "Identifiable details are removed before any data is shared externally.",
        ],
      },
      {
        id: "ppb-direct",
        heading: "4. Reporting directly to the PPB",
        body:
          "You can also report directly to the Pharmacy and Poisons Board through pv.pharmacyboardkenya.org or the “Med Safety” mobile app.",
      },
    ],
  },

  recalls: {
    title: "Recall & Safety Notices",
    eyebrow: "Transparency when it matters most",
    icon: BellRing,
    updated: UPDATED,
    intro:
      "When a manufacturer or the Pharmacy and Poisons Board issues a recall, we act immediately. This page explains how we handle recalls and how you will be contacted if a product you bought is affected.",
    sections: [
      {
        id: "monitoring",
        heading: "1. How we monitor recalls",
        list: [
          "Daily check of PPB recall bulletins and WHO Medical Product Alerts.",
          "Direct notifications from manufacturers and distributors.",
          "Internal triggers from adverse-event clusters reported to our pharmacovigilance team.",
        ],
      },
      {
        id: "when-affected",
        heading: "2. If a product you ordered is affected",
        body:
          "We use your dispensing record to identify everyone who received the affected batch. You will be contacted within 24 hours by SMS, phone and email with:",
        list: [
          "The product name, batch number and reason for the recall.",
          "Clear instructions on whether to stop using it immediately.",
          "Your free options: full refund, replacement with an unaffected batch, or alternative medication after pharmacist review.",
          "Free courier collection of the affected stock.",
        ],
      },
      {
        id: "current-notices",
        heading: "3. Current safety notices",
        body:
          "There are no active recalls affecting Shaniid RX customers at this time. All historical notices are archived for 7 years and available on request.",
      },
      {
        id: "report-suspect",
        heading: "4. Reporting a suspect product",
        body:
          "If you suspect a product is counterfeit, sub-standard or different from what you have received before, stop using it and contact us immediately. We will collect, investigate and report to the PPB on your behalf.",
      },
    ],
  },
}

// Aliases so old slugs still work
const SLUG_ALIASES: Record<string, string> = {
  "payments-policy": "refund-policy",
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function PolicyPage({ slug }: { slug: string }) {
  const resolvedSlug = SLUG_ALIASES[slug] || slug
  const local = POLICIES[resolvedSlug]
  const { phoneHref, phoneDisplay, whatsappHref: waHref } = useStoreContact()

  // Optional: fetch CMS content if available, otherwise rely on local rich content.
  const [apiHtml, setApiHtml] = useState<string | null>(null)
  const [apiTitle, setApiTitle] = useState<string | null>(null)
  const [apiUpdated, setApiUpdated] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/policies/${resolvedSlug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d) return
        const p = d.policy || d
        if (p?.content && typeof p.content === "string" && p.content.trim().length > 40) {
          setApiHtml(p.content)
          setApiTitle(p.title || null)
          setApiUpdated(p.updated_at || null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [resolvedSlug])

  const fallback: Policy = useMemo(
    () => ({
      title: "Policy",
      eyebrow: "Shaniid RX Pharmacy",
      icon: ScrollText,
      updated: UPDATED,
      intro: "Content for this policy is being prepared. Please check back soon or contact our support team for the latest information.",
      sections: [],
    }),
    [],
  )

  const policy = local ?? fallback
  const Icon = policy.icon
  const title = apiTitle || policy.title
  const updated = apiUpdated
    ? new Date(apiUpdated).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })
    : policy.updated

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${CREAM} 0%, ${PEACH_LIGHT} 55%, #F8D9B6 100%)` }}
          />
          <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full blur-3xl opacity-50" style={{ background: "#FBD0AC" }} />
          <div className="absolute top-10 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: ORANGE }} />
          <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: "#F4C9A0" }} />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: `radial-gradient(${WINE_SOFT} 1px, transparent 1px)`, backgroundSize: "22px 22px" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: `linear-gradient(to bottom, transparent, ${CREAM})` }} />

          <div className="relative z-10 mx-auto max-w-5xl px-4 pt-14 pb-12 lg:pt-20 lg:pb-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs mb-5" style={{ color: WINE_SOFT }}>
              <Link href="/" className="hover:underline">Home</Link>
              <ChevronRight className="h-3 w-3 opacity-60" />
              <span className="font-semibold" style={{ color: WINE }}>{title}</span>
            </nav>

            <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 border backdrop-blur-md"
                  style={{ background: "rgba(255,255,255,0.7)", borderColor: PEACH_BORDER }}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: ORANGE }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: WINE_SOFT }}>
                    {policy.eyebrow}
                  </span>
                </div>
                <h1
                  className="font-serif text-3xl lg:text-5xl font-bold mb-3 leading-tight"
                  style={{ color: WINE, letterSpacing: "-0.02em" }}
                >
                  {title}
                </h1>
                <p className="text-sm lg:text-base max-w-2xl mb-4" style={{ color: `${WINE_SOFT}CC` }}>
                  {policy.intro}
                </p>
                <div className="inline-flex items-center gap-2 text-xs" style={{ color: WINE_SOFT }}>
                  <Clock className="h-3.5 w-3.5" />
                  Last updated: <span className="font-semibold" style={{ color: WINE }}>{updated}</span>
                </div>
              </div>

              {/* Glass medallion */}
              <div className="hidden lg:flex justify-end">
                <div
                  className="relative w-44 h-44 rounded-3xl flex items-center justify-center backdrop-blur-xl border"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderColor: PEACH_BORDER,
                    boxShadow: "0 25px 60px -25px rgba(122,37,53,0.35)",
                  }}
                >
                  <div
                    className="w-28 h-28 rounded-2xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}
                  >
                    <Icon className="h-12 w-12" style={{ color: "white" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mx-auto max-w-5xl px-4 lg:px-6 py-10 lg:py-14">
          {apiHtml ? (
            <div
              className="prose prose-sm max-w-none rounded-2xl px-6 py-8 border"
              style={{ background: "white", borderColor: PEACH_BORDER, color: WINE_SOFT }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(apiHtml) }}
            />
          ) : (
            <div className="grid lg:grid-cols-[220px_1fr] gap-8">
              {/* TOC */}
              {policy.sections.length > 0 && (
                <aside className="hidden lg:block">
                  <div
                    className="sticky top-24 rounded-2xl p-5 border backdrop-blur"
                    style={{ background: "rgba(255,255,255,0.7)", borderColor: PEACH_BORDER }}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: WINE_SOFT }}>
                      On this page
                    </p>
                    <ul className="space-y-2">
                      {policy.sections.map(s => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            className="text-xs leading-snug block hover:underline"
                            style={{ color: WINE }}
                          >
                            {s.heading}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              )}

              {/* Content */}
              <article
                className="rounded-3xl p-6 lg:p-10 border"
                style={{
                  background: "white",
                  borderColor: PEACH_BORDER,
                  boxShadow: "0 18px 40px -28px rgba(61,8,20,0.18)",
                }}
              >
                {policy.sections.length === 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: PEACH_LIGHT, color: WINE }}>
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      We're polishing the wording for this page. Meanwhile, please reach out to our team — we'll be glad to help.
                    </p>
                  </div>
                )}

                {policy.sections.map((s, idx) => (
                  <section key={s.id} id={s.id} className={idx === 0 ? "" : "mt-9 pt-9 border-t"} style={idx === 0 ? {} : { borderColor: PEACH_MED }}>
                    <h2
                      className="font-serif text-xl lg:text-2xl font-bold mb-3 scroll-mt-24"
                      style={{ color: WINE, letterSpacing: "-0.01em" }}
                    >
                      {s.heading}
                    </h2>
                    {s.body && (
                      <p className="text-sm lg:text-[15px] leading-relaxed mb-3" style={{ color: WINE_SOFT }}>
                        {s.body}
                      </p>
                    )}
                    {s.list && s.list.length > 0 && (
                      <ul className="space-y-2.5 mt-2">
                        {s.list.map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm lg:text-[15px] leading-relaxed" style={{ color: WINE_SOFT }}>
                            <span
                              className="flex-shrink-0 w-5 h-5 rounded-full grid place-items-center mt-0.5"
                              style={{ background: PEACH_LIGHT, color: WINE }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ORANGE }} />
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </article>
            </div>
          )}

          {/* ── Help CTA ── */}
          <div
            className="mt-12 rounded-3xl p-8 lg:p-10 border"
            style={{
              background: `linear-gradient(135deg, #FEF0E4 0%, #FAE2CC 100%)`,
              borderColor: PEACH_BORDER,
            }}
          >
            <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <h3 className="font-serif text-xl lg:text-2xl font-bold mb-1" style={{ color: WINE }}>
                  Have a question about this policy?
                </h3>
                <p className="text-sm" style={{ color: WINE_SOFT }}>
                  Our pharmacists and care team are available 8 AM – 10 PM, 7 days a week.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 h-11 rounded-xl font-semibold text-sm text-white"
                  style={{ background: "#25D366" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
                <a
                  href={phoneHref}
                  className="inline-flex items-center gap-2 px-5 h-11 rounded-xl font-semibold text-sm border"
                  style={{ background: "white", borderColor: PEACH_BORDER, color: WINE }}
                >
                  <Phone className="h-4 w-4" style={{ color: ORANGE }} />
                  {phoneDisplay}
                </a>
              </div>
            </div>
          </div>

          {/* Related policies */}
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {relatedFor(resolvedSlug).map(r => (
              <Link
                key={r.slug}
                href={r.href}
                className="group rounded-2xl p-4 border transition-all hover:-translate-y-0.5"
                style={{ background: "white", borderColor: PEACH_BORDER }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: PEACH_LIGHT }}
                >
                  <r.icon className="h-4 w-4" style={{ color: WINE }} />
                </div>
                <p className="text-sm font-bold leading-tight" style={{ color: WINE }}>{r.title}</p>
                <p className="text-xs mt-1 inline-flex items-center gap-1 group-hover:underline" style={{ color: ORANGE }}>
                  Read policy <ChevronRight className="h-3 w-3" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ── Related cards selector ──────────────────────────────────────────────────
function relatedFor(currentSlug: string) {
  const all = [
    { slug: "privacy-policy",            href: "/privacy-policy",                       title: "Privacy Policy",            icon: ShieldCheck },
    { slug: "terms-of-service",          href: "/terms-of-service",                     title: "Terms & Conditions",        icon: ScrollText },
    { slug: "refund-policy",             href: "/refund-policy",                        title: "Returns & Refunds",         icon: RotateCcw },
    { slug: "prescription",              href: "/policies/prescription",                title: "Prescription Policy",       icon: FileText },
    { slug: "license",                   href: "/policies/license",                     title: "License",                   icon: BadgeCheck },
    { slug: "regulatory",                href: "/policies/regulatory",                  title: "Regulatory Compliance",     icon: ShieldCheck },
    { slug: "quality",                   href: "/policies/quality",                     title: "Quality & Safety",          icon: FlaskConical },
    { slug: "pharmacovigilance",         href: "/policies/pharmacovigilance",           title: "Pharmacovigilance",         icon: Stethoscope },
    { slug: "recalls",                   href: "/policies/recalls",                     title: "Recall Notices",            icon: BellRing },
    { slug: "delivery",                  href: "/delivery",                             title: "Delivery Timing & Zones",   icon: Truck },
  ]
  return all.filter(p => p.slug !== currentSlug).slice(0, 4)
}

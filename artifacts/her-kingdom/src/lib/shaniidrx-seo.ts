/* ─────────────────────────────────────────────────────────────
   Shaniid RX — pharmacy SEO bank

   Source of truth: SHANIID RX Brand Brief (09.04.2026).
   Promise: "If it comes through Shaniid RX, it is genuine,
   fairly priced, and delivered with integrity."

   Everything that affects search visibility (titles, descriptions,
   keyword clusters, per-page intent presets) lives here so SEO copy
   can be tuned in ONE file. Imported by:
     - components/seo.tsx       (merges GLOBAL_KEYWORDS into every page)
     - index.html               (static defaults are kept in sync manually)
     - per-page <Seo …/>        (pulls a PAGE_SEO[...] preset)
────────────────────────────────────────────────────────────── */

export const BRAND = "Shaniid RX"
export const LEGAL_NAME = "Shaniid Group of Technologies Ltd"
export const TAGLINE = "Trusted Online Pharmacy in Kenya"
export const PROMISE = "Medicine You Can Trust. Delivered."

export const SITE_URL = (() => {
  const env = (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) || ""
  const fallback = "https://shaniidrx.co.ke"
  return (env || fallback).replace(/\/+$/, "")
})()

/** Default share image — 1200×630 branded card under public/ */
export const DEFAULT_OG_IMAGE = "/og-default.jpg"

export const CONTACT = {
  phone: "+254780406059",
  phoneDisplay: "0780 406 059",
  whatsapp: "254780406059",
  email: "hello@shaniidrx.co.ke",
  address: "The Real Noma Sana Unity Hub, Eastleigh",
  city: "Nairobi",
  region: "Nairobi County",
  postalCode: "00610",
  country: "KE",
  geoLat: -1.2722,
  geoLng: 36.8579,
} as const

/* ─────────────────────────────────────────────────────────────
   GLOBAL KEYWORDS — appended to every page's <meta name="keywords">
   ~120 high-intent terms covering brand, category, geo & intent.
────────────────────────────────────────────────────────────── */
export const GLOBAL_KEYWORDS: string[] = [
  // brand
  "Shaniid RX", "Shaniid Rx", "ShaniidRX", "Shaniid pharmacy", "Shaniid Group",
  "Shaniid online pharmacy", "Shaniid RX Kenya", "Shaniid RX Nairobi",

  // primary intent — online pharmacy
  "online pharmacy Kenya", "online pharmacy Nairobi", "buy medicine online Kenya",
  "order medicine online Nairobi", "online chemist Kenya", "online drugstore Kenya",
  "best online pharmacy Kenya", "trusted online pharmacy Kenya",
  "licensed online pharmacy Kenya", "verified pharmacy Kenya",
  "pharmacy near me Nairobi", "24 hour pharmacy Nairobi", "same day medicine delivery Nairobi",

  // delivery / fulfilment
  "medicine delivery Nairobi", "doorstep medicine delivery Kenya",
  "free medicine delivery Nairobi", "fast pharmacy delivery", "express prescription delivery",
  "M-Pesa pharmacy", "pay with M-Pesa pharmacy", "cash on delivery pharmacy Kenya",

  // prescription / Rx
  "upload prescription online Kenya", "prescription refill Nairobi", "Rx refill Kenya",
  "prescription delivery Kenya", "private prescription Kenya", "repeat prescription Kenya",
  "chronic medication refill Kenya",

  // telehealth / consult
  "online doctor consultation Kenya", "telemedicine Kenya", "talk to a doctor Kenya",
  "virtual doctor Nairobi", "online pharmacist Kenya", "pharmacist advice Kenya",

  // categories — meds
  "over the counter medicine Kenya", "OTC medicine Nairobi",
  "pain relief Kenya", "cold and flu medicine Kenya", "allergy medicine Kenya",
  "diabetes medicine Kenya", "hypertension medicine Kenya", "antibiotics Kenya",
  "asthma inhalers Kenya", "antimalarial Kenya",

  // categories — wellness
  "vitamins and supplements Kenya", "multivitamins Nairobi", "immunity boosters Kenya",
  "iron supplements Kenya", "calcium supplements Kenya", "omega 3 Kenya",
  "probiotics Kenya", "prenatal vitamins Kenya",

  // categories — personal & family
  "baby care Nairobi", "infant formula Kenya", "diapers Kenya",
  "women health Kenya", "menstrual care Kenya", "family planning Kenya",
  "men health Kenya", "skincare Kenya", "sunscreen Kenya",

  // categories — devices
  "blood pressure monitor Kenya", "glucometer Kenya", "thermometer Kenya",
  "pulse oximeter Kenya", "nebulizer Kenya", "first aid kit Kenya",
  "medical devices Kenya", "diagnostic devices Nairobi",

  // trust & quality
  "genuine medicine Kenya", "authentic medicines Kenya", "anti-counterfeit pharmacy",
  "verified suppliers pharmacy", "Pharmacy and Poisons Board Kenya",
  "cold chain medicine Kenya", "tamper evident packaging pharmacy",

  // long-tail / informational
  "where to buy medicine online in Kenya", "cheapest online pharmacy Kenya",
  "affordable medicine Nairobi", "fairly priced pharmacy Kenya",
  "best pharmacy app Kenya", "Eastleigh pharmacy", "Westlands pharmacy delivery",
]

/* ─────────────────────────────────────────────────────────────
   PER-PAGE PRESETS — pull the right preset in each page's <Seo …/>.
   Each preset returns SeoProps-compatible fields.
────────────────────────────────────────────────────────────── */

type Preset = {
  title: string
  description: string
  keywords: string[]
  canonicalPath: string
  image?: string
}

export const PAGE_SEO = {
  home: {
    title: "Trusted Online Pharmacy in Kenya — Genuine Medicine, Delivered",
    description:
      "Order verified medicines, vitamins, baby care and medical devices from Shaniid RX — Kenya's trust layer for medicine distribution. Same-day Nairobi delivery, M-Pesa accepted, prescriptions reviewed by licensed pharmacists.",
    keywords: [
      "online pharmacy Kenya", "buy medicine online Nairobi", "Shaniid RX",
      "same day medicine delivery", "genuine medicine Kenya", "M-Pesa pharmacy",
      "upload prescription Kenya", "talk to a doctor Kenya", "verified pharmacy Nairobi",
    ],
    canonicalPath: "/",
    image: "/og-default.jpg",
  },
  shop: {
    title: "Shop Medicines, Vitamins & Healthcare Online — Shaniid RX",
    description:
      "Browse the full Shaniid RX catalogue — prescription medicines, OTC, vitamins, baby care, skincare and medical devices. Authentic, fairly priced, delivered across Kenya.",
    keywords: [
      "shop medicine online Kenya", "buy vitamins Nairobi", "OTC medicine Kenya",
      "baby care Kenya", "skincare Kenya", "medical devices Kenya",
      "online drugstore Nairobi", "pharmacy catalogue Kenya",
    ],
    canonicalPath: "/shop",
    image: "/og-default.jpg",
  },
  services: {
    title: "Pharmacy Services — Refills, Consults, Devices & Care Packs",
    description:
      "Prescription refills, online pharmacist consults, chronic-care plans, medical device hire and curated care packs — all delivered with the Shaniid RX trust seal.",
    keywords: [
      "pharmacy services Kenya", "prescription refill Nairobi", "chronic care Kenya",
      "medication management Kenya", "pharmacist consultation Kenya", "care pack Kenya",
    ],
    canonicalPath: "/services",
  },
  uploadPrescription: {
    title: "Upload Your Prescription — Verified by a Licensed Pharmacist",
    description:
      "Upload your prescription securely and have it reviewed by a licensed Kenyan pharmacist within the hour. Same-day Nairobi delivery, M-Pesa or card.",
    keywords: [
      "upload prescription online Kenya", "send prescription pharmacy Kenya",
      "Rx upload Nairobi", "prescription delivery Kenya", "private prescription Nairobi",
      "repeat prescription Kenya", "chronic medication refill Kenya",
    ],
    canonicalPath: "/upload-prescription",
  },
  trackOrder: {
    title: "Track Your Order — Live Pharmacy Delivery Updates",
    description:
      "Follow your Shaniid RX delivery in real time — from pharmacist verification to your doorstep. Search by order number or phone, transparently.",
    keywords: [
      "track pharmacy order Kenya", "medicine delivery tracking Nairobi",
      "Shaniid RX order status", "online pharmacy order tracking",
    ],
    canonicalPath: "/track-order",
  },
  doctor: {
    title: "Speak to a Doctor Online — Private Telehealth Consults",
    description:
      "Connect with licensed Kenyan doctors over a private, encrypted video call. Get diagnosis, prescriptions and refills delivered to your door — no waiting rooms.",
    keywords: [
      "online doctor Kenya", "telemedicine Nairobi", "virtual doctor consultation Kenya",
      "video consultation doctor Kenya", "talk to a doctor online Kenya",
      "private telehealth Kenya", "Shaniid doctor",
    ],
    canonicalPath: "/speak-to-a-doctor",
  },
  about: {
    title: "About Shaniid RX — Africa's Trust Layer for Medicine",
    description:
      "Shaniid RX is the trust layer for medicine distribution in Africa. We connect verified suppliers, community pharmacies and patients with genuine, fairly priced medicine — delivered with integrity.",
    keywords: [
      "about Shaniid RX", "trusted pharmacy Africa", "verified medicine suppliers Kenya",
      "ethical pharmacy Kenya", "community pharmacy Nairobi", "Shaniid Group",
    ],
    canonicalPath: "/about",
  },
  contact: {
    title: "Contact Shaniid RX — Pharmacist Support 7 Days a Week",
    description:
      "Reach a real Shaniid RX pharmacist by phone, WhatsApp or email — seven days a week. We're here for prescriptions, refills, delivery questions and chronic care.",
    keywords: [
      "contact Shaniid RX", "pharmacy WhatsApp Kenya", "pharmacist help Nairobi",
      "online pharmacy support Kenya",
    ],
    canonicalPath: "/contact",
  },
  faq: {
    title: "Pharmacy FAQs — Delivery, Prescriptions, Payments & Safety",
    description:
      "Answers to common Shaniid RX questions on delivery zones, prescription uploads, M-Pesa payments, refunds and cold-chain medicine safety.",
    keywords: [
      "pharmacy FAQ Kenya", "online pharmacy questions Kenya", "Shaniid RX help",
      "prescription FAQ Kenya", "medicine delivery FAQ Nairobi",
    ],
    canonicalPath: "/faq",
  },
  delivery: {
    title: "Delivery Zones & Timing — Same-Day Medicine Across Nairobi",
    description:
      "Same-day Nairobi delivery, next-day for major Kenyan towns. See zones, cut-off times, fees and our cold-chain guarantee for temperature-sensitive medicine.",
    keywords: [
      "medicine delivery zones Kenya", "same day pharmacy delivery Nairobi",
      "courier medicine Kenya", "cold chain delivery pharmacy",
    ],
    canonicalPath: "/delivery",
  },
  careers: {
    title: "Careers at Shaniid RX — Build Africa's Trusted Pharmacy",
    description:
      "Join Shaniid RX and help build the trust layer for medicine across Africa. Roles in pharmacy, operations, engineering, supply and clinical care.",
    keywords: [
      "pharmacy jobs Kenya", "Shaniid RX careers", "health tech jobs Nairobi",
      "pharmacist jobs Kenya", "Eastleigh jobs",
    ],
    canonicalPath: "/careers",
  },
  blogs: {
    title: "Health & Medicine Blog — Trusted Advice from Shaniid RX",
    description:
      "Plain-language health guides written by Kenyan pharmacists — on safe medicine use, chronic care, family wellness, and avoiding counterfeit drugs.",
    keywords: [
      "health blog Kenya", "pharmacy blog Nairobi", "medicine guide Kenya",
      "chronic disease Kenya", "safe medication Kenya",
    ],
    canonicalPath: "/blogs",
  },
  blogDetail: {
    title: "Health Article — Shaniid RX",
    description: "Trusted health and medicine advice from licensed Kenyan pharmacists.",
    keywords: ["health article Kenya", "pharmacy advice Kenya"],
    canonicalPath: "/blogs",
  },
  search: {
    title: "Search Medicines & Healthcare Products — Shaniid RX",
    description: "Search the Shaniid RX catalogue for medicines, vitamins, baby care, skincare and medical devices.",
    keywords: ["search medicine Kenya", "find medicine online Kenya", "pharmacy search Nairobi"],
    canonicalPath: "/search",
  },
  carePacks: {
    title: "Care Packs — Curated Bundles for Common Health Needs",
    description: "Curated care packs for flu, first aid, travel, women's wellness, infant care and chronic conditions — bundled, fairly priced, delivered to your door.",
    keywords: ["care pack Kenya", "health bundle Nairobi", "first aid kit Kenya", "wellness pack Kenya"],
    canonicalPath: "/care-packs",
  },
  policy: {
    title: "Privacy, Terms & Pharmacy Policies — Shaniid RX",
    description: "Privacy policy, terms of service, prescription handling, returns and pharmacy compliance for Shaniid RX customers in Kenya.",
    keywords: ["privacy policy pharmacy Kenya", "terms of service Shaniid RX", "pharmacy compliance Kenya"],
    canonicalPath: "/policy",
  },
  notFound: {
    title: "Page Not Found — Shaniid RX",
    description: "We couldn't find that page. Browse our catalogue, upload a prescription or talk to a pharmacist on Shaniid RX.",
    keywords: ["Shaniid RX", "online pharmacy Kenya"],
    canonicalPath: "/404",
  },
} satisfies Record<string, Preset>

/* ─────────────────────────────────────────────────────────────
   JSON-LD helpers specific to Shaniid RX
────────────────────────────────────────────────────────────── */

export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Pharmacy",
  "@id": `${SITE_URL}/#pharmacy`,
  name: BRAND,
  legalName: LEGAL_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
  slogan: PROMISE,
  description:
    "Shaniid RX is the trust layer for medicine distribution in Africa — verified suppliers, transparent pricing, door-to-door delivery.",
  telephone: CONTACT.phone,
  email: CONTACT.email,
  priceRange: "KSh",
  currenciesAccepted: "KES",
  paymentAccepted: "M-Pesa, Cash, Visa, Mastercard",
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address,
    addressLocality: CONTACT.city,
    addressRegion: CONTACT.region,
    postalCode: CONTACT.postalCode,
    addressCountry: CONTACT.country,
  },
  geo: { "@type": "GeoCoordinates", latitude: CONTACT.geoLat, longitude: CONTACT.geoLng },
  areaServed: [
    { "@type": "Country", name: "Kenya" },
    { "@type": "City",    name: "Nairobi" },
  ],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], opens: "08:00", closes: "21:00" },
  ],
  sameAs: [] as string[],
}

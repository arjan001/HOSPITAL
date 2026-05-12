import { LandingPage } from "@/components/store/landing-page"
import type { Metadata } from "next"
import { SITE_SEO, PAGE_SEO, PAGE_KEYWORDS } from "@/lib/seo-data"
import { metaKeywordsFor } from "@/lib/seo-keyword-engine"

const siteUrl = SITE_SEO.siteUrl

const HOME_TITLE = "Best Jewelry Shops Nairobi | #1 Gift Shop Kenya | herkingdom.shop"
const HOME_DESCRIPTION =
  "Shop the most lavish jewelry, watches, and gift packages in Nairobi. herkingdom.shop offers same-day delivery on Mother's Day gifts, minimalist sets, and luxury accessories. Order via WhatsApp now!"

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: [...PAGE_KEYWORDS.home, ...metaKeywordsFor("home", 80)],
  alternates: { canonical: siteUrl },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: siteUrl,
    type: "website",
    siteName: "Her Kingdom",
    locale: "en_KE",
    images: [
      {
        url: `${siteUrl}/og-default.jpg`,
        secureUrl: `${siteUrl}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Her Kingdom - Curated Jewelry & Accessories Nairobi",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@herkingdom_jewelry",
    creator: "@herkingdom_jewelry",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{ url: `${siteUrl}/og-default.jpg`, alt: "Her Kingdom Jewelry", width: 1200, height: 630 }],
  },
}

const HOME_FAQS = [
  {
    q: "What is the best jewelry shop in Nairobi?",
    a: "Her Kingdom (herkingdom.shop) is rated the #1 curated jewelry shop in Nairobi. We offer hypoallergenic necklaces, bracelets, earrings, men's watches, sunglasses and luxe gift packages with same-day Nairobi delivery.",
  },
  {
    q: "Do you deliver jewelry gifts the same day in Nairobi?",
    a: "Yes. We offer same-day delivery across Nairobi (CBD, Westlands, Kilimani, Karen, Lavington) and next-day courier delivery to Mombasa, Kisumu, Nakuru and Eldoret. Order via WhatsApp +254 780 406 059 for priority dispatch.",
  },
  {
    q: "Can I buy a Mother's Day or Valentine's gift package?",
    a: "Absolutely. Our Luxe Gift Packages include jewelry, perfume, flowers and a personalised card. We have dedicated Mother's Day, Valentine's, Anniversary and Birthday Surprise bundles with luxe packaging included.",
  },
  {
    q: "Do you sell men's jewelry and watches?",
    a: "Yes. Her Kingdom stocks men's necklaces, minimalist chains, designer sunglasses, premium grooming scents and executive men's watches from RADO, SKMEI and CURREN, alongside ready-made executive gift sets.",
  },
  {
    q: "How do I pay — M-Pesa, card, or cash on delivery?",
    a: "We accept M-Pesa (Till/Paybill), debit and credit cards, and cash on delivery for Nairobi. Every order ships in luxe branded packaging and includes a free gift card on request.",
  },
  {
    q: "Is the jewelry at Her Kingdom hypoallergenic?",
    a: "Yes. Every piece at herkingdom.shop is curated to be hypoallergenic, nickel-free and long-lasting, so it's safe for sensitive skin and everyday wear.",
  },
]

export default function Page() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Her Kingdom - Curated Jewelry & Accessories",
            description: HOME_DESCRIPTION,
            url: siteUrl,
            mainEntity: {
              "@type": "LocalBusiness",
              name: "Her Kingdom",
              description: "Curated jewelry & accessories — necklaces, bracelets, earrings, watches & more in Nairobi, Kenya",
              image: `${siteUrl}/logo.png`,
              address: {
                "@type": "PostalAddress",
                addressLocality: "Nairobi",
                addressCountry: "KE",
              },
              telephone: "+254780406059",
              email: "herkingdomlive@gmail.com",
              url: siteUrl,
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage faqs={HOME_FAQS} />
    </>
  )
}

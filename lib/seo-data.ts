// Core SEO Identity & Keywords — Her Kingdom Jewelry (Nairobi, Kenya)
import { INTENT_SEO_KEYWORDS } from "./seo-keywords-intent"
import { INTENT_SEO_KEYWORDS_EXTRA } from "./seo-keywords-intent-extra"

const DEFAULT_SITE_URL = "https://herkingdom.shop"
const resolvedSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || DEFAULT_SITE_URL).replace(/\/+$/, "")

export const SITE_SEO = {
  siteName: "Her Kingdom",
  siteUrl: resolvedSiteUrl,
  siteTitle: "Her Kingdom | Curated Jewelry & Accessories for Women in Nairobi, Kenya",
  siteDescription:
    "Shop curated jewelry, necklaces, bracelets, earrings, watches & accessories at Her Kingdom Nairobi. Hypoallergenic, long-lasting pieces that complement your personal style. Order online or WhatsApp +254780406059.",
  phone: "+254780406059",
  phoneDisplay: "0780 406 059",
  email: "herkingdomlive@gmail.com",
  instagram: "@herkingdom_jewelry",
  tiktok: "@herkingdom_jewelry",
  twitter: "@herkingdom_jewelry",
  whatsapp: "254780406059",
  address: "Nairobi, Kenya",

  // 500+ SEO Keywords — comprehensive, brand-focused, product-specific for jewelry
  allKeywords: [
    // ========== BRAND KEYWORDS ==========
    "Her Kingdom",
    "Her Kingdom jewelry",
    "Her Kingdom Nairobi",
    "Her Kingdom Kenya",
    "Her Kingdom online store",
    "Her Kingdom accessories",
    "Her Kingdom necklaces",
    "Her Kingdom bracelets",
    "Her Kingdom earrings",
    "Her Kingdom watches",
    "Her Kingdom jewelry shop",
    "Her Kingdom handbags",
    "Her Kingdom gift packages",
    "Her Kingdom women jewelry",
    "Her Kingdom delivery",
    "Her Kingdom order",
    "Her Kingdom WhatsApp",
    "Her Kingdom prices",
    "Her Kingdom offers",
    "Her Kingdom new arrivals",
    "Her Kingdom sale",
    "Her Kingdom deals",
    "Her Kingdom best seller",
    "Her Kingdom reviews",
    "Her Kingdom affordable jewelry",
    "Her Kingdom quality",
    "Her Kingdom hypoallergenic",
    "Her Kingdom curated jewelry",
    "Her Kingdom contact",
    "Her Kingdom location",
    "Her Kingdom Instagram",
    "Her Kingdom TikTok",
    "herkingdom",
    "herkingdom.co.ke",
    "HerkingdomBabe",
    "Her Kingdom collection",
    "Her Kingdom catalogue",
    "Her Kingdom pieces",

    // ========== JEWELRY GENERAL ==========
    "jewelry shop Nairobi",
    "jewelry store Kenya",
    "jewelry online Kenya",
    "buy jewelry Nairobi",
    "best jewelry shop Nairobi",
    "best jewelry store Kenya",
    "affordable jewelry Kenya",
    "quality jewelry Nairobi",
    "jewelry shopping online Kenya",
    "jewelry boutique Nairobi",
    "women jewelry Kenya",
    "fashion jewelry Nairobi",
    "costume jewelry Kenya",
    "statement jewelry Nairobi",
    "everyday jewelry Kenya",
    "minimalist jewelry Nairobi",
    "trendy jewelry Kenya",
    "elegant jewelry Nairobi",
    "luxury jewelry Kenya",
    "designer jewelry Nairobi",
    "handpicked jewelry Kenya",
    "curated jewelry Nairobi",
    "hypoallergenic jewelry Kenya",
    "nickel free jewelry Nairobi",
    "long lasting jewelry Kenya",
    "durable jewelry Nairobi",

    // ========== NECKLACES ==========
    "necklaces Nairobi",
    "necklaces Kenya",
    "buy necklaces online Kenya",
    "chain necklaces Nairobi",
    "pendant necklaces Kenya",
    "layered necklaces Nairobi",
    "choker necklaces Kenya",
    "statement necklaces Nairobi",
    "gold necklaces Kenya",
    "silver necklaces Nairobi",
    "pearl necklaces Kenya",
    "beaded necklaces Nairobi",
    "necklace sets Nairobi",
    "necklace sets Kenya",
    "matching necklace set",
    "necklace and earring set",
    "men necklaces Nairobi",
    "men necklaces Kenya",
    "men chain necklace",

    // ========== BRACELETS ==========
    "bracelets Nairobi",
    "bracelets Kenya",
    "buy bracelets online Kenya",
    "charm bracelets Nairobi",
    "bangle bracelets Kenya",
    "beaded bracelets Nairobi",
    "cuff bracelets Kenya",
    "tennis bracelets Nairobi",
    "friendship bracelets Kenya",
    "gold bracelets Nairobi",
    "silver bracelets Kenya",
    "stackable bracelets Nairobi",

    // ========== EARRINGS ==========
    "earrings Nairobi",
    "earrings Kenya",
    "buy earrings online Kenya",
    "stud earrings Nairobi",
    "hoop earrings Kenya",
    "drop earrings Nairobi",
    "dangle earrings Kenya",
    "statement earrings Nairobi",
    "gold earrings Kenya",
    "silver earrings Nairobi",
    "pearl earrings Kenya",
    "clip on earrings Nairobi",
    "huggie earrings Kenya",

    // ========== WATCHES ==========
    "watches Nairobi",
    "watches Kenya",
    "buy watches online Kenya",
    "women watches Nairobi",
    "women watches Kenya",
    "men watches Nairobi",
    "men watches Kenya",
    "fashion watches Nairobi",
    "dress watches Kenya",
    "casual watches Nairobi",
    "luxury watches Kenya",
    "affordable watches Nairobi",

    // ========== HANDBAGS & ACCESSORIES ==========
    "handbags Nairobi",
    "handbags Kenya",
    "purses Nairobi",
    "purses Kenya",
    "sunglasses Nairobi",
    "sunglasses Kenya",
    "women sunglasses Nairobi",
    "men sunglasses Kenya",
    "sunglasses cases Kenya",
    "scarves Nairobi",
    "shawls Kenya",
    "ponchos Nairobi",
    "perfume Nairobi",
    "scents Kenya",
    "women accessories Nairobi",
    "fashion accessories Kenya",
    "accessories shop Nairobi",
    "accessories store Kenya",

    // ========== GIFTING ==========
    "gift packages Nairobi",
    "gift packages Kenya",
    "jewelry gifts Nairobi",
    "jewelry gifts Kenya",
    "gift for her Nairobi",
    "gift for girlfriend Kenya",
    "valentine gift Nairobi",
    "birthday gift jewelry Kenya",
    "anniversary gift Nairobi",
    "bridal jewelry Nairobi",
    "bridesmaid gifts Kenya",
    "mothers day gift jewelry",
    "christmas gift jewelry Kenya",
    "flowers Nairobi",
    "flowers and jewelry gift Kenya",

    // ========== OCCASIONS ==========
    "wedding jewelry Nairobi",
    "bridal accessories Kenya",
    "party jewelry Nairobi",
    "office jewelry Kenya",
    "casual jewelry Nairobi",
    "date night jewelry Kenya",
    "prom jewelry Nairobi",
    "graduation jewelry Kenya",

    // ========== LOCATION-BASED ==========
    "jewelry Westlands",
    "jewelry CBD Nairobi",
    "jewelry Kilimani",
    "jewelry Karen",
    "jewelry Kileleshwa",
    "jewelry Lavington",
    "jewelry South B",
    "jewelry South C",
    "jewelry Eastlands",
    "jewelry Mombasa",
    "jewelry Kisumu",
    "jewelry Nakuru",
    "jewelry Eldoret",
    "jewelry Thika",
    "jewelry delivery Nairobi",
    "jewelry delivery Kenya",
    "same day jewelry delivery Nairobi",

    // ========== PAYMENT & DELIVERY ==========
    "M-Pesa jewelry Kenya",
    "cash on delivery jewelry Nairobi",
    "buy jewelry M-Pesa",
    "order jewelry online Kenya",
    "free delivery jewelry Nairobi",
    "affordable delivery Kenya",

    // ========== TRENDING / LIFESTYLE ==========
    "trending jewelry Kenya",
    "trending accessories Nairobi",
    "celebrity jewelry Kenya",
    "influencer jewelry Nairobi",
    "Kenyan jewelry brand",
    "African jewelry Nairobi",
    "African inspired jewelry Kenya",
    "boho jewelry Nairobi",
    "vintage jewelry Kenya",
    "modern jewelry Nairobi",
    "chic accessories Kenya",
    "Instagram jewelry shop Kenya",
    "TikTok jewelry Kenya",
    "jewelry haul Kenya",
    "jewelry try on Nairobi",
    "jewelry unboxing Kenya",
    "accessories haul Kenya",

    // ========== INTENT-BASED SEARCH PHRASES ==========
    // "where to buy", "where to get", "best outfit for", "best jewelry set for",
    // "how much", "near me", gift intent, seasonal intent, and more.
    ...INTENT_SEO_KEYWORDS,
    // Extra 1000+ intent keywords — voice search, AI overview, brand + website
    // variants, neighborhood-level local SEO, occasion and style deep dives.
    ...INTENT_SEO_KEYWORDS_EXTRA,
  ],
}

// Page-specific SEO metadata
export const PAGE_SEO = {
  home: {
    title: "Her Kingdom | Curated Jewelry & Accessories in Nairobi, Kenya",
    description:
      "Shop curated jewelry, necklaces, bracelets, earrings, watches & accessories at Her Kingdom Nairobi. Hypoallergenic, long-lasting pieces. Free delivery on orders over KSh 5,000. WhatsApp +254780406059.",
  },
  shop: {
    title: "Shop All Jewelry & Accessories | Her Kingdom Nairobi",
    description:
      "Browse our full collection of curated necklaces, bracelets, earrings, watches, handbags & accessories. Affordable, hypoallergenic jewelry delivered across Kenya.",
  },
  womenCollection: {
    title: "Women's Jewelry & Accessories | Her Kingdom Nairobi",
    description:
      "Discover curated women's necklaces, bracelets, earrings, watches, handbags & accessories at Her Kingdom. Elegant, hypoallergenic pieces for every occasion. Delivery across Kenya.",
  },
  menCollection: {
    title: "Men's Jewelry & Accessories | Her Kingdom Nairobi",
    description:
      "Shop men's necklaces, watches, sunglasses & accessories at Her Kingdom Nairobi. Quality, stylish pieces for the modern man. Delivery across Kenya.",
  },
  babyShop: {
    title: "Gift Packages & Flowers | Her Kingdom Nairobi",
    description:
      "Explore curated gift packages, flowers & accessories at Her Kingdom. Perfect gifts for birthdays, anniversaries, Valentine's Day & special occasions. Delivery across Kenya.",
  },
  newArrivals: {
    title: "New Arrivals - Latest Jewelry & Accessories | Her Kingdom",
    description:
      "Discover the latest jewelry arrivals at Her Kingdom Nairobi. New necklaces, bracelets, earrings, watches & accessories added weekly. Shop the newest pieces first.",
  },
  offers: {
    title: "Jewelry Offers & Deals | Her Kingdom Nairobi",
    description:
      "Don't miss the best jewelry deals at Her Kingdom. Shop discounted necklaces, bracelets, earrings & accessories. Affordable luxury delivered across Kenya.",
  },
  trackOrder: {
    title: "Track Your Order | Her Kingdom",
    description: "Track your Her Kingdom jewelry order in real-time. Enter your order number to see delivery status and estimated arrival.",
  },
  delivery: {
    title: "Delivery Locations & Fees | Her Kingdom",
    description: "Her Kingdom delivers jewelry & accessories across Kenya. Check delivery fees for Nairobi, Mombasa, Kisumu, Nakuru & more locations.",
  },
  wishlist: {
    title: "My Wishlist | Her Kingdom",
    description: "View your saved jewelry pieces and accessories from Her Kingdom. Add items to your wishlist and shop them later.",
  },
  privacyPolicy: {
    title: "Privacy Policy | Her Kingdom",
    description: "Read Her Kingdom's privacy policy. Learn how we protect your personal data and information when shopping with us.",
  },
  termsOfService: {
    title: "Terms of Service | Her Kingdom",
    description: "Read Her Kingdom's terms and conditions for online jewelry purchases, delivery, returns and refund policies.",
  },
  refundPolicy: {
    title: "Refund Policy | Her Kingdom",
    description: "Learn about Her Kingdom's refund and exchange policy for jewelry and accessories. Customer satisfaction guaranteed.",
  },
  paymentsPolicy: {
    title: "Payments Policy | Her Kingdom — M-PESA, Card & Cash on Delivery",
    description:
      "How payments work at Her Kingdom — M-PESA STK push via PayHero, card payments, processing times, gift packaging, free delivery above KSh 7,000, receipts, and WhatsApp support.",
  },
  checkout: {
    title: "Checkout | Her Kingdom",
    description: "Complete your Her Kingdom jewelry order. Secure checkout with M-Pesa and cash on delivery options.",
  },
}

// Curated intent keyword slices per landing page — keeps page-level
// metadata focused on high-intent phrases that apply to that page
// (additive on top of the page's existing keyword set).
const INTENT_HOME = [
  "where to buy jewelry in Nairobi",
  "where to buy jewelry in Kenya",
  "where to get jewelry in Nairobi",
  "best jewelry shop in Nairobi",
  "best jewelry store in Kenya",
  "best online jewelry shop in Kenya",
  "best affordable jewelry shop in Nairobi",
  "best hypoallergenic jewelry shop Kenya",
  "jewelry shop near me Nairobi",
  "top 10 jewelry shops in Nairobi",
  "most trusted jewelry shop in Nairobi",
  "is Her Kingdom legit",
  "Her Kingdom reviews Kenya",
  "best jewelry set for wedding in Kenya",
  "best gift for her under 5000 Kenya",
  "same day jewelry delivery Nairobi",
]

const INTENT_SHOP = [
  "where to buy jewelry online in Kenya",
  "where to buy jewelry with M-Pesa Kenya",
  "where to buy jewelry with cash on delivery Nairobi",
  "how to buy jewelry online in Kenya",
  "how to order jewelry in Nairobi",
  "best online jewelry store Nairobi",
  "best affordable jewelry shop in Nairobi",
  "how much is jewelry in Nairobi",
  "jewelry price list Nairobi",
  "affordable jewelry price in Kenya",
  "best jewelry set for wedding in Kenya",
  "best matching jewelry set in Nairobi",
]

const INTENT_WOMEN = [
  "where to buy necklaces in Nairobi",
  "where to buy earrings in Nairobi",
  "where to buy bracelets in Nairobi",
  "where to buy hypoallergenic earrings in Kenya",
  "where to buy pearl necklaces Kenya",
  "where to buy matching jewelry set Nairobi",
  "best jewelry set for bride Nairobi",
  "best jewelry set for wedding in Kenya",
  "best jewelry set for office wear Kenya",
  "best jewelry set for date night Nairobi",
  "best jewelry for sensitive skin Kenya",
  "best jewelry for sensitive ears Nairobi",
  "best outfit for gold necklace",
  "best outfit for pearl necklace Kenya",
  "best outfit for statement earrings",
  "what jewelry to wear with kitenge",
  "what jewelry to wear to a wedding in Kenya",
  "aesthetic jewelry Nairobi",
  "dainty necklaces Kenya",
  "18k gold plated jewelry Kenya",
]

const INTENT_MEN = [
  "where to buy men necklaces Nairobi",
  "where to buy men watches Nairobi",
  "where to buy men watches in Kenya",
  "where to buy chain necklaces Kenya",
  "best men watches Kenya",
  "best men chain necklace Nairobi",
  "best gift for boyfriend Nairobi",
  "best gift for husband Kenya",
  "where to buy rings Nairobi",
  "where to buy engagement rings Nairobi",
  "where to buy wedding rings Kenya",
  "best outfit for gold watch Kenya",
  "best outfit for silver watch",
]

const INTENT_GIFT = [
  "where to buy gift package for her Nairobi",
  "where to buy gift package for girlfriend Nairobi",
  "where to buy gift hamper Kenya",
  "where to buy flowers and jewelry gift Nairobi",
  "where to buy birthday gift for her Nairobi",
  "where to buy valentines gift for her Kenya",
  "where to buy anniversary gift Nairobi",
  "best birthday gift for her in Nairobi",
  "best birthday gift for girlfriend Kenya",
  "best valentines gift for her Nairobi",
  "best anniversary gift for her Nairobi",
  "best mothers day gift in Nairobi",
  "best christmas gift for her Nairobi",
  "best graduation gift for her Nairobi",
  "best gift for her under 2000 Kenya",
  "best gift for her under 3000 Nairobi",
  "best gift for her under 5000 Kenya",
  "best gift for her under 10000 Nairobi",
  "romantic gift ideas for her Nairobi",
  "thoughtful gift ideas for her Nairobi",
  "last minute valentines gift Kenya",
  "Valentine's Day jewelry Nairobi 2026",
  "Mother's Day jewelry Kenya 2026",
  "Christmas jewelry gift Nairobi",
]

const INTENT_NEW = [
  "Her Kingdom new arrivals this week",
  "new jewelry in Nairobi",
  "latest necklaces Kenya",
  "trending jewelry in Kenya",
  "aesthetic jewelry Nairobi",
  "y2k jewelry Nairobi",
  "best jewelry for everyday wear Nairobi",
]

const INTENT_OFFERS = [
  "Black Friday jewelry deals Kenya",
  "Her Kingdom sale prices",
  "jewelry clearance Kenya",
  "best affordable jewelry shop in Nairobi",
  "cheap jewelry price Nairobi",
  "best gift for her under 2000 Kenya",
  "best gift for her under 3000 Nairobi",
]

const INTENT_TRACK = [
  "how to track jewelry order Her Kingdom",
  "Her Kingdom delivery Nairobi",
  "same day jewelry delivery Nairobi",
]

const INTENT_DELIVERY = [
  "same day jewelry delivery Nairobi",
  "next day jewelry delivery Nairobi",
  "free jewelry delivery in Kenya",
  "jewelry delivery to Westlands",
  "jewelry delivery to Kilimani",
  "jewelry delivery to Karen",
  "jewelry delivery to Lavington",
  "jewelry delivery to Kileleshwa",
  "jewelry delivery to Ruaka",
  "jewelry delivery to Ruiru",
  "jewelry delivery to Thika",
  "jewelry delivery to Mombasa",
  "jewelry delivery to Kisumu",
  "jewelry delivery to Nakuru",
  "jewelry delivery to Eldoret",
  "how much is delivery for jewelry in Nairobi",
]

const INTENT_WISHLIST = [
  "save jewelry Her Kingdom",
  "Her Kingdom wishlist Nairobi",
]

const INTENT_PAYMENTS = [
  "can I pay for jewelry with M-Pesa in Kenya",
  "can I get cash on delivery jewelry Nairobi",
  "how to pay for jewelry online Kenya",
  "where to buy jewelry with M-Pesa Kenya",
  "where to buy jewelry with cash on delivery Nairobi",
  "Her Kingdom M-Pesa payment",
  "Her Kingdom cash on delivery",
]

// Curated slices from the Extra intent bank — brand + website reinforcers
// for each landing page. These ensure every page's <meta keywords> surfaces
// both "Her Kingdom" and "herkingdom.shop" alongside its intent phrases.
const INTENT_EXTRA_HOME = [
  "herkingdom.shop",
  "Her Kingdom official website",
  "Her Kingdom Nairobi herkingdom.shop",
  "is herkingdom.shop legit",
  "is Her Kingdom legit Kenya",
  "Her Kingdom reviews Nairobi",
  "best online jewelry shop Nairobi herkingdom.shop",
  "most trusted jewelry shop in Nairobi",
  "jewelry shop near me Nairobi Her Kingdom",
  "Her Kingdom best sellers 2026",
]

const INTENT_EXTRA_SHOP = [
  "shop Her Kingdom on herkingdom.shop",
  "buy Her Kingdom on herkingdom.shop",
  "how to order from Her Kingdom",
  "herkingdom.shop order jewelry with M-Pesa",
  "herkingdom.shop cash on delivery jewelry Nairobi",
  "Her Kingdom price list Kenya",
  "Her Kingdom catalogue online",
]

const INTENT_EXTRA_WOMEN = [
  "Her Kingdom women collection herkingdom.shop",
  "Her Kingdom bridal jewelry herkingdom.shop",
  "Her Kingdom bridesmaid jewelry Kenya",
  "Her Kingdom pearl jewelry Kenya",
  "Her Kingdom hoop earrings Kenya",
  "Her Kingdom layered necklace Kenya",
  "Her Kingdom dainty jewelry Kenya",
  "Her Kingdom 18k gold plated Kenya",
  "Her Kingdom hypoallergenic studs Kenya",
  "Her Kingdom jewelry for kitenge Kenya",
  "Her Kingdom jewelry for ankara Kenya",
]

const INTENT_EXTRA_MEN = [
  "Her Kingdom men collection herkingdom.shop",
  "Her Kingdom men watches herkingdom.shop",
  "Her Kingdom men chain necklace Kenya",
  "Her Kingdom cuban chain Kenya",
  "Her Kingdom signet ring Kenya",
  "Her Kingdom couple watch Kenya",
  "gift for my boyfriend Nairobi Her Kingdom",
  "gift for my husband Nairobi Her Kingdom",
]

const INTENT_EXTRA_GIFT = [
  "Her Kingdom gift packages herkingdom.shop",
  "Her Kingdom gift hamper Kenya",
  "Her Kingdom valentines hamper Kenya",
  "Her Kingdom mothers day hamper Kenya",
  "Her Kingdom bridal hamper Kenya",
  "last minute gift Nairobi Her Kingdom",
  "same day gift Nairobi Her Kingdom",
  "send gift to office Nairobi Her Kingdom",
  "Her Kingdom gift for girlfriend Nairobi",
  "Her Kingdom gift for wife Kenya",
  "Her Kingdom gift for mom Kenya",
  "Her Kingdom gift for sister Nairobi",
  "Her Kingdom gift for best friend Nairobi",
  "Her Kingdom graduation gift Kenya",
  "Her Kingdom anniversary gift Kenya",
]

const INTENT_EXTRA_NEW = [
  "Her Kingdom new arrivals herkingdom.shop",
  "Her Kingdom weekly drop Kenya",
  "Her Kingdom restock Kenya",
  "Her Kingdom seasonal drop Kenya",
  "Her Kingdom capsule collection",
  "Her Kingdom trending pieces 2026",
]

const INTENT_EXTRA_OFFERS = [
  "Her Kingdom sale herkingdom.shop",
  "Her Kingdom Black Friday 2026 Kenya",
  "Her Kingdom Cyber Monday 2026 Kenya",
  "Her Kingdom clearance Kenya",
  "Her Kingdom promo code Kenya",
  "Her Kingdom discount code Kenya",
  "Her Kingdom first order discount Kenya",
]

const INTENT_EXTRA_TRACK = [
  "how to track my Her Kingdom order",
  "Her Kingdom delivery status Kenya",
  "Her Kingdom tracking herkingdom.shop",
]

const INTENT_EXTRA_DELIVERY = [
  "Her Kingdom same day delivery Nairobi",
  "Her Kingdom next day delivery Kenya",
  "Her Kingdom free delivery over KSh 7000",
  "Her Kingdom delivery Westlands",
  "Her Kingdom delivery Kilimani",
  "Her Kingdom delivery Karen",
  "Her Kingdom delivery Lavington",
  "Her Kingdom delivery Ruaka",
  "Her Kingdom delivery Thika",
  "Her Kingdom delivery Mombasa",
  "Her Kingdom delivery Kisumu",
  "Her Kingdom delivery Nakuru",
  "Her Kingdom delivery Eldoret",
  "Her Kingdom diaspora orders",
]

const INTENT_EXTRA_WISHLIST = [
  "Her Kingdom wishlist herkingdom.shop",
  "save jewelry on herkingdom.shop",
]

const INTENT_EXTRA_PAYMENTS = [
  "Her Kingdom PayHero M-PESA Kenya",
  "Her Kingdom STK push Kenya",
  "Her Kingdom card payment Kenya",
  "Her Kingdom Visa payment Kenya",
  "Her Kingdom Mastercard payment Kenya",
  "herkingdom.shop order jewelry with M-Pesa",
  "herkingdom.shop cash on delivery jewelry Nairobi",
]

// Page-specific keyword groups
export const PAGE_KEYWORDS = {
  home: [
    "Her Kingdom", "jewelry Nairobi", "jewelry Kenya", "necklaces", "bracelets", "earrings",
    "watches", "handbags", "accessories", "curated jewelry", "hypoallergenic jewelry",
    "affordable jewelry Kenya", "jewelry online Kenya", "women jewelry Nairobi",
    "gift packages Kenya", "jewelry delivery Nairobi", "HerkingdomBabe",
    ...INTENT_HOME,
    ...INTENT_EXTRA_HOME,
  ],
  shop: [
    "shop jewelry Kenya", "buy jewelry online", "necklaces", "bracelets", "earrings",
    "watches", "handbags", "accessories Nairobi", "affordable jewelry",
    "jewelry store Kenya", "fashion accessories", "statement jewelry",
    ...INTENT_SHOP,
    ...INTENT_EXTRA_SHOP,
  ],
  womenCollection: [
    "women jewelry Kenya", "women necklaces", "women bracelets", "women earrings",
    "women watches", "women accessories", "women handbags", "women sunglasses",
    "scarves", "shawls", "curated jewelry women", "hypoallergenic earrings",
    "Her Kingdom women", "ladies jewelry Nairobi",
    ...INTENT_WOMEN,
    ...INTENT_EXTRA_WOMEN,
  ],
  menCollection: [
    "men jewelry Kenya", "men necklaces", "men watches", "men sunglasses",
    "men accessories", "men chains", "men bracelets", "Her Kingdom men",
    "men fashion accessories Nairobi",
    ...INTENT_MEN,
    ...INTENT_EXTRA_MEN,
  ],
  babyShop: [
    "gift packages Kenya", "flowers Nairobi", "jewelry gifts", "gift for her",
    "birthday gift jewelry", "valentine gift", "anniversary gift",
    "bridesmaid gifts Kenya", "Her Kingdom gifts",
    ...INTENT_GIFT,
    ...INTENT_EXTRA_GIFT,
  ],
  newArrivals: [
    "new jewelry Kenya", "latest necklaces", "new earrings", "new bracelets",
    "new arrivals jewelry", "trending jewelry Kenya", "Her Kingdom new",
    ...INTENT_NEW,
    ...INTENT_EXTRA_NEW,
  ],
  offers: [
    "jewelry deals Kenya", "jewelry offers Nairobi", "discounted jewelry",
    "affordable jewelry sale", "Her Kingdom offers", "jewelry clearance Kenya",
    ...INTENT_OFFERS,
    ...INTENT_EXTRA_OFFERS,
  ],
  trackOrder: [
    "track order Her Kingdom", "order tracking Kenya", "jewelry delivery status",
    ...INTENT_TRACK,
    ...INTENT_EXTRA_TRACK,
  ],
  delivery: [
    "jewelry delivery Nairobi", "delivery locations Kenya", "delivery fees jewelry",
    "same day delivery Nairobi", "Her Kingdom delivery",
    ...INTENT_DELIVERY,
    ...INTENT_EXTRA_DELIVERY,
  ],
  wishlist: [
    "jewelry wishlist", "saved jewelry", "Her Kingdom wishlist",
    ...INTENT_WISHLIST,
    ...INTENT_EXTRA_WISHLIST,
  ],
  paymentsPolicy: [
    "payments policy", "Her Kingdom payments", "M-PESA STK push", "PayHero M-PESA Kenya",
    "Kenya jewelry payments", "pay jewelry online Kenya", "card payment jewelry Kenya",
    "cash on delivery jewelry Nairobi", "delivery policy Kenya", "free delivery above KSh 7000",
    "Her Kingdom payment methods", "jewelry receipt Her Kingdom",
    ...INTENT_PAYMENTS,
    ...INTENT_EXTRA_PAYMENTS,
  ],
}

// Generate product-specific keywords
export function generateProductKeywords(name: string, category: string, tags: string[]): string[] {
  const base = [
    name,
    `${name} Her Kingdom`,
    `${name} Nairobi`,
    `${name} Kenya`,
    `buy ${name} online`,
    `${category} Nairobi`,
    `${category} Kenya`,
    `${category} Her Kingdom`,
    "jewelry Nairobi",
    "jewelry Kenya",
    "Her Kingdom",
    "HerkingdomBabe",
    ...tags,
  ]
  return [...new Set(base.filter(Boolean))]
}

// Generate category-specific keywords for category-filtered shop views
export function generateCategoryKeywords(name: string): string[] {
  const lower = name.toLowerCase()
  const base = [
    lower,
    `${lower} Kenya`,
    `${lower} Nairobi`,
    `buy ${lower} online`,
    `${lower} Her Kingdom`,
    `affordable ${lower} Kenya`,
    `${lower} delivery Nairobi`,
    `shop ${lower}`,
    "jewelry Nairobi",
    "jewelry Kenya",
    "Her Kingdom",
    "HerkingdomBabe",
  ]
  return [...new Set(base.filter(Boolean))]
}

// Build a category-specific page title/description pair
export function buildCategorySeo(name: string, description: string, productCount: number) {
  const title = `${name} | Shop ${name} Jewelry & Accessories at Her Kingdom Nairobi`
  const fallbackDescription = `Shop ${name.toLowerCase()} at Her Kingdom Nairobi. ${
    productCount > 0 ? `Browse ${productCount} curated ${name.toLowerCase()} pieces. ` : ""
  }Hypoallergenic, long-lasting jewelry & accessories delivered across Kenya. WhatsApp +254780406059.`
  return {
    title,
    description: (description && description.trim().length > 0 ? description : fallbackDescription).slice(0, 300),
  }
}

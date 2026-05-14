// In-memory pharmacy catalog used by the public storefront API routes.
// Supabase has been removed — the storefront persists nothing server-side
// today; everything admin-managed lives in cmsStore on the client. This
// fixture file backs the legacy public `/api/products`, `/api/categories`,
// `/api/site-data` etc. routes so the storefront keeps rendering. Will be
// replaced by the NestJS port.

type Product = {
  id: string
  name: string
  slug: string
  price: number
  originalPrice?: number
  images: string[]
  category: string
  categorySlug: string
  description: string
  tags: string[]
  collection: string
  isNew: boolean
  isOnOffer: boolean
  offerPercentage?: number
  inStock: boolean
  createdAt: string
}

const CATEGORIES = [
  { slug: "medications", name: "Medications" },
  { slug: "vitamins", name: "Vitamins & Supplements" },
  { slug: "medical-devices", name: "Medical Devices" },
  { slug: "baby-care", name: "Baby & Mother" },
  { slug: "personal-care", name: "Personal Care" },
  { slug: "first-aid", name: "First Aid" },
] as const

const CATEGORY_IMAGES: Record<string, string> = {
  medications: "/images/categories/medications.png",
  vitamins: "/images/categories/vitamins-supplements.png",
  "medical-devices": "/images/categories/medical-devices.png",
  "baby-care": "/images/categories/baby-mother.png",
  "personal-care": "/images/categories/personal-care.png",
  "first-aid": "/images/categories/first-aid.png",
}

type Seed = {
  name: string
  price: number
  originalPrice?: number
  image: string
  categorySlug: typeof CATEGORIES[number]["slug"]
  description: string
  tags: string[]
  isNew?: boolean
  isOnOffer?: boolean
  offerPercentage?: number
}

// NOTE: Prices intentionally kept in the KSh 250–350 band for live PayHero
// testing. Each on-offer item has an originalPrice ~30% higher to preserve
// the discount UI without pushing the cart total up.
const SEEDS: Seed[] = [
  // Medications
  { name: "Paracetamol 500mg Tablets (24 pack)", price: 260, originalPrice: 340, image: "/images/products/medications/paracetamol-box.png", categorySlug: "medications", description: "Fast-acting paracetamol tablets for relief from headaches, fever and mild pain.", tags: ["pain relief", "fever"], isOnOffer: true, offerPercentage: 24 },
  { name: "Ibuprofen 200mg Tablets (20 pack)", price: 280, image: "/images/products/medications/blister-pack-tablets.png", categorySlug: "medications", description: "Anti-inflammatory tablets for muscle pain, period pain and inflammation.", tags: ["anti-inflammatory"], isNew: true },
  { name: "Cough Syrup 100ml", price: 320, image: "/images/products/medications/cough-syrup.png", categorySlug: "medications", description: "Soothing cough syrup for dry and chesty coughs. Suitable for adults and older children.", tags: ["cough", "cold"] },
  { name: "Antibiotic Capsules (10 pack)", price: 290, originalPrice: 370, image: "/images/products/medications/antibiotic-capsules.png", categorySlug: "medications", description: "Broad-spectrum antibiotic capsules. Prescription required at checkout.", tags: ["prescription"], isOnOffer: true, offerPercentage: 22 },
  { name: "Pain Relief Gel 50g", price: 310, image: "/images/products/medications/pain-relief-gel.png", categorySlug: "medications", description: "Topical gel for muscle aches, joint pain and sports injuries.", tags: ["topical", "pain relief"], isNew: true },
  { name: "Allergy Relief Tablets (14 pack)", price: 270, originalPrice: 340, image: "/images/products/medications/pill-bottle-white.png", categorySlug: "medications", description: "Non-drowsy 24-hour antihistamine tablets for hayfever and allergic reactions.", tags: ["allergy"], isOnOffer: true, offerPercentage: 20 },

  // Vitamins
  { name: "Vitamin C 1000mg (60 tablets)", price: 320, image: "/images/products/vitamins/vitamin-c-bottle.png", categorySlug: "vitamins", description: "High-strength vitamin C to support your immune system.", tags: ["immunity"], isNew: true },
  { name: "Daily Multivitamin (90 tablets)", price: 300, originalPrice: 390, image: "/images/products/vitamins/multivitamin-bottle.png", categorySlug: "vitamins", description: "Complete daily multivitamin with 23 essential vitamins and minerals.", tags: ["wellness"], isOnOffer: true, offerPercentage: 23 },
  { name: "Omega-3 Fish Oil Softgels (60)", price: 340, image: "/images/products/vitamins/omega-3.png", categorySlug: "vitamins", description: "Premium omega-3 softgels to support heart, brain and joint health.", tags: ["heart health"] },
  { name: "Zinc Immunity Booster (30 caps)", price: 280, originalPrice: 360, image: "/images/products/vitamins/zinc-supplement.png", categorySlug: "vitamins", description: "Zinc supplement to support immunity and skin health.", tags: ["immunity"], isOnOffer: true, offerPercentage: 22 },

  // Medical Devices
  { name: "Digital Thermometer", price: 330, image: "/images/products/medical-devices/digital-thermometer.png", categorySlug: "medical-devices", description: "Fast and accurate digital thermometer with fever alarm. Reads in 10 seconds.", tags: ["thermometer"], isNew: true },
  { name: "Arm Blood Pressure Monitor", price: 290, originalPrice: 380, image: "/images/products/medical-devices/bp-monitor.png", categorySlug: "medical-devices", description: "Clinically validated upper-arm blood pressure monitor with memory for two users.", tags: ["bp monitor"], isOnOffer: true, offerPercentage: 24 },
  { name: "Fingertip Pulse Oximeter", price: 310, image: "/images/products/medical-devices/pulse-oximeter.png", categorySlug: "medical-devices", description: "Compact fingertip pulse oximeter for SpO2 and pulse rate monitoring.", tags: ["spo2"], isNew: true },
  { name: "Blood Glucose Meter Kit", price: 320, originalPrice: 410, image: "/images/products/medical-devices/glucose-meter.png", categorySlug: "medical-devices", description: "Complete glucose monitoring kit including 25 strips and lancets.", tags: ["diabetes"], isOnOffer: true, offerPercentage: 22 },

  // Baby Care
  { name: "Infant Formula Stage 1 (400g)", price: 340, image: "/images/products/baby-care/baby-formula.png", categorySlug: "baby-care", description: "Stage 1 infant formula milk with DHA, suitable from birth.", tags: ["infant"], isNew: true },
  { name: "Pediatric Forehead Thermometer", price: 300, originalPrice: 380, image: "/images/products/baby-care/baby-thermometer.png", categorySlug: "baby-care", description: "Non-contact infrared thermometer designed for babies and young children.", tags: ["thermometer", "baby"], isOnOffer: true, offerPercentage: 21 },
  { name: "Gentle Baby Lotion 250ml", price: 290, image: "/images/products/baby-care/baby-lotion.png", categorySlug: "baby-care", description: "Hypoallergenic moisturising lotion for delicate baby skin.", tags: ["baby skin"] },

  // Personal Care
  { name: "Hand Sanitizer 500ml", price: 250, originalPrice: 320, image: "/images/products/personal-care/hand-sanitizer.png", categorySlug: "personal-care", description: "70% alcohol hand sanitizer with aloe vera. Kills 99.9% of germs.", tags: ["sanitizer"], isOnOffer: true, offerPercentage: 21 },
  { name: "Antiseptic Mouthwash 500ml", price: 320, image: "/images/products/personal-care/mouthwash.png", categorySlug: "personal-care", description: "Daily antiseptic mouthwash for fresh breath and healthy gums.", tags: ["oral care"] },
  { name: "Sensitive Toothpaste 100ml", price: 270, image: "/images/products/personal-care/toothpaste.png", categorySlug: "personal-care", description: "Toothpaste for sensitive teeth with daily enamel protection.", tags: ["oral care"], isNew: true },
  { name: "Surgical Face Masks (50 pack)", price: 260, originalPrice: 340, image: "/images/products/personal-care/face-masks.png", categorySlug: "personal-care", description: "3-ply disposable surgical face masks. Box of 50.", tags: ["protection"], isOnOffer: true, offerPercentage: 23 },

  // First Aid
  { name: "Sterile Bandage Roll Pack", price: 280, image: "/images/products/first-aid/bandages-roll.png", categorySlug: "first-aid", description: "Assorted sterile bandages and adhesive plasters for everyday cuts and grazes.", tags: ["wound care"] },
  { name: "Antiseptic Solution 250ml", price: 250, originalPrice: 330, image: "/images/products/first-aid/antiseptic-solution.png", categorySlug: "first-aid", description: "Antiseptic solution for cleansing wounds, cuts and grazes.", tags: ["wound care"], isOnOffer: true, offerPercentage: 24 },
  { name: "Compact First Aid Kit", price: 350, image: "/images/products/first-aid/first-aid-kit.png", categorySlug: "first-aid", description: "42-piece compact first aid kit for home, car or travel use.", tags: ["kit", "travel"], isNew: true },
]

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

const PRODUCTS: Product[] = SEEDS.map((s, i) => {
  const cat = CATEGORIES.find((c) => c.slug === s.categorySlug)!
  const base: Product = {
    id: `prod-${i + 1}`,
    name: s.name,
    slug: slugify(s.name),
    price: s.price,
    images: [s.image],
    category: cat.name,
    categorySlug: cat.slug,
    description: s.description,
    tags: s.tags,
    collection: "pharmacy",
    isNew: !!s.isNew,
    isOnOffer: !!s.isOnOffer,
    inStock: true,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }
  if (s.originalPrice !== undefined) base.originalPrice = s.originalPrice
  if (s.offerPercentage !== undefined) base.offerPercentage = s.offerPercentage
  return base
})

const HERO_BANNERS = [
  {
    id: "hero-pharmacy",
    title: "Your Trusted Online Pharmacy",
    subtitle: "Authentic medications, vitamins and medical devices — sourced from licensed suppliers, delivered quickly across Kenya.",
    collection: "medications",
    bannerImage: "/banners/hero-pharmacy-main.png",
    linkUrl: "/shop?category=medications",
    buttonText: "Shop Medications",
    sortOrder: 0,
  },
  {
    id: "hero-medical-devices",
    title: "Smart Medical Devices",
    subtitle: "Thermometers, BP monitors, oximeters and more — keep track of your health at home.",
    collection: "medical-devices",
    bannerImage: "/banners/hero-medical-devices.png",
    linkUrl: "/shop?category=medical-devices",
    buttonText: "Browse Devices",
    sortOrder: 1,
  },
  {
    id: "hero-vitamins",
    title: "Vitamins & Wellness",
    subtitle: "Daily multivitamins, immunity boosters and supplements to support your everyday wellbeing.",
    collection: "vitamins",
    bannerImage: "/banners/hero-vitamins-supplements.png",
    linkUrl: "/shop?category=vitamins",
    buttonText: "Shop Wellness",
    sortOrder: 2,
  },
]

const MID_PAGE_BANNERS = [
  {
    id: "mid-flash",
    title: "Flash Sale — Up To 30% Off",
    subtitle: "Stock up on everyday essentials before they're gone.",
    image: "/banners/promo-flash-sale.png",
    link: "/shop?filter=offers",
    position: "mid-page",
    sortOrder: 0,
  },
  {
    id: "mid-delivery",
    title: "Free Delivery Across Nairobi",
    subtitle: "On every order above KSH 5,000. Same-day delivery available.",
    image: "/banners/promo-free-delivery.png",
    link: "/shop",
    position: "mid-page",
    sortOrder: 1,
  },
  {
    id: "mid-new",
    title: "New Arrivals This Week",
    subtitle: "Fresh stock of vitamins, devices and baby care just landed.",
    image: "/banners/promo-new-arrivals.png",
    link: "/shop?filter=new",
    position: "mid-page",
    sortOrder: 2,
  },
  {
    id: "mid-refill",
    title: "Easy Prescription Refills",
    subtitle: "Upload your script and we'll have it ready for collection or delivery.",
    image: "/banners/promo-prescription-refill.png",
    link: "/shop?category=medications",
    position: "mid-page",
    sortOrder: 3,
  },
]

const NAVBAR_OFFERS = [
  "FREE SHIPPING ON ORDERS ABOVE KSH 5,000",
  "SAME-DAY DELIVERY ACROSS NAIROBI",
  "LICENSED PHARMACY • AUTHENTIC PRODUCTS",
]

const SITE_SETTINGS = {
  store_name: "Her Kingdom Pharmacy",
  store_email: "care@herkingdom.shop",
  store_phone: "+254 700 000 000",
  whatsapp_number: "254700000000",
  footer_whatsapp: "254700000000",
  currency_symbol: "KSh",
  site_title: "Her Kingdom Pharmacy",
  site_description: "Your trusted online pharmacy in Kenya — medications, vitamins, baby care and medical devices delivered to your door.",
  meta_keywords: "online pharmacy kenya, medications nairobi, vitamins, medical devices",
  free_shipping_threshold: 5000,
  enable_whatsapp_checkout: true,
  show_newsletter: true,
  maintenance_mode: false,
}

const DELIVERY_LOCATIONS = [
  { id: "nbo-cbd", name: "Nairobi CBD", fee: 200, estimatedDays: "Same day", type: "delivery", region: "nairobi", city: "Nairobi", description: "Free for orders above KSH 5,000." },
  { id: "nbo-westlands", name: "Westlands", fee: 250, estimatedDays: "Same day", type: "delivery", region: "nairobi", city: "Nairobi", description: "" },
  { id: "nbo-karen", name: "Karen / Lang'ata", fee: 350, estimatedDays: "Same day", type: "delivery", region: "nairobi", city: "Nairobi", description: "" },
  { id: "outside-mombasa", name: "Mombasa", fee: 600, estimatedDays: "1–2 days", type: "delivery", region: "outside_nairobi", city: "Mombasa", description: "Courier delivery." },
  { id: "outside-kisumu", name: "Kisumu", fee: 600, estimatedDays: "1–2 days", type: "delivery", region: "outside_nairobi", city: "Kisumu", description: "Courier delivery." },
  { id: "pickup-cbd", name: "Pickup — CBD Branch", fee: 0, estimatedDays: "Ready in 2 hrs", type: "pickup", region: "nairobi", city: "Nairobi", description: "Collect from our CBD pharmacy." },
]

export async function getProducts() {
  return PRODUCTS
}

export async function getProductBySlug(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug) || null
}

export async function getCategories() {
  const counts: Record<string, number> = {}
  for (const p of PRODUCTS) counts[p.categorySlug] = (counts[p.categorySlug] || 0) + 1
  return CATEGORIES.map((c, i) => ({
    id: `cat-${i + 1}`,
    name: c.name,
    slug: c.slug,
    image: CATEGORY_IMAGES[c.slug] || "/placeholder.svg",
    productCount: counts[c.slug] || 0,
  }))
}

export async function getDeliveryLocations() {
  return DELIVERY_LOCATIONS
}

export async function getNavbarOffers(): Promise<string[]> {
  return NAVBAR_OFFERS
}

export async function getPopupOffer() {
  return null
}

export async function getMidPageBanners() {
  return MID_PAGE_BANNERS
}

export async function getSiteSettings() {
  return SITE_SETTINGS
}

export async function getHeroBanners() {
  return HERO_BANNERS
}

export async function createOrder(_order: unknown) {
  const orderNumber = `HK-${Date.now().toString(36).toUpperCase()}`
  return { orderNumber, orderId: orderNumber }
}

import type { Product, Category, Offer, DeliveryLocation } from "./types"

export const categories: Category[] = [
  {
    id: "1",
    name: "Straight Leg Jeans",
    slug: "straight-leg",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop",
    productCount: 18,
  },
  {
    id: "2",
    name: "Skinny Jeans",
    slug: "skinny-jeans",
    image: "https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=400&h=500&fit=crop",
    productCount: 22,
  },
  {
    id: "3",
    name: "Mom Jeans",
    slug: "mom-jeans",
    image: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400&h=500&fit=crop",
    productCount: 15,
  },
  {
    id: "4",
    name: "Ripped & Rugged",
    slug: "ripped-rugged",
    image: "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=500&fit=crop",
    productCount: 20,
  },
  {
    id: "5",
    name: "Wide Leg & Flare",
    slug: "wide-leg-flare",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop",
    productCount: 14,
  },
  {
    id: "6",
    name: "Dungarees & Overalls",
    slug: "dungarees-overalls",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop",
    productCount: 10,
  },
  {
    id: "7",
    name: "Denim Jackets",
    slug: "denim-jackets",
    image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&h=500&fit=crop",
    productCount: 12,
  },
  {
    id: "8",
    name: "Denim Shorts",
    slug: "denim-shorts",
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=500&fit=crop",
    productCount: 16,
  },
]

export const products: Product[] = [
  {
    id: "1",
    name: "Classic High-Rise Straight Leg Jeans",
    slug: "classic-high-rise-straight-leg",
    price: 3200,
    originalPrice: 4500,
    images: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&h=800&fit=crop",
    ],
    category: "Straight Leg Jeans",
    categorySlug: "straight-leg",
    description: "Timeless high-rise straight leg jeans in classic indigo wash. Comfortable stretch denim with a flattering fit that sits at the natural waist. Perfect everyday pair that goes with everything from casual tees to dressed-up blouses.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34", "36"] },
      { type: "Wash", options: ["Dark Indigo", "Medium Blue", "Light Wash"] },
    ],
    tags: ["straight-leg", "high-rise", "classic", "thrift"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 29,
    inStock: true,
    createdAt: "2025-12-01",
  },
  {
    id: "2",
    name: "Black Skinny Stretch Jeans",
    slug: "black-skinny-stretch-jeans",
    price: 2800,
    originalPrice: 3500,
    images: [
      "https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=800&fit=crop",
    ],
    category: "Skinny Jeans",
    categorySlug: "skinny-jeans",
    description: "Sleek black skinny jeans with excellent stretch recovery. Mid-rise fit hugs your curves in all the right places. A wardrobe essential that works for day-to-night styling.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34"] },
    ],
    tags: ["skinny", "black", "stretch", "essential"],
    isNew: true,
    isOnOffer: true,
    offerPercentage: 20,
    inStock: true,
    createdAt: "2026-01-15",
  },
  {
    id: "3",
    name: "Vintage Mom Jeans - Light Blue",
    slug: "vintage-mom-jeans-light-blue",
    price: 2500,
    images: [
      "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&h=800&fit=crop",
    ],
    category: "Mom Jeans",
    categorySlug: "mom-jeans",
    description: "Authentic vintage-inspired mom jeans in a gorgeous light blue wash. High-waisted, relaxed fit through the hip and thigh. Tapered leg gives that effortlessly cool 90s silhouette.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34", "36"] },
    ],
    tags: ["mom-jeans", "vintage", "light-wash", "90s"],
    isNew: true,
    isOnOffer: false,
    inStock: true,
    createdAt: "2026-02-01",
  },
  {
    id: "4",
    name: "Heavy Ripped Boyfriend Jeans",
    slug: "heavy-ripped-boyfriend-jeans",
    price: 3500,
    originalPrice: 5000,
    images: [
      "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&h=800&fit=crop",
    ],
    category: "Ripped & Rugged",
    categorySlug: "ripped-rugged",
    description: "Bold distressed boyfriend jeans with heavy ripping and raw hems. Relaxed fit sits low on the hips with a slouchy leg. Perfect for creating that effortless street-style look.",
    variations: [
      { type: "Size", options: ["28", "30", "32", "34"] },
      { type: "Distress Level", options: ["Medium Rip", "Heavy Rip"] },
    ],
    tags: ["ripped", "boyfriend", "distressed", "rugged"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 30,
    inStock: true,
    createdAt: "2025-11-20",
  },
  {
    id: "5",
    name: "70s Flare Jeans - Dark Wash",
    slug: "70s-flare-jeans-dark-wash",
    price: 3800,
    images: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=800&fit=crop",
    ],
    category: "Wide Leg & Flare",
    categorySlug: "wide-leg-flare",
    description: "Retro-inspired flare jeans in a rich dark indigo wash. High-rise waist with a fitted thigh that flares dramatically from the knee. Elongates the leg beautifully.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34"] },
    ],
    tags: ["flare", "70s", "retro", "dark-wash"],
    isNew: true,
    isOnOffer: false,
    inStock: true,
    createdAt: "2026-01-28",
  },
  {
    id: "6",
    name: "Classic Denim Dungarees",
    slug: "classic-denim-dungarees",
    price: 4200,
    originalPrice: 5500,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=600&h=800&fit=crop",
    ],
    category: "Dungarees & Overalls",
    categorySlug: "dungarees-overalls",
    description: "Adorable denim dungarees in a medium blue wash. Adjustable shoulder straps with classic brass buckles. Roomy front pocket and relaxed fit make these incredibly comfortable and trendy.",
    variations: [
      { type: "Size", options: ["S", "M", "L", "XL"] },
      { type: "Wash", options: ["Medium Blue", "Light Wash"] },
    ],
    tags: ["dungarees", "overalls", "vintage", "thrift"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 24,
    inStock: true,
    createdAt: "2025-12-15",
  },
  {
    id: "7",
    name: "Oversized Denim Jacket",
    slug: "oversized-denim-jacket",
    price: 3600,
    originalPrice: 4800,
    images: [
      "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1578948856697-db91d246b7b8?w=600&h=800&fit=crop",
    ],
    category: "Denim Jackets",
    categorySlug: "denim-jackets",
    description: "The ultimate layering piece - an oversized denim jacket in classic blue wash. Dropped shoulders, brass buttons, and chest flap pockets. Throw it over any outfit for instant cool.",
    variations: [
      { type: "Size", options: ["S", "M", "L", "XL"] },
      { type: "Wash", options: ["Classic Blue", "Washed Black"] },
    ],
    tags: ["jacket", "oversized", "denim", "layering"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 25,
    inStock: true,
    createdAt: "2025-11-10",
  },
  {
    id: "8",
    name: "High-Waist Denim Shorts",
    slug: "high-waist-denim-shorts",
    price: 1800,
    images: [
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600&h=800&fit=crop",
    ],
    category: "Denim Shorts",
    categorySlug: "denim-shorts",
    description: "Cute high-waist denim shorts with a raw frayed hem. Perfect summer staple that pairs with crop tops, bodysuits, or oversized tees. Flattering fit with just the right amount of stretch.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34"] },
      { type: "Wash", options: ["Blue", "White", "Black"] },
    ],
    tags: ["shorts", "high-waist", "summer", "casual"],
    isNew: true,
    isOnOffer: false,
    inStock: true,
    createdAt: "2026-02-05",
  },
  {
    id: "9",
    name: "Acid Wash Relaxed Fit Jeans",
    slug: "acid-wash-relaxed-fit",
    price: 2900,
    originalPrice: 4000,
    images: [
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop",
    ],
    category: "Straight Leg Jeans",
    categorySlug: "straight-leg",
    description: "Unique acid wash straight leg jeans with a relaxed fit. Stand-out piece with a retro vibe that makes a statement. Comfortable loose fit through the leg with a straight hem.",
    variations: [
      { type: "Size", options: ["28", "30", "32", "34", "36"] },
    ],
    tags: ["acid-wash", "relaxed", "retro", "statement"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 28,
    inStock: true,
    createdAt: "2025-10-20",
  },
  {
    id: "10",
    name: "Cargo Pocket Wide Leg Jeans",
    slug: "cargo-pocket-wide-leg",
    price: 3400,
    images: [
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop",
    ],
    category: "Wide Leg & Flare",
    categorySlug: "wide-leg-flare",
    description: "Trendy cargo-pocket wide leg jeans with a high waist. Extra pockets on the thigh add utility and street-style edge. A bold statement piece for fashion-forward denim lovers.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34"] },
      { type: "Color", options: ["Medium Blue", "Khaki Wash"] },
    ],
    tags: ["cargo", "wide-leg", "street", "trendy"],
    isNew: true,
    isOnOffer: false,
    inStock: true,
    createdAt: "2026-01-10",
  },
  {
    id: "11",
    name: "Knee Rip Skinny Jeans - Blue",
    slug: "knee-rip-skinny-jeans-blue",
    price: 2600,
    originalPrice: 3200,
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=600&h=800&fit=crop",
    ],
    category: "Ripped & Rugged",
    categorySlug: "ripped-rugged",
    description: "On-trend skinny jeans with strategic knee rips. Medium blue wash with subtle whiskering detail. Fitted through the leg with a tapered ankle for a modern silhouette.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34"] },
    ],
    tags: ["ripped", "skinny", "knee-rip", "blue"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 19,
    inStock: true,
    createdAt: "2025-12-20",
  },
  {
    id: "12",
    name: "Baggy Painter Jeans - Thrifted",
    slug: "baggy-painter-jeans-thrifted",
    price: 2200,
    images: [
      "https://images.unsplash.com/photo-1578948856697-db91d246b7b8?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop",
    ],
    category: "Mom Jeans",
    categorySlug: "mom-jeans",
    description: "Unique thrifted baggy painter-style jeans with a relaxed fit. High waist, wide straight leg, and authentic worn-in character. Each pair has its own unique patina and feel.",
    variations: [
      { type: "Size", options: ["28", "30", "32", "34"] },
    ],
    tags: ["baggy", "painter", "thrift", "unique"],
    isNew: true,
    isOnOffer: false,
    inStock: true,
    createdAt: "2026-02-08",
  },
  {
    id: "13",
    name: "Cropped Denim Jacket - Washed Black",
    slug: "cropped-denim-jacket-washed-black",
    price: 3000,
    originalPrice: 3800,
    images: [
      "https://images.unsplash.com/photo-1578948856697-db91d246b7b8?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600&h=800&fit=crop",
    ],
    category: "Denim Jackets",
    categorySlug: "denim-jackets",
    description: "Edgy cropped denim jacket in a washed black finish. Fitted silhouette with a boxy crop length. Silver-tone hardware and a raw hem add attitude to this versatile layering essential.",
    variations: [
      { type: "Size", options: ["S", "M", "L"] },
    ],
    tags: ["cropped", "jacket", "black", "edgy"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 21,
    inStock: true,
    createdAt: "2025-12-05",
  },
  {
    id: "14",
    name: "Bleached Distressed Boyfriend Jeans",
    slug: "bleached-distressed-boyfriend",
    price: 2800,
    images: [
      "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&h=800&fit=crop",
    ],
    category: "Ripped & Rugged",
    categorySlug: "ripped-rugged",
    description: "Statement bleached boyfriend jeans with artistic distressing throughout. Low-rise relaxed fit with a wide rolled cuff. These one-of-a-kind jeans bring major character to any outfit.",
    variations: [
      { type: "Size", options: ["28", "30", "32", "34"] },
    ],
    tags: ["bleached", "distressed", "boyfriend", "statement"],
    isNew: true,
    isOnOffer: false,
    inStock: true,
    createdAt: "2026-01-22",
  },
  {
    id: "15",
    name: "Raw Hem Skinny Jeans - Dark",
    slug: "raw-hem-skinny-dark",
    price: 2400,
    originalPrice: 3000,
    images: [
      "https://images.unsplash.com/photo-1602293589930-45aad59ba3ab?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=800&fit=crop",
    ],
    category: "Skinny Jeans",
    categorySlug: "skinny-jeans",
    description: "Dark wash skinny jeans with a trendy raw hem finish. Super stretch fabric for maximum comfort. High-rise fit flatters every body type while the raw hem adds a contemporary edge.",
    variations: [
      { type: "Size", options: ["26", "28", "30", "32", "34"] },
    ],
    tags: ["raw-hem", "skinny", "dark-wash", "stretch"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 20,
    inStock: true,
    createdAt: "2025-11-28",
  },
  {
    id: "16",
    name: "Short Denim Dungaree Dress",
    slug: "short-denim-dungaree-dress",
    price: 3200,
    originalPrice: 4200,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&h=800&fit=crop",
    ],
    category: "Dungarees & Overalls",
    categorySlug: "dungarees-overalls",
    description: "Playful short denim dungaree dress in a classic blue wash. Adjustable straps, front bib pocket, and a flared skirt portion. Style it with a turtleneck or crop top underneath.",
    variations: [
      { type: "Size", options: ["S", "M", "L", "XL"] },
    ],
    tags: ["dungaree", "dress", "playful", "thrift"],
    isNew: false,
    isOnOffer: true,
    offerPercentage: 24,
    inStock: true,
    createdAt: "2025-12-10",
  },
]

export const offers: Offer[] = [
  {
    id: "1",
    title: "Denim Season Sale",
    description: "Get up to 30% off on all jeans. Thrift and brand-new pairs included!",
    discount: "30% OFF",
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=400&fit=crop",
    validUntil: "2026-03-15",
  },
  {
    id: "2",
    title: "Bundle & Save",
    description: "Buy any 2 jeans and get a denim accessory free.",
    discount: "BUY 2 + FREE",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&h=400&fit=crop",
    validUntil: "2026-02-28",
  },
]

export const deliveryLocations: DeliveryLocation[] = [
  { id: "1", name: "Nairobi CBD", fee: 200, estimatedDays: "Same day" },
  { id: "2", name: "Westlands", fee: 250, estimatedDays: "Same day" },
  { id: "3", name: "Karen", fee: 350, estimatedDays: "1-2 days" },
  { id: "4", name: "Kiambu", fee: 400, estimatedDays: "1-2 days" },
  { id: "5", name: "Thika", fee: 450, estimatedDays: "2-3 days" },
  { id: "6", name: "Nakuru", fee: 600, estimatedDays: "2-3 days" },
  { id: "7", name: "Mombasa", fee: 800, estimatedDays: "3-5 days" },
  { id: "8", name: "Kisumu", fee: 750, estimatedDays: "3-5 days" },
  { id: "9", name: "Eldoret", fee: 700, estimatedDays: "3-5 days" },
  { id: "10", name: "Rest of Kenya", fee: 1000, estimatedDays: "5-7 days" },
]

export const runningOffers = [
  "FREE SHIPPING on orders above KSh 5,000",
  "NEW DENIM DROPS posted weekly -- Shop now!",
  "Up to 30% OFF on selected jeans",
  "Buy 2 Jeans Get a FREE Denim Accessory",
]

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug)
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug)
}

export function getSimilarProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, limit)
}

export function getProductsOnOffer(): Product[] {
  return products.filter((p) => p.isOnOffer)
}

export function getNewArrivals(): Product[] {
  return products.filter((p) => p.isNew)
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase()
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  )
}

export function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

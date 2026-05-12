export interface Product {
  id: string
  name: string
  slug: string
  price: number
  originalPrice?: number
  images: string[]
  category: string
  categorySlug: string
  description: string
  variations?: ProductVariation[]
  tags: string[]
  isNew?: boolean
  isOnOffer?: boolean
  offerPercentage?: number
  inStock: boolean
  collection?: string
  createdAt: string
}

export interface HeroBanner {
  id: string
  title: string
  subtitle: string
  collection: string
  bannerImage: string
  linkUrl: string
  buttonText: string
  sortOrder: number
}

export interface ProductVariation {
  type: string
  options: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
  image: string
  productCount: number
}

export interface CartItem {
  product: Product
  quantity: number
  selectedVariations?: Record<string, string>
}

export interface Offer {
  id: string
  title: string
  description: string
  discount: string
  image: string
  validUntil: string
}

export interface Banner {
  id: string
  title: string
  subtitle: string
  image: string
  link: string
  position: "hero" | "mid-page" | string
  sortOrder: number
}

export type DeliveryLocationType = "delivery" | "pickup"
export type DeliveryLocationRegion = "nairobi" | "outside_nairobi"

export interface DeliveryLocation {
  id: string
  name: string
  fee: number
  estimatedDays: string
  type?: DeliveryLocationType
  region?: DeliveryLocationRegion
  city?: string
  description?: string
  isActive?: boolean
}

export type GiftItemCategory = "addon" | "gift_wrap" | "greeting_card"

export interface GiftItem {
  id: string
  category: GiftItemCategory
  name: string
  description?: string
  price: number
  imageUrl?: string
  isActive: boolean
  sortOrder: number
}

export interface GiftSelectionAddon {
  id: string
  name: string
  price: number
  imageUrl?: string
  quantity: number
}

export interface GiftSelectionWrap {
  id: string
  name: string
  price: number
  imageUrl?: string
}

export interface GiftSelectionCard {
  id: string
  name: string
  price: number
  imageUrl?: string
  message?: string
}

export interface GiftSelection {
  isGift: boolean
  addons: GiftSelectionAddon[]
  wraps: GiftSelectionWrap[]
  cards: GiftSelectionCard[]
  messageFrom?: string
  messageTo?: string
  messageNote?: string
}

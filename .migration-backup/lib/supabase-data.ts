import { createClient } from "@/lib/supabase/server"
import type { Product, Category, DeliveryLocation, Offer, HeroBanner } from "./types"
import { resolveCategoryImage } from "./category-images"

export function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

function mapProduct(row: Record<string, unknown>, images: Record<string, unknown>[], variations: Record<string, unknown>[], productTags: Record<string, string[]> = {}): Product {
  const productImages = images
    .filter((img) => img.product_id === row.id)
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    .map((img) => (img.image_url || img.url) as string)

  // Fallback to gallery_images array if product_images table is empty
  const finalImages = productImages.length > 0 
    ? productImages 
    : Array.isArray(row.gallery_images) 
      ? (row.gallery_images as string[])
      : []

  const variationsList = variations
    .filter((v) => v.product_id === row.id)
    .map((v) => ({
      type: (v.type || v.label) as string,
      options: Array.isArray(v.options) ? v.options as string[] : [v.value as string],
    }))

  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    images: finalImages.length > 0 ? finalImages : ["/placeholder.svg?height=800&width=600"],
    category: (row as Record<string, unknown> & { categories?: { name: string; slug: string } }).categories?.name || "",
    categorySlug: (row as Record<string, unknown> & { categories?: { name: string; slug: string } }).categories?.slug || "",
    description: (row.description as string) || "",
    variations: variationsList.length > 0 ? variationsList : undefined,
    tags: productTags[row.id as string] || [],
    collection: (row.collection as string) || "unisex",
    isNew: row.is_new as boolean,
    isOnOffer: row.is_on_offer as boolean,
    offerPercentage: row.offer_percentage ? Number(row.offer_percentage) : undefined,
    inStock: row.in_stock as boolean,
    createdAt: (row.created_at as string) || "",
  }
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const [productsRes, imagesRes, variationsRes, productTagsRes] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name, slug)")
      .order("sort_order", { ascending: true })
      .range(0, 9999),
    supabase.from("product_images").select("*").order("sort_order", { ascending: true }).range(0, 49999),
    supabase.from("product_variations").select("*").range(0, 49999),
    supabase.from("product_tags").select("product_id, tags(name)").range(0, 49999),
  ])

  if (!productsRes.data) return []

  const tagMap: Record<string, string[]> = {}
  for (const pt of productTagsRes.data || []) {
    const pid = pt.product_id as string
    const tagName = (pt as Record<string, unknown> & { tags?: { name: string } }).tags?.name
    if (tagName) {
      if (!tagMap[pid]) tagMap[pid] = []
      tagMap[pid].push(tagName)
    }
  }

  return productsRes.data.map((row) =>
    mapProduct(row, imagesRes.data || [], variationsRes.data || [], tagMap)
  )
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient()
  if (!supabase) return null

  const { data: row } = await supabase
    .from("products")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .single()

  if (!row) return null

  const [imagesRes, variationsRes, ptRes] = await Promise.all([
    supabase.from("product_images").select("*").eq("product_id", row.id).order("sort_order", { ascending: true }),
    supabase.from("product_variations").select("*").eq("product_id", row.id),
    supabase.from("product_tags").select("product_id, tags(name)").eq("product_id", row.id),
  ])

  const tagMap: Record<string, string[]> = {}
  for (const pt of ptRes.data || []) {
    const pid = pt.product_id as string
    const tagName = (pt as Record<string, unknown> & { tags?: { name: string } }).tags?.name
    if (tagName) {
      if (!tagMap[pid]) tagMap[pid] = []
      tagMap[pid].push(tagName)
    }
  }

  return mapProduct(row, imagesRes.data || [], variationsRes.data || [], tagMap)
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single()

  if (!category) return []

  const [productsRes, imagesRes, variationsRes] = await Promise.all([
    supabase.from("products").select("*, categories(name, slug)").eq("category_id", category.id),
    supabase.from("product_images").select("*"),
    supabase.from("product_variations").select("*"),
  ])

  if (!productsRes.data) return []

  return productsRes.data.map((row) =>
    mapProduct(row, imagesRes.data || [], variationsRes.data || [])
  )
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .range(0, 9999)

  if (!categories) return []

  // Get product counts per category
  const { data: products } = await supabase
    .from("products")
    .select("category_id")
    .range(0, 9999)

  const countMap: Record<string, number> = {}
  for (const p of products || []) {
    countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
  }

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    image: resolveCategoryImage(cat.slug, cat.image_url),
    productCount: countMap[cat.id] || 0,
  }))
}

export interface CategorySeoMeta {
  id: string
  name: string
  slug: string
  description: string
  image: string
  updatedAt: string | null
  productCount: number
}

export async function getCategoryBySlug(slug: string): Promise<CategorySeoMeta | null> {
  const supabase = await createClient()
  if (!supabase) return null

  const { data: cat } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle()

  if (!cat) return null

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", cat.id)

  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: (cat.description as string) || "",
    image: resolveCategoryImage(cat.slug, cat.image_url),
    updatedAt: cat.updated_at || cat.created_at || null,
    productCount: count || 0,
  }
}

export async function getCategorySeoList(): Promise<CategorySeoMeta[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .range(0, 9999)

  if (!categories) return []

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: (cat.description as string) || "",
    image: resolveCategoryImage(cat.slug, cat.image_url),
    updatedAt: cat.updated_at || cat.created_at || null,
    productCount: 0,
  }))
}

export async function getDeliveryLocations(): Promise<DeliveryLocation[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("delivery_locations")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("fee", { ascending: true })

  if (!data) return []

  return data.map((loc) => ({
    id: loc.id,
    name: loc.name,
    fee: Number(loc.fee),
    estimatedDays: loc.estimated_days || "",
    type: (loc.type as "delivery" | "pickup") || "delivery",
    region: (loc.region as "nairobi" | "outside_nairobi") || "nairobi",
    city: (loc.city as string) || "",
    description: (loc.description as string) || "",
  }))
}

export async function getNavbarOffers(): Promise<string[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("navbar_offers")
    .select("text")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  return data?.map((o) => o.text) || []
}

export async function getPopupOffer(): Promise<Offer | null> {
  const supabase = await createClient()
  if (!supabase) return null

  const { data } = await supabase
    .from("popup_offers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return null

  const offer = data[0]
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description || "",
    discount: offer.discount_label || "",
    image: offer.image_url || "/placeholder.svg",
    validUntil: offer.valid_until || "2026-12-31",
  }
}

export async function getMidPageBanners() {
  const supabase = await createClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link, position, sort_order")
    .eq("is_active", true)
    .eq("position", "mid-page")
    .order("sort_order", { ascending: true })

  return (data || []).map((b) => ({
    id: b.id as string,
    title: (b.title as string) || "",
    subtitle: (b.subtitle as string) || "",
    image: (b.image_url as string) || "/placeholder.svg",
    link: (b.link as string) || "/shop",
    position: (b.position as string) || "mid-page",
    sortOrder: (b.sort_order as number) || 0,
  }))
}

export async function getSiteSettings() {
  const supabase = await createClient()
  if (!supabase) return null

  const { data } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .single()

  return data
}

export async function createOrder(order: {
  customerName: string
  customerEmail?: string
  customerPhone: string
  deliveryLocationId?: string
  deliveryAddress: string
  deliveryFee: number
  subtotal: number
  total: number
  notes?: string
  specialInstructions?: string
  isGift?: boolean
  giftSelection?: Record<string, unknown> | null
  giftExtrasTotal?: number
  orderedVia: string
  paymentMethod?: string
  mpesaCode?: string
  mpesaPhone?: string
  mpesaMessage?: string
  items: {
    productId: string
    productName: string
    productImage?: string
    variation?: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}) {
  const supabase = await createClient()
  if (!supabase) throw new Error("Database not available — missing Supabase environment variables")

  // Generate order number
  const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}`

  // Columns added in migration 020 (special_instructions, is_gift, gift_selection,
  // gift_extras_total) may not yet exist on older deployments. We build the base
  // payload and try the richer insert first; if Postgres rejects it with the
  // "undefined_column" code (42703), we retry with the minimal columns so that
  // customers on stale schemas can still place orders.
  const baseInsert = {
    order_no: orderNumber,
    customer_name: order.customerName,
    customer_email: order.customerEmail || null,
    customer_phone: order.customerPhone,
    delivery_location_id: order.deliveryLocationId || null,
    delivery_address: order.deliveryAddress,
    delivery_fee: order.deliveryFee,
    subtotal: order.subtotal,
    total: order.total,
    order_notes: order.notes || null,
    ordered_via: order.orderedVia,
    payment_method: order.paymentMethod || "cod",
    mpesa_code: order.mpesaCode || null,
    mpesa_phone: order.mpesaPhone || null,
    mpesa_message: order.mpesaMessage || null,
    status: "pending",
  }

  const extendedInsert = {
    ...baseInsert,
    special_instructions: order.specialInstructions || null,
    is_gift: order.isGift || false,
    gift_selection: order.giftSelection || null,
    gift_extras_total: order.giftExtrasTotal || 0,
  }

  const tryInsert = async (payload: Record<string, unknown>) =>
    supabase.from("orders").insert(payload).select().single()

  let { data: orderData, error: orderError } = await tryInsert(extendedInsert)

  // Postgres 42703 = undefined_column — happens when migration 020 hasn't run.
  // Fall back to the base payload so the shopper can still check out, and merge
  // the gift details into order_notes so fulfilment staff still see them.
  if (orderError && (orderError.code === "42703" || /column .* does not exist/i.test(orderError.message || ""))) {
    console.warn("[orders] extended columns unavailable — retrying with minimal payload:", orderError.message)
    const giftFallbackNote = order.isGift
      ? `[Gift order — extras total KSh ${Number(order.giftExtrasTotal || 0).toLocaleString()}${
          order.giftSelection ? ` — details: ${JSON.stringify(order.giftSelection)}` : ""
        }]`
      : ""
    const specialFallbackNote = order.specialInstructions
      ? `[Special instructions: ${order.specialInstructions}]`
      : ""
    const mergedNotes = [baseInsert.order_notes, specialFallbackNote, giftFallbackNote]
      .filter(Boolean)
      .join(" ")
    const fallbackRes = await tryInsert({
      ...baseInsert,
      order_notes: mergedNotes || null,
    })
    orderData = fallbackRes.data
    orderError = fallbackRes.error
  }

  if (orderError) {
    console.error("[orders] insert failed:", orderError)
    throw new Error(orderError.message || "Could not save order")
  }

  if (!orderData) {
    throw new Error("Order insert returned no data")
  }

  // Insert order items - match actual order_items schema
  const orderItems = order.items.map((item) => ({
    order_id: orderData.id,
    product_id: item.productId || null,
    product_name: item.productName,
    product_price: item.unitPrice,
    quantity: item.quantity,
    selected_variations: item.variation ? { type: item.variation } : null,
  }))

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems)

  if (itemsError) throw itemsError

  return { orderNumber: orderData.order_no, orderId: orderData.id }
}

export async function getHeroBanners(): Promise<HeroBanner[]> {
  try {
    const supabase = await createClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from("hero_banners")
      .select("id, title, subtitle, image_url, button_link, button_text, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(3)

    if (error) {
      console.error("[v0] Error fetching hero banners:", error.message)
      return []
    }

    if (!data || data.length === 0) {
      console.log("[v0] No active hero banners found in database")
      return []
    }

    return data.map((b) => ({
      id: b.id,
      title: b.title || "Women's Collection",
      subtitle: b.subtitle || "Discover premium women's fashion",
      collection: "women-collection",
      bannerImage: b.image_url || "/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg",
      linkUrl: b.button_link || "/shop",
      buttonText: b.button_text || "Shop Now",
      sortOrder: b.sort_order || 0,
    }))
  } catch (error) {
    console.error("[v0] Exception in getHeroBanners:", error)
    return []
  }
}

export async function getProductsByCollection(collection: string): Promise<Product[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const [productsRes, imagesRes, variationsRes, productTagsRes] = await Promise.all([
    supabase.from("products").select("*, categories(name, slug)").eq("collection", collection).order("sort_order", { ascending: true }),
    supabase.from("product_images").select("*").order("sort_order", { ascending: true }),
    supabase.from("product_variations").select("*"),
    supabase.from("product_tags").select("product_id, tags(name)"),
  ])

  if (!productsRes.data) return []

  const tagMap: Record<string, string[]> = {}
  for (const pt of productTagsRes.data || []) {
    const pid = pt.product_id as string
    const tagName = (pt as Record<string, unknown> & { tags?: { name: string } }).tags?.name
    if (tagName) {
      if (!tagMap[pid]) tagMap[pid] = []
      tagMap[pid].push(tagName)
    }
  }

  return productsRes.data.map((row) =>
    mapProduct(row, imagesRes.data || [], variationsRes.data || [], tagMap)
  )
}

import { createClient } from "./supabase"

function resolveCategoryImage(slug: string | null | undefined, imageUrl: string | null | undefined): string {
  const FALLBACKS: Record<string, string> = {
    "necklace-sets": "/images/products/necklaces/necklace-sets-category.jpeg",
    "men-necklaces": "/images/products/men-necklaces/men-necklaces-category.jpeg",
  }
  if (imageUrl && !imageUrl.startsWith("/placeholder")) return imageUrl
  if (slug && FALLBACKS[slug]) return FALLBACKS[slug]
  return "/placeholder.svg?height=500&width=400"
}

function mapProduct(row: Record<string, unknown>, images: Record<string, unknown>[], variations: Record<string, unknown>[], productTags: Record<string, string[]> = {}) {
  const productImages = images
    .filter((img) => img.product_id === row.id)
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    .map((img) => (img.image_url || img.url) as string)

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

  const cats = (row as Record<string, unknown> & { categories?: { name: string; slug: string } }).categories

  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    images: finalImages.length > 0 ? finalImages : ["/placeholder.svg?height=800&width=600"],
    category: cats?.name || "",
    categorySlug: cats?.slug || "",
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

export async function getProducts() {
  const supabase = createClient()
  const [productsRes, imagesRes, variationsRes, productTagsRes] = await Promise.all([
    supabase.from("products").select("*, categories(name, slug)").order("sort_order", { ascending: true }).range(0, 9999),
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

  return productsRes.data.map((row) => mapProduct(row, imagesRes.data || [], variationsRes.data || [], tagMap))
}

export async function getProductBySlug(slug: string) {
  const supabase = createClient()
  const { data: row } = await supabase.from("products").select("*, categories(name, slug)").eq("slug", slug).single()
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

export async function getCategories() {
  const supabase = createClient()
  const { data: categories } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }).range(0, 9999)
  if (!categories) return []

  const { data: products } = await supabase.from("products").select("category_id").range(0, 9999)
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

export async function getDeliveryLocations() {
  const supabase = createClient()
  const { data } = await supabase.from("delivery_locations").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("fee", { ascending: true })
  if (!data) return []

  return data.map((loc) => ({
    id: loc.id,
    name: loc.name,
    fee: Number(loc.fee),
    estimatedDays: loc.estimated_days || "",
    type: (loc.type as string) || "delivery",
    region: (loc.region as string) || "nairobi",
    city: (loc.city as string) || "",
    description: (loc.description as string) || "",
  }))
}

export async function getNavbarOffers(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase.from("navbar_offers").select("text").eq("is_active", true).order("sort_order", { ascending: true })
  return data?.map((o) => o.text) || []
}

export async function getPopupOffer() {
  const supabase = createClient()
  const { data } = await supabase.from("popup_offers").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1)
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
  const supabase = createClient()
  const { data } = await supabase.from("banners").select("id, title, subtitle, image_url, link, position, sort_order").eq("is_active", true).eq("position", "mid-page").order("sort_order", { ascending: true })

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
  const supabase = createClient()
  const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle()
  return data
}

export async function getHeroBanners() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("hero_banners").select("id, title, subtitle, image_url, button_link, button_text, sort_order").eq("is_active", true).order("sort_order", { ascending: true }).limit(3)
    if (error || !data || data.length === 0) return []

    return data.map((b) => ({
      id: b.id,
      title: b.title || "Women's Collection",
      subtitle: b.subtitle || "Discover premium women's fashion",
      collection: "women-collection",
      bannerImage: b.image_url || "/placeholder.svg",
      linkUrl: b.button_link || "/shop",
      buttonText: b.button_text || "Shop Now",
      sortOrder: b.sort_order || 0,
    }))
  } catch {
    return []
  }
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
  const supabase = createClient()
  const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}`

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

  const tryInsert = (payload: Record<string, unknown>) =>
    supabase.from("orders").insert(payload).select().single()

  let { data: orderData, error: orderError } = await tryInsert(extendedInsert)

  if (orderError && (orderError.code === "42703" || /column .* does not exist/i.test(orderError.message || ""))) {
    const fallbackRes = await tryInsert(baseInsert)
    orderData = fallbackRes.data
    orderError = fallbackRes.error
  }

  if (orderError) throw new Error(orderError.message || "Could not save order")
  if (!orderData) throw new Error("Order insert returned no data")

  const orderItems = order.items.map((item) => ({
    order_id: orderData!.id,
    product_id: item.productId || null,
    product_name: item.productName,
    product_price: item.unitPrice,
    quantity: item.quantity,
    selected_variations: item.variation ? { type: item.variation } : null,
  }))

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
  if (itemsError) throw itemsError

  return { orderNumber: orderData.order_no, orderId: orderData.id }
}

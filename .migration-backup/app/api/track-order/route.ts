import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, sanitizePhoneSearch } from "@/lib/security"

export async function GET(request: NextRequest) {
  // Rate limit: max 15 searches per minute per IP
  const rl = rateLimit(request, { limit: 15, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get("order_number")?.trim().replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 30)
  const phone = searchParams.get("phone")?.trim()

  if (!orderNumber && !phone) {
    return NextResponse.json({ error: "Provide order number or phone number" }, { status: 400 })
  }

  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select("id, order_no, customer_name, customer_phone, customer_email, subtotal, delivery_fee, total, status, delivery_address, delivery_location_id, created_at, payment_method, mpesa_code, order_notes")
    .order("created_at", { ascending: false })

  if (orderNumber) {
    query = query.eq("order_no", orderNumber)
  } else if (phone) {
    // Sanitize phone to prevent wildcard injection
    const cleanPhone = sanitizePhoneSearch(phone).replace(/^(\+?254|0)/, "")
    if (cleanPhone.length < 6) {
      return NextResponse.json({ error: "Phone number too short" }, { status: 400 })
    }
    query = query.or(`customer_phone.ilike.%${cleanPhone}%`)
  }

  const { data: orders, error } = await query.limit(10)

  if (error) {
    console.error("[v0] Orders query error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "No orders found" }, { status: 404 })
  }

  // Fetch items for all found orders
  const orderIds = orders.map((o) => o.id)
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, product_name, quantity, product_price, selected_variations")
    .in("order_id", orderIds)

  if (itemsError) {
    console.error("[v0] Order items query error:", itemsError)
  }

  const itemsByOrder: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id].push(item)
  }

  // Fetch delivery location names
  const locationIds = orders
    .map((o) => o.delivery_location_id)
    .filter((id): id is string => id !== null)
  
  const { data: locations } = await supabase
    .from("delivery_locations")
    .select("id, name")
    .in("id", locationIds)

  const locationMap: Record<string, string> = {}
  for (const loc of locations || []) {
    locationMap[loc.id] = loc.name
  }

  const result = orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_no,
    customer: o.customer_name,
    phone: o.customer_phone,
    email: o.customer_email || "",
    items: (itemsByOrder[o.id] || []).map((item) => {
      let variation = undefined
      if (item.selected_variations && typeof item.selected_variations === "object") {
        const vars = Object.values(item.selected_variations).filter((v) => v !== null && v !== "")
        variation = vars.length > 0 ? vars.join(", ") : undefined
      }
      return {
        name: item.product_name,
        qty: item.quantity,
        price: Number(item.product_price),
        variation,
      }
    }),
    subtotal: Number(o.subtotal),
    deliveryFee: Number(o.delivery_fee),
    total: Number(o.total),
    location: o.delivery_location_id ? locationMap[o.delivery_location_id] : "",
    address: o.delivery_address || "",
    status: o.status || "pending",
    paymentMethod: o.payment_method || "cod",
    mpesaCode: o.mpesa_code || "",
    notes: o.order_notes || "",
    createdAt: o.created_at,
  }))

  return NextResponse.json(result)
}

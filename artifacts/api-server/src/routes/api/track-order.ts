import { Router } from "express"
import { createClient } from "../../lib/supabase.js"
import { rateLimit, rateLimitResponse, sanitizePhoneSearch } from "../../lib/security.js"

const router = Router()

router.get("/", async (req, res) => {
  const rl = rateLimit(req, { limit: 15, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse(res)

  const orderNumber = (req.query.order_number as string)?.trim().replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 30)
  const phone = (req.query.phone as string)?.trim()

  if (!orderNumber && !phone) {
    return res.status(400).json({ error: "Provide order number or phone number" })
  }

  const supabase = createClient()

  let query = supabase
    .from("orders")
    .select("id, order_no, customer_name, customer_phone, customer_email, subtotal, delivery_fee, total, status, delivery_address, delivery_location_id, created_at, payment_method, mpesa_code, order_notes")
    .order("created_at", { ascending: false })

  if (orderNumber) {
    query = query.eq("order_no", orderNumber)
  } else if (phone) {
    const cleanPhone = sanitizePhoneSearch(phone).replace(/^(\+?254|0)/, "")
    if (cleanPhone.length < 6) return res.status(400).json({ error: "Phone number too short" })
    query = query.or(`customer_phone.ilike.%${cleanPhone}%`)
  }

  const { data: orders, error } = await query.limit(10)

  if (error) return res.status(500).json({ error: error.message })
  if (!orders || orders.length === 0) return res.status(404).json({ error: "No orders found" })

  const orderIds = orders.map((o) => o.id)
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, product_name, quantity, product_price, selected_variations")
    .in("order_id", orderIds)

  const itemsByOrder: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id]!.push(item)
  }

  const locationIds = orders.map((o) => o.delivery_location_id).filter((id): id is string => id !== null)
  const { data: locations } = await supabase.from("delivery_locations").select("id, name").in("id", locationIds)
  const locationMap: Record<string, string> = {}
  for (const loc of locations || []) locationMap[loc.id] = loc.name

  const result = orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_no,
    customer: o.customer_name,
    phone: o.customer_phone,
    email: o.customer_email || "",
    items: (itemsByOrder[o.id] || []).map((item) => {
      let variation: string | undefined
      if (item.selected_variations && typeof item.selected_variations === "object") {
        const vars = Object.values(item.selected_variations as Record<string, unknown>).filter((v) => v !== null && v !== "")
        variation = vars.length > 0 ? vars.join(", ") : undefined
      }
      return { name: item.product_name, qty: item.quantity, price: Number(item.product_price), variation }
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

  res.json(result)
})

export default router

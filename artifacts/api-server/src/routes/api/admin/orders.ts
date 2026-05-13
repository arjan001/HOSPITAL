import { Router } from "express"
import { requireAdmin } from "../../../middlewares/admin-auth.js"
import { createClient } from "../../../lib/supabase.js"

const router = Router()
router.use(requireAdmin)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.get("/", async (req, res) => {
  const supabase = createClient()
  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined
  const countOnly = req.query.count === "true"

  // Lightweight count-only branch — used by the admin shell pending-orders badge.
  if (countOnly) {
    let q = supabase.from("orders").select("*", { count: "exact", head: true })
    if (statusFilter) q = q.eq("status", statusFilter)
    const { count, error: countError } = await q
    if (countError) return res.status(500).json({ error: countError.message })
    return res.json({ count: count ?? 0 })
  }

  let ordersQuery = supabase
    .from("orders")
    .select("*, delivery_locations(name)")
    .order("created_at", { ascending: false })
  if (statusFilter) ordersQuery = ordersQuery.eq("status", statusFilter)

  const { data: orders, error } = await ordersQuery

  if (error) return res.status(500).json({ error: error.message })

  const orderIds = (orders || []).map((o) => o.id)
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds.length > 0 ? orderIds : ["none"])

  const itemsByOrder: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id]!.push(item)
  }

  const result = (orders || []).map((o) => ({
    id: o.id,
    orderNo: o.order_no || "",
    customer: o.customer_name,
    phone: o.customer_phone,
    email: o.customer_email || "",
    items: (itemsByOrder[o.id] || []).map((item) => ({
      name: item.product_name,
      qty: item.quantity,
      price: Number(item.product_price),
      variation: (item.selected_variations as Record<string, unknown> | null)?.type || undefined,
    })),
    subtotal: Number(o.subtotal),
    delivery: Number(o.delivery_fee),
    total: Number(o.total),
    location: (o.delivery_locations as { name?: string } | null)?.name || o.delivery_address || "",
    address: o.delivery_address || "",
    notes: o.order_notes || "",
    specialInstructions: o.special_instructions || "",
    isGift: Boolean(o.is_gift),
    giftSelection: o.gift_selection || null,
    giftExtrasTotal: Number(o.gift_extras_total || 0),
    status: o.status,
    orderedVia: o.ordered_via || "website",
    paymentMethod: o.payment_method || "cod",
    mpesaCode: o.mpesa_code || "",
    mpesaPhone: o.mpesa_phone || "",
    mpesaMessage: o.mpesa_message || "",
    date: o.created_at ? new Date(o.created_at).toISOString().split("T")[0] : "",
  }))

  res.json(result)
})

router.delete("/", async (req, res) => {
  const supabase = createClient()
  const ids = req.query.ids as string

  if (!ids) return res.status(400).json({ error: "Missing ids" })

  const idArray = [...new Set(ids.split(",").map((s) => s.trim()).filter(Boolean))]
  if (idArray.length === 0) return res.status(400).json({ error: "No ids provided" })

  const invalid = idArray.filter((id) => !UUID_RE.test(id))
  if (invalid.length > 0) return res.status(400).json({ error: "Invalid order id format" })

  await supabase.from("analytics_events").delete().in("order_id", idArray)
  await supabase.from("order_shipments").delete().in("order_id", idArray)
  await supabase.from("order_items").delete().in("order_id", idArray)

  const { data: deleted, error } = await supabase.from("orders").delete().in("id", idArray).select("id")
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, deleted: deleted?.length ?? 0 })
})

router.patch("/", async (req, res) => {
  const supabase = createClient()
  const body = req.body

  if (!body.id || !body.status) return res.status(400).json({ error: "Missing id or status" })

  const { error } = await supabase.from("orders").update({ status: body.status }).eq("id", body.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router

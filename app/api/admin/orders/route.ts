import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, delivery_locations(name)")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get order items for each order
  const orderIds = (orders || []).map((o) => o.id)
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds.length > 0 ? orderIds : ["none"])

  const itemsByOrder: Record<string, typeof items> = {}
  for (const item of items || []) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    itemsByOrder[item.order_id].push(item)
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
      variation: item.selected_variations?.type || undefined,
    })),
    subtotal: Number(o.subtotal),
    delivery: Number(o.delivery_fee),
    total: Number(o.total),
    location: o.delivery_locations?.name || o.delivery_address || "",
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

  return NextResponse.json(result)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get("ids")

  if (!ids) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

  const idArray = Array.from(
    new Set(
      ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )

  if (idArray.length === 0) return NextResponse.json({ error: "No ids provided" }, { status: 400 })

  const invalid = idArray.filter((id) => !UUID_RE.test(id))
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid order id format` }, { status: 400 })
  }

  // Remove dependent rows first so the orders delete does not trip FK constraints.
  // Tables with order_id FK: order_items, order_shipments, analytics_events.
  const { error: analyticsError } = await supabase
    .from("analytics_events")
    .delete()
    .in("order_id", idArray)
  if (analyticsError) return NextResponse.json({ error: `analytics_events: ${analyticsError.message}` }, { status: 500 })

  const { error: shipmentsError } = await supabase
    .from("order_shipments")
    .delete()
    .in("order_id", idArray)
  if (shipmentsError) return NextResponse.json({ error: `order_shipments: ${shipmentsError.message}` }, { status: 500 })

  const { error: itemsError } = await supabase
    .from("order_items")
    .delete()
    .in("order_id", idArray)
  if (itemsError) return NextResponse.json({ error: `order_items: ${itemsError.message}` }, { status: 500 })

  const { data: deleted, error } = await supabase
    .from("orders")
    .delete()
    .in("id", idArray)
    .select("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, deleted: deleted?.length ?? 0 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const supabase = await createClient()
  const body = await request.json()

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 })
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: body.status })
    .eq("id", body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

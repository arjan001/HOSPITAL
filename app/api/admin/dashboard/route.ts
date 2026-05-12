import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, rateLimit, rateLimitResponse } from "@/lib/security"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()
  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!
  const supabase = await createClient()

  const [productsRes, categoriesRes, ordersRes, popupRes] = await Promise.all([
    supabase.from("products").select("id, name, price, original_price, is_on_offer, offer_percentage, category_id, categories(name)").order("created_at", { ascending: false }),
    supabase.from("categories").select("id").eq("is_active", true),
    supabase.from("orders").select("id, order_number, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("popup_offers").select("id").eq("is_active", true),
  ])

  const products = productsRes.data || []
  const orders = ordersRes.data || []

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const offerProducts = products.filter((p) => p.is_on_offer)

  return NextResponse.json({
    stats: {
      totalProducts: products.length,
      totalCategories: (categoriesRes.data || []).length,
      activeOffers: (popupRes.data || []).length,
      totalOrders: orders.length,
      totalRevenue,
    },
    recentProducts: products.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: (p as Record<string, unknown> & { categories?: { name: string } }).categories?.name || "",
    })),
    offerProducts: offerProducts.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      originalPrice: p.original_price ? Number(p.original_price) : null,
      offerPercentage: p.offer_percentage,
    })),
    recentOrders: orders.slice(0, 5).map((o) => ({
      id: o.id,
      orderNo: o.order_number,
      customer: o.customer_name,
      total: Number(o.total),
      status: o.status,
      date: o.created_at,
    })),
  })
}

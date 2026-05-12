import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, sanitize } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPayHeroEnv, getTransactionStatus } from "@/lib/payhero"

/**
 * GET /api/payments/payhero/status?orderNumber=CC-XXXX
 *
 * Returns the latest payment status for an order. The frontend polls this
 * while the customer is completing the STK prompt on their phone.
 *
 * Resolution order:
 *   1. Read the order row from Supabase. If the callback has already updated
 *      it to `confirmed`, return immediately.
 *   2. Otherwise query PayHero's transaction-status endpoint as a fallback
 *      (useful on local dev where callbacks cannot reach the server).
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 60, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  const { searchParams } = new URL(request.url)
  const orderNumber = sanitize(searchParams.get("orderNumber") || "", 40)
  if (!orderNumber) {
    return NextResponse.json({ error: "orderNumber is required" }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: order } = await supabase
      .from("orders")
      .select("order_no, status, payment_method, mpesa_code, mpesa_phone, mpesa_message, total")
      .eq("order_no", orderNumber)
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.status === "confirmed" && order.payment_method === "mpesa") {
      return NextResponse.json({
        status: "success",
        orderNumber: order.order_no,
        mpesaReceipt: order.mpesa_code,
        phone: order.mpesa_phone,
      })
    }

    // The callback may have already landed with a terminal failure (cancelled
    // by user, insufficient balance, etc.). Surface it to the UI straight
    // away so the modal can stop polling and show the real reason.
    if (order.mpesa_message) {
      try {
        const parsed = JSON.parse(order.mpesa_message)
        const stored = typeof parsed?.status === "string" ? parsed.status.toLowerCase() : ""
        if (stored === "cancelled" || stored === "failed") {
          return NextResponse.json({
            status: stored,
            orderNumber: order.order_no,
            phone: order.mpesa_phone,
            message: parsed?.reason || parsed?.resultDesc || undefined,
          })
        }
      } catch {
        // Ignore malformed payloads; fall back to live polling below.
      }
    }

    // Callback hasn't arrived yet — ask PayHero directly if we have the reference.
    const env = getPayHeroEnv()
    const reference = order.mpesa_code || ""
    if (env && reference) {
      const live = await getTransactionStatus(env, reference)
      if (live) {
        // If PayHero tells us it succeeded but our callback was missed, patch
        // the order now so subsequent polls resolve from the DB.
        if (live.status === "success" && live.mpesaReceipt) {
          await supabase
            .from("orders")
            .update({
              status: "confirmed",
              payment_method: "mpesa",
              mpesa_code: live.mpesaReceipt,
              mpesa_phone: live.phone || order.mpesa_phone,
              mpesa_message: JSON.stringify({
                status: "success",
                resultDesc: live.resultDesc,
                amount: live.amount,
                mpesaReceipt: live.mpesaReceipt,
                source: "status-poll",
                receivedAt: new Date().toISOString(),
              }),
            })
            .eq("order_no", order.order_no)
        }
        return NextResponse.json({
          status: live.status,
          orderNumber: order.order_no,
          mpesaReceipt: live.mpesaReceipt,
          phone: live.phone,
          message: live.resultDesc,
        })
      }
    }

    return NextResponse.json({
      status: "pending",
      orderNumber: order.order_no,
    })
  } catch (error) {
    console.error("[payhero] status error:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}

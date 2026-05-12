import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, sanitize, isValidPhone } from "@/lib/security"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPayHeroEnv, initiateStkPush, normalizePhone } from "@/lib/payhero"

/**
 * POST /api/payments/payhero/stk
 * Body: { orderNumber: string, phone: string, amount: number, customerName?: string }
 *
 * Triggers a PayHero M-Pesa STK push for an order that was already created
 * via /api/orders. Stores the returned CheckoutRequestID on the order so
 * the callback + status polling can correlate responses.
 */
export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 10, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  const env = getPayHeroEnv()
  if (!env) {
    return NextResponse.json(
      { error: "PayHero is not configured. Set PAYHERO_BASIC_AUTH_TOKEN (or PAYHERO_API_USERNAME + PAYHERO_API_PASSWORD) and PAYHERO_CHANNEL_ID. The callback URL is derived from NEXT_PUBLIC_SITE_URL / URL; set PAYHERO_CALLBACK_URL only to override." },
      { status: 503 },
    )
  }

  try {
    const body = await request.json()
    const orderNumber = sanitize(body.orderNumber, 40)
    const phone = sanitize(body.phone, 20)
    const amount = Math.round(Number(body.amount) || 0)
    const customerName = body.customerName ? sanitize(body.customerName, 120) : undefined

    if (!orderNumber || !phone || amount < 1) {
      return NextResponse.json({ error: "orderNumber, phone and amount are required" }, { status: 400 })
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Invalid Kenyan phone number" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_no, total")
      .eq("order_no", orderNumber)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const result = await initiateStkPush(env, {
      amount,
      phone,
      externalReference: orderNumber,
      customerName,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "PayHero rejected the STK push", details: result.raw },
        { status: 502 },
      )
    }

    // Store the CheckoutRequestID in mpesa_code so the callback/status poller
    // can find the order. It will be replaced with the real MpesaReceiptNumber
    // when the callback confirms payment.
    await supabase
      .from("orders")
      .update({
        payment_method: "mpesa",
        mpesa_code: result.checkoutRequestId || result.reference || null,
        mpesa_phone: normalizePhone(phone),
        status: "pending",
      })
      .eq("id", order.id)

    return NextResponse.json({
      success: true,
      orderNumber,
      checkoutRequestId: result.checkoutRequestId,
      reference: result.reference,
      status: result.status,
    })
  } catch (error) {
    console.error("[payhero] stk push error:", error)
    return NextResponse.json({ error: "Failed to initiate STK push" }, { status: 500 })
  }
}

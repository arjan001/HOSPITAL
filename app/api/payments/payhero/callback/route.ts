import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/payments/payhero/callback
 * Webhook called by PayHero once an STK push resolves (success or failure).
 *
 * Expected payload shape:
 * {
 *   "status": true,
 *   "response": {
 *     "Amount": 10,
 *     "CheckoutRequestID": "ws_CO_...",
 *     "ExternalReference": "CC-XXXX",
 *     "MerchantRequestID": "...",
 *     "MpesaReceiptNumber": "SAE3YULR0Y",
 *     "Phone": "+2547...",
 *     "ResultCode": 0,
 *     "ResultDesc": "The service request is processed successfully.",
 *     "Status": "Success"
 *   }
 * }
 */

// Classify the Daraja/PayHero ResultCode + ResultDesc into one of the three
// outcomes our UI cares about: confirmed, cancelled (user pressed cancel),
// or failed (everything else). Insufficient balance is reported as "failed"
// with a friendly message so the customer knows to top up.
function classifyResult(
  resultCode: number,
  statusLabel: string,
  resultDesc: string,
): { status: "success" | "cancelled" | "failed"; reason: string } {
  if (resultCode === 0 || statusLabel === "success") {
    return { status: "success", reason: resultDesc || "Payment received." }
  }
  const desc = (resultDesc || "").toLowerCase()
  // 1032 = Request cancelled by user on their handset.
  if (resultCode === 1032 || statusLabel === "cancelled" || desc.includes("cancel")) {
    return { status: "cancelled", reason: "You cancelled the M-PESA prompt on your phone." }
  }
  // 1 = Insufficient balance on the subscriber M-PESA account.
  if (resultCode === 1 || desc.includes("insufficient") || desc.includes("balance")) {
    return {
      status: "failed",
      reason: "Insufficient M-PESA balance. Top up your M-PESA wallet and try again.",
    }
  }
  // 2001 = Wrong PIN entered.
  if (resultCode === 2001 || desc.includes("wrong") || desc.includes("incorrect pin")) {
    return { status: "failed", reason: "Incorrect M-PESA PIN. Please try again." }
  }
  // 1037 / 1025 = STK push timed out / could not reach subscriber.
  if (resultCode === 1037 || resultCode === 1025 || desc.includes("timeout") || desc.includes("unreachable")) {
    return { status: "failed", reason: "We could not reach your phone. Confirm it is on and retry." }
  }
  return { status: "failed", reason: resultDesc || "Payment failed. Please try again." }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ received: true })
  }

  const response = (body.response || {}) as Record<string, unknown>
  const externalReference = (response.ExternalReference as string) || ""
  const checkoutRequestId = (response.CheckoutRequestID as string) || ""
  const mpesaReceipt = (response.MpesaReceiptNumber as string) || ""
  const resultCode = Number(response.ResultCode ?? -1)
  const statusLabel = String(response.Status || "").toLowerCase()
  const resultDesc = (response.ResultDesc as string) || ""
  const phone = (response.Phone as string) || ""
  const amount = typeof response.Amount === "number" ? (response.Amount as number) : undefined

  const outcome = classifyResult(resultCode, statusLabel, resultDesc)
  const isSuccess = outcome.status === "success"

  try {
    const supabase = createAdminClient()

    // Locate the order: prefer the external reference (our order_no), fall
    // back to matching on the CheckoutRequestID we stashed during initiation.
    let orderQuery = supabase
      .from("orders")
      .select("id, order_no, mpesa_message")
      .limit(1)

    if (externalReference) {
      orderQuery = orderQuery.eq("order_no", externalReference)
    } else if (checkoutRequestId) {
      orderQuery = orderQuery.eq("mpesa_code", checkoutRequestId)
    } else {
      return NextResponse.json({ received: true })
    }

    const { data: order } = await orderQuery.maybeSingle()
    if (!order) return NextResponse.json({ received: true })

    const update: Record<string, unknown> = {
      payment_method: "mpesa",
      mpesa_phone: phone || undefined,
      mpesa_message: JSON.stringify({
        status: outcome.status,
        reason: outcome.reason,
        resultCode,
        resultDesc,
        amount,
        mpesaReceipt,
        checkoutRequestId,
        receivedAt: new Date().toISOString(),
      }),
    }

    if (isSuccess) {
      update.mpesa_code = mpesaReceipt || checkoutRequestId
      update.status = "confirmed"
    } else {
      // Leave mpesa_code pointing at the CheckoutRequestID so polling still
      // finds the order, but surface the failure through mpesa_message.
      if (!mpesaReceipt && checkoutRequestId) update.mpesa_code = checkoutRequestId
    }

    await supabase.from("orders").update(update).eq("id", order.id)
  } catch (error) {
    console.error("[payhero] callback error:", error)
  }

  // Always acknowledge so PayHero does not retry indefinitely.
  return NextResponse.json({ received: true })
}

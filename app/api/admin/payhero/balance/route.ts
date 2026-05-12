import { NextRequest, NextResponse } from "next/server"
import { rateLimit, rateLimitResponse, requireAuth } from "@/lib/security"
import { getPayHeroEnv, getWalletBalance, isWalletBalance } from "@/lib/payhero"

/**
 * GET /api/admin/payhero/balance
 * Returns the PayHero wallet balances for the admin dashboard.
 *
 * Reads two wallets in parallel:
 *   - service_wallet: funds PayHero draws fees from (gates STK pushes)
 *   - payment_wallet: customer payments available for withdrawal
 *
 * Admin-only. When PayHero returns an error we forward its message so the
 * operator can act on it (e.g. "merchant has insufficient balance").
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 30, windowSeconds: 60 })
  if (!rl.success) return rateLimitResponse()

  const auth = await requireAuth()
  if (!auth.authenticated) return auth.response!

  const env = getPayHeroEnv()
  if (!env) {
    return NextResponse.json(
      { configured: false, error: "PayHero not configured" },
      { status: 200 },
    )
  }

  const [service, payment] = await Promise.all([
    getWalletBalance(env, "service_wallet"),
    getWalletBalance(env, "payment_wallet"),
  ])

  const serviceOk = isWalletBalance(service)
  const paymentOk = isWalletBalance(payment)

  if (!serviceOk && !paymentOk) {
    return NextResponse.json(
      {
        configured: true,
        error: service.error || payment.error || "Failed to read wallet balance from PayHero",
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    configured: true,
    currency: "KES",
    serviceWallet: serviceOk
      ? { balance: service.balance }
      : { error: service.error },
    paymentWallet: paymentOk
      ? { balance: payment.balance }
      : { error: payment.error },
    // Back-compat: older UI reads `balance` as the primary (service wallet).
    balance: serviceOk ? service.balance : paymentOk ? payment.balance : 0,
    channelId: env.channelId,
  })
}

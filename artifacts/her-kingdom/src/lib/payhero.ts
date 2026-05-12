// PayHero integration runs server-side via the API server.
// This stub exists so any legacy import does not break the frontend bundle.

export interface PayHeroEnv {
  username?: string
  password?: string
  channelId: number
  walletId?: number
  callbackUrl: string
  authHeader: string
}

export interface StkPushResult {
  success: boolean
  status?: string
  reference?: string
  checkoutRequestId?: string
  raw: unknown
  error?: string
}

export interface TransactionStatusResult {
  status: string
  amount?: number
  mpesaReceipt?: string
  phone?: string
  externalReference?: string
  resultDesc?: string
  raw: unknown
}

export interface WalletBalance {
  balance: number
  channelId?: number
  channelName?: string
  walletType?: "service_wallet" | "payment_wallet"
  raw: unknown
}

export interface WalletBalanceError {
  error: string
  status?: number
  raw?: unknown
}

export type WalletType = "service_wallet" | "payment_wallet"

export function resolvePayHeroCallbackUrl(): string | null { return null }
export function getPayHeroEnv(): PayHeroEnv | null { return null }
export function normalizePhone(input: string): string { return input }
export async function initiateStkPush(_env: PayHeroEnv, _input: unknown): Promise<StkPushResult> {
  return { success: false, raw: null, error: "PayHero runs server-side only" }
}
export async function getTransactionStatus(_env: PayHeroEnv, _ref: string): Promise<TransactionStatusResult | null> { return null }
export async function getWalletBalance(_env: PayHeroEnv, _type?: WalletType): Promise<WalletBalance | WalletBalanceError> {
  return { error: "PayHero runs server-side only" }
}
export function isWalletBalance(v: WalletBalance | WalletBalanceError): v is WalletBalance {
  return typeof (v as WalletBalance).balance === "number"
}

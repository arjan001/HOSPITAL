/**
 * Soft-reservation availability (BL #8) — on-hand minus Postgres reserved qty.
 */

export type StockLineInput = {
  sku: string
  productName?: string
  onHand: number
  safetyStock?: number
  location?: string
}

export type AvailabilityLine = StockLineInput & {
  productName: string
  reserved: number
  available: number
  canAllocate: boolean
}

export function computeAvailability(
  stock: StockLineInput[],
  reservedBySku: Record<string, number>,
): AvailabilityLine[] {
  return stock.map((s) => {
    const held = reservedBySku[s.sku] ?? 0
    const available = Math.max(0, s.onHand - held)
    return {
      ...s,
      productName: s.productName ?? s.sku,
      reserved: held,
      available,
      canAllocate: available > 0,
    }
  })
}

export function canReserveSku(
  stock: StockLineInput[],
  reservedBySku: Record<string, number>,
  sku: string,
  quantity: number,
): { ok: boolean; available: number; need: number } {
  const need = Math.max(1, Math.round(quantity))
  const row = computeAvailability(stock, reservedBySku).find((a) => a.sku === sku)
  const available = row?.available ?? 0
  return { ok: available >= need, available, need }
}

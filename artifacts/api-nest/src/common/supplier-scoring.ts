/**
 * Supplier ranking for procurement decisions (BL #7).
 * Inputs mirror CMS sourcing types — passed from admin UI.
 */

export type SupplierInput = {
  id: string
  name: string
  tier: "preferred" | "approved" | "trial" | "blocked"
  verification: "verified" | "pending" | "unverified"
  leadTimeDays: number
  moq: number
  rating: number
  categories?: string[]
}

export type QuoteInput = {
  supplierId: string
  unitCost: number
  sku?: string
}

export type InventoryInput = {
  sku: string
  productName?: string
  onHand: number
  safetyStock: number
  unitCost?: number
}

export type ScoredSupplier = {
  supplierId: string
  supplierName: string
  score: number
  rank: number
  unitCostEstimate: number | null
  currency: string
  moq: number
  leadTimeDays: number
  rationale: string
}

const TIER_SCORE: Record<SupplierInput["tier"], number> = {
  preferred: 28,
  approved: 20,
  trial: 10,
  blocked: 0,
}

const VERIFY_SCORE: Record<SupplierInput["verification"], number> = {
  verified: 15,
  pending: 8,
  unverified: 0,
}

export function scoreSuppliersForSku(
  sku: string,
  suggestedQty: number,
  suppliers: SupplierInput[],
  quotes: QuoteInput[] = [],
  inventory?: InventoryInput,
): ScoredSupplier[] {
  const inv = inventory?.sku === sku ? inventory : undefined
  const skuQuotes = quotes.filter((q) => !q.sku || q.sku === sku)

  const scored = suppliers
    .filter((s) => s.tier !== "blocked")
    .map((s) => {
      const parts: string[] = []
      let score = TIER_SCORE[s.tier] + VERIFY_SCORE[s.verification]
      parts.push(`${s.tier} tier`, s.verification)

      const ratingPts = Math.round(Math.min(5, Math.max(0, s.rating)) * 4)
      score += ratingPts
      if (ratingPts > 0) parts.push(`rating ${s.rating}/5`)

      const lead = s.leadTimeDays ?? 7
      if (lead <= 7) {
        score += 12
        parts.push("fast lead time")
      } else if (lead <= 14) {
        score += 8
      } else {
        score += Math.max(0, 8 - Math.floor((lead - 14) / 7))
        parts.push(`${lead}d lead`)
      }

      const moq = s.moq ?? 1
      if (moq <= suggestedQty) {
        score += 10
        parts.push("MOQ fits")
      } else if (moq <= suggestedQty * 1.5) {
        score += 4
        parts.push("MOQ slightly above qty")
      } else {
        score -= 8
        parts.push(`MOQ ${moq} > need ${suggestedQty}`)
      }

      const supQuotes = skuQuotes.filter((q) => q.supplierId === s.id && q.unitCost > 0)
      let unitCostEstimate: number | null = null
      if (supQuotes.length > 0) {
        unitCostEstimate = Math.round(
          supQuotes.reduce((a, q) => a + q.unitCost, 0) / supQuotes.length,
        )
        const allCosts = skuQuotes.map((q) => q.unitCost).filter((c) => c > 0)
        const avg = allCosts.reduce((a, b) => a + b, 0) / allCosts.length
        if (unitCostEstimate <= avg) {
          score += 15
          parts.push("competitive quote")
        } else {
          score += 8
          parts.push("quoted")
        }
      } else if (inv?.unitCost) {
        unitCostEstimate = inv.unitCost
        score += 5
        parts.push("inventory cost baseline")
      }

      if (inv && inv.onHand < inv.safetyStock) {
        score += 5
        parts.push("stock gap urgency")
      }

      return {
        supplierId: s.id,
        supplierName: s.name,
        score: Math.max(0, Math.min(100, Math.round(score))),
        rank: 0,
        unitCostEstimate,
        currency: "KES",
        moq,
        leadTimeDays: lead,
        rationale: parts.join(" · "),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  return scored
}

export function priorityFromQty(qty: number): "low" | "normal" | "high" | "urgent" {
  if (qty >= 80) return "urgent"
  if (qty >= 30) return "high"
  if (qty >= 10) return "normal"
  return "low"
}

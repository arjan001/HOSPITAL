/**
 * Stage 4 smoke checks — no DATABASE_URL required.
 */
import { describe, expect, it } from "vitest"
import { scoreSuppliersForSku } from "./common/supplier-scoring"

describe("supplier scoring (Stage 4.3)", () => {
  it("ranks preferred verified supplier ahead of trial", () => {
    const ranked = scoreSuppliersForSku(
      "sku-1",
      50,
      [
        { id: "a", name: "A", tier: "trial", verification: "pending", leadTimeDays: 14, moq: 10, rating: 3 },
        { id: "b", name: "B", tier: "preferred", verification: "verified", leadTimeDays: 5, moq: 10, rating: 4.5 },
      ],
      [{ supplierId: "b", unitCost: 100, sku: "sku-1" }],
    )
    expect(ranked[0]?.supplierId).toBe("b")
  })
})

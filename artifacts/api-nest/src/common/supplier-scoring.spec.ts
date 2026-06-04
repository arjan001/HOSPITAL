import { describe, expect, it } from "vitest"
import { priorityFromQty, scoreSuppliersForSku } from "./supplier-scoring"

describe("supplier-scoring", () => {
  it("assigns priority from quantity", () => {
    expect(priorityFromQty(100)).toBe("urgent")
    expect(priorityFromQty(5)).toBe("low")
  })

  it("ranks verified preferred supplier highest", () => {
    const rows = scoreSuppliersForSku(
      "PARA-500",
      50,
      [
        {
          id: "a",
          name: "Preferred Co",
          tier: "preferred",
          verification: "verified",
          leadTimeDays: 5,
          moq: 10,
          rating: 5,
        },
        {
          id: "b",
          name: "Trial Co",
          tier: "trial",
          verification: "unverified",
          leadTimeDays: 21,
          moq: 100,
          rating: 2,
        },
      ],
      [{ supplierId: "a", unitCost: 100, sku: "PARA-500" }],
    )
    expect(rows[0]?.supplierId).toBe("a")
    expect(rows[0]?.rank).toBe(1)
  })
})

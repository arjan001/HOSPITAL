import { describe, expect, it } from "vitest"
import { canReserveSku, computeAvailability } from "./inventory-availability"

describe("computeAvailability", () => {
  it("subtracts reserved units from on-hand", () => {
    const lines = computeAvailability(
      [{ sku: "A", onHand: 10 }, { sku: "B", onHand: 5 }],
      { A: 3, B: 5 },
    )
    expect(lines.find((l) => l.sku === "A")).toMatchObject({
      reserved: 3,
      available: 7,
      canAllocate: true,
    })
    expect(lines.find((l) => l.sku === "B")).toMatchObject({
      reserved: 5,
      available: 0,
      canAllocate: false,
    })
  })

  it("never reports negative availability", () => {
    const lines = computeAvailability([{ sku: "X", onHand: 2 }], { X: 99 })
    expect(lines[0].available).toBe(0)
    expect(lines[0].canAllocate).toBe(false)
  })
})

describe("canReserveSku", () => {
  it("allows when enough stock remains", () => {
    expect(
      canReserveSku([{ sku: "M", onHand: 8 }], { M: 2 }, "M", 5),
    ).toEqual({ ok: true, available: 6, need: 5 })
  })

  it("rejects when reservation would oversell", () => {
    expect(
      canReserveSku([{ sku: "M", onHand: 8 }], { M: 7 }, "M", 2),
    ).toEqual({ ok: false, available: 1, need: 2 })
  })
})

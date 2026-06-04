import { describe, expect, it } from "vitest"
import { parseMedicationsFromText } from "./rx-extraction"

describe("parseMedicationsFromText", () => {
  it("extracts lines with dosage and frequency", () => {
    const text = `
      Dr. Kamau
      Patient: Jane Doe
      1. Metformin 500mg — 1 tab BD after meals
      2. Amlodipine 5mg — 1 tab OD
    `
    const drugs = parseMedicationsFromText(text)
    expect(drugs.length).toBeGreaterThanOrEqual(2)
    expect(drugs.some((d) => /metformin/i.test(d.name))).toBe(true)
    expect(drugs.some((d) => /amlodipine/i.test(d.name))).toBe(true)
  })

  it("ignores header lines without doses", () => {
    const drugs = parseMedicationsFromText("Shaniid RX\nNairobi\nThank you")
    expect(drugs).toHaveLength(0)
  })
})

import { describe, expect, it } from "vitest"
import { inquiryNotificationLevel, normalizeCategory } from "./contact-inquiries.module"

describe("normalizeCategory", () => {
  it("keeps known categories as-is", () => {
    for (const c of ["general", "prescription", "order", "delivery", "product", "billing", "complaint", "partnership", "other"]) {
      expect(normalizeCategory(c)).toBe(c)
    }
  })

  it("falls back to 'general' for unknown / empty / non-string input", () => {
    expect(normalizeCategory("not-a-category")).toBe("general")
    expect(normalizeCategory("")).toBe("general")
    expect(normalizeCategory(undefined)).toBe("general")
    expect(normalizeCategory(null)).toBe("general")
    expect(normalizeCategory(42)).toBe("general")
  })
})

describe("inquiryNotificationLevel", () => {
  it("escalates complaints to alert", () => {
    expect(inquiryNotificationLevel("complaint")).toBe("alert")
  })

  it("uses info for every non-complaint category", () => {
    for (const c of ["general", "prescription", "order", "delivery", "product", "billing", "partnership", "other"]) {
      expect(inquiryNotificationLevel(c)).toBe("info")
    }
  })
})

/**
 * Smoke tests for partner organization tenancy (no live Clerk/DB required for core checks).
 */
import { describe, expect, it } from "vitest"
import { verifyPartnerToken, signPartnerToken } from "./common/partner-token"

describe("partner token scoping", () => {
  it("embeds partnerId and type in signed token", () => {
    const token = signPartnerToken({
      pid: "pacc_test",
      partnerType: "logistics",
      partnerId: "ptr_org_a",
    })
    const claims = verifyPartnerToken(token)
    expect(claims?.partnerId).toBe("ptr_org_a")
    expect(claims?.partnerType).toBe("logistics")
  })

  it("rejects tampered partnerId in token", () => {
    const token = signPartnerToken({
      pid: "pacc_test",
      partnerType: "logistics",
      partnerId: "ptr_org_a",
    })
    const [payload, sig] = token.split(".")
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    const claims = JSON.parse(json) as { partnerId: string }
    claims.partnerId = "ptr_org_b"
    const tamperedPayload = Buffer.from(JSON.stringify(claims), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
    const tampered = `${tamperedPayload}.${sig}`
    expect(verifyPartnerToken(tampered)).toBeNull()
  })
})

describe("partner org role helpers", () => {
  const OWNER_ROLES = ["owner", "admin"]
  const COURIER_ROLES = ["rider", "dispatcher", "member"]

  function isCourierRole(role: string) {
    return COURIER_ROLES.includes(role) && !OWNER_ROLES.includes(role)
  }

  it("courier roles exclude owners", () => {
    expect(isCourierRole("rider")).toBe(true)
    expect(isCourierRole("owner")).toBe(false)
    expect(isCourierRole("admin")).toBe(false)
  })
})

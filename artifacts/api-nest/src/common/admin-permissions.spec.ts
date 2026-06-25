import { describe, it, expect } from "vitest"
import {
  PERMISSION_CATALOG,
  ROLE_DEFAULT_PERMISSIONS,
  defaultPermsForRole,
  effectivePermissions,
  hasPermission,
} from "./admin-permissions"

/**
 * Contract test — keeps the server-side RBAC model in lockstep with the
 * frontend permission catalog and seed roles in
 * `her-kingdom/src/components/admin/roles-permissions.tsx`. The frontend values
 * are mirrored here verbatim; if either side changes without the other, this
 * test fails and surfaces the drift the architect flagged (incorrect effective
 * access from out-of-sync role defaults).
 */

// Mirror of the frontend PERMISSION_GROUPS flat id set (ALL_PERMS).
const FRONTEND_CATALOG = [
  "products.view",
  "products.edit",
  "products.delete",
  "categories.manage",
  "orders.view",
  "orders.update",
  "payments.view",
  "payments.refund",
  "rx.view",
  "rx.verify",
  "rx.recommend",
  "consult.handle",
  "cms.banners",
  "cms.pages",
  "cms.footer",
  "cms.settings",
  "inventory.view",
  "inventory.edit",
  "sourcing.view",
  "sourcing.manage",
  "delivery.manage",
  "video.host",
  "chat.respond",
  "whatsapp.send",
  "marketing.broadcast",
  "users.manage",
  "roles.manage",
  "integrations.manage",
  "analytics.view",
  "pharmacy.manage",
  "pharmacy.staff",
]

// Mirror of the frontend SEED_ROLES permission arrays (Owner = super_admin
// wildcard, so it is asserted separately).
const FRONTEND_ROLE_PERMS: Record<string, string[]> = {
  pharmacist: [
    "rx.view",
    "rx.verify",
    "rx.recommend",
    "consult.handle",
    "products.view",
    "orders.view",
    "inventory.view",
    "chat.respond",
  ],
  doctor: [
    "consult.handle",
    "rx.view",
    "rx.recommend",
    "products.view",
    "video.host",
    "chat.respond",
  ],
  fulfillment: [
    "orders.view",
    "orders.update",
    "products.view",
    "products.edit",
    "inventory.view",
    "inventory.edit",
    "delivery.manage",
  ],
  marketing: ["cms.banners", "cms.pages", "cms.footer", "analytics.view", "marketing.broadcast"],
}

const sorted = (a: string[]) => [...a].sort()

describe("admin permission catalog", () => {
  it("matches the frontend permission catalog exactly", () => {
    expect(sorted([...PERMISSION_CATALOG])).toEqual(sorted(FRONTEND_CATALOG))
  })

  it("has no duplicate identifiers", () => {
    expect(new Set(PERMISSION_CATALOG).size).toBe(PERMISSION_CATALOG.length)
  })

  it("every role-default permission is a member of the catalog (no typos / orphans)", () => {
    const catalog = new Set<string>(PERMISSION_CATALOG)
    for (const [role, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      for (const p of perms) {
        if (p === "*") continue // super_admin wildcard
        expect(catalog.has(p), `${role} grants unknown permission "${p}"`).toBe(true)
      }
    }
  })
})

describe("role default permissions mirror the frontend seed roles", () => {
  it("super_admin holds the wildcard", () => {
    expect(ROLE_DEFAULT_PERMISSIONS.super_admin).toEqual(["*"])
    expect(effectivePermissions("super_admin", [])).toEqual(["*"])
  })

  for (const [role, expected] of Object.entries(FRONTEND_ROLE_PERMS)) {
    it(`${role} matches the frontend seed exactly`, () => {
      expect(sorted(defaultPermsForRole(role))).toEqual(sorted(expected))
    })
  }
})

describe("effectivePermissions", () => {
  it("falls back to role defaults when no explicit permissions are stored", () => {
    expect(sorted(effectivePermissions("doctor", []))).toEqual(
      sorted(FRONTEND_ROLE_PERMS.doctor),
    )
    expect(sorted(effectivePermissions("doctor", null))).toEqual(
      sorted(FRONTEND_ROLE_PERMS.doctor),
    )
  })

  it("uses explicit stored permissions when present (non-super roles)", () => {
    expect(effectivePermissions("doctor", ["rx.view"])).toEqual(["rx.view"])
  })

  it("super_admin always resolves to the wildcard regardless of stored perms", () => {
    expect(effectivePermissions("super_admin", ["rx.view"])).toEqual(["*"])
  })
})

describe("hasPermission", () => {
  it("wildcard satisfies any requirement", () => {
    expect(hasPermission(["*"], "anything.at.all")).toBe(true)
    expect(hasPermission(["*"], ["orders.view", "orders.update"])).toBe(true)
  })

  it("matches when any one of the required permissions is held", () => {
    expect(hasPermission(["orders.view"], ["orders.view", "orders.update"])).toBe(true)
    expect(hasPermission(["rx.view"], ["orders.view", "orders.update"])).toBe(false)
  })

  it("empty requirement is always satisfied", () => {
    expect(hasPermission([], [])).toBe(true)
  })
})

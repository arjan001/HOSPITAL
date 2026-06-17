/**
 * Single source of truth for admin role → permission resolution.
 *
 * Both the auth service (issuing tokens / CRUD) and the AdminGuard (enforcing
 * access on every request) resolve permissions through these helpers so the
 * runtime never drifts between "what a token claims" and "what the guard
 * enforces". super_admin always holds the wildcard.
 */

export const ADMIN_ROLES = [
  "super_admin",
  "pharmacy_admin",
  "pharmacist",
  "doctor",
  "fulfillment",
  "marketing",
] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

/**
 * The full permission catalog — the canonical set of permission identifiers.
 * MUST stay in lockstep with the frontend catalog in
 * `her-kingdom/src/components/admin/roles-permissions.tsx` (`PERMISSION_GROUPS`).
 * A contract test asserts every role default below is a member of this set so
 * the two halves of the RBAC model can never silently drift.
 */
export const PERMISSION_CATALOG = [
  // Catalog & products
  "products.view",
  "products.edit",
  "products.delete",
  "categories.manage",
  // Sales
  "orders.view",
  "orders.update",
  "payments.view",
  "payments.refund",
  // Pharmacy / clinical
  "rx.view",
  "rx.verify",
  "rx.recommend",
  "consult.handle",
  // CMS
  "cms.banners",
  "cms.pages",
  "cms.footer",
  "cms.settings",
  // Inventory & sourcing
  "inventory.view",
  "inventory.edit",
  "sourcing.view",
  "sourcing.manage",
  "delivery.manage",
  // Communications
  "video.host",
  "chat.respond",
  "whatsapp.send",
  "marketing.broadcast",
  // Administration
  "users.manage",
  "roles.manage",
  "integrations.manage",
  "analytics.view",
  // Internal pharmacy network
  "pharmacy.manage",
  "pharmacy.staff",
] as const

/**
 * Server-side default permission sets per role. These mirror the frontend seed
 * roles (`SEED_ROLES` in roles-permissions.tsx) *exactly* — because the Admin
 * Accounts UI creates/edits accounts by role (without per-permission editing),
 * these defaults ARE the effective privileges the AdminGuard enforces. Keeping
 * them identical to the frontend keeps page-level nav gating and per-route
 * `@RequirePerm` enforcement consistent. super_admin always holds the wildcard.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["*"],
  pharmacy_admin: [
    "pharmacy.manage",
    "pharmacy.staff",
    "rx.view",
    "rx.verify",
    "orders.view",
    "orders.update",
    "products.view",
    "inventory.view",
    "delivery.manage",
    "chat.respond",
  ],
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
  marketing: ["cms.banners", "cms.pages", "cms.footer", "analytics.view"],
}

export function defaultPermsForRole(role: string): string[] {
  return ROLE_DEFAULT_PERMISSIONS[role] ?? []
}

/** Resolve a stored permission list + role into the effective permission set. */
export function effectivePermissions(role: string, stored: string[] | null | undefined): string[] {
  if (role === "super_admin") return ["*"]
  const s = stored ?? []
  return s.length ? s : defaultPermsForRole(role)
}

/** True when `perms` satisfies `required` (wildcard, or any one of the list). */
export function hasPermission(perms: string[], required: string | string[]): boolean {
  if (perms.includes("*")) return true
  const req = Array.isArray(required) ? required : [required]
  if (req.length === 0) return true
  return req.some((r) => perms.includes(r))
}

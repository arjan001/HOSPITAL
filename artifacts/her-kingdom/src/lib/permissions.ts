import { useSyncExternalStore } from "react"
import { cmsStore } from "@/lib/cms-store"
import type { Role, StaffUser } from "@/components/admin/roles-permissions"

/**
 * Lightweight client-side RBAC.
 * Reads roles + staff from cmsStore and resolves "do I have this permission?".
 *
 * Dev override: while we're still in development, the "current user" defaults
 * to the first Owner-role staff (super-admin) so the panel is fully usable.
 * A super-admin can pick "View as role" to preview the panel as another role
 * without losing access — the override is per-browser and never blocks the
 * actual super-admin from anything destructive (it's UI-level only).
 */

const VIEW_AS_KEY = "shaniidrx.admin.viewAsRoleId"
const CURRENT_USER_KEY = "shaniidrx.admin.currentUserId"
// Identity of the actually signed-in admin account (written by the admin login
// page). This is the source of truth for RBAC once a real session exists; the
// cmsStore bootstrap below only applies when no backend session is present.
const ADMIN_SESSION_KEY = "shaniidrx.admin.user"
// Same-tab login/logout can't rely on the cross-tab `storage` event, so the
// login page and logout button dispatch this event to refresh the snapshot.
export const ADMIN_SESSION_EVENT = "shaniidrx:admin-session"

const listeners = new Set<() => void>()
function emit() { listeners.forEach((fn) => fn()) }

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === VIEW_AS_KEY || e.key === CURRENT_USER_KEY || e.key === ADMIN_SESSION_KEY) emit()
  })
  window.addEventListener(ADMIN_SESSION_EVENT, () => {
    cachedSnapshot = snapshot()
    emit()
  })
}

/** Identity persisted by the admin login page after a successful sign-in. */
type AdminSession = { role: string; name: string; email: string; permissions?: string[] }

function readAdminSession(): AdminSession | null {
  const raw = readLocal(ADMIN_SESSION_KEY)
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<AdminSession>
    if (o && typeof o.role === "string" && typeof o.email === "string") {
      return { role: o.role, name: o.name ?? o.email, email: o.email, permissions: o.permissions }
    }
  } catch {
    /* ignore malformed session */
  }
  return null
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  pharmacist: "Pharmacist",
  doctor: "Doctor",
  fulfillment: "Fulfillment",
  marketing: "Marketing",
}
function prettyRole(role: string): string {
  return ROLE_LABELS[role] || role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(key)
}

function writeLocal(key: string, val: string | null) {
  if (typeof window === "undefined") return
  if (val === null) window.localStorage.removeItem(key)
  else window.localStorage.setItem(key, val)
  emit()
}

export type EffectivePermissions = {
  user: StaffUser | null
  role: Role | null
  isSuperAdmin: boolean
  viewAsRoleId: string | null
  permissions: Set<string>
}

// Bootstrap identity used on a fresh browser before roles/staff are persisted
// to cmsStore. Without this, a clean install would lock every action behind
// permission checks even though the panel ships with a seeded Owner.
const BOOTSTRAP_ROLE: Role = {
  id: "role_bootstrap_owner",
  name: "Owner",
  description: "Bootstrap super-admin (no persisted roles found).",
  color: "#3D0814",
  permissions: ["*"],
  builtIn: true,
}
const BOOTSTRAP_USER: StaffUser = {
  id: "user_bootstrap_owner",
  name: "Local Super Admin",
  email: "owner@local",
  roleId: BOOTSTRAP_ROLE.id,
  active: true,
}

function snapshot(): EffectivePermissions {
  // 1. Real signed-in admin account takes precedence over the cmsStore catalog.
  const session = readAdminSession()
  if (session) {
    const isSuperAdmin = session.role === "super_admin"
    const sessionPerms = isSuperAdmin ? ["*"] : session.permissions ?? []
    const baseRole: Role = {
      id: `account:${session.role}`,
      name: prettyRole(session.role),
      description: "Signed-in admin account",
      color: "#3D0814",
      permissions: sessionPerms,
      builtIn: isSuperAdmin,
    }
    const user: StaffUser = {
      id: `account:${session.email}`,
      name: session.name,
      email: session.email,
      roleId: baseRole.id,
      active: true,
    }
    // Super-admins may still preview the panel as another role (resolved
    // against the cmsStore role catalog), without losing their real access.
    const viewAsRoleId = isSuperAdmin ? readLocal(VIEW_AS_KEY) : null
    let effectiveRole: Role = baseRole
    let perms = new Set<string>(sessionPerms)
    if (viewAsRoleId) {
      const vr = cmsStore.get<Role[]>("roles", []).find((r) => r.id === viewAsRoleId)
      if (vr) {
        effectiveRole = vr
        perms = new Set<string>(vr.permissions)
      }
    }
    return { user, role: effectiveRole, isSuperAdmin, viewAsRoleId, permissions: perms }
  }

  // 2. No backend session — fall back to the cmsStore bootstrap (dev convenience).
  const persistedRoles = cmsStore.get<Role[]>("roles", [])
  const persistedStaff = cmsStore.get<StaffUser[]>("staff", [])

  const bootstrapping = persistedRoles.length === 0 || persistedStaff.length === 0
  const roles = bootstrapping ? [BOOTSTRAP_ROLE, ...persistedRoles] : persistedRoles
  const staff = bootstrapping ? [BOOTSTRAP_USER, ...persistedStaff] : persistedStaff

  const currentUserId = readLocal(CURRENT_USER_KEY)
  const user = (currentUserId && staff.find((s) => s.id === currentUserId))
    || staff.find((s) => roles.find((r) => r.id === s.roleId)?.builtIn)
    || staff[0]
    || null

  const baseRole = user ? roles.find((r) => r.id === user.roleId) || null : null
  const isSuperAdmin = !!baseRole?.builtIn

  const viewAsRoleId = isSuperAdmin ? readLocal(VIEW_AS_KEY) : null
  const effectiveRole = viewAsRoleId
    ? roles.find((r) => r.id === viewAsRoleId) || baseRole
    : baseRole

  const perms = new Set<string>(effectiveRole?.permissions || [])
  return { user, role: effectiveRole, isSuperAdmin, viewAsRoleId, permissions: perms }
}

let cachedSnapshot = snapshot()

// Repoll when roles or staff change in cmsStore.
const refresh = () => {
  cachedSnapshot = snapshot()
  emit()
}
if (typeof window !== "undefined") {
  cmsStore.subscribe("roles", refresh)
  cmsStore.subscribe("staff", refresh)
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const getSnapshot = () => cachedSnapshot

export function useEffectivePermissions(): EffectivePermissions {
  // Re-snapshot on each subscription notification (cms or local override changed).
  return useSyncExternalStore(
    (fn) => {
      const off = subscribe(() => {
        cachedSnapshot = snapshot()
        fn()
      })
      return () => off()
    },
    getSnapshot,
    getSnapshot,
  )
}

export function usePermission(permId: string | string[]): boolean {
  const eff = useEffectivePermissions()
  if (eff.isSuperAdmin && !eff.viewAsRoleId) return true
  const ids = Array.isArray(permId) ? permId : [permId]
  if (eff.permissions.has("*")) return true
  return ids.some((id) => eff.permissions.has(id))
}

export function setViewAsRoleId(id: string | null) {
  writeLocal(VIEW_AS_KEY, id)
}

export function setCurrentUserId(id: string | null) {
  writeLocal(CURRENT_USER_KEY, id)
}

export function getCurrentUserId(): string | null {
  return readLocal(CURRENT_USER_KEY)
}

export function getViewAsRoleId(): string | null {
  return readLocal(VIEW_AS_KEY)
}

/**
 * Imperative gate: returns true only if permission is held.
 * Use inside event handlers when you can't use the hook.
 */
export function hasPermission(permId: string): boolean {
  const eff = snapshot()
  if (eff.isSuperAdmin && !eff.viewAsRoleId) return true
  if (eff.permissions.has("*")) return true
  return eff.permissions.has(permId)
}

import type { ReactNode } from "react"
import { createElement, Fragment } from "react"

export function RequirePerm({
  perm,
  children,
  fallback,
  hideWhenDenied = false,
}: {
  perm: string | string[]
  children: ReactNode
  fallback?: ReactNode
  hideWhenDenied?: boolean
}) {
  const ok = usePermission(perm)
  if (ok) return createElement(Fragment, null, children)
  if (hideWhenDenied) return null
  if (fallback !== undefined) return createElement(Fragment, null, fallback)
  return createElement(
    "span",
    {
      className: "inline-flex items-center gap-1 text-[11px] text-muted-foreground italic",
      title: `Requires permission: ${Array.isArray(perm) ? perm.join(" or ") : perm}`,
    },
    "Restricted",
  )
}

"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId } from "@/lib/cms-store"
import {
  useEffectivePermissions,
  setViewAsRoleId,
  setCurrentUserId,
} from "@/lib/permissions"
import { Shield, Plus, Trash2, UserPlus, Pencil, X, Lock, Eye, RotateCcw, CheckCircle2 } from "lucide-react"

export type Role = {
  id: string
  name: string
  description: string
  color: string
  permissions: string[] // permission ids
  builtIn?: boolean
}

export type StaffUser = {
  id: string
  name: string
  email: string
  phone?: string
  roleId: string
  active: boolean
  lastSeen?: string
}

const PERMISSION_GROUPS: { group: string; perms: { id: string; label: string; desc?: string }[] }[] = [
  {
    group: "Catalog",
    perms: [
      { id: "products.view", label: "View products" },
      { id: "products.edit", label: "Edit products" },
      { id: "products.delete", label: "Delete products" },
      { id: "categories.manage", label: "Manage categories" },
    ],
  },
  {
    group: "Sales",
    perms: [
      { id: "orders.view", label: "View orders" },
      { id: "orders.update", label: "Update orders" },
      { id: "payments.view", label: "View payments" },
      { id: "payments.refund", label: "Issue refunds" },
    ],
  },
  {
    group: "Pharmacy",
    perms: [
      { id: "rx.view", label: "View prescriptions" },
      { id: "rx.verify", label: "Verify prescriptions" },
      { id: "rx.recommend", label: "Recommend drugs" },
      { id: "consult.handle", label: "Handle consultations" },
    ],
  },
  {
    group: "Storefront CMS",
    perms: [
      { id: "cms.banners", label: "Manage banners & offers" },
      { id: "cms.pages", label: "Manage custom pages" },
      { id: "cms.footer", label: "Manage footer & links" },
      { id: "cms.settings", label: "Edit website settings" },
    ],
  },
  {
    group: "Operations",
    perms: [
      { id: "inventory.view", label: "View inventory" },
      { id: "inventory.edit", label: "Edit stock & safety levels" },
      { id: "sourcing.view", label: "View sourcing & suppliers" },
      { id: "sourcing.manage", label: "Create POs / approve quotes" },
      { id: "delivery.manage", label: "Manage delivery zones & vendors" },
    ],
  },
  {
    group: "Communications",
    perms: [
      { id: "video.host", label: "Host video consultations", desc: "Allows joining a Daily room as the call owner." },
      { id: "chat.respond", label: "Respond to live chat" },
      { id: "whatsapp.send", label: "Send WhatsApp messages" },
      { id: "marketing.broadcast", label: "Send email / SMS broadcasts" },
    ],
  },
  {
    group: "System",
    perms: [
      { id: "users.manage", label: "Manage staff users" },
      { id: "roles.manage", label: "Manage roles & permissions", desc: "Owner-level access" },
      { id: "integrations.manage", label: "Manage integrations & API keys" },
      { id: "analytics.view", label: "View analytics" },
    ],
  },
]

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.id))

const SEED_ROLES: Role[] = [
  {
    id: "role-owner",
    name: "Owner",
    description: "Full access to everything. Cannot be edited.",
    color: "#3D0814",
    permissions: ALL_PERMS,
    builtIn: true,
  },
  {
    id: "role-pharmacist",
    name: "Pharmacist",
    description: "Verifies prescriptions, runs consultations, recommends drugs.",
    color: "#0E7490",
    permissions: [
      "rx.view",
      "rx.verify",
      "rx.recommend",
      "consult.handle",
      "products.view",
      "orders.view",
      "inventory.view",
      "chat.respond",
    ],
  },
  {
    id: "role-doctor",
    name: "Doctor",
    description: "Conducts patient consultations and writes recommendations.",
    color: "#15803D",
    permissions: [
      "consult.handle",
      "rx.view",
      "rx.recommend",
      "products.view",
      "video.host",
      "chat.respond",
    ],
  },
  {
    id: "role-fulfillment",
    name: "Fulfillment",
    description: "Manages orders, dispatches, and inventory updates.",
    color: "#B45309",
    permissions: [
      "orders.view",
      "orders.update",
      "products.view",
      "products.edit",
      "inventory.view",
      "inventory.edit",
      "delivery.manage",
    ],
  },
  {
    id: "role-marketing",
    name: "Marketing",
    description: "Edits banners, custom pages, footer, and announcements.",
    color: "#6B21A8",
    permissions: ["cms.banners", "cms.pages", "cms.footer", "analytics.view"],
  },
]

const SEED_USERS: StaffUser[] = [
  { id: "u-001", name: "Admin User", email: "admin@shaniidrx.local", roleId: "role-owner", active: true },
  { id: "u-002", name: "Dr. Wanjiku", email: "wanjiku@shaniidrx.local", roleId: "role-doctor", active: true },
  { id: "u-003", name: "Pharm. Otieno", email: "otieno@shaniidrx.local", roleId: "role-pharmacist", active: true },
]

export function AdminRolesPermissions() {
  const [roles, setRoles] = useCmsDoc<Role[]>("roles", SEED_ROLES)
  const [users, setUsers] = useCmsDoc<StaffUser[]>("staff", SEED_USERS)
  const [activeRoleId, setActiveRoleId] = useCmsDoc<string>("roles.activeId", SEED_ROLES[0].id)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [showNewUser, setShowNewUser] = useState(false)
  const eff = useEffectivePermissions()

  const active = useMemo(() => roles.find((r) => r.id === activeRoleId) || roles[0], [roles, activeRoleId])

  const togglePerm = (permId: string) => {
    if (!active || active.builtIn) return
    setRoles((arr) =>
      arr.map((r) => {
        if (r.id !== active.id) return r
        const has = r.permissions.includes(permId)
        return { ...r, permissions: has ? r.permissions.filter((p) => p !== permId) : [...r.permissions, permId] }
      })
    )
  }

  const updateRole = (patch: Partial<Role>) => {
    if (!active || active.builtIn) return
    setRoles((arr) => arr.map((r) => (r.id === active.id ? { ...r, ...patch } : r)))
  }

  const addRole = () => {
    const r: Role = {
      id: newId("role"),
      name: "New role",
      description: "",
      color: "#475569",
      permissions: [],
    }
    setRoles((arr) => [...arr, r])
    setActiveRoleId(r.id)
  }

  const deleteRole = (id: string) => {
    const r = roles.find((x) => x.id === id)
    if (!r || r.builtIn) return
    if (!confirm(`Delete role "${r.name}"? Users with this role will be unassigned.`)) return
    setRoles((arr) => arr.filter((x) => x.id !== id))
    setUsers((arr) => arr.map((u) => (u.roleId === id ? { ...u, roleId: "role-owner" } : u)))
    if (activeRoleId === id) setActiveRoleId(roles[0]?.id || "")
  }

  const saveUser = (u: StaffUser, isNew = false) => {
    if (isNew) setUsers((arr) => [...arr, u])
    else setUsers((arr) => arr.map((x) => (x.id === u.id ? u : x)))
    setEditingUser(null)
    setShowNewUser(false)
  }

  const deleteUser = (id: string) => {
    if (!confirm("Remove this staff user?")) return
    setUsers((arr) => arr.filter((u) => u.id !== id))
  }

  const memberCount = (roleId: string) => users.filter((u) => u.roleId === roleId).length

  return (
    <AdminShell title="Roles & Permissions">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define what each staff member can access. Built-in <strong>Owner</strong> role is locked.
          </p>
        </div>

        {/* Dev tool: preview the panel as another role without losing super-admin access. */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3 sm:p-4 flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md grid place-items-center bg-background border border-border">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Preview panel as another role</p>
              <p className="text-[11px] text-muted-foreground">
                Dev only — overrides UI gating in your browser. Super-admin actions remain available.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={eff.viewAsRoleId || ""}
              onChange={(e) => setViewAsRoleId(e.target.value || null)}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background"
              disabled={!eff.isSuperAdmin}
            >
              <option value="">— My own role ({eff.role?.name || "—"}) —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <select
              value={eff.user?.id || ""}
              onChange={(e) => setCurrentUserId(e.target.value || null)}
              className="h-9 px-2 text-sm rounded-md border border-border bg-background"
              title="Switch the active staff identity"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {roles.find((r) => r.id === u.roleId)?.name || "—"}</option>
              ))}
            </select>
            {eff.viewAsRoleId && (
              <button
                aria-label="Reset view"
                onClick={() => setViewAsRoleId(null)}
                className="h-9 px-3 rounded-md text-xs font-semibold border border-border hover:bg-secondary inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          {/* Roles list */}
          <aside className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Roles</h2>
              <button onClick={addRole} aria-label="New role" className="h-7 w-7 rounded-md hover:bg-secondary flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setActiveRoleId(r.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 border-b border-border last:border-b-0 transition-colors ${
                    active?.id === r.id ? "bg-foreground text-background" : "hover:bg-secondary"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="flex-1">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {r.name}
                      {r.builtIn && <Lock className="h-3 w-3 opacity-60" />}
                    </p>
                    <p className={`text-[11px] ${active?.id === r.id ? "opacity-70" : "text-muted-foreground"}`}>
                      {memberCount(r.id)} member{memberCount(r.id) === 1 ? "" : "s"}
                    </p>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Role detail */}
          <div className="rounded-lg border border-border bg-background p-5 space-y-5">
            {active && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {active.builtIn ? (
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {active.name}
                        <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary">
                          Built-in
                        </span>
                      </h2>
                    ) : (
                      <input
                        aria-label="Role name"
                        placeholder="Role name"
                        className="text-xl font-bold w-full bg-transparent border-b border-transparent hover:border-border focus:border-foreground outline-none"
                        value={active.name}
                        onChange={(e) => updateRole({ name: e.target.value })}
                      />
                    )}
                    <input
                      aria-label="Role description"
                      className="text-sm w-full bg-transparent text-muted-foreground outline-none"
                      placeholder="Describe what this role does…"
                      value={active.description}
                      onChange={(e) => updateRole({ description: e.target.value })}
                      disabled={active.builtIn}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {!active.builtIn && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Autosaved
                      </span>
                    )}
                    <input
                      type="color"
                      value={active.color}
                      onChange={(e) => updateRole({ color: e.target.value })}
                      disabled={active.builtIn}
                      className="h-8 w-10 rounded border border-border bg-background cursor-pointer disabled:opacity-50"
                      title="Role colour"
                    />
                    {!active.builtIn && (
                      <button onClick={() => deleteRole(active.id)} className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10 flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((g) => (
                    <div key={g.group} className="rounded-md border border-border overflow-hidden">
                      <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        {g.group}
                      </div>
                      <div className="divide-y divide-border">
                        {g.perms.map((p) => {
                          const has = active.permissions.includes(p.id)
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center justify-between px-3 py-2 ${active.builtIn ? "opacity-80" : "hover:bg-muted/20 cursor-pointer"}`}
                            >
                              <div>
                                <p className="text-sm font-medium">{p.label}</p>
                                {p.desc && <p className="text-[11px] text-muted-foreground">{p.desc}</p>}
                              </div>
                              <input
                                type="checkbox"
                                checked={has}
                                onChange={() => togglePerm(p.id)}
                                disabled={active.builtIn}
                                className="h-4 w-4 accent-foreground"
                              />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Staff users */}
        <div className="rounded-lg border border-border bg-background p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold flex items-center gap-2">
                Staff users
                <span className="text-xs font-medium text-muted-foreground">({users.length})</span>
              </h2>
              <p className="text-xs text-muted-foreground">Assign each member a role to grant them permissions.</p>
            </div>
            <button onClick={() => setShowNewUser(true)} className="px-3 h-9 rounded-md text-sm font-semibold bg-foreground text-background inline-flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" /> Invite user
            </button>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">Role</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const role = roles.find((r) => r.id === u.roleId)
                  return (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{u.name}</td>
                      <td className="px-3 py-2 text-xs">{u.email}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: `${role?.color}1F`, color: role?.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: role?.color }} />
                          {role?.name || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[11px] font-semibold ${u.active ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {u.active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setEditingUser(u)} className="h-7 w-7 rounded hover:bg-secondary inline-flex items-center justify-center">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteUser(u.id)} className="h-7 w-7 rounded hover:bg-destructive/10 text-destructive inline-flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(editingUser || showNewUser) && (
        <UserModal
          roles={roles}
          existing={editingUser}
          onClose={() => {
            setEditingUser(null)
            setShowNewUser(false)
          }}
          onSave={saveUser}
        />
      )}
    </AdminShell>
  )
}

function UserModal({
  roles,
  existing,
  onClose,
  onSave,
}: {
  roles: Role[]
  existing: StaffUser | null
  onClose: () => void
  onSave: (u: StaffUser, isNew: boolean) => void
}) {
  const [draft, setDraft] = useState<StaffUser>(
    existing || { id: newId("u"), name: "", email: "", phone: "", roleId: roles[1]?.id || roles[0]?.id || "", active: true }
  )
  const isNew = !existing

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-2xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isNew ? "Invite staff user" : "Edit staff user"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Name</label>
            <input className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Email</label>
            <input type="email" className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Phone</label>
            <input className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm" value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Role</label>
            <select className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm" value={draft.roleId} onChange={(e) => setDraft({ ...draft, roleId: e.target.value })}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20">
            <span className="text-sm font-medium">Account active</span>
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className="h-5 w-5 accent-foreground" />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button onClick={onClose} className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft, isNew)}
            disabled={!draft.name || !draft.email}
            className="px-4 h-9 rounded-md text-sm font-semibold bg-foreground text-background disabled:opacity-40"
          >
            {isNew ? "Invite" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

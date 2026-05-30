import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ShieldCheck,
  UserPlus,
  Loader2,
  AlertCircle,
  KeyRound,
  Power,
  X,
  Pencil,
} from "lucide-react"
import { adminAuthHeaders } from "@/lib/api-client"

/**
 * Admin Accounts — manages the *real* login accounts in Postgres (`admin_users`)
 * via the NestJS backend `/api/v2/admin/users` CRUD. These are the credentials
 * that can actually sign in to the admin panel, distinct from the cmsStore role
 * catalog on the "Roles & Permissions" page (which defines the permission menu).
 *
 * Gated by `users.manage` in the nav; the backend independently re-checks the
 * acting admin's permission on every request.
 */

const WINE = "#3D0814"

type AdminAccount = {
  id: string
  email: string
  name: string
  role: string
  permissions: string[]
  active: boolean
  lastLoginAt: string | null
  createdAt: string | null
}

const ROLES: { value: string; label: string; hint: string }[] = [
  { value: "super_admin", label: "Super Admin", hint: "Full access to everything" },
  { value: "pharmacist", label: "Pharmacist", hint: "Catalog, orders, prescriptions" },
  { value: "doctor", label: "Doctor", hint: "Consultations & prescription review" },
  { value: "fulfillment", label: "Fulfillment", hint: "Orders & dispatch" },
  { value: "marketing", label: "Marketing", hint: "CMS, campaigns, analytics" },
]

function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label || role
}

function fmtDate(v: string | null): string {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v2/admin/users${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...adminAuthHeaders(),
      ...(init.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message || `Request failed (${res.status})`)
  }
  return data as T
}

export function AdminAccounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<AdminAccount | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const rows = await adminApi<AdminAccount[]>("")
      setAccounts(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load admin accounts")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeSuperAdmins = useMemo(
    () => accounts.filter((a) => a.role === "super_admin" && a.active).length,
    [accounts],
  )

  async function toggleActive(acc: AdminAccount) {
    try {
      await adminApi<AdminAccount>(`/${acc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !acc.active }),
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update account")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold" style={{ color: WINE }}>
            <ShieldCheck className="h-6 w-6" />
            Admin Accounts
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Sign-in accounts for the admin panel. Each account has a role that controls what it can
            access. Manage the role catalogue itself under Roles &amp; Permissions.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: WINE }}
        >
          <UserPlus className="h-4 w-4" />
          New account
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading accounts…
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No admin accounts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{acc.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{acc.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: "rgba(61,8,20,0.08)", color: WINE }}
                      >
                        {roleLabel(acc.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {acc.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(acc.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(acc)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => toggleActive(acc)}
                          disabled={acc.role === "super_admin" && acc.active && activeSuperAdmins <= 1}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            acc.role === "super_admin" && acc.active && activeSuperAdmins <= 1
                              ? "Cannot deactivate the last active super-admin"
                              : acc.active
                                ? "Deactivate"
                                : "Activate"
                          }
                        >
                          <Power className="h-3.5 w-3.5" />
                          {acc.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <AccountDialog
          account={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={async () => {
            setCreating(false)
            setEditing(null)
            await load()
          }}
        />
      )}
    </div>
  )
}

function AccountDialog({
  account,
  onClose,
  onSaved,
}: {
  account: AdminAccount | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const isEdit = !!account
  const [name, setName] = useState(account?.name ?? "")
  const [email, setEmail] = useState(account?.email ?? "")
  const [role, setRole] = useState(account?.role ?? "pharmacist")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr("")
    setSaving(true)
    try {
      if (isEdit && account) {
        const patch: Record<string, unknown> = { name: name.trim(), role }
        if (password) patch.password = password
        await adminApi<AdminAccount>(`/${account.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        })
      } else {
        await adminApi<AdminAccount>("", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), email: email.trim(), role, password }),
        })
      }
      await onSaved()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save account")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold" style={{ color: WINE }}>
            {isEdit ? "Edit account" : "New admin account"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          {err && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {err}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#6B0F1A]"
              placeholder="Dr. Amina Yusuf"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEdit}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#6B0F1A] disabled:bg-muted/50 disabled:text-muted-foreground"
              placeholder="name@shaniidrx.com"
            />
            {isEdit && (
              <span className="mt-1 block text-xs text-muted-foreground">
                Email can't be changed after creation.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#6B0F1A]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-sm font-medium text-foreground">
              <KeyRound className="h-3.5 w-3.5" />
              {isEdit ? "Reset password" : "Password"}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#6B0F1A]"
              placeholder={isEdit ? "Leave blank to keep current" : "At least 8 characters"}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: WINE }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

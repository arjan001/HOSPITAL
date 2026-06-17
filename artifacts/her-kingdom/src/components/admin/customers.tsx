"use client"

import { useMemo, useState, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { AdminShell } from "./admin-shell"
import {
  Search,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  CheckCircle2,
  Building2,
  Users,
  Loader2,
  X,
} from "lucide-react"
import { cmsStore } from "@/lib/cms-store"
import {
  deleteCustomer,
  readCustomers,
  updateCustomer,
  writeCustomers,
} from "@/lib/use-customer-mirror"
import {
  useAdminCustomersDirectory,
  type AdminDirectoryRow,
} from "@/lib/admin-customers-directory"
import {
  adminUpdatePartnerAccount,
  adminUpdatePartnerMember,
  type PartnerType,
} from "@/lib/partners-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const WINE = "#3D0814"
const ACCENT_ORANGE = "#F97316"
const PEACH = "#F2DCC8"

function fmtDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

function fmtRelative(iso: string): string {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return iso
  const diffMs = Date.now() - then
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return fmtDate(iso)
}

function typeBadge(row: AdminDirectoryRow) {
  if (row.accountType === "partner" && row.partnerType) {
    const map: Record<PartnerType, { label: string; bg: string; fg: string }> = {
      supplier: { label: "Supplier partner", bg: "#EDE9FE", fg: "#5B21B6" },
      clinic: { label: "Clinic partner", bg: "#DCFCE7", fg: "#166534" },
      logistics: { label: "Logistics partner", bg: "#DBEAFE", fg: "#1D4ED8" },
    }
    const m = map[row.partnerType]
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ background: m.bg, color: m.fg }}
      >
        <Building2 className="h-3 w-3" />
        {m.label}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: "#FFE5C8", color: "#9A3412" }}
    >
      <Users className="h-3 w-3" />
      Customer
    </span>
  )
}

function statusBadge(status: string | undefined) {
  const disabled = status === "disabled"
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: disabled ? "#FEE2E2" : "#DCFCE7",
        color: disabled ? "#B91C1C" : "#15803D",
      }}
    >
      {disabled ? "Disabled" : "Active"}
    </span>
  )
}

function sourceBadge(source: AdminDirectoryRow["source"]) {
  const map: Record<AdminDirectoryRow["source"], { label: string; bg: string; fg: string }> = {
    email: { label: "Email", bg: "#FFE5C8", fg: "#9A3412" },
    google: { label: "Google", bg: "#DBEAFE", fg: "#1D4ED8" },
    phone: { label: "Phone", bg: "#DCFCE7", fg: "#166534" },
    unknown: { label: "Other", bg: "#F1F5F9", fg: "#475569" },
  }
  const m = map[source] ?? map.unknown
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  )
}

type ActionMenuProps = {
  row: AdminDirectoryRow
  onView: () => void
  onEdit: () => void
  onToggleDisable: () => void
  onDelete: () => void
}

function ActionMenu({ row, onView, onEdit, onToggleDisable, onDelete }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const disabled = row.status === "disabled"

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuWidth = 192
    const menuHeight = 180
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
    const top = Math.max(8, rect.top - menuHeight - 6)
    setMenuPos({ top, left })
  }, [open])

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-[180]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="fixed z-[190] w-48 rounded-lg border bg-white shadow-xl py-1 text-sm"
              style={{ top: menuPos.top, left: menuPos.left, borderColor: PEACH }}
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setOpen(false)
                  onView()
                }}
              >
                <Eye className="h-3.5 w-3.5" /> View details
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setOpen(false)
                  onEdit()
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit info
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setOpen(false)
                  onToggleDisable()
                }}
              >
                {disabled ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-700" /> Enable account
                  </>
                ) : (
                  <>
                    <Ban className="h-3.5 w-3.5 text-amber-700" /> Disable account
                  </>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-700 flex items-center gap-2 border-t mt-1"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
                onClick={() => {
                  setOpen(false)
                  onDelete()
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove from list
              </button>
            </div>
          </>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-gray-50"
        style={{ borderColor: PEACH }}
        aria-label="Actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </>
  )
}

export function AdminCustomers() {
  const { rows, stats, isLoading, error, refresh } = useAdminCustomersDirectory()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "customer" | "partner">("all")
  const [detail, setDetail] = useState<AdminDirectoryRow | null>(null)
  const [editing, setEditing] = useState<AdminDirectoryRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminDirectoryRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState("")

  const [editForm, setEditForm] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  })

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === "customer" && r.accountType === "partner") return false
      if (filter === "partner" && r.accountType !== "partner") return false
      if (!s) return true
      return [r.fullName, r.email, r.phone, r.partnerOrgName, r.partnerRole, r.partnerType].some(
        (v) => (v || "").toLowerCase().includes(s),
      )
    })
  }, [rows, search, filter])

  const openEdit = (row: AdminDirectoryRow) => {
    setFormErr("")
    setEditing(row)
    setEditForm({
      fullName: row.fullName,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      notes: row.notes ?? "",
    })
  }

  const persistCmsRow = (row: AdminDirectoryRow, patch: Partial<AdminDirectoryRow>) => {
    if (row.partnerOnly) {
      const all = readCustomers()
      const created = {
        ...row,
        ...patch,
        partnerOnly: undefined,
      }
      writeCustomers([created as AdminDirectoryRow, ...all.filter((c) => c.id !== row.id)])
    } else {
      updateCustomer(row.id, patch)
    }
    cmsStore.set("customers", readCustomers())
  }

  const toggleDisable = async (row: AdminDirectoryRow) => {
    setBusy(true)
    setFormErr("")
    try {
      const disable = row.status !== "disabled"
      if (row.partnerAccountId && row.partnerType) {
        await adminUpdatePartnerAccount(row.partnerType, row.partnerAccountId, {
          status: disable ? "suspended" : "active",
        })
      }
      if (row.partnerMemberId) {
        await adminUpdatePartnerMember(row.partnerMemberId, {
          status: disable ? "suspended" : "active",
        })
      }
      persistCmsRow(row, {
        status: disable ? "disabled" : "active",
        disabledAt: disable ? new Date().toISOString() : null,
        portalAccountStatus: disable ? "suspended" : "active",
      })
      refresh()
      if (detail?.rowKey === row.rowKey) {
        setDetail({ ...row, status: disable ? "disabled" : "active" })
      }
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Could not update status")
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    setBusy(true)
    setFormErr("")
    try {
      const patch = {
        fullName: editForm.fullName.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        notes: editForm.notes.trim(),
      }
      if (editing.partnerAccountId && editing.partnerType) {
        await adminUpdatePartnerAccount(editing.partnerType, editing.partnerAccountId, {
          displayName: patch.fullName || patch.email,
        })
      }
      if (editing.partnerMemberId) {
        await adminUpdatePartnerMember(editing.partnerMemberId, {
          displayName: patch.fullName || patch.email,
        })
      }
      persistCmsRow(editing, patch)
      refresh()
      setEditing(null)
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Could not save changes")
    } finally {
      setBusy(false)
    }
  }

  const confirmRemove = () => {
    if (!confirmDelete) return
    if (!confirmDelete.partnerOnly) {
      deleteCustomer(confirmDelete.id)
      cmsStore.set("customers", readCustomers())
    }
    refresh()
    setConfirmDelete(null)
    if (detail?.rowKey === confirmDelete.rowKey) setDetail(null)
  }

  const exportCsv = () => {
    const header = [
      "id",
      "fullName",
      "email",
      "phone",
      "accountType",
      "partnerType",
      "partnerRole",
      "status",
      "source",
      "createdAt",
      "lastSeenAt",
    ]
    const lines = rows.map((c) =>
      header.map((k) => JSON.stringify((c as unknown as Record<string, unknown>)[k] ?? "")).join(","),
    )
    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shaniid-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell title="Customers & Users">
      <div className="space-y-5">
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: PEACH, background: "#FFFBF5", color: WINE }}
        >
          <strong>Clerk sync:</strong> Shoppers and partners appear in your{" "}
          <a
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noreferrer"
            className="underline font-semibold"
          >
            Clerk Dashboard
          </a>{" "}
          when they sign up through Clerk using the same app as{" "}
          <code className="text-xs bg-white/80 px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> and{" "}
          <code className="text-xs bg-white/80 px-1 rounded">CLERK_SECRET_KEY</code>. Organizations
          are created when a partner submits company registration on a portal.
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi label="Total users" value={stats.total} icon={<UserPlus className="h-4 w-4" />} />
          <Kpi label="Customers" value={stats.customers} icon={<Users className="h-4 w-4" />} />
          <Kpi label="Partners" value={stats.partners} icon={<Building2 className="h-4 w-4" />} />
          <Kpi label="Disabled" value={stats.disabled} icon={<Ban className="h-4 w-4" />} />
          <Kpi label="New (24h)" value={stats.last24} icon={<ShieldCheck className="h-4 w-4" />} />
        </div>

        <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, org, role…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border bg-white text-sm outline-none"
              style={{ borderColor: PEACH }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "customer", "partner"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border"
                style={{
                  borderColor: PEACH,
                  background: filter === f ? WINE : "white",
                  color: filter === f ? "white" : WINE,
                }}
              >
                {f === "all" ? "All" : f === "customer" ? "Customers" : "Partners"}
              </button>
            ))}
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="h-9 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 border bg-white"
              style={{ borderColor: PEACH, color: WINE }}
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>

        {formErr && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {formErr}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Partner data could not be loaded — showing local customer mirror only.
          </div>
        )}

        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: PEACH }}>
          {isLoading && rows.length === 0 ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: WINE }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: WINE }} />
              <p className="font-semibold" style={{ color: WINE }}>
                {search ? "No users match that search" : "No users yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="text-left text-xs uppercase tracking-wider"
                    style={{ background: "#FFFBF5", color: WINE }}
                  >
                    <th className="px-4 py-3 font-bold">User</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Contact</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Signup</th>
                    <th className="px-4 py-3 font-bold">Last seen</th>
                    <th className="px-4 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.rowKey}
                      className="border-t hover:bg-[#FFFBF5]/60"
                      style={{ borderColor: "rgba(0,0,0,0.05)" }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: ACCENT_ORANGE, color: "white" }}
                            >
                              {(c.firstName || c.fullName || c.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold" style={{ color: WINE }}>
                              {c.fullName || "(unnamed)"}
                            </div>
                            {c.partnerOrgName && c.accountType === "partner" && (
                              <div className="text-[11px] text-muted-foreground">{c.partnerOrgName}</div>
                            )}
                            {c.partnerRole && (
                              <div className="text-[10px] text-muted-foreground capitalize">
                                Role: {c.partnerRole}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{typeBadge(c)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Mail className="h-3 w-3 opacity-60" /> {c.email}
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="h-3 w-3 opacity-60" /> {c.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3">{sourceBadge(c.source)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtRelative(c.lastSeenAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          row={c}
                          onView={() => setDetail(c)}
                          onEdit={() => openEdit(c)}
                          onToggleDisable={() => void toggleDisable(c)}
                          onDelete={() => setConfirmDelete(c)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <Modal onClose={() => setDetail(null)} title="User details">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {typeBadge(detail)}
              {statusBadge(detail.status)}
              {sourceBadge(detail.source)}
            </div>
            <DetailRow label="Full name" value={detail.fullName || "—"} />
            <DetailRow label="Email" value={detail.email || "—"} />
            <DetailRow label="Phone" value={detail.phone || "—"} />
            <DetailRow label="Clerk user ID" value={detail.id} mono />
            {detail.accountType === "partner" && (
              <>
                <DetailRow label="Partner type" value={detail.partnerType ?? "—"} />
                <DetailRow label="Organization" value={detail.partnerOrgName ?? "—"} />
                <DetailRow label="Partner ID" value={detail.partnerId ?? "—"} mono />
                <DetailRow label="Org role" value={detail.partnerRole ?? "—"} />
                <DetailRow label="Clerk org ID" value={detail.clerkOrgId ?? "—"} mono />
                <DetailRow label="Portal account status" value={detail.portalAccountStatus ?? "—"} />
              </>
            )}
            <DetailRow label="Joined" value={fmtDate(detail.createdAt)} />
            <DetailRow label="Last seen" value={fmtRelative(detail.lastSeenAt)} />
            <DetailRow label="Sign-ins" value={String(detail.signupCount)} />
            {detail.notes && <DetailRow label="Notes" value={detail.notes} />}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  openEdit(detail)
                  setDetail(null)
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void toggleDisable(detail)}
              >
                {detail.status === "disabled" ? "Enable" : "Disable"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title="Edit user">
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="First name">
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Display name">
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="Admin notes">
              <Textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Partner portal names sync to the partner account when applicable. Clerk profile
              changes must be made in the Clerk Dashboard.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void saveEdit()}
                style={{ background: WINE, color: "white" }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} title="Remove from directory?">
          <p className="text-sm text-muted-foreground">
            Remove <strong>{confirmDelete.fullName || confirmDelete.email}</strong> from this admin
            list?
            {confirmDelete.accountType === "partner"
              ? " Partner portal access is controlled separately — use Disable to suspend portal login."
              : " Their Clerk account stays active unless you ban them in Clerk."}
            {confirmDelete.partnerOnly &&
              " This row only exists from partner records and will disappear on next refresh if not saved locally."}
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmRemove}
              className="text-white"
              style={{ background: "#B91C1C" }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        </Modal>
      )}
    </AdminShell>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[10vh] sm:items-center sm:pt-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="admin-user-modal-title" className="text-lg font-bold" style={{ color: WINE }}>
            {title}
          </h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm mt-0.5 ${mono ? "font-mono text-xs break-all" : ""}`} style={{ color: WINE }}>
        {value}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 flex items-center gap-3" style={{ borderColor: PEACH }}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(249,115,22,0.12)", color: ACCENT_ORANGE }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold" style={{ color: WINE }}>{value}</div>
      </div>
    </div>
  )
}

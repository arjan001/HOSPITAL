"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle2,
  Trash2,
  Loader2,
  X,
  Users,
  Building2,
  Mail,
  Phone,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  deletePartnerDirectoryItem,
  fetchPartnerDirectorySummary,
  patchPartnerDirectoryItem,
  type PartnerDirectoryKey,
  type PartnerDirectorySummary,
} from "@/lib/partners-directory-client"
import { adminUpdatePartnerAccount, type PartnerType } from "@/lib/partners-client"

const WINE = "#3D0814"
const PEACH = "#F2DCC8"

export type PartnerOrgActionConfig = {
  directoryKey: PartnerDirectoryKey
  partnerType: PartnerType
  entityLabel: string
  activeStatus: string
  suspendedStatus: string
  getDisplayName: (partner: Record<string, unknown>) => string
  kycFields: { key: string; label: string }[]
}

type Props = {
  partner: Record<string, unknown> & { id: string; status?: string }
  config: PartnerOrgActionConfig
  onPatched: (patch: Record<string, unknown>) => void
  onDeleted: (id: string) => void
}

export function PartnerOrgActionButton({ partner, config, onPatched, onDeleted }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<"details" | "delete" | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [summary, setSummary] = useState<PartnerDirectorySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const btnRef = useRef<HTMLButtonElement>(null)

  const status = String(partner.status ?? "pending")
  const isSuspended = status === config.suspendedStatus

  useLayoutEffect(() => {
    if (!menuOpen || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuWidth = 200
    const menuHeight = 168
    setMenuPos({
      top: Math.max(8, rect.top - menuHeight - 6),
      left: Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8),
    })
  }, [menuOpen])

  const loadSummary = async () => {
    setLoading(true)
    setErr("")
    try {
      const data = await fetchPartnerDirectorySummary(config.directoryKey, partner.id)
      setSummary(data)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load partner details")
    } finally {
      setLoading(false)
    }
  }

  const openDetails = () => {
    setMenuOpen(false)
    setModal("details")
    setSummary(null)
    void loadSummary()
  }

  const toggleStatus = async () => {
    setLoading(true)
    setErr("")
    const nextStatus = isSuspended ? config.activeStatus : config.suspendedStatus
    try {
      await patchPartnerDirectoryItem(config.directoryKey, partner.id, { status: nextStatus })
      const sum = summary ?? (await fetchPartnerDirectorySummary(config.directoryKey, partner.id))
      await Promise.all(
        sum.portalAccounts.map((a) =>
          adminUpdatePartnerAccount(config.partnerType, a.id, {
            status: nextStatus === config.suspendedStatus ? "suspended" : "active",
          }),
        ),
      )
      onPatched({ status: nextStatus })
      setModal(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update status")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    setLoading(true)
    setErr("")
    try {
      await deletePartnerDirectoryItem(config.directoryKey, partner.id)
      onDeleted(partner.id)
      setModal(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not delete partner")
    } finally {
      setLoading(false)
    }
  }

  const menu =
    menuOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <div className="fixed inset-0 z-[180]" onClick={() => setMenuOpen(false)} aria-hidden />
            <div
              className="fixed z-[190] w-[200px] rounded-lg border bg-white shadow-xl py-1 text-sm"
              style={{ top: menuPos.top, left: menuPos.left, borderColor: PEACH }}
              role="menu"
            >
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                onClick={openDetails}
              >
                <Eye className="h-3.5 w-3.5" /> View & manage
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setMenuOpen(false)
                  void toggleStatus()
                }}
              >
                {isSuspended ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-700" /> Activate
                  </>
                ) : (
                  <>
                    <Ban className="h-3.5 w-3.5 text-amber-700" /> Suspend
                  </>
                )}
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-700 flex items-center gap-2 border-t mt-1"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
                onClick={() => {
                  setMenuOpen(false)
                  setModal("delete")
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete permanently
              </button>
            </div>
          </>,
          document.body,
        )
      : null

  const detailsModal =
    modal === "details" && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-[8vh] sm:items-center"
            onClick={() => setModal(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: WINE }}>
                    {config.getDisplayName(partner)}
                  </h3>
                  <p className="text-xs text-muted-foreground">{config.entityLabel} · {partner.id}</p>
                </div>
                <button type="button" onClick={() => setModal(null)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

              {loading && !summary ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: WINE }} />
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                      style={{
                        background: isSuspended ? "#FEE2E2" : "#DCFCE7",
                        color: isSuspended ? "#B91C1C" : "#15803D",
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  <Detail label="Email" value={String(partner.email ?? "—")} icon={<Mail className="h-3.5 w-3.5" />} />
                  <Detail label="Phone" value={String(partner.phone ?? partner.contactPhone ?? "—")} icon={<Phone className="h-3.5 w-3.5" />} />
                  <Detail label="Portal code" value={String(partner.portalCode ?? "—")} mono />

                  {summary && (
                    <>
                      <div className="rounded-lg border p-3" style={{ borderColor: PEACH }}>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Organization employees
                        </p>
                        <p className="text-2xl font-bold" style={{ color: WINE }}>
                          {summary.employees.total}
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({summary.employees.active} active)
                          </span>
                        </p>
                        {Object.keys(summary.employees.byRole).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.entries(summary.employees.byRole).map(([role, n]) => (
                              <span key={role} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                                {role}: {n}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {summary.fleetSize > 0 && (
                        <Detail
                          label="Fleet vehicles"
                          value={String(summary.fleetSize)}
                          icon={<Truck className="h-3.5 w-3.5" />}
                        />
                      )}

                      {summary.clerkOrgId && (
                        <Detail label="Clerk org ID" value={summary.clerkOrgId} mono />
                      )}

                      <div className="rounded-lg border p-3" style={{ borderColor: PEACH }}>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> KYC checklist
                        </p>
                        <ul className="space-y-1.5">
                          {config.kycFields.map(({ key, label }) => {
                            const ok = Boolean(
                              summary.kyc?.[key] ?? (summary.partner as Record<string, unknown>)[key],
                            )
                            return (
                              <li key={key} className="flex items-center gap-2 text-xs">
                                {ok ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                )}
                                <span>{label}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>

                      {summary.portalAccounts.length > 0 && (
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Portal logins</p>
                          {summary.portalAccounts.map((a) => (
                            <p key={a.id} className="text-xs text-gray-600">
                              {a.email} · <span className="capitalize">{a.status}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => void toggleStatus()}
                    >
                      {isSuspended ? "Activate partner" : "Suspend partner"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  const deleteModal =
    modal === "delete" && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModal(null)}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2" style={{ color: WINE }}>
                Delete {config.entityLabel.toLowerCase()}?
              </h3>
              <p className="text-sm text-muted-foreground">
                Permanently remove <strong>{config.getDisplayName(partner)}</strong> from the directory.
                Portal accounts will be suspended. This cannot be undone from the admin list — legacy CMS copies
                are cleared so the partner will not reappear.
              </p>
              {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
              <div className="flex justify-end gap-2 mt-5">
                <Button variant="outline" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={loading}
                  className="text-white"
                  style={{ background: "#B91C1C" }}
                  onClick={() => void confirmDelete()}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md border hover:bg-gray-50"
        style={{ borderColor: PEACH }}
        aria-label="Partner actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
      {detailsModal}
      {deleteModal}
    </>
  )
}

function Detail({
  label,
  value,
  mono,
  icon,
}: {
  label: string
  value: string
  mono?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">{icon} {label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs break-all" : ""}`} style={{ color: WINE }}>
        {value}
      </p>
    </div>
  )
}

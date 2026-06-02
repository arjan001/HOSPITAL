/**
 * partner-portal-panel.tsx — Admin panel for partner portal accounts: review
 * self-signup applications and manage portal login accounts (invite / status /
 * resend invite), parameterized by partner type. Wired to /api/v2/partners/admin/*.
 */
import { useState } from "react"
import {
  useAdminPartnerApplications,
  useAdminPartnerAccounts,
  adminApproveApplication,
  adminRejectApplication,
  adminInvitePartner,
  type PartnerType,
} from "@/lib/partners-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Inbox, UserPlus, CheckCircle2, XCircle, Mail, Clock, Loader2 } from "lucide-react"

const WINE = "#3D0814"
const ORANGE = "#F97316"

function fmt(ts: string | null): string {
  if (!ts) return "—"
  try {
    return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

export function PartnerPortalPanel({ type }: { type: PartnerType }) {
  const apps = useAdminPartnerApplications(type, "pending")
  const accounts = useAdminPartnerAccounts(type)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState("")
  const [err, setErr] = useState("")

  // Manual invite form
  const [showInvite, setShowInvite] = useState(false)
  const [invEmail, setInvEmail] = useState("")
  const [invName, setInvName] = useState("")
  const [invPartnerId, setInvPartnerId] = useState("")
  const [inviting, setInviting] = useState(false)

  const approve = async (id: string) => {
    setErr("")
    setBusyId(id)
    try {
      await adminApproveApplication(type, id)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to approve")
    } finally {
      setBusyId(null)
    }
  }

  const reject = async () => {
    if (!rejecting) return
    setErr("")
    setBusyId(rejecting)
    try {
      await adminRejectApplication(type, rejecting, rejectNotes.trim() || undefined)
      setRejecting(null)
      setRejectNotes("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to reject")
    } finally {
      setBusyId(null)
    }
  }

  const sendInvite = async () => {
    setErr("")
    if (!invEmail.trim() || !invPartnerId.trim()) {
      setErr("Email and partner ID are required")
      return
    }
    setInviting(true)
    try {
      await adminInvitePartner({
        partnerType: type,
        partnerId: invPartnerId.trim(),
        email: invEmail.trim(),
        displayName: invName.trim() || invEmail.trim(),
      })
      setShowInvite(false)
      setInvEmail("")
      setInvName("")
      setInvPartnerId("")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send invite")
    } finally {
      setInviting(false)
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      active: { bg: "#DCFCE7", fg: "#15803D", label: "Active" },
      invited: { bg: "#FEF3C7", fg: "#B45309", label: "Invited" },
      suspended: { bg: "#FEE2E2", fg: "#B91C1C", label: "Suspended" },
    }
    const v = map[s] ?? { bg: "#F3F4F6", fg: "#6B7280", label: s }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: v.bg, color: v.fg }}>
        {v.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{err}</div>
      )}

      {/* Applications */}
      <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Inbox className="h-4 w-4" style={{ color: WINE }} />
            Pending applications
            {apps.data && apps.data.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: ORANGE }}>
                {apps.data.length}
              </span>
            )}
          </h3>
          <Button size="sm" onClick={() => setShowInvite(true)} className="text-white gap-1.5" style={{ background: WINE }}>
            <UserPlus className="h-3.5 w-3.5" /> Invite manually
          </Button>
        </div>

        {apps.isLoading ? (
          <div className="py-10 text-center text-gray-400">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </div>
        ) : apps.error ? (
          <div className="py-10 text-center text-sm text-red-600">Could not load applications.</div>
        ) : !apps.data || apps.data.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No pending applications</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <th className="text-left py-2.5 px-5">Organisation</th>
                <th className="text-left py-2.5 px-5 hidden md:table-cell">Contact</th>
                <th className="text-left py-2.5 px-5 hidden lg:table-cell">Submitted</th>
                <th className="text-right py-2.5 px-5">Decision</th>
              </tr>
            </thead>
            <tbody>
              {apps.data.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <p className="font-semibold text-gray-800">{a.orgName}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                    {a.message && <p className="text-xs text-gray-500 mt-1 max-w-md">{a.message}</p>}
                  </td>
                  <td className="py-3 px-5 hidden md:table-cell">
                    <p className="text-gray-700">{a.contactName}</p>
                    <p className="text-xs text-gray-400">{a.phone || "—"}</p>
                  </td>
                  <td className="py-3 px-5 hidden lg:table-cell text-gray-500">{fmt(a.createdAt)}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === a.id}
                        onClick={() => approve(a.id)}
                        className="text-white gap-1"
                        style={{ background: "#15803D" }}
                      >
                        {busyId === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === a.id}
                        onClick={() => {
                          setRejecting(a.id)
                          setRejectNotes("")
                        }}
                        className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Portal accounts */}
      <section className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Mail className="h-4 w-4" style={{ color: WINE }} />
            Portal accounts
          </h3>
        </div>
        {accounts.isLoading ? (
          <div className="py-10 text-center text-gray-400">
            <Loader2 className="h-5 w-5 mx-auto animate-spin" />
          </div>
        ) : accounts.error ? (
          <div className="py-10 text-center text-sm text-red-600">Could not load accounts.</div>
        ) : !accounts.data || accounts.data.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No portal accounts yet</p>
            <p className="text-xs mt-1">Approve an application or invite a partner to create one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-400 font-semibold uppercase tracking-wider">
                <th className="text-left py-2.5 px-5">Account</th>
                <th className="text-left py-2.5 px-5 hidden md:table-cell">Status</th>
                <th className="text-left py-2.5 px-5 hidden lg:table-cell">Last login</th>
                <th className="text-left py-2.5 px-5 hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.map((acc) => (
                <tr key={acc.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <p className="font-semibold text-gray-800">{acc.displayName}</p>
                    <p className="text-xs text-gray-400">{acc.email}</p>
                  </td>
                  <td className="py-3 px-5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      {statusBadge(acc.status)}
                      {acc.status === "invited" && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" /> awaiting accept
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5 hidden lg:table-cell text-gray-500">{fmt(acc.lastLoginAt)}</td>
                  <td className="py-3 px-5 hidden lg:table-cell text-gray-500">{fmt(acc.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Optionally add a note for your records.</p>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason for rejection (optional)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              onClick={reject}
              disabled={busyId === rejecting}
              className="text-white"
              style={{ background: "#B91C1C" }}
            >
              {busyId === rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a {type} to the portal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Email</label>
              <Input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="partner@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Display name</label>
              <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Organisation name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Partner ID (entity record ID)</label>
              <Input
                value={invPartnerId}
                onChange={(e) => setInvPartnerId(e.target.value)}
                placeholder="e.g. the supplier/clinic record ID"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Scopes the account to its data. Use the entity record ID from the directory above.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvite} disabled={inviting} className="text-white" style={{ background: WINE }}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

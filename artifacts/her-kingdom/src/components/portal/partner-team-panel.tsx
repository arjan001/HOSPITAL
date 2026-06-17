"use client"

import { useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  invitePartnerMember,
  usePartnerMembers,
  usePartnerMe,
  type PartnerType,
} from "@/lib/partners-client"

const WINE = "#3D0814"

export function PartnerTeamPanel({
  type,
  memberRole: memberRoleProp,
}: {
  type: PartnerType
  memberRole?: string
}) {
  const { data: me } = usePartnerMe()
  const memberRole = memberRoleProp ?? me?.memberRole
  const canManage = memberRole === "owner" || memberRole === "admin"
  const { data: members, mutate } = usePartnerMembers(type, canManage)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState(type === "logistics" ? "rider" : "member")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)

  if (!canManage) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setBusy(true)
    try {
      await invitePartnerMember(type, {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        role,
      })
      setEmail("")
      setDisplayName("")
      await mutate()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Invitation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4" style={{ borderColor: "#E5E7EB" }}>
      <div>
        <h3 className="text-sm font-bold" style={{ color: WINE }}>
          Team & invitations
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Invite employees via Clerk. They receive an email to join your organization — no manual
          rider entry needed.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Employee email</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-9"
            placeholder="courier@company.com"
          />
        </div>
        <div>
          <Label className="text-xs">Display name (optional)</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {type === "logistics" ? (
              <>
                <option value="rider">Courier / rider</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="admin">Admin</option>
              </>
            ) : (
              <>
                <option value="member">Staff</option>
                <option value="admin">Admin</option>
              </>
            )}
          </select>
        </div>
        {err && (
          <p className="sm:col-span-2 text-xs text-red-600 rounded-md bg-red-50 border border-red-100 px-3 py-2">
            {err}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy} className="h-9 gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Send invitation
          </Button>
        </div>
      </form>

      {(members?.length ?? 0) > 0 && (
        <ul className="divide-y text-sm">
          {members!.map((m) => (
            <li key={m.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{m.displayName || m.email}</p>
                <p className="text-[11px] text-muted-foreground">{m.email}</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">
                {m.status === "invited" ? "Invited" : m.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { useUser, useClerk } from "@clerk/react"
import { AccountShell } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"
import { useMe, apiNest } from "@/lib/api-nest"
import { mutate } from "swr"
import {
  ShieldCheck, Lock, Bell, Smartphone, Eye, EyeOff, CheckCircle2,
  AlertTriangle, Loader2, LogOut, Key,
} from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const CREAM = "#FFFBF5"

function SectionCard({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: PEACH_BORDER }}>
      <div className="px-6 py-4 border-b" style={{ borderColor: PEACH_BORDER, background: CREAM }}>
        <h3 className="font-semibold text-sm" style={{ color: WINE }}>{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40"
      style={{ background: checked ? WINE : "#D1D5DB" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  )
}

export default function AccountSecurityPage() {
  const { data: me } = useMe()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()

  const [showPw, setShowPw] = useState(false)
  const [pwData, setPwData] = useState({ current: "", next: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const securityPrefs = (me?.profile?.security ?? {}) as { twoFactorEnabled?: boolean; loginAlerts?: boolean }
  const [twoFa, setTwoFa] = useState(securityPrefs.twoFactorEnabled ?? false)
  const [loginAlerts, setLoginAlerts] = useState(securityPrefs.loginAlerts ?? true)
  const [prefSaving, setPrefSaving] = useState(false)

  const user = {
    name: me?.fullName ?? clerkUser?.fullName ?? "You",
    email: me?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "",
    phone: me?.phone,
    avatarUrl: me?.avatarUrl ?? clerkUser?.imageUrl,
  }

  async function changePassword() {
    if (!pwData.current || !pwData.next) {
      setPwMsg({ ok: false, text: "Please fill in all password fields." })
      return
    }
    if (pwData.next.length < 8) {
      setPwMsg({ ok: false, text: "New password must be at least 8 characters." })
      return
    }
    if (pwData.next !== pwData.confirm) {
      setPwMsg({ ok: false, text: "New passwords do not match." })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      if (clerkUser?.updatePassword) {
        await clerkUser.updatePassword({ currentPassword: pwData.current, newPassword: pwData.next })
        setPwMsg({ ok: true, text: "Password updated successfully." })
        setPwData({ current: "", next: "", confirm: "" })
      } else {
        const r = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword: pwData.current, newPassword: pwData.next }),
        })
        if (!r.ok) throw new Error((await r.json()).message ?? "Failed")
        setPwMsg({ ok: true, text: "Password updated successfully." })
        setPwData({ current: "", next: "", confirm: "" })
      }
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : "Could not update password." })
    } finally {
      setPwSaving(false)
    }
  }

  async function savePrefs(patch: { twoFactorEnabled?: boolean; loginAlerts?: boolean }) {
    setPrefSaving(true)
    try {
      const currentSecurity = securityPrefs
      await apiNest.updateMe({
        profile: { ...(me?.profile ?? {}), security: { ...currentSecurity, ...patch } } as never,
      })
      await mutate("/me")
    } catch { /* silent */ }
    finally { setPrefSaving(false) }
  }

  return (
    <AccountShell title="Security" subtitle="Manage your password, two-factor authentication, and account sessions" user={user}>
      <Seo title="Security — Shaniid RX" />

      <div className="space-y-5">
        {/* Change password */}
        <SectionCard
          title="Change Password"
          description="Use a strong password you haven't used before"
        >
          <div className="space-y-3 max-w-md">
            {[
              { key: "current" as const, label: "Current password" },
              { key: "next"    as const, label: "New password" },
              { key: "confirm" as const, label: "Confirm new password" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className="w-full h-10 rounded-lg border px-3 pr-10 text-sm outline-none focus:ring-2 transition"
                    style={{ borderColor: PEACH_BORDER }}
                    value={pwData[key]}
                    onChange={(e) => setPwData((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {key === "next" && (
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pwMsg && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                style={{
                  background: pwMsg.ok ? "#DCFCE7" : "#FEE2E2",
                  color: pwMsg.ok ? "#166534" : "#991B1B",
                }}
              >
                {pwMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {pwMsg.text}
              </div>
            )}

            <button
              type="button"
              onClick={() => void changePassword()}
              disabled={pwSaving}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-full text-sm font-bold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${WINE})` }}
            >
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </SectionCard>

        {/* 2FA & Alerts */}
        <SectionCard
          title="Authentication & Alerts"
          description="Control how your account is protected"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#DBEAFE" }}
                >
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: WINE }}>Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security with a verification code on sign-in</p>
                </div>
              </div>
              <Toggle
                checked={twoFa}
                disabled={prefSaving}
                onChange={(v) => {
                  setTwoFa(v)
                  void savePrefs({ twoFactorEnabled: v })
                }}
              />
            </div>

            <div className="h-px" style={{ background: PEACH_BORDER }} />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#FEF3C7" }}
                >
                  <Bell className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: WINE }}>Login Alerts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Receive an SMS when your account is accessed from a new device</p>
                </div>
              </div>
              <Toggle
                checked={loginAlerts}
                disabled={prefSaving}
                onChange={(v) => {
                  setLoginAlerts(v)
                  void savePrefs({ loginAlerts: v })
                }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Connected accounts */}
        {clerkUser && (
          <SectionCard
            title="Linked Accounts"
            description="External accounts connected to your Shaniid RX profile"
          >
            <div className="space-y-3">
              {clerkUser.externalAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">No linked accounts.</p>
              )}
              {clerkUser.externalAccounts.map((ea) => (
                <div key={ea.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: PEACH_BORDER }}>
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium capitalize">{ea.provider}</p>
                    <p className="text-xs text-muted-foreground">{ea.emailAddress}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Connected
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Sign out */}
        <SectionCard
          title="Sessions"
          description="Sign out of this device or all devices"
        >
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => void signOut(() => { window.location.href = "/" })}
              className="inline-flex items-center gap-2 h-9 px-5 rounded-full border text-sm font-medium transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              style={{ borderColor: PEACH_BORDER, color: WINE }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </SectionCard>
      </div>
    </AccountShell>
  )
}

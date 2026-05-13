"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react"
import { Seo } from "@/components/seo"
import { logActivity } from "@/lib/audit-log"

type AdminProfile = {
  display_name: string
  email: string
  phone: string
  avatar_url: string
  job_title: string
  timezone: string
}

const PROFILE_DEFAULTS: AdminProfile = {
  display_name: "Admin",
  email: "admin@shaniidrx.local",
  phone: "",
  avatar_url: "",
  job_title: "Administrator",
  timezone: "Africa/Nairobi",
}

const TIMEZONES = [
  "Africa/Nairobi",
  "Africa/Mogadishu",
  "Africa/Addis_Ababa",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "Asia/Dubai",
  "UTC",
]

export function AdminProfile() {
  const [profile, setProfile] = useCmsDoc<AdminProfile>("admin-profile", PROFILE_DEFAULTS)

  /* ── Profile form ─────────────────────────────────────────── */
  const [draft, setDraft] = useState<AdminProfile>(profile)
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(profile), [draft, profile])
  const [savedAt, setSavedAt] = useState<number>(0)
  const [profileError, setProfileError] = useState<string | null>(null)

  const update = <K extends keyof AdminProfile>(k: K, v: AdminProfile[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

  const saveProfile = () => {
    setProfileError(null)
    if (!draft.display_name.trim()) return setProfileError("Display name is required.")
    if (!isValidEmail(draft.email)) return setProfileError("Enter a valid email address.")
    setProfile(draft)
    setSavedAt(Date.now())
    try {
      logActivity({
        module: "Profile",
        action: "update",
        target: draft.email,
        meta: { display_name: draft.display_name },
      })
    } catch { /* ignore */ }
  }

  const resetProfile = () => {
    setDraft(profile)
    setProfileError(null)
  }

  /* ── Password form ────────────────────────────────────────── */
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNext, setPwNext] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [pwOk, setPwOk] = useState<string | null>(null)
  const [pwErr, setPwErr] = useState<string | null>(null)

  const pwStrength = useMemo(() => {
    const s = pwNext
    let score = 0
    if (s.length >= 8) score++
    if (s.length >= 12) score++
    if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score++
    if (/[0-9]/.test(s)) score++
    if (/[^A-Za-z0-9]/.test(s)) score++
    const label = score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong"
    const color = score <= 1 ? "#B91C1C" : score === 2 ? "#F97316" : score === 3 ? "#0F766E" : "#15803D"
    return { score, label, color, pct: Math.min(100, (score / 5) * 100) }
  }, [pwNext])

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwOk(null); setPwErr(null)
    if (!pwCurrent) return setPwErr("Enter your current password.")
    if (pwNext.length < 8) return setPwErr("New password must be at least 8 characters.")
    if (pwNext !== pwConfirm) return setPwErr("New password and confirmation do not match.")
    if (pwNext === pwCurrent) return setPwErr("New password must be different from the current one.")

    setPwBusy(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Could not change password (${res.status})`)

      setPwOk(
        data?.degraded
          ? "Password validated locally. Real authentication isn't wired in this environment yet — this is a no-op until the NestJS admin auth lands."
          : "Password updated successfully.",
      )
      setPwCurrent(""); setPwNext(""); setPwConfirm("")
      try {
        logActivity({
          module: "Profile",
          action: "change-password",
          target: profile.email,
          severity: "warning",
        })
      } catch { /* ignore */ }
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : "Failed to change password.")
    } finally {
      setPwBusy(false)
    }
  }

  const initials = (profile.display_name || "A")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <AdminShell title="My Profile">
      <Seo title="My Profile — Shaniid RX Admin" description="Manage your admin profile and password." canonicalPath="/admin/profile" noindex />
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-serif font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Update your name, contact details and password.
            </p>
          </div>
        </div>

        {/* Identity card */}
        <div className="border border-border rounded-sm p-5 bg-card flex items-center gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover border border-border"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #6B0F1A 0%, #3D0814 100%)" }}
            >
              {initials || <UserCircle className="h-7 w-7" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{profile.display_name || "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            {profile.job_title && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{profile.job_title}</p>
            )}
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="profile">
              <UserCircle className="h-4 w-4 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Security
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB ─────────────────────────────────────── */}
          <TabsContent value="profile" className="mt-6">
            <div className="border border-border rounded-sm p-6 space-y-5 bg-card">
              {profileError && (
                <div className="border border-destructive/40 bg-destructive/10 text-destructive text-sm rounded-sm p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="flex-1">{profileError}</p>
                  <button onClick={() => setProfileError(null)} className="text-xs underline" type="button">Dismiss</button>
                </div>
              )}
              {savedAt > 0 && Date.now() - savedAt < 4000 && (
                <div className="border border-emerald-500/40 bg-emerald-50 text-emerald-900 text-sm rounded-sm p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Profile saved.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="display_name">Display name</Label>
                  <Input
                    id="display_name"
                    value={draft.display_name}
                    onChange={(e) => update("display_name", e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="job_title">Role / job title</Label>
                  <Input
                    id="job_title"
                    value={draft.job_title}
                    onChange={(e) => update("job_title", e.target.value)}
                    placeholder="e.g. Pharmacy Lead"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={draft.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@shaniidrx.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+254 700 000 000"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    value={draft.avatar_url}
                    onChange={(e) => update("avatar_url", e.target.value)}
                    placeholder="https://…/your-photo.jpg"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave empty to use your initials on a wine background.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={draft.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                    className="w-full h-9 px-3 rounded-sm border border-border bg-background text-sm"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={saveProfile}
                  disabled={!dirty}
                  className="btn-rx-peach-wine"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </Button>
                {dirty && (
                  <button
                    type="button"
                    onClick={resetProfile}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Discard
                  </button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* SECURITY TAB ────────────────────────────────────── */}
          <TabsContent value="security" className="mt-6">
            <form onSubmit={submitPassword} className="border border-border rounded-sm p-6 space-y-5 bg-card">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Change password</h2>
              </div>

              {pwErr && (
                <div className="border border-destructive/40 bg-destructive/10 text-destructive text-sm rounded-sm p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="flex-1">{pwErr}</p>
                  <button onClick={() => setPwErr(null)} className="text-xs underline" type="button">Dismiss</button>
                </div>
              )}
              {pwOk && (
                <div className="border border-emerald-500/40 bg-emerald-50 text-emerald-900 text-sm rounded-sm p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="flex-1">{pwOk}</p>
                </div>
              )}

              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <Label htmlFor="pw_current">Current password</Label>
                  <Input
                    id="pw_current"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw_next">New password</Label>
                  <Input
                    id="pw_next"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={pwNext}
                    onChange={(e) => setPwNext(e.target.value)}
                  />
                  {pwNext.length > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${pwStrength.pct}%`, background: pwStrength.color }}
                        />
                      </div>
                      <p className="text-[11px]" style={{ color: pwStrength.color }}>
                        Strength: {pwStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw_confirm">Confirm new password</Label>
                  <Input
                    id="pw_confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPw ? "Hide passwords" : "Show passwords"}
                </button>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={pwBusy} className="btn-rx-peach-wine">
                  <KeyRound className="h-4 w-4 mr-2" />
                  {pwBusy ? "Updating…" : "Update password"}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Tip: use 12+ characters with a mix of upper, lower, numbers and a symbol.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  )
}

export default AdminProfile

"use client"

import { useState, useMemo } from "react"
import { AccountShell } from "@/components/account/account-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import {
  User, Mail, Phone, Calendar, Globe2, Languages, Heart, ShieldCheck,
  Bell, MessageSquare, Smartphone, Save, Trash2, Lock, AlertTriangle,
  Pill, Plus, X,
} from "lucide-react"

const WINE = "#3D0814"
const PEACH_BORDER = "#F2DCC8"

type CustomerProfile = {
  identity: {
    firstName: string
    lastName: string
    email: string
    phone: string
    dateOfBirth: string
    gender: "male" | "female" | "other" | "prefer_not"
    language: "en" | "sw"
    country: string
  }
  health: {
    bloodGroup: string
    allergies: string[]
    chronicConditions: string[]
    currentMedications: string[]
    emergencyContactName: string
    emergencyContactPhone: string
  }
  preferences: {
    notifyOrderUpdates: { email: boolean; sms: boolean; whatsapp: boolean }
    notifyPromotions: { email: boolean; sms: boolean; whatsapp: boolean }
    notifyHealthTips: { email: boolean; sms: boolean; whatsapp: boolean }
    refillReminders: boolean
    newsletterSubscribed: boolean
    preferPharmacist: "any" | "female" | "male"
  }
  security: {
    twoFactorEnabled: boolean
    loginAlerts: boolean
  }
}

const PROFILE_DEFAULTS: CustomerProfile = {
  identity: {
    firstName: "Aisha",
    lastName: "Mohamed",
    email: "aisha@example.com",
    phone: "+254 712 345 678",
    dateOfBirth: "",
    gender: "prefer_not",
    language: "en",
    country: "Kenya",
  },
  health: {
    bloodGroup: "",
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    emergencyContactName: "",
    emergencyContactPhone: "",
  },
  preferences: {
    notifyOrderUpdates: { email: true, sms: true, whatsapp: true },
    notifyPromotions: { email: false, sms: false, whatsapp: false },
    notifyHealthTips: { email: true, sms: false, whatsapp: false },
    refillReminders: true,
    newsletterSubscribed: false,
    preferPharmacist: "any",
  },
  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
  },
}

type Tab = "profile" | "health" | "preferences" | "security" | "danger"

const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "profile",     label: "Personal info",   icon: User },
  { id: "health",      label: "Health profile",  icon: Pill },
  { id: "preferences", label: "Preferences",     icon: Bell },
  { id: "security",    label: "Security",        icon: ShieldCheck },
  { id: "danger",      label: "Danger zone",     icon: AlertTriangle },
]

export default function AccountSettingsPage() {
  const [profile, setProfile] = useCmsDoc("customer-profile", PROFILE_DEFAULTS)
  const [draft, setDraft] = useState<CustomerProfile>(profile)
  const [tab, setTab] = useState<Tab>("profile")

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(profile),
    [draft, profile],
  )

  const save = () => {
    setProfile(draft)
    notify.saved("Profile updated")
  }
  const discard = () => {
    setDraft(profile)
    notify.info("Changes discarded")
  }

  const update = <S extends keyof CustomerProfile>(section: S, patch: Partial<CustomerProfile[S]>) =>
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }))

  const fullName = `${profile.identity.firstName} ${profile.identity.lastName}`.trim() || "Customer"

  return (
    <AccountShell
      title="Profile & Settings"
      subtitle="Personal information, health profile, notification preferences and security."
      user={{ name: fullName, email: profile.identity.email, phone: profile.identity.phone }}
    >
      <div className="space-y-5">
        {/* Tab pills + sticky save bar */}
        <div className="rounded-xl bg-white border p-2 flex flex-wrap gap-1.5" style={{ borderColor: PEACH_BORDER }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                tab === t.id
                  ? "text-white font-semibold"
                  : "text-[#3D0814] hover:bg-[#FFFBF5]"
              }`}
              style={{ background: tab === t.id ? WINE : "transparent" }}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div className="rounded-xl bg-white border p-5 lg:p-6 space-y-5" style={{ borderColor: PEACH_BORDER }}>
          {tab === "profile" && (
            <>
              <Section title="Personal information" subtitle="The name on your prescriptions and orders.">
                <Grid cols={2}>
                  <Field label="First name" icon={User} value={draft.identity.firstName} onChange={(v) => update("identity", { firstName: v })} />
                  <Field label="Last name" value={draft.identity.lastName} onChange={(v) => update("identity", { lastName: v })} />
                  <Field label="Email" type="email" icon={Mail} value={draft.identity.email} onChange={(v) => update("identity", { email: v })} />
                  <Field label="Phone" icon={Phone} value={draft.identity.phone} onChange={(v) => update("identity", { phone: v })} />
                  <Field label="Date of birth" type="date" icon={Calendar} value={draft.identity.dateOfBirth} onChange={(v) => update("identity", { dateOfBirth: v })} />
                  <SelectField
                    label="Gender"
                    value={draft.identity.gender}
                    onChange={(v) => update("identity", { gender: v as CustomerProfile["identity"]["gender"] })}
                    options={[
                      { value: "prefer_not", label: "Prefer not to say" },
                      { value: "female", label: "Female" },
                      { value: "male", label: "Male" },
                      { value: "other", label: "Other" },
                    ]}
                  />
                  <SelectField
                    label="Language"
                    icon={Languages}
                    value={draft.identity.language}
                    onChange={(v) => update("identity", { language: v as "en" | "sw" })}
                    options={[
                      { value: "en", label: "English" },
                      { value: "sw", label: "Kiswahili" },
                    ]}
                  />
                  <Field label="Country" icon={Globe2} value={draft.identity.country} onChange={(v) => update("identity", { country: v })} />
                </Grid>
              </Section>
            </>
          )}

          {tab === "health" && (
            <>
              <Banner tone="info">
                Sharing your health profile lets our pharmacists screen for interactions before dispensing. Your data
                stays private and is only seen by licensed pharmacists handling your order.
              </Banner>
              <Section title="Medical profile" subtitle="Optional but recommended.">
                <Grid cols={2}>
                  <SelectField
                    label="Blood group"
                    value={draft.health.bloodGroup}
                    onChange={(v) => update("health", { bloodGroup: v })}
                    options={[
                      { value: "", label: "—" },
                      ...["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map((b) => ({ value: b, label: b })),
                    ]}
                  />
                </Grid>
                <ChipList
                  label="Allergies"
                  hint="e.g. Penicillin, Sulfa, Peanuts"
                  items={draft.health.allergies}
                  onChange={(items) => update("health", { allergies: items })}
                />
                <ChipList
                  label="Chronic conditions"
                  hint="e.g. Hypertension, Asthma, Diabetes type 2"
                  items={draft.health.chronicConditions}
                  onChange={(items) => update("health", { chronicConditions: items })}
                />
                <ChipList
                  label="Current medications"
                  hint="Generic or brand name. We use this to flag drug interactions."
                  items={draft.health.currentMedications}
                  onChange={(items) => update("health", { currentMedications: items })}
                />
              </Section>
              <Section title="Emergency contact" subtitle="Used only in critical situations.">
                <Grid cols={2}>
                  <Field label="Contact name" value={draft.health.emergencyContactName} onChange={(v) => update("health", { emergencyContactName: v })} />
                  <Field label="Contact phone" icon={Phone} value={draft.health.emergencyContactPhone} onChange={(v) => update("health", { emergencyContactPhone: v })} />
                </Grid>
              </Section>
            </>
          )}

          {tab === "preferences" && (
            <>
              <Section title="Notification channels" subtitle="Choose how we reach you per topic.">
                <ChannelMatrix
                  rows={[
                    { key: "notifyOrderUpdates", label: "Order updates",  icon: Heart,    hint: "Confirmations, dispatch, delivery" },
                    { key: "notifyHealthTips",   label: "Health tips",    icon: Pill,     hint: "Curated articles for your conditions" },
                    { key: "notifyPromotions",   label: "Promotions",     icon: Bell,     hint: "Discounts and seasonal offers" },
                  ]}
                  value={draft.preferences}
                  onChange={(patch) => update("preferences", patch)}
                />
              </Section>
              <Section title="Pharmacy preferences">
                <Toggle
                  label="Refill reminders"
                  hint="We'll remind you 3 days before your monthly meds run out."
                  checked={draft.preferences.refillReminders}
                  onChange={(v) => update("preferences", { refillReminders: v })}
                />
                <Toggle
                  label="Subscribe to newsletter"
                  hint="One curated digest per month — never spam."
                  checked={draft.preferences.newsletterSubscribed}
                  onChange={(v) => update("preferences", { newsletterSubscribed: v })}
                />
                <SelectField
                  label="Preferred pharmacist for consultations"
                  value={draft.preferences.preferPharmacist}
                  onChange={(v) => update("preferences", { preferPharmacist: v as CustomerProfile["preferences"]["preferPharmacist"] })}
                  options={[
                    { value: "any", label: "No preference" },
                    { value: "female", label: "Female pharmacist" },
                    { value: "male", label: "Male pharmacist" },
                  ]}
                />
              </Section>
            </>
          )}

          {tab === "security" && (
            <>
              <Banner tone="info">
                Sign-in is handled by Clerk. Password & 2FA settings live with your Clerk profile — these toggles
                are notification preferences only.
              </Banner>
              <Section title="Account security">
                <Toggle
                  label="Enable two-factor authentication (2FA)"
                  hint="Adds an extra step at sign-in via SMS or authenticator app."
                  checked={draft.security.twoFactorEnabled}
                  onChange={(v) => update("security", { twoFactorEnabled: v })}
                />
                <Toggle
                  label="Email me about new sign-ins"
                  hint="We'll alert you whenever your account is accessed from a new device."
                  checked={draft.security.loginAlerts}
                  onChange={(v) => update("security", { loginAlerts: v })}
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-md border bg-white text-sm font-medium text-[#3D0814] hover:bg-[#FFFBF5]"
                  style={{ borderColor: PEACH_BORDER }}
                  onClick={() => notify.info("Password change opens in Clerk (coming soon)")}
                >
                  <Lock className="h-4 w-4" /> Change password
                </button>
              </Section>
            </>
          )}

          {tab === "danger" && (
            <Section title="Danger zone" subtitle="These actions are irreversible.">
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-md grid place-items-center bg-red-100 text-red-700 flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-red-900">Delete my account</p>
                    <p className="text-xs text-red-800/80 mt-1">
                      Permanently removes your profile, addresses, prescriptions and order history. This cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      notify.error("Account deletion is gated. Contact support to proceed.", {
                        description: "We'll verify your identity before processing the request.",
                        action: { label: "Contact us", onClick: () => (window.location.href = "/contact") },
                      })
                    }
                    className="px-3 h-9 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete account
                  </button>
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Sticky save bar */}
        {tab !== "danger" && (
          <div
            className={`sticky bottom-3 z-20 rounded-xl bg-white border shadow-[0_18px_48px_-18px_rgba(61,8,20,0.35)] px-4 py-3 flex items-center justify-between gap-3 transition-opacity ${
              dirty ? "opacity-100" : "opacity-60"
            }`}
            style={{ borderColor: PEACH_BORDER }}
          >
            <p className="text-xs text-muted-foreground">
              {dirty ? "You have unsaved changes." : "All changes saved."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={!dirty}
                className="px-3 h-9 rounded-md text-sm border bg-white hover:bg-[#FFFBF5] disabled:opacity-40"
                style={{ borderColor: PEACH_BORDER, color: WINE }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className="px-4 h-9 rounded-md text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-40"
                style={{ background: WINE }}
              >
                <Save className="h-4 w-4" /> Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </AccountShell>
  )
}

/* ---------- field primitives ---------- */

function Section({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0" style={{ borderColor: PEACH_BORDER }}>
      <header>
        <h3 className="text-sm font-semibold text-[#3D0814]">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Grid({ cols, children }: { cols: 1 | 2 | 3; children: React.ReactNode }) {
  const cls = cols === 1 ? "" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
  return <div className={`grid grid-cols-1 ${cls} gap-3`}>{children}</div>
}

function Field({
  label, value, onChange, type = "text", icon: Icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  icon?: typeof User
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#3D0814]">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-10 ${Icon ? "pl-9" : "pl-3"} pr-3 rounded-md border bg-white text-sm focus:outline-none focus:border-[#3D0814]/40`}
          style={{ borderColor: PEACH_BORDER }}
        />
      </div>
    </div>
  )
}

function SelectField({
  label, value, onChange, options, icon: Icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  icon?: typeof User
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#3D0814]">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-10 ${Icon ? "pl-9" : "pl-3"} pr-3 rounded-md border bg-white text-sm focus:outline-none focus:border-[#3D0814]/40`}
          style={{ borderColor: PEACH_BORDER }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function Toggle({
  label, hint, checked, onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-[#FFFBF5]/40 cursor-pointer hover:bg-[#FFFBF5] transition-colors"
      style={{ borderColor: PEACH_BORDER }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#3D0814]">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${checked ? "" : "bg-muted"}`}
        style={checked ? { background: WINE } : undefined}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  )
}

function Banner({ tone, children }: { tone: "info" | "warning"; children: React.ReactNode }) {
  const palette =
    tone === "warning"
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-[#FFFBF5] border-[#F2DCC8] text-[#3D0814]"
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${palette}`}>
      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <p>{children}</p>
    </div>
  )
}

function ChipList({
  label, hint, items, onChange,
}: {
  label: string
  hint?: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [input, setInput] = useState("")
  const add = () => {
    const v = input.trim()
    if (!v) return
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      notify.warning(`"${v}" is already in the list`)
      return
    }
    onChange([...items, v])
    setInput("")
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-[#3D0814]">{label}</label>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Type and press Enter…"
          className="flex-1 h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:border-[#3D0814]/40"
          style={{ borderColor: PEACH_BORDER }}
        />
        <button
          type="button"
          onClick={add}
          className="h-10 px-3 rounded-md text-sm font-medium inline-flex items-center gap-1 text-white"
          style={{ background: WINE }}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 text-xs rounded-full border bg-white text-[#3D0814]"
              style={{ borderColor: PEACH_BORDER }}
            >
              {it}
              <button
                type="button"
                onClick={() => remove(i)}
                className="h-4 w-4 rounded-full grid place-items-center text-muted-foreground hover:bg-red-100 hover:text-red-700"
                aria-label={`Remove ${it}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type ChannelKey = "notifyOrderUpdates" | "notifyHealthTips" | "notifyPromotions"

function ChannelMatrix({
  rows, value, onChange,
}: {
  rows: Array<{ key: ChannelKey; label: string; icon: typeof Bell; hint?: string }>
  value: CustomerProfile["preferences"]
  onChange: (patch: Partial<CustomerProfile["preferences"]>) => void
}) {
  const channels: Array<{ key: "email" | "sms" | "whatsapp"; label: string; icon: typeof Mail }> = [
    { key: "email", label: "Email", icon: Mail },
    { key: "sms", label: "SMS", icon: Smartphone },
    { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  ]
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left font-semibold pb-2">Topic</th>
            {channels.map((c) => (
              <th key={c.key} className="text-center font-semibold pb-2 px-2">
                <span className="inline-flex items-center gap-1">
                  <c.icon className="h-3 w-3" /> {c.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const v = value[r.key]
            return (
              <tr key={r.key} className="align-top">
                <td className="py-2 pr-3 border-t" style={{ borderColor: PEACH_BORDER }}>
                  <div className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-md grid place-items-center bg-[#FFFBF5] border" style={{ borderColor: PEACH_BORDER }}>
                      <r.icon className="h-3.5 w-3.5" style={{ color: WINE }} />
                    </div>
                    <div>
                      <p className="font-medium text-[#3D0814]">{r.label}</p>
                      {r.hint && <p className="text-[11px] text-muted-foreground">{r.hint}</p>}
                    </div>
                  </div>
                </td>
                {channels.map((c) => (
                  <td key={c.key} className="text-center py-3 border-t" style={{ borderColor: PEACH_BORDER }}>
                    <input
                      type="checkbox"
                      checked={v[c.key]}
                      onChange={(e) =>
                        onChange({ [r.key]: { ...v, [c.key]: e.target.checked } } as Partial<CustomerProfile["preferences"]>)
                      }
                      className="h-4 w-4 accent-[#3D0814] cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

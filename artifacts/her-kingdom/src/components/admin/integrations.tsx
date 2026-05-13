"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import {
  Plug, Save, RotateCcw, Mail, MessageSquare, Eye, EyeOff,
  CheckCircle2, AlertTriangle, ExternalLink, Info,
} from "lucide-react"

const WINE = "#3D0814"

export type IntegrationsConfig = {
  email: {
    provider: "resend"
    enabled: boolean
    apiKey: string
    fromName: string
    fromEmail: string
    replyTo: string
    sandboxMode: boolean
    notes: string
  }
  sms: {
    provider: "africastalking" | "twilio" | "infobip" | "other"
    enabled: boolean
    apiKey: string
    apiSecret: string
    senderId: string
    accountSid: string
    sandboxMode: boolean
    notes: string
  }
}

export const INTEGRATIONS_DEFAULTS: IntegrationsConfig = {
  email: {
    provider: "resend",
    enabled: false,
    apiKey: "",
    fromName: "Shaniid RX",
    fromEmail: "no-reply@shaniidrx.co.ke",
    replyTo: "support@shaniidrx.co.ke",
    sandboxMode: true,
    notes: "",
  },
  sms: {
    provider: "africastalking",
    enabled: false,
    apiKey: "",
    apiSecret: "",
    senderId: "SHANIIDRX",
    accountSid: "",
    sandboxMode: true,
    notes: "",
  },
}

function withDefaults(s: Partial<IntegrationsConfig> | undefined): IntegrationsConfig {
  const src = (s ?? {}) as Partial<IntegrationsConfig>
  return {
    email: { ...INTEGRATIONS_DEFAULTS.email, ...(src.email ?? {}) },
    sms:   { ...INTEGRATIONS_DEFAULTS.sms,   ...(src.sms   ?? {}) },
  }
}

type Tab = "email" | "sms"

export function AdminIntegrations() {
  const [raw, setRaw] = useCmsDoc("integrations", INTEGRATIONS_DEFAULTS)
  const config = useMemo(() => withDefaults(raw), [raw])
  const [draft, setDraft] = useState<IntegrationsConfig>(config)
  const [tab, setTab] = useState<Tab>("email")
  const [showEmailKey, setShowEmailKey] = useState(false)
  const [showSmsKey, setShowSmsKey] = useState(false)
  const [showSmsSecret, setShowSmsSecret] = useState(false)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(config),
    [draft, config],
  )

  const save = () => { setRaw(draft); notify.saved("Integrations saved") }
  const discard = () => { setDraft(config); notify.info("Discarded unsaved changes") }
  const restoreDefaults = () => { setDraft(INTEGRATIONS_DEFAULTS); notify.warning("Defaults restored — review then Save to apply") }

  const updateEmail = (patch: Partial<IntegrationsConfig["email"]>) =>
    setDraft((d) => ({ ...d, email: { ...d.email, ...patch } }))
  const updateSms = (patch: Partial<IntegrationsConfig["sms"]>) =>
    setDraft((d) => ({ ...d, sms: { ...d.sms, ...patch } }))

  const emailReady = !!draft.email.apiKey && !!draft.email.fromEmail
  const smsReady = !!draft.sms.apiKey && !!draft.sms.senderId

  return (
    <AdminShell title="Integrations">
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-xl border border-border bg-gradient-to-br from-white to-[#FFFBF5] p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: WINE }}>
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                Integrations
                {dirty && (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Unsaved
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect transactional email and SMS providers. Credentials are stored locally and will be wired to the live providers in a follow-up task.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreDefaults}
              className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary inline-flex items-center gap-1.5"
              title="Reset draft to factory defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Defaults
            </button>
            {dirty && (
              <button
                type="button"
                onClick={discard}
                className="px-3 h-9 rounded-md text-sm border border-border hover:bg-secondary"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="px-4 h-9 rounded-md text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2 shadow-sm"
              style={{ background: WINE }}
            >
              <Save className="h-4 w-4" /> Save changes
            </button>
          </div>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusCard
            icon={Mail}
            title="Email — Resend"
            enabled={draft.email.enabled}
            ready={emailReady}
            description={emailReady ? draft.email.fromEmail : "API key required"}
            onClick={() => setTab("email")}
            active={tab === "email"}
          />
          <StatusCard
            icon={MessageSquare}
            title="SMS"
            enabled={draft.sms.enabled}
            ready={smsReady}
            description={smsReady ? `${draft.sms.provider} · ${draft.sms.senderId}` : "API key required"}
            onClick={() => setTab("sms")}
            active={tab === "sms"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5">
          {/* Tabs sidebar */}
          <nav className="md:sticky md:top-20 self-start space-y-3">
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Channels
              </div>
              <TabBtn active={tab === "email"} onClick={() => setTab("email")} icon={Mail} label="Email (Resend)" />
              <TabBtn active={tab === "sms"} onClick={() => setTab("sms")} icon={MessageSquare} label="SMS" />
            </div>
          </nav>

          {/* Tab content */}
          <div className="rounded-lg border border-border bg-background p-6 space-y-5">
            {tab === "email" && (
              <Section
                title="Resend (Transactional Email)"
                subtitle="Used for order confirmations, password resets, prescription updates, consultation replies."
                icon={Mail}
              >
                <Notice>
                  We'll wire Resend to the API server in a follow-up task. For now, paste your credentials here so they're ready to go — nothing is sent until the integration is enabled and connected on the backend.
                </Notice>

                <Toggle
                  label="Enable email sending"
                  hint="Master switch for all transactional email"
                  checked={draft.email.enabled}
                  onChange={(v) => updateEmail({ enabled: v })}
                />

                <Grid cols={2}>
                  <SecretInput
                    label="Resend API key"
                    hint="Starts with re_… — get it from resend.com → API Keys"
                    value={draft.email.apiKey}
                    visible={showEmailKey}
                    onToggleVisible={() => setShowEmailKey((v) => !v)}
                    onChange={(v) => updateEmail({ apiKey: v.trim() })}
                    placeholder="re_********************"
                    className="md:col-span-2"
                  />
                  <Input
                    label="From name"
                    value={draft.email.fromName}
                    onChange={(v) => updateEmail({ fromName: v })}
                    placeholder="Shaniid RX"
                  />
                  <Input
                    label="From email"
                    type="email"
                    hint="Must be on a domain you've verified in Resend"
                    value={draft.email.fromEmail}
                    onChange={(v) => updateEmail({ fromEmail: v.trim() })}
                    placeholder="no-reply@shaniidrx.co.ke"
                  />
                  <Input
                    label="Reply-to"
                    type="email"
                    hint="Where customer replies should land"
                    value={draft.email.replyTo}
                    onChange={(v) => updateEmail({ replyTo: v.trim() })}
                    placeholder="support@shaniidrx.co.ke"
                    className="md:col-span-2"
                  />
                </Grid>

                <Toggle
                  label="Sandbox mode"
                  hint="When ON, emails go to a test inbox only — safe to leave on until launch"
                  checked={draft.email.sandboxMode}
                  onChange={(v) => updateEmail({ sandboxMode: v })}
                />

                <Textarea
                  label="Internal notes"
                  rows={3}
                  hint="For your team — e.g. who owns the Resend account, which domain is verified"
                  value={draft.email.notes}
                  onChange={(v) => updateEmail({ notes: v })}
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary text-foreground"
                  >
                    Open Resend dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    disabled
                    title="Available once the backend integration is wired up"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground cursor-not-allowed"
                  >
                    Send test email (coming soon)
                  </button>
                </div>
              </Section>
            )}

            {tab === "sms" && (
              <Section
                title="SMS provider"
                subtitle="Used for OTP verification, order updates, delivery notifications."
                icon={MessageSquare}
              >
                <Notice>
                  Pick a provider and store its credentials. The actual SMS gateway will be configured on the backend in a follow-up task — saving here doesn't send any messages yet.
                </Notice>

                <Toggle
                  label="Enable SMS sending"
                  hint="Master switch for all outbound SMS"
                  checked={draft.sms.enabled}
                  onChange={(v) => updateSms({ enabled: v })}
                />

                <Grid cols={2}>
                  <Select
                    label="Provider"
                    value={draft.sms.provider}
                    onChange={(v) => updateSms({ provider: v as IntegrationsConfig["sms"]["provider"] })}
                    options={[
                      { value: "africastalking", label: "Africa's Talking (recommended for KE)" },
                      { value: "twilio", label: "Twilio" },
                      { value: "infobip", label: "Infobip" },
                      { value: "other", label: "Other / Custom" },
                    ]}
                  />
                  <Input
                    label="Sender ID"
                    hint="Short code or alphanumeric ID shown to recipients"
                    value={draft.sms.senderId}
                    onChange={(v) => updateSms({ senderId: v })}
                    placeholder="SHANIIDRX"
                  />
                  <SecretInput
                    label="API key"
                    value={draft.sms.apiKey}
                    visible={showSmsKey}
                    onToggleVisible={() => setShowSmsKey((v) => !v)}
                    onChange={(v) => updateSms({ apiKey: v.trim() })}
                    placeholder="••••••••••••••••"
                    className="md:col-span-2"
                  />
                  {(draft.sms.provider === "twilio" || draft.sms.provider === "infobip" || draft.sms.provider === "other") && (
                    <SecretInput
                      label={draft.sms.provider === "twilio" ? "Auth token" : "API secret"}
                      value={draft.sms.apiSecret}
                      visible={showSmsSecret}
                      onToggleVisible={() => setShowSmsSecret((v) => !v)}
                      onChange={(v) => updateSms({ apiSecret: v.trim() })}
                      placeholder="••••••••••••••••"
                      className="md:col-span-2"
                    />
                  )}
                  {draft.sms.provider === "twilio" && (
                    <Input
                      label="Account SID"
                      value={draft.sms.accountSid}
                      onChange={(v) => updateSms({ accountSid: v.trim() })}
                      placeholder="AC********************************"
                      className="md:col-span-2"
                    />
                  )}
                </Grid>

                <Toggle
                  label="Sandbox mode"
                  hint="When ON, SMS go through the provider's test sandbox only"
                  checked={draft.sms.sandboxMode}
                  onChange={(v) => updateSms({ sandboxMode: v })}
                />

                <Textarea
                  label="Internal notes"
                  rows={3}
                  hint="For your team — e.g. account owner, monthly quota, billing contact"
                  value={draft.sms.notes}
                  onChange={(v) => updateSms({ notes: v })}
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled
                    title="Available once the backend integration is wired up"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground cursor-not-allowed"
                  >
                    Send test SMS (coming soon)
                  </button>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

/* ---------- helpers (kept local; mirrors website-settings.tsx style) ---------- */

function StatusCard({
  icon: Icon, title, enabled, ready, description, onClick, active,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  enabled: boolean
  ready: boolean
  description: string
  onClick: () => void
  active: boolean
}) {
  const status = !ready
    ? { label: "Not configured", tone: "bg-muted text-muted-foreground border-border" }
    : enabled
      ? { label: "Enabled", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : { label: "Configured · Disabled", tone: "bg-amber-50 text-amber-800 border-amber-200" }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${active ? "border-foreground/40 bg-secondary/40" : "border-border bg-background hover:bg-secondary/30"}`}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg grid place-items-center bg-secondary">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{title}</span>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.tone}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
        </div>
        {ready ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        )}
      </div>
    </button>
  )
}

function TabBtn({
  active, onClick, icon: Icon, label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors text-left ${
        active ? "bg-foreground text-background font-medium" : "hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function Section({
  title, subtitle, icon: Icon, children,
}: {
  title: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <header className="flex items-start gap-3 pb-2 border-b border-border">
        {Icon && (
          <div className="h-9 w-9 rounded-md grid place-items-center bg-secondary text-foreground">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Grid({ cols, children }: { cols: 1 | 2; children: React.ReactNode }) {
  const c = cols === 2 ? "md:grid-cols-2" : ""
  return <div className={`grid grid-cols-1 ${c} gap-4`}>{children}</div>
}

function Input({
  label, value, onChange, placeholder, type = "text", hint, className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
  className?: string
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-medium mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-foreground/40"
      />
      {hint && <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  )
}

function SecretInput({
  label, value, onChange, visible, onToggleVisible, placeholder, hint, className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggleVisible: () => void
  placeholder?: string
  hint?: string
  className?: string
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-medium mb-1">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full h-9 pl-3 pr-10 text-sm font-mono rounded-md border border-border bg-background focus:outline-none focus:border-foreground/40"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Hide value" : "Show value"}
          className="absolute right-1 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-7 rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  )
}

function Textarea({
  label, value, onChange, rows = 3, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-foreground/40"
      />
      {hint && <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  )
}

function Select({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-foreground/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
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
    <label className="flex items-start gap-3 p-3 rounded-md border border-border bg-secondary/30 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${checked ? "bg-foreground" : "bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-background transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </label>
  )
}

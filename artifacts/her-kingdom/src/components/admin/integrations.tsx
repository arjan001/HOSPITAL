"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import { usePermission } from "@/lib/permissions"
import {
  Plug, Save, RotateCcw, Mail, MessageSquare, Eye, EyeOff,
  CheckCircle2, AlertTriangle, ExternalLink, Info,
  Truck, Video, Plus, Trash2,
} from "lucide-react"

const WINE = "#3D0814"

export type DeliveryVendor = {
  id: string
  name: string
  kind: "sendy" | "g4s" | "glovo" | "pickup_mtaani" | "fargo" | "boda" | "custom"
  apiKey: string
  apiSecret: string
  phone: string
  contactEmail: string
  zones: string  // comma-separated label list (e.g. "Nairobi CBD, Westlands, Kasarani")
  basePrice: number  // KSh
  perKm: number
  notes: string
  enabled: boolean
}

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
  whatsapp: {
    provider: "meta_cloud" | "360dialog" | "twilio" | "other"
    enabled: boolean
    phoneNumberId: string
    businessAccountId: string
    accessToken: string
    displayPhone: string  // E.164, e.g. +254 700 000 000
    defaultTemplate: string  // e.g. order_confirmation
    sandboxMode: boolean
    notes: string
    /** Offline prescription intake via WhatsApp bot (workflow: name, age, email, phone, ailment, service, Rx upload). */
    prescriptionIntake: {
      enabled: boolean
      botDisplayName: string
      welcomeMessage: string
      captureName: boolean
      captureAge: boolean
      captureEmail: boolean
      capturePhone: boolean
      captureAilment: boolean
      captureService: boolean
      capturePrescriptionUpload: boolean
      flowNotes: string
    }
  }
  video: {
    provider: "daily"
    enabled: boolean
    apiKey: string
    domain: string  // shaniidrx.daily.co
    region: "global" | "af-south-1" | "eu-west-1" | "us-east-1"
    recordingEnabled: boolean
    notes: string
  }
  delivery: {
    enabled: boolean
    defaultVendorId: string
    vendors: DeliveryVendor[]
    notes: string
  }
}

const DEFAULT_VENDORS: DeliveryVendor[] = [
  {
    id: "v_sendy",
    name: "Sendy",
    kind: "sendy",
    apiKey: "",
    apiSecret: "",
    phone: "+254 709 234 000",
    contactEmail: "support@sendyit.com",
    zones: "Nairobi, Mombasa, Kisumu",
    basePrice: 200,
    perKm: 30,
    notes: "On-demand bike + van rider network across major Kenyan cities.",
    enabled: false,
  },
  {
    id: "v_pickup_mtaani",
    name: "Pickup Mtaani",
    kind: "pickup_mtaani",
    apiKey: "",
    apiSecret: "",
    phone: "+254 700 100 100",
    contactEmail: "hello@pickupmtaani.com",
    zones: "Nairobi neighbourhoods (200+ pickup points)",
    basePrice: 150,
    perKm: 0,
    notes: "Customer collects from a nearby agent shop. Best for high-volume routes.",
    enabled: false,
  },
  {
    id: "v_g4s",
    name: "G4S Courier",
    kind: "g4s",
    apiKey: "",
    apiSecret: "",
    phone: "+254 711 077 000",
    contactEmail: "courier.kenya@g4s.com",
    zones: "Country-wide (cold-chain capable)",
    basePrice: 600,
    perKm: 45,
    notes: "Use for high-value or temperature-sensitive consignments.",
    enabled: false,
  },
]

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
  whatsapp: {
    provider: "meta_cloud",
    enabled: false,
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    displayPhone: "",
    defaultTemplate: "order_confirmation",
    sandboxMode: true,
    notes: "",
    prescriptionIntake: {
      enabled: false,
      botDisplayName: "Shaniid RX Prescription Desk",
      welcomeMessage:
        "Welcome to Shaniid RX. Please share your details so our pharmacist can help — then attach your prescription photo or PDF.",
      captureName: true,
      captureAge: true,
      captureEmail: true,
      capturePhone: true,
      captureAilment: true,
      captureService: true,
      capturePrescriptionUpload: true,
      flowNotes:
        "Wire your Meta/Twilio bot to collect these fields in order. Submissions should create a prescription row in admin (api-nest) when the bot webhook lands.",
    },
  },
  video: {
    provider: "daily",
    enabled: false,
    apiKey: "",
    domain: "shaniidrx.daily.co",
    region: "af-south-1",
    recordingEnabled: false,
    notes: "Reads DAILY_API_KEY on the server. This panel is for ops reference + region/recording flags.",
  },
  delivery: {
    enabled: false,
    defaultVendorId: "v_sendy",
    vendors: DEFAULT_VENDORS,
    notes: "Wire whichever Kenyan vendor you've signed with. Quotes returned at checkout when enabled.",
  },
}

function withDefaults(s: Partial<IntegrationsConfig> | undefined): IntegrationsConfig {
  const src = (s ?? {}) as Partial<IntegrationsConfig>
  const deliverySrc = (src.delivery ?? {}) as Partial<IntegrationsConfig["delivery"]>
  return {
    email:    { ...INTEGRATIONS_DEFAULTS.email,    ...(src.email    ?? {}) },
    sms:      { ...INTEGRATIONS_DEFAULTS.sms,      ...(src.sms      ?? {}) },
    whatsapp: {
      ...INTEGRATIONS_DEFAULTS.whatsapp,
      ...(src.whatsapp ?? {}),
      prescriptionIntake: {
        ...INTEGRATIONS_DEFAULTS.whatsapp.prescriptionIntake,
        ...((src.whatsapp ?? {}) as Partial<IntegrationsConfig["whatsapp"]>).prescriptionIntake,
      },
    },
    video:    { ...INTEGRATIONS_DEFAULTS.video,    ...(src.video    ?? {}) },
    delivery: {
      ...INTEGRATIONS_DEFAULTS.delivery,
      ...deliverySrc,
      vendors: deliverySrc.vendors && deliverySrc.vendors.length > 0
        ? deliverySrc.vendors
        : INTEGRATIONS_DEFAULTS.delivery.vendors,
    },
  }
}

type Tab = "email" | "sms" | "whatsapp" | "video" | "delivery"

export function AdminIntegrations() {
  const canManage = usePermission("integrations.manage")
  const [raw, setRaw] = useCmsDoc("integrations", INTEGRATIONS_DEFAULTS)
  const config = useMemo(() => withDefaults(raw), [raw])
  const [draft, setDraft] = useState<IntegrationsConfig>(config)
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "email"
    const q = new URLSearchParams(window.location.search).get("tab")
    return (["email", "sms", "whatsapp", "video", "delivery"] as const).includes(q as Tab)
      ? (q as Tab)
      : "email"
  })
  const [showEmailKey, setShowEmailKey] = useState(false)
  const [showSmsKey, setShowSmsKey] = useState(false)
  const [showSmsSecret, setShowSmsSecret] = useState(false)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(config),
    [draft, config],
  )

  const save = () => {
    if (!canManage) { notify.warning("You don't have permission to change integrations."); return }
    setRaw(draft); notify.saved("Integrations saved")
  }
  const discard = () => { setDraft(config); notify.info("Discarded unsaved changes") }
  const restoreDefaults = () => {
    if (!canManage) { notify.warning("You don't have permission to change integrations."); return }
    setDraft(INTEGRATIONS_DEFAULTS); notify.warning("Defaults restored — review then Save to apply")
  }

  const updateEmail = (patch: Partial<IntegrationsConfig["email"]>) =>
    setDraft((d) => ({ ...d, email: { ...d.email, ...patch } }))
  const updateSms = (patch: Partial<IntegrationsConfig["sms"]>) =>
    setDraft((d) => ({ ...d, sms: { ...d.sms, ...patch } }))
  const updateWhatsapp = (patch: Partial<IntegrationsConfig["whatsapp"]>) =>
    setDraft((d) => ({ ...d, whatsapp: { ...d.whatsapp, ...patch } }))
  const updateVideo = (patch: Partial<IntegrationsConfig["video"]>) =>
    setDraft((d) => ({ ...d, video: { ...d.video, ...patch } }))
  const updateDelivery = (patch: Partial<IntegrationsConfig["delivery"]>) =>
    setDraft((d) => ({ ...d, delivery: { ...d.delivery, ...patch } }))
  const updateVendor = (id: string, patch: Partial<DeliveryVendor>) =>
    setDraft((d) => ({
      ...d,
      delivery: {
        ...d.delivery,
        vendors: d.delivery.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      },
    }))
  const addVendor = () => {
    const v: DeliveryVendor = {
      id: `v_${Date.now().toString(36)}`,
      name: "New vendor",
      kind: "custom",
      apiKey: "",
      apiSecret: "",
      phone: "",
      contactEmail: "",
      zones: "",
      basePrice: 0,
      perKm: 0,
      notes: "",
      enabled: false,
    }
    setDraft((d) => ({ ...d, delivery: { ...d.delivery, vendors: [...d.delivery.vendors, v] } }))
  }
  const removeVendor = (id: string) =>
    setDraft((d) => ({
      ...d,
      delivery: {
        ...d.delivery,
        vendors: d.delivery.vendors.filter((v) => v.id !== id),
        defaultVendorId: d.delivery.defaultVendorId === id
          ? (d.delivery.vendors.find((v) => v.id !== id)?.id || "")
          : d.delivery.defaultVendorId,
      },
    }))

  const [showWaToken, setShowWaToken] = useState(false)
  const [showVideoKey, setShowVideoKey] = useState(false)

  const emailReady = !!draft.email.apiKey && !!draft.email.fromEmail
  const smsReady = !!draft.sms.apiKey && !!draft.sms.senderId
  const whatsappReady = !!draft.whatsapp.accessToken && !!draft.whatsapp.phoneNumberId
  const videoReady = !!draft.video.apiKey
  const deliveryReady = draft.delivery.vendors.some((v) => v.enabled)

  if (!canManage) {
    return (
      <AdminShell title="Integrations">
        <div className="rounded-xl border border-border bg-white p-10 text-center max-w-md mx-auto mt-10">
          <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-800 grid place-items-center mx-auto mb-3">
            <Plug className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold mb-1">Integrations are restricted</h2>
          <p className="text-sm text-muted-foreground">
            Ask an Owner or Admin to grant you the <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">integrations.manage</code> permission.
          </p>
        </div>
      </AdminShell>
    )
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <StatusCard
            icon={MessageSquare}
            title="WhatsApp Business"
            enabled={draft.whatsapp.enabled}
            ready={whatsappReady}
            description={whatsappReady ? draft.whatsapp.displayPhone || draft.whatsapp.provider : "Access token required"}
            onClick={() => setTab("whatsapp")}
            active={tab === "whatsapp"}
          />
          <StatusCard
            icon={Video}
            title="Video — Daily.co"
            enabled={draft.video.enabled}
            ready={videoReady}
            description={videoReady ? `${draft.video.domain} · ${draft.video.region}` : "DAILY_API_KEY required"}
            onClick={() => setTab("video")}
            active={tab === "video"}
          />
          <StatusCard
            icon={Truck}
            title="Delivery vendors"
            enabled={draft.delivery.enabled}
            ready={deliveryReady}
            description={deliveryReady
              ? `${draft.delivery.vendors.filter((v) => v.enabled).length} vendor(s) live`
              : "No vendor enabled yet"}
            onClick={() => setTab("delivery")}
            active={tab === "delivery"}
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
              <TabBtn active={tab === "whatsapp"} onClick={() => setTab("whatsapp")} icon={MessageSquare} label="WhatsApp Business" />
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Operations
              </div>
              <TabBtn active={tab === "video"} onClick={() => setTab("video")} icon={Video} label="Video (Daily.co)" />
              <TabBtn active={tab === "delivery"} onClick={() => setTab("delivery")} icon={Truck} label="Delivery vendors" />
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

            {tab === "whatsapp" && (
              <Section
                title="WhatsApp — dual channel"
                subtitle="Twilio for confirmations · Meta Cloud for prescription intake bot."
                icon={MessageSquare}
              >
                <Notice>
                  <strong>Confirmations (Twilio)</strong> — order confirmed, Rx verified, quotation accepted, payment received, refill reminders. Free-form transactional text; set{" "}
                  <code className="text-[11px]">WHATSAPP_CONFIRMATIONS_PROVIDER=twilio</code> and <code className="text-[11px]">TWILIO_*</code> in the API environment.
                  <br className="mt-2" />
                  <strong className="mt-2 inline-block">Prescription bot (Meta)</strong> — inbound patient messages on your business number; webhook{" "}
                  <code className="text-[11px]">POST /api/v2/notifications/whatsapp/webhook</code>. Set <code className="text-[11px]">WHATSAPP_ACCESS_TOKEN</code> + <code className="text-[11px]">WHATSAPP_PHONE_NUMBER_ID</code>.
                </Notice>

                <Toggle
                  label="Enable WhatsApp messaging"
                  hint="Master switch for outbound confirmations (CMS templates still drive copy)"
                  checked={draft.whatsapp.enabled}
                  onChange={(v) => updateWhatsapp({ enabled: v })}
                />

                <Grid cols={2}>
                  <Select
                    label="Provider"
                    value={draft.whatsapp.provider}
                    onChange={(v) => updateWhatsapp({ provider: v as IntegrationsConfig["whatsapp"]["provider"] })}
                    options={[
                      { value: "meta_cloud", label: "Meta Cloud API (direct)" },
                      { value: "360dialog", label: "360dialog" },
                      { value: "twilio", label: "Twilio" },
                      { value: "other", label: "Other / custom BSP" },
                    ]}
                  />
                  <Input
                    label="Display phone number"
                    hint="The number patients will see, in E.164 (e.g. +254 700 000 000)"
                    value={draft.whatsapp.displayPhone}
                    onChange={(v) => updateWhatsapp({ displayPhone: v.trim() })}
                    placeholder="+254 700 000 000"
                  />
                  <Input
                    label="Phone number ID"
                    hint="From Meta Business Manager → WhatsApp → API Setup"
                    value={draft.whatsapp.phoneNumberId}
                    onChange={(v) => updateWhatsapp({ phoneNumberId: v.trim() })}
                    placeholder="1234567890"
                  />
                  <Input
                    label="Business account ID"
                    value={draft.whatsapp.businessAccountId}
                    onChange={(v) => updateWhatsapp({ businessAccountId: v.trim() })}
                    placeholder="987654321"
                  />
                  <SecretInput
                    label="Access token"
                    hint="Permanent system-user token recommended for production."
                    value={draft.whatsapp.accessToken}
                    visible={showWaToken}
                    onToggleVisible={() => setShowWaToken((v) => !v)}
                    onChange={(v) => updateWhatsapp({ accessToken: v.trim() })}
                    placeholder="EAAG…"
                    className="md:col-span-2"
                  />
                  <Input
                    label="Default template name"
                    hint="Used for outbound messages outside the 24h window."
                    value={draft.whatsapp.defaultTemplate}
                    onChange={(v) => updateWhatsapp({ defaultTemplate: v.trim() })}
                    placeholder="order_confirmation"
                    className="md:col-span-2"
                  />
                </Grid>

                <Toggle
                  label="Sandbox mode"
                  hint="Route messages through the provider's test number only."
                  checked={draft.whatsapp.sandboxMode}
                  onChange={(v) => updateWhatsapp({ sandboxMode: v })}
                />

                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-bold" style={{ color: WINE }}>Prescription intake bot (offline market)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aligns with customer demand workflow: WhatsApp submission → Rx review → care pack quote → payment.
                      Configure what your bot should capture before the prescription upload step.
                    </p>
                  </div>
                  <Toggle
                    label="Enable prescription intake via WhatsApp"
                    hint="Shows offline WhatsApp CTA on the upload-prescription page"
                    checked={draft.whatsapp.prescriptionIntake.enabled}
                    onChange={(v) =>
                      updateWhatsapp({
                        prescriptionIntake: { ...draft.whatsapp.prescriptionIntake, enabled: v },
                      })
                    }
                  />
                  <Grid cols={2}>
                    <Input
                      label="Bot display name"
                      value={draft.whatsapp.prescriptionIntake.botDisplayName}
                      onChange={(v) =>
                        updateWhatsapp({
                          prescriptionIntake: { ...draft.whatsapp.prescriptionIntake, botDisplayName: v },
                        })
                      }
                      placeholder="Shaniid RX Prescription Desk"
                      className="md:col-span-2"
                    />
                    <Textarea
                      label="Welcome message"
                      rows={3}
                      value={draft.whatsapp.prescriptionIntake.welcomeMessage}
                      onChange={(v) =>
                        updateWhatsapp({
                          prescriptionIntake: { ...draft.whatsapp.prescriptionIntake, welcomeMessage: v },
                        })
                      }
                      className="md:col-span-2"
                    />
                  </Grid>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fields to capture</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        ["captureName", "Full name"],
                        ["captureAge", "Age / DOB"],
                        ["captureEmail", "Email"],
                        ["capturePhone", "Phone / WhatsApp"],
                        ["captureAilment", "Ailment / health issue"],
                        ["captureService", "Service requested"],
                        ["capturePrescriptionUpload", "Prescription upload (focus)"],
                      ] as const
                    ).map(([key, label]) => (
                      <Toggle
                        key={key}
                        label={label}
                        checked={draft.whatsapp.prescriptionIntake[key]}
                        onChange={(v) =>
                          updateWhatsapp({
                            prescriptionIntake: { ...draft.whatsapp.prescriptionIntake, [key]: v },
                          })
                        }
                      />
                    ))}
                  </div>
                  <Textarea
                    label="Bot flow notes (internal)"
                    rows={3}
                    hint="Webhook URL, template names, handoff to pharmacist queue"
                    value={draft.whatsapp.prescriptionIntake.flowNotes}
                    onChange={(v) =>
                      updateWhatsapp({
                        prescriptionIntake: { ...draft.whatsapp.prescriptionIntake, flowNotes: v },
                      })
                    }
                  />
                </div>

                <Textarea
                  label="Internal notes"
                  rows={3}
                  hint="Approved templates, BSP account manager, billing contact."
                  value={draft.whatsapp.notes}
                  onChange={(v) => updateWhatsapp({ notes: v })}
                />
              </Section>
            )}

            {tab === "video" && (
              <Section
                title="Video — Daily.co"
                subtitle="Powers in-app doctor consultations. Backend reads the secret from DAILY_API_KEY."
                icon={Video}
              >
                <Notice>
                  The server already mints rooms and tokens at <code>/api/video/room</code> and <code>/api/video/token</code> using the <code>DAILY_API_KEY</code> environment secret. This panel captures the rest of the operational config (region, recording, domain) so the team has one source of truth.
                </Notice>

                <Toggle
                  label="Enable video consultations"
                  hint="When OFF, the consultation panel falls back to chat-only."
                  checked={draft.video.enabled}
                  onChange={(v) => updateVideo({ enabled: v })}
                />

                <Grid cols={2}>
                  <Input
                    label="Daily domain"
                    hint="From Daily dashboard → Account. Looks like yourname.daily.co"
                    value={draft.video.domain}
                    onChange={(v) => updateVideo({ domain: v.trim() })}
                    placeholder="shaniidrx.daily.co"
                  />
                  <Select
                    label="Preferred region"
                    value={draft.video.region}
                    onChange={(v) => updateVideo({ region: v as IntegrationsConfig["video"]["region"] })}
                    options={[
                      { value: "af-south-1", label: "Africa (Cape Town) — recommended for KE" },
                      { value: "eu-west-1", label: "Europe (Ireland)" },
                      { value: "us-east-1", label: "US East (Virginia)" },
                      { value: "global", label: "Global (auto-route)" },
                    ]}
                  />
                  <SecretInput
                    label="Daily API key (mirror of DAILY_API_KEY)"
                    hint="Optional reference copy. The server only reads from the environment secret."
                    value={draft.video.apiKey}
                    visible={showVideoKey}
                    onToggleVisible={() => setShowVideoKey((v) => !v)}
                    onChange={(v) => updateVideo({ apiKey: v.trim() })}
                    placeholder="dk_…"
                    className="md:col-span-2"
                  />
                </Grid>

                <Toggle
                  label="Record sessions"
                  hint="Cloud-recorded for clinical audit. Requires Daily plan that supports recording."
                  checked={draft.video.recordingEnabled}
                  onChange={(v) => updateVideo({ recordingEnabled: v })}
                />

                <Textarea
                  label="Internal notes"
                  rows={3}
                  value={draft.video.notes}
                  onChange={(v) => updateVideo({ notes: v })}
                />
              </Section>
            )}

            {tab === "delivery" && (
              <Section
                title="Delivery vendors"
                subtitle="Kenyan last-mile and pickup partners. Multiple vendors can be live; the default is used when no rule matches."
                icon={Truck}
              >
                <Notice>
                  These credentials are stored locally for now. When the orders module ports to NestJS we'll mint shipments via the enabled vendor's API. Use the per-vendor toggle to control availability at checkout.
                </Notice>

                <Toggle
                  label="Enable vendor-based delivery"
                  hint="When OFF, only internal delivery zones are offered."
                  checked={draft.delivery.enabled}
                  onChange={(v) => updateDelivery({ enabled: v })}
                />

                <Grid cols={2}>
                  <Select
                    label="Default vendor"
                    value={draft.delivery.defaultVendorId}
                    onChange={(v) => updateDelivery({ defaultVendorId: v })}
                    options={draft.delivery.vendors.map((v) => ({ value: v.id, label: v.name }))}
                  />
                </Grid>

                <div className="space-y-3">
                  {draft.delivery.vendors.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-border bg-background p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          className="h-9 px-3 rounded-md border border-border bg-background text-sm font-semibold flex-1 min-w-[160px]"
                          value={v.name}
                          onChange={(e) => updateVendor(v.id, { name: e.target.value })}
                          placeholder="Vendor name"
                        />
                        <select
                          className="h-9 px-2 rounded-md border border-border bg-background text-sm"
                          value={v.kind}
                          onChange={(e) => updateVendor(v.id, { kind: e.target.value as DeliveryVendor["kind"] })}
                        >
                          <option value="sendy">Sendy</option>
                          <option value="g4s">G4S Courier</option>
                          <option value="glovo">Glovo</option>
                          <option value="pickup_mtaani">Pickup Mtaani</option>
                          <option value="fargo">Fargo Courier</option>
                          <option value="boda">Boda rider network</option>
                          <option value="custom">Custom / other</option>
                        </select>
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold ml-auto">
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={(e) => updateVendor(v.id, { enabled: e.target.checked })}
                          />
                          Enabled
                        </label>
                        <button
                          onClick={() => removeVendor(v.id)}
                          className="h-8 w-8 rounded-md grid place-items-center text-destructive hover:bg-destructive/10"
                          title="Remove vendor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Grid cols={2}>
                        <Input
                          label="Contact phone"
                          value={v.phone}
                          onChange={(val) => updateVendor(v.id, { phone: val })}
                          placeholder="+254 …"
                        />
                        <Input
                          label="Contact email"
                          type="email"
                          value={v.contactEmail}
                          onChange={(val) => updateVendor(v.id, { contactEmail: val })}
                          placeholder="ops@vendor.com"
                        />
                        <Input
                          label="Coverage zones"
                          value={v.zones}
                          onChange={(val) => updateVendor(v.id, { zones: val })}
                          placeholder="Nairobi CBD, Westlands, Kasarani"
                          className="md:col-span-2"
                        />
                        <Input
                          label="Base price (KSh)"
                          type="number"
                          value={String(v.basePrice)}
                          onChange={(val) => updateVendor(v.id, { basePrice: Number(val) || 0 })}
                          placeholder="200"
                        />
                        <Input
                          label="Per km (KSh)"
                          type="number"
                          value={String(v.perKm)}
                          onChange={(val) => updateVendor(v.id, { perKm: Number(val) || 0 })}
                          placeholder="30"
                        />
                        <Input
                          label="API key"
                          value={v.apiKey}
                          onChange={(val) => updateVendor(v.id, { apiKey: val.trim() })}
                          placeholder="vendor api key"
                        />
                        <Input
                          label="API secret"
                          value={v.apiSecret}
                          onChange={(val) => updateVendor(v.id, { apiSecret: val.trim() })}
                          placeholder="vendor api secret"
                        />
                        <Textarea
                          label="Notes"
                          rows={2}
                          value={v.notes}
                          onChange={(val) => updateVendor(v.id, { notes: val })}
                        />
                      </Grid>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addVendor}
                  className="h-9 px-3 rounded-md text-sm font-semibold border border-border hover:bg-secondary inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add vendor
                </button>

                <Textarea
                  label="Internal notes"
                  rows={3}
                  value={draft.delivery.notes}
                  onChange={(v) => updateDelivery({ notes: v })}
                />
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

"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import { usePermission } from "@/lib/permissions"
import {
  Send, Plus, Trash2, Mail, MessageSquare, Phone, Eye, Copy,
  Search, Save, RotateCcw, Sparkles, Tag as TagIcon, Lock,
} from "lucide-react"

const WINE = "#3D0814"

export type TemplateChannel = "email" | "sms" | "whatsapp"
export type TemplateTrigger =
  | "order_confirmation"
  | "payment_received"
  | "order_dispatched"
  | "order_delivered"
  | "prescription_received"
  | "prescription_verified"
  | "prescription_rejected"
  | "consultation_scheduled"
  | "consultation_reminder"
  | "welcome"
  | "abandoned_cart"
  | "low_stock_internal"
  | "marketing_broadcast"
  | "custom"

export type MessageTemplate = {
  id: string
  name: string
  channel: TemplateChannel
  trigger: TemplateTrigger
  subject: string         // email only
  body: string            // supports {{variable}} interpolation
  preheader?: string      // email preview text
  whatsappTemplateName?: string // Meta-approved template name
  enabled: boolean
  updatedAt: string
}

const TRIGGER_LABEL: Record<TemplateTrigger, string> = {
  order_confirmation:     "Order confirmed",
  payment_received:       "Payment received",
  order_dispatched:       "Order dispatched",
  order_delivered:        "Order delivered",
  prescription_received:  "Prescription received",
  prescription_verified:  "Prescription verified",
  prescription_rejected:  "Prescription rejected",
  consultation_scheduled: "Consultation scheduled",
  consultation_reminder:  "Consultation reminder",
  welcome:                "Welcome / first order",
  abandoned_cart:         "Abandoned cart",
  low_stock_internal:     "Low stock (internal)",
  marketing_broadcast:    "Marketing broadcast",
  custom:                 "Custom",
}

const CHANNEL_META: Record<TemplateChannel, { label: string; icon: typeof Mail; tip: string }> = {
  email:    { label: "Email",    icon: Mail,          tip: "HTML allowed. Use a clear subject + preheader." },
  sms:      { label: "SMS",      icon: Phone,         tip: "Keep ≤ 160 chars for single segment. No HTML." },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, tip: "Use the Meta-approved template name. Body must match the registered template." },
}

const VARIABLES = [
  { token: "{{patient_name}}",  desc: "Customer full name" },
  { token: "{{first_name}}",    desc: "Customer first name" },
  { token: "{{order_id}}",      desc: "Order number" },
  { token: "{{order_total}}",   desc: "Order grand total with currency" },
  { token: "{{tracking_url}}",  desc: "Tracking page URL" },
  { token: "{{rx_id}}",         desc: "Prescription id" },
  { token: "{{rx_status}}",     desc: "Prescription status text" },
  { token: "{{consult_time}}",  desc: "Consultation start time (local)" },
  { token: "{{doctor_name}}",   desc: "Assigned doctor / pharmacist" },
  { token: "{{store_name}}",    desc: "Shaniid RX (brand)" },
  { token: "{{support_phone}}", desc: "Support phone number" },
]

const SEED: MessageTemplate[] = [
  {
    id: "tpl_order_confirm_sms",
    name: "Order confirmation — SMS",
    channel: "sms",
    trigger: "order_confirmation",
    subject: "",
    body: "Hi {{first_name}}, your Shaniid RX order {{order_id}} is confirmed — {{order_total}}. We'll text you when it ships. Track: {{tracking_url}}",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_order_confirm_email",
    name: "Order confirmation — Email",
    channel: "email",
    trigger: "order_confirmation",
    subject: "Your Shaniid RX order {{order_id}} is confirmed",
    preheader: "Thanks for trusting us — here are the details.",
    body:
      "Hi {{patient_name}},\n\nThank you for choosing Shaniid RX. Your order {{order_id}} totalling {{order_total}} has been received and is being prepared.\n\nTrack it any time: {{tracking_url}}\n\nIf you have a prescription on file, our pharmacist will verify it before dispatch.\n\nWith care,\nThe Shaniid RX team",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_rx_verified_whatsapp",
    name: "Prescription verified — WhatsApp",
    channel: "whatsapp",
    trigger: "prescription_verified",
    subject: "",
    body: "Hi {{first_name}}, your prescription {{rx_id}} has been verified by our pharmacist. We'll dispatch your order shortly. Reply to this chat if you need help.",
    whatsappTemplateName: "rx_verified_v1",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_consult_reminder_sms",
    name: "Consultation reminder — SMS",
    channel: "sms",
    trigger: "consultation_reminder",
    subject: "",
    body: "Shaniid RX: your video consultation with {{doctor_name}} starts at {{consult_time}}. Tap the link in your email to join.",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_welcome_email",
    name: "Welcome — Email",
    channel: "email",
    trigger: "welcome",
    subject: "Welcome to Shaniid RX, {{first_name}}",
    preheader: "Genuine medicine. Fair prices. Delivered with integrity.",
    body:
      "Hi {{first_name}},\n\nWelcome to Shaniid RX — the trust layer for medicine in Kenya.\n\nWhat you can do here:\n• Order genuine medicine with verified suppliers\n• Upload a prescription for pharmacist review\n• Book a chat, voice or video consultation with a clinician\n\nNeed help? Call {{support_phone}}.\n\nWith care,\nThe Shaniid RX team",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
]

const SAMPLE_PREVIEW = {
  patient_name:  "Aisha Mwangi",
  first_name:    "Aisha",
  order_id:      "SHX-100412",
  order_total:   "KSh 3,450",
  tracking_url:  "https://shaniidrx.co.ke/track/SHX-100412",
  rx_id:         "rx-001",
  rx_status:     "Verified",
  consult_time:  "Today at 5:30 PM",
  doctor_name:   "Dr. Wanjiku",
  store_name:    "Shaniid RX",
  support_phone: "+254 700 000 000",
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => vars[k.toLowerCase()] ?? `{{${k}}}`)
}

export function AdminMessageTemplates() {
  const canManage = usePermission("integrations.manage")
  const [items, setItems] = useCmsDoc<MessageTemplate[]>("message-templates", SEED)
  const [filter, setFilter] = useState<TemplateChannel | "all">("all")
  const [search, setSearch] = useState("")
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id || null)
  const [draft, setDraft] = useState<MessageTemplate | null>(items[0] || null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter((t) => filter === "all" || t.channel === filter)
      .filter((t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        TRIGGER_LABEL[t.trigger].toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, filter, search])

  const active = items.find((t) => t.id === activeId) || null
  const dirty = !!draft && !!active && JSON.stringify(draft) !== JSON.stringify(active)

  const select = (id: string) => {
    setActiveId(id)
    setDraft(items.find((t) => t.id === id) || null)
  }

  const save = () => {
    if (!canManage) { notify.warning("You don't have permission to edit templates."); return }
    if (!draft) return
    const updated = { ...draft, updatedAt: new Date().toISOString() }
    setItems((arr) => arr.map((t) => (t.id === updated.id ? updated : t)))
    setDraft(updated)
    notify.saved("Template saved")
  }

  const discard = () => {
    if (!active) return
    setDraft(active)
    notify.info("Reverted unsaved changes")
  }

  const create = () => {
    if (!canManage) { notify.warning("You don't have permission to create templates."); return }
    const t: MessageTemplate = {
      id: newId("tpl"),
      name: "New template",
      channel: "sms",
      trigger: "custom",
      subject: "",
      body: "",
      enabled: false,
      updatedAt: new Date().toISOString(),
    }
    setItems((arr) => [t, ...arr])
    setActiveId(t.id)
    setDraft(t)
    notify.info("Draft created — fill it in then Save")
  }

  const duplicate = () => {
    if (!canManage || !active) return
    const t: MessageTemplate = {
      ...active,
      id: newId("tpl"),
      name: `${active.name} (copy)`,
      enabled: false,
      updatedAt: new Date().toISOString(),
    }
    setItems((arr) => [t, ...arr])
    setActiveId(t.id)
    setDraft(t)
    notify.info("Duplicated")
  }

  const remove = () => {
    if (!canManage || !active) return
    if (!window.confirm(`Delete template "${active.name}"?`)) return
    setItems((arr) => arr.filter((t) => t.id !== active.id))
    const next = items.find((t) => t.id !== active.id) || null
    setActiveId(next?.id || null)
    setDraft(next)
    notify.saved("Template removed")
  }

  const insertVar = (token: string) => {
    if (!draft) return
    setDraft({ ...draft, body: (draft.body || "") + " " + token })
  }

  return (
    <AdminShell title="Message templates">
      <div className="space-y-4">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-lg grid place-items-center text-white shadow-sm" style={{ background: WINE }}>
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Message templates</h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Reusable copy for SMS, WhatsApp and email — sent automatically on orders, prescriptions, consultations and marketing campaigns. Use {"{{variables}}"} to personalise.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={create}
            disabled={!canManage}
            className="h-10 px-4 rounded-md text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-40"
            style={{ background: WINE }}
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        </header>

        {!canManage && (
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Read-only — requires <code className="font-mono text-[11px] px-1 rounded bg-amber-100">integrations.manage</code>.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* List */}
          <aside className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-border bg-background text-sm"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "email", "sms", "whatsapp"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
                      filter === k
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-secondary border-border"
                    }`}
                  >
                    {k === "all" ? "All" : CHANNEL_META[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background overflow-hidden divide-y divide-border max-h-[72vh] overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No templates.</p>
              )}
              {filtered.map((t) => {
                const Icon = CHANNEL_META[t.channel].icon
                return (
                  <button
                    key={t.id}
                    onClick={() => select(t.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      activeId === t.id
                        ? "bg-foreground/5 border-l-2 border-l-foreground"
                        : "hover:bg-muted/30 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{TRIGGER_LABEL[t.trigger]}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                          t.enabled ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {t.channel}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Editor */}
          <section className="rounded-lg border border-border bg-background">
            {!draft ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Select a template to edit, or create a new one.
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="p-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="text-lg font-bold bg-transparent border-b border-transparent hover:border-border focus:border-foreground focus:outline-none px-1"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={duplicate}
                      disabled={!canManage}
                      className="h-8 px-2.5 rounded-md text-xs font-semibold border border-border inline-flex items-center gap-1 hover:bg-secondary disabled:opacity-40"
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </button>
                    <button
                      onClick={remove}
                      disabled={!canManage}
                      className="h-8 px-2.5 rounded-md text-xs font-semibold text-red-700 inline-flex items-center gap-1 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <button
                      onClick={discard}
                      disabled={!dirty}
                      className="h-8 px-2.5 rounded-md text-xs font-semibold border border-border inline-flex items-center gap-1 hover:bg-secondary disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Revert
                    </button>
                    <button
                      onClick={save}
                      disabled={!dirty || !canManage}
                      className="h-8 px-3 rounded-md text-xs font-bold text-white inline-flex items-center gap-1 disabled:opacity-40"
                      style={{ background: WINE }}
                    >
                      <Save className="h-3.5 w-3.5" /> Save
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Channel">
                    <select
                      value={draft.channel}
                      onChange={(e) => setDraft({ ...draft, channel: e.target.value as TemplateChannel })}
                      className="cinput"
                    >
                      {(["email", "sms", "whatsapp"] as const).map((c) => (
                        <option key={c} value={c}>{CHANNEL_META[c].label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Trigger">
                    <select
                      value={draft.trigger}
                      onChange={(e) => setDraft({ ...draft, trigger: e.target.value as TemplateTrigger })}
                      className="cinput"
                    >
                      {(Object.keys(TRIGGER_LABEL) as TemplateTrigger[]).map((k) => (
                        <option key={k} value={k}>{TRIGGER_LABEL[k]}</option>
                      ))}
                    </select>
                  </Field>
                  {draft.channel === "whatsapp" && (
                    <Field label="WhatsApp template name">
                      <input
                        value={draft.whatsappTemplateName || ""}
                        onChange={(e) => setDraft({ ...draft, whatsappTemplateName: e.target.value })}
                        placeholder="rx_verified_v1"
                        className="cinput"
                      />
                    </Field>
                  )}
                </div>

                {draft.channel === "email" && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border">
                    <Field label="Subject">
                      <input
                        value={draft.subject}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                        placeholder="Your Shaniid RX order is on its way"
                        className="cinput"
                      />
                    </Field>
                    <Field label="Preheader (preview text)">
                      <input
                        value={draft.preheader || ""}
                        onChange={(e) => setDraft({ ...draft, preheader: e.target.value })}
                        placeholder="Tracking link inside"
                        className="cinput"
                      />
                    </Field>
                  </div>
                )}

                <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 border-t border-border">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Body</label>
                      <span className="text-[10px] text-muted-foreground">
                        {draft.body.length} chars{draft.channel === "sms" && ` · ${Math.ceil((draft.body.length || 1) / 160)} SMS segment(s)`}
                      </span>
                    </div>
                    <textarea
                      value={draft.body}
                      onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                      rows={12}
                      placeholder={CHANNEL_META[draft.channel].tip}
                      className="cinput font-mono text-[13px] leading-snug"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {CHANNEL_META[draft.channel].tip}
                    </p>
                  </div>
                  <aside className="space-y-3">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                        <TagIcon className="h-3 w-3" /> Variables
                      </h4>
                      <div className="rounded-md border border-border divide-y divide-border max-h-48 overflow-y-auto">
                        {VARIABLES.map((v) => (
                          <button
                            key={v.token}
                            onClick={() => insertVar(v.token)}
                            disabled={!canManage}
                            className="w-full text-left px-2 py-1.5 hover:bg-secondary text-xs disabled:opacity-40"
                            title={`Insert ${v.token}`}
                          >
                            <code className="font-mono text-[11px] font-semibold" style={{ color: WINE }}>{v.token}</code>
                            <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="p-4 border-t border-border">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                    <Eye className="h-3 w-3" /> Preview (with sample data)
                  </h4>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                    {draft.channel === "email" && (
                      <div className="mb-2 pb-2 border-b border-border">
                        <p className="text-xs text-muted-foreground">Subject</p>
                        <p className="font-semibold">{interpolate(draft.subject || "(no subject)", SAMPLE_PREVIEW)}</p>
                        {draft.preheader && (
                          <p className="text-xs text-muted-foreground italic mt-1">{interpolate(draft.preheader, SAMPLE_PREVIEW)}</p>
                        )}
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {interpolate(draft.body || "(empty body)", SAMPLE_PREVIEW)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`.cinput{width:100%;height:2.25rem;padding:0 0.75rem;border-radius:0.375rem;border:1px solid hsl(var(--border));background:hsl(var(--background));font-size:0.8125rem;}
        textarea.cinput{height:auto;padding:0.5rem 0.75rem;line-height:1.4;}
        .cinput:focus{outline:none;border-color:${WINE};box-shadow:0 0 0 3px rgba(61,8,20,0.1);}`}</style>
    </AdminShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

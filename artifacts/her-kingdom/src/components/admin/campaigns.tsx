"use client"

import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import { AdminShell } from "./admin-shell"
import { useCmsDoc, newId, cmsStore } from "@/lib/cms-store"
import { notify } from "@/lib/notify"
import { usePermission } from "@/lib/permissions"
import { pipelineClient, type CampaignRecipientResult } from "@/lib/pipeline-client"
import { pushAdminNotification } from "@/lib/notifications-client"
import {
  Megaphone, Send, Mail, MessageSquare, Users, GitBranch, ListChecks, Settings as SettingsIcon,
  Plus, Trash2, Edit3, Copy, Play, Pause, RotateCcw, CheckCircle2, AlertCircle, Clock,
  Lock, Eye, Save, X, ChevronRight, Calendar, Zap, Layers, Filter, Search, Download,
} from "lucide-react"

/* ────────────────────────────────────────────────────────────────────────────
   Brand
──────────────────────────────────────────────────────────────────────────── */
const WINE = "#3D0814"
const WINE_DEEP = "#6B0F1A"
const ORANGE = "#F97316"
const RED = "#B91C1C"
const CREAM = "#FFFBF5"

/* ────────────────────────────────────────────────────────────────────────────
   Types
──────────────────────────────────────────────────────────────────────────── */
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed"
export type CampaignChannel = "email" | "sms"

export type EmailTemplate = "newsletter" | "promo" | "announcement" | "plain"
export const EMAIL_TEMPLATES: { id: EmailTemplate; label: string; tag: string }[] = [
  { id: "newsletter",   label: "Newsletter",            tag: "Health Notes monthly" },
  { id: "promo",        label: "Promotion / Offer",     tag: "Discount or campaign push" },
  { id: "announcement", label: "Announcement",          tag: "Branch opening, policy update" },
  { id: "plain",        label: "Plain text",            tag: "Quiet, transactional-looking" },
]

export type EmailCampaign = {
  id: string
  name: string
  subject: string
  preheader: string
  template: EmailTemplate
  heroTitle: string
  heroSubtitle: string
  body: string                 // markdown-ish: paragraphs separated by blank lines
  ctaLabel: string
  ctaUrl: string
  audienceId: string
  status: CampaignStatus
  scheduledAt: string | null
  sentAt: string | null
  // Real delivery metrics only — derived from the send queue / campaign_sends
  // ledger. We do NOT track email opens/clicks (no pixel/redirect tracking),
  // so we never fabricate engagement numbers here.
  stats: { recipients: number; sent: number; failed: number }
  createdAt: string
  updatedAt: string
}

export type SmsCampaign = {
  id: string
  name: string
  message: string
  audienceId: string
  status: CampaignStatus
  scheduledAt: string | null
  sentAt: string | null
  batchSize: number
  batchIntervalSec: number
  stats: { recipients: number; sent: number; failed: number; segments: number }
  createdAt: string
  updatedAt: string
}

export type AudienceType = "all-subscribers" | "active-subscribers" | "all-customers" | "manual"
export type Audience = {
  id: string
  name: string
  description: string
  type: AudienceType
  channel: "email" | "sms" | "both"
  manualList: string[]         // emails or phone numbers
  createdAt: string
  updatedAt: string
}

export type PipelineTrigger =
  | "new_subscriber" | "first_order" | "abandoned_cart"
  | "rx_uploaded"   | "post_purchase" | "win_back" | "manual"

export const TRIGGER_LABEL: Record<PipelineTrigger, string> = {
  new_subscriber:  "New newsletter subscriber",
  first_order:     "First order placed",
  abandoned_cart:  "Cart abandoned",
  rx_uploaded:     "Prescription uploaded",
  post_purchase:   "Post-purchase follow-up",
  win_back:        "Win-back inactive customer",
  manual:          "Manually enrolled",
}

export type PipelineStep = {
  id: string
  channel: CampaignChannel
  waitHours: number          // delay before sending this step
  subject?: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
}

export type Pipeline = {
  id: string
  name: string
  description: string
  trigger: PipelineTrigger
  audienceId: string
  steps: PipelineStep[]
  enabled: boolean
  enrolledCount: number
  createdAt: string
  updatedAt: string
}

export type QueueItem = {
  id: string
  campaignId: string
  campaignName: string
  channel: CampaignChannel
  recipient: string
  status: "queued" | "sending" | "sent" | "failed"
  attempts: number
  scheduledAt: string
  sentAt: string | null
  error: string | null
  batchNumber: number
}

export type CampaignSettings = {
  sender: {
    fromName: string
    fromEmail: string
    replyTo: string
    smsSenderId: string
  }
  throttle: {
    emailPerMinute: number
    smsPerMinute: number
    defaultBatchSize: number
    defaultBatchIntervalSec: number
  }
  brand: {
    logoUrl: string
    primaryColor: string
    footerNote: string
    unsubscribeText: string
    address: string
  }
  consent: {
    requireDoubleOptIn: boolean
    includeUnsubscribeFooter: boolean
  }
}

const DEFAULT_SETTINGS: CampaignSettings = {
  sender: {
    fromName: "Shaniid RX",
    fromEmail: "hello@shaniidrx.com",
    replyTo: "support@shaniidrx.com",
    smsSenderId: "SHANIID",
  },
  throttle: {
    emailPerMinute: 120,
    smsPerMinute: 60,
    defaultBatchSize: 25,
    defaultBatchIntervalSec: 20,
  },
  brand: {
    logoUrl: "/logo.svg",
    primaryColor: WINE,
    footerNote: "Shaniid RX — A Shaniid Group Company. Medicine you can trust, delivered.",
    unsubscribeText: "You're receiving this because you subscribed to Shaniid RX updates. Unsubscribe anytime.",
    address: "Nairobi, Kenya",
  },
  consent: {
    requireDoubleOptIn: true,
    includeUnsubscribeFooter: true,
  },
}

/* ────────────────────────────────────────────────────────────────────────────
   Variables / token interpolation (shared with message-templates)
──────────────────────────────────────────────────────────────────────────── */
const VARIABLES = [
  { token: "{{first_name}}",    desc: "First name" },
  { token: "{{patient_name}}",  desc: "Full name" },
  { token: "{{email}}",         desc: "Email" },
  { token: "{{store_name}}",    desc: "Shaniid RX" },
  { token: "{{order_id}}",      desc: "Last order id" },
  { token: "{{tracking_url}}",  desc: "Order tracking link" },
  { token: "{{rx_id}}",         desc: "Prescription id" },
  { token: "{{cta_url}}",       desc: "Call-to-action URL" },
  { token: "{{unsubscribe}}",   desc: "Unsubscribe link" },
]

function interpolate(s: string, ctx: Record<string, string>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] ?? `{{${k}}}`))
}

const PREVIEW_CTX: Record<string, string> = {
  first_name:   "Amina",
  patient_name: "Amina Yusuf",
  email:        "amina@example.com",
  store_name:   "Shaniid RX",
  order_id:     "SR-10428",
  tracking_url: "https://shaniidrx.com/orders/SR-10428",
  rx_id:        "RX-3091",
  cta_url:      "https://shaniidrx.com",
  unsubscribe:  "https://shaniidrx.com/unsubscribe",
}

/* ────────────────────────────────────────────────────────────────────────────
   SMS segment counter (GSM-7 vs UCS-2 heuristic)
──────────────────────────────────────────────────────────────────────────── */
function smsSegmentInfo(msg: string): { chars: number; segments: number; encoding: "GSM-7" | "UCS-2" } {
  // crude: any non-ASCII => UCS-2 (70 chars per segment)
  const ucs2 = /[^\x00-\x7F]/.test(msg)
  const encoding = ucs2 ? "UCS-2" : "GSM-7"
  const perSeg = ucs2 ? (msg.length <= 70 ? 70 : 67) : (msg.length <= 160 ? 160 : 153)
  const segments = msg.length === 0 ? 0 : Math.ceil(msg.length / perSeg)
  return { chars: msg.length, segments, encoding }
}

/* ────────────────────────────────────────────────────────────────────────────
   Audience resolution
──────────────────────────────────────────────────────────────────────────── */
type Subscriber = { id: string; email: string; is_active: boolean; subscribed_at: string }
type Customer = { id?: string; email?: string; phone?: string; full_name?: string; active?: boolean }

function resolveRecipients(audience: Audience): string[] {
  if (audience.type === "manual") return audience.manualList.filter(Boolean)
  const subs = cmsStore.get<Subscriber[]>("newsletter-subscribers", [])
  const custs = cmsStore.get<Customer[]>("customers", [])
  const isSms = audience.channel === "sms"
  if (audience.type === "all-subscribers") {
    return isSms
      ? [] // newsletter subscribers don't carry phone numbers
      : subs.map((s) => s.email).filter(Boolean)
  }
  if (audience.type === "active-subscribers") {
    return isSms
      ? []
      : subs.filter((s) => s.is_active).map((s) => s.email).filter(Boolean)
  }
  if (audience.type === "all-customers") {
    return isSms
      ? custs.map((c) => c.phone || "").filter(Boolean)
      : custs.map((c) => c.email || "").filter(Boolean)
  }
  return []
}

/* ────────────────────────────────────────────────────────────────────────────
   Queue dispatcher — module-level singleton.
   Any campaigns page mount adds a refcount; the interval ticks exactly once
   regardless of how many components are mounted (prevents read-modify-write
   clobbering across views). Due queue items are dispatched to the real backend
   send endpoint (email / SMS / WhatsApp); per-recipient results are folded back
   into the queue. A campaign with an in-flight dispatch is skipped until its
   results land, so we never double-send.
──────────────────────────────────────────────────────────────────────────── */
let simulatorRefCount = 0
let simulatorTimer: number | null = null
const inFlightCampaigns = new Set<string>()

/**
 * Fire a single admin bell notification when a campaign finishes dispatching.
 * Called exactly once per campaign at the not-sent → sent transition (the
 * `!c.sentAt` guard in rollupCampaignStats prevents repeats). Level reflects
 * real outcome: alert if all failed, warning if some failed, success if clean.
 */
function notifyCampaignComplete(kind: "Email" | "SMS", name: string, id: string, sent: number, failed: number) {
  const level: "success" | "warning" | "alert" = failed === 0 ? "success" : sent === 0 ? "alert" : "warning"
  const outcome =
    failed === 0
      ? `Delivered to ${sent} recipient${sent === 1 ? "" : "s"}.`
      : sent === 0
      ? `All ${failed} message${failed === 1 ? "" : "s"} failed to send.`
      : `${sent} sent, ${failed} failed — review the failures.`
  void pushAdminNotification({
    module: "communications",
    level,
    title: `${kind} campaign "${name}" ${failed === 0 ? "completed" : "needs attention"}`,
    body: outcome,
    href: "/admin/campaigns",
  })
}

function rollupCampaignStats() {
  const queue = cmsStore.get<QueueItem[]>("campaign-queue", [])
  const emails = cmsStore.get<EmailCampaign[]>("campaign-emails", [])
  const sms    = cmsStore.get<SmsCampaign[]>("campaign-sms", [])
  let emailsTouched = false, smsTouched = false
  for (const c of emails) {
    const items = queue.filter((q) => q.campaignId === c.id)
    if (items.length === 0) continue
    const sent = items.filter((i) => i.status === "sent").length
    const failed = items.filter((i) => i.status === "failed").length
    const remaining = items.filter((i) => i.status === "queued" || i.status === "sending").length
    if (c.stats.sent !== sent || c.stats.failed !== failed) {
      c.stats = { ...c.stats, sent, failed }
      emailsTouched = true
    }
    const newStatus: CampaignStatus = remaining === 0 ? "sent" : "sending"
    if (c.status !== newStatus) {
      c.status = newStatus
      if (newStatus === "sent" && !c.sentAt) {
        c.sentAt = new Date().toISOString()
        notifyCampaignComplete("Email", c.name, c.id, sent, failed)
      }
      emailsTouched = true
    }
  }
  for (const c of sms) {
    const items = queue.filter((q) => q.campaignId === c.id)
    if (items.length === 0) continue
    const sent = items.filter((i) => i.status === "sent").length
    const failed = items.filter((i) => i.status === "failed").length
    const remaining = items.filter((i) => i.status === "queued" || i.status === "sending").length
    if (c.stats.sent !== sent || c.stats.failed !== failed) {
      c.stats = { ...c.stats, sent, failed }
      smsTouched = true
    }
    const newStatus: CampaignStatus = remaining === 0 ? "sent" : "sending"
    if (c.status !== newStatus) {
      c.status = newStatus
      if (newStatus === "sent" && !c.sentAt) {
        c.sentAt = new Date().toISOString()
        notifyCampaignComplete("SMS", c.name, c.id, sent, failed)
      }
      smsTouched = true
    }
  }
  if (emailsTouched) cmsStore.set("campaign-emails", emails)
  if (smsTouched)    cmsStore.set("campaign-sms", sms)
}

/** Fold a backend dispatch response (or hard error) back into the queue. */
function applyDispatchResults(
  campaignId: string,
  dispatchedIds: Set<string>,
  results: CampaignRecipientResult[] | null,
  hardError?: string,
) {
  inFlightCampaigns.delete(campaignId)
  const queue = cmsStore.get<QueueItem[]>("campaign-queue", [])
  const byRecipient = new Map((results ?? []).map((r) => [r.to, r]))
  let changed = false
  for (const q of queue) {
    if (!dispatchedIds.has(q.id) || q.status !== "sending") continue
    q.attempts += 1
    if (hardError) {
      q.status = "failed"
      q.error = hardError
    } else {
      const r = byRecipient.get(q.recipient)
      if (!r) {
        q.status = "failed"
        q.error = "No result returned"
      } else if (r.status === "sent") {
        q.status = "sent"
        q.sentAt = new Date().toISOString()
        q.error = null
      } else if (r.status === "skipped") {
        q.status = "failed"
        q.error = r.reason || "Channel provider not configured"
      } else {
        q.status = "failed"
        q.error = r.reason || "Send failed"
      }
    }
    changed = true
  }
  if (changed) cmsStore.set("campaign-queue", queue)
  rollupCampaignStats()
}

function startSimulatorTick() {
  const tick = () => {
    const queue = cmsStore.get<QueueItem[]>("campaign-queue", [])
    if (queue.length === 0) return
    const now = Date.now()
    // Recover orphaned "sending" rows left over from a prior page session: a row
    // is only legitimately mid-flight while its campaign is in inFlightCampaigns
    // (an in-memory Set reset on every page load). Any "sending" row without an
    // in-flight owner was stranded by a reload/crash — return it to "queued" so
    // this tick re-dispatches it instead of leaving it stuck forever.
    let recovered = false
    for (const q of queue) {
      if (q.status === "sending" && !inFlightCampaigns.has(q.campaignId)) {
        q.status = "queued"
        recovered = true
      }
    }
    if (recovered) cmsStore.set("campaign-queue", queue)
    // Group due, not-yet-dispatched items by campaign (skip in-flight campaigns).
    const grouped = new Map<string, QueueItem[]>()
    for (const q of queue) {
      if (
        q.status === "queued" &&
        new Date(q.scheduledAt).getTime() <= now &&
        !inFlightCampaigns.has(q.campaignId)
      ) {
        if (!grouped.has(q.campaignId)) grouped.set(q.campaignId, [])
        grouped.get(q.campaignId)!.push(q)
      }
    }
    if (grouped.size === 0) { rollupCampaignStats(); return }

    const emails = cmsStore.get<EmailCampaign[]>("campaign-emails", [])
    const sms    = cmsStore.get<SmsCampaign[]>("campaign-sms", [])
    let changed = false
    for (const [campaignId, items] of grouped) {
      const batch = items.slice(0, 50) // cap recipients dispatched per tick
      const channel = batch[0].channel
      let subject: string | undefined
      let body: string
      if (channel === "email") {
        const c = emails.find((e) => e.id === campaignId)
        if (!c) continue
        subject = c.subject
        body = c.body
      } else {
        const c = sms.find((s) => s.id === campaignId)
        if (!c) continue
        body = c.message
      }
      const dispatchedIds = new Set(batch.map((b) => b.id))
      const recipients = batch.map((b) => b.recipient)
      for (const it of batch) { it.status = "sending"; changed = true }
      inFlightCampaigns.add(campaignId)
      pipelineClient.communications
        .campaignSend({ channel, subject, body, recipients, campaignId })
        .then((res) => applyDispatchResults(campaignId, dispatchedIds, res.results))
        .catch((err) =>
          applyDispatchResults(
            campaignId,
            dispatchedIds,
            null,
            err instanceof Error ? err.message : "Send failed",
          ),
        )
    }
    if (changed) cmsStore.set("campaign-queue", queue)
    rollupCampaignStats()
  }
  simulatorTimer = window.setInterval(tick, 1500) as unknown as number
}

function stopSimulatorTick() {
  if (simulatorTimer != null) { window.clearInterval(simulatorTimer); simulatorTimer = null }
}

function useCampaignSimulator() {
  useEffect(() => {
    simulatorRefCount += 1
    if (simulatorRefCount === 1) startSimulatorTick()
    return () => {
      simulatorRefCount -= 1
      if (simulatorRefCount <= 0) { simulatorRefCount = 0; stopSimulatorTick() }
    }
  }, [])
}

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────────────── */
function enqueueCampaign(
  channel: CampaignChannel,
  campaign: { id: string; name: string; scheduledAt: string | null; batchSize?: number; batchIntervalSec?: number },
  recipients: string[],
): number {
  const queue = cmsStore.get<QueueItem[]>("campaign-queue", [])
  const startAt = campaign.scheduledAt ? new Date(campaign.scheduledAt).getTime() : Date.now()
  const batchSize = Math.max(1, campaign.batchSize ?? 25)
  const intervalMs = Math.max(1000, (campaign.batchIntervalSec ?? 20) * 1000)
  const fresh: QueueItem[] = recipients.map((r, idx) => {
    const batchNumber = Math.floor(idx / batchSize) + 1
    const offset = (batchNumber - 1) * intervalMs
    return {
      id: newId(),
      campaignId: campaign.id,
      campaignName: campaign.name,
      channel,
      recipient: r,
      status: "queued",
      attempts: 0,
      scheduledAt: new Date(startAt + offset).toISOString(),
      sentAt: null,
      error: null,
      batchNumber,
    }
  })
  cmsStore.set("campaign-queue", [...queue, ...fresh])
  return fresh.length
}

function audienceCount(audience: Audience | undefined): number {
  if (!audience) return 0
  return resolveRecipients(audience).length
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

function StatusPill({ status }: { status: CampaignStatus | QueueItem["status"] }) {
  const map: Record<string, { bg: string; fg: string }> = {
    draft:     { bg: "bg-stone-100", fg: "text-stone-700" },
    scheduled: { bg: "bg-amber-50",  fg: "text-amber-700" },
    queued:    { bg: "bg-amber-50",  fg: "text-amber-700" },
    sending:   { bg: "bg-blue-50",   fg: "text-blue-700" },
    sent:      { bg: "bg-emerald-50", fg: "text-emerald-700" },
    paused:    { bg: "bg-orange-50", fg: "text-orange-700" },
    failed:    { bg: "bg-red-50",    fg: "text-red-700" },
  }
  const m = map[status] || map.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${m.bg} ${m.fg}`}>
      {status}
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Shared shell — Campaigns tab strip
──────────────────────────────────────────────────────────────────────────── */
const TABS: { href: string; label: string; icon: typeof Megaphone }[] = [
  { href: "/admin/campaigns",            label: "Overview",   icon: Megaphone },
  { href: "/admin/campaigns/email",      label: "Email",      icon: Mail },
  { href: "/admin/campaigns/sms",        label: "SMS",        icon: MessageSquare },
  { href: "/admin/campaigns/audiences",  label: "Audiences",  icon: Users },
  { href: "/admin/campaigns/pipelines",  label: "Pipelines",  icon: GitBranch },
  { href: "/admin/campaigns/queue",      label: "Queue",      icon: ListChecks },
  { href: "/admin/campaigns/settings",   label: "Settings",   icon: SettingsIcon },
]

function CampaignsTabBar() {
  const [loc] = useLocation()
  return (
    <div className="border-b border-stone-200 mb-6 -mt-2 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {TABS.map((t) => {
          const active = loc === t.href
          const Icon = t.icon
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-orange-500 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300"
              }`}
              style={active ? { color: WINE } : undefined}
              data-testid={`tab-${t.label.toLowerCase()}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function LockedNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <Lock className="h-4 w-4 text-amber-700 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-amber-900">View-only</p>
        <p className="text-amber-800">You need <code>integrations.manage</code> to create or edit campaigns.</p>
      </div>
    </div>
  )
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900" style={{ color: WINE }}>{title}</h1>
        {subtitle && <p className="text-sm text-stone-600 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   1. OVERVIEW
═══════════════════════════════════════════════════════════════════════════ */
export function AdminCampaignsOverview() {
  useCampaignSimulator()
  const [emails] = useCmsDoc<EmailCampaign[]>("campaign-emails", [])
  const [sms]    = useCmsDoc<SmsCampaign[]>("campaign-sms", [])
  const [queue]  = useCmsDoc<QueueItem[]>("campaign-queue", [])
  const [pipelines] = useCmsDoc<Pipeline[]>("campaign-pipelines", [])

  const stats = useMemo(() => {
    const all: { status: CampaignStatus; recipients: number; sent: number; failed: number }[] = [
      ...emails.map((e) => ({ status: e.status, recipients: e.stats.recipients, sent: e.stats.sent, failed: e.stats.failed })),
      ...sms.map((s) => ({ status: s.status, recipients: s.stats.recipients, sent: s.stats.sent, failed: s.stats.failed })),
    ]
    const totalRecipients = all.reduce((n, c) => n + c.recipients, 0)
    const totalSent       = all.reduce((n, c) => n + c.sent, 0)
    const queued          = queue.filter((q) => q.status === "queued" || q.status === "sending").length
    const failed          = queue.filter((q) => q.status === "failed").length
    // Real delivery rate = successfully sent / total recipients across campaigns.
    const deliveredRate   = totalRecipients ? Math.round((totalSent / totalRecipients) * 100) : 0
    return { totalRecipients, totalSent, queued, failed, deliveredRate }
  }, [emails, sms, queue])

  const recent = useMemo(() => {
    const combined: (EmailCampaign | SmsCampaign)[] = [...emails, ...sms]
    return combined.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6)
  }, [emails, sms])

  return (
    <AdminShell title="Marketing Campaigns">
      <CampaignsTabBar />
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Plan, send and track every email and SMS reaching your patients."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Kpi label="Campaigns"      value={emails.length + sms.length} icon={Megaphone} />
        <Kpi label="Recipients"     value={stats.totalRecipients}      icon={Users} />
        <Kpi label="Sent"           value={stats.totalSent}            icon={Send}   tone="emerald" />
        <Kpi label="Delivered"      value={`${stats.deliveredRate}%`}  icon={CheckCircle2} tone="blue" />
        <Kpi label="In queue"       value={stats.queued}               icon={Clock}  tone="amber" />
        <Kpi label="Failed"         value={stats.failed}               icon={AlertCircle} tone="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Recent campaigns</h2>
            <div className="flex gap-2">
              <Link href="/admin/campaigns/email" className="text-xs text-orange-600 hover:text-orange-700">New email</Link>
              <span className="text-stone-300">·</span>
              <Link href="/admin/campaigns/sms" className="text-xs text-orange-600 hover:text-orange-700">New SMS</Link>
            </div>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              hint="Start with a newsletter or a short SMS push — both are below."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Channel</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Sent</th>
                  <th className="text-right px-4 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => {
                  const isEmail = "subject" in c
                  return (
                    <tr key={c.id} className="border-t border-stone-100">
                      <td className="px-4 py-2.5 font-medium text-stone-900">{c.name}</td>
                      <td className="px-4 py-2.5 text-stone-600">{isEmail ? "Email" : "SMS"}</td>
                      <td className="px-4 py-2.5"><StatusPill status={c.status} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.stats.sent}/{c.stats.recipients}</td>
                      <td className="px-4 py-2.5 text-right text-stone-500">{relativeTime(c.updatedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-stone-200 rounded-lg">
          <div className="px-4 py-3 border-b border-stone-200">
            <h2 className="font-semibold text-stone-900">Sales pipelines</h2>
          </div>
          {pipelines.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title="No drip flows yet"
              hint="Set up onboarding, abandoned cart and win-back sequences."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {pipelines.slice(0, 6).map((p) => (
                <li key={p.id} className="px-4 py-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-900">{p.name}</div>
                    <div className="text-xs text-stone-500">{TRIGGER_LABEL[p.trigger]} · {p.steps.length} step{p.steps.length === 1 ? "" : "s"}</div>
                  </div>
                  <span className={`text-xs ${p.enabled ? "text-emerald-700" : "text-stone-400"}`}>
                    {p.enabled ? "Live" : "Off"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="p-3 border-t border-stone-100">
            <Link href="/admin/campaigns/pipelines" className="text-xs text-orange-600 hover:text-orange-700 inline-flex items-center gap-1">
              Manage pipelines <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

function Kpi({ label, value, icon: Icon, tone = "stone" }: {
  label: string; value: number | string; icon: typeof Megaphone; tone?: "stone" | "emerald" | "blue" | "amber" | "red"
}) {
  const toneMap = {
    stone:   "bg-stone-50 text-stone-700",
    emerald: "bg-emerald-50 text-emerald-700",
    blue:    "bg-blue-50 text-blue-700",
    amber:   "bg-amber-50 text-amber-700",
    red:     "bg-red-50 text-red-700",
  }
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-500">{label}</span>
        <span className={`p-1.5 rounded ${toneMap[tone]}`}><Icon className="h-3.5 w-3.5" /></span>
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: WINE }}>{value}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: typeof Megaphone; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="py-12 text-center">
      <div className="inline-flex p-3 rounded-full bg-stone-100 text-stone-500 mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-medium text-stone-900">{title}</p>
      {hint && <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   2. EMAIL CAMPAIGNS — list + designer + live preview
═══════════════════════════════════════════════════════════════════════════ */
const BLANK_EMAIL = (): EmailCampaign => ({
  id: newId(),
  name: "Untitled email",
  subject: "",
  preheader: "",
  template: "newsletter",
  heroTitle: "",
  heroSubtitle: "",
  body: "",
  ctaLabel: "Shop now",
  ctaUrl: "https://shaniidrx.com",
  audienceId: "",
  status: "draft",
  scheduledAt: null,
  sentAt: null,
  stats: { recipients: 0, sent: 0, failed: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export function AdminCampaignsEmail() {
  useCampaignSimulator()
  const canManage = usePermission("integrations.manage")
  const [emails, setEmails] = useCmsDoc<EmailCampaign[]>("campaign-emails", [])
  const [audiences] = useCmsDoc<Audience[]>("campaign-audiences", [])
  const [settings] = useCmsDoc<CampaignSettings>("campaign-settings", DEFAULT_SETTINGS)
  const [editing, setEditing] = useState<EmailCampaign | null>(null)
  const [filter, setFilter] = useState<"all" | CampaignStatus>("all")

  const filtered = emails.filter((e) => filter === "all" ? true : e.status === filter)

  const save = (c: EmailCampaign) => {
    const next = { ...c, updatedAt: new Date().toISOString() }
    setEmails((prev) => {
      const idx = prev.findIndex((e) => e.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]; copy[idx] = next; return copy
    })
    notify.success("Email campaign saved")
    setEditing(null)
  }

  const remove = (id: string) => {
    if (!confirm("Delete this campaign? Queued sends will be cancelled.")) return
    setEmails((prev) => prev.filter((e) => e.id !== id))
    const queue = cmsStore.get<QueueItem[]>("campaign-queue", [])
    cmsStore.set("campaign-queue", queue.filter((q) => q.campaignId !== id))
    notify.success("Campaign deleted")
  }

  const duplicate = (c: EmailCampaign) => {
    const copy: EmailCampaign = {
      ...c,
      id: newId(),
      name: `${c.name} (copy)`,
      status: "draft",
      scheduledAt: null,
      sentAt: null,
      stats: { recipients: 0, sent: 0, failed: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEmails((prev) => [copy, ...prev])
    notify.success("Duplicated")
  }

  const sendOrSchedule = (c: EmailCampaign) => {
    const audience = audiences.find((a) => a.id === c.audienceId)
    if (!audience) { notify.error("Pick an audience first"); return }
    const recipients = resolveRecipients(audience)
    if (recipients.length === 0) { notify.error("Audience has no recipients yet"); return }
    const scheduledAt = c.scheduledAt
    const next: EmailCampaign = {
      ...c,
      status: scheduledAt && new Date(scheduledAt).getTime() > Date.now() ? "scheduled" : "sending",
      stats: { ...c.stats, recipients: recipients.length },
      updatedAt: new Date().toISOString(),
    }
    setEmails((prev) => {
      const idx = prev.findIndex((e) => e.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]; copy[idx] = next; return copy
    })
    const n = enqueueCampaign("email", {
      id: next.id, name: next.name, scheduledAt: next.scheduledAt,
      batchSize: settings.throttle.defaultBatchSize,
      batchIntervalSec: settings.throttle.defaultBatchIntervalSec,
    }, recipients)
    notify.success(
      scheduledAt && new Date(scheduledAt).getTime() > Date.now()
        ? `Scheduled ${n} email${n === 1 ? "" : "s"}`
        : `Queued ${n} email${n === 1 ? "" : "s"} to send`,
    )
    setEditing(null)
  }

  if (editing) {
    return (
      <AdminShell title="Email Campaign">
        <CampaignsTabBar />
        <EmailDesigner
          value={editing}
          audiences={audiences}
          settings={settings}
          canManage={canManage}
          onCancel={() => setEditing(null)}
          onSave={save}
          onSend={sendOrSchedule}
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Email Campaigns">
      <CampaignsTabBar />
      <PageHeader
        title="Email Campaigns"
        subtitle="Newsletters, promotional pushes and announcements — designed in the Shaniid RX voice."
        action={
          canManage && (
            <button
              onClick={() => setEditing(BLANK_EMAIL())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium"
              style={{ background: WINE }}
              data-testid="button-new-email-campaign"
            >
              <Plus className="h-4 w-4" /> New email campaign
            </button>
          )
        }
      />
      {!canManage && <div className="mb-4"><LockedNotice /></div>}

      <div className="flex items-center gap-2 mb-3 text-sm">
        <Filter className="h-4 w-4 text-stone-400" />
        {(["all", "draft", "scheduled", "sending", "sent", "paused", "failed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-2.5 py-1 rounded-md ${filter === s ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No email campaigns"
            hint="Start your first newsletter — pick a template, write a subject line, send to your subscribers."
            action={canManage ? (
              <button
                onClick={() => setEditing(BLANK_EMAIL())}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm"
                style={{ background: WINE }}
              >
                <Plus className="h-4 w-4" /> Create one
              </button>
            ) : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Subject</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Recipients</th>
                <th className="text-right px-4 py-2 font-medium">Sent</th>
                <th className="text-right px-4 py-2 font-medium">Failed</th>
                <th className="px-4 py-2 w-1" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-stone-100">
                  <td className="px-4 py-2.5 font-medium text-stone-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-stone-700 max-w-[260px] truncate">{c.subject || <span className="text-stone-400">(no subject)</span>}</td>
                  <td className="px-4 py-2.5"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.stats.recipients}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.stats.sent}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.stats.failed > 0 ? <span className="text-red-600">{c.stats.failed}</span> : c.stats.failed}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <button onClick={() => setEditing(c)} className="p-1.5 text-stone-500 hover:text-stone-900" title="Edit"><Edit3 className="h-4 w-4" /></button>
                    {canManage && <button onClick={() => duplicate(c)} className="p-1.5 text-stone-500 hover:text-stone-900" title="Duplicate"><Copy className="h-4 w-4" /></button>}
                    {canManage && <button onClick={() => remove(c.id)} className="p-1.5 text-red-500 hover:text-red-700" title="Delete"><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  )
}

function EmailDesigner({
  value, audiences, settings, canManage, onCancel, onSave, onSend,
}: {
  value: EmailCampaign
  audiences: Audience[]
  settings: CampaignSettings
  canManage: boolean
  onCancel: () => void
  onSave: (v: EmailCampaign) => void
  onSend: (v: EmailCampaign) => void
}) {
  const [c, setC] = useState<EmailCampaign>(value)
  const emailAudiences = audiences.filter((a) => a.channel === "email" || a.channel === "both")
  const audience = audiences.find((a) => a.id === c.audienceId)
  const recipientCount = audienceCount(audience)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Back to email campaigns
          </button>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: WINE }}>{c.name || "Untitled email"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button onClick={() => onSave(c)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm">
                <Save className="h-4 w-4" /> Save draft
              </button>
              <button
                onClick={() => onSend(c)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium"
                style={{ background: WINE }}
                data-testid="button-send-or-schedule"
              >
                <Send className="h-4 w-4" />
                {c.scheduledAt && new Date(c.scheduledAt).getTime() > Date.now() ? "Schedule send" : "Send now"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Basics">
            <Field label="Campaign name (internal)">
              <input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
            </Field>
            <Field label="Subject line">
              <input className="input" value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value })} placeholder="Health Notes — May edition" />
            </Field>
            <Field label="Preheader (preview snippet)">
              <input className="input" value={c.preheader} onChange={(e) => setC({ ...c, preheader: e.target.value })} placeholder="Five things every household pharmacy should keep on hand." />
            </Field>
          </Card>

          <Card title="Template">
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TEMPLATES.map((t) => {
                const active = c.template === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setC({ ...c, template: t.id })}
                    className={`text-left p-3 rounded-md border transition-colors ${active ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:border-stone-400"}`}
                  >
                    <div className="font-medium text-sm" style={{ color: active ? WINE : undefined }}>{t.label}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">{t.tag}</div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title="Hero">
            <Field label="Hero title">
              <input className="input" value={c.heroTitle} onChange={(e) => setC({ ...c, heroTitle: e.target.value })} placeholder="Medicine you can trust." />
            </Field>
            <Field label="Hero subtitle">
              <input className="input" value={c.heroSubtitle} onChange={(e) => setC({ ...c, heroSubtitle: e.target.value })} placeholder="A note from our pharmacy team." />
            </Field>
          </Card>

          <Card title="Body">
            <textarea
              className="input min-h-[180px] font-mono text-[13px]"
              value={c.body}
              onChange={(e) => setC({ ...c, body: e.target.value })}
              placeholder="Write paragraphs separated by blank lines. Use {{first_name}} to personalize."
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => setC({ ...c, body: c.body + " " + v.token })}
                  className="text-[11px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                  title={v.desc}
                >
                  {v.token}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Call to action">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button label">
                <input className="input" value={c.ctaLabel} onChange={(e) => setC({ ...c, ctaLabel: e.target.value })} />
              </Field>
              <Field label="Button URL">
                <input className="input" value={c.ctaUrl} onChange={(e) => setC({ ...c, ctaUrl: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Audience & schedule">
            <Field label="Audience">
              <select className="input" value={c.audienceId} onChange={(e) => setC({ ...c, audienceId: e.target.value })}>
                <option value="">Pick an audience…</option>
                {emailAudiences.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {audience && (
                <p className="text-xs text-stone-500 mt-1">{recipientCount} recipient{recipientCount === 1 ? "" : "s"} match this audience right now.</p>
              )}
              {emailAudiences.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No email audiences yet. <Link href="/admin/campaigns/audiences" className="underline">Create one</Link>.
                </p>
              )}
            </Field>
            <Field label="Schedule (optional — leave empty to send now)">
              <input
                type="datetime-local"
                className="input"
                value={c.scheduledAt ? c.scheduledAt.slice(0, 16) : ""}
                onChange={(e) => setC({ ...c, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </Field>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          <div className="sticky top-4">
            <div className="text-xs uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" /> Live preview
            </div>
            <EmailPreview campaign={c} settings={settings} />
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailPreview({ campaign, settings }: { campaign: EmailCampaign; settings: CampaignSettings }) {
  const subj = interpolate(campaign.subject || "(no subject)", PREVIEW_CTX)
  const pre  = interpolate(campaign.preheader, PREVIEW_CTX)
  const heroTitle = interpolate(campaign.heroTitle, PREVIEW_CTX)
  const heroSub   = interpolate(campaign.heroSubtitle, PREVIEW_CTX)
  const bodyParas = interpolate(campaign.body, PREVIEW_CTX).split(/\n\s*\n/).filter(Boolean)
  const ctaLabel  = interpolate(campaign.ctaLabel, PREVIEW_CTX)

  const headerStyle: React.CSSProperties = (() => {
    switch (campaign.template) {
      case "newsletter":   return { background: WINE, color: "#fff" }
      case "promo":        return { background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_DEEP} 100%)`, color: "#fff" }
      case "announcement": return { background: CREAM, color: WINE, borderBottom: `4px solid ${ORANGE}` }
      case "plain":        return { background: "#fff", color: WINE, borderBottom: "1px solid #e7e5e4" }
    }
  })()

  return (
    <div className="bg-stone-100 rounded-lg p-4">
      <div className="text-xs text-stone-500 mb-2 flex items-center gap-3">
        <span><span className="text-stone-700 font-medium">From:</span> {settings.sender.fromName} &lt;{settings.sender.fromEmail}&gt;</span>
        <span><span className="text-stone-700 font-medium">Subject:</span> {subj}</span>
      </div>
      {pre && <div className="text-xs text-stone-500 mb-2 italic truncate">Preview: {pre}</div>}
      <div className="mx-auto max-w-[560px] bg-white rounded-md overflow-hidden shadow-sm border border-stone-200">
        <div className="px-6 py-5" style={headerStyle}>
          <div className="text-xs uppercase tracking-wider opacity-80">Shaniid RX</div>
          {heroTitle && <div className="text-xl font-semibold mt-1">{heroTitle}</div>}
          {heroSub && <div className="text-sm opacity-90 mt-1">{heroSub}</div>}
        </div>
        <div className="px-6 py-6 space-y-4 text-[14px] leading-relaxed text-stone-800">
          {bodyParas.length === 0 ? (
            <p className="text-stone-400">Your message body will appear here.</p>
          ) : bodyParas.map((p, i) => <p key={i}>{p}</p>)}
          {campaign.ctaUrl && ctaLabel && (
            <div className="pt-2">
              <span
                className="inline-block px-5 py-2.5 rounded-md text-white text-sm font-medium"
                style={{ background: ORANGE }}
              >
                {ctaLabel}
              </span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 text-[11px] text-stone-500 border-t border-stone-100 bg-stone-50">
          <p>{settings.brand.footerNote}</p>
          <p className="mt-1">{settings.brand.address}</p>
          {settings.consent.includeUnsubscribeFooter && (
            <p className="mt-2"><span className="underline">Unsubscribe</span> · {settings.brand.unsubscribeText}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   3. SMS CAMPAIGNS — queued / batch send
═══════════════════════════════════════════════════════════════════════════ */
const BLANK_SMS = (defaults: CampaignSettings): SmsCampaign => ({
  id: newId(),
  name: "Untitled SMS",
  message: "",
  audienceId: "",
  status: "draft",
  scheduledAt: null,
  sentAt: null,
  batchSize: defaults.throttle.defaultBatchSize,
  batchIntervalSec: defaults.throttle.defaultBatchIntervalSec,
  stats: { recipients: 0, sent: 0, failed: 0, segments: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export function AdminCampaignsSms() {
  useCampaignSimulator()
  const canManage = usePermission("integrations.manage")
  const [sms, setSms] = useCmsDoc<SmsCampaign[]>("campaign-sms", [])
  const [audiences] = useCmsDoc<Audience[]>("campaign-audiences", [])
  const [settings] = useCmsDoc<CampaignSettings>("campaign-settings", DEFAULT_SETTINGS)
  const [editing, setEditing] = useState<SmsCampaign | null>(null)

  const save = (c: SmsCampaign) => {
    const seg = smsSegmentInfo(c.message)
    const next: SmsCampaign = { ...c, stats: { ...c.stats, segments: seg.segments }, updatedAt: new Date().toISOString() }
    setSms((prev) => {
      const idx = prev.findIndex((e) => e.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]; copy[idx] = next; return copy
    })
    notify.success("SMS campaign saved")
    setEditing(null)
  }

  const remove = (id: string) => {
    if (!confirm("Delete this SMS campaign? Queued sends will be cancelled.")) return
    setSms((prev) => prev.filter((e) => e.id !== id))
    const queue = cmsStore.get<QueueItem[]>("campaign-queue", [])
    cmsStore.set("campaign-queue", queue.filter((q) => q.campaignId !== id))
    notify.success("Deleted")
  }

  const sendOrSchedule = (c: SmsCampaign) => {
    const audience = audiences.find((a) => a.id === c.audienceId)
    if (!audience) { notify.error("Pick an audience first"); return }
    const recipients = resolveRecipients(audience)
    if (recipients.length === 0) { notify.error("Audience has no recipients yet"); return }
    if (!c.message.trim()) { notify.error("Write a message first"); return }
    const seg = smsSegmentInfo(c.message)
    const next: SmsCampaign = {
      ...c,
      status: c.scheduledAt && new Date(c.scheduledAt).getTime() > Date.now() ? "scheduled" : "sending",
      stats: { ...c.stats, recipients: recipients.length, segments: seg.segments },
      updatedAt: new Date().toISOString(),
    }
    setSms((prev) => {
      const idx = prev.findIndex((e) => e.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]; copy[idx] = next; return copy
    })
    const n = enqueueCampaign("sms", {
      id: next.id, name: next.name, scheduledAt: next.scheduledAt,
      batchSize: next.batchSize, batchIntervalSec: next.batchIntervalSec,
    }, recipients)
    notify.success(
      c.scheduledAt && new Date(c.scheduledAt).getTime() > Date.now()
        ? `Scheduled ${n} SMS in batches of ${next.batchSize}`
        : `Queued ${n} SMS in batches of ${next.batchSize}`,
    )
    setEditing(null)
  }

  if (editing) {
    return (
      <AdminShell title="SMS Campaign">
        <CampaignsTabBar />
        <SmsDesigner
          value={editing}
          audiences={audiences}
          settings={settings}
          canManage={canManage}
          onCancel={() => setEditing(null)}
          onSave={save}
          onSend={sendOrSchedule}
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell title="SMS Campaigns">
      <CampaignsTabBar />
      <PageHeader
        title="SMS Campaigns"
        subtitle="Short, action-oriented messages delivered to phones in throttled batches."
        action={
          canManage && (
            <button
              onClick={() => setEditing(BLANK_SMS(settings))}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium"
              style={{ background: WINE }}
              data-testid="button-new-sms-campaign"
            >
              <Plus className="h-4 w-4" /> New SMS campaign
            </button>
          )
        }
      />
      {!canManage && <div className="mb-4"><LockedNotice /></div>}

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        {sms.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No SMS campaigns"
            hint="Send a short broadcast — schedule it and let the queue throttle delivery for you."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Preview</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Batch</th>
                <th className="text-right px-4 py-2 font-medium">Sent</th>
                <th className="text-right px-4 py-2 font-medium">Failed</th>
                <th className="px-4 py-2 w-1" />
              </tr>
            </thead>
            <tbody>
              {sms.map((c) => (
                <tr key={c.id} className="border-t border-stone-100">
                  <td className="px-4 py-2.5 font-medium text-stone-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-stone-700 max-w-[280px] truncate">{c.message || <span className="text-stone-400">(empty)</span>}</td>
                  <td className="px-4 py-2.5"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-stone-600">{c.batchSize}/{c.batchIntervalSec}s</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.stats.sent}/{c.stats.recipients}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.stats.failed}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    <button onClick={() => setEditing(c)} className="p-1.5 text-stone-500 hover:text-stone-900" title="Edit"><Edit3 className="h-4 w-4" /></button>
                    {canManage && <button onClick={() => remove(c.id)} className="p-1.5 text-red-500 hover:text-red-700" title="Delete"><Trash2 className="h-4 w-4" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  )
}

function SmsDesigner({
  value, audiences, settings, canManage, onCancel, onSave, onSend,
}: {
  value: SmsCampaign
  audiences: Audience[]
  settings: CampaignSettings
  canManage: boolean
  onCancel: () => void
  onSave: (v: SmsCampaign) => void
  onSend: (v: SmsCampaign) => void
}) {
  const [c, setC] = useState<SmsCampaign>(value)
  const smsAudiences = audiences.filter((a) => a.channel === "sms" || a.channel === "both")
  const audience = audiences.find((a) => a.id === c.audienceId)
  const recipientCount = audienceCount(audience)
  const seg = smsSegmentInfo(c.message)
  const totalSegments = seg.segments * recipientCount
  const totalBatches = Math.max(1, Math.ceil(recipientCount / Math.max(1, c.batchSize)))
  const etaMin = Math.round((totalBatches * c.batchIntervalSec) / 60)

  const preview = interpolate(c.message || "Your SMS preview will appear here.", PREVIEW_CTX)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Back to SMS campaigns
          </button>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: WINE }}>{c.name || "Untitled SMS"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button onClick={() => onSave(c)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm">
                <Save className="h-4 w-4" /> Save draft
              </button>
              <button
                onClick={() => onSend(c)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium"
                style={{ background: WINE }}
                data-testid="button-send-sms"
              >
                <Send className="h-4 w-4" />
                {c.scheduledAt && new Date(c.scheduledAt).getTime() > Date.now() ? "Schedule send" : "Send now"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <Card title="Basics">
            <Field label="Campaign name">
              <input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
            </Field>
            <Field label="Sender ID">
              <input className="input" value={settings.sender.smsSenderId} disabled />
              <p className="text-xs text-stone-500 mt-1">Set in Settings → Sender. Most networks limit to 11 characters.</p>
            </Field>
          </Card>

          <Card title="Message">
            <textarea
              className="input min-h-[140px] font-mono text-[13px]"
              value={c.message}
              onChange={(e) => setC({ ...c, message: e.target.value })}
              placeholder="Hi {{first_name}}, your refill is ready at Shaniid RX. Reply STOP to opt out."
              maxLength={1600}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {VARIABLES.slice(0, 5).map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => setC({ ...c, message: c.message + " " + v.token })}
                  className="text-[11px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                >
                  {v.token}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-stone-500 mt-2">
              <span>{seg.encoding}</span>
              <span><span className="tabular-nums">{seg.chars}</span> chars · <span className="tabular-nums">{seg.segments}</span> segment{seg.segments === 1 ? "" : "s"}</span>
            </div>
          </Card>

          <Card title="Audience & schedule">
            <Field label="Audience">
              <select className="input" value={c.audienceId} onChange={(e) => setC({ ...c, audienceId: e.target.value })}>
                <option value="">Pick an audience…</option>
                {smsAudiences.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {audience && (
                <p className="text-xs text-stone-500 mt-1">{recipientCount} recipient{recipientCount === 1 ? "" : "s"} match this audience right now.</p>
              )}
              {smsAudiences.length === 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  No SMS audiences yet. <Link href="/admin/campaigns/audiences" className="underline">Create one</Link>.
                </p>
              )}
            </Field>
            <Field label="Schedule (optional)">
              <input
                type="datetime-local"
                className="input"
                value={c.scheduledAt ? c.scheduledAt.slice(0, 16) : ""}
                onChange={(e) => setC({ ...c, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </Field>
          </Card>

          <Card title="Queue & batching">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Batch size (per minute window)">
                <input
                  type="number" min={1} max={500}
                  className="input"
                  value={c.batchSize}
                  onChange={(e) => setC({ ...c, batchSize: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
              <Field label="Interval between batches (sec)">
                <input
                  type="number" min={1} max={3600}
                  className="input"
                  value={c.batchIntervalSec}
                  onChange={(e) => setC({ ...c, batchIntervalSec: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
            </div>
            <div className="text-xs text-stone-500 mt-2">
              Estimated: <span className="tabular-nums">{totalBatches}</span> batch{totalBatches === 1 ? "" : "es"} ·
              ~<span className="tabular-nums">{etaMin}</span> min to complete ·
              <span className="tabular-nums"> {totalSegments}</span> billable segment{totalSegments === 1 ? "" : "s"}
            </div>
          </Card>
        </div>

        {/* Phone preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-4">
            <div className="text-xs uppercase tracking-wide text-stone-500 mb-2 flex items-center gap-2">
              <Eye className="h-3.5 w-3.5" /> Preview
            </div>
            <div className="mx-auto w-[280px] bg-stone-900 rounded-[2rem] p-3 shadow-lg">
              <div className="bg-stone-100 rounded-[1.5rem] p-4 min-h-[460px] flex flex-col">
                <div className="text-[10px] text-stone-500 text-center pb-2 border-b border-stone-200">
                  {settings.sender.smsSenderId}
                </div>
                <div className="mt-3 self-start max-w-[85%]">
                  <div className="bg-white rounded-xl rounded-tl-sm px-3 py-2 text-[13px] text-stone-800 shadow-sm leading-snug whitespace-pre-wrap">
                    {preview}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">Now</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   4. AUDIENCES
═══════════════════════════════════════════════════════════════════════════ */
export function AdminCampaignsAudiences() {
  const canManage = usePermission("integrations.manage")
  const [audiences, setAudiences] = useCmsDoc<Audience[]>("campaign-audiences", [])
  const [editing, setEditing] = useState<Audience | null>(null)

  const save = (a: Audience) => {
    const next = { ...a, updatedAt: new Date().toISOString() }
    setAudiences((prev) => {
      const idx = prev.findIndex((x) => x.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]; copy[idx] = next; return copy
    })
    notify.success("Audience saved")
    setEditing(null)
  }

  const remove = (id: string) => {
    if (!confirm("Delete this audience?")) return
    setAudiences((prev) => prev.filter((a) => a.id !== id))
  }

  const newAudience = (): Audience => ({
    id: newId(),
    name: "New audience",
    description: "",
    type: "active-subscribers",
    channel: "email",
    manualList: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  if (editing) {
    return (
      <AdminShell title="Audience">
        <CampaignsTabBar />
        <AudienceEditor value={editing} onCancel={() => setEditing(null)} onSave={save} canManage={canManage} />
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Audiences">
      <CampaignsTabBar />
      <PageHeader
        title="Audiences"
        subtitle="Reusable recipient lists — subscribers, customers, or manual phone/email lists."
        action={
          canManage && (
            <button
              onClick={() => setEditing(newAudience())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium"
              style={{ background: WINE }}
              data-testid="button-new-audience"
            >
              <Plus className="h-4 w-4" /> New audience
            </button>
          )
        }
      />
      {!canManage && <div className="mb-4"><LockedNotice /></div>}

      {audiences.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg">
          <EmptyState
            icon={Users}
            title="No audiences yet"
            hint="Create a reusable list — e.g. 'Active newsletter subscribers' or 'Nairobi customers'."
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {audiences.map((a) => {
            const count = resolveRecipients(a).length
            return (
              <div key={a.id} className="bg-white border border-stone-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-900">{a.name}</h3>
                    <p className="text-xs text-stone-500 mt-1">{a.description || "—"}</p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize">{a.channel}</span>
                </div>
                <div className="flex items-end justify-between mt-4">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums" style={{ color: WINE }}>{count}</div>
                    <div className="text-[11px] text-stone-500">{a.type.replace(/-/g, " ")}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(a)} className="p-1.5 text-stone-500 hover:text-stone-900"><Edit3 className="h-4 w-4" /></button>
                    {canManage && <button onClick={() => remove(a.id)} className="p-1.5 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}

function AudienceEditor({ value, onCancel, onSave, canManage }: {
  value: Audience; onCancel: () => void; onSave: (a: Audience) => void; canManage: boolean
}) {
  const [a, setA] = useState<Audience>(value)
  const count = resolveRecipients(a).length
  const manualText = a.manualList.join("\n")

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Back to audiences
          </button>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: WINE }}>{a.name || "Audience"}</h1>
        </div>
        {canManage && (
          <button onClick={() => onSave(a)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium" style={{ background: WINE }}>
            <Save className="h-4 w-4" /> Save audience
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Basics">
          <Field label="Name"><input className="input" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={a.description} onChange={(e) => setA({ ...a, description: e.target.value })} /></Field>
          <Field label="Channel">
            <select className="input" value={a.channel} onChange={(e) => setA({ ...a, channel: e.target.value as Audience["channel"] })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Both</option>
            </select>
          </Field>
          <Field label="Source">
            <select className="input" value={a.type} onChange={(e) => setA({ ...a, type: e.target.value as AudienceType })}>
              <option value="all-subscribers">All newsletter subscribers</option>
              <option value="active-subscribers">Active newsletter subscribers</option>
              <option value="all-customers">All customers</option>
              <option value="manual">Manual list</option>
            </select>
          </Field>
        </Card>

        <Card title="Recipients">
          <div className="text-sm text-stone-600 mb-2">
            Current size: <span className="font-semibold tabular-nums" style={{ color: WINE }}>{count}</span>
          </div>
          {a.type === "manual" ? (
            <Field label="One email or phone per line">
              <textarea
                className="input min-h-[200px] font-mono text-[13px]"
                value={manualText}
                onChange={(e) => setA({ ...a, manualList: e.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) })}
                placeholder={"amina@example.com\n+254700000000"}
              />
            </Field>
          ) : (
            <p className="text-xs text-stone-500">
              This audience is pulled live from <code>{a.type}</code> — no manual list needed.
              {a.type === "all-customers" && a.channel !== "email" && " For SMS, only customers with a phone number are counted."}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   5. PIPELINES (sales / drip)
═══════════════════════════════════════════════════════════════════════════ */
const BLANK_PIPELINE = (): Pipeline => ({
  id: newId(),
  name: "Untitled flow",
  description: "",
  trigger: "new_subscriber",
  audienceId: "",
  steps: [
    { id: newId(), channel: "email", waitHours: 0,  subject: "Welcome to Shaniid RX",  body: "Hi {{first_name}}, welcome." },
  ],
  enabled: false,
  enrolledCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export function AdminCampaignsPipelines() {
  const canManage = usePermission("integrations.manage")
  const [pipelines, setPipelines] = useCmsDoc<Pipeline[]>("campaign-pipelines", [])
  const [audiences] = useCmsDoc<Audience[]>("campaign-audiences", [])
  const [editing, setEditing] = useState<Pipeline | null>(null)

  const save = (p: Pipeline) => {
    const next = { ...p, updatedAt: new Date().toISOString() }
    setPipelines((prev) => {
      const idx = prev.findIndex((x) => x.id === next.id)
      if (idx === -1) return [next, ...prev]
      const copy = [...prev]; copy[idx] = next; return copy
    })
    notify.success("Pipeline saved")
    setEditing(null)
  }

  const remove = (id: string) => {
    if (!confirm("Delete this pipeline?")) return
    setPipelines((prev) => prev.filter((p) => p.id !== id))
  }

  const toggle = (id: string) => {
    setPipelines((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled, updatedAt: new Date().toISOString() } : p))
  }

  if (editing) {
    return (
      <AdminShell title="Pipeline">
        <CampaignsTabBar />
        <PipelineEditor value={editing} audiences={audiences} canManage={canManage} onCancel={() => setEditing(null)} onSave={save} />
      </AdminShell>
    )
  }

  return (
    <AdminShell title="Sales Pipelines">
      <CampaignsTabBar />
      <PageHeader
        title="Sales Pipelines"
        subtitle="Multi-step drip sequences triggered by patient events — onboarding, abandoned cart, win-back."
        action={
          canManage && (
            <button
              onClick={() => setEditing(BLANK_PIPELINE())}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium"
              style={{ background: WINE }}
              data-testid="button-new-pipeline"
            >
              <Plus className="h-4 w-4" /> New pipeline
            </button>
          )
        }
      />
      {!canManage && <div className="mb-4"><LockedNotice /></div>}

      {pipelines.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-lg">
          <EmptyState
            icon={GitBranch}
            title="No pipelines yet"
            hint="Drip sequences keep patients informed and on-treatment without manual sending. Start with a welcome flow."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {pipelines.map((p) => (
            <div key={p.id} className="bg-white border border-stone-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{p.name}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                      {p.enabled ? "Live" : "Off"}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Trigger: {TRIGGER_LABEL[p.trigger]} · {p.steps.length} step{p.steps.length === 1 ? "" : "s"} · {p.enrolledCount} enrolled
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {canManage && (
                    <button
                      onClick={() => toggle(p.id)}
                      className={`p-1.5 rounded ${p.enabled ? "text-orange-600 hover:bg-orange-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                      title={p.enabled ? "Pause" : "Enable"}
                    >
                      {p.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  )}
                  <button onClick={() => setEditing(p)} className="p-1.5 text-stone-500 hover:text-stone-900"><Edit3 className="h-4 w-4" /></button>
                  {canManage && <button onClick={() => remove(p.id)} className="p-1.5 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>

              <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1">
                <div className="flex flex-col items-center justify-center min-w-[110px] rounded-md border border-dashed border-stone-300 px-3 py-2 text-center">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <div className="text-[11px] text-stone-500 mt-1">Trigger</div>
                  <div className="text-xs font-medium text-stone-800">{TRIGGER_LABEL[p.trigger]}</div>
                </div>
                {p.steps.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-stone-300 mx-1" />
                    <div className="min-w-[140px] rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
                      <div className="flex items-center gap-1 text-[11px] text-stone-500">
                        <Clock className="h-3 w-3" /> wait {s.waitHours}h
                      </div>
                      <div className="text-xs font-medium text-stone-900 mt-1 flex items-center gap-1">
                        {s.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        Step {i + 1} · {s.channel.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-stone-600 truncate mt-1 max-w-[160px]">
                        {s.subject || s.body.slice(0, 40)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}

function PipelineEditor({
  value, audiences, canManage, onCancel, onSave,
}: { value: Pipeline; audiences: Audience[]; canManage: boolean; onCancel: () => void; onSave: (p: Pipeline) => void }) {
  const [p, setP] = useState<Pipeline>(value)

  const updateStep = (idx: number, patch: Partial<PipelineStep>) => {
    setP({ ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, ...patch } : s) })
  }
  const addStep = () => {
    setP({ ...p, steps: [...p.steps, { id: newId(), channel: "email", waitHours: 24, subject: "", body: "" }] })
  }
  const removeStep = (idx: number) => {
    setP({ ...p, steps: p.steps.filter((_, i) => i !== idx) })
  }
  const moveStep = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= p.steps.length) return
    const copy = [...p.steps]
    const [s] = copy.splice(idx, 1); copy.splice(j, 0, s)
    setP({ ...p, steps: copy })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Back to pipelines
          </button>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: WINE }}>{p.name || "Untitled flow"}</h1>
        </div>
        {canManage && (
          <button onClick={() => onSave(p)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium" style={{ background: WINE }}>
            <Save className="h-4 w-4" /> Save pipeline
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <Card title="Basics">
            <Field label="Pipeline name"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
            <Field label="Description"><input className="input" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
            <Field label="Trigger">
              <select className="input" value={p.trigger} onChange={(e) => setP({ ...p, trigger: e.target.value as PipelineTrigger })}>
                {Object.entries(TRIGGER_LABEL).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Audience filter (optional)">
              <select className="input" value={p.audienceId} onChange={(e) => setP({ ...p, audienceId: e.target.value })}>
                <option value="">Everyone matching the trigger</option>
                {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} />
              Pipeline is live
            </label>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">Steps</h3>
            {canManage && (
              <button onClick={addStep} className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700">
                <Plus className="h-4 w-4" /> Add step
              </button>
            )}
          </div>
          {p.steps.map((s, idx) => (
            <Card key={s.id} title={`Step ${idx + 1}`}>
              <div className="flex items-center gap-2 mb-3">
                <Field label="Channel" inline>
                  <select className="input" value={s.channel} onChange={(e) => updateStep(idx, { channel: e.target.value as CampaignChannel })}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </Field>
                <Field label="Wait (hours)" inline>
                  <input type="number" min={0} className="input" value={s.waitHours} onChange={(e) => updateStep(idx, { waitHours: Math.max(0, Number(e.target.value) || 0) })} />
                </Field>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => moveStep(idx, -1)} className="p-1.5 text-stone-500 hover:text-stone-900 text-xs" disabled={idx === 0}>↑</button>
                  <button onClick={() => moveStep(idx, +1)} className="p-1.5 text-stone-500 hover:text-stone-900 text-xs" disabled={idx === p.steps.length - 1}>↓</button>
                  {canManage && p.steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} className="p-1.5 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
              {s.channel === "email" && (
                <Field label="Subject">
                  <input className="input" value={s.subject || ""} onChange={(e) => updateStep(idx, { subject: e.target.value })} />
                </Field>
              )}
              <Field label="Body">
                <textarea className="input min-h-[100px] font-mono text-[13px]" value={s.body} onChange={(e) => updateStep(idx, { body: e.target.value })} />
              </Field>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   6. QUEUE
═══════════════════════════════════════════════════════════════════════════ */
export function AdminCampaignsQueue() {
  useCampaignSimulator()
  const canManage = usePermission("integrations.manage")
  const [queue, setQueue] = useCmsDoc<QueueItem[]>("campaign-queue", [])
  const [filter, setFilter] = useState<"all" | QueueItem["status"]>("all")
  const [search, setSearch] = useState("")
  const [paused, setPaused] = useState(false)

  const filtered = queue
    .filter((q) => filter === "all" ? true : q.status === filter)
    .filter((q) => !search || q.recipient.toLowerCase().includes(search.toLowerCase()) || q.campaignName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))

  const counts = useMemo(() => ({
    all:     queue.length,
    queued:  queue.filter((q) => q.status === "queued").length,
    sending: queue.filter((q) => q.status === "sending").length,
    sent:    queue.filter((q) => q.status === "sent").length,
    failed:  queue.filter((q) => q.status === "failed").length,
  }), [queue])

  const retryFailed = () => {
    setQueue((prev) => prev.map((q) => q.status === "failed" ? { ...q, status: "queued", error: null, scheduledAt: new Date().toISOString() } : q))
    notify.success(`${counts.failed} failed item${counts.failed === 1 ? "" : "s"} re-queued`)
  }
  const clearSent = () => {
    if (!confirm(`Clear ${counts.sent} sent items from the log?`)) return
    setQueue((prev) => prev.filter((q) => q.status !== "sent"))
  }
  const pauseAll = () => {
    setQueue((prev) => prev.map((q) => q.status === "queued" ? { ...q, scheduledAt: new Date(Date.now() + 365 * 24 * 3600_000).toISOString() } : q))
    setPaused(true)
    notify.info("Queue paused")
  }
  const resumeAll = () => {
    setQueue((prev) => prev.map((q) => q.status === "queued" ? { ...q, scheduledAt: new Date().toISOString() } : q))
    setPaused(false)
    notify.success("Queue resumed")
  }

  const exportCsv = () => {
    const rows = [["campaign", "channel", "recipient", "status", "scheduled", "sent", "batch", "attempts", "error"]]
    for (const q of queue) rows.push([q.campaignName, q.channel, q.recipient, q.status, q.scheduledAt, q.sentAt || "", String(q.batchNumber), String(q.attempts), q.error || ""])
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `campaign-queue-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell title="Send Queue">
      <CampaignsTabBar />
      <PageHeader
        title="Send Queue"
        subtitle="Live view of every queued message. Throttling and batches keep providers happy and your sender reputation safe."
        action={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            {canManage && counts.failed > 0 && (
              <button onClick={retryFailed} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm">
                <RotateCcw className="h-4 w-4" /> Retry failed ({counts.failed})
              </button>
            )}
            {canManage && counts.sent > 0 && (
              <button onClick={clearSent} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm">
                <Trash2 className="h-4 w-4" /> Clear sent
              </button>
            )}
            {canManage && (paused
              ? <button onClick={resumeAll} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm" style={{ background: WINE }}><Play className="h-4 w-4" /> Resume</button>
              : <button onClick={pauseAll} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm"><Pause className="h-4 w-4" /> Pause queue</button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {(["all", "queued", "sending", "sent", "failed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-left p-3 rounded-lg border transition-colors ${
              filter === s ? "border-orange-500 bg-orange-50" : "border-stone-200 bg-white hover:bg-stone-50"
            }`}
          >
            <div className="text-xs text-stone-500 capitalize">{s}</div>
            <div className="text-xl font-semibold tabular-nums mt-0.5" style={{ color: WINE }}>{counts[s as keyof typeof counts]}</div>
          </button>
        ))}
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-stone-200 flex items-center gap-2">
          <Search className="h-4 w-4 text-stone-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient or campaign…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nothing in the queue" hint="When you send a campaign, every recipient lands here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Campaign</th>
                  <th className="text-left px-4 py-2 font-medium">Channel</th>
                  <th className="text-left px-4 py-2 font-medium">Recipient</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Batch</th>
                  <th className="text-right px-4 py-2 font-medium">Scheduled</th>
                  <th className="text-right px-4 py-2 font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 500).map((q) => (
                  <tr key={q.id} className="border-t border-stone-100">
                    <td className="px-4 py-2 text-stone-800">{q.campaignName}</td>
                    <td className="px-4 py-2 text-stone-600 capitalize">{q.channel}</td>
                    <td className="px-4 py-2 text-stone-800 font-mono text-[12px]">{q.recipient}</td>
                    <td className="px-4 py-2">
                      <StatusPill status={q.status} />
                      {q.error && <div className="text-[10px] text-red-600 mt-0.5">{q.error}</div>}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-stone-600">#{q.batchNumber}</td>
                    <td className="px-4 py-2 text-right text-stone-500 text-xs">{new Date(q.scheduledAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 text-right text-stone-500 text-xs">{q.sentAt ? new Date(q.sentAt).toLocaleTimeString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 500 && (
              <div className="px-4 py-2 text-xs text-stone-500 border-t border-stone-100">
                Showing first 500 of {filtered.length}. Use the filters or export CSV for the full set.
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   7. SETTINGS
═══════════════════════════════════════════════════════════════════════════ */
export function AdminCampaignsSettings() {
  const canManage = usePermission("integrations.manage")
  const [settings, setSettings] = useCmsDoc<CampaignSettings>("campaign-settings", DEFAULT_SETTINGS)
  const [draft, setDraft] = useState<CampaignSettings>(settings)
  useEffect(() => { setDraft(settings) }, [settings])

  const save = () => { setSettings(draft); notify.success("Marketing settings saved") }
  const reset = () => { setDraft(DEFAULT_SETTINGS); notify.info("Reset to defaults — remember to save") }

  return (
    <AdminShell title="Campaign Settings">
      <CampaignsTabBar />
      <PageHeader
        title="Campaign Settings"
        subtitle="Sender identity, throttling and brand defaults that apply to every campaign you send."
        action={
          canManage && (
            <div className="flex gap-2">
              <button onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-stone-300 text-sm">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <button onClick={save} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white text-sm font-medium" style={{ background: WINE }}>
                <Save className="h-4 w-4" /> Save settings
              </button>
            </div>
          )
        }
      />
      {!canManage && <div className="mb-4"><LockedNotice /></div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Sender identity">
          <Field label="From name"><input className="input" value={draft.sender.fromName} onChange={(e) => setDraft({ ...draft, sender: { ...draft.sender, fromName: e.target.value } })} /></Field>
          <Field label="From email"><input className="input" value={draft.sender.fromEmail} onChange={(e) => setDraft({ ...draft, sender: { ...draft.sender, fromEmail: e.target.value } })} /></Field>
          <Field label="Reply-to"><input className="input" value={draft.sender.replyTo} onChange={(e) => setDraft({ ...draft, sender: { ...draft.sender, replyTo: e.target.value } })} /></Field>
          <Field label="SMS sender ID (≤11 chars)"><input className="input" maxLength={11} value={draft.sender.smsSenderId} onChange={(e) => setDraft({ ...draft, sender: { ...draft.sender, smsSenderId: e.target.value } })} /></Field>
        </Card>

        <Card title="Throttling & batching">
          <Field label="Email per minute"><input type="number" min={1} max={1000} className="input" value={draft.throttle.emailPerMinute} onChange={(e) => setDraft({ ...draft, throttle: { ...draft.throttle, emailPerMinute: Number(e.target.value) || 1 } })} /></Field>
          <Field label="SMS per minute"><input type="number" min={1} max={1000} className="input" value={draft.throttle.smsPerMinute} onChange={(e) => setDraft({ ...draft, throttle: { ...draft.throttle, smsPerMinute: Number(e.target.value) || 1 } })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default batch size"><input type="number" min={1} max={500} className="input" value={draft.throttle.defaultBatchSize} onChange={(e) => setDraft({ ...draft, throttle: { ...draft.throttle, defaultBatchSize: Number(e.target.value) || 1 } })} /></Field>
            <Field label="Default interval (sec)"><input type="number" min={1} max={3600} className="input" value={draft.throttle.defaultBatchIntervalSec} onChange={(e) => setDraft({ ...draft, throttle: { ...draft.throttle, defaultBatchIntervalSec: Number(e.target.value) || 1 } })} /></Field>
          </div>
        </Card>

        <Card title="Brand defaults">
          <Field label="Logo URL"><input className="input" value={draft.brand.logoUrl} onChange={(e) => setDraft({ ...draft, brand: { ...draft.brand, logoUrl: e.target.value } })} /></Field>
          <Field label="Primary brand color"><input className="input" value={draft.brand.primaryColor} onChange={(e) => setDraft({ ...draft, brand: { ...draft.brand, primaryColor: e.target.value } })} /></Field>
          <Field label="Footer note"><textarea className="input min-h-[60px]" value={draft.brand.footerNote} onChange={(e) => setDraft({ ...draft, brand: { ...draft.brand, footerNote: e.target.value } })} /></Field>
          <Field label="Unsubscribe text"><textarea className="input min-h-[60px]" value={draft.brand.unsubscribeText} onChange={(e) => setDraft({ ...draft, brand: { ...draft.brand, unsubscribeText: e.target.value } })} /></Field>
          <Field label="Postal address (CAN-SPAM / GDPR)"><input className="input" value={draft.brand.address} onChange={(e) => setDraft({ ...draft, brand: { ...draft.brand, address: e.target.value } })} /></Field>
        </Card>

        <Card title="Consent">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={draft.consent.requireDoubleOptIn} onChange={(e) => setDraft({ ...draft, consent: { ...draft.consent, requireDoubleOptIn: e.target.checked } })} />
            <span>Require double opt-in for newsletter sign-ups.</span>
          </label>
          <label className="flex items-start gap-2 text-sm mt-2">
            <input type="checkbox" checked={draft.consent.includeUnsubscribeFooter} onChange={(e) => setDraft({ ...draft, consent: { ...draft.consent, includeUnsubscribeFooter: e.target.checked } })} />
            <span>Include unsubscribe link in every marketing email footer.</span>
          </label>
        </Card>
      </div>
    </AdminShell>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Tiny primitives
──────────────────────────────────────────────────────────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children, inline = false }: { label: string; children: React.ReactNode; inline?: boolean }) {
  return (
    <label className={`block text-sm ${inline ? "" : "space-y-1"}`}>
      <span className="text-xs font-medium text-stone-600">{label}</span>
      {inline ? <div className="mt-1">{children}</div> : children}
    </label>
  )
}

/* Inject one-time Tailwind-ish input class via global CSS layer (kept inline for simplicity).
   `input` is just a shorthand — actual rules are below via a tiny <style> injection. */
if (typeof document !== "undefined" && !document.getElementById("campaigns-input-style")) {
  const s = document.createElement("style")
  s.id = "campaigns-input-style"
  s.textContent = `
    .input {
      display: block;
      width: 100%;
      padding: 0.5rem 0.625rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      border: 1px solid rgb(214 211 209);
      background: #fff;
      color: rgb(28 25 23);
    }
    .input:focus { outline: none; border-color: ${ORANGE}; box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }
    .input:disabled { background: rgb(245 245 244); color: rgb(120 113 108); }
  `
  document.head.appendChild(s)
}

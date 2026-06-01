import { boolean, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

/**
 * Communications durability tables.
 *
 * Outbound patient/marketing messages used to live only in the in-memory
 * server CMS (cmsStore keys `communications.outbox` / `communications.sent-log`),
 * which is wiped on every restart/deploy. These two tables make them durable:
 *
 *   communication_outbox    — queued / failed messages an admin can resend.
 *   communication_sent_log  — every real send attempt + its delivery lifecycle
 *                             (sent → delivered → read / failed), folded from
 *                             provider status webhooks.
 *
 * Channels are generic ("email" | "sms" | "whatsapp") so the campaign sender and
 * the per-trigger patient notifier share the same durable record.
 */

export type CommunicationChannel = "email" | "sms" | "whatsapp"
export type OutboxStatus = "queued" | "sent" | "failed"
export type SentLogStatus = "sent" | "delivered" | "read" | "failed" | "queued"

export const communicationOutbox = pgTable("communication_outbox", {
  id: text("id").primaryKey(),
  templateId: text("template_id"),
  channel: text("channel").notNull(),
  to: text("to").notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  // queued (never delivered) → sent (delivered on retry) → failed (retry errored).
  status: text("status").notNull().default("queued"),
  // Why the last attempt failed / was skipped (provider not configured, etc).
  reason: text("reason"),
  lastAttemptAt: timestamp("last_attempt_at"),
  queuedAt: timestamp("queued_at").defaultNow().notNull(),
})

export const communicationSentLog = pgTable("communication_sent_log", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  to: text("to").notNull(),
  trigger: text("trigger"),
  templateId: text("template_id"),
  // Meta template name when sent as a template (vs. free-form text).
  templateName: text("template_name"),
  // Language code the template was sent in (Meta templates only).
  language: text("language"),
  // Provider message id — the key the delivery-status webhook matches on.
  messageId: text("message_id"),
  status: text("status").notNull().default("sent"),
  reason: text("reason"),
  preview: text("preview").notNull().default(""),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
})

/**
 * campaign_sends — per-recipient idempotency/lock ledger for bulk campaigns.
 *
 * Bulk campaign delivery is driven client-side (the admin campaign queue), so
 * the same campaign can be re-dispatched across browser tabs, page reloads,
 * retries, or horizontally-scaled API instances. This table makes each send
 * exactly-once: the unique index on (campaign_id, channel, recipient) lets the
 * sender atomically CLAIM a recipient with INSERT … ON CONFLICT DO NOTHING.
 * Whoever wins the insert owns the send; everyone else sees the conflict and
 * skips. A `failed` row may be re-claimed for retry; a `sent` row never is.
 */
export type CampaignSendStatus = "sending" | "sent" | "failed"

export const campaignSends = pgTable(
  "campaign_sends",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id").notNull(),
    channel: text("channel").notNull(),
    recipient: text("recipient").notNull(),
    // sending (claimed, in flight) → sent | failed.
    status: text("status").notNull().default("sending"),
    messageId: text("message_id"),
    reason: text("reason"),
    claimedAt: timestamp("claimed_at").defaultNow().notNull(),
    sentAt: timestamp("sent_at"),
  },
  (t) => ({
    uniqRecipient: uniqueIndex("campaign_sends_campaign_channel_recipient_uniq").on(
      t.campaignId,
      t.channel,
      t.recipient,
    ),
  }),
)

export const insertCampaignSendSchema = createInsertSchema(campaignSends)
export const selectCampaignSendSchema = createSelectSchema(campaignSends)
export type InsertCampaignSend = z.infer<typeof insertCampaignSendSchema>
export type CampaignSend = typeof campaignSends.$inferSelect

/**
 * contact_inquiries — durable, per-row store for messages submitted from the
 * public contact page (and any future inbound enquiry source).
 *
 * Previously these lived as a single concatenated JSON array in `cms_docs`
 * (key `contact-inquiries`), which made per-row triage, concurrency-safe
 * appends, and querying awkward. Each submission is now its own row so the
 * public form can append without read-modify-write races and admins can
 * triage individually.
 */
export type InquiryStatus = "new" | "in-progress" | "resolved" | "spam"
export type InquiryCategory =
  | "general" | "prescription" | "order" | "delivery"
  | "product" | "billing" | "complaint" | "partnership" | "other"
export type PreferredContact = "email" | "phone" | "whatsapp"

export const contactInquiries = pgTable("contact_inquiries", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  category: text("category").notNull().default("general"),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  preferredContact: text("preferred_contact").notNull().default("whatsapp"),
  isExistingPatient: boolean("is_existing_patient").notNull().default(false),
  patientId: text("patient_id"),
  dob: text("dob"),
  consent: boolean("consent").notNull().default(false),
  status: text("status").notNull().default("new"),
  internalNote: text("internal_note").notNull().default(""),
  source: text("source").notNull().default("Contact Page"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const insertContactInquirySchema = createInsertSchema(contactInquiries)
export const selectContactInquirySchema = createSelectSchema(contactInquiries)
export type InsertContactInquiry = z.infer<typeof insertContactInquirySchema>
export type ContactInquiryRow = typeof contactInquiries.$inferSelect

export const insertCommunicationOutboxSchema = createInsertSchema(communicationOutbox)
export const selectCommunicationOutboxSchema = createSelectSchema(communicationOutbox)
export type InsertCommunicationOutbox = z.infer<typeof insertCommunicationOutboxSchema>
export type CommunicationOutbox = typeof communicationOutbox.$inferSelect

export const insertCommunicationSentLogSchema = createInsertSchema(communicationSentLog)
export const selectCommunicationSentLogSchema = createSelectSchema(communicationSentLog)
export type InsertCommunicationSentLog = z.infer<typeof insertCommunicationSentLogSchema>
export type CommunicationSentLog = typeof communicationSentLog.$inferSelect

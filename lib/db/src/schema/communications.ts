import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
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

export const insertCommunicationOutboxSchema = createInsertSchema(communicationOutbox)
export const selectCommunicationOutboxSchema = createSelectSchema(communicationOutbox)
export type InsertCommunicationOutbox = z.infer<typeof insertCommunicationOutboxSchema>
export type CommunicationOutbox = typeof communicationOutbox.$inferSelect

export const insertCommunicationSentLogSchema = createInsertSchema(communicationSentLog)
export const selectCommunicationSentLogSchema = createSelectSchema(communicationSentLog)
export type InsertCommunicationSentLog = z.infer<typeof insertCommunicationSentLogSchema>
export type CommunicationSentLog = typeof communicationSentLog.$inferSelect

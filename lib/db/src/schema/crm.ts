import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

/** CRM pipeline stages (customer demand funnel). */
export const CRM_STAGES = [
  "lead",
  "assessment_completed",
  "prescription_uploaded",
  "qualified",
  "quoted",
  "purchased",
  "delivered",
  "refill_eligible",
  "subscriber",
] as const

export type CrmStage = (typeof CRM_STAGES)[number]

export const crmContacts = pgTable("crm_contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  /** Session or channel key (browser sid, `wa:2547…`, `usr:{userId}`, etc.). */
  channelKey: text("channel_key").notNull().unique(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  stage: text("stage").notNull().default("lead"),
  source: text("source"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  createdAt: true,
  updatedAt: true,
})
export const selectCrmContactSchema = createSelectSchema(crmContacts)
export type CrmContact = typeof crmContacts.$inferSelect
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>

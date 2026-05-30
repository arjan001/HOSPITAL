import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { consultations } from "./consultations"

export type ChatSender = "patient" | "staff"
export type ChatMessageStatus = "sent" | "delivered" | "read"
// "active" while a consultation is in progress; "archived" once the
// consultation ends — the full transcript is then preserved as a record.
export type ChatThreadStatus = "active" | "archived"

export const chatThreads = pgTable("chat_threads", {
  id: text("id").primaryKey(),
  patientSessionId: text("patient_session_id").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  // Links a conversation to the consultation it belongs to, so a saved
  // transcript can be retrieved from the consultation record.
  consultationId: text("consultation_id").references(() => consultations.id, {
    onDelete: "set null",
  }),
  lastMessage: text("last_message"),
  lastSender: text("last_sender"),
  unreadByStaff: integer("unread_by_staff").notNull().default(0),
  unreadByPatient: integer("unread_by_patient").notNull().default(0),
  // Conversation lifecycle. Archived conversations are saved transcripts.
  status: text("status").notNull().default("active"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  authorName: text("author_name"),
  text: text("text").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({ createdAt: true, updatedAt: true })
export const selectChatThreadSchema = createSelectSchema(chatThreads)
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>
export type ChatThread = typeof chatThreads.$inferSelect

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ createdAt: true })
export const selectChatMessageSchema = createSelectSchema(chatMessages)
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>
export type ChatMessage = typeof chatMessages.$inferSelect

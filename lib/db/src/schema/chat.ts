import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

export type ChatSender = "patient" | "staff"
export type ChatMessageStatus = "sent" | "delivered" | "read"

export const chatThreads = pgTable("chat_threads", {
  id: text("id").primaryKey(),
  patientSessionId: text("patient_session_id").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  lastMessage: text("last_message"),
  lastSender: text("last_sender"),
  unreadByStaff: integer("unread_by_staff").notNull().default(0),
  unreadByPatient: integer("unread_by_patient").notNull().default(0),
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

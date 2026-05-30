import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

export type NotificationLevel = "info" | "success" | "warning" | "alert" | "error"
export type NotificationAudience = "admin" | "doctor" | "pharmacist" | (string & {})

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  audience: text("audience").notNull(),
  module: text("module").notNull(),
  level: text("level").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type SupportTicketStatus = "open" | "pending" | "resolved" | "closed"
export type SupportTicketCategory = "order" | "prescription" | "payment" | "account" | "general"

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  // Nullable because contact-form tickets can be filed by guests via the
  // public storefront. On user deletion the ticket survives but is detached.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  // Short human-readable reference (e.g. SR-ABC123) surfaced to the customer.
  shortId: text("short_id"),
  // The signed session cookie that owns the ticket — used for the per-session
  // ownership check on the customer-facing routes (mirrors the old in-memory
  // customer.sessionId). Distinct from userId, which is the durable FK.
  sessionId: text("session_id"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  assignedTo: text("assigned_to"),
  subject: text("subject").notNull(),
  category: text("category"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const supportMessages = pgTable("support_messages", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => supportTickets.id, { onDelete: "cascade" }),
  author: text("author").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const insertNotificationSchema = createInsertSchema(notifications).omit({ createdAt: true })
export const selectNotificationSchema = createSelectSchema(notifications)
export type InsertNotification = z.infer<typeof insertNotificationSchema>
export type Notification = typeof notifications.$inferSelect

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ createdAt: true, updatedAt: true })
export const selectSupportTicketSchema = createSelectSchema(supportTickets)
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>
export type SupportTicket = typeof supportTickets.$inferSelect

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({ createdAt: true })
export const selectSupportMessageSchema = createSelectSchema(supportMessages)
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>
export type SupportMessage = typeof supportMessages.$inferSelect

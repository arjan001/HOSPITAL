import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { orders } from "./orders"

export type PaymentProvider = "payhero" | "paystack" | "card"
export type PaymentRecordStatus = "pending" | "success" | "failed" | "cancelled" | "refunded"

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  // Nullable because pending charges may arrive (webhook) before we
  // create the order row, and admin refunds may detach the order.
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  reference: text("reference").unique().notNull(),
  provider: text("provider").notNull(),
  method: text("method").notNull().default("mpesa"),
  phone: text("phone"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("KES"),
  status: text("status").notNull().default("pending"),
  mpesaReceipt: text("mpesa_receipt"),
  providerResponse: jsonb("provider_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const insertPaymentSchema = createInsertSchema(payments).omit({ createdAt: true, updatedAt: true })
export const selectPaymentSchema = createSelectSchema(payments)
export type InsertPayment = z.infer<typeof insertPaymentSchema>
export type Payment = typeof payments.$inferSelect

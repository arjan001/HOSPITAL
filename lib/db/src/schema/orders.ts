import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded"

export type PaymentMethod = "mpesa" | "card" | "cod"

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").unique().notNull(),
  // Nullable because guest checkout is supported; on user deletion the order
  // record is kept (regulatory / accounting) and userId is cleared.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentReference: text("payment_reference"),
  mpesaReceipt: text("mpesa_receipt"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  shippingLine1: text("shipping_line1").notNull(),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingRegion: text("shipping_region").notNull(),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  total: integer("total").notNull(),
  notes: text("notes"),
  trackingNumber: text("tracking_number"),
  placedAt: timestamp("placed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  variation: text("variation"),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(),
  total: integer("total").notNull(),
  imageUrl: text("image_url"),
})

export const insertOrderSchema = createInsertSchema(orders).omit({ placedAt: true, updatedAt: true })
export const selectOrderSchema = createSelectSchema(orders)
export type InsertOrder = z.infer<typeof insertOrderSchema>
export type Order = typeof orders.$inferSelect

export const insertOrderItemSchema = createInsertSchema(orderItems)
export const selectOrderItemSchema = createSelectSchema(orderItems)
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>
export type OrderItem = typeof orderItems.$inferSelect

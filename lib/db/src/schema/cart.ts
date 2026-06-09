import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productSlug: text("product_slug").notNull(),
  name: text("name").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  variations: jsonb("variations").$type<Record<string, string>>(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ updatedAt: true })
export const selectCartItemSchema = createSelectSchema(cartItems)
export type InsertCartItem = z.infer<typeof insertCartItemSchema>
export type CartItemRow = typeof cartItems.$inferSelect

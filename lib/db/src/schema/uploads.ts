import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  namespace: text("namespace"),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  url: text("url").notNull(),
  key: text("key").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const wishlistItems = pgTable("wishlist_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  productSlug: text("product_slug").notNull(),
  productName: text("product_name").notNull(),
  imageUrl: text("image_url"),
  unitPrice: integer("unit_price").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
})

export const insertUploadSchema = createInsertSchema(uploads).omit({ createdAt: true })
export const selectUploadSchema = createSelectSchema(uploads)
export type InsertUpload = z.infer<typeof insertUploadSchema>
export type Upload = typeof uploads.$inferSelect

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({ addedAt: true })
export const selectWishlistItemSchema = createSelectSchema(wishlistItems)
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>
export type WishlistItem = typeof wishlistItems.$inferSelect

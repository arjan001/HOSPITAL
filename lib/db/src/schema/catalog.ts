import { sql } from "drizzle-orm"
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  parentId: text("parent_id").references((): AnyPgColumn => categories.id, {
    onDelete: "set null",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  brand: text("brand"),
  tags: text("tags").array().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  requiresPrescription: boolean("requires_prescription").notNull().default(false),
  trustSeal: boolean("trust_seal").notNull().default(false),
  weightG: integer("weight_g"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const productImages = pgTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const productVariations = pgTable("product_variations", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: text("value").notNull(),
  priceDelta: integer("price_delta").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const productReviews = pgTable("product_reviews", {
  id: text("id").primaryKey(),
  // Plain product identifier — NOT a FK. The storefront catalog is served from
  // a fixture/legacy source, not the Drizzle `products` table, so reviews must
  // attach to any catalog id by string. Indexed for per-product lookups.
  productId: text("product_id").notNull(),
  // Durable owner FK — survives but detaches if the user row is removed.
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  // The signed session cookie that owns the review — used for the per-session
  // ownership check on the customer-facing edit/delete routes.
  sessionId: text("session_id"),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  status: text("status").notNull().default("published"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("product_reviews_product_id_idx").on(t.productId),
  // Enforce one review per session per product at the DB level so concurrent
  // submits converge to a single row (the service upserts ON CONFLICT). Partial
  // so legacy/anonymous rows without a session id are not constrained.
  uniqueIndex("product_reviews_product_session_uq")
    .on(t.productId, t.sessionId)
    .where(sql`${t.sessionId} is not null`),
])

export const insertCategorySchema = createInsertSchema(categories).omit({ createdAt: true, updatedAt: true })
export const selectCategorySchema = createSelectSchema(categories)
export type InsertCategory = z.infer<typeof insertCategorySchema>
export type Category = typeof categories.$inferSelect

export const insertProductSchema = createInsertSchema(products).omit({ createdAt: true, updatedAt: true })
export const selectProductSchema = createSelectSchema(products)
export type InsertProduct = z.infer<typeof insertProductSchema>
export type Product = typeof products.$inferSelect

export const insertProductImageSchema = createInsertSchema(productImages).omit({ createdAt: true })
export type InsertProductImage = z.infer<typeof insertProductImageSchema>
export type ProductImage = typeof productImages.$inferSelect

export const insertProductVariationSchema = createInsertSchema(productVariations).omit({ createdAt: true })
export type InsertProductVariation = z.infer<typeof insertProductVariationSchema>
export type ProductVariation = typeof productVariations.$inferSelect

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({ createdAt: true, updatedAt: true })
export const selectProductReviewSchema = createSelectSchema(productReviews)
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>
export type ProductReview = typeof productReviews.$inferSelect

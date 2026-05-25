import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clerkId: text("clerk_id").unique().notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  preferences: jsonb("preferences").$type<{
    newsletter?: boolean
    smsAlerts?: boolean
    emailAlerts?: boolean
  }>(),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Home"),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true })
export const selectUserSchema = createSelectSchema(users)
export type InsertUser = z.infer<typeof insertUserSchema>
export type User = typeof users.$inferSelect

export const insertAddressSchema = createInsertSchema(addresses).omit({ createdAt: true, updatedAt: true })
export const selectAddressSchema = createSelectSchema(addresses)
export type InsertAddress = z.infer<typeof insertAddressSchema>
export type Address = typeof addresses.$inferSelect

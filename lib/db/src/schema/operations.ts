import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"
import { users } from "./users"

/** Maps assessment / clinical condition keys to curated care pack bundles (BL #4). */
export const carePackMappings = pgTable(
  "care_pack_mappings",
  {
    id: text("id").primaryKey(),
    conditionKey: text("condition_key").notNull(),
    packSlug: text("pack_slug").notNull(),
    packName: text("pack_name").notNull(),
    /** SKU list that define the bundle for procurement (BL #5 input). */
    productSkus: jsonb("product_skus").$type<string[]>().notNull().default([]),
    priority: integer("priority").notNull().default(0),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    conditionIdx: index("care_pack_mappings_condition_idx").on(t.conditionKey),
    slugIdx: index("care_pack_mappings_slug_idx").on(t.packSlug),
  }),
)

/** Persisted assessment → pack mapping outcome for CRM / demand aggregation. */
export const carePackAssessments = pgTable(
  "care_pack_assessments",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    conditionKeys: jsonb("condition_keys").$type<string[]>().notNull().default([]),
    recommendedPacks: jsonb("recommended_packs").$type<
      Array<{ packSlug: string; packName: string; productSkus: string[] }>
    >().notNull().default([]),
    riskLevel: text("risk_level"),
    source: text("source").default("web_assessment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdIdx: index("care_pack_assessments_created_idx").on(t.createdAt),
  }),
)

export const insertCarePackMappingSchema = createInsertSchema(carePackMappings).omit({
  updatedAt: true,
})
export const selectCarePackMappingSchema = createSelectSchema(carePackMappings)
export type CarePackMapping = typeof carePackMappings.$inferSelect

export const insertCarePackAssessmentSchema = createInsertSchema(carePackAssessments).omit({
  createdAt: true,
})
export type CarePackAssessment = typeof carePackAssessments.$inferSelect

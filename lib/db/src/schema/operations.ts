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

export type ProcurementDecisionStatus = "pending" | "approved" | "rejected" | "ordered"
export type ProcurementPriority = "low" | "normal" | "high" | "urgent"
export type SupplierSuggestionStatus = "suggested" | "selected" | "rejected"

/** BL #6 — buy / defer / reject line items derived from demand aggregation. */
export const procurementDecisions = pgTable(
  "procurement_decisions",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    suggestedQty: integer("suggested_qty").notNull().default(1),
    priority: text("priority").notNull().default("normal"),
    reason: text("reason"),
    demandSources: jsonb("demand_sources").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("pending"),
    demandWindowDays: integer("demand_window_days").notNull().default(30),
    selectedSupplierId: text("selected_supplier_id"),
    selectedSupplierName: text("selected_supplier_name"),
    sourcingRequestId: text("sourcing_request_id"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    skuIdx: index("procurement_decisions_sku_idx").on(t.sku),
    statusIdx: index("procurement_decisions_status_idx").on(t.status),
  }),
)

/** BL #7 — ranked supplier options per procurement decision. */
export const supplierSuggestions = pgTable(
  "supplier_suggestions",
  {
    id: text("id").primaryKey(),
    procurementDecisionId: text("procurement_decision_id")
      .notNull()
      .references(() => procurementDecisions.id, { onDelete: "cascade" }),
    supplierId: text("supplier_id").notNull(),
    supplierName: text("supplier_name").notNull(),
    rank: integer("rank").notNull(),
    score: integer("score").notNull(),
    unitCostEstimate: integer("unit_cost_estimate"),
    currency: text("currency").notNull().default("KES"),
    moq: integer("moq"),
    leadTimeDays: integer("lead_time_days"),
    rationale: text("rationale"),
    status: text("status").notNull().default("suggested"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    decisionIdx: index("supplier_suggestions_decision_idx").on(t.procurementDecisionId),
  }),
)

export type ProcurementDecision = typeof procurementDecisions.$inferSelect
export type SupplierSuggestion = typeof supplierSuggestions.$inferSelect

/** BL #8 — reserve on-hand stock against orders, assemblies, or procurement lines. */
export const inventoryAllocations = pgTable(
  "inventory_allocations",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    /** procurement_decision | care_pack_assembly | prescription | sourcing_request | manual */
    referenceType: text("reference_type").notNull(),
    referenceId: text("reference_id").notNull(),
    status: text("status").notNull().default("reserved"),
    location: text("location"),
    notes: text("notes"),
    allocatedBy: text("allocated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    skuIdx: index("inventory_allocations_sku_idx").on(t.sku),
    refIdx: index("inventory_allocations_ref_idx").on(t.referenceType, t.referenceId),
    statusIdx: index("inventory_allocations_status_idx").on(t.status),
  }),
)

/** BL #9 — physical care pack build jobs (pick, pack, QA-ready). */
export const carePackAssemblyJobs = pgTable(
  "care_pack_assembly_jobs",
  {
    id: text("id").primaryKey(),
    packSlug: text("pack_slug").notNull(),
    packName: text("pack_name").notNull(),
    assessmentId: text("assessment_id"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id"),
    patientLabel: text("patient_label"),
    priority: text("priority").notNull().default("normal"),
    status: text("status").notNull().default("queued"),
    notes: text("notes"),
    assembledBy: text("assembled_by"),
    assembledAt: timestamp("assembled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("care_pack_assembly_jobs_status_idx").on(t.status),
    packIdx: index("care_pack_assembly_jobs_pack_idx").on(t.packSlug),
  }),
)

export const carePackAssemblyLines = pgTable(
  "care_pack_assembly_lines",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => carePackAssemblyJobs.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    quantityRequired: integer("quantity_required").notNull().default(1),
    quantityAllocated: integer("quantity_allocated").notNull().default(0),
    status: text("line_status").notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    jobIdx: index("care_pack_assembly_lines_job_idx").on(t.jobId),
  }),
)

export type InventoryAllocation = typeof inventoryAllocations.$inferSelect
export type CarePackAssemblyJob = typeof carePackAssemblyJobs.$inferSelect
export type CarePackAssemblyLine = typeof carePackAssemblyLines.$inferSelect

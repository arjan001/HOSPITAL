import { boolean, index, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Sourcing pricing, automation, and performance — Stage 4 Postgres tables.
 * Apply via `pnpm db:push`.
 */

/** Supplier quote / PO price captures per SKU. */
export const sourcingPriceHistory = pgTable(
  "sourcing_price_history",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    productName: text("product_name"),
    supplierId: text("supplier_id").notNull(),
    unitCost: real("unit_cost").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    source: text("source").notNull().default("manual"),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
  },
  (t) => ({
    skuIdx: index("sourcing_price_history_sku_idx").on(t.sku),
    capturedIdx: index("sourcing_price_history_captured_idx").on(t.capturedAt),
  }),
)

/** Competitor retail prices for margin intelligence. */
export const sourcingCompetitorPrices = pgTable(
  "sourcing_competitor_prices",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    competitor: text("competitor").notNull(),
    unitPrice: real("unit_price").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    url: text("url"),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
  },
  (t) => ({
    skuIdx: index("sourcing_competitor_prices_sku_idx").on(t.sku),
  }),
)

/** Procurement automation rules (low stock, expiry, forecast shortfall). */
export const sourcingAutomationRules = pgTable("sourcing_automation_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull().default({}),
  action: text("action").notNull().default("create_request"),
  defaultPriority: text("default_priority").notNull().default("normal"),
  defaultQty: integer("default_qty"),
  /** When trigger is forecast_shortfall: min suggested reorder qty to fire. */
  shortfallThreshold: integer("shortfall_threshold").notNull().default(1),
  /** When true, forecast shortfall creates a draft PO (not just a request). */
  autoDraftPo: boolean("auto_draft_po").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastRunAt: timestamp("last_run_at"),
  lastRunSummary: text("last_run_summary"),
})

export const sourcingAutomationLog = pgTable(
  "sourcing_automation_log",
  {
    id: text("id").primaryKey(),
    ruleId: text("rule_id").notNull(),
    ruleName: text("rule_name").notNull(),
    ranAt: timestamp("ran_at").defaultNow().notNull(),
    matched: integer("matched").notNull().default(0),
    created: integer("created").notNull().default(0),
    details: jsonb("details").$type<string[]>().notNull().default([]),
  },
  (t) => ({
    ranIdx: index("sourcing_automation_log_ran_idx").on(t.ranAt),
  }),
)

/** Manual quality / complaint overrides for supplier scorecards. */
export const sourcingSupplierScoreOverrides = pgTable("sourcing_supplier_score_overrides", {
  supplierId: text("supplier_id").primaryKey(),
  qualityScore: integer("quality_score"),
  complaints: integer("complaints").notNull().default(0),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type SourcingPriceHistoryRow = typeof sourcingPriceHistory.$inferSelect
export type SourcingCompetitorPriceRow = typeof sourcingCompetitorPrices.$inferSelect
export type SourcingAutomationRuleRow = typeof sourcingAutomationRules.$inferSelect
export type SourcingAutomationLogRow = typeof sourcingAutomationLog.$inferSelect
export type SourcingSupplierScoreOverrideRow = typeof sourcingSupplierScoreOverrides.$inferSelect

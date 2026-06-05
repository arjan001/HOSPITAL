import { boolean, index, integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core"

/** QA stock ledger (medication / device / consumable). */
export const qaInventoryItems = pgTable(
  "qa_inventory_items",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().default("medication"),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    stock: integer("stock").notNull().default(0),
    safetyStock: integer("safety_stock").notNull().default(0),
    unit: text("unit").notNull().default("units"),
    expiryDate: text("expiry_date"),
    batchRef: text("batch_ref"),
    location: text("location").notNull().default(""),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    skuIdx: index("qa_inventory_items_sku_idx").on(t.sku),
    batchIdx: index("qa_inventory_items_batch_idx").on(t.batchRef),
  }),
)

/** 7-step dispatch QA gate per batch / order. */
export const qaDispatchChecks = pgTable(
  "qa_dispatch_checks",
  {
    id: text("id").primaryKey(),
    batchRef: text("batch_ref").notNull(),
    orderRef: text("order_ref"),
    steps: jsonb("steps")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    notes: text("notes").notNull().default(""),
    checkedBy: text("checked_by").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at"),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),
  },
  (t) => ({
    batchIdx: index("qa_dispatch_checks_batch_idx").on(t.batchRef),
    orderIdx: index("qa_dispatch_checks_order_idx").on(t.orderRef),
  }),
)

/** Singleton QA settings row (id = default). */
export const qaSettings = pgTable("qa_settings", {
  id: text("id").primaryKey(),
  expiryWarningDays: integer("expiry_warning_days").notNull().default(90),
  expiryCriticalDays: integer("expiry_critical_days").notNull().default(30),
  requireAllStepsForApproval: boolean("require_all_steps").notNull().default(true),
  blockExpiredFromDispatch: boolean("block_expired_dispatch").notNull().default(true),
  expiryFlagsSnapshot: jsonb("expiry_flags_snapshot"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const logisticsZones = pgTable("logistics_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  areas: text("areas").notNull().default(""),
  slaHours: integer("sla_hours").notNull().default(6),
  surcharge: integer("surcharge").notNull().default(0),
  coldChainCapable: boolean("cold_chain_capable").notNull().default(false),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const logisticsRiders = pgTable(
  "logistics_riders",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    vehicle: text("vehicle").notNull().default("motorcycle"),
    capacity: integer("capacity").notNull().default(8),
    zoneId: text("zone_id"),
    coldChainCapable: boolean("cold_chain_capable").notNull().default(false),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    zoneIdx: index("logistics_riders_zone_idx").on(t.zoneId),
  }),
)

export const logisticsBatches = pgTable(
  "logistics_batches",
  {
    id: text("id").primaryKey(),
    ref: text("ref").notNull(),
    zoneId: text("zone_id"),
    riderId: text("rider_id"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    status: text("status").notNull().default("planned"),
    orderIds: jsonb("order_ids").$type<string[]>().notNull().default([]),
    coldChain: boolean("cold_chain").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dispatchedAt: timestamp("dispatched_at"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    refIdx: index("logistics_batches_ref_idx").on(t.ref),
    statusIdx: index("logistics_batches_status_idx").on(t.status),
  }),
)

export const logisticsDeliveries = pgTable(
  "logistics_deliveries",
  {
    id: text("id").primaryKey(),
    orderRef: text("order_ref").notNull(),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    address: text("address").notNull().default(""),
    zoneId: text("zone_id"),
    batchId: text("batch_id"),
    riderId: text("rider_id"),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    codAmount: integer("cod_amount").notNull().default(0),
    estimatedCost: integer("estimated_cost").notNull().default(0),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dispatchedAt: timestamp("dispatched_at"),
    deliveredAt: timestamp("delivered_at"),
    slaHours: integer("sla_hours"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index("logistics_deliveries_order_idx").on(t.orderRef),
    batchIdx: index("logistics_deliveries_batch_idx").on(t.batchId),
    statusIdx: index("logistics_deliveries_status_idx").on(t.status),
  }),
)

export const logisticsColdChainChecks = pgTable("logistics_cold_chain_checks", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  tempBefore: real("temp_before").notNull(),
  tempAfter: real("temp_after").notNull(),
  packagedBy: text("packaged_by").notNull().default(""),
  packagedAt: timestamp("packaged_at").notNull(),
  passed: boolean("passed").notNull().default(true),
  notes: text("notes"),
})

export const logisticsExceptions = pgTable("logistics_exceptions", {
  id: text("id").primaryKey(),
  deliveryId: text("delivery_id"),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  resolution: text("resolution").notNull().default(""),
  cost: integer("cost"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
})

/** Singleton logistics settings (id = default). */
export const logisticsSettings = pgTable("logistics_settings", {
  id: text("id").primaryKey(),
  targetOrdersPerBatch: integer("target_orders_per_batch").notNull().default(8),
  targetSlaHours: integer("target_sla_hours").notNull().default(6),
  costCapPerDelivery: integer("cost_cap_per_delivery").notNull().default(350),
  onlyLeftTurnRule: boolean("only_left_turn_rule").notNull().default(false),
  autoAssignRiders: boolean("auto_assign_riders").notNull().default(true),
  smsCustomerOnDispatch: boolean("sms_on_dispatch").notNull().default(true),
  smsCustomerOnDelivery: boolean("sms_on_delivery").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

import { index, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core"

/**
 * B2B trading ledger — replaces cms_docs keys trading-deals, trading-bids,
 * trading-negotiations, trading-settlements.
 *
 * Apply: `pnpm db:push` (reads all lib/db/src/schema/*.ts via drizzle-kit).
 */

/** B2B trade deals — RFQ → bidding → award → settlement. */
export const tradingDeals = pgTable(
  "trading_deals",
  {
    id: text("id").primaryKey(),
    ref: text("ref").notNull(),
    sku: text("sku"),
    product: text("product").notNull(),
    supplier: text("supplier").notNull(),
    qty: integer("qty").notNull().default(1),
    unit: text("unit").notNull().default("packs"),
    targetPrice: real("target_price").notNull().default(0),
    awardedPrice: real("awarded_price").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    status: text("status").notNull().default("open"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    refIdx: index("trading_deals_ref_idx").on(t.ref),
    skuIdx: index("trading_deals_sku_idx").on(t.sku),
  }),
)

export const tradingBids = pgTable(
  "trading_bids",
  {
    id: text("id").primaryKey(),
    dealRef: text("deal_ref").notNull(),
    supplier: text("supplier").notNull(),
    unitPrice: real("unit_price").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    moq: integer("moq").notNull().default(1),
    leadDays: integer("lead_days").notNull().default(7),
    note: text("note"),
    status: text("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    dealRefIdx: index("trading_bids_deal_ref_idx").on(t.dealRef),
  }),
)

export const tradingNegotiations = pgTable(
  "trading_negotiations",
  {
    id: text("id").primaryKey(),
    dealRef: text("deal_ref").notNull(),
    supplier: text("supplier").notNull(),
    round: integer("round").notNull().default(1),
    ourOffer: real("our_offer").notNull().default(0),
    theirCounter: real("their_counter").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    floor: real("floor").notNull().default(0),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    dealRefIdx: index("trading_negotiations_deal_ref_idx").on(t.dealRef),
  }),
)

export const tradingSettlements = pgTable(
  "trading_settlements",
  {
    id: text("id").primaryKey(),
    dealRef: text("deal_ref").notNull(),
    supplier: text("supplier").notNull(),
    poNumber: text("po_number").notNull(),
    /** Optional link to Postgres `purchase_orders.id` from supplier-purchase-orders API. */
    linkedPurchaseOrderId: text("linked_purchase_order_id"),
    invoiceNumber: text("invoice_number"),
    poValue: real("po_value").notNull().default(0),
    invoiceValue: real("invoice_value").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    matchStatus: text("match_status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    dueDate: text("due_date"),
    settledAt: text("settled_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    dealRefIdx: index("trading_settlements_deal_ref_idx").on(t.dealRef),
    poLinkIdx: index("trading_settlements_po_link_idx").on(t.linkedPurchaseOrderId),
  }),
)

export type TradingDeal = typeof tradingDeals.$inferSelect
export type TradingBid = typeof tradingBids.$inferSelect
export type TradingNegotiation = typeof tradingNegotiations.$inferSelect
export type TradingSettlement = typeof tradingSettlements.$inferSelect

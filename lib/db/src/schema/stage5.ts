import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Stage 5 — partner webhooks and automation metadata.
 * Apply via `pnpm db:push`.
 */

/** Registered outbound webhook URLs per partner directory row. */
export const partnerWebhookEndpoints = pgTable(
  "partner_webhook_endpoints",
  {
    id: text("id").primaryKey(),
    partnerId: text("partner_id").notNull(),
    partnerType: text("partner_type").notNull(),
    url: text("url").notNull(),
    /** HMAC secret for X-Shaniid-Signature header (optional). */
    secret: text("secret"),
    events: jsonb("events").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    partnerIdx: index("partner_webhook_endpoints_partner_idx").on(t.partnerId),
  }),
)

/** Delivery log for partner webhook attempts. */
export const partnerWebhookDeliveries = pgTable(
  "partner_webhook_deliveries",
  {
    id: text("id").primaryKey(),
    endpointId: text("endpoint_id").notNull(),
    event: text("event").notNull(),
    status: text("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(1),
    responseCode: integer("response_code"),
    error: text("error"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    endpointIdx: index("partner_webhook_deliveries_endpoint_idx").on(t.endpointId),
    createdIdx: index("partner_webhook_deliveries_created_idx").on(t.createdAt),
  }),
)

export type PartnerWebhookEndpoint = typeof partnerWebhookEndpoints.$inferSelect
export type PartnerWebhookDelivery = typeof partnerWebhookDeliveries.$inferSelect

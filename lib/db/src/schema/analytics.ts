import { boolean, integer, jsonb, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

/**
 * analytics.ts — visitor analytics pipeline (Postgres-durable).
 *
 * The storefront's PageViewTracker / analytics-store emit page views, click
 * and search events, and abandoned-checkout pings to the api-server
 * `/api/track-*` endpoints. Each is persisted here and aggregated for the
 * admin Analytics dashboard (`/api/admin/analytics`).
 *
 * `analytics_events` is one row per tracked interaction. A page view is later
 * updated in place (duration + scroll depth) when the visitor leaves the page,
 * matched on (sessionId, path) for the most recent open view.
 */

export type AnalyticsEventKind = "view" | "click" | "search" | "event"

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().default("view"),
    // kf_sid — per browser-session (sessionStorage), used for unique-session counts.
    sessionId: text("session_id").notNull().default(""),
    // kf_vid — persistent per-browser id (localStorage), used for unique visitors.
    visitorId: text("visitor_id").notNull().default(""),
    path: text("path").notNull().default(""),
    referrer: text("referrer").notNull().default(""),
    referrerHost: text("referrer_host").notNull().default(""),
    isBot: boolean("is_bot").notNull().default(false),
    isReturning: boolean("is_returning").notNull().default(false),
    device: text("device").notNull().default("desktop"),
    browser: text("browser").notNull().default("Unknown"),
    os: text("os").notNull().default("Unknown"),
    screenWidth: integer("screen_width"),
    language: text("language").notNull().default(""),
    // Geo — derived server-side from proxy headers when available, else blank.
    country: text("country").notNull().default(""),
    countryName: text("country_name").notNull().default(""),
    region: text("region").notNull().default(""),
    city: text("city").notNull().default(""),
    utmSource: text("utm_source").notNull().default(""),
    utmMedium: text("utm_medium").notNull().default(""),
    utmCampaign: text("utm_campaign").notNull().default(""),
    // kind=search → the query string; kind=click → the click target label.
    searchTerm: text("search_term").notNull().default(""),
    clickTarget: text("click_target").notNull().default(""),
    eventName: text("event_name").notNull().default(""),
    durationSec: integer("duration_sec").notNull().default(0),
    scrollDepth: integer("scroll_depth").notNull().default(0),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("analytics_events_created_idx").on(t.createdAt),
    index("analytics_events_kind_idx").on(t.kind),
    index("analytics_events_session_idx").on(t.sessionId),
  ],
)

export const abandonedCheckouts = pgTable(
  "abandoned_checkouts",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().default(""),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    items: jsonb("items").$type<Array<{ name: string; qty: number; price: number }>>().notNull().default([]),
    subtotal: integer("subtotal").notNull().default(0),
    stepReached: text("step_reached").notNull().default(""),
    reason: text("reason").notNull().default(""),
    recovered: boolean("recovered").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("abandoned_checkouts_created_idx").on(t.createdAt)],
)

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ createdAt: true, updatedAt: true })
export const selectAnalyticsEventSchema = createSelectSchema(analyticsEvents)
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect

export const insertAbandonedCheckoutSchema = createInsertSchema(abandonedCheckouts).omit({ createdAt: true, updatedAt: true })
export const selectAbandonedCheckoutSchema = createSelectSchema(abandonedCheckouts)
export type InsertAbandonedCheckout = z.infer<typeof insertAbandonedCheckoutSchema>
export type AbandonedCheckout = typeof abandonedCheckouts.$inferSelect

import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

/**
 * cms_docs — backend persistence for cmsStore.
 *
 * The storefront's `cmsStore` today uses browser localStorage; this table is
 * the production backend. When AdminCmsModule is wired to Drizzle, it reads
 * and writes here instead of the in-memory map.
 *
 * Known keys:
 *   categories, banners, popup-offer, website-settings, custom-pages,
 *   footer, audit-log, message-templates,
 *   sourcing-inventory, sourcing-requests, sourcing-automation-rules,
 *   sourcing-competitor-prices, trading-deals, trading-bids,
 *   trading-negotiations, trading-settlements,
 *   qa.inventory, qa.expiry-flags, qa.config,
 *   logistics.deliveries, logistics.riders, logistics.config,
 *   communications.outbox
 */
export const cmsDocs = pgTable("cms_docs", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

/**
 * audit_log — append-only log of every CMS write.
 *
 * Auto-captured by the writeRaw hook in cmsStore / AdminCmsService.
 * Never delete rows — it is an immutable audit trail.
 */
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  module: text("module").notNull(),
  action: text("action").notNull(),
  key: text("key"),
  summary: text("summary"),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const insertCmsDocSchema = createInsertSchema(cmsDocs)
export const selectCmsDocSchema = createSelectSchema(cmsDocs)
export type InsertCmsDoc = z.infer<typeof insertCmsDocSchema>
export type CmsDoc = typeof cmsDocs.$inferSelect

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ createdAt: true })
export const selectAuditLogSchema = createSelectSchema(auditLog)
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>
export type AuditLog = typeof auditLog.$inferSelect

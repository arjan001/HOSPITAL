import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod/v4"

/**
 * secrets.ts — server-side secure config store (Postgres-durable).
 *
 * Holds operator-managed credentials that are editable from the admin panel
 * (e.g. the error-reporting Sentry DSN / Slack webhook). These are NOT kept in
 * `cms_docs` (cmsStore) — that doc store is read by the browser, and secrets
 * must never reach the client. Instead they live in this dedicated table and
 * are only ever read server-side; the admin UI receives masked values.
 *
 * Resolution order at read time is: DB value (if present) → environment
 * variable fallback. Writing an empty value clears the DB row so the env
 * fallback takes over again.
 *
 * One row per logical key, e.g. `error_reporting.sentry_dsn`.
 */
export const secretConfigs = pgTable("secret_configs", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const insertSecretConfigSchema = createInsertSchema(secretConfigs)
export const selectSecretConfigSchema = createSelectSchema(secretConfigs)
export type SecretConfig = z.infer<typeof selectSecretConfigSchema>

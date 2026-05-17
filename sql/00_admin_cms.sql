-- 00_admin_cms.sql
--
-- Generic CMS key/value store backing the storefront's `cmsStore`.
-- Every admin module whose data is a plain JSON document or list
-- (banners, announcement, popup, newsletter, pages, footer, blogs,
-- policies, website-settings, audit-log, message-templates, etc.) is
-- persisted here. Transactional modules (orders, payments, products,
-- categories, customers, prescriptions, consultations) get their own
-- numbered tables (01..28).
--
-- Backed by `artifacts/api-nest/src/modules/admin-cms.module.ts`. Swap is
-- one file: replace the in-memory Map in AdminCmsService with a Drizzle
-- query against this table — no other code changes.

CREATE TABLE IF NOT EXISTS admin_cms (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  version     INTEGER     NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_cms_updated_at_idx
  ON admin_cms (updated_at DESC);

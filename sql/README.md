# Shaniid RX — Postgres schema scripts

This folder houses the **raw SQL** that creates the production Postgres tables
backing the NestJS user backend (`artifacts/api-nest`). It is intentionally
empty today — every NestJS module ships first with an in-memory repository
(see `artifacts/api-nest/src/common/repository.ts`) so admin features stay
unblocked. When a module is ready to be persisted, drop its `CREATE TABLE`
script in here and swap the module's repository implementation for a
Drizzle-backed one against `packages/db`.

## Convention

One file per NestJS module, named with a two-digit prefix matching its
**sidebar order** in the admin panel:

```
sql/
├── README.md
├── 01_sales_orders.sql      ← /admin/orders
├── 02_payments.sql          ← /admin/payments
├── 03_card_details.sql      ← /admin/card-details
├── 04_customers.sql         ← /admin/customers
├── 05_prescriptions.sql     ← /admin/prescriptions (OCR columns, subscriptions, refills)
├── 06_consultations.sql     ← /admin/consultations
├── 07_chat.sql              ← /admin/chat
├── 08_products.sql          ← /admin/products
├── 09_categories.sql        ← /admin/categories
├── 10_sourcing.sql          ← /admin/sourcing/*
├── 11_trading.sql           ← /admin/trading/*
├── 12_qa.sql                ← /admin/qa/*
├── 13_logistics.sql         ← /admin/logistics/*
├── 14_integrations.sql      ← /admin/integrations/*
├── 15_pages.sql             ← /admin/pages
├── 16_footer.sql            ← /admin/footer
├── 17_blogs.sql             ← /admin/blogs
├── 18_policies.sql          ← /admin/policies
├── 19_banners.sql           ← /admin/banners
├── 20_announcement.sql      ← /admin/announcement
├── 21_popup_offer.sql       ← /admin/popup-offer
├── 22_newsletter.sql        ← /admin/newsletter
├── 23_campaigns.sql         ← /admin/campaigns/*
├── 24_inquiries.sql         ← /admin/inquiries
├── 25_website_settings.sql  ← /admin/website-settings
├── 26_users_roles.sql       ← /admin/users + /admin/roles
├── 27_audit_log.sql         ← /admin/audit-log
├── 28_settings.sql          ← /admin/settings
└── 29_crm_operations.sql    ← CRM funnel + care pack mapping + assessments
```

**Drizzle source of truth:** `lib/db/src/schema/*.ts` — run `pnpm --filter @workspace/db run push` or see `lib/db/migrations/manual/README.md`.

## Rules

1. **Idempotent.** Every file uses `CREATE TABLE IF NOT EXISTS …` and
   `CREATE INDEX IF NOT EXISTS …` so it can run safely against a partially
   migrated DB.
2. **Snake_case.** Postgres columns are `snake_case`; the NestJS layer maps
   to `camelCase` in DTOs.
3. **UUID primary keys**, generated app-side (`newId(prefix)` from
   `api-nest/src/common/repository.ts`). Don't rely on `gen_random_uuid()`.
4. **Timestamps in UTC** (`timestamptz`).
5. **Foreign keys named** `<column>_fk` for greppability.
6. **No app logic in SQL.** Triggers, sequences, and views stay out unless
   there's a clear performance reason; business rules live in NestJS
   services.

## Running

Once a script is added, apply it manually for now:

```bash
psql "$DATABASE_URL" -f sql/01_sales_orders.sql
```

A future `pnpm run db:apply-sql` task will iterate the folder in numeric
order and apply anything not yet recorded in a `_sql_migrations` table.

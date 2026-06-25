-- Sourcing pricing, automation, performance (fallback when drizzle-kit push unavailable).
-- Source of truth: lib/db/src/schema/sourcing-ext.ts — prefer `pnpm db:push`.

CREATE TABLE IF NOT EXISTS sourcing_price_history (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT,
  supplier_id TEXT NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  source TEXT NOT NULL DEFAULT 'manual',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sourcing_competitor_prices (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  competitor TEXT NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  url TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sourcing_automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  conditions JSONB NOT NULL DEFAULT '{}',
  action TEXT NOT NULL DEFAULT 'create_request',
  default_priority TEXT NOT NULL DEFAULT 'normal',
  default_qty INTEGER,
  shortfall_threshold INTEGER NOT NULL DEFAULT 1,
  auto_draft_po BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  last_run_summary TEXT
);

CREATE TABLE IF NOT EXISTS sourcing_automation_log (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sourcing_supplier_score_overrides (
  supplier_id TEXT PRIMARY KEY,
  quality_score INTEGER,
  complaints INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sourcing_price_history_sku_idx ON sourcing_price_history (sku);
CREATE INDEX IF NOT EXISTS sourcing_price_history_captured_idx ON sourcing_price_history (captured_at);
CREATE INDEX IF NOT EXISTS sourcing_competitor_prices_sku_idx ON sourcing_competitor_prices (sku);
CREATE INDEX IF NOT EXISTS sourcing_automation_log_ran_idx ON sourcing_automation_log (ran_at);

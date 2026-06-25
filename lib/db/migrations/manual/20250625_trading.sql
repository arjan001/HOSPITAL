-- Trading module (fallback when drizzle-kit push is unavailable).
-- Source of truth: lib/db/src/schema/trading.ts — prefer `pnpm db:push`.

CREATE TABLE IF NOT EXISTS trading_deals (
  id TEXT PRIMARY KEY,
  ref TEXT NOT NULL,
  sku TEXT,
  product TEXT NOT NULL,
  supplier TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'packs',
  target_price REAL NOT NULL DEFAULT 0,
  awarded_price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_bids (
  id TEXT PRIMARY KEY,
  deal_ref TEXT NOT NULL,
  supplier TEXT NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  moq INTEGER NOT NULL DEFAULT 1,
  lead_days INTEGER NOT NULL DEFAULT 7,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_negotiations (
  id TEXT PRIMARY KEY,
  deal_ref TEXT NOT NULL,
  supplier TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  our_offer REAL NOT NULL DEFAULT 0,
  their_counter REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  floor REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trading_settlements (
  id TEXT PRIMARY KEY,
  deal_ref TEXT NOT NULL,
  supplier TEXT NOT NULL,
  po_number TEXT NOT NULL,
  linked_purchase_order_id TEXT,
  invoice_number TEXT,
  po_value REAL NOT NULL DEFAULT 0,
  invoice_value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  match_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  due_date TEXT,
  settled_at TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trading_deals_ref_idx ON trading_deals (ref);
CREATE INDEX IF NOT EXISTS trading_deals_sku_idx ON trading_deals (sku);
CREATE INDEX IF NOT EXISTS trading_bids_deal_ref_idx ON trading_bids (deal_ref);
CREATE INDEX IF NOT EXISTS trading_negotiations_deal_ref_idx ON trading_negotiations (deal_ref);
CREATE INDEX IF NOT EXISTS trading_settlements_deal_ref_idx ON trading_settlements (deal_ref);
CREATE INDEX IF NOT EXISTS trading_settlements_po_link_idx ON trading_settlements (linked_purchase_order_id);

-- Idempotent column add for DBs created before linked_purchase_order_id existed.
ALTER TABLE trading_settlements ADD COLUMN IF NOT EXISTS linked_purchase_order_id TEXT;
ALTER TABLE trading_deals ADD COLUMN IF NOT EXISTS sku TEXT;

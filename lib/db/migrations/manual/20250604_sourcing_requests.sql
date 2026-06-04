-- Core sourcing tables (if not created by drizzle push). Mirrors lib/db/src/schema/admin.ts
CREATE TABLE IF NOT EXISTS sourcing_requests (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  quantity_needed INTEGER NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  assigned_supplier_id TEXT,
  expected_delivery_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_quotes (
  id TEXT PRIMARY KEY,
  sourcing_request_id TEXT REFERENCES sourcing_requests(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  lead_time_days INTEGER NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sourcing_requests_status_idx ON sourcing_requests (status);
CREATE INDEX IF NOT EXISTS sourcing_requests_sku_idx ON sourcing_requests (sku);

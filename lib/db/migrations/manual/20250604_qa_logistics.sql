-- QA & Logistics (Postgres-backed admin ops; replaces cmsStore qa.* / logistics.*)

CREATE TABLE IF NOT EXISTS qa_inventory_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'medication',
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  expiry_date TEXT,
  batch_ref TEXT,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS qa_inventory_items_sku_idx ON qa_inventory_items (sku);
CREATE INDEX IF NOT EXISTS qa_inventory_items_batch_idx ON qa_inventory_items (batch_ref);

CREATE TABLE IF NOT EXISTS qa_dispatch_checks (
  id TEXT PRIMARY KEY,
  batch_ref TEXT NOT NULL,
  order_ref TEXT,
  steps JSONB NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  checked_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT
);
CREATE INDEX IF NOT EXISTS qa_dispatch_checks_batch_idx ON qa_dispatch_checks (batch_ref);
CREATE INDEX IF NOT EXISTS qa_dispatch_checks_order_idx ON qa_dispatch_checks (order_ref);

CREATE TABLE IF NOT EXISTS qa_settings (
  id TEXT PRIMARY KEY,
  expiry_warning_days INTEGER NOT NULL DEFAULT 90,
  expiry_critical_days INTEGER NOT NULL DEFAULT 30,
  require_all_steps BOOLEAN NOT NULL DEFAULT TRUE,
  block_expired_dispatch BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_flags_snapshot JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  areas TEXT NOT NULL DEFAULT '',
  sla_hours INTEGER NOT NULL DEFAULT 6,
  surcharge INTEGER NOT NULL DEFAULT 0,
  cold_chain_capable BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logistics_riders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  vehicle TEXT NOT NULL DEFAULT 'motorcycle',
  capacity INTEGER NOT NULL DEFAULT 8,
  zone_id TEXT,
  cold_chain_capable BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS logistics_riders_zone_idx ON logistics_riders (zone_id);

CREATE TABLE IF NOT EXISTS logistics_batches (
  id TEXT PRIMARY KEY,
  ref TEXT NOT NULL,
  zone_id TEXT,
  rider_id TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  order_ids JSONB NOT NULL DEFAULT '[]',
  cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS logistics_batches_ref_idx ON logistics_batches (ref);
CREATE INDEX IF NOT EXISTS logistics_batches_status_idx ON logistics_batches (status);

CREATE TABLE IF NOT EXISTS logistics_deliveries (
  id TEXT PRIMARY KEY,
  order_ref TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  zone_id TEXT,
  batch_id TEXT,
  rider_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  cod_amount INTEGER NOT NULL DEFAULT 0,
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  sla_hours INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS logistics_deliveries_order_idx ON logistics_deliveries (order_ref);
CREATE INDEX IF NOT EXISTS logistics_deliveries_batch_idx ON logistics_deliveries (batch_id);
CREATE INDEX IF NOT EXISTS logistics_deliveries_status_idx ON logistics_deliveries (status);

CREATE TABLE IF NOT EXISTS logistics_cold_chain_checks (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  temp_before REAL NOT NULL,
  temp_after REAL NOT NULL,
  packaged_by TEXT NOT NULL DEFAULT '',
  packaged_at TIMESTAMPTZ NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS logistics_exceptions (
  id TEXT PRIMARY KEY,
  delivery_id TEXT,
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  resolution TEXT NOT NULL DEFAULT '',
  cost INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS logistics_settings (
  id TEXT PRIMARY KEY,
  target_orders_per_batch INTEGER NOT NULL DEFAULT 8,
  target_sla_hours INTEGER NOT NULL DEFAULT 6,
  cost_cap_per_delivery INTEGER NOT NULL DEFAULT 350,
  only_left_turn_rule BOOLEAN NOT NULL DEFAULT FALSE,
  auto_assign_riders BOOLEAN NOT NULL DEFAULT TRUE,
  sms_on_dispatch BOOLEAN NOT NULL DEFAULT TRUE,
  sms_on_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO qa_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
INSERT INTO logistics_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

-- Procurement decision (BL #6) & supplier suggestions (BL #7)
CREATE TABLE IF NOT EXISTS procurement_decisions (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  suggested_qty INTEGER NOT NULL DEFAULT 1,
  priority TEXT NOT NULL DEFAULT 'normal',
  reason TEXT,
  demand_sources JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  demand_window_days INTEGER NOT NULL DEFAULT 30,
  selected_supplier_id TEXT,
  selected_supplier_name TEXT,
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS procurement_decisions_sku_idx ON procurement_decisions (sku);
CREATE INDEX IF NOT EXISTS procurement_decisions_status_idx ON procurement_decisions (status);

CREATE TABLE IF NOT EXISTS supplier_suggestions (
  id TEXT PRIMARY KEY,
  procurement_decision_id TEXT NOT NULL REFERENCES procurement_decisions(id) ON DELETE CASCADE,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  unit_cost_estimate INTEGER,
  currency TEXT NOT NULL DEFAULT 'KES',
  moq INTEGER,
  lead_time_days INTEGER,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_suggestions_decision_idx ON supplier_suggestions (procurement_decision_id);

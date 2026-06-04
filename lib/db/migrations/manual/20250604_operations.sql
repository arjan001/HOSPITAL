-- Care pack mapping (BL #4) & demand aggregation inputs (BL #5)
CREATE TABLE IF NOT EXISTS care_pack_mappings (
  id TEXT PRIMARY KEY,
  condition_key TEXT NOT NULL,
  pack_slug TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  product_skus JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS care_pack_mappings_condition_idx ON care_pack_mappings (condition_key);
CREATE INDEX IF NOT EXISTS care_pack_mappings_slug_idx ON care_pack_mappings (pack_slug);

CREATE TABLE IF NOT EXISTS care_pack_assessments (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  condition_keys JSONB NOT NULL DEFAULT '[]',
  recommended_packs JSONB NOT NULL DEFAULT '[]',
  risk_level TEXT,
  source TEXT DEFAULT 'web_assessment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS care_pack_assessments_created_idx ON care_pack_assessments (created_at DESC);

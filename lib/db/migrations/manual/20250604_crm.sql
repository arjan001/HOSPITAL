-- CRM pipeline (customer demand funnel). Mirrors lib/db/src/schema/crm.ts
CREATE TABLE IF NOT EXISTS crm_contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  phone TEXT,
  stage TEXT NOT NULL DEFAULT 'lead',
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_contacts_stage_idx ON crm_contacts (stage);
CREATE INDEX IF NOT EXISTS crm_contacts_updated_idx ON crm_contacts (updated_at DESC);

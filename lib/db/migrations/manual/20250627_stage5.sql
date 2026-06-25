-- Stage 5 (fallback when drizzle-kit push unavailable).
-- Source of truth: lib/db/src/schema/admin.ts (clerk_user_id), stage5.ts

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
CREATE INDEX IF NOT EXISTS admin_users_clerk_user_id_idx ON admin_users (clerk_user_id);

CREATE TABLE IF NOT EXISTS partner_webhook_endpoints (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_webhook_deliveries (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 1,
  response_code INTEGER,
  error TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_webhook_endpoints_partner_idx ON partner_webhook_endpoints (partner_id);
CREATE INDEX IF NOT EXISTS partner_webhook_deliveries_endpoint_idx ON partner_webhook_deliveries (endpoint_id);
CREATE INDEX IF NOT EXISTS partner_webhook_deliveries_created_idx ON partner_webhook_deliveries (created_at);

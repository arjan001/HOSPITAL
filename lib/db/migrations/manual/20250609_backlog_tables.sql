-- Cart + campaign pipeline tables (backlog wiring)

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  variations JSONB,
  snapshot JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cart_items_session_idx ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS cart_items_user_idx ON cart_items(user_id);

CREATE TABLE IF NOT EXISTS campaign_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_pipelines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_queue_items (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_queue_campaign_idx ON campaign_queue_items(campaign_id);

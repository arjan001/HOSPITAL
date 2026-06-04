-- Prescriptions module — mirrors lib/db/src/schema/prescriptions.ts (core + workflow columns).
-- Requires: users, uploads (for FKs). Run after base user/upload tables exist.

-- Core columns are created by drizzle push; this file adds workflow columns/tables if missing.

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extracted_drugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extraction_summary text;

COMMENT ON COLUMN prescriptions.status IS
  'pending | verified | accepted | declined | dispensed | rejected';

CREATE TABLE IF NOT EXISTS prescription_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  interval_days INTEGER NOT NULL DEFAULT 30,
  amount INTEGER NOT NULL DEFAULT 0,
  next_refill_at TIMESTAMPTZ NOT NULL,
  last_refill_at TIMESTAMPTZ,
  refill_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescription_refills (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES prescription_subscriptions(id) ON DELETE CASCADE,
  prescription_id TEXT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  amount INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT UNIQUE,
  payment_receipt TEXT,
  paid_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prescription_subscriptions_next_idx ON prescription_subscriptions (next_refill_at);
CREATE INDEX IF NOT EXISTS prescription_refills_due_idx ON prescription_refills (due_at);

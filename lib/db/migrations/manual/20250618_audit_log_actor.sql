-- audit_log — append-only activity trail for all actors (admin, customer, partner, guest).
-- Run after cms_docs bootstrap. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT        PRIMARY KEY,
  user_id       TEXT,
  actor_email   TEXT,
  actor_role    TEXT,
  actor_type    TEXT,
  module        TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  key           TEXT,
  summary       TEXT,
  severity      TEXT,
  before        JSONB,
  after         JSONB,
  http_method   TEXT,
  path          TEXT,
  user_agent    TEXT,
  ip            TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS actor_email TEXT,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS actor_type TEXT,
  ADD COLUMN IF NOT EXISTS http_method TEXT,
  ADD COLUMN IF NOT EXISTS path TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_actor_type_idx
  ON audit_log (actor_type, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_module_idx
  ON audit_log (module, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_actor_email_idx
  ON audit_log (actor_email, created_at DESC);

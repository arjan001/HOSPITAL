-- Post-delivery customer feedback (last-mile completion follow-up).

CREATE TABLE IF NOT EXISTS delivery_feedback (
  id            TEXT PRIMARY KEY,
  order_ref     TEXT NOT NULL,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  delivery_id   TEXT,
  rating        INTEGER NOT NULL,
  nps           INTEGER,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_feedback_order_uq ON delivery_feedback (order_ref);
CREATE INDEX IF NOT EXISTS delivery_feedback_order_idx ON delivery_feedback (order_ref);

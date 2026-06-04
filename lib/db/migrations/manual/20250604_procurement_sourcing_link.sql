ALTER TABLE procurement_decisions
  ADD COLUMN IF NOT EXISTS sourcing_request_id TEXT;

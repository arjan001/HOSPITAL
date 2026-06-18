-- Partner directory: structured KYC blob + soft-delete timestamp (optional archive trail).
ALTER TABLE partner_directory
  ADD COLUMN IF NOT EXISTS kyc JSONB NOT NULL DEFAULT '{}';

ALTER TABLE partner_directory
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS partner_directory_deleted_at_idx
  ON partner_directory (deleted_at)
  WHERE deleted_at IS NOT NULL;

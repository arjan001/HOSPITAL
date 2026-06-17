-- Internal pharmacy network: legal pharmacies → branches → staff (RBAC + optional Clerk invites).

CREATE TABLE IF NOT EXISTS pharmacies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL DEFAULT '',
  license_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  clerk_org_id TEXT,
  admin_user_id TEXT,
  kyc JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pharmacy_branches
  ADD COLUMN IF NOT EXISTS pharmacy_id TEXT REFERENCES pharmacies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pharmacy_branches_pharmacy_idx ON pharmacy_branches (pharmacy_id);

ALTER TABLE pharmacy_employees
  ADD COLUMN IF NOT EXISTS pharmacy_id TEXT REFERENCES pharmacies(id) ON DELETE CASCADE;

ALTER TABLE pharmacy_employees
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

ALTER TABLE pharmacy_employees
  ADD COLUMN IF NOT EXISTS clerk_invite_id TEXT;

CREATE INDEX IF NOT EXISTS pharmacy_employees_pharmacy_idx ON pharmacy_employees (pharmacy_id);

-- Partner organizations (Clerk org tenancy) + org members + delivery job assignee.
-- Idempotent — safe to re-run.

-- Link partner_directory rows to Clerk Organizations (one org = one partner company).
ALTER TABLE partner_directory
  ADD COLUMN IF NOT EXISTS clerk_org_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS partner_directory_clerk_org_idx
  ON partner_directory (clerk_org_id)
  WHERE clerk_org_id IS NOT NULL;

-- Employees / couriers onboarded via Clerk org invitations.
CREATE TABLE IF NOT EXISTS partner_members (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  clerk_org_id TEXT NOT NULL,
  clerk_user_id TEXT,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  clerk_invite_id TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_members_partner_idx ON partner_members (partner_id);
CREATE INDEX IF NOT EXISTS partner_members_org_user_idx ON partner_members (clerk_org_id, clerk_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS partner_members_email_org_idx ON partner_members (clerk_org_id, email);

-- Courier assignee on delivery jobs (partner_members.id).
ALTER TABLE delivery_jobs
  ADD COLUMN IF NOT EXISTS assigned_member_id TEXT;

CREATE INDEX IF NOT EXISTS delivery_jobs_assigned_member_idx
  ON delivery_jobs (assigned_member_id)
  WHERE assigned_member_id IS NOT NULL;

-- Core partner tables (if drizzle push was never run).
CREATE TABLE IF NOT EXISTS partner_accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  partner_type TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  invite_token TEXT,
  invite_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_applications (
  id TEXT PRIMARY KEY,
  partner_type TEXT NOT NULL,
  org_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_jobs (
  id TEXT PRIMARY KEY,
  job_ref TEXT UNIQUE NOT NULL,
  order_id TEXT,
  order_type TEXT NOT NULL DEFAULT 'storefront',
  assigned_rider_id TEXT,
  assigned_rider_name TEXT,
  assigned_member_id TEXT,
  logistics_partner_id TEXT,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  recipient_name TEXT,
  recipient_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_minutes INTEGER,
  cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  proof_of_delivery_url TEXT,
  assigned_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

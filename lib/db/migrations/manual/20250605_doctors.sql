-- Doctor directory + portal accounts (replaces cmsStore `doctors` key).

CREATE TABLE IF NOT EXISTS doctors (
  id text PRIMARY KEY,
  clerk_id text UNIQUE,
  name text NOT NULL,
  title text NOT NULL DEFAULT 'MBChB',
  specialty text NOT NULL,
  license_number text NOT NULL DEFAULT '',
  bio text,
  photo_url text,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  languages jsonb NOT NULL DEFAULT '[]',
  availability jsonb NOT NULL DEFAULT '{"monFri":true,"weekends":false,"hours":"08:00–18:00 EAT"}',
  years_experience integer NOT NULL DEFAULT 0,
  consultation_fee integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  available_hours jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS doctors_email_uq ON doctors (email) WHERE email <> '';

CREATE TABLE IF NOT EXISTS doctor_accounts (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text,
  doctor_id text NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'invited',
  invite_token text,
  invite_expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctor_accounts_doctor_idx ON doctor_accounts (doctor_id);

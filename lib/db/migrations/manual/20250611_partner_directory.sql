-- Partner directory — suppliers, clinics, logistics profiles (Postgres-native)

CREATE TABLE IF NOT EXISTS partner_directory (
  id TEXT PRIMARY KEY,
  partner_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  portal_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS partner_directory_type_idx ON partner_directory(partner_type);

-- One-time import from legacy cms_docs arrays (safe to re-run — skips when rows exist)
INSERT INTO partner_directory (id, partner_type, payload, email, display_name, status, portal_code, created_at, updated_at)
SELECT
  elem->>'id',
  'supplier',
  elem,
  COALESCE(elem->>'email', ''),
  COALESCE(elem->>'companyName', elem->>'email', ''),
  COALESCE(elem->>'status', 'pending'),
  COALESCE(elem->>'portalCode', ''),
  NOW(),
  NOW()
FROM cms_docs,
     jsonb_array_elements(value) AS elem
WHERE key = 'suppliers'
  AND jsonb_typeof(value) = 'array'
  AND elem->>'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM partner_directory pd WHERE pd.partner_type = 'supplier' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_directory (id, partner_type, payload, email, display_name, status, portal_code, created_at, updated_at)
SELECT
  elem->>'id',
  'clinic',
  elem,
  COALESCE(elem->>'email', ''),
  COALESCE(elem->>'clinicName', elem->>'email', ''),
  COALESCE(elem->>'status', 'pending'),
  COALESCE(elem->>'portalCode', ''),
  NOW(),
  NOW()
FROM cms_docs,
     jsonb_array_elements(value) AS elem
WHERE key = 'clinics'
  AND jsonb_typeof(value) = 'array'
  AND elem->>'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM partner_directory pd WHERE pd.partner_type = 'clinic' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO partner_directory (id, partner_type, payload, email, display_name, status, portal_code, created_at, updated_at)
SELECT
  elem->>'id',
  'logistics',
  elem,
  COALESCE(elem->>'email', ''),
  COALESCE(elem->>'companyName', elem->>'name', elem->>'email', ''),
  COALESCE(elem->>'status', 'pending'),
  COALESCE(elem->>'portalCode', ''),
  NOW(),
  NOW()
FROM cms_docs,
     jsonb_array_elements(value) AS elem
WHERE key = 'logistics-partners'
  AND jsonb_typeof(value) = 'array'
  AND elem->>'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM partner_directory pd WHERE pd.partner_type = 'logistics' LIMIT 1)
ON CONFLICT (id) DO NOTHING;

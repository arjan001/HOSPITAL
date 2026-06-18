-- Stop partner directory from re-importing legacy cms_docs after deletes.
-- Safe to re-run.

INSERT INTO cms_docs (key, value, version, updated_at)
VALUES
  ('__partner_dir_migrated:suppliers', 'true'::jsonb, 1, now()),
  ('__partner_dir_migrated:clinics', 'true'::jsonb, 1, now()),
  ('__partner_dir_migrated:logistics-partners', 'true'::jsonb, 1, now())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

-- Clear stale legacy arrays (partner_directory is source of truth).
UPDATE cms_docs SET value = '[]'::jsonb, updated_at = now()
WHERE key IN ('suppliers', 'clinics', 'logistics-partners');

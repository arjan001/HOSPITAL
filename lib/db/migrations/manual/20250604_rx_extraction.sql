-- Manual migration: prescription OCR / extraction columns (if drizzle-kit push fails locally).
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS extraction_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extracted_drugs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extraction_summary text;

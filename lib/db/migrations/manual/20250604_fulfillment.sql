-- BL #8 Inventory allocation & BL #9 Care pack assembly
CREATE TABLE IF NOT EXISTS inventory_allocations (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  location TEXT,
  notes TEXT,
  allocated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_allocations_sku_idx ON inventory_allocations (sku);
CREATE INDEX IF NOT EXISTS inventory_allocations_ref_idx ON inventory_allocations (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS inventory_allocations_status_idx ON inventory_allocations (status);

CREATE TABLE IF NOT EXISTS care_pack_assembly_jobs (
  id TEXT PRIMARY KEY,
  pack_slug TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  assessment_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  patient_label TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'queued',
  notes TEXT,
  assembled_by TEXT,
  assembled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS care_pack_assembly_jobs_status_idx ON care_pack_assembly_jobs (status);

CREATE TABLE IF NOT EXISTS care_pack_assembly_lines (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES care_pack_assembly_jobs(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  quantity_allocated INTEGER NOT NULL DEFAULT 0,
  line_status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS care_pack_assembly_lines_job_idx ON care_pack_assembly_lines (job_id);

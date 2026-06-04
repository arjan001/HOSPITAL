-- Order-capture statuses: accepted / declined (quotation workflow).
-- No column changes required if status is stored as text; documents allowed values.
COMMENT ON COLUMN prescriptions.status IS
  'pending | verified | accepted | declined | dispensed | rejected';

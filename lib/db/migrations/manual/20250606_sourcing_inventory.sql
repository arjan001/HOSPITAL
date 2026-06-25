-- Sourcing inventory (replaces cms_docs `sourcing-inventory`)
CREATE TABLE IF NOT EXISTS sourcing_inventory_items (
  id text PRIMARY KEY,
  sku text NOT NULL,
  product_name text NOT NULL,
  type text NOT NULL DEFAULT 'medication',
  on_hand integer NOT NULL DEFAULT 0,
  safety_stock integer NOT NULL DEFAULT 0,
  reorder_point integer NOT NULL DEFAULT 0,
  unit_cost real,
  batch_expiry text,
  location text,
  notes text,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sourcing_inventory_items_sku_idx ON sourcing_inventory_items (sku);

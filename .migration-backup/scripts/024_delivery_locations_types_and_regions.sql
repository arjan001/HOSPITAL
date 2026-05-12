-- ============================================================
-- Migration 024: Delivery + Pickup locations with regions
-- ------------------------------------------------------------
-- Adds structured fields so admins can manage both delivery
-- addresses AND matatu pickup stations, grouped by whether
-- they are inside or outside Nairobi. Fully backwards compatible
-- with the legacy free-text "name" column.
-- ============================================================

ALTER TABLE public.delivery_locations
  ADD COLUMN IF NOT EXISTS type        character varying DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS region      character varying DEFAULT 'nairobi',
  ADD COLUMN IF NOT EXISTS city        character varying,
  ADD COLUMN IF NOT EXISTS description text;

-- Normalise any rows that still have NULL values after the ALTER.
UPDATE public.delivery_locations
SET type = 'delivery'
WHERE type IS NULL;

UPDATE public.delivery_locations
SET region = CASE
  WHEN lower(coalesce(name, '')) LIKE 'nairobi%' THEN 'nairobi'
  WHEN lower(coalesce(name, '')) LIKE '%nairobi%' THEN 'nairobi'
  WHEN lower(coalesce(name, '')) IN ('thika / ruiru / juja','machakos / kitengela / athi river') THEN 'nairobi'
  ELSE 'outside_nairobi'
END
WHERE region IS NULL OR region = '';

-- Add CHECK constraints. Use DO blocks so the script is re-runnable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_locations_type_check'
  ) THEN
    ALTER TABLE public.delivery_locations
      ADD CONSTRAINT delivery_locations_type_check
      CHECK (type IN ('delivery','pickup'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_locations_region_check'
  ) THEN
    ALTER TABLE public.delivery_locations
      ADD CONSTRAINT delivery_locations_region_check
      CHECK (region IN ('nairobi','outside_nairobi'));
  END IF;
END$$;

-- Helpful indexes for the shop-side filters.
CREATE INDEX IF NOT EXISTS delivery_locations_type_idx
  ON public.delivery_locations (type);
CREATE INDEX IF NOT EXISTS delivery_locations_region_idx
  ON public.delivery_locations (region);

-- ============================================================
-- SEED: most-common Nairobi delivery locations
-- (safe to run multiple times — UNIQUE on name dedupes)
-- ============================================================
INSERT INTO public.delivery_locations (name, fee, estimated_days, is_active, sort_order, type, region, city)
VALUES
  ('Nairobi CBD',                                     200, '1-2 days', true, 10, 'delivery', 'nairobi', 'Nairobi'),
  ('Westlands / Parklands',                            250, '1-2 days', true, 11, 'delivery', 'nairobi', 'Nairobi'),
  ('Kilimani / Kileleshwa / Lavington',                250, '1-2 days', true, 12, 'delivery', 'nairobi', 'Nairobi'),
  ('Karen / Langata / Hardy',                          300, '1-2 days', true, 13, 'delivery', 'nairobi', 'Nairobi'),
  ('South B / South C / Industrial Area',              280, '1-2 days', true, 14, 'delivery', 'nairobi', 'Nairobi'),
  ('Eastlands — Buruburu / Donholm / Umoja',           300, '1-2 days', true, 15, 'delivery', 'nairobi', 'Nairobi'),
  ('Embakasi / Utawala / Pipeline',                    320, '1-2 days', true, 16, 'delivery', 'nairobi', 'Nairobi'),
  ('Kasarani / Roysambu / Thika Road',                 300, '1-2 days', true, 17, 'delivery', 'nairobi', 'Nairobi'),
  ('Ruaka / Runda / Muthaiga',                         320, '1-2 days', true, 18, 'delivery', 'nairobi', 'Nairobi'),
  ('Rongai / Kiserian',                                350, '1-2 days', true, 19, 'delivery', 'nairobi', 'Nairobi'),
  ('Kitengela / Athi River / Kitisuru',                380, '2-3 days', true, 20, 'delivery', 'nairobi', 'Nairobi'),
  ('Thika / Ruiru / Juja',                             400, '2-3 days', true, 21, 'delivery', 'nairobi', 'Nairobi'),
  ('Ngong / Kikuyu / Wangige',                         380, '2-3 days', true, 22, 'delivery', 'nairobi', 'Nairobi')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: common outside-Nairobi delivery locations (courier)
-- ============================================================
INSERT INTO public.delivery_locations (name, fee, estimated_days, is_active, sort_order, type, region, city)
VALUES
  ('Mombasa',    400, '2-3 days', true, 40, 'delivery', 'outside_nairobi', 'Mombasa'),
  ('Kisumu',     400, '2-3 days', true, 41, 'delivery', 'outside_nairobi', 'Kisumu'),
  ('Nakuru',     350, '2-3 days', true, 42, 'delivery', 'outside_nairobi', 'Nakuru'),
  ('Eldoret',    400, '2-3 days', true, 43, 'delivery', 'outside_nairobi', 'Eldoret'),
  ('Nyeri',      400, '2-3 days', true, 44, 'delivery', 'outside_nairobi', 'Nyeri'),
  ('Meru',       450, '2-4 days', true, 45, 'delivery', 'outside_nairobi', 'Meru'),
  ('Embu',       450, '2-4 days', true, 46, 'delivery', 'outside_nairobi', 'Embu'),
  ('Kericho',    450, '2-4 days', true, 47, 'delivery', 'outside_nairobi', 'Kericho'),
  ('Kakamega',   450, '2-4 days', true, 48, 'delivery', 'outside_nairobi', 'Kakamega'),
  ('Kisii',      450, '2-4 days', true, 49, 'delivery', 'outside_nairobi', 'Kisii'),
  ('Bungoma',    450, '2-4 days', true, 50, 'delivery', 'outside_nairobi', 'Bungoma'),
  ('Machakos',   350, '2-3 days', true, 51, 'delivery', 'outside_nairobi', 'Machakos'),
  ('Kitale',     500, '3-5 days', true, 52, 'delivery', 'outside_nairobi', 'Kitale'),
  ('Malindi',    500, '3-5 days', true, 53, 'delivery', 'outside_nairobi', 'Malindi'),
  ('Diani / Ukunda', 500, '3-5 days', true, 54, 'delivery', 'outside_nairobi', 'Kwale'),
  ('Lamu',       600, '4-6 days', true, 55, 'delivery', 'outside_nairobi', 'Lamu'),
  ('Garissa',    600, '4-6 days', true, 56, 'delivery', 'outside_nairobi', 'Garissa'),
  ('Isiolo',     550, '3-5 days', true, 57, 'delivery', 'outside_nairobi', 'Isiolo'),
  ('Lodwar',     700, '4-7 days', true, 58, 'delivery', 'outside_nairobi', 'Turkana'),
  ('Other town — confirm via WhatsApp', 500, '3-7 days', true, 99, 'delivery', 'outside_nairobi', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: matatu / SGR pickup stations (collect at station)
-- ============================================================
INSERT INTO public.delivery_locations (name, fee, estimated_days, is_active, sort_order, type, region, city)
VALUES
  ('Pickup: Her Kingdom Shop (CBD)',                  0,   'Same day',        true, 1,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Afya Centre Matatu Stage (Tom Mboya)',    150, 'Same day',        true, 2,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Railways Bus Station',                    150, 'Same day',        true, 3,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Machakos Country Bus Station',            150, 'Same day',        true, 4,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Nyamakima Matatu Stage',                  150, 'Same day',        true, 5,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Ngara Matatu Stage',                      150, 'Same day',        true, 6,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Globe Cinema Roundabout',                 150, 'Same day',        true, 7,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: SGR Nairobi Terminus (Syokimau)',         250, '1 day',           true, 8,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Modern Coast / Mash Poa (Accra Road)',    200, 'Same day',        true, 9,  'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: Easy Coach Terminus',                     200, 'Same day',        true, 10, 'pickup', 'nairobi',         'Nairobi'),
  ('Pickup: SGR Mombasa Terminus (Miritini)',         350, '1-2 days',        true, 20, 'pickup', 'outside_nairobi', 'Mombasa'),
  ('Pickup: Mombasa Buxton Stage',                    300, '1-2 days',        true, 21, 'pickup', 'outside_nairobi', 'Mombasa'),
  ('Pickup: Kisumu Bus Park (Kibuye)',                300, '1-2 days',        true, 22, 'pickup', 'outside_nairobi', 'Kisumu'),
  ('Pickup: Nakuru Easy Coach Stage',                 250, '1 day',           true, 23, 'pickup', 'outside_nairobi', 'Nakuru'),
  ('Pickup: Eldoret North Rift Stage',                300, '1-2 days',        true, 24, 'pickup', 'outside_nairobi', 'Eldoret'),
  ('Pickup: Thika Blue Post Stage',                   200, 'Same day',        true, 25, 'pickup', 'nairobi',         'Thika')
ON CONFLICT DO NOTHING;

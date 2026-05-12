-- ============================================================
-- Her Kingdom - Rename "Necklace Sets" category to "Jewelry Sets"
-- ============================================================
-- The navbar displays the first four categories by sort order.
-- Because "Necklaces" and "Necklace Sets" were listed side by
-- side, shoppers confused the two. "Necklace Sets" actually
-- contains matching necklace + earring sets, so renaming the
-- category to "Jewelry Sets" removes the visual repetition and
-- describes the contents more accurately.
--
-- The slug ("necklace-sets") is intentionally preserved so any
-- existing links, bookmarks, and product associations continue
-- to work without changes.
-- ============================================================
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

UPDATE public.categories
SET name = 'Jewelry Sets'
WHERE slug = 'necklace-sets';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE slug = 'necklace-sets' AND name = 'Jewelry Sets'
  ) THEN
    RAISE NOTICE 'Notice: Category with slug "necklace-sets" not found. Nothing renamed.';
  ELSE
    RAISE NOTICE 'Success: Category renamed to "Jewelry Sets".';
  END IF;
END $$;

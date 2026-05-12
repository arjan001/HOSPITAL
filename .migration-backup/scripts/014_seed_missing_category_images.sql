-- ============================================================
-- Her Kingdom - Seed Missing Category Images
-- ============================================================
-- Backfills image_url for categories that shipped without one.
-- Currently covers "Necklace Sets" and "Men's Necklaces" which were
-- rendering a placeholder in the storefront and admin category grid.
--
-- Safe to re-run: UPDATE statements only touch the named slugs and
-- do not overwrite images that an admin has already replaced via the
-- categories admin UI (the WHERE clause also checks for NULL / empty /
-- placeholder values so custom uploads are preserved).
-- ============================================================
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

UPDATE public.categories
SET image_url = '/images/products/necklaces/necklace-sets-category.jpeg'
WHERE slug = 'necklace-sets'
  AND (image_url IS NULL OR image_url = '' OR image_url LIKE '/placeholder%');

UPDATE public.categories
SET image_url = '/images/products/men-necklaces/men-necklaces-category.jpeg'
WHERE slug = 'men-necklaces'
  AND (image_url IS NULL OR image_url = '' OR image_url LIKE '/placeholder%');

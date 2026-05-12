-- ============================================================
-- Her Kingdom - Men's Sunglasses Seed Data
-- ============================================================
-- This script seeds 5 men's sunglasses under the "Men's Sunglasses" category
-- All products belong to the 'men' collection
-- ============================================================
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_trending uuid;
  tag_gift_idea uuid;
  tag_statement uuid;
  tag_everyday uuid;
BEGIN
  -- Ensure the Men's Sunglasses category exists
  INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
  VALUES (
    'Men''s Sunglasses',
    'men-sunglasses',
    'Stylish men''s sunglasses for every occasion',
    '/categories/men-sunglasses.jpeg',
    15,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;

  SELECT id INTO cat_id FROM public.categories WHERE slug = 'men-sunglasses';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_statement FROM public.tags WHERE slug = 'statement';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Men''s Sunglasses category not found!';
  END IF;

  -- ============================================================
  -- MEN'S SUNGLASSES
  -- ============================================================

  -- 1. Stealth Sunglasses - KSh 1,500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Stealth Sunglasses',
    'stealth-sunglasses',
    'Bold and sporty — the Stealth Sunglasses feature a rectangular wraparound frame in matte black with dark polarised lenses. The wide, angular silhouette provides full coverage and a commanding look, perfect for outdoor adventures or everyday street style. Lightweight and durable for all-day comfort. Comes with a Her Kingdom branded case.',
    1500, 1800, cat_id, true, true, 17, true, true, 'men',
    ARRAY['/images/products/men-sunglasses/stealth-sunglasses.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = EXCLUDED.category_id,
    collection = EXCLUDED.collection,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/men-sunglasses/stealth-sunglasses.jpeg', 'Stealth Sunglasses - rectangular matte black wraparound frame with dark lenses', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Monarch Sunglasses - KSh 1,500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Monarch Sunglasses',
    'monarch-sunglasses',
    'Foldable and fearless — the Monarch Sunglasses feature a sleek round frame in matte black with distinctive red temple accents and dark polarised lenses. The innovative folding design makes them ultra-portable without sacrificing style. Compact enough to slip into any pocket, yet bold enough to turn heads. Comes with a Her Kingdom branded case.',
    1500, 1800, cat_id, true, true, 17, true, true, 'men',
    ARRAY['/images/products/men-sunglasses/monarch-sunglasses.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = EXCLUDED.category_id,
    collection = EXCLUDED.collection,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/men-sunglasses/monarch-sunglasses.jpeg', 'Monarch Sunglasses - foldable round frame with red accents and dark lenses', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Titan Sunglasses - KSh 1,500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Titan Sunglasses',
    'titan-sunglasses',
    'Compact and versatile — the Titan Sunglasses feature a foldable frame design in matte black, perfect for the man on the go. The dark lenses offer full UV protection while the lightweight construction ensures comfortable all-day wear. Folds neatly for easy storage in your pocket or bag. Comes with a Her Kingdom branded case.',
    1500, 1800, cat_id, true, true, 17, true, false, 'men',
    ARRAY['/images/products/men-sunglasses/titan-sunglasses.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = EXCLUDED.category_id,
    collection = EXCLUDED.collection,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/men-sunglasses/titan-sunglasses.jpeg', 'Titan Sunglasses - foldable matte black frame with case', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. RayBan Sunglasses - KSh 1,500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'RayBan Sunglasses',
    'rayban-sunglasses',
    'The timeless classic — the RayBan Sunglasses feature the iconic wayfarer silhouette in matte black with dark polarised lenses and signature metal rivets at the temples. A universally flattering shape that has defined cool for decades. Sturdy, lightweight, and endlessly versatile — the one pair every man needs. Comes with a Her Kingdom branded case.',
    1500, 1800, cat_id, true, true, 17, true, true, 'men',
    ARRAY['/images/products/men-sunglasses/rayban-sunglasses.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = EXCLUDED.category_id,
    collection = EXCLUDED.collection,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/men-sunglasses/rayban-sunglasses.jpeg', 'RayBan Sunglasses - classic wayfarer in matte black with dark lenses', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 5. Enigma Sunglasses - KSh 1,500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Enigma Sunglasses',
    'enigma-sunglasses',
    'Mysterious and refined — the Enigma Sunglasses feature a foldable cat-eye inspired frame in matte black with gradient lenses that transition from dark to light. The subtle curves and clean lines give a distinguished, modern look. Folds flat for easy portability without compromising on style. Comes with a Her Kingdom branded case.',
    1500, 1800, cat_id, true, true, 17, true, true, 'men',
    ARRAY['/images/products/men-sunglasses/enigma-sunglasses.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = EXCLUDED.category_id,
    collection = EXCLUDED.collection,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/men-sunglasses/enigma-sunglasses.jpeg', 'Enigma Sunglasses - foldable frame with gradient lenses', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 5 men''s sunglasses inserted under "Men''s Sunglasses" category.';
END $$;

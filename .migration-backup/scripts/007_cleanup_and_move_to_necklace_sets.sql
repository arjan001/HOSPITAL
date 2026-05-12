-- ============================================================
-- Her Kingdom - Cleanup & Move Necklace Sets to Correct Category
-- ============================================================
-- This script:
--   1. Deletes ALL products that were incorrectly added under "Necklaces"
--      (they are necklace sets with matching earrings, not plain necklaces)
--   2. Removes their associated images, tags, and variations
--   3. Re-inserts them under the correct "Necklace Sets" category
-- ============================================================
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

-- ============================================================
-- STEP 1: DELETE all old necklace set products and their related data
-- ============================================================
DO $$
DECLARE
  product_slugs text[] := ARRAY[
    'round-halo-crystal-necklace-set',
    'black-emerald-cut-necklace-set',
    'crystal-cluster-drop-necklace-set',
    'pink-emerald-cut-necklace-set',
    'clear-emerald-cut-crystal-necklace-set',
    'square-pave-halo-necklace-set',
    'diamond-shape-crystal-necklace-set',
    'kite-pave-crystal-necklace-set',
    'cherry-pendant-necklace-set',
    'fan-shell-crystal-necklace-set',
    'pear-leaf-crystal-necklace-set'
  ];
BEGIN
  -- Delete product tags (junction table)
  DELETE FROM public.product_tags
  WHERE product_id IN (
    SELECT id FROM public.products WHERE slug = ANY(product_slugs)
  );

  -- Delete product images
  DELETE FROM public.product_images
  WHERE product_id IN (
    SELECT id FROM public.products WHERE slug = ANY(product_slugs)
  );

  -- Delete product variations
  DELETE FROM public.product_variations
  WHERE product_id IN (
    SELECT id FROM public.products WHERE slug = ANY(product_slugs)
  );

  -- Delete the products themselves
  DELETE FROM public.products
  WHERE slug = ANY(product_slugs);

  RAISE NOTICE 'Cleanup complete: removed all old necklace set products and related data.';
END $$;


-- ============================================================
-- STEP 2: RE-INSERT products under "Necklace Sets" category
-- ============================================================
DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_trending uuid;
  tag_gift_idea uuid;
  tag_luxury uuid;
  tag_everyday uuid;
  tag_valentine uuid;
  tag_birthday uuid;
  tag_gold_plated uuid;
  tag_minimalist uuid;
  tag_statement uuid;
  tag_bridal uuid;
BEGIN
  -- Get the NECKLACE SETS category ID (correct category)
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'necklace-sets';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_valentine FROM public.tags WHERE slug = 'valentine';
  SELECT id INTO tag_birthday FROM public.tags WHERE slug = 'birthday';
  SELECT id INTO tag_gold_plated FROM public.tags WHERE slug = 'gold-plated';
  SELECT id INTO tag_minimalist FROM public.tags WHERE slug = 'minimalist';
  SELECT id INTO tag_statement FROM public.tags WHERE slug = 'statement';
  SELECT id INTO tag_bridal FROM public.tags WHERE slug = 'bridal';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Necklace Sets category not found! Make sure 001_herkingdom_schema.sql has been run first.';
  END IF;

  -- ============================================================
  -- NECKLACE SETS (under correct "Necklace Sets" category)
  -- ============================================================

  -- 1. Round Halo Crystal Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Round Halo Crystal Necklace Set',
    'round-halo-crystal-necklace-set',
    'A timeless statement of elegance — the Round Halo Crystal Necklace Set features a dazzling round-cut cubic zirconia center stone encircled by a sparkling pavé halo border. The rose gold-plated pendant hangs on a delicate chain, paired with matching round halo stud earrings for a perfectly coordinated look. Ideal for date nights, weddings, or whenever you want to shine. Comes beautifully presented in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/round-halo-crystal-necklace-set.jpeg', '/images/products/necklaces/round-halo-crystal-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/round-halo-crystal-necklace-set.jpeg', '/images/products/necklaces/round-halo-crystal-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/round-halo-crystal-necklace-set.jpeg', 'Round Halo Crystal Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/round-halo-crystal-necklace-set-2.jpeg', 'Round Halo Crystal Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Black Emerald Cut Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Black Emerald Cut Necklace Set',
    'black-emerald-cut-necklace-set',
    'Bold and mysterious — the Black Emerald Cut Necklace Set showcases a stunning rectangular black stone pendant framed by a glittering cubic zirconia halo on a rose gold-plated chain. Paired with matching black emerald cut drop earrings that catch the light beautifully. The perfect accessory for evening events or adding drama to any outfit. Comes in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/black-emerald-cut-necklace-set.jpeg', '/images/products/necklaces/black-emerald-cut-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/black-emerald-cut-necklace-set.jpeg', '/images/products/necklaces/black-emerald-cut-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/black-emerald-cut-necklace-set.jpeg', 'Black Emerald Cut Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/black-emerald-cut-necklace-set-2.jpeg', 'Black Emerald Cut Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Crystal Cluster Drop Necklace Set - KSh 900
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Crystal Cluster Drop Necklace Set',
    'crystal-cluster-drop-necklace-set',
    'Effortlessly glamorous — the Crystal Cluster Drop Necklace Set features a cascading triple-cluster pendant of brilliant cubic zirconia stones set in rose gold plating. The tiered flower-like clusters create a stunning waterfall effect, complemented by matching cluster drop earrings. A showstopper for weddings, galas, or any special occasion. Comes beautifully presented in a Her Kingdom gift box.',
    900, 1100, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/necklaces/crystal-cluster-drop-necklace-set.jpeg', '/images/products/necklaces/crystal-cluster-drop-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/crystal-cluster-drop-necklace-set.jpeg', '/images/products/necklaces/crystal-cluster-drop-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/crystal-cluster-drop-necklace-set.jpeg', 'Crystal Cluster Drop Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/crystal-cluster-drop-necklace-set-2.jpeg', 'Crystal Cluster Drop Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. Pink Emerald Cut Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Pink Emerald Cut Necklace Set',
    'pink-emerald-cut-necklace-set',
    'Pretty in pink — the Pink Emerald Cut Necklace Set features a gorgeous rectangular pink stone pendant surrounded by a sparkling cubic zirconia double halo on a rose gold-plated chain. The matching pink drop earrings complete this romantic, feminine look. Perfect for birthday celebrations, Valentine''s Day, or adding a pop of colour to your everyday style. Comes in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, false, 'women',
    ARRAY['/images/products/necklaces/pink-emerald-cut-necklace-set.jpeg', '/images/products/necklaces/pink-emerald-cut-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/pink-emerald-cut-necklace-set.jpeg', '/images/products/necklaces/pink-emerald-cut-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/pink-emerald-cut-necklace-set.jpeg', 'Pink Emerald Cut Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/pink-emerald-cut-necklace-set-2.jpeg', 'Pink Emerald Cut Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 5. Clear Emerald Cut Crystal Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Clear Emerald Cut Crystal Necklace Set',
    'clear-emerald-cut-crystal-necklace-set',
    'Classic brilliance redefined — the Clear Emerald Cut Crystal Necklace Set features a pristine rectangular cubic zirconia pendant with a sparkling halo border, set in rose gold plating. Paired with matching emerald-cut drop earrings that shimmer from every angle. This versatile set transitions effortlessly from office to evening wear. Comes beautifully presented in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, false, 'women',
    ARRAY['/images/products/necklaces/clear-emerald-cut-crystal-necklace-set.jpeg', '/images/products/necklaces/clear-emerald-cut-crystal-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/clear-emerald-cut-crystal-necklace-set.jpeg', '/images/products/necklaces/clear-emerald-cut-crystal-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/clear-emerald-cut-crystal-necklace-set.jpeg', 'Clear Emerald Cut Crystal Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/clear-emerald-cut-crystal-necklace-set-2.jpeg', 'Clear Emerald Cut Crystal Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 6. Square Pave Halo Necklace Set - KSh 900
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Square Pave Halo Necklace Set',
    'square-pave-halo-necklace-set',
    'Regal and refined — the Square Pavé Halo Necklace Set features an octagonal pendant encrusted with multiple rows of micro-set cubic zirconia stones surrounding a brilliant center gem, all in warm rose gold plating. The matching pavé stud earrings echo the same intricate design. A luxurious choice for formal events or as a treasured gift. Comes in a Her Kingdom gift box.',
    900, 1100, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/necklaces/square-pave-halo-necklace-set.jpeg', '/images/products/necklaces/square-pave-halo-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/square-pave-halo-necklace-set.jpeg', '/images/products/necklaces/square-pave-halo-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/square-pave-halo-necklace-set.jpeg', 'Square Pave Halo Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/square-pave-halo-necklace-set-2.jpeg', 'Square Pave Halo Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 7. Diamond Shape Crystal Necklace Set - KSh 800
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Diamond Shape Crystal Necklace Set',
    'diamond-shape-crystal-necklace-set',
    'Chic and minimal — the Diamond Shape Crystal Necklace Set features a petite diamond-shaped cubic zirconia pendant on a delicate rose gold-plated chain, paired with matching square-cut huggie earrings. The clean geometric lines make this set perfect for everyday wear or layering with other necklaces. Understated elegance at its finest. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/diamond-shape-crystal-necklace-set.jpeg', '/images/products/necklaces/diamond-shape-crystal-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/diamond-shape-crystal-necklace-set.jpeg', '/images/products/necklaces/diamond-shape-crystal-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/diamond-shape-crystal-necklace-set.jpeg', 'Diamond Shape Crystal Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/diamond-shape-crystal-necklace-set-2.jpeg', 'Diamond Shape Crystal Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 8. Kite Pave Crystal Necklace Set - KSh 800
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Kite Pave Crystal Necklace Set',
    'kite-pave-crystal-necklace-set',
    'Sleek and modern — the Kite Pavé Crystal Necklace Set features an elongated kite-shaped pendant studded with sparkling cubic zirconia stones on a rose gold-plated chain. The matching kite-shaped stud earrings complete this geometric-inspired set. A fresh, contemporary design that adds a touch of sophistication to any look. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/kite-pave-crystal-necklace-set.jpeg', '/images/products/necklaces/kite-pave-crystal-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/kite-pave-crystal-necklace-set.jpeg', '/images/products/necklaces/kite-pave-crystal-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/kite-pave-crystal-necklace-set.jpeg', 'Kite Pave Crystal Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/kite-pave-crystal-necklace-set-2.jpeg', 'Kite Pave Crystal Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 9. Cherry Pendant Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Cherry Pendant Necklace Set',
    'cherry-pendant-necklace-set',
    'Sweet and playful — the Cherry Pendant Necklace Set features an adorable cherry design with two ruby-red stones and emerald-green leaf accents, all set in warm rose gold plating. The matching cherry earrings add a fun pop of colour. A delightful conversation starter that brings a touch of whimsy to your jewellery collection. Comes in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, false, 'women',
    ARRAY['/images/products/necklaces/cherry-pendant-necklace-set.jpeg', '/images/products/necklaces/cherry-pendant-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/cherry-pendant-necklace-set.jpeg', '/images/products/necklaces/cherry-pendant-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/cherry-pendant-necklace-set.jpeg', 'Cherry Pendant Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/cherry-pendant-necklace-set-2.jpeg', 'Cherry Pendant Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 10. Fan Shell Crystal Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Fan Shell Crystal Necklace Set',
    'fan-shell-crystal-necklace-set',
    'Artfully designed — the Fan Shell Crystal Necklace Set features a delicate shell-shaped openwork pendant with radiating gold lines and a brilliant cubic zirconia center stone, all in rose gold plating. The matching fan-shaped earrings mirror the intricate design. An elegant, artistic piece that bridges classic and contemporary style. Comes in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, false, 'women',
    ARRAY['/images/products/necklaces/fan-shell-crystal-necklace-set.jpeg', '/images/products/necklaces/fan-shell-crystal-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/fan-shell-crystal-necklace-set.jpeg', '/images/products/necklaces/fan-shell-crystal-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/fan-shell-crystal-necklace-set.jpeg', 'Fan Shell Crystal Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/fan-shell-crystal-necklace-set-2.jpeg', 'Fan Shell Crystal Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 11. Pear Leaf Crystal Necklace Set - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Pear Leaf Crystal Necklace Set',
    'pear-leaf-crystal-necklace-set',
    'Nature-inspired beauty — the Pear Leaf Crystal Necklace Set features a stunning pear-shaped pendant encrusted with micro-set cubic zirconia stones, adorned with a gold leaf detail and a purple amethyst accent. Set in rose gold plating with a matching pair of pear leaf earrings. A unique, eye-catching design that celebrates natural elegance. Comes in a Her Kingdom gift box.',
    850, 1050, cat_id, true, true, 19, true, false, 'women',
    ARRAY['/images/products/necklaces/pear-leaf-crystal-necklace-set.jpeg', '/images/products/necklaces/pear-leaf-crystal-necklace-set-2.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    category_id = cat_id,
    gallery_images = ARRAY['/images/products/necklaces/pear-leaf-crystal-necklace-set.jpeg', '/images/products/necklaces/pear-leaf-crystal-necklace-set-2.jpeg']
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES
      (prod_id, '/images/products/necklaces/pear-leaf-crystal-necklace-set.jpeg', 'Pear Leaf Crystal Necklace Set with matching earrings', 0, true),
      (prod_id, '/images/products/necklaces/pear-leaf-crystal-necklace-set-2.jpeg', 'Pear Leaf Crystal Necklace Set close-up view', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 11 necklace sets inserted under "Necklace Sets" category.';
END $$;

-- ============================================================
-- Her Kingdom - Men's Necklaces Seed Data
-- ============================================================
-- This script seeds 7 men's necklaces under the "Men's Necklaces" category
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
  tag_minimalist uuid;
  tag_statement uuid;
  tag_everyday uuid;
BEGIN
  -- Get the Men's Necklaces category ID
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'men-necklaces';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_minimalist FROM public.tags WHERE slug = 'minimalist';
  SELECT id INTO tag_statement FROM public.tags WHERE slug = 'statement';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Men''s Necklaces category not found! Make sure 001_herkingdom_schema.sql has been run first.';
  END IF;

  -- ============================================================
  -- MEN'S NECKLACES
  -- ============================================================

  -- 1. Marcus Necklace (Silver) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Marcus Necklace (Silver)',
    'marcus-necklace-silver',
    'Clean lines, bold presence — the Marcus Necklace in silver features a sleek vertical bar pendant on a sturdy box chain. The polished stainless steel finish gives it a modern, refined edge that pairs effortlessly with casual or smart outfits. A go-to everyday piece for the modern man. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, true, 'men',
    ARRAY['/images/products/men-necklaces/marcus-necklace-silver.jpeg']
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
      (prod_id, '/images/products/men-necklaces/marcus-necklace-silver.jpeg', 'Marcus Necklace Silver - vertical bar pendant on silver box chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Marcus Necklace (Black) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Marcus Necklace (Black)',
    'marcus-necklace-black',
    'Understated and versatile — the Marcus Necklace in black features the same iconic vertical bar pendant finished in sleek matte black, hanging from a matching black box chain. The dark-on-dark look adds an edgy, contemporary vibe perfect for layering or wearing solo. A must-have staple for any jewellery collection. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, true, 'men',
    ARRAY['/images/products/men-necklaces/marcus-necklace-black.jpeg']
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
      (prod_id, '/images/products/men-necklaces/marcus-necklace-black.jpeg', 'Marcus Necklace Black - vertical bar pendant on black box chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Alphonse Necklace (Silver) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Alphonse Necklace (Silver)',
    'alphonse-necklace-silver',
    'Refined and geometric — the Alphonse Necklace features an interlocking oval link pendant in polished silver-tone stainless steel, suspended from a classic box chain. The open chain-link design adds a modern architectural feel while keeping the look minimal. Perfect for elevating both casual and dressed-up outfits. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, true, 'men',
    ARRAY['/images/products/men-necklaces/alphonse-necklace-silver.jpeg']
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
      (prod_id, '/images/products/men-necklaces/alphonse-necklace-silver.jpeg', 'Alphonse Necklace Silver - interlocking oval link pendant on silver chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. Marques Necklace (Black) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Marques Necklace (Black)',
    'marques-necklace-black',
    'Bold and distinctive — the Marques Necklace features an elongated hexagonal bar pendant with a smooth black enamel inlay, set on a matching black box chain. The angular, shield-like shape gives it a strong, masculine character that stands out without trying too hard. Ideal for making a statement with minimal effort. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, false, 'men',
    ARRAY['/images/products/men-necklaces/marques-necklace-black.jpeg']
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
      (prod_id, '/images/products/men-necklaces/marques-necklace-black.jpeg', 'Marques Necklace Black - elongated hexagonal bar pendant on black chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 5. Jacque Necklace (Black) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Jacque Necklace (Black)',
    'jacque-necklace-black',
    'Simple yet striking — the Jacque Necklace features a compact square tag pendant with a glossy black enamel face, hanging from a sleek black box chain. The rounded-corner square shape gives it a refined, modern feel that works for everyday wear or as a subtle accent piece. Effortlessly cool and easy to style. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, false, 'men',
    ARRAY['/images/products/men-necklaces/jacque-necklace-black.jpeg']
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
      (prod_id, '/images/products/men-necklaces/jacque-necklace-black.jpeg', 'Jacque Necklace Black - square tag pendant on black chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 6. Burma Bullet Necklace (Gold) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Burma Bullet Necklace (Gold)',
    'burma-bullet-necklace-gold',
    'Edgy and eye-catching — the Burma Bullet Necklace features a polished gold-tone bullet pendant on a matching gold box chain. The detailed bullet shape adds a rugged, adventurous edge to any outfit while the warm gold finish keeps it looking sharp and premium. A conversation-starting piece for the bold and confident. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, true, 'men',
    ARRAY['/images/products/men-necklaces/burma-bullet-necklace-gold.jpeg']
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
      (prod_id, '/images/products/men-necklaces/burma-bullet-necklace-gold.jpeg', 'Burma Bullet Necklace Gold - gold bullet pendant on gold box chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 7. Hail Cross Necklace (Black) - KSh 2,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Hail Cross Necklace (Black)',
    'hail-cross-necklace-black',
    'A timeless symbol with a modern edge — the Hail Cross Necklace features a detailed crucifix pendant in a matte black finish, hanging from a sturdy black box chain. The elongated cross design with intricate detailing makes it a meaningful accessory that blends faith and fashion seamlessly. A powerful, understated piece for everyday wear. Comes in a Her Kingdom gift box.',
    2000, 2500, cat_id, true, true, 20, true, true, 'men',
    ARRAY['/images/products/men-necklaces/hail-cross-necklace-black.jpeg']
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
      (prod_id, '/images/products/men-necklaces/hail-cross-necklace-black.jpeg', 'Hail Cross Necklace Black - crucifix pendant on black box chain', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 7 men''s necklaces inserted under "Men''s Necklaces" category.';
END $$;

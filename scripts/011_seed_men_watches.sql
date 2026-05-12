-- ============================================================
-- Her Kingdom - Men's Watches Seed Data
-- ============================================================
-- This script seeds 4 men's watches under the "Men's Watches" category
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
  tag_luxury uuid;
  tag_everyday uuid;
BEGIN
  -- Ensure the Men's Watches category exists and has the correct image
  INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
  VALUES (
    'Men''s Watches',
    'men-watches',
    'Stylish men''s watches and timepieces for every occasion',
    '/categories/men-watches.jpeg',
    6,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;

  SELECT id INTO cat_id FROM public.categories WHERE slug = 'men-watches';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Men''s Watches category not found!';
  END IF;

  -- ============================================================
  -- MEN'S WATCHES
  -- ============================================================

  -- 1. CURREN Men's Watch - KSh 4,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'CURREN Men''s Watch',
    'curren-mens-watch',
    'Refined and minimalist — the CURREN Men''s Watch features a crisp white dial with rose gold hour markers and slim hands, set in a polished silver case. The fine silver mesh band adds subtle sophistication, while a small date window at 6 o''clock completes the look. Perfect for the modern gentleman who values clean design. Presented in a premium gift box.',
    4000, 4500, cat_id, true, true, 11, true, true, 'men',
    ARRAY['/images/products/men-watches/curren-mens-watch.jpeg']
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
      (prod_id, '/images/products/men-watches/curren-mens-watch.jpeg', 'CURREN Men''s Watch - silver mesh band with white dial and rose gold accents', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. RADO Men's Watch - KSh 4,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'RADO Men''s Watch',
    'rado-mens-watch',
    'Bold and distinguished — the RADO Men''s Watch pairs a jet black dial with rose gold indices and chronograph-style subdials for a commanding wrist presence. The black mesh band and slim case profile deliver understated luxury, while the Swiss-inspired detailing adds a touch of heritage elegance. A statement piece for boardrooms and evenings out. Presented in a premium gift box.',
    4000, 4500, cat_id, true, true, 11, true, true, 'men',
    ARRAY['/images/products/men-watches/rado-mens-watch.jpeg']
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
      (prod_id, '/images/products/men-watches/rado-mens-watch.jpeg', 'RADO Men''s Watch - black mesh band with black dial and rose gold accents', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. CASIO Men's Watch - KSh 3,500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'CASIO Men''s Watch',
    'casio-mens-watch',
    'Vintage-inspired and timeless — the CASIO Men''s Watch features a rounded square case in polished stainless steel with a deep black dial, crisp hour markers and a discreet date window. Powered by reliable quartz movement and paired with a classic stainless steel link bracelet, it''s the perfect everyday companion that pairs as easily with denim as with a suit. Presented in a premium gift box.',
    3500, 4000, cat_id, true, true, 13, true, true, 'men',
    ARRAY['/images/products/men-watches/casio-mens-watch.jpeg']
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
      (prod_id, '/images/products/men-watches/casio-mens-watch.jpeg', 'CASIO Men''s Watch - stainless steel square case with black quartz dial', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. SKMEI Classic Men's Watch - KSh 4,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'SKMEI Classic Men''s Watch',
    'skmei-classic-mens-watch',
    'Modern and versatile — the SKMEI Classic Men''s Watch features a sleek all-black case with a multi-function grey dial, blue accent hands and dual subdials for day and seconds display. The matte black mesh band keeps the silhouette clean and low-profile, while the minimalist markers give it an effortlessly contemporary edge. Built for the man who moves from meetings to weekends with ease. Presented in a premium gift box.',
    4000, 4500, cat_id, true, true, 11, true, true, 'men',
    ARRAY['/images/products/men-watches/skmei-classic-mens-watch.jpeg']
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
      (prod_id, '/images/products/men-watches/skmei-classic-mens-watch.jpeg', 'SKMEI Classic Men''s Watch - black mesh band with grey dial and blue hands', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 4 men''s watches inserted under "Men''s Watches" category.';
END $$;

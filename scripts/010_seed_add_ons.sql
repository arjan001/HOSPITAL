-- ============================================================
-- Her Kingdom - Add-Ons Seed Data
-- ============================================================
-- This script seeds 4 add-on products under the "Add-Ons" category
-- and sets the category image for Add-Ons.
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
  tag_everyday uuid;
  tag_statement uuid;
BEGIN
  -- Ensure the Add-Ons category exists and has the correct image
  INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
  VALUES (
    'Add-Ons',
    'add-ons',
    'Complementary items and accessories — chocolates, jute bags, wallets and thoughtful gift extras to pair with your order',
    '/categories/add-ons.jpeg',
    14,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;

  SELECT id INTO cat_id FROM public.categories WHERE slug = 'add-ons';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_statement FROM public.tags WHERE slug = 'statement';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Add-Ons category not found!';
  END IF;

  -- ============================================================
  -- ADD-ONS
  -- ============================================================

  -- 1. Rollana Chocolate - KSh 1,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Rollana Chocolate',
    'rollana-chocolate',
    'A delicious coconut almond confection — Rollana Chocolate features 9 individually wrapped pieces of creamy coconut-coated chocolate with a whole almond centre. A sweet, indulgent add-on that turns any order into a treat. Perfect for gifting or pairing with flowers and jewellery.',
    1000, NULL, cat_id, true, false, 0, true, true, 'add-ons',
    ARRAY['/images/products/add-ons/rollana-chocolate.jpeg']
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
      (prod_id, '/images/products/add-ons/rollana-chocolate.jpeg', 'Rollana Chocolate - 9 pieces coconut almond confections', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Jute Bag - KSh 1,200
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Jute Bag',
    'jute-bag',
    'A signature Her Kingdom jute and canvas tote — black canvas body with natural jute trim, sturdy woven handles and the Her Kingdom Jewelry logo printed on the front. Finished with a branded red satin ribbon and a "Happy Holidays" gift tag, it is the perfect presentation bag for gifting or a reusable everyday carryall.',
    1200, NULL, cat_id, true, false, 0, true, true, 'add-ons',
    ARRAY['/images/products/add-ons/jute-bag.jpeg']
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
      (prod_id, '/images/products/add-ons/jute-bag.jpeg', 'Her Kingdom Jute Bag - black canvas tote with jute trim, red ribbon and Happy Holidays tag', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Chocolate - KSh 500
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Chocolate',
    'chocolate',
    'A signature Her Kingdom "With Love" chocolate box — an elegant red gift box filled with heart-shaped chocolates and finished with a white "With Love" script and heart accent. A small, thoughtful add-on that makes every delivery feel extra special. Perfect for anniversaries, Valentine''s and everyday romance.',
    500, NULL, cat_id, true, false, 0, true, true, 'add-ons',
    ARRAY['/images/products/add-ons/chocolate-with-love.jpeg']
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
      (prod_id, '/images/products/add-ons/chocolate-with-love.jpeg', 'Her Kingdom With Love chocolate gift box - red box with heart-shaped chocolates', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. Pine Wallet - Pink - KSh 800
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Pine Wallet - Pink',
    'pine-wallet-pink',
    'Playful and practical — the Pine Wallet in pink features an all-over pineapple print on a soft pastel-pink faux leather body with a smooth gold zip closure. Compact enough to slip into any handbag yet roomy enough for cards, cash and coins. A cheerful add-on that brings a pop of fun to everyday essentials.',
    800, NULL, cat_id, true, false, 0, true, false, 'add-ons',
    ARRAY['/images/products/add-ons/pine-wallet-pink.jpeg']
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
      (prod_id, '/images/products/add-ons/pine-wallet-pink.jpeg', 'Pine Wallet Pink - pineapple print pink faux leather zip wallet', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 4 add-on products inserted under "Add-Ons" category with category image set.';
END $$;

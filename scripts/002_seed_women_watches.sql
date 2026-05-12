-- ============================================================
-- Her Kingdom - Women's Watches Seed Data
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

-- Ensure Women's Watches category exists and has the correct image
INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
VALUES ('Women''s Watches', 'women-watches', 'Elegant women''s watches for every occasion', '/categories/women-watches.jpeg', 5, true)
ON CONFLICT (slug) DO UPDATE SET image_url = '/categories/women-watches.jpeg';

-- Insert Women's Watches products and their images/tags
DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_everyday uuid;
  tag_luxury uuid;
  tag_gold_plated uuid;
BEGIN
  -- Get the Women's Watches category ID
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'women-watches';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_gold_plated FROM public.tags WHERE slug = 'gold-plated';

  IF cat_id IS NOT NULL THEN

    -- 1. Poedagar Rose Gold Watch - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Poedagar Rose Gold Watch',
      'poedagar-rose-gold-watch',
      'Elegant Poedagar rose gold watch with a white textured dial, day and date display. Comes in a premium gift box with international guarantee.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/women-watches/poedagar-rose-gold-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/poedagar-rose-gold-watch.jpeg', 'Poedagar Rose Gold Watch', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 2. Rose Gold Mini Chain Watch - KSh 850
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Rose Gold Mini Chain Watch',
      'rose-gold-mini-chain-watch',
      'Petite rose gold watch with a rose gold dial and Roman numeral markers. Delicate chain link bracelet band for a feminine look.',
      850, 1000, cat_id, true, true, 15, true, true, 'women',
      ARRAY['/images/products/women-watches/rose-gold-mini-chain-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/rose-gold-mini-chain-watch.jpeg', 'Rose Gold Mini Chain Watch', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 3. Naviforce Rose Gold Floral Watch - KSh 850
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Naviforce Rose Gold Floral Watch',
      'naviforce-rose-gold-floral-watch',
      'Beautiful Naviforce rose gold mesh band watch with 3D white floral dial design and crystal hour markers. A statement piece for any outfit.',
      850, 1000, cat_id, true, true, 15, true, false, 'women',
      ARRAY['/images/products/women-watches/naviforce-rose-gold-floral-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/naviforce-rose-gold-floral-watch.jpeg', 'Naviforce Rose Gold Floral Watch', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 4. Gold Flower Bracelet Watch - KSh 550
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Gold Flower Bracelet Watch',
      'gold-flower-bracelet-watch',
      'Delicate gold-tone watch with a matching flower chain bracelet band and gold dial. A charming vintage-inspired timepiece.',
      550, 700, cat_id, false, true, 21, true, false, 'women',
      ARRAY['/images/products/women-watches/gold-flower-bracelet-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/gold-flower-bracelet-watch.jpeg', 'Gold Flower Bracelet Watch', 0, true);
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 5. Gold Pearl Bracelet Watch - KSh 550
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Gold Pearl Bracelet Watch',
      'gold-pearl-bracelet-watch',
      'Elegant gold-tone watch with pearl-adorned bracelet band and white octagonal dial. A timeless accessory for special occasions.',
      550, 700, cat_id, false, true, 21, true, false, 'women',
      ARRAY['/images/products/women-watches/gold-pearl-bracelet-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/gold-pearl-bracelet-watch.jpeg', 'Gold Pearl Bracelet Watch', 0, true);
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

  END IF;
END $$;

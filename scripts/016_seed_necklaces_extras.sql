-- ============================================================
-- Her Kingdom - Necklaces Extras Seed Data
-- ============================================================
-- Seeds 20 additional individual necklaces into the "Necklaces"
-- category:
--   * 14 more initial letter pendants (I, K, L, N, O, Q, R, S,
--     U, V, W, X, Y, Z) — rounds out the personalised range
--   * 6 statement / fine-jewellery pieces (emerald green stone,
--     pearl drop, ruby crown halo, butterfly blossom drop, trio
--     butterfly lariat, rainbow crystal flower)
-- ============================================================
-- Run this SQL in Supabase SQL Editor after
-- 015_seed_necklaces.sql.
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
  letters text[] := ARRAY['I','K','L','N','O','Q','R','S','U','V','W','X','Y','Z'];
  letter text;
  letter_lower text;
BEGIN
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'necklaces';
  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Necklaces category not found. Run 015_seed_necklaces.sql first.';
  END IF;

  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending    FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea   FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_luxury      FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_everyday    FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_valentine   FROM public.tags WHERE slug = 'valentine';
  SELECT id INTO tag_birthday    FROM public.tags WHERE slug = 'birthday';
  SELECT id INTO tag_gold_plated FROM public.tags WHERE slug = 'gold-plated';
  SELECT id INTO tag_minimalist  FROM public.tags WHERE slug = 'minimalist';
  SELECT id INTO tag_statement   FROM public.tags WHERE slug = 'statement';

  -- ------------------------------------------------------------
  -- Initial Letter Pendant Necklaces (14 new letters)
  -- Same style, pricing, and tags as the existing B / D / F / G / H
  -- pendants seeded in 015_seed_necklaces.sql.
  -- ------------------------------------------------------------
  FOREACH letter IN ARRAY letters LOOP
    letter_lower := lower(letter);

    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Initial "' || letter || '" Pendant Necklace',
      'initial-' || letter_lower || '-pendant-necklace',
      'Personalised elegance — the Initial "' || letter || '" Pendant Necklace features a petite rose gold plated letter ' || letter || ' pendant set with micro cubic zirconia stones. A delicate, meaningful everyday necklace and the perfect thoughtful gift for the special someone whose name starts with ' || letter || '. Comes in a Her Kingdom gift box.',
      800, 1000, cat_id, true, true, 20, true, false, 'women',
      ARRAY['/images/products/necklaces/initial-' || letter_lower || '-pendant-necklace.jpeg']
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      original_price = EXCLUDED.original_price,
      category_id = cat_id,
      gallery_images = EXCLUDED.gallery_images
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/necklaces/initial-' || letter_lower || '-pendant-necklace.jpeg', 'Initial ' || letter || ' Pendant Necklace in rose gold', 0, true)
      ON CONFLICT DO NOTHING;
      IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
    END IF;
  END LOOP;

  -- ------------------------------------------------------------
  -- 1. Emerald Green Stone Pendant Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Emerald Green Stone Pendant Necklace',
    'emerald-green-stone-pendant-necklace',
    'Timeless jewel-tone glamour — the Emerald Green Stone Pendant Necklace features a vivid emerald-cut green crystal set in a four-prong gold claw mount on a fine gold-plated chain. A sophisticated colour-pop piece that dresses up evening looks or adds richness to an everyday outfit. Comes in a Her Kingdom gift box.',
    1300, 1600, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/emerald-green-stone-pendant-necklace.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = cat_id,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/necklaces/emerald-green-stone-pendant-necklace.jpeg', 'Emerald Green Stone Pendant Necklace in gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 2. Classic Pearl Drop Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Classic Pearl Drop Necklace',
    'classic-pearl-drop-necklace',
    'Quietly refined — the Classic Pearl Drop Necklace features a single lustrous freshwater-style pearl suspended from a delicate rose gold plated chain with a dainty hanging bail. An effortlessly timeless piece for brides, office-to-evening wear, or gifting across generations. Comes in a Her Kingdom gift box.',
    1100, 1400, cat_id, true, true, 21, true, true, 'women',
    ARRAY['/images/products/necklaces/classic-pearl-drop-necklace.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = cat_id,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/necklaces/classic-pearl-drop-necklace.jpeg', 'Classic Pearl Drop Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 3. Ruby Crown Halo Pendant Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Ruby Crown Halo Pendant Necklace',
    'ruby-crown-halo-pendant-necklace',
    'Regal and romantic — the Ruby Crown Halo Pendant Necklace features a vibrant round-cut ruby-red crystal encircled by a sparkling pavé halo and topped with a delicate crown motif. Set in warm gold plating on a fine chain — a true statement piece fit for a queen. Perfect for anniversaries and special occasions. Comes in a Her Kingdom gift box.',
    1600, 1950, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/necklaces/ruby-crown-halo-pendant-necklace.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = cat_id,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/necklaces/ruby-crown-halo-pendant-necklace.jpeg', 'Ruby Crown Halo Pendant Necklace in gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_luxury    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)    ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 4. Butterfly Blossom Crystal Drop Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Butterfly Blossom Crystal Drop Necklace',
    'butterfly-blossom-crystal-drop-necklace',
    'Whimsical and wearable — the Butterfly Blossom Crystal Drop Necklace features a cluster of a golden butterfly, mother-of-pearl heart petals, and pavé flowers finished with a teardrop crystal drop. Set in gold plating on a fine chain — a sweet, romantic piece that brings garden-party charm to any outfit. Comes in a Her Kingdom gift box.',
    1500, 1850, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/butterfly-blossom-crystal-drop-necklace.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = cat_id,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/necklaces/butterfly-blossom-crystal-drop-necklace.jpeg', 'Butterfly Blossom Crystal Drop Necklace in gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 5. Trio Butterfly Lariat Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Trio Butterfly Lariat Necklace',
    'trio-butterfly-lariat-necklace',
    'Playful movement — the Trio Butterfly Lariat Necklace features three polished gold butterflies; two perched on either side of the chain and a centre butterfly leading into a delicate Y-drop. A fun, feminine lariat-style piece that pairs beautifully with both tees and dresses. Gold plated finish. Comes in a Her Kingdom gift box.',
    1200, 1500, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/trio-butterfly-lariat-necklace.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = cat_id,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/necklaces/trio-butterfly-lariat-necklace.jpeg', 'Trio Butterfly Lariat Necklace in gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 6. Rainbow Crystal Flower Pendant Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Rainbow Crystal Flower Pendant Necklace',
    'rainbow-crystal-flower-pendant-necklace',
    'A burst of colour — the Rainbow Crystal Flower Pendant Necklace features five pear-cut crystals in amethyst, garnet, citrine, peridot, and morganite pink arranged as a five-petal flower topped with a pavé twist bail. Set in rose gold plating on a fine chain — a lively, joyful statement piece. Comes in a Her Kingdom gift box.',
    1400, 1700, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/necklaces/rainbow-crystal-flower-pendant-necklace.jpeg']
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    category_id = cat_id,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/necklaces/rainbow-crystal-flower-pendant-necklace.jpeg', 'Rainbow Crystal Flower Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: Seeded 20 additional necklaces (14 initials + 6 statement pieces) under "Necklaces".';
END $$;

-- ============================================================
-- Her Kingdom - Bracelets Seed Data
-- ============================================================
-- This script seeds 18 bracelets under the "Bracelets" category.
-- All products belong to the 'women' collection.
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
  tag_gold_plated uuid;
  tag_minimalist uuid;
  tag_statement uuid;
  tag_bridal uuid;
  tag_valentine uuid;
  tag_birthday uuid;
BEGIN
  -- Ensure the Bracelets category exists and has the correct image
  INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
  VALUES (
    'Bracelets',
    'bracelets',
    'Dainty chains, sparkling tennis bracelets and statement cuffs — gold-plated and hypoallergenic bracelets for every wrist',
    '/categories/bracelets.jpeg',
    8,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;

  SELECT id INTO cat_id FROM public.categories WHERE slug = 'bracelets';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_gold_plated FROM public.tags WHERE slug = 'gold-plated';
  SELECT id INTO tag_minimalist FROM public.tags WHERE slug = 'minimalist';
  SELECT id INTO tag_statement FROM public.tags WHERE slug = 'statement';
  SELECT id INTO tag_bridal FROM public.tags WHERE slug = 'bridal';
  SELECT id INTO tag_valentine FROM public.tags WHERE slug = 'valentine';
  SELECT id INTO tag_birthday FROM public.tags WHERE slug = 'birthday';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Bracelets category not found!';
  END IF;

  -- ============================================================
  -- BRACELETS
  -- ============================================================

  -- 1. Blossom CZ Solitaire Bracelet - KSh 1,100
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Blossom CZ Solitaire Bracelet',
    'blossom-cz-solitaire-bracelet',
    'A delicate five-petal flower of brilliant cubic zirconia sits between two solitaire stones on a slim adjustable gold chain. The Blossom bracelet is feminine, romantic and perfectly sized to layer or wear on its own. Slides smoothly to fit wrists from 15–19cm.',
    1100, 1350, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/blossom-cz-solitaire-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/blossom-cz-solitaire-bracelet.jpeg', 'Blossom CZ Solitaire Bracelet - gold five-petal CZ flower with side solitaires', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Luminara Round CZ Tennis Bracelet - KSh 1,350
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Luminara Round CZ Tennis Bracelet',
    'luminara-round-cz-tennis-bracelet',
    'A classic tennis silhouette reimagined — six bold round-cut cubic zirconia stones set in ribbed gold bezels catch light from every angle. The Luminara adds quiet sparkle to denim cuffs and evening silks alike. Adjustable slider closure for a comfortable, customised fit.',
    1350, 1650, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/luminara-round-cz-tennis-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/luminara-round-cz-tennis-bracelet.jpeg', 'Luminara Round CZ Tennis Bracelet - six large round cubic zirconia stones in gold', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Pearl Bloom Marquise Bracelet - KSh 1,250
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Pearl Bloom Marquise Bracelet',
    'pearl-bloom-marquise-bracelet',
    'Marquise crystal leaves sprout between dainty freshwater-style pearls, all anchored by a pavé-framed pearl medallion at the centre. A bridal-soft piece that feels delicate and dressy without being fussy — ideal for weddings, engagements and romantic dinners.',
    1250, 1500, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/bracelets/pearl-bloom-marquise-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/pearl-bloom-marquise-bracelet.jpeg', 'Pearl Bloom Marquise Bracelet - pearl medallion with marquise CZ leaves and pearl accents', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. Daisy Pearl Halo Bracelet - KSh 1,200
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Daisy Pearl Halo Bracelet',
    'daisy-pearl-halo-bracelet',
    'Five pearl daisies bloom in a row, each framed by a halo of tiny cubic zirconia stones. The Daisy Halo is a sweet, feminine classic that wears beautifully alone and layers effortlessly with a simple gold chain. Adjustable fit for all-day comfort.',
    1200, 1450, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/bracelets/daisy-pearl-halo-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/daisy-pearl-halo-bracelet.jpeg', 'Daisy Pearl Halo Bracelet - row of pearls framed by CZ halos in gold', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 5. Pavé Infinity Bracelet - KSh 950
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Pavé Infinity Bracelet',
    'pave-infinity-bracelet',
    'A timeless symbol, beautifully done — two loops of pavé cubic zirconia form an infinity motif at the centre of a fine gold chain. Meaningful enough to gift, subtle enough to wear every day. An easy go-to for birthdays, anniversaries and everyday sparkle.',
    950, 1150, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/bracelets/pave-infinity-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/pave-infinity-bracelet.jpeg', 'Pavé Infinity Bracelet - pavé CZ infinity symbol on gold chain', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 6. Princess Baguette Flower Bracelet - KSh 1,450
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Princess Baguette Flower Bracelet',
    'princess-baguette-flower-bracelet',
    'Princess-cut baguette crystals alternate with sculpted gold flower motifs for an heirloom-feel tennis silhouette. The Princess Baguette catches light like a vintage piece and pairs beautifully with watches and gold cuffs. Secure box closure with a safety link.',
    1450, 1750, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/bracelets/princess-baguette-flower-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/princess-baguette-flower-bracelet.jpeg', 'Princess Baguette Flower Bracelet - baguette CZ stones with gold flower motifs', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 7. Celestia Graduated CZ Bracelet - KSh 1,250
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Celestia Graduated CZ Bracelet',
    'celestia-graduated-cz-bracelet',
    'Three oversized round cubic zirconia stones sit in gold four-prong baskets, separated by tiny accent stones that graduate the size beautifully. The Celestia is a modern take on the classic three-stone piece — clean, confident and easy to style.',
    1250, 1500, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/bracelets/celestia-graduated-cz-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/celestia-graduated-cz-bracelet.jpeg', 'Celestia Graduated CZ Bracelet - three large round CZ stones in gold prong settings', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 8. Amora Heart & Baguette Bracelet - KSh 1,300
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Amora Heart & Baguette Bracelet',
    'amora-heart-baguette-bracelet',
    'Love letters in metal — pavé-set hearts alternate with crystal baguettes and tiny ribbon accents for a romantic tennis bracelet with character. The Amora is a sentimental favourite: sweet enough for everyday, special enough for Valentine''s.',
    1300, 1600, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/amora-heart-baguette-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/amora-heart-baguette-bracelet.jpeg', 'Amora Heart and Baguette Bracelet - alternating pavé hearts and baguette CZ stones in gold', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 9. Paperclip Oval CZ Link Bracelet - KSh 1,100
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Paperclip Oval CZ Link Bracelet',
    'paperclip-oval-cz-link-bracelet',
    'The modern workwear classic — elongated pavé paperclip links alternate with crystal-set ovals for a sleek, architectural silhouette. Polished enough for the office, cool enough for evenings. Stacks beautifully with watches and dainty chains.',
    1100, 1350, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/paperclip-oval-cz-link-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/paperclip-oval-cz-link-bracelet.jpeg', 'Paperclip Oval CZ Link Bracelet - pavé paperclip and CZ oval links in gold', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 10. Dainty Pavé Clover Bracelet - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Dainty Pavé Clover Bracelet',
    'dainty-pave-clover-bracelet',
    'Three tiny pavé clover charms trail along a fine beaded gold chain — a minimalist everyday favourite for layered-stack lovers. Light enough to forget you''re wearing and pretty enough that you won''t want to take it off.',
    850, 1050, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/bracelets/dainty-pave-clover-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/dainty-pave-clover-bracelet.jpeg', 'Dainty Pavé Clover Bracelet - three small pavé clover charms on fine gold chain', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 11. Sunshine & Evil Eye Charm Bracelet - KSh 800
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Sunshine & Evil Eye Charm Bracelet',
    'sunshine-evil-eye-charm-bracelet',
    'A fine rectangular-link chain holds two good-luck charms: a sparkling gold sunburst and a classic evil-eye in black. A modern amulet-feel piece for the spiritual and the stylish — wear alone or stack with your favourite cuffs and chains.',
    800, 1000, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/bracelets/sunshine-evil-eye-charm-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/sunshine-evil-eye-charm-bracelet.jpeg', 'Sunshine and Evil Eye Charm Bracelet - sun and evil-eye charms on fine gold chain', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 12. Hematite Shimmer Stack Bangle - KSh 1,350
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Hematite Shimmer Stack Bangle (Set of 7)',
    'hematite-shimmer-stack-bangle',
    'A seven-bangle set of slim, flexible cuffs studded with shimmering hematite-black rhinestones. Designed to coil around the wrist for a dramatic, stacked look in a single piece — or share across friends for a matching-set moment. Silver-tone finish.',
    1350, 1700, cat_id, true, true, 21, true, true, 'women',
    ARRAY['/images/products/bracelets/hematite-shimmer-stack-bangle.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/hematite-shimmer-stack-bangle.jpeg', 'Hematite Shimmer Stack Bangle - set of seven slim silver cuffs with black rhinestones', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 13. Ruby Tennis Coil Bracelet - KSh 1,200
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Ruby Tennis Coil Bracelet',
    'ruby-tennis-coil-bracelet',
    'Rich ruby-red rhinestones set in silver wrap three times around the wrist for a bold, continuous-sparkle silhouette. A one-piece stack that looks custom-layered but goes on in seconds. A striking pop of colour against black, white or denim.',
    1200, 1500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/bracelets/ruby-tennis-coil-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/ruby-tennis-coil-bracelet.jpeg', 'Ruby Tennis Coil Bracelet - three-wrap silver bracelet set with ruby-red stones', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 14. Golden Heart Halo Bracelet - KSh 1,400
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Golden Heart Halo Bracelet',
    'golden-heart-halo-bracelet',
    'Four bold gold hearts sit inside crystal-studded medallion halos, linked by a chunky gold chain. The Heart Halo has a designer-jewelry weight to it — luxurious, romantic and impossible to ignore. A go-to gift piece for anniversaries and milestone birthdays.',
    1400, 1700, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/golden-heart-halo-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/golden-heart-halo-bracelet.jpeg', 'Golden Heart Halo Bracelet - bold gold hearts in CZ medallion halos on gold chain', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 15. Celestial Circle Tennis Bracelet - KSh 1,300
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Celestial Circle Tennis Bracelet',
    'celestial-circle-tennis-bracelet',
    'Graduated open-circle links — a large pavé statement ring at the centre flanked by smaller halos — turn a classic tennis silhouette into a modern, architectural piece. Catches the light beautifully and wears dressed up or down.',
    1300, 1600, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/celestial-circle-tennis-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/celestial-circle-tennis-bracelet.jpeg', 'Celestial Circle Tennis Bracelet - graduated open CZ circle links in gold', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 16. Open Clover Link Bracelet - KSh 1,150
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Open Clover Link Bracelet',
    'open-clover-link-bracelet',
    'Open pavé clover motifs alternate with smaller solid clovers in a designer-feel link bracelet that reads as both playful and polished. The Open Clover is a modern heirloom piece — perfect for gifting or keeping as a little self-treat.',
    1150, 1400, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/open-clover-link-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/open-clover-link-bracelet.jpeg', 'Open Clover Link Bracelet - pavé open-clover links in gold', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 17. Papillon Butterfly Charm Bracelet - KSh 900
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Papillon Butterfly Charm Bracelet',
    'papillon-butterfly-charm-bracelet',
    'A filigree butterfly flutters from a crisp paperclip-link gold chain, joined by a tiny seashell charm for a soft summer feel. The Papillon is whimsical without being childish — a dainty, wearable reminder of warm-weather moments.',
    900, 1100, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/bracelets/papillon-butterfly-charm-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/papillon-butterfly-charm-bracelet.jpeg', 'Papillon Butterfly Charm Bracelet - filigree butterfly and shell charms on paperclip gold chain', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 18. Blossom Open Cuff Bracelet - KSh 1,000
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Blossom Open Cuff Bracelet',
    'blossom-open-cuff-bracelet',
    'An open-cuff silhouette frames a twin-flower motif of pavé blossoms inside a crystal-halo ring — a graceful, asymmetric design that catches the eye without overpowering. Slips on with a gentle squeeze and sits close to the wrist for comfortable all-day wear.',
    1000, 1250, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/bracelets/blossom-open-cuff-bracelet.jpeg', '/images/products/bracelets/bracelets-collection-display.jpeg']
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
      (prod_id, '/images/products/bracelets/blossom-open-cuff-bracelet.jpeg', 'Blossom Open Cuff Bracelet - twin pavé flower motif inside halo on open gold cuff', 0, true),
      (prod_id, '/images/products/bracelets/bracelets-collection-display.jpeg', 'Her Kingdom Bracelets Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 18 bracelets inserted under "Bracelets" category.';
END $$;

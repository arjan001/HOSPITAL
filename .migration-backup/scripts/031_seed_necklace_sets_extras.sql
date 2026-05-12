-- ============================================================
-- Her Kingdom - Additional Necklace Sets (Statement & Bridal Edition)
-- ============================================================
-- Adds ten new curated necklace sets to the existing
-- "Jewelry Sets" category (slug: necklace-sets). Mix of gold and
-- silver finishes, pearl and crystal clusters, plus two trio
-- sets that include a matching bracelet.
-- ============================================================
-- Run this in Supabase SQL Editor AFTER:
--   - 001_herkingdom_schema.sql  (creates schema & categories)
--   - 007_cleanup_and_move_to_necklace_sets.sql (seeds base sets)
--   - 017_rename_necklace_sets_to_jewelry_sets.sql (renames label)
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
  -- Resolve category
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'necklace-sets';

  IF cat_id IS NULL THEN
    RAISE EXCEPTION 'Necklace Sets category (slug=necklace-sets) not found. Run 001_herkingdom_schema.sql first.';
  END IF;

  -- Resolve tag IDs (optional; inserts are guarded by NULL checks)
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending      FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea     FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_luxury        FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_everyday      FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_valentine     FROM public.tags WHERE slug = 'valentine';
  SELECT id INTO tag_birthday      FROM public.tags WHERE slug = 'birthday';
  SELECT id INTO tag_gold_plated   FROM public.tags WHERE slug = 'gold-plated';
  SELECT id INTO tag_minimalist    FROM public.tags WHERE slug = 'minimalist';
  SELECT id INTO tag_statement     FROM public.tags WHERE slug = 'statement';
  SELECT id INTO tag_bridal        FROM public.tags WHERE slug = 'bridal';

  -- ============================================================
  -- 1. Amara Golden Laurel Statement Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Amara Golden Laurel Statement Set',
    'amara-golden-laurel-statement-set',
    'Inspired by sun-kissed laurel leaves at golden hour, the Amara Golden Laurel Statement Set drapes three cascading leaf-drop pendants across the collarbone, each dusted with micro pavé crystals. The sculpted gold-plated necklace flows seamlessly into a pair of long matching leaf drop earrings that sway with every turn of the head — a look made for garden weddings, engagement brunches and milestone birthdays. Arrives cushioned in a signature Her Kingdom gift box, ready to be gifted or worn straight from the packaging.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/amara-golden-laurel-statement-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/amara-golden-laurel-statement-set.jpeg', 'Amara Golden Laurel Statement Set with cascading leaf drop earrings', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 2. Amara Silver Laurel Statement Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Amara Silver Laurel Statement Set',
    'amara-silver-laurel-statement-set',
    'A moonlit twin to the golden edition, the Amara Silver Laurel Statement Set trails three shimmering pavé leaf drops from an intricately detailed silver-tone neckline. The rhodium-finish links catch light from every angle, making it a dream pairing for champagne-toned gowns, pearl-accented bridal looks and cool-weather evenings. Tucked into a Her Kingdom gift box with a velvet pouch, so it is ready to slip under a birthday ribbon or into a bridal party kit.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/amara-silver-laurel-statement-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/amara-silver-laurel-statement-set.jpeg', 'Amara Silver Laurel Statement Set in rhodium finish', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 3. Zephyra Gold Vine Statement Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Zephyra Gold Vine Statement Set',
    'zephyra-gold-vine-statement-set',
    'Soft as a whisper and strong as a vow, the Zephyra Gold Vine Statement Set winds a delicate crystal-scattered vine across the collarbone before resting on a luminous pear-cut teardrop pendant. The matching elongated drop earrings mirror the vine motif for a completely coordinated silhouette. Plated in warm champagne gold, this set was made for rooftop weddings, engagement shoots and that very first anniversary dinner where every detail matters.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/zephyra-gold-vine-statement-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/zephyra-gold-vine-statement-set.jpeg', 'Zephyra Gold Vine Statement Set with pear-cut teardrop pendant', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 4. Zephyra Silver Vine Statement Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Zephyra Silver Vine Statement Set',
    'zephyra-silver-vine-statement-set',
    'Icy and ethereal, the Zephyra Silver Vine Statement Set traces a hand-set crystal vine across the neckline and anchors it with a brilliant pear-cut teardrop. Matching drop earrings repeat the twisting vine pattern for that flawless head-to-toe sparkle. The silver-tone rhodium plating keeps its gleam through long nights of dancing, making it a forever favourite for brides, bridesmaids and the guest who always steals the compliments.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/zephyra-silver-vine-statement-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/zephyra-silver-vine-statement-set.jpeg', 'Zephyra Silver Vine Statement Set with crystal teardrop pendant', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 5. Nuria Cocoa Pearl Choker Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Nuria Cocoa Pearl Choker Set',
    'nuria-cocoa-pearl-choker-set',
    'Warm, rich and unapologetically romantic, the Nuria Cocoa Pearl Choker Set blends buttery ivory pearls with deep cocoa-toned pearls and twinkling crystal accents into a sculptural twisted-rope choker. The matching cluster stud earrings echo the same hand-woven detailing for an editorial finish. Plated in gold-tone metal that warms against the skin, it is a beautiful pick for cultural ceremonies, introduction events and date nights when you want to feel a little heirloom, a little now.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/nuria-cocoa-pearl-choker-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/nuria-cocoa-pearl-choker-set.jpeg', 'Nuria Cocoa Pearl Choker Set with ivory and chocolate pearls', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 6. Sereia Gold Pearl Cluster Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Sereia Gold Pearl Cluster Set',
    'sereia-gold-pearl-cluster-set',
    'A sea-foam daydream cast in gold — the Sereia Gold Pearl Cluster Set layers bold ivory pearls with dainty crystals across a gentle collar, creating a mermaid-meets-runway feel. The matching rectangle cluster studs pick up the same pearl and crystal language so the set feels intentional from every angle. Lightweight to wear for long events, it is the kind of piece that prompts "where is that from?" through an entire evening.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/sereia-gold-pearl-cluster-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/sereia-gold-pearl-cluster-set.jpeg', 'Sereia Gold Pearl Cluster Set with rectangle cluster earrings', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 7. Celine Gold Royal Pearl Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Celine Gold Royal Pearl Set',
    'celine-gold-royal-pearl-set',
    'Pure Celine energy — the Celine Gold Royal Pearl Set features a regal crown-inspired centerpiece crowned with a single drop pearl and flanked by scalloped pearl-and-crystal scrollwork. The long matching drop earrings echo the crown motif with a trail of pearls down to a final drop, giving the whole set an unmistakable royal silhouette. Plated in warm gold and perfect for brides, traditional weddings and milestone celebrations that deserve an entrance.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/celine-gold-royal-pearl-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/celine-gold-royal-pearl-set.jpeg', 'Celine Gold Royal Pearl Set with crown centerpiece and drop earrings', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 8. Celine Silver Royal Pearl Set - KSh 2,000
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Celine Silver Royal Pearl Set',
    'celine-silver-royal-pearl-set',
    'The cooler sister of the royal family — the Celine Silver Royal Pearl Set frames a crown-shaped pearl centerpiece within delicate silver scroll detailing, then trails long matching drop earrings that finish with a single luminous pearl. The polished rhodium finish reads fresh against ivory, blush and icy-blue palettes, making this a designated favourite for bridesmaid lineups, maid-of-honour moments and wedding-day portraits.',
    2000, 2500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklace-sets/celine-silver-royal-pearl-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/celine-silver-royal-pearl-set.jpeg', 'Celine Silver Royal Pearl Set with crown centerpiece and long drop earrings', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 9. Liana Gold Pearl Trio Set (necklace + bracelet + earrings) - KSh 2,500
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Liana Gold Pearl Trio Set',
    'liana-gold-pearl-trio-set',
    'Three pieces, one unforgettable silhouette — the Liana Gold Pearl Trio Set bundles a vintage-inspired pearl and crystal choker, a matching floral-link bracelet and a pair of pearl-drop earrings into a single curated bridal moment. The warm gold plating is hand-set with ivory pearls and sparkling crystal leaves, so every element talks to the next. Designed for brides who want a head-to-wrist glow-up on the big day, introduction ceremonies or photoshoots where every detail has to be on.',
    2500, 3200, cat_id, true, true, 22, true, true, 'women',
    ARRAY['/images/products/necklace-sets/liana-gold-pearl-trio-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/liana-gold-pearl-trio-set.jpeg', 'Liana Gold Pearl Trio Set with necklace, bracelet and earrings', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ============================================================
  -- 10. Liana Silver Pearl Trio Set (necklace + bracelet + earrings) - KSh 2,500
  -- ============================================================
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Liana Silver Pearl Trio Set',
    'liana-silver-pearl-trio-set',
    'A three-piece love letter in silver — the Liana Silver Pearl Trio Set pairs a generously pearled floral-link choker with a matching bracelet and sculpted pearl drop earrings, all finished in bright rhodium plating. Crystal leaf accents weave between the pearls for texture and light-catching sparkle. This is the trio for brides who want that polished, head-to-wrist coordination, for sisters entering in step and for the maid of honour who still needs to stand out in a crowd of white.',
    2500, 3200, cat_id, true, true, 22, true, true, 'women',
    ARRAY['/images/products/necklace-sets/liana-silver-pearl-trio-set.jpeg']
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
    VALUES (prod_id, '/images/products/necklace-sets/liana-silver-pearl-trio-set.jpeg', 'Liana Silver Pearl Trio Set with necklace, bracelet and earrings', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal)      ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Successfully seeded 10 additional necklace sets into the Jewelry Sets category.';
END $$;

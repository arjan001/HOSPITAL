-- ============================================================
-- Her Kingdom - Necklaces Extras Seed Data (Batch 1 of 2)
-- ============================================================
-- Seeds 9 additional individual necklaces into the "Necklaces"
-- category. These are statement, butterfly, tennis, engravable
-- and pendant pieces photographed for the Her Kingdom catalogue.
-- A follow-up batch will add the remaining ~13 items in a later
-- seed file once their product images are uploaded.
-- ============================================================
-- Run this SQL in Supabase SQL Editor after
-- 016_seed_necklaces_extras.sql.
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
  -- 1. Five Stone Graduated Halo Crystal Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Five Stone Graduated Halo Crystal Necklace',
    'five-stone-graduated-halo-necklace',
    'Everyday sparkle with a red-carpet feel — the Five Stone Graduated Halo Crystal Necklace features five brilliant round-cut cubic zirconia stones, each encircled by a pavé halo and set in a graduated bar that sits gracefully at the collarbone. Finished in silver-tone plating on a fine rolo chain. A refined, timeless piece that dresses up tees and evening wear alike. Comes in a Her Kingdom gift box.',
    1200, 1500, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklaces/five-stone-graduated-halo-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/five-stone-graduated-halo-necklace.jpeg', 'Five Stone Graduated Halo Crystal Necklace in silver', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 2. Triple Butterfly Y-Drop Lariat Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Triple Butterfly Y-Drop Lariat Necklace',
    'triple-butterfly-y-drop-necklace',
    'Soft and feminine — the Triple Butterfly Y-Drop Lariat Necklace features three frosted rose gold butterflies cascading down a slim snake chain, finished with two crystal bezel drops that sway with movement. A pretty, romantic lariat-style piece that looks beautiful against both necklines and open shirts. Rose gold plated. Comes in a Her Kingdom gift box.',
    1300, 1600, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/triple-butterfly-y-drop-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/triple-butterfly-y-drop-necklace.jpeg', 'Triple Butterfly Y-Drop Lariat Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 3. Gold Butterfly Snake Chain Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Gold Butterfly Snake Chain Necklace',
    'gold-butterfly-snake-chain-necklace',
    'Effortlessly chic — the Gold Butterfly Snake Chain Necklace features a polished herringbone-style snake chain with a single matte gold butterfly and two delicate ball-drop tassels at the centre. A modern, minimalist piece that reads "quiet luxury" with every outfit, from office wear to date-night dresses. Gold plated. Comes in a Her Kingdom gift box.',
    1250, 1550, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/gold-butterfly-snake-chain-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/gold-butterfly-snake-chain-necklace.jpeg', 'Gold Butterfly Snake Chain Necklace with ball tassels', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 4. Double Butterfly Rose Gold Drop Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Double Butterfly Rose Gold Drop Necklace',
    'double-butterfly-rose-gold-drop-necklace',
    'Delicate and romantic — the Double Butterfly Rose Gold Drop Necklace features two frosted butterflies; a smaller one perched above a larger drop butterfly, linked along a fine rose gold chain. A softly sparkling piece inspired by garden-party elegance. Rose gold plated. Comes in a Her Kingdom gift box.',
    1100, 1400, cat_id, true, true, 21, true, false, 'women',
    ARRAY['/images/products/necklaces/double-butterfly-rose-gold-drop-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/double-butterfly-rose-gold-drop-necklace.jpeg', 'Double Butterfly Rose Gold Drop Necklace', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 5. Infinity Heart Silver Pendant Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Infinity Heart Silver Pendant Necklace',
    'infinity-heart-silver-pendant-necklace',
    'Love, without end — the Infinity Heart Silver Pendant Necklace features an intertwined heart and infinity symbol set with sparkling pavé cubic zirconia stones on a fine silver-tone chain. Presented in a luxe red velvet gift box, this piece is a thoughtful gift for anniversaries, birthdays and Valentine''s Day. Rhodium plated. Comes ready-to-gift.',
    1500, 1900, cat_id, true, true, 21, true, true, 'women',
    ARRAY['/images/products/necklaces/infinity-heart-silver-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/infinity-heart-silver-pendant-necklace.jpeg', 'Infinity Heart Silver Pendant Necklace in red velvet gift box', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_valentine   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine)   ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 6. Gold Disc Layered Statement Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Gold Disc Layered Statement Necklace',
    'gold-disc-layered-statement-necklace',
    'Bold, modern, unforgettable — the Gold Disc Layered Statement Necklace features six asymmetrically arranged hammered gold discs cascading down a fine gold wire, creating an architectural centrepiece against bare necklines and strapless looks. An instant showstopper for weddings, parties and photoshoots. Gold plated. Comes in a Her Kingdom gift box.',
    1800, 2300, cat_id, true, true, 22, true, true, 'women',
    ARRAY['/images/products/necklaces/gold-disc-layered-statement-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/gold-disc-layered-statement-necklace.jpeg', 'Gold Disc Layered Statement Necklace', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 7. Engravable Gold Heart Pendant Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Engravable Gold Heart Pendant Necklace',
    'engravable-gold-heart-pendant-necklace',
    'Make it yours — the Engravable Gold Heart Pendant Necklace features a polished, rounded heart charm in gold-plated stainless steel, ready to be custom-engraved with a name, date, initials or short message. A meaningful, everlasting gift for anniversaries, birthdays, graduations and Mother''s Day. Tarnish-resistant and suitable for everyday wear. Add your engraving at checkout. Comes in a Her Kingdom gift box.',
    1400, 1750, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklaces/engravable-gold-heart-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/engravable-gold-heart-pendant-necklace.jpeg', 'Engravable Gold Heart Pendant Necklace', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine)   ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday)    ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 8. Classic Crystal Tennis Chain Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Classic Crystal Tennis Chain Necklace',
    'crystal-tennis-chain-necklace',
    'The piece that completes every look — the Classic Crystal Tennis Chain Necklace features a continuous line of four-prong-set round cubic zirconia stones in a rhodium-plated setting. Sits neatly at the collarbone to add instant polish to plunging necklines, formal dresses, and everyday tees. A wardrobe staple no jewellery box should be without. Comes in a Her Kingdom gift box.',
    2200, 2800, cat_id, true, true, 21, true, true, 'women',
    ARRAY['/images/products/necklaces/crystal-tennis-chain-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/crystal-tennis-chain-necklace.jpeg', 'Classic Crystal Tennis Chain Necklace in silver', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- ------------------------------------------------------------
  -- 9. Engravable Vertical Bar Pendant Necklace
  -- ------------------------------------------------------------
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Engravable Vertical Bar Pendant Necklace',
    'engravable-bar-pendant-necklace',
    'Personalised and unisex — the Engravable Vertical Bar Pendant Necklace features a sleek stainless steel bar pendant on a heavy box chain, available in three finishes: matte black, polished silver and bright gold. Engrave a name, initials, a couple''s date or a short message on the front. A thoughtful keepsake for him or her — Father''s Day, anniversaries, graduations, and couples'' jewellery. Add your engraving and colour choice at checkout.',
    1600, 2000, cat_id, true, true, 20, true, true, 'unisex',
    ARRAY['/images/products/necklaces/engravable-bar-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/engravable-bar-pendant-necklace.jpeg', 'Engravable Vertical Bar Pendant Necklace in black, silver and gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: Seeded 9 additional necklaces (batch 1 of 2) under "Necklaces".';
END $$;

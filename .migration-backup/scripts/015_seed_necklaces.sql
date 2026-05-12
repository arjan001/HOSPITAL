-- ============================================================
-- Her Kingdom - Necklaces Seed Data (Single Necklaces)
-- ============================================================
-- Seeds the "Necklaces" category with individual necklaces
-- (pendants, chains, statement pieces, letter initials, etc.)
-- distinct from the "Necklace Sets" category which contains
-- matching necklace + earring sets.
-- ============================================================
-- Run this SQL in Supabase SQL Editor after 001_herkingdom_schema.sql
-- ============================================================

-- Ensure Necklaces category exists with an accurate description
INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
VALUES (
  'Necklaces',
  'necklaces',
  'Delicate pendants, statement chains, initial letter necklaces and crystal charms — single-piece necklaces for every style and occasion.',
  '/images/products/necklaces/necklaces-category.png',
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true;

-- ============================================================
-- Insert Necklaces products, images and tags
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
    RAISE EXCEPTION 'Necklaces category not found.';
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

  -- 1. Leaf Vine Crystal Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Leaf Vine Crystal Necklace',
    'leaf-vine-crystal-necklace',
    'Delicate and feminine — the Leaf Vine Crystal Necklace features a graceful leaf-shaped pendant adorned with pear-cut cubic zirconia stones and a curved gold branch detail. Set in rose gold plating on a fine chain, this nature-inspired piece adds refined sparkle to any everyday look. Comes in a Her Kingdom gift box.',
    1000, 1250, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklaces/leaf-vine-crystal-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/leaf-vine-crystal-necklace.jpeg', 'Leaf Vine Crystal Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Zipper Crystal Pendant Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Zipper Crystal Pendant Necklace',
    'zipper-crystal-pendant-necklace',
    'Modern and edgy — the Zipper Crystal Pendant Necklace features a cleverly designed gold zipper-pull pendant lined with sparkling cubic zirconia stones along the teeth. A fun, contemporary piece that brings playful sophistication to casual and dressy looks alike. Set in rose gold plating. Comes in a Her Kingdom gift box.',
    950, 1200, cat_id, true, true, 21, true, false, 'women',
    ARRAY['/images/products/necklaces/zipper-crystal-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/zipper-crystal-pendant-necklace.jpeg', 'Zipper Crystal Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Infinity Bow Crystal Drop Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Infinity Bow Crystal Drop Necklace',
    'infinity-bow-crystal-drop-necklace',
    'Endless love — the Infinity Bow Crystal Drop Necklace features two pavé-outlined loops forming a delicate bow, accented with a sparkling round cubic zirconia drop. Set in warm gold plating for a romantic, timeless look. A thoughtful gift for anniversaries, birthdays, or Valentine''s Day. Comes in a Her Kingdom gift box.',
    1000, 1250, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/necklaces/infinity-bow-crystal-drop-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/infinity-bow-crystal-drop-necklace.jpeg', 'Infinity Bow Crystal Drop Necklace in gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. Moon Crystal Halo Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Moon Crystal Halo Necklace',
    'moon-crystal-halo-necklace',
    'Celestial charm — the Moon Crystal Halo Necklace features a crescent moon cradling a brilliant round cubic zirconia center stone framed by a delicate pavé halo border. Set in rose gold plating on a dainty chain for a dreamy, romantic finish. A perfect layering piece. Comes in a Her Kingdom gift box.',
    1000, 1250, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/moon-crystal-halo-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/moon-crystal-halo-necklace.jpeg', 'Moon Crystal Halo Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 5. Infinity Heart Duo Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Infinity Heart Duo Necklace',
    'infinity-heart-duo-necklace',
    'Love in every detail — the Infinity Heart Duo Necklace features two hearts intertwined in an infinity loop: one pavé-outlined, the other a solid brilliant-cut crystal. Set in rose gold plating on a fine chain. A subtle yet meaningful piece perfect for gifting or everyday romance. Comes in a Her Kingdom gift box.',
    950, 1200, cat_id, true, true, 21, true, true, 'women',
    ARRAY['/images/products/necklaces/infinity-heart-duo-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/infinity-heart-duo-necklace.jpeg', 'Infinity Heart Duo Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)  ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 6. Cherry Blossom Flower Drop Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Cherry Blossom Flower Drop Necklace',
    'cherry-blossom-flower-drop-necklace',
    'In full bloom — the Cherry Blossom Flower Drop Necklace features a stunning five-petal crystal flower pendant accented with an asymmetrical chain drop ending in a delicate rose gold bead. Set in rose gold plating for a graceful, feminine statement. Perfect for spring occasions and special gatherings. Comes in a Her Kingdom gift box.',
    1100, 1350, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/cherry-blossom-flower-drop-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/cherry-blossom-flower-drop-necklace.jpeg', 'Cherry Blossom Flower Drop Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury)      ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 7. Crystal Bar Pendant Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Crystal Bar Pendant Necklace',
    'crystal-bar-pendant-necklace',
    'Sleek and sparkling — the Crystal Bar Pendant Necklace features a horizontal curved bar of alternating pear-cut cubic zirconia stones that sits perfectly at the collarbone. Set on a rose gold plated chain, it is a modern classic that pairs with everything from a simple tee to a dinner dress. Comes in a Her Kingdom gift box.',
    1050, 1300, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/crystal-bar-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/crystal-bar-pendant-necklace.jpeg', 'Crystal Bar Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 8. V-Cluster Crystal Drop Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'V-Cluster Crystal Drop Necklace',
    'v-cluster-crystal-drop-necklace',
    'Subtle brilliance — the V-Cluster Crystal Drop Necklace features a graceful V-shaped cluster of pavé-set cubic zirconia stones accented with a small halo drop at the center. Set in rose gold plating on a fine chain. A perfect everyday layering piece that adds understated sparkle. Comes in a Her Kingdom gift box.',
    1000, 1250, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/v-cluster-crystal-drop-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/v-cluster-crystal-drop-necklace.jpeg', 'V-Cluster Crystal Drop Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 9. Happy Letter Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Happy Letter Necklace',
    'happy-letter-necklace',
    'Wear your mood — the Happy Letter Necklace features the word "HAPPY" spelled out in delicate pavé cubic zirconia letters. Set on a rose gold plated beaded station chain, this cheerful piece is a joyful daily reminder to smile. Fun, quirky, and full of good vibes. Comes in a Her Kingdom gift box.',
    950, 1200, cat_id, true, true, 21, true, false, 'women',
    ARRAY['/images/products/necklaces/happy-letter-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/happy-letter-necklace.jpeg', 'Happy Letter Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_trending  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    IF tag_birthday  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday)  ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 10. Mama Script Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Mama Script Necklace',
    'mama-script-necklace',
    'For the special mama — the Mama Script Necklace features the word "Mama" written in beautiful cursive script, set with tiny sparkling cubic zirconia stones. A meaningful, heart-warming everyday piece or unforgettable gift for mums on Mother''s Day, birthdays, or just because. Set in rose gold plating. Comes in a Her Kingdom gift box.',
    1100, 1350, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/necklaces/mama-script-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/mama-script-necklace.jpeg', 'Mama Script Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 11. Marble Link Chunky Chain Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Marble Link Chunky Chain Necklace',
    'marble-link-chunky-chain-necklace',
    'Bold statement style — the Marble Link Chunky Chain Necklace pairs a gold curb chain with vibrant multi-colour marble resin links in red, navy, and cream. A striking, trend-forward piece that pairs beautifully with both casual and dressed-up looks. Guaranteed conversation starter. Comes in a Her Kingdom gift box.',
    1500, 1800, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/necklaces/marble-link-chunky-chain-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/marble-link-chunky-chain-necklace.jpeg', 'Marble Link Chunky Chain Necklace', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)  ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 12. Amber Stone Statement Necklace
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Amber Stone Statement Necklace',
    'amber-stone-statement-necklace',
    'Earthy elegance — the Amber Stone Statement Necklace features chunky polished amber-toned resin stones in an organic nugget cut, strung on an adjustable silver-tone chain with a small accent bead. A warm, bohemian-inspired piece that adds a rich pop of colour to any outfit. Comes in a Her Kingdom gift box.',
    1400, 1700, cat_id, true, true, 18, true, false, 'women',
    ARRAY['/images/products/necklaces/amber-stone-statement-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/amber-stone-statement-necklace.jpeg', 'Amber Stone Statement Necklace', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending)  ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 13-17. Initial Letter Pendant Necklaces (B, D, F, G, H)
  -- 13. Initial B
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Initial "B" Pendant Necklace',
    'initial-b-pendant-necklace',
    'Personalised elegance — the Initial "B" Pendant Necklace features a petite rose gold plated letter B pendant set with micro cubic zirconia stones. A delicate, meaningful everyday necklace and the perfect thoughtful gift for the special someone whose name starts with B. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/initial-b-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/initial-b-pendant-necklace.jpeg', 'Initial B Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 14. Initial D
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Initial "D" Pendant Necklace',
    'initial-d-pendant-necklace',
    'Personalised elegance — the Initial "D" Pendant Necklace features a petite rose gold plated letter D pendant set with micro cubic zirconia stones. A delicate, meaningful everyday necklace and the perfect thoughtful gift for the special someone whose name starts with D. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/initial-d-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/initial-d-pendant-necklace.jpeg', 'Initial D Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 15. Initial F
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Initial "F" Pendant Necklace',
    'initial-f-pendant-necklace',
    'Personalised elegance — the Initial "F" Pendant Necklace features a petite rose gold plated letter F pendant set with micro cubic zirconia stones. A delicate, meaningful everyday necklace and the perfect thoughtful gift for the special someone whose name starts with F. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/initial-f-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/initial-f-pendant-necklace.jpeg', 'Initial F Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 16. Initial G
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Initial "G" Pendant Necklace',
    'initial-g-pendant-necklace',
    'Personalised elegance — the Initial "G" Pendant Necklace features a petite rose gold plated letter G pendant set with micro cubic zirconia stones. A delicate, meaningful everyday necklace and the perfect thoughtful gift for the special someone whose name starts with G. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/initial-g-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/initial-g-pendant-necklace.jpeg', 'Initial G Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 17. Initial H
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Initial "H" Pendant Necklace',
    'initial-h-pendant-necklace',
    'Personalised elegance — the Initial "H" Pendant Necklace features a petite rose gold plated letter H pendant set with micro cubic zirconia stones. A delicate, meaningful everyday necklace and the perfect thoughtful gift for the special someone whose name starts with H. Comes in a Her Kingdom gift box.',
    800, 1000, cat_id, true, true, 20, true, false, 'women',
    ARRAY['/images/products/necklaces/initial-h-pendant-necklace.jpeg']
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
    VALUES (prod_id, '/images/products/necklaces/initial-h-pendant-necklace.jpeg', 'Initial H Pendant Necklace in rose gold', 0, true)
    ON CONFLICT DO NOTHING;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist)  ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday)    ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: Seeded 17 necklaces under the "Necklaces" category.';
END $$;

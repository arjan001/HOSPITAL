-- ============================================================
-- Her Kingdom - Earrings Seed Data
-- ============================================================
-- This script seeds 19 earrings under the "Earrings" category.
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
  -- Ensure the Earrings category exists and has the correct image
  INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
  VALUES (
    'Earrings',
    'earrings',
    'Curated gold-plated studs, hoops and statement drops — hypoallergenic earrings for every mood',
    '/categories/earrings.jpeg',
    7,
    true
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    is_active = EXCLUDED.is_active;

  SELECT id INTO cat_id FROM public.categories WHERE slug = 'earrings';

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
    RAISE EXCEPTION 'Earrings category not found!';
  END IF;

  -- ============================================================
  -- EARRINGS
  -- ============================================================

  -- 1. Cheetah Print Stud Earrings - KSh 650
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Cheetah Print Stud Earrings',
    'cheetah-print-stud-earrings',
    'Walk on the wild side — round gold-rimmed studs featuring a warm cheetah-print inlay for an effortlessly bold finish. Lightweight, hypoallergenic and perfectly sized for everyday wear, whether paired with denim or a little black dress. Presented in a Her Kingdom jewelry card.',
    650, 800, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/earrings/cheetah-print-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/cheetah-print-studs.jpeg', 'Cheetah Print Stud Earrings - round gold-rimmed studs with cheetah print inlay', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 2. Ribbed Gold Heart Stud Earrings - KSh 750
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Ribbed Gold Heart Stud Earrings',
    'ribbed-gold-heart-stud-earrings',
    'Wear your heart on your ear — oversized gold-plated heart studs with a sculpted ribbed texture that catches the light beautifully. A romantic, feminine statement that pairs as easily with a casual tee as with an evening look. Hypoallergenic and lightweight for all-day comfort.',
    750, 900, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/ribbed-heart-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/ribbed-heart-studs.jpeg', 'Ribbed Gold Heart Stud Earrings - large sculpted heart studs in gold', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 3. Fiola Teal Swirl Earrings - KSh 850
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Fiola Teal Swirl Earrings',
    'fiola-teal-swirl-earrings',
    'A painterly swirl of teal, grey and gold curls together into a soft, organic stud — the Fiola Teal is equal parts sculpture and jewelry. The marbled enamel finish catches light from every angle and adds an artful touch to monochrome outfits. Hypoallergenic posts for sensitive ears.',
    850, 1000, cat_id, true, true, 15, true, true, 'women',
    ARRAY['/images/products/earrings/fiola-teal-earrings.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/fiola-teal-earrings.jpeg', 'Fiola Teal Swirl Earrings - abstract teal and gold enamel studs', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 4. Amara Gemstone Drop Earrings - KSh 1,200
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Amara Gemstone Drop Earrings',
    'amara-gemstone-drop-earrings',
    'Bold and vintage-inspired — a textured gold stud drops into a second medallion set with emerald, amber and peach cabochons for a rich, heirloom feel. The Amara Drop adds just enough color and drama to elevate a simple dress to event-ready. Lightweight and presented on a Her Kingdom jewelry card.',
    1200, 1450, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/amara-gemstone-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/amara-gemstone-drops.jpeg', 'Amara Gemstone Drop Earrings - gold medallion with emerald, amber and peach stones', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 5. Oval Shell Double Drop Earrings - KSh 1,100
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Oval Shell Double Drop Earrings',
    'oval-shell-double-drop-earrings',
    'Inspired by sun-warmed seashells — a smaller oval stud gives way to a larger sculpted oval drop etched with fine linear ridges. The matte-polished gold contrast gives these earrings a sophisticated, statement-ready silhouette without feeling heavy. Perfect for holidays, weddings and dressed-up evenings.',
    1100, 1350, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/oval-shell-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/oval-shell-drops.jpeg', 'Oval Shell Double Drop Earrings - ridged gold oval statement drops', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 6. Tulip Pearl Drop Earrings - KSh 950
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Tulip Pearl Drop Earrings',
    'tulip-pearl-drop-earrings',
    'Delicate and romantic — a gold tulip bud stud is accented with a tiny pavé leaf and finished with a luminous mother-of-pearl drop. The Tulip Pearl strikes that perfect balance between bridal softness and everyday elegance. A favourite for brides, bridesmaids and anyone who loves a feminine classic.',
    950, 1150, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/tulip-pearl-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/tulip-pearl-drops.jpeg', 'Tulip Pearl Drop Earrings - gold tulip studs with mother-of-pearl drops', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 7. Sunburst Statement Earrings - KSh 1,250
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Sunburst Statement Earrings',
    'sunburst-statement-earrings',
    'Radiate confidence — oversized gold sunburst studs with polished rays fanning out from a sculpted centre. A modern take on retro glamour, these earrings make even the simplest outfit feel event-ready. Surprisingly lightweight for their size and finished with hypoallergenic posts.',
    1250, 1500, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/sunburst-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/sunburst-studs.jpeg', 'Sunburst Statement Earrings - oversized gold sunburst studs', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 8. Petite Gold Bow Stud Earrings - KSh 600
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Petite Gold Bow Stud Earrings',
    'petite-gold-bow-stud-earrings',
    'Sweet and coquette — dainty gold bow studs with softly curved ribbons, small enough for stacked lobes but detailed enough to stand on their own. Perfect for Her Kingdom babes who love a feminine, playful finishing touch on any look.',
    600, 750, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/earrings/petite-bow-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/petite-bow-studs.jpeg', 'Petite Gold Bow Stud Earrings - small gold ribbon bow studs', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 9. Molten Gold Drop Earrings - KSh 1,100
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Molten Gold Drop Earrings',
    'molten-gold-drop-earrings',
    'Liquid-smooth, sculpture-inspired — the Molten Gold Drops feature an abstract hammered form that looks like poured, cooling gold. The irregular silhouette catches light differently with every turn of the head, giving them a genuinely one-of-a-kind feel. A modern staple for the minimalist who likes her pieces with edge.',
    1100, 1300, cat_id, true, true, 15, true, true, 'women',
    ARRAY['/images/products/earrings/molten-gold-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/molten-gold-drops.jpeg', 'Molten Gold Drop Earrings - abstract hammered gold sculptural drops', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 10. Luna Crystal Stud Earrings - KSh 950
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Luna Crystal Stud Earrings',
    'luna-crystal-stud-earrings',
    'Polished, oval hammered-gold studs are set off-centre with a glittering marquise-cut cubic zirconia — like a single star on a moon-shaped face. The Luna Stud is an instant upgrade for anything from work blazers to evening silk, and pairs beautifully with pearl or gold-chain necklaces.',
    950, 1150, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/luna-crystal-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/luna-crystal-studs.jpeg', 'Luna Crystal Stud Earrings - oval hammered gold studs with marquise CZ stone', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 11. Cascade Pebble Drop Earrings - KSh 1,200
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Cascade Pebble Drop Earrings',
    'cascade-pebble-drop-earrings',
    'Three hammered gold pebbles cascade from the ear for a graceful, water-smoothed silhouette that moves beautifully with every turn. Each pebble is uniquely shaped, giving the Cascade its relaxed, organic feel. A modern keepsake-feel pair that works for brunches, dates and everything in between.',
    1200, 1400, cat_id, true, true, 14, true, true, 'women',
    ARRAY['/images/products/earrings/cascade-pebble-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/cascade-pebble-drops.jpeg', 'Cascade Pebble Drop Earrings - three hammered gold pebble drops', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 12. Royal H Monogram Stud Earrings - KSh 900
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Royal H Monogram Stud Earrings',
    'royal-h-monogram-stud-earrings',
    'Understated luxury — round mother-of-pearl discs feature a pavé crystal "H" monogram set inside a fine gold rim. The Royal H is a quietly elegant nod to the Her Kingdom name and adds a designer-feel finishing touch to any outfit.',
    900, 1100, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/royal-h-monogram-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/royal-h-monogram-studs.jpeg', 'Royal H Monogram Stud Earrings - mother-of-pearl discs with pavé H monogram', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 13. Angel Wing Statement Earrings - KSh 1,150
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Angel Wing Statement Earrings',
    'angel-wing-statement-earrings',
    'Sculpted like two outstretched wings — the Angel Wing studs feature a beautifully textured feather relief with a warm brushed-gold finish. Larger than a standard stud but lightweight enough for long-wear comfort, they''re the kind of piece people notice and ask about.',
    1150, 1400, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/angel-wing-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/angel-wing-studs.jpeg', 'Angel Wing Statement Earrings - textured gold wing sculpted studs', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 14. Fiola Green Interlock Earrings - KSh 950
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Fiola Green Interlock Earrings',
    'fiola-green-interlock-earrings',
    'Two gold-rimmed rings — one studded top, one enamel crescent — interlock into a retro-inspired silhouette with a rich, marbled emerald-green finish. A playful take on the classic hoop that adds instant polish to white linen, neutrals and denim.',
    950, 1150, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/fiola-green-earrings.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/fiola-green-earrings.jpeg', 'Fiola Green Interlock Earrings - emerald green enamel and gold interlocking rings', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 15. Fiola Grey Interlock Earrings - KSh 950
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Fiola Grey Interlock Earrings',
    'fiola-grey-interlock-earrings',
    'The softer sister to the green Fiola — two gold-rimmed rings interlock, this time with a smoky, marbled grey enamel finish that pairs effortlessly with silvery neutrals and soft pastels. Subtle enough for office hours, distinctive enough for evenings.',
    950, 1150, cat_id, true, true, 17, true, true, 'women',
    ARRAY['/images/products/earrings/fiola-grey-earrings.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/fiola-grey-earrings.jpeg', 'Fiola Grey Interlock Earrings - grey enamel and gold interlocking rings', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 16. Amara Green Stone Drop Earrings - KSh 1,150
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Amara Green Stone Drop Earrings',
    'amara-green-stone-drop-earrings',
    'Two richly marbled emerald-green cabochons sit in fine gold bezels — a smaller stud above, a larger rectangle below — for a sophisticated, gallery-feel drop. A statement of quiet luxury that looks just as good with a crisp white shirt as with evening black.',
    1150, 1400, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/amara-green-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/amara-green-drops.jpeg', 'Amara Green Stone Drop Earrings - marbled emerald cabochons in gold bezels', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 17. Crystal Bow Drop Earrings - KSh 1,100
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Crystal Bow Drop Earrings',
    'crystal-bow-drop-earrings',
    'A bright oval crystal stud catches the light above a softly sculpted gold bow — romantic, a touch dramatic, and unmistakably feminine. Ideal for weddings, date nights and anyone who loves a little old-Hollywood sparkle with her everyday pieces.',
    1100, 1350, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/crystal-bow-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/crystal-bow-drops.jpeg', 'Crystal Bow Drop Earrings - oval crystal stud with sculpted gold bow drop', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 18. Mono Oval Stud Earrings - KSh 750
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Mono Oval Stud Earrings',
    'mono-oval-stud-earrings',
    'Sharp, graphic, modern — large oval studs split cleanly between cream enamel and glossy black, framed by a delicate beaded gold border. The Mono Oval is a chic everyday statement that instantly elevates monochrome outfits.',
    750, 950, cat_id, true, true, 21, true, true, 'women',
    ARRAY['/images/products/earrings/mono-oval-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/mono-oval-studs.jpeg', 'Mono Oval Stud Earrings - black and cream oval studs with beaded gold border', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 19. Gilded Bloom Statement Earrings - KSh 1,050
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Gilded Bloom Statement Earrings',
    'gilded-bloom-statement-earrings',
    'Sculpted petals unfurl around a sparkling round crystal centre, crowned by delicate pavé accents — the Gilded Bloom is a romantic, brushed-gold statement that feels freshly picked from a garden at sunrise. Lightweight enough for day wear, dramatic enough for date night.',
    1050, 1300, cat_id, true, true, 19, true, true, 'women',
    ARRAY['/images/products/earrings/gilded-bloom-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/gilded-bloom-studs.jpeg', 'Gilded Bloom Statement Earrings - brushed gold petal studs with crystal centre', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 20. Pearl Cross Drop Earrings - KSh 1,100
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Pearl Cross Drop Earrings',
    'pearl-cross-drop-earrings',
    'A soft-pearl open hoop suspends a gothic-style cross lavishly set with tiny seed pearls — timeless, heirloom-feeling and quietly spiritual. Ideal for Sunday best, weddings, and anyone who loves a touch of old-world romance in their everyday jewelry.',
    1100, 1350, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/pearl-cross-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/pearl-cross-drops.jpeg', 'Pearl Cross Drop Earrings - seed-pearl cross suspended from pearl-set hoop', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 21. Hammered Oval Pearl Drop Earrings - KSh 1,150
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Hammered Oval Pearl Drop Earrings',
    'hammered-oval-pearl-drop-earrings',
    'A luminous mother-of-pearl stud carries a chunky hammered-gold oval drop — the contrast between soft pearl and textured metal creates a sophisticated, modern-heirloom feel. A true closet-staple drop for the woman who wants one pair that works with everything.',
    1150, 1400, cat_id, true, true, 18, true, true, 'women',
    ARRAY['/images/products/earrings/hammered-oval-pearl-drops.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/hammered-oval-pearl-drops.jpeg', 'Hammered Oval Pearl Drop Earrings - mother-of-pearl studs with textured gold oval drops', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 22. Monochrome X Wrap Stud Earrings - KSh 800
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Monochrome X Wrap Stud Earrings',
    'monochrome-x-wrap-stud-earrings',
    'Marbled cream, charcoal and ink swirl beneath a crisp gold X-wrap — a compact, graphic stud that feels distinctly modern. The Monochrome X is equally at home with a sharp blazer or a soft slip dress, and adds an art-gallery edge to neutral palettes.',
    800, 1000, cat_id, true, true, 20, true, true, 'women',
    ARRAY['/images/products/earrings/monochrome-x-wrap-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/monochrome-x-wrap-studs.jpeg', 'Monochrome X Wrap Stud Earrings - marbled grey studs with gold crossed bands', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- 23. Rose Crystal Solitaire Stud Earrings - KSh 650
  INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
  VALUES (
    'Rose Crystal Solitaire Stud Earrings',
    'rose-crystal-solitaire-stud-earrings',
    'A classic solitaire with a feminine twist — brilliant-cut pink cubic zirconia stones set in a delicate four-prong gold basket. Sweet, sparkling and versatile enough for every occasion, from school runs to weddings. A dainty, affordable everyday favourite.',
    650, 850, cat_id, true, true, 23, true, true, 'women',
    ARRAY['/images/products/earrings/rose-crystal-studs.jpeg', '/images/products/earrings/earrings-collection-display.jpeg']
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
      (prod_id, '/images/products/earrings/rose-crystal-studs.jpeg', 'Rose Crystal Solitaire Stud Earrings - pink CZ solitaires in gold four-prong settings', 0, true),
      (prod_id, '/images/products/earrings/earrings-collection-display.jpeg', 'Her Kingdom Earrings Collection display', 1, false)
    ON CONFLICT DO NOTHING;
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
    IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;

  RAISE NOTICE 'Success: All 23 earrings inserted under "Earrings" category.';
END $$;

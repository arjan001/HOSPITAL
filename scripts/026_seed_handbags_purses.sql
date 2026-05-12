-- ============================================================
-- Her Kingdom — Seed: Handbags & Purses
-- ============================================================
-- Seeds the Handbags & Purses category (slug: handbags-purses)
-- with 18 curated products: statement petal clutches, woven
-- knot minaudières, canvas vanity box bags, structured top-handle
-- bags and crossbody styles.
-- ============================================================

-- Ensure the category has a display image (first product photo)
UPDATE public.categories
SET image_url = '/images/products/handbags-purses/chloe-black-white-bucket-bag.jpeg'
WHERE slug = 'handbags-purses'
  AND (image_url IS NULL OR image_url = '');

DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_trending uuid;
  tag_gift_idea uuid;
  tag_statement uuid;
  tag_minimalist uuid;
  tag_everyday uuid;
  tag_luxury uuid;
  tag_bridal uuid;
BEGIN
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'handbags-purses';

  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending     FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea    FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_statement    FROM public.tags WHERE slug = 'statement';
  SELECT id INTO tag_minimalist   FROM public.tags WHERE slug = 'minimalist';
  SELECT id INTO tag_everyday     FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_luxury       FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_bridal       FROM public.tags WHERE slug = 'bridal';

  IF cat_id IS NULL THEN
    RAISE NOTICE 'Category handbags-purses not found. Skipping seed.';
    RETURN;
  END IF;

  -- ----------------------------------------------------------
  -- 1. Chloé Monochrome Bucket Bag
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Chloé Monochrome Bucket Bag',
    'chloe-monochrome-bucket-bag',
    'A designer-inspired cylindrical bucket bag wrapped in a black-and-white woven jacquard trim with signature branded detail. Finished with soft padded top handle, polished gold zip closure and detachable adjustable crossbody strap — versatile enough to carry from brunch to city strolls without missing a beat.',
    2499, 2999, cat_id,
    true, true, 17, true, true, 'women',
    'Faux leather with woven jacquard panel',
    ARRAY['/images/products/handbags-purses/chloe-black-white-bucket-bag.jpeg'],
    1
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/chloe-black-white-bucket-bag.jpeg', 'Chloé Monochrome Bucket Bag', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending     IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury       IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 2. Champagne Petal Ruffle Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Champagne Petal Ruffle Clutch',
    'champagne-petal-ruffle-clutch',
    'Hand-layered chiffon petals in a warm champagne hue cascade across a satin-lined kiss-lock clutch, finished with a polished gold round handle. A romantic, red-carpet-ready accessory that turns a simple outfit into a moment — ideal for weddings, cocktail evenings and bridal showers.',
    1699, 1999, cat_id,
    true, true, 15, true, true, 'women',
    'Chiffon petals over satin body with gold metal frame',
    ARRAY['/images/products/handbags-purses/champagne-petal-ruffle-clutch.jpeg'],
    2
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/champagne-petal-ruffle-clutch.jpeg', 'Champagne Petal Ruffle Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 3. Noir Petal Ruffle Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Noir Petal Ruffle Clutch',
    'noir-petal-ruffle-clutch',
    'Sculpted chiffon petals in deep black frame a glossy satin body for an effortlessly dramatic evening silhouette. Topped with a slim gold ring handle and secure kiss-lock closure — the little black clutch, reimagined with couture texture.',
    1699, 1999, cat_id,
    true, true, 15, true, true, 'women',
    'Chiffon petals over satin body with gold metal frame',
    ARRAY['/images/products/handbags-purses/black-petal-ruffle-clutch.jpeg'],
    3
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/black-petal-ruffle-clutch.jpeg', 'Noir Petal Ruffle Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 4. Lilac Petal Ruffle Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Lilac Petal Ruffle Clutch',
    'lilac-petal-ruffle-clutch',
    'Soft lilac chiffon petals bloom across a kiss-lock clutch for a dreamy, garden-party finish. The gold half-moon handle and satin lining balance the romance with polished glamour — a fresh take on pastel dressing for spring soirées.',
    1699, 1999, cat_id,
    true, true, 15, true, false, 'women',
    'Chiffon petals over satin body with gold metal frame',
    ARRAY['/images/products/handbags-purses/lilac-petal-ruffle-clutch.jpeg'],
    4
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/lilac-petal-ruffle-clutch.jpeg', 'Lilac Petal Ruffle Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 5. Blush Petal Ruffle Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Blush Petal Ruffle Clutch',
    'blush-petal-ruffle-clutch',
    'Warm rose-pink chiffon petals wrap this kiss-lock clutch in an unmistakably feminine silhouette. A sleek gold ring handle and satin interior complete the look — a signature Her Kingdom piece that steals the spotlight at weddings, engagements and date nights.',
    1699, 1999, cat_id,
    true, true, 15, true, true, 'women',
    'Chiffon petals over satin body with gold metal frame',
    ARRAY['/images/products/handbags-purses/blush-petal-ruffle-clutch.jpeg'],
    5
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/blush-petal-ruffle-clutch.jpeg', 'Blush Petal Ruffle Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_bridal      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_bridal) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 6. Crimson Petal Ruffle Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Crimson Petal Ruffle Clutch',
    'crimson-petal-ruffle-clutch',
    'Cascading deep red chiffon petals give this clutch a bold, confident finish — the perfect companion for gala nights, anniversaries and Valentine''s dinners. Anchored by a gold ring handle and satin body for a luxe hand-feel.',
    1699, 1999, cat_id,
    true, true, 15, true, false, 'women',
    'Chiffon petals over satin body with gold metal frame',
    ARRAY['/images/products/handbags-purses/crimson-petal-ruffle-clutch.jpeg'],
    6
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/crimson-petal-ruffle-clutch.jpeg', 'Crimson Petal Ruffle Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 7. Ivory & Brown Woven Bucket Bag
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Ivory & Brown Woven Bucket Bag',
    'ivory-brown-woven-bucket-bag',
    'A tailored little bucket bag that pairs ivory braided raffia with smooth cocoa-brown faux leather trims. The gold signature turn-lock closure and short rolled top handle keep it sharp and office-ready, while an included long strap makes it effortlessly crossbody.',
    2299, 2699, cat_id,
    false, true, 15, true, true, 'women',
    'Raffia-style weave with faux leather trim',
    ARRAY['/images/products/handbags-purses/ivory-brown-woven-bucket-bag.jpeg'],
    7
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/ivory-brown-woven-bucket-bag.jpeg', 'Ivory & Brown Woven Bucket Bag', 0, true);
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 8. Linen Vanity Box Bag — Taupe
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Linen Vanity Box Bag — Taupe',
    'linen-vanity-box-bag-taupe',
    'A structured mini vanity case cut from natural linen-canvas and framed in soft taupe faux leather. Twin silver zips open to a neat padded interior — compact enough for essentials yet distinctly editorial. Finished with a short top handle and knotted leather pulls.',
    1899, 2199, cat_id,
    true, true, 14, true, true, 'women',
    'Linen canvas with faux leather trim',
    ARRAY['/images/products/handbags-purses/linen-taupe-vanity-box-bag.jpeg'],
    8
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/linen-taupe-vanity-box-bag.jpeg', 'Linen Vanity Box Bag — Taupe', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 9. Linen Vanity Box Bag — Red
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Linen Vanity Box Bag — Red',
    'linen-vanity-box-bag-red',
    'This structured canvas box bag adds a pop of confident red along the zip band and handle. A knotted leather zip pull doubles as a tactile accent, while the boxy silhouette keeps everything looking sharp — a neutral made exciting.',
    1899, 2199, cat_id,
    true, true, 14, true, false, 'women',
    'Linen canvas with faux leather trim',
    ARRAY['/images/products/handbags-purses/linen-red-vanity-box-bag.jpeg'],
    9
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/linen-red-vanity-box-bag.jpeg', 'Linen Vanity Box Bag — Red', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 10. Linen Vanity Box Bag — Brown
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Linen Vanity Box Bag — Brown',
    'linen-vanity-box-bag-brown',
    'Rich chocolate-brown faux leather trims the natural linen-canvas frame of this structured vanity bag for a warm, autumnal finish. The twin silver zips and knotted leather pulls keep the look refined — easy to dress up or down, season after season.',
    1899, 2199, cat_id,
    true, true, 14, true, false, 'women',
    'Linen canvas with faux leather trim',
    ARRAY['/images/products/handbags-purses/linen-brown-vanity-box-bag.jpeg'],
    10
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/linen-brown-vanity-box-bag.jpeg', 'Linen Vanity Box Bag — Brown', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 11. Linen Vanity Box Bag — Black
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Linen Vanity Box Bag — Black',
    'linen-vanity-box-bag-black',
    'Sharp black faux leather banding gives this canvas vanity bag a confident, city-ready edge. Sleek silver zips, a sturdy top handle and knotted pulls make it a go-to carry for meetings, weekend travel and everything in-between.',
    1899, 2199, cat_id,
    true, true, 14, true, true, 'women',
    'Linen canvas with faux leather trim',
    ARRAY['/images/products/handbags-purses/linen-black-vanity-box-bag.jpeg'],
    11
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/linen-black-vanity-box-bag.jpeg', 'Linen Vanity Box Bag — Black', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 12. Gold Woven Knot Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Gold Woven Knot Clutch',
    'gold-woven-knot-clutch',
    'A metallic gold woven minaudière styled after the cult intrecciato knot silhouette. The hard-shell body and signature knotted top clasp give it a gallery-worthy finish — pair it with little black dresses, champagne silks and confidence.',
    1599, 1899, cat_id,
    true, true, 16, true, true, 'women',
    'Metallic woven faux leather with metal knot clasp',
    ARRAY['/images/products/handbags-purses/gold-woven-knot-clutch.jpeg'],
    12
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/gold-woven-knot-clutch.jpeg', 'Gold Woven Knot Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 13. Noir Woven Knot Clutch
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Noir Woven Knot Clutch',
    'noir-woven-knot-clutch',
    'An intrecciato-inspired woven knot minaudière in deepest black, finished with a striking polished gold knot clasp. Architectural, compact and endlessly rewearable — a considered evening staple that slips straight from dinner to dance floor.',
    1599, 1899, cat_id,
    true, true, 16, true, true, 'women',
    'Woven faux leather with metal knot clasp',
    ARRAY['/images/products/handbags-purses/black-woven-knot-clutch.jpeg'],
    13
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/black-woven-knot-clutch.jpeg', 'Noir Woven Knot Clutch', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 14. Noir Studded-Trim Top Handle Bag
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Noir Studded-Trim Top Handle Bag',
    'noir-studded-trim-top-handle-bag',
    'Textured black pebbled leatherette meets a decorative silver-bead trim along the flap, grounded by a polished gold turn-lock. The padded rolled handle and included long strap flex between lady-like top-handle and hands-free crossbody — timeless silhouette, just-right scale.',
    2499, 2999, cat_id,
    true, true, 17, true, true, 'women',
    'Pebbled faux leather with metal bead trim',
    ARRAY['/images/products/handbags-purses/black-studded-trim-top-handle-bag.jpeg'],
    14
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/black-studded-trim-top-handle-bag.jpeg', 'Noir Studded-Trim Top Handle Bag', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 15. Taupe Studded-Trim Top Handle Bag
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Taupe Studded-Trim Top Handle Bag',
    'taupe-studded-trim-top-handle-bag',
    'Soft taupe pebbled leatherette lifted by a scallop of silver-bead detailing and gold turn-lock closure. The boxy base, padded handle and detachable long strap make it a genuine desk-to-dinner carry — effortlessly elevated neutral dressing.',
    2499, 2999, cat_id,
    true, true, 17, true, true, 'women',
    'Pebbled faux leather with metal bead trim',
    ARRAY['/images/products/handbags-purses/taupe-studded-trim-top-handle-bag.jpeg'],
    15
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/taupe-studded-trim-top-handle-bag.jpeg', 'Taupe Studded-Trim Top Handle Bag', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_luxury      IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 16. Croc-Embossed Saddle Crossbody
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Croc-Embossed Saddle Crossbody',
    'croc-embossed-saddle-crossbody',
    'A half-moon crossbody in black pebbled leatherette, topped with a croc-embossed flap edged in rich caramel-brown piping. A gold-tone nameplate completes the look, while the contrast topstitched strap keeps it hands-free and polished — dinner, commute or travel.',
    2199, 2599, cat_id,
    true, true, 15, true, true, 'women',
    'Pebbled and croc-embossed faux leather',
    ARRAY['/images/products/handbags-purses/black-croc-embossed-crossbody.jpeg'],
    16
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/black-croc-embossed-crossbody.jpeg', 'Croc-Embossed Saddle Crossbody', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 17. Taupe Twill Buckle Crossbody
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Taupe Twill Buckle Crossbody',
    'taupe-twill-buckle-crossbody',
    'Woven taupe twill meets cognac-brown leatherette on this elongated crossbody, closed with a bold silver rectangular buckle for a polished, belt-strap feel. Slim and lightweight — perfect over a linen dress, blazer, or casual denim.',
    1849, 2199, cat_id,
    true, true, 16, true, false, 'women',
    'Twill-weave fabric with faux leather strap',
    ARRAY['/images/products/handbags-purses/taupe-twill-buckle-crossbody.jpeg'],
    17
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/taupe-twill-buckle-crossbody.jpeg', 'Taupe Twill Buckle Crossbody', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_minimalist  IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_minimalist) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

  -- ----------------------------------------------------------
  -- 18. Monochrome Striped Woven Shoulder Bag
  -- ----------------------------------------------------------
  INSERT INTO public.products (
    name, slug, description, price, original_price, category_id,
    is_new, is_on_offer, offer_percentage, in_stock, featured, collection,
    material, gallery_images, sort_order
  ) VALUES (
    'Monochrome Striped Woven Shoulder Bag',
    'monochrome-striped-woven-shoulder-bag',
    'A roomy woven shoulder bag in black, grey and ivory vertical stripes, framed in cognac-brown faux leather at the base and handle. The gold pendant pull adds a jewelry-like finish — carry it as a top-handle or switch to the included crossbody strap for market days, brunches and short trips.',
    2299, 2699, cat_id,
    true, true, 15, true, true, 'women',
    'Woven fabric with faux leather trim',
    ARRAY['/images/products/handbags-purses/monochrome-striped-woven-shoulder-bag.jpeg'],
    18
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO prod_id;

  IF prod_id IS NOT NULL THEN
    INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    VALUES (prod_id, '/images/products/handbags-purses/monochrome-striped-woven-shoulder-bag.jpeg', 'Monochrome Striped Woven Shoulder Bag', 0, true);
    IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
    IF tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    IF tag_everyday    IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    IF tag_statement   IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_statement) ON CONFLICT DO NOTHING; END IF;
  END IF;
  prod_id := NULL;

END $$;

-- ============================================================
-- Verification query (optional, comment out in production runs)
-- ============================================================
-- SELECT p.name, p.slug, p.price, p.original_price
-- FROM public.products p
-- JOIN public.categories c ON c.id = p.category_id
-- WHERE c.slug = 'handbags-purses'
-- ORDER BY p.sort_order;

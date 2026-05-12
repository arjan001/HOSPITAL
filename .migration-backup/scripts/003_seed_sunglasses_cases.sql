-- ============================================================
-- Her Kingdom - Sunglasses Cases Seed Data
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

-- Ensure Sunglasses Cases category exists with the trio image for breadcrumb/category display
INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
VALUES (
  'Sunglasses Cases',
  'sunglasses-cases',
  'Stylish foldable sunglasses cases in patchwork leather and natural cork designs',
  '/categories/sunglasses-cases.jpeg',
  15,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  image_url = '/categories/sunglasses-cases.jpeg',
  description = 'Stylish foldable sunglasses cases in patchwork leather and natural cork designs';

-- Ensure required tags exist
INSERT INTO public.tags (name, slug) VALUES
  ('Accessory', 'accessory'),
  ('Handcrafted', 'handcrafted'),
  ('Eco-Friendly', 'eco-friendly')
ON CONFLICT (slug) DO NOTHING;

-- Insert Sunglasses Cases products and their images/tags
DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_trending uuid;
  tag_accessory uuid;
  tag_handcrafted uuid;
  tag_eco_friendly uuid;
BEGIN
  -- Get the Sunglasses Cases category ID
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'sunglasses-cases';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_accessory FROM public.tags WHERE slug = 'accessory';
  SELECT id INTO tag_handcrafted FROM public.tags WHERE slug = 'handcrafted';
  SELECT id INTO tag_eco_friendly FROM public.tags WHERE slug = 'eco-friendly';

  IF cat_id IS NOT NULL THEN

    -- 1. Ocean Blue Patchwork Case - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Ocean Blue Patchwork Case',
      'ocean-blue-patchwork-case',
      'Dive into deep ocean hues with this stunning foldable sunglasses case. Artfully pieced together in rich cobalt blue, warm gold, and teal patchwork leather, this case is as much a fashion statement as the shades it protects. The magnetic tri-fold closure keeps your sunglasses snug and secure, while the Her Kingdom branding adds a touch of elegance. Compact enough for any handbag, bold enough to turn heads.',
      1400, 1700, cat_id, true, true, 18, true, true, 'women',
      ARRAY['/images/products/sunglasses-cases/ocean-blue-patchwork-case.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/sunglasses-cases/ocean-blue-patchwork-case.jpeg', 'Ocean Blue Patchwork Sunglasses Case', 0, true),
        (prod_id, '/images/products/sunglasses-cases/patchwork-trio-collection.jpeg', 'Patchwork Sunglasses Cases Collection', 1, false);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
      IF tag_handcrafted IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_handcrafted) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 2. Rose Blush Patchwork Case - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Rose Blush Patchwork Case',
      'rose-blush-patchwork-case',
      'Soft, romantic, and irresistibly chic. This foldable sunglasses case blends dreamy lavender-pink and warm copper tones into a mosaic of artisan leather patches. Every panel tells a story of craftsmanship, finished with the signature Her Kingdom logo. The perfect accessory for the woman who believes even her eyewear deserves a beautiful home. Folds flat for effortless travel.',
      1400, 1700, cat_id, true, true, 18, true, true, 'women',
      ARRAY['/images/products/sunglasses-cases/rose-blush-patchwork-case.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/sunglasses-cases/rose-blush-patchwork-case.jpeg', 'Rose Blush Patchwork Sunglasses Case', 0, true),
        (prod_id, '/images/products/sunglasses-cases/patchwork-trio-collection.jpeg', 'Patchwork Sunglasses Cases Collection', 1, false);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
      IF tag_handcrafted IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_handcrafted) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 3. Autumn Earth Patchwork Case - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Autumn Earth Patchwork Case',
      'autumn-earth-patchwork-case',
      'Inspired by the warmth of autumn forests. Rich brown, burnt sienna, and deep charcoal leather patches come together in a beautifully textured mosaic design. This foldable case brings earthy sophistication to your everyday carry. The suede-like finish feels luxurious to the touch, and the tri-fold magnetic snap keeps everything in place. Nature-inspired elegance by Her Kingdom.',
      1400, 1700, cat_id, true, true, 18, true, false, 'women',
      ARRAY['/images/products/sunglasses-cases/autumn-earth-patchwork-case.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/sunglasses-cases/autumn-earth-patchwork-case.jpeg', 'Autumn Earth Patchwork Sunglasses Case', 0, true),
        (prod_id, '/images/products/sunglasses-cases/patchwork-trio-collection.jpeg', 'Patchwork Sunglasses Cases Collection', 1, false);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
      IF tag_handcrafted IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_handcrafted) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 4. Smoky Slate Patchwork Case - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Smoky Slate Patchwork Case',
      'smoky-slate-patchwork-case',
      'Understated luxury meets modern edge. This all-grey patchwork case channels moody, urban vibes with its charcoal and slate leather panels. The tonal grey palette makes it the ultimate versatile accessory, pairing effortlessly with any outfit or bag. Foldable, lightweight, and finished with the Her Kingdom stamp of quality. For the woman who keeps it sleek and sophisticated.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/sunglasses-cases/smoky-slate-patchwork-case.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/sunglasses-cases/smoky-slate-patchwork-case.jpeg', 'Smoky Slate Patchwork Sunglasses Case', 0, true),
        (prod_id, '/images/products/sunglasses-cases/patchwork-trio-collection.jpeg', 'Patchwork Sunglasses Cases Collection', 1, false);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
      IF tag_handcrafted IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_handcrafted) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 5. Natural Cork Case - KSh 1,600
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Natural Cork Case',
      'natural-cork-case',
      'Go natural, go bold. This eco-conscious sunglasses case is crafted from genuine cork material, giving each piece a unique, organic texture that no two cases share. Lightweight yet surprisingly durable, the cork exterior offers a warm, earthy aesthetic that stands apart from the crowd. The foldable tri-fold design collapses flat for easy storage. A Her Kingdom original for the eco-chic woman.',
      1600, 1900, cat_id, true, true, 16, true, true, 'women',
      ARRAY['/images/products/sunglasses-cases/natural-cork-case.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/sunglasses-cases/natural-cork-case.jpeg', 'Natural Cork Sunglasses Case', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
      IF tag_eco_friendly IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_eco_friendly) ON CONFLICT DO NOTHING; END IF;
    END IF;

  END IF;
END $$;

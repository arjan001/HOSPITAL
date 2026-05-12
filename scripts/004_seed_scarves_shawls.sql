-- ============================================================
-- Her Kingdom - Scarves & Shawls Seed Data
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

-- Ensure Scarves & Shawls category exists with the correct image
INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
VALUES (
  'Scarves & Shawls',
  'scarves-shawls',
  'Elegant cashmere scarves, shawls and ponchos for every occasion',
  '/images/categories/scarves-shawls.jpeg',
  10,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  image_url = '/images/categories/scarves-shawls.jpeg',
  description = 'Elegant cashmere scarves, shawls and ponchos for every occasion';

-- Ensure required tags exist
INSERT INTO public.tags (name, slug) VALUES
  ('Accessory', 'accessory'),
  ('Luxury', 'luxury'),
  ('Winter Essential', 'winter-essential')
ON CONFLICT (slug) DO NOTHING;

-- Insert Scarves & Shawls products and their images/tags
DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_trending uuid;
  tag_accessory uuid;
  tag_luxury uuid;
  tag_winter_essential uuid;
BEGIN
  -- Get the Scarves & Shawls category ID
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'scarves-shawls';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_accessory FROM public.tags WHERE slug = 'accessory';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_winter_essential FROM public.tags WHERE slug = 'winter-essential';

  IF cat_id IS NOT NULL THEN

    -- 1. Green Toile Landscape Cashmere Scarf - KSh 2,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Green Toile Landscape Cashmere Scarf',
      'green-toile-landscape-cashmere-scarf',
      'Wrap yourself in artistry with this stunning green toile cashmere scarf. Featuring an exquisite countryside landscape print in olive green and cream, this oversized scarf doubles as a shawl for cooler evenings. The delicate fringe detailing adds a refined finishing touch. Crafted from ultra-soft cashmere-blend fabric, it drapes beautifully and feels incredibly luxurious against the skin. A timeless piece that elevates any outfit from casual to elegant.',
      2000, 2500, cat_id, true, true, 20, true, true, 'women',
      ARRAY['/images/products/scarves-shawls/green-toile-landscape-cashmere-scarf.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/scarves-shawls/green-toile-landscape-cashmere-scarf.jpeg', 'Green Toile Landscape Cashmere Scarf', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_winter_essential IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_winter_essential) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 2. Abstract Color Block Cashmere Scarf - KSh 2,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Abstract Color Block Cashmere Scarf',
      'abstract-color-block-cashmere-scarf',
      'Make a bold statement with this modern abstract cashmere scarf. Large organic shapes in olive green, mustard yellow, sage, and cream create a contemporary art-inspired design that turns heads. Generously sized to be worn as a scarf, shawl, or even a poncho wrap. The soft cashmere-blend fabric provides warmth without bulk, making it perfect for layering through the seasons. A wearable piece of art by Her Kingdom.',
      2000, 2500, cat_id, true, true, 20, true, true, 'women',
      ARRAY['/images/products/scarves-shawls/abstract-color-block-cashmere-scarf.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/scarves-shawls/abstract-color-block-cashmere-scarf.jpeg', 'Abstract Color Block Cashmere Scarf', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 3. Leopard & Zebra Print Poncho Scarf - KSh 2,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Leopard & Zebra Print Poncho Scarf',
      'leopard-zebra-print-poncho-scarf',
      'Unleash your wild side with this striking animal print poncho scarf. Featuring a bold mix of leopard spots and zebra stripes in sophisticated grey, black, and mustard yellow tones, this versatile piece works as both a poncho wrap and an oversized scarf. The grey border trim adds structure and polish to the untamed print. Crafted from a warm cashmere-blend fabric with a soft brushed finish. Perfect for making a fierce fashion statement on cool days.',
      2000, 2500, cat_id, true, true, 20, true, true, 'women',
      ARRAY['/images/products/scarves-shawls/leopard-zebra-print-poncho-scarf.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/scarves-shawls/leopard-zebra-print-poncho-scarf.jpeg', 'Leopard & Zebra Print Poncho Scarf', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_accessory IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_accessory) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 4. Green Monogram Cashmere Scarf - KSh 2,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Green Monogram Cashmere Scarf',
      'green-monogram-cashmere-scarf',
      'Elevate your accessories game with this luxurious green monogram cashmere scarf. The bold geometric monogram pattern in emerald green, brown, and cream creates a striking designer-inspired look that exudes sophistication. Generously oversized for versatile styling as a scarf, blanket wrap, or decorative throw. The fringe trim adds texture and movement. Made from premium cashmere-blend fabric that is sumptuously soft and cozy. A statement piece for the woman who appreciates iconic style.',
      2000, 2500, cat_id, true, true, 20, true, true, 'women',
      ARRAY['/images/products/scarves-shawls/green-monogram-cashmere-scarf.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES
        (prod_id, '/images/products/scarves-shawls/green-monogram-cashmere-scarf.jpeg', 'Green Monogram Cashmere Scarf', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_winter_essential IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_winter_essential) ON CONFLICT DO NOTHING; END IF;
    END IF;

  END IF;
END $$;

-- ============================================================
-- Her Kingdom - Gift Wrapping Items Seed Data
-- ============================================================
-- Seeds the gift_items table with gift wrapping options shown
-- in the checkout "Is this a gift?" modal under the
-- "Gift Wrapping" tab. Run 020_gift_items_schema.sql first.
--
-- Run this SQL in the Supabase SQL Editor.
-- ============================================================

INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
VALUES
  (
    'gift_wrap',
    'Hearts in Bloom Gift Bag - Medium',
    'Romantic red gift bag covered in a scatter of mini hearts in pink, white and deep red. Medium size — perfect for jewellery boxes, perfumes and small gifts. Includes a matching heart-shaped tag.',
    350,
    '/images/products/gift-wrapping/hearts-in-bloom.webp',
    true,
    1
  ),
  (
    'gift_wrap',
    'Be Mine Teddy Gift Bag - Medium',
    'A bold red "Be Mine" teddy bear gift bag with a gold heart tag and satin ribbon handles. Medium size — ideal for a romantic Valentine or anniversary surprise.',
    350,
    '/images/products/gift-wrapping/be-mine-teddy.webp',
    true,
    2
  ),
  (
    'gift_wrap',
    'Blue Teddy',
    'Soft navy-blue gift wrap sheet with an all-over caramel teddy bear print. A playful wrap that turns any box into a huggable surprise.',
    150,
    '/images/products/gift-wrapping/blue-teddy-wrap.webp',
    true,
    3
  ),
  (
    'gift_wrap',
    'XO Love Notes Gift Bag - Medium',
    'A vibrant love-notes gift bag with bold LOVE, XOXO and heart motifs in red, pink, teal and gold foil. Medium size — a statement wrap for the special someone.',
    350,
    '/images/products/gift-wrapping/xo-love-notes.webp',
    true,
    4
  ),
  (
    'gift_wrap',
    'All My Heart Kraft Gift Bag Collection',
    'Natural kraft paper gift bag with an all-over pattern of red and pink hearts of every size. A warm, crafty finish — includes a coordinating heart tag.',
    350,
    '/images/products/gift-wrapping/all-my-heart-kraft.webp',
    true,
    5
  )
ON CONFLICT DO NOTHING;

-- Helpful confirmation
DO $$
DECLARE
  wrap_count integer;
BEGIN
  SELECT COUNT(*) INTO wrap_count FROM public.gift_items WHERE category = 'gift_wrap' AND is_active = true;
  RAISE NOTICE 'Gift wrapping items active: %', wrap_count;
END $$;

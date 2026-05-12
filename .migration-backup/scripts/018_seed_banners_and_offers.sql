-- ============================================================
-- Her Kingdom - Banners, Offers, Popups & Marquee Seed
-- ============================================================
-- Seeds every promotional surface on the store with rich,
-- descriptive, on-brand content using product/category images
-- that already live in the database. Safe to re-run.
--
-- Surfaces covered:
--   1. hero_banners     (large carousel on home)
--   2. banners          (mid-page offer cards)
--   3. navbar_offers    (scrolling marquee / top-bar)
--   4. popup_offers     (newsletter / first-visit modal)
--
-- All image_url values reference assets already uploaded to
-- /public/images/products/** — no external or "cloth" images.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Make the seed idempotent by clearing the existing rows first.
-- ------------------------------------------------------------
DELETE FROM public.hero_banners;
DELETE FROM public.banners;
DELETE FROM public.navbar_offers;
DELETE FROM public.popup_offers;

-- ============================================================
-- 1. HERO BANNERS — homepage carousel (3 slots)
-- ============================================================
-- Slot 0 renders as the large carousel, slots 1 & 2 as the
-- side tiles. Images rotate automatically every 4 seconds.
-- ============================================================
INSERT INTO public.hero_banners
  (title, subtitle, button_text, button_link, image_url, is_active, sort_order)
VALUES
  (
    'The Signature Jewelry Edit',
    'Hand-picked crystal necklace sets, drop earrings and statement pieces — the pieces that turn an outfit into a moment. Curated in Nairobi, made to be worn every day.',
    'Shop The Edit',
    '/shop?category=jewelry-sets',
    '/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg',
    true,
    0
  ),
  (
    'Timeless Timepieces',
    'Rose-gold chain watches, floral bracelet dials and boardroom-ready classics for her. Quietly luxurious, priced to be worn — not locked in a drawer.',
    'Browse Watches',
    '/shop?category=women-watches',
    '/images/products/women-watches/gold-flower-bracelet-watch.jpeg',
    true,
    1
  ),
  (
    'Everyday Sparkle',
    'Featherlight earrings, dainty studs and drop crystals designed for the commute, the meeting, and the candle-lit dinner that follows.',
    'Shop Earrings',
    '/shop?category=earrings',
    '/images/products/earrings/amara-gemstone-drops.jpeg',
    true,
    2
  );

-- ============================================================
-- 2. BANNERS — mid-page promotional cards
-- ============================================================
-- position = 'mid-page' renders in the OfferBanner grid.
-- position = 'hero' can be used for additional homepage slots.
-- ============================================================
INSERT INTO public.banners
  (title, subtitle, image_url, link, position, is_active, sort_order)
VALUES
  (
    'Bracelets That Stack Beautifully',
    'Up to 30% off on tennis bracelets, pavé cuffs and pearl halos. Layer one — or all four.',
    '/images/products/bracelets/celestia-graduated-cz-bracelet.jpeg',
    '/shop?category=bracelets&filter=offers',
    'mid-page',
    true,
    0
  ),
  (
    'Her Signature Scent',
    'New-in designer-inspired EDPs — long-wear, softly floral, unmistakably her. From KSh 1,500.',
    '/images/products/perfume-scents/gucci-flora-edp.jpeg',
    '/shop?category=perfume-scents&filter=new',
    'mid-page',
    true,
    1
  ),
  (
    'Cashmere Touch',
    'Pastel, monogram and leopard cashmere-feel scarves — the cosy finishing touch to every look.',
    '/images/products/scarves-shawls/pastel-cashmere-scarf-collection.jpeg',
    '/shop?category=scarves-shawls',
    'mid-page',
    true,
    2
  ),
  (
    'The Gentlemen''s Edit',
    'Classic leather-strap watches, matte-finish sunglasses and bold chain necklaces for the modern man.',
    '/images/products/men-watches/rado-mens-watch.jpeg',
    '/shop?category=men-watches',
    'mid-page',
    true,
    3
  );

-- ============================================================
-- 3. NAVBAR OFFERS — scrolling marquee in the top bar
-- ============================================================
-- Rendered in components/store/top-bar.tsx, looped 4x for a
-- seamless marquee. Keep each line short (≤ 70 chars).
-- ============================================================
INSERT INTO public.navbar_offers (text, is_active, sort_order) VALUES
  ('FREE delivery on orders above KSh 5,000 — nationwide',                 true, 1),
  ('NEW ARRIVALS dropped this week — shop the latest jewelry',             true, 2),
  ('20% OFF selected bracelets this weekend — use code STACK20',           true, 3),
  ('Hypoallergenic jewelry, hand-finished in Nairobi',                     true, 4),
  ('FREE gift wrapping on all jewelry sets — perfect for her',             true, 5),
  ('Same-day delivery within Nairobi CBD — order before 2pm',              true, 6),
  ('WhatsApp 0780 406 059 for custom orders & styling advice',             true, 7),
  ('Flat 15% OFF women''s watches this month',                             true, 8);

-- ============================================================
-- 4. POPUP OFFERS — newsletter / first-visit modal
-- ============================================================
-- Only the most-recently-created active row is displayed.
-- The modal also doubles as the newsletter signup surface.
-- ============================================================
INSERT INTO public.popup_offers
  (title, description, discount_label, image_url, link, valid_until, is_active)
VALUES
  (
    'Welcome to Her Kingdom',
    'Join the list and unlock 10% off your first order — plus first-look access to new drops, restocks and insider-only styling tips.',
    '10% OFF FIRST ORDER',
    '/images/products/necklace-sets/diamond-shape-crystal-necklace-set.jpeg',
    '/shop?filter=new',
    '2026-12-31',
    true
  );

COMMIT;

-- ============================================================
-- VERIFY: run the queries below (or the companion file
-- scripts/019_view_banners_and_offers.sql) to inspect seeds.
-- ============================================================

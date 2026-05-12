-- ============================================================
-- Her Kingdom - View all banners, offers & marquee entries
-- ============================================================
-- Copy any of the queries below into the Supabase SQL editor
-- to inspect what is currently seeded on the store.
-- ============================================================


-- ------------------------------------------------------------
-- 1. HERO BANNERS — homepage carousel
-- ------------------------------------------------------------
SELECT
  sort_order          AS "Slot",
  title               AS "Title",
  subtitle            AS "Subtitle",
  button_text         AS "CTA",
  button_link         AS "Link",
  image_url           AS "Image",
  is_active           AS "Active",
  created_at          AS "Created"
FROM public.hero_banners
ORDER BY sort_order ASC, created_at ASC;


-- ------------------------------------------------------------
-- 2. BANNERS — mid-page promotional cards
-- ------------------------------------------------------------
SELECT
  position            AS "Position",
  sort_order          AS "Slot",
  title               AS "Title",
  subtitle            AS "Subtitle",
  link                AS "Link",
  image_url           AS "Image",
  is_active           AS "Active"
FROM public.banners
ORDER BY position ASC, sort_order ASC, created_at ASC;


-- ------------------------------------------------------------
-- 3. NAVBAR OFFERS — scrolling marquee (top bar)
-- ------------------------------------------------------------
SELECT
  sort_order          AS "Order",
  text                AS "Marquee Line",
  is_active           AS "Active",
  created_at          AS "Created"
FROM public.navbar_offers
ORDER BY sort_order ASC, created_at ASC;


-- ------------------------------------------------------------
-- 4. POPUP OFFERS — newsletter modal / first-visit popup
-- ------------------------------------------------------------
SELECT
  title               AS "Title",
  discount_label      AS "Discount",
  description         AS "Description",
  image_url           AS "Image",
  link                AS "Link",
  valid_until         AS "Valid Until",
  is_active           AS "Active",
  created_at          AS "Created"
FROM public.popup_offers
ORDER BY created_at DESC;


-- ------------------------------------------------------------
-- 5. NEWSLETTER SUBSCRIBERS — who signed up via the popup/footer
-- ------------------------------------------------------------
SELECT
  email               AS "Email",
  subscribed_at       AS "Subscribed At",
  is_active           AS "Active"
FROM public.newsletter_subscribers
ORDER BY subscribed_at DESC
LIMIT 100;


-- ------------------------------------------------------------
-- 6. EVERYTHING AT A GLANCE — one consolidated row count
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM public.hero_banners   WHERE is_active) AS "Hero Banners (active)",
  (SELECT COUNT(*) FROM public.banners        WHERE is_active) AS "Mid-page Banners (active)",
  (SELECT COUNT(*) FROM public.navbar_offers  WHERE is_active) AS "Navbar Offers (active)",
  (SELECT COUNT(*) FROM public.popup_offers   WHERE is_active) AS "Popup Offers (active)",
  (SELECT COUNT(*) FROM public.newsletter_subscribers WHERE is_active) AS "Newsletter Subs (active)";


-- ------------------------------------------------------------
-- 7. UNIFIED VIEW — every banner/offer image in one list
-- ------------------------------------------------------------
SELECT 'hero_banner'  AS source, title AS label, image_url, is_active
  FROM public.hero_banners
UNION ALL
SELECT 'banner'       AS source, title AS label, image_url, is_active
  FROM public.banners
UNION ALL
SELECT 'popup_offer'  AS source, title AS label, image_url, is_active
  FROM public.popup_offers
ORDER BY source, label;

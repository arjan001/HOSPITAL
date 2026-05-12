-- ============================================================
-- Her Kingdom - Complete Database Schema
-- Jewelry & Accessories E-Commerce Store
-- Nairobi, Kenya
-- ============================================================
-- Run this SQL against a fresh Supabase/PostgreSQL database.
-- Requires: uuid-ossp extension (enabled by default on Supabase)
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ADMIN USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name character varying NOT NULL,
  role character varying DEFAULT 'admin'::character varying,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 2. CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  phone character varying,
  first_name character varying,
  last_name character varying,
  is_subscribed_newsletter boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 3. CUSTOMER ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  full_name character varying NOT NULL,
  phone character varying NOT NULL,
  address_line_1 character varying NOT NULL,
  address_line_2 character varying,
  city character varying NOT NULL,
  postal_code character varying,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

-- ============================================================
-- 4. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  image_url text,
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 5. TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 6. PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  description text,
  price numeric NOT NULL,
  original_price numeric,
  category_id uuid NOT NULL,
  is_new boolean DEFAULT false,
  is_on_offer boolean DEFAULT false,
  offer_percentage integer,
  in_stock boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cost_price numeric,
  discount_percentage numeric DEFAULT 0,
  sku character varying UNIQUE,
  stock_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  gallery_images text[],
  material character varying,
  care_instructions text,
  collection character varying DEFAULT 'women'::character varying,
  sort_order integer DEFAULT 0,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

-- ============================================================
-- 7. PRODUCT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  image_url text NOT NULL,
  alt_text character varying,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ============================================================
-- 8. PRODUCT VARIATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_variations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  type character varying NOT NULL,
  options text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_variations_pkey PRIMARY KEY (id),
  CONSTRAINT product_variations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ============================================================
-- 9. PRODUCT TAGS (Junction Table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_tags (
  product_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT product_tags_pkey PRIMARY KEY (product_id, tag_id),
  CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);

-- ============================================================
-- 10. DELIVERY LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  fee numeric NOT NULL,
  estimated_days character varying NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_locations_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 11. DELIVERY ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  country character varying NOT NULL,
  region character varying,
  delivery_fee numeric NOT NULL,
  delivery_days_min integer DEFAULT 1,
  delivery_days_max integer DEFAULT 3,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT delivery_zones_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 12. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_no character varying NOT NULL UNIQUE,
  customer_name character varying NOT NULL,
  customer_phone character varying NOT NULL,
  customer_email character varying,
  delivery_location_id uuid,
  delivery_address text NOT NULL,
  order_notes text,
  subtotal numeric NOT NULL,
  delivery_fee numeric DEFAULT 0,
  total numeric NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  payment_method character varying DEFAULT 'cod'::character varying,
  mpesa_code character varying,
  mpesa_phone character varying,
  mpesa_message text,
  ordered_via character varying DEFAULT 'website'::character varying,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_delivery_location_id_fkey FOREIGN KEY (delivery_location_id) REFERENCES public.delivery_locations(id)
);

-- ============================================================
-- 13. ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name character varying NOT NULL,
  product_price numeric NOT NULL,
  quantity integer NOT NULL,
  selected_variations jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ============================================================
-- 14. ORDER SHIPMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  tracking_number character varying UNIQUE,
  shipped_at timestamp with time zone,
  estimated_delivery timestamp with time zone,
  delivered_at timestamp with time zone,
  carrier character varying,
  notes text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT order_shipments_pkey PRIMARY KEY (id),
  CONSTRAINT order_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- ============================================================
-- 15. BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  subtitle character varying,
  image_url text NOT NULL,
  link character varying,
  position character varying NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT banners_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 16. HERO BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hero_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title character varying NOT NULL,
  subtitle text,
  button_text character varying,
  button_link character varying,
  image_url character varying,
  collection_id uuid,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hero_banners_pkey PRIMARY KEY (id),
  CONSTRAINT hero_banners_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.categories(id)
);

-- ============================================================
-- 17. NAVBAR OFFERS (Scrolling announcements)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.navbar_offers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  text text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT navbar_offers_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 18. POPUP OFFERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.popup_offers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  discount_label character varying NOT NULL,
  image_url text,
  link character varying,
  valid_until date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT popup_offers_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 19. NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  subscribed_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 20. SITE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_name character varying DEFAULT 'Her Kingdom'::character varying,
  store_email character varying DEFAULT 'herkingdomlive@gmail.com'::character varying,
  store_phone character varying DEFAULT '+254780406059'::character varying,
  whatsapp_number character varying DEFAULT '254780406059'::character varying,
  currency_symbol character varying DEFAULT 'KSh'::character varying,
  free_shipping_threshold numeric DEFAULT 5000,
  order_prefix character varying DEFAULT 'HK'::character varying,
  enable_whatsapp_checkout boolean DEFAULT true,
  enable_quick_checkout boolean DEFAULT true,
  maintenance_mode boolean DEFAULT false,
  site_title character varying DEFAULT 'Her Kingdom | Curated Jewelry & Accessories'::character varying,
  site_description text DEFAULT 'Her Kingdom is a jewelry brand based in Nairobi, Kenya. We offer curated jewelry pieces that complement your personal style and embody individuality.'::text,
  meta_keywords text DEFAULT 'jewelry Nairobi, jewelry Kenya, necklaces, bracelets, earrings, watches, accessories, Her Kingdom, hypoallergenic jewelry'::text,
  canonical_url character varying DEFAULT 'https://herkingdom.co.ke'::character varying,
  og_image_url text,
  google_analytics_id character varying,
  facebook_pixel_id character varying,
  robots_txt text,
  primary_color character varying DEFAULT '#f4a4c0'::character varying,
  accent_color character varying DEFAULT '#1a1a1a'::character varying,
  font_heading character varying DEFAULT 'Playfair Display'::character varying,
  font_body character varying DEFAULT 'Inter'::character varying,
  logo_text character varying DEFAULT 'Her Kingdom'::character varying,
  logo_image_url text,
  favicon_url text,
  show_recent_purchase boolean DEFAULT true,
  show_offer_modal boolean DEFAULT true,
  show_newsletter boolean DEFAULT true,
  footer_description text DEFAULT 'Curated jewelry & accessories that complement your personal style. Hypoallergenic, long-lasting pieces delivered across Kenya.'::text,
  footer_address text DEFAULT 'Nairobi, Kenya'::text,
  footer_phone character varying DEFAULT '0780 406 059'::character varying,
  footer_email character varying DEFAULT 'herkingdomlive@gmail.com'::character varying,
  footer_whatsapp character varying DEFAULT '254780406059'::character varying,
  footer_instagram character varying DEFAULT 'https://www.instagram.com/herkingdom_jewelry/'::character varying,
  footer_tiktok character varying DEFAULT 'https://www.tiktok.com/@herkingdom_jewelry'::character varying,
  footer_twitter character varying,
  footer_open_hours character varying DEFAULT 'Mon - Sun: 8AM - 8PM'::character varying,
  footer_dispatch_days character varying DEFAULT 'Tuesdays & Fridays'::character varying,
  copyright_text character varying DEFAULT '© 2026 Her Kingdom. All rights reserved.'::character varying,
  show_privacy_policy boolean DEFAULT true,
  show_terms boolean DEFAULT true,
  show_refund_policy boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 21. ANALYTICS EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_type character varying NOT NULL,
  event_data jsonb,
  product_id uuid,
  session_id character varying,
  ip_address character varying,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  customer_id uuid,
  order_id uuid,
  metadata jsonb,
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT analytics_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT analytics_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- ============================================================
-- 22. PAGE VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  referrer text,
  user_agent text,
  device_type text DEFAULT 'desktop'::text,
  browser text,
  country text,
  created_at timestamp with time zone DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  visitor_id text,
  is_returning boolean DEFAULT false,
  language text,
  CONSTRAINT page_views_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 23. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action character varying NOT NULL,
  table_name character varying,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- ============================================================
-- 24. POLICIES (Privacy, Terms, Refund, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.policies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  meta_title text,
  meta_description text,
  meta_keywords text,
  is_published boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT policies_pkey PRIMARY KEY (id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock) WHERE in_stock = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_is_on_offer ON public.products(is_on_offer) WHERE is_on_offer = true;
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_product ON public.product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON public.orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_product ON public.analytics_events(product_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_shipments_order ON public.order_shipments(order_id);

-- ============================================================
-- SEED: Default site settings row
-- ============================================================
INSERT INTO public.site_settings (id) VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Default delivery locations for Kenya
-- ============================================================
INSERT INTO public.delivery_locations (name, fee, estimated_days, is_active, sort_order) VALUES
  ('Nairobi CBD', 200, '1-2 days', true, 1),
  ('Nairobi - Westlands, Kilimani, Lavington', 250, '1-2 days', true, 2),
  ('Nairobi - Karen, Langata, South B/C', 300, '1-2 days', true, 3),
  ('Nairobi - Eastlands, Embakasi, Utawala', 300, '1-2 days', true, 4),
  ('Nairobi - Kasarani, Roysambu, Thika Road', 300, '1-2 days', true, 5),
  ('Thika / Ruiru / Juja', 350, '2-3 days', true, 6),
  ('Machakos / Kitengela / Athi River', 350, '2-3 days', true, 7),
  ('Mombasa', 400, '3-5 days', true, 8),
  ('Kisumu', 400, '3-5 days', true, 9),
  ('Nakuru', 350, '2-4 days', true, 10),
  ('Eldoret', 400, '3-5 days', true, 11),
  ('Rest of Kenya', 450, '3-7 days', true, 12)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Sample jewelry categories
-- ============================================================
INSERT INTO public.categories (name, slug, description, sort_order, is_active) VALUES
  ('Necklaces', 'necklaces', 'Curated chain necklaces, pendants, layered necklaces & chokers', 1, true),
  ('Jewelry Sets', 'necklace-sets', 'Matching necklace and earring sets for a complete look', 2, true),
  ('Bracelets', 'bracelets', 'Charm bracelets, bangles, cuffs & beaded bracelets', 3, true),
  ('Earrings', 'earrings', 'Stud earrings, hoops, drop earrings & statement pieces', 4, true),
  ('Women''s Watches', 'women-watches', 'Elegant women''s watches for every occasion', 5, true),
  ('Men''s Watches', 'men-watches', 'Stylish men''s watches and timepieces', 6, true),
  ('Men''s Necklaces', 'men-necklaces', 'Men''s chain necklaces and pendants', 7, true),
  ('Handbags & Purses', 'handbags-purses', 'Curated handbags, clutches and purses', 8, true),
  ('Sunglasses', 'sunglasses', 'Women''s and men''s sunglasses', 9, true),
  ('Men''s Sunglasses', 'men-sunglasses', 'Stylish men''s sunglasses for every occasion', 15, true),
  ('Scarves & Shawls', 'scarves-shawls', 'Elegant scarves, shawls and ponchos', 10, true),
  ('Perfume & Scents', 'perfume-scents', 'Curated fragrances and scents', 11, true),
  ('Gift Packages', 'gift-packages', 'Ready-made gift boxes for every occasion', 12, true),
  ('Flowers', 'flowers', 'Beautiful flower arrangements and bouquets', 13, true),
  ('Add-Ons', 'add-ons', 'Complementary items and accessories', 14, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: Sample tags for jewelry products
-- ============================================================
INSERT INTO public.tags (name, slug) VALUES
  ('New Arrival', 'new-arrival'),
  ('Best Seller', 'best-seller'),
  ('Trending', 'trending'),
  ('Gift Idea', 'gift-idea'),
  ('Hypoallergenic', 'hypoallergenic'),
  ('Gold Plated', 'gold-plated'),
  ('Silver', 'silver'),
  ('Pearl', 'pearl'),
  ('Statement', 'statement'),
  ('Minimalist', 'minimalist'),
  ('Vintage', 'vintage'),
  ('Bridal', 'bridal'),
  ('Everyday', 'everyday'),
  ('Luxury', 'luxury'),
  ('Valentine', 'valentine'),
  ('Birthday', 'birthday'),
  ('Anniversary', 'anniversary')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: Sample navbar offers
-- ============================================================
INSERT INTO public.navbar_offers (text, is_active, sort_order) VALUES
  ('Free delivery on orders over KSh 5,000!', true, 1),
  ('New jewelry pieces added every week!', true, 2),
  ('WhatsApp us: 0780 406 059 for custom orders', true, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Update Women's Watches category image
-- ============================================================
UPDATE public.categories
SET image_url = '/categories/women-watches.jpeg'
WHERE slug = 'women-watches';

-- ============================================================
-- SEED: Women's Watches products
-- ============================================================
DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_everyday uuid;
  tag_luxury uuid;
  tag_gold_plated uuid;
BEGIN
  -- Get the Women's Watches category ID
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'women-watches';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_gold_plated FROM public.tags WHERE slug = 'gold-plated';

  IF cat_id IS NOT NULL THEN

    -- 1. Poedagar Rose Gold Watch - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Poedagar Rose Gold Watch',
      'poedagar-rose-gold-watch',
      'Elegant Poedagar rose gold watch with a white textured dial, day and date display. Comes in a premium gift box with international guarantee.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/women-watches/poedagar-rose-gold-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/poedagar-rose-gold-watch.jpeg', 'Poedagar Rose Gold Watch', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 2. Rose Gold Mini Chain Watch - KSh 850
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Rose Gold Mini Chain Watch',
      'rose-gold-mini-chain-watch',
      'Petite rose gold watch with a rose gold dial and Roman numeral markers. Delicate chain link bracelet band for a feminine look.',
      850, 1000, cat_id, true, true, 15, true, true, 'women',
      ARRAY['/images/products/women-watches/rose-gold-mini-chain-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/rose-gold-mini-chain-watch.jpeg', 'Rose Gold Mini Chain Watch', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 3. Naviforce Rose Gold Floral Watch - KSh 850
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Naviforce Rose Gold Floral Watch',
      'naviforce-rose-gold-floral-watch',
      'Beautiful Naviforce rose gold mesh band watch with 3D white floral dial design and crystal hour markers. A statement piece for any outfit.',
      850, 1000, cat_id, true, true, 15, true, false, 'women',
      ARRAY['/images/products/women-watches/naviforce-rose-gold-floral-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/naviforce-rose-gold-floral-watch.jpeg', 'Naviforce Rose Gold Floral Watch', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 4. Gold Flower Bracelet Watch - KSh 550
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Gold Flower Bracelet Watch',
      'gold-flower-bracelet-watch',
      'Delicate gold-tone watch with a matching flower chain bracelet band and gold dial. A charming vintage-inspired timepiece.',
      550, 700, cat_id, false, true, 21, true, false, 'women',
      ARRAY['/images/products/women-watches/gold-flower-bracelet-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/gold-flower-bracelet-watch.jpeg', 'Gold Flower Bracelet Watch', 0, true);
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 5. Gold Pearl Bracelet Watch - KSh 550
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Gold Pearl Bracelet Watch',
      'gold-pearl-bracelet-watch',
      'Elegant gold-tone watch with pearl-adorned bracelet band and white octagonal dial. A timeless accessory for special occasions.',
      550, 700, cat_id, false, true, 21, true, false, 'women',
      ARRAY['/images/products/women-watches/gold-pearl-bracelet-watch.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/women-watches/gold-pearl-bracelet-watch.jpeg', 'Gold Pearl Bracelet Watch', 0, true);
      IF tag_gold_plated IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gold_plated) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

  END IF;
END $$;

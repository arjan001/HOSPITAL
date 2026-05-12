-- ============================================================
-- Her Kingdom - Gift Items Module + Orders Module Additions
-- Stores admin-managed gift add-ons, gift wrapping options, and
-- greeting cards shown in the checkout gift modal, and extends
-- the orders table so the checkout can persist special order
-- instructions and the full gifting selection (add-ons, wraps,
-- greeting cards, card messages) alongside the order.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. Gift items (admin managed catalogue shown in the modal)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gift_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category character varying NOT NULL,
  -- one of: 'addon', 'gift_wrap', 'greeting_card'
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gift_items_pkey PRIMARY KEY (id),
  CONSTRAINT gift_items_category_check CHECK (category IN ('addon','gift_wrap','greeting_card'))
);

CREATE INDEX IF NOT EXISTS gift_items_category_idx ON public.gift_items (category);
CREATE INDEX IF NOT EXISTS gift_items_active_idx ON public.gift_items (is_active);

-- Optional seed data so the modal has something to show on first run.
INSERT INTO public.gift_items (category, name, price, image_url, sort_order)
SELECT 'gift_wrap', 'Gift Box Ribbon Bow', 100, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'gift_wrap' AND name = 'Gift Box Ribbon Bow');

INSERT INTO public.gift_items (category, name, price, image_url, sort_order)
SELECT 'greeting_card', 'Amazing Friend Card', 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Amazing Friend Card');

-- ------------------------------------------------------------
-- 2. Orders module additions
-- ------------------------------------------------------------
-- These columns capture everything collected from the new
-- checkout surfaces (special instructions textarea + gift
-- options modal) so fulfilment staff see the exact requests
-- the shopper made. `gift_selection` stores the full modal
-- payload as JSON so add-ons, wraps, greeting cards with
-- their per-card messages and the free-form sender/recipient/
-- note are all retained verbatim.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS special_instructions text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_gift boolean DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gift_selection jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gift_extras_total numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_is_gift ON public.orders(is_gift) WHERE is_gift = true;

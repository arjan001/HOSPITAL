-- ============================================================
-- Her Kingdom - Greeting Cards Seed Data (Gift Items Module)
-- ============================================================
-- Seeds 16 greeting cards into the `gift_items` table under the
-- 'greeting_card' category so they appear in the admin Gifts
-- module and in the checkout gift modal's Greeting Cards tab.
--
-- Images live in /public/images/products/gift-cards/ and are
-- referenced by their absolute public paths (same pattern as
-- the other seed scripts in this folder, e.g. 010_seed_add_ons).
--
-- Price range: KSh 150 - KSh 250.
-- Re-running is safe: rows are matched on (category, name) and
-- updated in place rather than duplicated.
-- ============================================================
-- Run this in the Supabase SQL Editor after 020_gift_items_schema.sql
-- ============================================================

DO $$
DECLARE
  v_id uuid;
BEGIN

  -- 1. XOXO Love Notes Card — KSh 200
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'XOXO Love Notes Card',
         'Bold fuchsia-and-tangerine brushstroke card with a gold ''xoxo'' script — a modern kiss-and-hug note for birthdays, anniversaries and just-because moments.',
         200, '/images/products/gift-cards/xoxo-love-notes.jpg', true, 1
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'XOXO Love Notes Card');

  UPDATE public.gift_items
     SET description = 'Bold fuchsia-and-tangerine brushstroke card with a gold ''xoxo'' script — a modern kiss-and-hug note for birthdays, anniversaries and just-because moments.',
         price = 200,
         image_url = '/images/products/gift-cards/xoxo-love-notes.jpg',
         is_active = true,
         sort_order = 1,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'XOXO Love Notes Card';

  -- 2. Baby Reveal Moment Card — KSh 220
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Baby Reveal Moment Card',
         'Pastel lilac ''Baby Reveal'' card with glittering blue and pink heart balloons — the sweetest way to share ''Blue or Pink, what do we think?''',
         220, '/images/products/gift-cards/baby-reveal-moment.jpg', true, 2
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Baby Reveal Moment Card');

  UPDATE public.gift_items
     SET description = 'Pastel lilac ''Baby Reveal'' card with glittering blue and pink heart balloons — the sweetest way to share ''Blue or Pink, what do we think?''',
         price = 220,
         image_url = '/images/products/gift-cards/baby-reveal-moment.jpg',
         is_active = true,
         sort_order = 2,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Baby Reveal Moment Card';

  -- 3. Sunset Thank You Card — KSh 150
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Sunset Thank You Card',
         'A warm watercolour ''Thank You'' in painterly orange and coral brushstrokes — gratitude made bright, perfect for teachers, friends and every kind gesture.',
         150, '/images/products/gift-cards/sunset-thank-you.webp', true, 3
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Sunset Thank You Card');

  UPDATE public.gift_items
     SET description = 'A warm watercolour ''Thank You'' in painterly orange and coral brushstrokes — gratitude made bright, perfect for teachers, friends and every kind gesture.',
         price = 150,
         image_url = '/images/products/gift-cards/sunset-thank-you.webp',
         is_active = true,
         sort_order = 3,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Sunset Thank You Card';

  -- 4. 365 Days Of Us Anniversary Card — KSh 230
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         '365 Days Of Us Anniversary Card',
         'A cheeky peach-toned A6 card reading ''Happy 365 Days Of Putting Up With Me'' — an honest, funny anniversary love note for the one who stays.',
         230, '/images/products/gift-cards/365-days-anniversary.jpg', true, 4
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = '365 Days Of Us Anniversary Card');

  UPDATE public.gift_items
     SET description = 'A cheeky peach-toned A6 card reading ''Happy 365 Days Of Putting Up With Me'' — an honest, funny anniversary love note for the one who stays.',
         price = 230,
         image_url = '/images/products/gift-cards/365-days-anniversary.jpg',
         is_active = true,
         sort_order = 4,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = '365 Days Of Us Anniversary Card';

  -- 5. Have A Special Day Floral Card — KSh 180
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Have A Special Day Floral Card',
         'Deep aubergine A6 card framed with hand-painted orchids and cream script — a soft, elegant ''Have A Special Day'' for birthdays and milestones.',
         180, '/images/products/gift-cards/have-a-special-day.jpg', true, 5
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Have A Special Day Floral Card');

  UPDATE public.gift_items
     SET description = 'Deep aubergine A6 card framed with hand-painted orchids and cream script — a soft, elegant ''Have A Special Day'' for birthdays and milestones.',
         price = 180,
         image_url = '/images/products/gift-cards/have-a-special-day.jpg',
         is_active = true,
         sort_order = 5,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Have A Special Day Floral Card';

  -- 6. Really Really Love You Card — KSh 190
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Really Really Love You Card',
         'Minimal white card with a cluster of rose-pink hearts forming a heart shape and the line ''I just really really love you'' in hand-script — simple, heartfelt, unmistakable.',
         190, '/images/products/gift-cards/really-really-love-you.webp', true, 6
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Really Really Love You Card');

  UPDATE public.gift_items
     SET description = 'Minimal white card with a cluster of rose-pink hearts forming a heart shape and the line ''I just really really love you'' in hand-script — simple, heartfelt, unmistakable.',
         price = 190,
         image_url = '/images/products/gift-cards/really-really-love-you.webp',
         is_active = true,
         sort_order = 6,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Really Really Love You Card';

  -- 7. Always Love You Songbook Card — KSh 250
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Always Love You Songbook Card',
         'Hot-pink scannable songbook card with gold foil ''I will always love you'' and a ''Scan Me To Stream This Song'' QR for Whitney Houston''s classic — music-meets-paper romance.',
         250, '/images/products/gift-cards/always-love-you-songbook.webp', true, 7
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Always Love You Songbook Card');

  UPDATE public.gift_items
     SET description = 'Hot-pink scannable songbook card with gold foil ''I will always love you'' and a ''Scan Me To Stream This Song'' QR for Whitney Houston''s classic — music-meets-paper romance.',
         price = 250,
         image_url = '/images/products/gift-cards/always-love-you-songbook.webp',
         is_active = true,
         sort_order = 7,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Always Love You Songbook Card';

  -- 8. Mimi Ni Fan Wako Card — KSh 170
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Mimi Ni Fan Wako Card',
         'A playful lavender Swahili pun card — ''Mimi Ni Fan Wako'' (I''m Your Fan) illustrated with a smiling table fan. A sweet, locally-flavoured way to say ''I''m rooting for you''.',
         170, '/images/products/gift-cards/mimi-ni-fan-wako.webp', true, 8
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Mimi Ni Fan Wako Card');

  UPDATE public.gift_items
     SET description = 'A playful lavender Swahili pun card — ''Mimi Ni Fan Wako'' (I''m Your Fan) illustrated with a smiling table fan. A sweet, locally-flavoured way to say ''I''m rooting for you''.',
         price = 170,
         image_url = '/images/products/gift-cards/mimi-ni-fan-wako.webp',
         is_active = true,
         sort_order = 8,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Mimi Ni Fan Wako Card';

  -- 9. Nakumiss Pig-Time Card — KSh 170
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Nakumiss Pig-Time Card',
         'Pink-gingham ''Nakumiss Pig-Time!'' card — a Swahili-English miss-you pun with a shy little cartoon pig and floating hearts. For when distance calls for something cheeky.',
         170, '/images/products/gift-cards/nakumiss-pig-time.webp', true, 9
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Nakumiss Pig-Time Card');

  UPDATE public.gift_items
     SET description = 'Pink-gingham ''Nakumiss Pig-Time!'' card — a Swahili-English miss-you pun with a shy little cartoon pig and floating hearts. For when distance calls for something cheeky.',
         price = 170,
         image_url = '/images/products/gift-cards/nakumiss-pig-time.webp',
         is_active = true,
         sort_order = 9,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Nakumiss Pig-Time Card';

  -- 10. OMG It's Your Day Card — KSh 150
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'OMG It''s Your Day Card',
         'Blush-pink A6 speech-bubble card packed with ''It''s Your Day — OMG! Legendary! Awesome! Hooray!'' — confetti-energy in card form, built for birthdays and big wins.',
         150, '/images/products/gift-cards/omg-its-your-day.webp', true, 10
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'OMG It''s Your Day Card');

  UPDATE public.gift_items
     SET description = 'Blush-pink A6 speech-bubble card packed with ''It''s Your Day — OMG! Legendary! Awesome! Hooray!'' — confetti-energy in card form, built for birthdays and big wins.',
         price = 150,
         image_url = '/images/products/gift-cards/omg-its-your-day.webp',
         is_active = true,
         sort_order = 10,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'OMG It''s Your Day Card';

  -- 11. Sunshine Of My Life Card — KSh 250
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Sunshine Of My Life Card',
         'Peach card with shimmering gold-foil lyrics ''You are the sunshine of my life'' and a scan-to-stream QR for Stevie Wonder''s anthem — a sunlit romantic classic.',
         250, '/images/products/gift-cards/sunshine-of-my-life.webp', true, 11
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Sunshine Of My Life Card');

  UPDATE public.gift_items
     SET description = 'Peach card with shimmering gold-foil lyrics ''You are the sunshine of my life'' and a scan-to-stream QR for Stevie Wonder''s anthem — a sunlit romantic classic.',
         price = 250,
         image_url = '/images/products/gift-cards/sunshine-of-my-life.webp',
         is_active = true,
         sort_order = 11,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Sunshine Of My Life Card';

  -- 12. Never Gonna Give You Up Card — KSh 240
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Never Gonna Give You Up Card',
         'Bubble-gum pink card with bold gold-foil ''Never gonna give you up'' lyrics and a stream-this-song QR for Rick Astley — a loyal, playful love-note card.',
         240, '/images/products/gift-cards/never-gonna-give-you-up.webp', true, 12
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Never Gonna Give You Up Card');

  UPDATE public.gift_items
     SET description = 'Bubble-gum pink card with bold gold-foil ''Never gonna give you up'' lyrics and a stream-this-song QR for Rick Astley — a loyal, playful love-note card.',
         price = 240,
         image_url = '/images/products/gift-cards/never-gonna-give-you-up.webp',
         is_active = true,
         sort_order = 12,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Never Gonna Give You Up Card';

  -- 13. Sometimes Words Are Not Enough Card — KSh 210
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Sometimes Words Are Not Enough Card',
         'Quiet cream card with delicate dandelion seeds scattering on the breeze and the line ''Sometimes words are not enough'' — a tender sympathy and thinking-of-you card.',
         210, '/images/products/gift-cards/sometimes-words-not-enough.webp', true, 13
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Sometimes Words Are Not Enough Card');

  UPDATE public.gift_items
     SET description = 'Quiet cream card with delicate dandelion seeds scattering on the breeze and the line ''Sometimes words are not enough'' — a tender sympathy and thinking-of-you card.',
         price = 210,
         image_url = '/images/products/gift-cards/sometimes-words-not-enough.webp',
         is_active = true,
         sort_order = 13,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Sometimes Words Are Not Enough Card';

  -- 14. New Mum Cheers Card — KSh 200
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'New Mum Cheers Card',
         'Soft-pink illustrated card of two hands clinking a baby bottle and a wine glass with the line ''To a new mum, you''re doing great'' — celebratory, real and warm.',
         200, '/images/products/gift-cards/new-mum-cheers.webp', true, 14
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'New Mum Cheers Card');

  UPDATE public.gift_items
     SET description = 'Soft-pink illustrated card of two hands clinking a baby bottle and a wine glass with the line ''To a new mum, you''re doing great'' — celebratory, real and warm.',
         price = 200,
         image_url = '/images/products/gift-cards/new-mum-cheers.webp',
         is_active = true,
         sort_order = 14,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'New Mum Cheers Card';

  -- 15. Happy Anniversary Assorted Box — KSh 250
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Happy Anniversary Assorted Box',
         'Kraft-box set of 8 mixed-occasion cards with envelopes — featured holographic ''Happy Anniversary'' design on the cover. A ready-to-go stash for weddings, birthdays and thank-yous.',
         250, '/images/products/gift-cards/happy-anniversary-assorted-box.webp', true, 15
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Happy Anniversary Assorted Box');

  UPDATE public.gift_items
     SET description = 'Kraft-box set of 8 mixed-occasion cards with envelopes — featured holographic ''Happy Anniversary'' design on the cover. A ready-to-go stash for weddings, birthdays and thank-yous.',
         price = 250,
         image_url = '/images/products/gift-cards/happy-anniversary-assorted-box.webp',
         is_active = true,
         sort_order = 15,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Happy Anniversary Assorted Box';

  -- 16. Women Like You Card — KSh 200
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Women Like You Card',
         'Cream card with a silhouette of many diverse women and the quote ''The world needs more Women like you'' — a celebration card for the sisters, mothers and mentors in your life.',
         200, '/images/products/gift-cards/women-like-you.webp', true, 16
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Women Like You Card');

  UPDATE public.gift_items
     SET description = 'Cream card with a silhouette of many diverse women and the quote ''The world needs more Women like you'' — a celebration card for the sisters, mothers and mentors in your life.',
         price = 200,
         image_url = '/images/products/gift-cards/women-like-you.webp',
         is_active = true,
         sort_order = 16,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Women Like You Card';

  -- Retire the placeholder row seeded by 020_gift_items_schema.sql
  -- so it is not shown alongside the real cards. Safe if it is missing.
  UPDATE public.gift_items
     SET is_active = false,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Amazing Friend Card';

  RAISE NOTICE 'Success: 16 greeting cards seeded into gift_items (category = greeting_card).';
END $$;

-- ============================================================
-- Her Kingdom - Greeting Cards Seed Data (Extra batch)
-- ============================================================
-- Extends the `gift_items` catalogue (category = 'greeting_card')
-- with 16 more unique cards that were uploaded as a follow-up
-- to 021_seed_greeting_cards.sql.
--
-- Images live in /public/images/products/gift-cards/ and are
-- referenced by their absolute public paths, same pattern as
-- the sibling seed scripts.
--
-- Price range: KSh 150 - KSh 250 (varied across the band).
-- sort_order continues from 17 so these cards appear after the
-- first batch in the admin Gifts grid and checkout modal.
-- Re-running is safe: rows are matched on (category, name) and
-- updated in place rather than duplicated.
-- ============================================================
-- Run this in the Supabase SQL Editor after
-- 021_seed_greeting_cards.sql has been applied.
-- ============================================================

DO $$
BEGIN

  -- 17. Hello Sweet Baby Card - KSh 210
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Hello Sweet Baby Card',
         'Vibrant watercolour confetti card in fuchsia, sunshine yellow and electric blue bursts — a joyful ''Hello Sweet Baby!'' welcome for any nursery, gender-neutral and full of life.',
         210, '/images/products/gift-cards/hello-sweet-baby.jpg', true, 17
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Hello Sweet Baby Card');

  UPDATE public.gift_items
     SET description = 'Vibrant watercolour confetti card in fuchsia, sunshine yellow and electric blue bursts — a joyful ''Hello Sweet Baby!'' welcome for any nursery, gender-neutral and full of life.',
         price = 210,
         image_url = '/images/products/gift-cards/hello-sweet-baby.jpg',
         is_active = true,
         sort_order = 17,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Hello Sweet Baby Card';

  -- 18. Little Note Of Thanks Card - KSh 180
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Little Note Of Thanks Card',
         'Deep teal A6 card bordered by hand-painted tropical blooms with a chunky white ''A Little Note Of Thanks!'' headline — a warm, botanical thank-you that feels handwritten.',
         180, '/images/products/gift-cards/little-note-of-thanks.jpg', true, 18
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Little Note Of Thanks Card');

  UPDATE public.gift_items
     SET description = 'Deep teal A6 card bordered by hand-painted tropical blooms with a chunky white ''A Little Note Of Thanks!'' headline — a warm, botanical thank-you that feels handwritten.',
         price = 180,
         image_url = '/images/products/gift-cards/little-note-of-thanks.jpg',
         is_active = true,
         sort_order = 18,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Little Note Of Thanks Card';

  -- 19. Cute Butt Obviously Card - KSh 200
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Cute Butt Obviously Card',
         'Minimalist white card with a scribbled red heart and the cheeky line ''I''m only in this for your Cute Butt, obviously!'' — a playful, no-filter love card for the one who gets the joke.',
         200, '/images/products/gift-cards/cute-butt-obviously.webp', true, 19
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Cute Butt Obviously Card');

  UPDATE public.gift_items
     SET description = 'Minimalist white card with a scribbled red heart and the cheeky line ''I''m only in this for your Cute Butt, obviously!'' — a playful, no-filter love card for the one who gets the joke.',
         price = 200,
         image_url = '/images/products/gift-cards/cute-butt-obviously.webp',
         is_active = true,
         sort_order = 19,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Cute Butt Obviously Card';

  -- 20. Hello Baby Boy Giraffe Card - KSh 220
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Hello Baby Boy Giraffe Card',
         'Dreamy powder-blue card with fluffy clouds and a wide-eyed baby giraffe holding a balloon that reads ''Hello Baby Boy'' — a gentle, storybook welcome card for the new little man.',
         220, '/images/products/gift-cards/hello-baby-boy.webp', true, 20
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Hello Baby Boy Giraffe Card');

  UPDATE public.gift_items
     SET description = 'Dreamy powder-blue card with fluffy clouds and a wide-eyed baby giraffe holding a balloon that reads ''Hello Baby Boy'' — a gentle, storybook welcome card for the new little man.',
         price = 220,
         image_url = '/images/products/gift-cards/hello-baby-boy.webp',
         is_active = true,
         sort_order = 20,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Hello Baby Boy Giraffe Card';

  -- 21. Hello Baby Girl Elephant Card - KSh 220
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Hello Baby Girl Elephant Card',
         'Blush-pink sky card with a sweet little elephant in a bow holding a ''Hello Baby Girl'' balloon — a soft, nursery-perfect welcome for the new little lady.',
         220, '/images/products/gift-cards/hello-baby-girl.webp', true, 21
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Hello Baby Girl Elephant Card');

  UPDATE public.gift_items
     SET description = 'Blush-pink sky card with a sweet little elephant in a bow holding a ''Hello Baby Girl'' balloon — a soft, nursery-perfect welcome for the new little lady.',
         price = 220,
         image_url = '/images/products/gift-cards/hello-baby-girl.webp',
         is_active = true,
         sort_order = 21,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Hello Baby Girl Elephant Card';

  -- 22. Love Hearts Duo Foil Card - KSh 240
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Love Hearts Duo Foil Card',
         'Heart-shaped die-cut card with two overlapping crimson hearts edged in gold foil and a shower of sparkling hearts across the front — an unmistakably romantic Valentine''s and anniversary choice.',
         240, '/images/products/gift-cards/love-hearts-duo.webp', true, 22
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Love Hearts Duo Foil Card');

  UPDATE public.gift_items
     SET description = 'Heart-shaped die-cut card with two overlapping crimson hearts edged in gold foil and a shower of sparkling hearts across the front — an unmistakably romantic Valentine''s and anniversary choice.',
         price = 240,
         image_url = '/images/products/gift-cards/love-hearts-duo.webp',
         is_active = true,
         sort_order = 22,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Love Hearts Duo Foil Card';

  -- 23. My Man My Man My Mannn Card - KSh 190
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'My Man My Man My Mannn Card',
         'Baby-blue card with a blushing cartoon mochi character and the lyrical ''My Man, My Man, My Mannn!'' — a sweet, giggly love note for him with big cartoon energy.',
         190, '/images/products/gift-cards/my-man-my-man.webp', true, 23
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'My Man My Man My Mannn Card');

  UPDATE public.gift_items
     SET description = 'Baby-blue card with a blushing cartoon mochi character and the lyrical ''My Man, My Man, My Mannn!'' — a sweet, giggly love note for him with big cartoon energy.',
         price = 190,
         image_url = '/images/products/gift-cards/my-man-my-man.webp',
         is_active = true,
         sort_order = 23,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'My Man My Man My Mannn Card';

  -- 24. Secret Admirer Card - KSh 200
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Secret Admirer Card',
         'Soft-pink A6 card with a bold crimson question mark that reveals the words ''Secret Admirer'' and a trail of tiny hearts floating across the page — flirty, mysterious, perfect for an anonymous note.',
         200, '/images/products/gift-cards/secret-admirer.jpg', true, 24
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Secret Admirer Card');

  UPDATE public.gift_items
     SET description = 'Soft-pink A6 card with a bold crimson question mark that reveals the words ''Secret Admirer'' and a trail of tiny hearts floating across the page — flirty, mysterious, perfect for an anonymous note.',
         price = 200,
         image_url = '/images/products/gift-cards/secret-admirer.jpg',
         is_active = true,
         sort_order = 24,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Secret Admirer Card';

  -- 25. Going To Be OK Wildflower Card - KSh 180
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Going To Be OK Wildflower Card',
         'Cream card with a hand-painted wildflower bouquet in a ribbed vase and the honest line ''It might be shitty now but it''s going to be ok'' — a real, grown-up sympathy and encouragement card.',
         180, '/images/products/gift-cards/going-to-be-ok-sympathy.webp', true, 25
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Going To Be OK Wildflower Card');

  UPDATE public.gift_items
     SET description = 'Cream card with a hand-painted wildflower bouquet in a ribbed vase and the honest line ''It might be shitty now but it''s going to be ok'' — a real, grown-up sympathy and encouragement card.',
         price = 180,
         image_url = '/images/products/gift-cards/going-to-be-ok-sympathy.webp',
         is_active = true,
         sort_order = 25,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Going To Be OK Wildflower Card';

  -- 26. One I Love To Annoy Card - KSh 170
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'One I Love To Annoy Card',
         'Pastel pink A6 card with bold hot-pink bubble letters reading ''You''re the One I Love'' and the quieter kicker ''to annoy the most'' — a cheeky, real-couple love note with a wink.',
         170, '/images/products/gift-cards/one-i-love-annoy.jpg', true, 26
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'One I Love To Annoy Card');

  UPDATE public.gift_items
     SET description = 'Pastel pink A6 card with bold hot-pink bubble letters reading ''You''re the One I Love'' and the quieter kicker ''to annoy the most'' — a cheeky, real-couple love note with a wink.',
         price = 170,
         image_url = '/images/products/gift-cards/one-i-love-annoy.jpg',
         is_active = true,
         sort_order = 26,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'One I Love To Annoy Card';

  -- 27. Thinking Of You Script Card - KSh 160
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Thinking Of You Script Card',
         'Clean white card with flowing black hand-calligraphy ''Thinking Of You'' flanked by tiny red hearts and a gold accent — timeless, understated and appropriate for any moment that calls for presence.',
         160, '/images/products/gift-cards/thinking-of-you.jpeg', true, 27
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Thinking Of You Script Card');

  UPDATE public.gift_items
     SET description = 'Clean white card with flowing black hand-calligraphy ''Thinking Of You'' flanked by tiny red hearts and a gold accent — timeless, understated and appropriate for any moment that calls for presence.',
         price = 160,
         image_url = '/images/products/gift-cards/thinking-of-you.jpeg',
         is_active = true,
         sort_order = 27,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Thinking Of You Script Card';

  -- 28. Unpaid Therapist Thank You Card - KSh 200
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Unpaid Therapist Thank You Card',
         'White card with bold halftone type reading ''Thanks For Being My Unpaid Therapist'' in teal, with the ''i'' in therapist swapped for a red-and-white pill — a funny, deeply-meant thank-you for the friend who listens to everything.',
         200, '/images/products/gift-cards/unpaid-therapist.webp', true, 28
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Unpaid Therapist Thank You Card');

  UPDATE public.gift_items
     SET description = 'White card with bold halftone type reading ''Thanks For Being My Unpaid Therapist'' in teal, with the ''i'' in therapist swapped for a red-and-white pill — a funny, deeply-meant thank-you for the friend who listens to everything.',
         price = 200,
         image_url = '/images/products/gift-cards/unpaid-therapist.webp',
         is_active = true,
         sort_order = 28,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Unpaid Therapist Thank You Card';

  -- 29. More Women Like You Watercolour Card - KSh 210
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'More Women Like You Watercolour Card',
         'White card washed with a soft pink watercolour brushstroke and the sweeping script ''The World Needs More Women Like You'' — a graceful compliment card for the women who change rooms just by walking in.',
         210, '/images/products/gift-cards/women-like-you-watercolour.webp', true, 29
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'More Women Like You Watercolour Card');

  UPDATE public.gift_items
     SET description = 'White card washed with a soft pink watercolour brushstroke and the sweeping script ''The World Needs More Women Like You'' — a graceful compliment card for the women who change rooms just by walking in.',
         price = 210,
         image_url = '/images/products/gift-cards/women-like-you-watercolour.webp',
         is_active = true,
         sort_order = 29,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'More Women Like You Watercolour Card';

  -- 30. XOXO Love You Lots Card - KSh 190
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'XOXO Love You Lots Card',
         'White A6 card with playful rose-and-coral ''XOXO'' block lettering (hearts tucked inside the Os) and a sweeping ''Love You Lots'' signature — a crisp, modern kiss-and-hug note.',
         190, '/images/products/gift-cards/xoxo-love-you-lots.webp', true, 30
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'XOXO Love You Lots Card');

  UPDATE public.gift_items
     SET description = 'White A6 card with playful rose-and-coral ''XOXO'' block lettering (hearts tucked inside the Os) and a sweeping ''Love You Lots'' signature — a crisp, modern kiss-and-hug note.',
         price = 190,
         image_url = '/images/products/gift-cards/xoxo-love-you-lots.webp',
         is_active = true,
         sort_order = 30,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'XOXO Love You Lots Card';

  -- 31. Yay It's Your Day Card - KSh 170
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'Yay It''s Your Day Card',
         'Electric-blue party card scattered with doodled stars and a stacked ''YAY ITS YOUR DAY'' in punchy yellow 3D letters — a loud, happy birthday card with full confetti energy.',
         170, '/images/products/gift-cards/yay-its-your-day.webp', true, 31
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'Yay It''s Your Day Card');

  UPDATE public.gift_items
     SET description = 'Electric-blue party card scattered with doodled stars and a stacked ''YAY ITS YOUR DAY'' in punchy yellow 3D letters — a loud, happy birthday card with full confetti energy.',
         price = 170,
         image_url = '/images/products/gift-cards/yay-its-your-day.webp',
         is_active = true,
         sort_order = 31,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Yay It''s Your Day Card';

  -- 32. You Are A Classic Card - KSh 230
  INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
  SELECT 'greeting_card',
         'You Are A Classic Card',
         'Mustard-yellow A6 card with a hand-illustrated vintage saloon car and the tagline ''You Are A Classic'' — a retro, sharp-dressed compliment card for the timeless one in your life.',
         230, '/images/products/gift-cards/you-are-a-classic.webp', true, 32
  WHERE NOT EXISTS (SELECT 1 FROM public.gift_items WHERE category = 'greeting_card' AND name = 'You Are A Classic Card');

  UPDATE public.gift_items
     SET description = 'Mustard-yellow A6 card with a hand-illustrated vintage saloon car and the tagline ''You Are A Classic'' — a retro, sharp-dressed compliment card for the timeless one in your life.',
         price = 230,
         image_url = '/images/products/gift-cards/you-are-a-classic.webp',
         is_active = true,
         sort_order = 32,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'You Are A Classic Card';

  RAISE NOTICE 'Success: 16 additional greeting cards seeded into gift_items (category = greeting_card). Total catalogue now 32 cards.';
END $$;

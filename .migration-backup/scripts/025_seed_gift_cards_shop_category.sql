-- ============================================================
-- Her Kingdom - Gift Cards Shop Category + Products Seed
-- ============================================================
-- Promotes the 33 greeting cards from the checkout "Is this a gift?"
-- modal (gift_items where category = 'greeting_card') into a full
-- shoppable "Gift Cards" category on the storefront.
--
-- What this script does:
--   1. Ensures the "Gift Cards" category exists (slug: gift-cards)
--      with a proper category image so both the shop grid thumbnail
--      AND the category breadcrumb hero render correctly.
--   2. Seeds all 33 greeting cards into the public.products table
--      with rich, creative shop-facing descriptions, proper pricing,
--      gallery image, tags, and 'women' collection so they show up
--      on /shop?category=gift-cards.
--   3. Mirrors the richer shop description back into gift_items so
--      the checkout modal catalogue stays in sync with the product
--      catalogue (the modal itself only renders name + price -
--      descriptions are kept for the shop listing / product page).
--
-- Safe to re-run: every insert is guarded by ON CONFLICT (slug)
-- and tags / images are re-seeded idempotently.
--
-- Prerequisites: 001_herkingdom_schema.sql, 020_gift_items_schema.sql
-- and 023_seed_greeting_cards_all.sql must have been applied first
-- (the card image assets live under /public/images/products/gift-cards/).
-- ============================================================
-- Run this SQL in Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. "Gift Cards" category (image powers breadcrumb hero too)
-- ------------------------------------------------------------
INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
VALUES (
  'Gift Cards',
  'gift-cards',
  'Handcrafted greeting cards for every milestone - love notes, birthdays, anniversaries, baby reveals, thank-yous and the quiet in-between moments. Each card is a keepsake in its own right, printed on premium matte cardstock with an envelope included.',
  '/images/products/gift-cards/happy-anniversary-assorted-box.webp',
  16,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url   = EXCLUDED.image_url,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active,
  updated_at  = now();

-- ------------------------------------------------------------
-- 2. Seed all 33 greeting cards as products under the
--    "Gift Cards" category, plus product_images and tags.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_cat_id        uuid;
  v_prod_id       uuid;
  tag_gift_idea   uuid;
  tag_new_arrival uuid;
  tag_valentine   uuid;
  tag_anniversary uuid;
  tag_birthday    uuid;
  tag_trending    uuid;
  tag_best_seller uuid;
  rec             record;
BEGIN
  SELECT id INTO v_cat_id FROM public.categories WHERE slug = 'gift-cards';
  IF v_cat_id IS NULL THEN
    RAISE EXCEPTION 'Gift Cards category could not be created.';
  END IF;

  SELECT id INTO tag_gift_idea    FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_new_arrival  FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_valentine    FROM public.tags WHERE slug = 'valentine';
  SELECT id INTO tag_anniversary  FROM public.tags WHERE slug = 'anniversary';
  SELECT id INTO tag_birthday     FROM public.tags WHERE slug = 'birthday';
  SELECT id INTO tag_trending     FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_best_seller  FROM public.tags WHERE slug = 'best-seller';

  FOR rec IN
    SELECT * FROM (VALUES
      -- 1
      ('XOXO Love Notes Card', 'xoxo-love-notes-card', 200,
       'A bold fuchsia-and-tangerine brushstroke A6 card with a glimmering gold ''xoxo'' in hand-script - an unapologetically modern kiss-and-hug note. Slip it beside a bouquet, tuck it into a perfume box or let it stand on its own on her dresser. Blank inside with envelope included - perfect for birthdays, anniversaries, Valentine''s and every just-because moment.',
       '/images/products/gift-cards/xoxo-love-notes.jpg', 1,
       ARRAY['gift-idea','valentine','new-arrival','best-seller']::text[]),

      -- 2
      ('Baby Reveal Moment Card', 'baby-reveal-moment-card', 220,
       'Soft pastel lilac card sprinkled with glittering blue-and-pink heart balloons and a bold ''Baby Reveal'' headline - the prettiest way to ask ''Blue or Pink, what do we think?''. Pair it with a gender-reveal cupcake or tuck it into a nursery gift basket. Blank inside with plenty of room for a handwritten guess.',
       '/images/products/gift-cards/baby-reveal-moment.jpg', 2,
       ARRAY['gift-idea','new-arrival']::text[]),

      -- 3
      ('Sunset Thank You Card', 'sunset-thank-you-card', 150,
       'A warm watercolour ''Thank You'' painted in glowing orange and coral brushstrokes - gratitude made bright. Ideal for teachers, bridesmaids, event hosts, clients and every kind gesture that deserves more than a text. Blank inside, premium matte cardstock, envelope included.',
       '/images/products/gift-cards/sunset-thank-you.webp', 3,
       ARRAY['gift-idea','new-arrival']::text[]),

      -- 4
      ('365 Days Of Us Anniversary Card', '365-days-of-us-anniversary-card', 230,
       'Cheeky peach-toned A6 card reading ''Happy 365 Days Of Putting Up With Me'' - a refreshingly honest anniversary note for the one who stays, teases and stays anyway. Pair it with their favourite perfume or a small jewellery piece and watch them laugh-cry in real time.',
       '/images/products/gift-cards/365-days-anniversary.jpg', 4,
       ARRAY['gift-idea','anniversary']::text[]),

      -- 5
      ('Have A Special Day Floral Card', 'have-a-special-day-floral-card', 180,
       'Deep aubergine A6 card framed with hand-painted orchids and elegant cream script - a soft, grown-up ''Have A Special Day'' that works for birthdays, milestones and graduations. The kind of card someone keeps on their shelf long after the day is over.',
       '/images/products/gift-cards/have-a-special-day.jpg', 5,
       ARRAY['gift-idea','birthday']::text[]),

      -- 6
      ('Really Really Love You Card', 'really-really-love-you-card', 190,
       'Minimalist white card with a cluster of rose-pink hearts arranged into one larger heart and the hand-lettered line ''I just really really love you''. Simple, heartfelt, unmistakable - the card for the mornings you wake up knowing exactly what to say but nothing fancy enough to wrap it in.',
       '/images/products/gift-cards/really-really-love-you.webp', 6,
       ARRAY['gift-idea','valentine']::text[]),

      -- 7
      ('Always Love You Songbook Card', 'always-love-you-songbook-card', 250,
       'Hot-pink scannable songbook card with gold-foil ''I Will Always Love You'' lettering and a ''Scan Me To Stream This Song'' QR code that pulls up Whitney Houston''s classic on the spot. Music-meets-paper romance - the kind of keepsake that lives in a bedside drawer for years.',
       '/images/products/gift-cards/always-love-you-songbook.webp', 7,
       ARRAY['gift-idea','valentine','anniversary','trending']::text[]),

      -- 8
      ('Mimi Ni Fan Wako Card', 'mimi-ni-fan-wako-card', 170,
       'A playful lavender Swahili-pun card - ''Mimi Ni Fan Wako'' (I''m Your Fan) illustrated with a smiling little table fan. Locally-flavoured, sweet and instantly understood by any Kenyan who has ever cheered someone on from the sidelines. Great for graduations, promotions and everyday encouragement moments.',
       '/images/products/gift-cards/mimi-ni-fan-wako.webp', 8,
       ARRAY['gift-idea','trending']::text[]),

      -- 9
      ('Nakumiss Pig-Time Card', 'nakumiss-pig-time-card', 170,
       'Pink-gingham ''Nakumiss Pig-Time!'' card - a Swahili-English miss-you pun with a shy cartoon pig and floating hearts. For when distance calls for something cheeky rather than mushy. Slip it into a care package for anyone in campus, diaspora or just the other side of Nairobi traffic.',
       '/images/products/gift-cards/nakumiss-pig-time.webp', 9,
       ARRAY['gift-idea']::text[]),

      -- 10
      ('OMG It''s Your Day Card', 'omg-its-your-day-card', 150,
       'Blush-pink A6 speech-bubble card packed with ''It''s Your Day - OMG! Legendary! Awesome! Hooray!'' - confetti-energy compressed into paper form. Built for birthdays, big wins and ''I got the job!'' celebrations. Loud on the outside, blank inside for whatever mushy thing you''re about to write.',
       '/images/products/gift-cards/omg-its-your-day.webp', 10,
       ARRAY['gift-idea','birthday']::text[]),

      -- 11
      ('Sunshine Of My Life Card', 'sunshine-of-my-life-card', 250,
       'Peach card with shimmering gold-foil lyrics ''You Are The Sunshine Of My Life'' and a scan-to-stream QR for Stevie Wonder''s anthem. A sunlit romantic classic - for anniversaries, long-distance love, or that one person who genuinely makes mornings easier. Premium foil finish, envelope included.',
       '/images/products/gift-cards/sunshine-of-my-life.webp', 11,
       ARRAY['gift-idea','valentine','anniversary']::text[]),

      -- 12
      ('Never Gonna Give You Up Card', 'never-gonna-give-you-up-card', 240,
       'Bubble-gum pink card with bold gold-foil ''Never Gonna Give You Up'' lyrics and a stream-this-song QR for Rick Astley - a loyal, playful, mildly-trolling love note. For the partner who will 100% roll their eyes before they smile. Blank inside, envelope included.',
       '/images/products/gift-cards/never-gonna-give-you-up.webp', 12,
       ARRAY['gift-idea','valentine','trending']::text[]),

      -- 13
      ('Sometimes Words Are Not Enough Card', 'sometimes-words-are-not-enough-card', 210,
       'Quiet cream card with delicate dandelion seeds scattering on the breeze and the line ''Sometimes words are not enough''. A tender sympathy and thinking-of-you card - for loss, hard seasons, and the moments when silence says more than a long message. Blank inside.',
       '/images/products/gift-cards/sometimes-words-not-enough.webp', 13,
       ARRAY['gift-idea']::text[]),

      -- 14
      ('New Mum Cheers Card', 'new-mum-cheers-card', 200,
       'Soft-pink illustrated card of two hands clinking a baby bottle and a wine glass - ''To a new mum, you''re doing great''. Celebratory, real, no-pressure-to-be-perfect energy. Pair it with a postpartum gift basket, bath oils or a meal drop-off for the new mama who is somehow keeping a tiny human alive.',
       '/images/products/gift-cards/new-mum-cheers.webp', 14,
       ARRAY['gift-idea']::text[]),

      -- 15
      ('Happy Anniversary Assorted Box', 'happy-anniversary-assorted-box-card', 250,
       'Kraft-box set of 8 mixed-occasion cards with envelopes, headlined by a holographic ''Happy Anniversary'' design on the cover. A ready-to-go stash for the year ahead - birthdays, thank-yous, weddings, a quick ''thinking of you''. Keep it on the shelf and never be caught empty-handed again.',
       '/images/products/gift-cards/happy-anniversary-assorted-box.webp', 15,
       ARRAY['gift-idea','anniversary','best-seller']::text[]),

      -- 16
      ('Women Like You Card', 'women-like-you-card', 200,
       'Cream card with an elegant silhouette of diverse women linked across the page and the quote ''The world needs more Women like you''. A celebration card for the sisters, mothers, mentors, bosses and best friends who change rooms just by walking in. International Women''s Day, birthdays, big-promotion moments.',
       '/images/products/gift-cards/women-like-you.webp', 16,
       ARRAY['gift-idea']::text[]),

      -- 17
      ('Hello Sweet Baby Card', 'hello-sweet-baby-card', 210,
       'Vibrant watercolour confetti card in fuchsia, sunshine yellow and electric blue bursts with a joyful ''Hello Sweet Baby!'' welcome. Gender-neutral and full of life - perfect for baby showers, first visits and nursery gift baskets. Blank inside for the longest, most sentimental note you want to write.',
       '/images/products/gift-cards/hello-sweet-baby.jpg', 17,
       ARRAY['gift-idea','new-arrival']::text[]),

      -- 18
      ('Little Note Of Thanks Card', 'little-note-of-thanks-card', 180,
       'Deep teal A6 card bordered by hand-painted tropical blooms with a chunky white ''A Little Note Of Thanks!'' headline. A warm, botanical thank-you that feels handwritten even before you have written a word. Pair with a small gift for wedding vendors, nannies, mentors and bridesmaids.',
       '/images/products/gift-cards/little-note-of-thanks.jpg', 18,
       ARRAY['gift-idea']::text[]),

      -- 19
      ('Cute Butt Obviously Card', 'cute-butt-obviously-card', 200,
       'Minimalist white card with a scribbled red heart and the cheeky line ''I''m only in this for your Cute Butt, obviously!'' - a playful, no-filter love card for the partner who gets the joke. Works for Valentine''s, anniversaries, and random Tuesdays where flirting needs a physical object.',
       '/images/products/gift-cards/cute-butt-obviously.webp', 19,
       ARRAY['gift-idea','valentine']::text[]),

      -- 20
      ('Hello Baby Boy Giraffe Card', 'hello-baby-boy-giraffe-card', 220,
       'Dreamy powder-blue card with fluffy clouds and a wide-eyed baby giraffe holding a balloon that reads ''Hello Baby Boy''. A gentle, storybook-style welcome for the new little man - perfect for baby showers, newborn gift baskets and nursery decor gifting.',
       '/images/products/gift-cards/hello-baby-boy.webp', 20,
       ARRAY['gift-idea']::text[]),

      -- 21
      ('Hello Baby Girl Elephant Card', 'hello-baby-girl-elephant-card', 220,
       'Blush-pink sky card with a sweet baby elephant wearing a bow and holding a ''Hello Baby Girl'' balloon. Soft, nursery-perfect and unmistakably tender - for baby showers, first visits and the first card that goes into a memory box.',
       '/images/products/gift-cards/hello-baby-girl.webp', 21,
       ARRAY['gift-idea']::text[]),

      -- 22
      ('Love Hearts Duo Foil Card', 'love-hearts-duo-foil-card', 240,
       'Heart-shaped die-cut card with two overlapping crimson hearts edged in gold foil and a shower of sparkling mini hearts across the front. Unmistakably romantic - a Valentine''s and anniversary icon with a matching red envelope. Blank inside for the good stuff.',
       '/images/products/gift-cards/love-hearts-duo.webp', 22,
       ARRAY['gift-idea','valentine','anniversary','trending']::text[]),

      -- 23
      ('My Man My Man My Mannn Card', 'my-man-my-man-my-mannn-card', 190,
       'Baby-blue card with a blushing cartoon mochi character and the lyrical ''My Man, My Man, My Mannn!'' - a giggly, big-cartoon-energy love note for him. For anniversaries, Valentine''s, or the Tuesday you just needed him to know.',
       '/images/products/gift-cards/my-man-my-man.webp', 23,
       ARRAY['gift-idea','valentine']::text[]),

      -- 24
      ('Secret Admirer Card', 'secret-admirer-card', 200,
       'Soft-pink A6 card with a bold crimson question mark that opens to reveal ''Secret Admirer'' and a trail of tiny hearts across the page. Flirty, mysterious and perfect for an anonymous Valentine''s, a crush confession, or a playful office mystery-gift moment.',
       '/images/products/gift-cards/secret-admirer.jpg', 24,
       ARRAY['gift-idea','valentine']::text[]),

      -- 25
      ('Going To Be OK Wildflower Card', 'going-to-be-ok-wildflower-card', 180,
       'Cream card with a hand-painted wildflower bouquet in a ribbed vase and the honest line ''It might be rough now but it''s going to be ok''. A real, grown-up sympathy and encouragement card - for grief, anxious seasons and friends rebuilding. Blank inside.',
       '/images/products/gift-cards/going-to-be-ok-sympathy.webp', 25,
       ARRAY['gift-idea']::text[]),

      -- 26
      ('One I Love To Annoy Card', 'one-i-love-to-annoy-card', 170,
       'Pastel pink A6 card with bold hot-pink bubble letters reading ''You''re the One I Love'' and the quiet kicker underneath: ''...to annoy the most''. A cheeky, real-couple love note with a wink. Anniversaries, Valentine''s, or any moment that calls for gentle roasting.',
       '/images/products/gift-cards/one-i-love-annoy.jpg', 26,
       ARRAY['gift-idea','valentine','anniversary']::text[]),

      -- 27
      ('Thinking Of You Script Card', 'thinking-of-you-script-card', 160,
       'Clean white card with flowing black hand-calligraphy ''Thinking Of You'' flanked by tiny red hearts and a single gold accent. Timeless, understated and appropriate for any moment that calls for presence - sympathy, illness, long distance, or just because.',
       '/images/products/gift-cards/thinking-of-you.jpeg', 27,
       ARRAY['gift-idea']::text[]),

      -- 28
      ('Unpaid Therapist Thank You Card', 'unpaid-therapist-thank-you-card', 200,
       'White card with bold halftone type reading ''Thanks For Being My Unpaid Therapist'' in teal - with the ''i'' in therapist swapped for a little red-and-white pill. A funny, deeply-meant thank-you for the friend who listens to everything. Slip it into a birthday gift for your ride-or-die.',
       '/images/products/gift-cards/unpaid-therapist.webp', 28,
       ARRAY['gift-idea']::text[]),

      -- 29
      ('More Women Like You Watercolour Card', 'more-women-like-you-watercolour-card', 210,
       'White card washed with a soft pink watercolour brushstroke and the sweeping script ''The World Needs More Women Like You''. A graceful compliment card for the women who change rooms just by walking in. Perfect for International Women''s Day, mentors and best-friend birthdays.',
       '/images/products/gift-cards/women-like-you-watercolour.webp', 29,
       ARRAY['gift-idea']::text[]),

      -- 30
      ('XOXO Love You Lots Card', 'xoxo-love-you-lots-card', 190,
       'White A6 card with playful rose-and-coral ''XOXO'' block lettering (hearts tucked inside the O''s) and a sweeping ''Love You Lots'' signature. A crisp, modern kiss-and-hug note - for Valentine''s, anniversaries, birthdays and everyday big-feelings moments.',
       '/images/products/gift-cards/xoxo-love-you-lots.webp', 30,
       ARRAY['gift-idea','valentine']::text[]),

      -- 31
      ('Yay It''s Your Day Card', 'yay-its-your-day-card', 170,
       'Electric-blue party card scattered with doodled stars and a stacked ''YAY IT''S YOUR DAY'' in punchy yellow 3D letters. A loud, happy birthday card with full confetti energy - for the friend whose birthday is basically a public holiday in your calendar.',
       '/images/products/gift-cards/yay-its-your-day.webp', 31,
       ARRAY['gift-idea','birthday']::text[]),

      -- 32
      ('You Are A Classic Card', 'you-are-a-classic-card', 230,
       'Mustard-yellow A6 card with a hand-illustrated vintage saloon car and the tagline ''You Are A Classic''. A retro, sharp-dressed compliment card for the timeless one in your life - the kind of person who makes a plain white shirt look expensive. Great for fathers, mentors and milestone birthdays.',
       '/images/products/gift-cards/you-are-a-classic.webp', 32,
       ARRAY['gift-idea','birthday']::text[]),

      -- 33
      ('Burn For You Matchbook Card', 'burn-for-you-matchbook-card', 220,
       'Crimson-red A6 card styled like a vintage matchbook with a white strike-strip edge and the smouldering line ''I''d Burn For You''. A hot-blooded love-note card for Valentine''s, anniversaries and the ones who light you up. Small enough to slip inside a perfume box.',
       '/images/products/gift-cards/burn-for-you.webp', 33,
       ARRAY['gift-idea','valentine','anniversary']::text[])
    ) AS t(name, slug, price, description, image_url, sort_order, tags)
  LOOP
    INSERT INTO public.products (
      name, slug, description, price,
      category_id, is_new, is_on_offer, offer_percentage,
      in_stock, featured, collection,
      gallery_images, sort_order,
      material, care_instructions, stock_quantity
    )
    VALUES (
      rec.name, rec.slug, rec.description, rec.price,
      v_cat_id, true, false, 0,
      true, (rec.sort_order <= 6), 'women',
      ARRAY[rec.image_url]::text[], rec.sort_order,
      '250gsm premium matte cardstock',
      'Store flat, away from direct sunlight and moisture to preserve foil and colours.',
      50
    )
    ON CONFLICT (slug) DO UPDATE SET
      name              = EXCLUDED.name,
      description       = EXCLUDED.description,
      price             = EXCLUDED.price,
      category_id       = EXCLUDED.category_id,
      is_new            = EXCLUDED.is_new,
      is_on_offer       = EXCLUDED.is_on_offer,
      in_stock          = EXCLUDED.in_stock,
      featured          = EXCLUDED.featured,
      collection        = EXCLUDED.collection,
      gallery_images    = EXCLUDED.gallery_images,
      sort_order        = EXCLUDED.sort_order,
      material          = EXCLUDED.material,
      care_instructions = EXCLUDED.care_instructions,
      updated_at        = now();

    SELECT id INTO v_prod_id FROM public.products WHERE slug = rec.slug;

    IF v_prod_id IS NOT NULL THEN
      -- Re-seed the primary product image idempotently so re-runs do
      -- not accumulate duplicate rows in product_images.
      DELETE FROM public.product_images WHERE product_id = v_prod_id;
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (v_prod_id, rec.image_url, rec.name, 0, true);

      -- Attach tags declared in the VALUES row.
      IF 'gift-idea'   = ANY(rec.tags) AND tag_gift_idea   IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_gift_idea)   ON CONFLICT DO NOTHING; END IF;
      IF 'new-arrival' = ANY(rec.tags) AND tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF 'valentine'   = ANY(rec.tags) AND tag_valentine   IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_valentine)   ON CONFLICT DO NOTHING; END IF;
      IF 'anniversary' = ANY(rec.tags) AND tag_anniversary IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_anniversary) ON CONFLICT DO NOTHING; END IF;
      IF 'birthday'    = ANY(rec.tags) AND tag_birthday    IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_birthday)    ON CONFLICT DO NOTHING; END IF;
      IF 'trending'    = ANY(rec.tags) AND tag_trending    IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_trending)    ON CONFLICT DO NOTHING; END IF;
      IF 'best-seller' = ANY(rec.tags) AND tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags(product_id, tag_id) VALUES (v_prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Success: Gift Cards category created and 33 greeting cards seeded into public.products (category = gift-cards).';
END $$;

-- ------------------------------------------------------------
-- 3. Mirror rich shop descriptions back into the checkout
--    gift_items catalogue so the admin only edits copy in one
--    place. The modal itself only renders name + price, so the
--    richer description simply stays available for other surfaces
--    (admin table, order receipts) without leaking into the modal.
-- ------------------------------------------------------------
UPDATE public.gift_items g
   SET description = p.description,
       updated_at  = now()
  FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
 WHERE g.category = 'greeting_card'
   AND c.slug     = 'gift-cards'
   AND g.name     = p.name;

-- ============================================================
-- Her Kingdom - Greeting Cards Seed Data (Consolidated / Final)
-- ============================================================
-- Seeds ALL greeting cards into the `gift_items` table under the
-- 'greeting_card' category in one single, idempotent run so the
-- admin only needs to execute ONE SQL file to get the complete
-- checkout Greeting Cards catalogue populated correctly.
--
-- This supersedes 021_seed_greeting_cards.sql and
-- 022_seed_greeting_cards_extra.sql - running this script alone
-- is sufficient. Re-running is safe: each row is matched on
-- (category, name) and its image_url, price, description and
-- sort_order are updated in place rather than duplicated.
--
-- Every image below is present in
--   /public/images/products/gift-cards/
-- and the image_url uses its absolute public path (same pattern
-- as the sibling 010_seed_add_ons / 021_seed_gift_wrapping_items
-- scripts).
--
-- Price range: KSh 150 - KSh 250 (varied across the band).
-- Total cards seeded: 33.
-- ============================================================
-- Run this in the Supabase SQL Editor after
-- 020_gift_items_schema.sql has been applied.
-- ============================================================

DO $$
DECLARE
  -- (name, description, price, image_url, sort_order)
  rec record;
BEGIN

  FOR rec IN
    SELECT * FROM (VALUES
      -- 1
      ('XOXO Love Notes Card',
       'Bold fuchsia-and-tangerine brushstroke card with a gold ''xoxo'' script - a modern kiss-and-hug note for birthdays, anniversaries and just-because moments.',
       200, '/images/products/gift-cards/xoxo-love-notes.jpg', 1),
      -- 2
      ('Baby Reveal Moment Card',
       'Pastel lilac ''Baby Reveal'' card with glittering blue and pink heart balloons - the sweetest way to share ''Blue or Pink, what do we think?''',
       220, '/images/products/gift-cards/baby-reveal-moment.jpg', 2),
      -- 3
      ('Sunset Thank You Card',
       'A warm watercolour ''Thank You'' in painterly orange and coral brushstrokes - gratitude made bright, perfect for teachers, friends and every kind gesture.',
       150, '/images/products/gift-cards/sunset-thank-you.webp', 3),
      -- 4
      ('365 Days Of Us Anniversary Card',
       'A cheeky peach-toned A6 card reading ''Happy 365 Days Of Putting Up With Me'' - an honest, funny anniversary love note for the one who stays.',
       230, '/images/products/gift-cards/365-days-anniversary.jpg', 4),
      -- 5
      ('Have A Special Day Floral Card',
       'Deep aubergine A6 card framed with hand-painted orchids and cream script - a soft, elegant ''Have A Special Day'' for birthdays and milestones.',
       180, '/images/products/gift-cards/have-a-special-day.jpg', 5),
      -- 6
      ('Really Really Love You Card',
       'Minimal white card with a cluster of rose-pink hearts forming a heart shape and the line ''I just really really love you'' in hand-script - simple, heartfelt, unmistakable.',
       190, '/images/products/gift-cards/really-really-love-you.webp', 6),
      -- 7
      ('Always Love You Songbook Card',
       'Hot-pink scannable songbook card with gold foil ''I will always love you'' and a ''Scan Me To Stream This Song'' QR for Whitney Houston''s classic - music-meets-paper romance.',
       250, '/images/products/gift-cards/always-love-you-songbook.webp', 7),
      -- 8
      ('Mimi Ni Fan Wako Card',
       'A playful lavender Swahili pun card - ''Mimi Ni Fan Wako'' (I''m Your Fan) illustrated with a smiling table fan. A sweet, locally-flavoured way to say ''I''m rooting for you''.',
       170, '/images/products/gift-cards/mimi-ni-fan-wako.webp', 8),
      -- 9
      ('Nakumiss Pig-Time Card',
       'Pink-gingham ''Nakumiss Pig-Time!'' card - a Swahili-English miss-you pun with a shy little cartoon pig and floating hearts. For when distance calls for something cheeky.',
       170, '/images/products/gift-cards/nakumiss-pig-time.webp', 9),
      -- 10
      ('OMG It''s Your Day Card',
       'Blush-pink A6 speech-bubble card packed with ''It''s Your Day - OMG! Legendary! Awesome! Hooray!'' - confetti-energy in card form, built for birthdays and big wins.',
       150, '/images/products/gift-cards/omg-its-your-day.webp', 10),
      -- 11
      ('Sunshine Of My Life Card',
       'Peach card with shimmering gold-foil lyrics ''You are the sunshine of my life'' and a scan-to-stream QR for Stevie Wonder''s anthem - a sunlit romantic classic.',
       250, '/images/products/gift-cards/sunshine-of-my-life.webp', 11),
      -- 12
      ('Never Gonna Give You Up Card',
       'Bubble-gum pink card with bold gold-foil ''Never gonna give you up'' lyrics and a stream-this-song QR for Rick Astley - a loyal, playful love-note card.',
       240, '/images/products/gift-cards/never-gonna-give-you-up.webp', 12),
      -- 13
      ('Sometimes Words Are Not Enough Card',
       'Quiet cream card with delicate dandelion seeds scattering on the breeze and the line ''Sometimes words are not enough'' - a tender sympathy and thinking-of-you card.',
       210, '/images/products/gift-cards/sometimes-words-not-enough.webp', 13),
      -- 14
      ('New Mum Cheers Card',
       'Soft-pink illustrated card of two hands clinking a baby bottle and a wine glass with the line ''To a new mum, you''re doing great'' - celebratory, real and warm.',
       200, '/images/products/gift-cards/new-mum-cheers.webp', 14),
      -- 15
      ('Happy Anniversary Assorted Box',
       'Kraft-box set of 8 mixed-occasion cards with envelopes - featured holographic ''Happy Anniversary'' design on the cover. A ready-to-go stash for weddings, birthdays and thank-yous.',
       250, '/images/products/gift-cards/happy-anniversary-assorted-box.webp', 15),
      -- 16
      ('Women Like You Card',
       'Cream card with a silhouette of many diverse women and the quote ''The world needs more Women like you'' - a celebration card for the sisters, mothers and mentors in your life.',
       200, '/images/products/gift-cards/women-like-you.webp', 16),
      -- 17
      ('Hello Sweet Baby Card',
       'Vibrant watercolour confetti card in fuchsia, sunshine yellow and electric blue bursts - a joyful ''Hello Sweet Baby!'' welcome for any nursery, gender-neutral and full of life.',
       210, '/images/products/gift-cards/hello-sweet-baby.jpg', 17),
      -- 18
      ('Little Note Of Thanks Card',
       'Deep teal A6 card bordered by hand-painted tropical blooms with a chunky white ''A Little Note Of Thanks!'' headline - a warm, botanical thank-you that feels handwritten.',
       180, '/images/products/gift-cards/little-note-of-thanks.jpg', 18),
      -- 19
      ('Cute Butt Obviously Card',
       'Minimalist white card with a scribbled red heart and the cheeky line ''I''m only in this for your Cute Butt, obviously!'' - a playful, no-filter love card for the one who gets the joke.',
       200, '/images/products/gift-cards/cute-butt-obviously.webp', 19),
      -- 20
      ('Hello Baby Boy Giraffe Card',
       'Dreamy powder-blue card with fluffy clouds and a wide-eyed baby giraffe holding a balloon that reads ''Hello Baby Boy'' - a gentle, storybook welcome card for the new little man.',
       220, '/images/products/gift-cards/hello-baby-boy.webp', 20),
      -- 21
      ('Hello Baby Girl Elephant Card',
       'Blush-pink sky card with a sweet little elephant in a bow holding a ''Hello Baby Girl'' balloon - a soft, nursery-perfect welcome for the new little lady.',
       220, '/images/products/gift-cards/hello-baby-girl.webp', 21),
      -- 22
      ('Love Hearts Duo Foil Card',
       'Heart-shaped die-cut card with two overlapping crimson hearts edged in gold foil and a shower of sparkling hearts across the front - an unmistakably romantic Valentine''s and anniversary choice.',
       240, '/images/products/gift-cards/love-hearts-duo.webp', 22),
      -- 23
      ('My Man My Man My Mannn Card',
       'Baby-blue card with a blushing cartoon mochi character and the lyrical ''My Man, My Man, My Mannn!'' - a sweet, giggly love note for him with big cartoon energy.',
       190, '/images/products/gift-cards/my-man-my-man.webp', 23),
      -- 24
      ('Secret Admirer Card',
       'Soft-pink A6 card with a bold crimson question mark that reveals the words ''Secret Admirer'' and a trail of tiny hearts floating across the page - flirty, mysterious, perfect for an anonymous note.',
       200, '/images/products/gift-cards/secret-admirer.jpg', 24),
      -- 25
      ('Going To Be OK Wildflower Card',
       'Cream card with a hand-painted wildflower bouquet in a ribbed vase and the honest line ''It might be rough now but it''s going to be ok'' - a real, grown-up sympathy and encouragement card.',
       180, '/images/products/gift-cards/going-to-be-ok-sympathy.webp', 25),
      -- 26
      ('One I Love To Annoy Card',
       'Pastel pink A6 card with bold hot-pink bubble letters reading ''You''re the One I Love'' and the quieter kicker ''to annoy the most'' - a cheeky, real-couple love note with a wink.',
       170, '/images/products/gift-cards/one-i-love-annoy.jpg', 26),
      -- 27
      ('Thinking Of You Script Card',
       'Clean white card with flowing black hand-calligraphy ''Thinking Of You'' flanked by tiny red hearts and a gold accent - timeless, understated and appropriate for any moment that calls for presence.',
       160, '/images/products/gift-cards/thinking-of-you.jpeg', 27),
      -- 28
      ('Unpaid Therapist Thank You Card',
       'White card with bold halftone type reading ''Thanks For Being My Unpaid Therapist'' in teal, with the ''i'' in therapist swapped for a red-and-white pill - a funny, deeply-meant thank-you for the friend who listens to everything.',
       200, '/images/products/gift-cards/unpaid-therapist.webp', 28),
      -- 29
      ('More Women Like You Watercolour Card',
       'White card washed with a soft pink watercolour brushstroke and the sweeping script ''The World Needs More Women Like You'' - a graceful compliment card for the women who change rooms just by walking in.',
       210, '/images/products/gift-cards/women-like-you-watercolour.webp', 29),
      -- 30
      ('XOXO Love You Lots Card',
       'White A6 card with playful rose-and-coral ''XOXO'' block lettering (hearts tucked inside the Os) and a sweeping ''Love You Lots'' signature - a crisp, modern kiss-and-hug note.',
       190, '/images/products/gift-cards/xoxo-love-you-lots.webp', 30),
      -- 31
      ('Yay It''s Your Day Card',
       'Electric-blue party card scattered with doodled stars and a stacked ''YAY ITS YOUR DAY'' in punchy yellow 3D letters - a loud, happy birthday card with full confetti energy.',
       170, '/images/products/gift-cards/yay-its-your-day.webp', 31),
      -- 32
      ('You Are A Classic Card',
       'Mustard-yellow A6 card with a hand-illustrated vintage saloon car and the tagline ''You Are A Classic'' - a retro, sharp-dressed compliment card for the timeless one in your life.',
       230, '/images/products/gift-cards/you-are-a-classic.webp', 32),
      -- 33
      ('Burn For You Matchbook Card',
       'Crimson-red A6 card styled like a vintage matchbook with white strike-strip edging and the smouldering line ''I''d Burn For You'' - a hot-blooded love-note card for Valentine''s, anniversaries and the ones who light you up.',
       220, '/images/products/gift-cards/burn-for-you.webp', 33)
    ) AS t(name, description, price, image_url, sort_order)
  LOOP
    INSERT INTO public.gift_items (category, name, description, price, image_url, is_active, sort_order)
    SELECT 'greeting_card', rec.name, rec.description, rec.price, rec.image_url, true, rec.sort_order
    WHERE NOT EXISTS (
      SELECT 1 FROM public.gift_items
       WHERE category = 'greeting_card' AND name = rec.name
    );

    UPDATE public.gift_items
       SET description = rec.description,
           price       = rec.price,
           image_url   = rec.image_url,
           is_active   = true,
           sort_order  = rec.sort_order,
           updated_at  = now()
     WHERE category = 'greeting_card' AND name = rec.name;
  END LOOP;

  -- Retire the placeholder row seeded by 020_gift_items_schema.sql
  -- so it does not appear alongside the real catalogue. Safe if missing.
  UPDATE public.gift_items
     SET is_active  = false,
         updated_at = now()
   WHERE category = 'greeting_card' AND name = 'Amazing Friend Card';

  RAISE NOTICE 'Success: 33 greeting cards seeded/refreshed in gift_items (category = greeting_card).';
END $$;

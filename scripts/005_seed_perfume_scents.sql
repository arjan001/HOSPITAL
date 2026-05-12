-- ============================================================
-- Her Kingdom - Perfume & Scents Seed Data
-- Run this SQL in Supabase SQL Editor after running 001_herkingdom_schema.sql
-- ============================================================

-- Ensure Perfume & Scents category exists and has the correct image
INSERT INTO public.categories (name, slug, description, image_url, sort_order, is_active)
VALUES ('Perfume & Scents', 'perfume-scents', 'Luxury fragrances and signature scents for every occasion', '/images/products/perfume-scents/perfume-scents-category.png', 11, true)
ON CONFLICT (slug) DO UPDATE SET image_url = '/images/products/perfume-scents/perfume-scents-category.png';

-- Insert Perfume & Scents products and their images/tags
DO $$
DECLARE
  cat_id uuid;
  prod_id uuid;
  tag_new_arrival uuid;
  tag_best_seller uuid;
  tag_trending uuid;
  tag_gift_idea uuid;
  tag_luxury uuid;
  tag_everyday uuid;
  tag_valentine uuid;
  tag_birthday uuid;
BEGIN
  -- Get the Perfume & Scents category ID
  SELECT id INTO cat_id FROM public.categories WHERE slug = 'perfume-scents';

  -- Get tag IDs
  SELECT id INTO tag_new_arrival FROM public.tags WHERE slug = 'new-arrival';
  SELECT id INTO tag_best_seller FROM public.tags WHERE slug = 'best-seller';
  SELECT id INTO tag_trending FROM public.tags WHERE slug = 'trending';
  SELECT id INTO tag_gift_idea FROM public.tags WHERE slug = 'gift-idea';
  SELECT id INTO tag_luxury FROM public.tags WHERE slug = 'luxury';
  SELECT id INTO tag_everyday FROM public.tags WHERE slug = 'everyday';
  SELECT id INTO tag_valentine FROM public.tags WHERE slug = 'valentine';
  SELECT id INTO tag_birthday FROM public.tags WHERE slug = 'birthday';

  IF cat_id IS NOT NULL THEN

    -- ============================================================
    -- FULL-SIZE FRAGRANCES (100ml Eau de Parfum)
    -- ============================================================

    -- 1. Hypnotic Poison EDP - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Hypnotic Poison Eau de Parfum',
      'hypnotic-poison-edp',
      'Surrender to the dark allure of Hypnotic Poison — a seductive oriental vanilla fragrance that wraps you in mystery. Rich notes of bitter almond and jasmine sambac melt into a warm, intoxicating base of vanilla and musk. Bold, bewitching, and utterly unforgettable. 100ml Eau de Parfum with natural spray.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/perfume-scents/hypnotic-poison-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/hypnotic-poison-edp.jpeg', 'Hypnotic Poison Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 2. Bade'e Al Oud Sublime EDP - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Bade''e Al Oud Sublime Eau de Parfum',
      'badee-al-oud-sublime-edp',
      'Experience Arabian opulence with Bade''e Al Oud Sublime — a majestic oud fragrance wrapped in royal elegance. Deep, smoky oud wood intertwines with saffron and rose, creating a rich tapestry of warmth that lingers beautifully on the skin. The ornate gold-embossed packaging makes it a gift fit for royalty. 100ml Eau de Parfum with natural spray.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/perfume-scents/badee-al-oud-sublime-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/badee-al-oud-sublime-edp.jpeg', 'Bade''e Al Oud Sublime Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 3. Dunhill Desire For Men EDP - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Dunhill Desire For Men Eau de Parfum',
      'dunhill-desire-for-men-edp',
      'Ignite your presence with Dunhill Desire For Men — a bold, fiery fragrance that commands attention. Vibrant top notes of bergamot and apple burst through a heart of rose and violet, settling into a powerful base of amber and musk. Encased in its iconic red-striped design, this scent is confidence bottled. 100ml Eau de Parfum with natural spray.',
      1400, 1700, cat_id, true, true, 18, true, true, 'men',
      ARRAY['/images/products/perfume-scents/dunhill-desire-for-men-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/dunhill-desire-for-men-edp.jpeg', 'Dunhill Desire For Men Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 4. Gucci Flora EDP - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Gucci Flora Eau de Parfum',
      'gucci-flora-edp',
      'Bloom into your most radiant self with Gucci Flora — a vibrant floral symphony captured in a garden-print masterpiece. Sun-kissed citrus and peony petals dance over a dreamy base of patchouli and sandalwood. The hand-painted botanical box is as gorgeous as the scent inside. Perfect for the woman who walks into a room and leaves everyone wondering what she''s wearing. 100ml Eau de Parfum with natural spray.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/perfume-scents/gucci-flora-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/gucci-flora-edp.jpeg', 'Gucci Flora Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 5. NOW Eau de Parfum - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'NOW Eau de Parfum',
      'now-edp',
      'Live in the moment with NOW — a fresh, modern fragrance that celebrates the beauty of the present. Soft powdery notes blend with delicate white florals and a whisper of creamy musk, creating an effortlessly chic scent. Wrapped in its elegant blush-pink geometric packaging, NOW is for the woman who believes the best time is always right now. 100ml Eau de Parfum with natural spray.',
      1400, 1700, cat_id, true, true, 18, true, false, 'women',
      ARRAY['/images/products/perfume-scents/now-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/now-edp.jpeg', 'NOW Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 6. Sospiro Erba Pura EDP - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Sospiro Erba Pura Eau de Parfum',
      'sospiro-erba-pura-edp',
      'Escape to the Italian countryside with Sospiro Erba Pura — a luminous fruity-amber fragrance that feels like golden hour in a bottle. Juicy orange and bergamot melt into white musk and amber, creating a radiant, addictive trail that lasts all day. The regal navy-and-teal packaging with baroque motifs hints at the luxury within. 100ml Eau de Parfum with natural spray.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/perfume-scents/sospiro-erba-pura-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/sospiro-erba-pura-edp.jpeg', 'Sospiro Erba Pura Eau de Parfum 100ml', 0, true);
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 7. Khamrah EDP - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Khamrah Eau de Parfum',
      'khamrah-edp',
      'Indulge in the warmth of Khamrah — a spellbinding gourmand fragrance inspired by the golden richness of aged spirits. Layers of cinnamon, dried fruits, and praline melt into a velvety base of oud, tobacco, and vanilla. The striking black-and-gold box exudes pure sophistication. One spritz and you''ll understand why this is everyone''s obsession. 100ml Eau de Parfum with natural spray.',
      1500, 1800, cat_id, true, true, 17, true, true, 'women',
      ARRAY['/images/products/perfume-scents/khamrah-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/khamrah-edp.jpeg', 'Khamrah Eau de Parfum 100ml', 0, true);
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
      IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 8. Mousuf Wardi EDP - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Mousuf Wardi Eau de Parfum',
      'mousuf-wardi-edp',
      'Fall in love with Mousuf Wardi — a delicate rose-inspired fragrance that''s as soft as a petal kiss. Lush Damascena rose and raspberry unfold over a creamy base of sandalwood and musk, creating a romantic scent that feels like a warm embrace. The textured blush-pink packaging is pure elegance. Your signature scent for everyday romance. 100ml Eau de Parfum with natural spray.',
      1400, 1700, cat_id, true, true, 18, true, false, 'women',
      ARRAY['/images/products/perfume-scents/mousuf-wardi-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/mousuf-wardi-edp.jpeg', 'Mousuf Wardi Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
      IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 9. Berries Weekend Pink Edition EDP - KSh 1,400
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Berries Weekend Pink Edition Eau de Parfum',
      'berries-weekend-pink-edition-edp',
      'Say hello to your weekend mood with Berries Weekend Pink Edition — a playful, fruity fragrance that feels like sunshine and good vibes. Bursting with sweet berries, peach blossom, and a hint of vanilla cotton candy, this scent is pure joy in a bottle. Comes with a free deo spray inside! The perfect pick-me-up for brunch dates and spontaneous adventures. 100ml Eau de Parfum with natural spray.',
      1400, 1700, cat_id, true, true, 18, true, false, 'women',
      ARRAY['/images/products/perfume-scents/berries-weekend-pink-edition-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/berries-weekend-pink-edition-edp.jpeg', 'Berries Weekend Pink Edition Eau de Parfum 100ml', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
      IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 10. Tom Ford Oud Wood EDP - KSh 1,500
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Tom Ford Oud Wood Eau de Parfum',
      'tom-ford-oud-wood-edp',
      'Step into the world of quiet luxury with Tom Ford Oud Wood — an iconic woody fragrance that defines modern sophistication. Rare oud wood, rosewood, and cardamom blend seamlessly with tonka bean and amber, creating an aura of effortless elegance. The sleek dark packaging speaks volumes without saying a word. For those who know the power of a signature scent. 100ml Eau de Parfum with natural spray.',
      1500, 1800, cat_id, true, true, 17, true, true, 'men',
      ARRAY['/images/products/perfume-scents/tom-ford-oud-wood-edp.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/tom-ford-oud-wood-edp.jpeg', 'Tom Ford Oud Wood Eau de Parfum 100ml', 0, true);
      IF tag_best_seller IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_best_seller) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_trending IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_trending) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- ============================================================
    -- SMART COLLECTION MINI PERFUME TRIO SETS (3 x 25ml)
    -- ============================================================

    -- 11. Smart Collection Trio - Floral Dreams (No. 581, 540, 422) - KSh 1,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Smart Collection Trio - Floral Dreams',
      'smart-collection-trio-floral-dreams',
      'Three enchanting mini fragrances in one irresistible set! The Floral Dreams trio features Smart Collection No. 581 (a sweet floral with berry undertones), No. 540 (a warm amber-oud blend), and No. 422 Pour Femme (a fresh citrus floral). Perfect for discovering your signature scent or keeping different moods in your handbag. Each bottle is 25ml (0.8 fl.oz) Eau de Parfum with natural spray.',
      1000, 1200, cat_id, true, true, 17, true, false, 'women',
      ARRAY['/images/products/perfume-scents/smart-collection-trio-floral.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/smart-collection-trio-floral.jpeg', 'Smart Collection Trio - Floral Dreams (3 x 25ml)', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 12. Smart Collection Trio - Classic Charm (No. 581, 514, Miss) - KSh 1,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Smart Collection Trio - Classic Charm',
      'smart-collection-trio-classic-charm',
      'Timeless elegance meets everyday luxury in the Classic Charm trio. Featuring Smart Collection No. 581 (a romantic pink floral), No. 514 (a sophisticated chypre with a signature bow accent), and a dazzling Miss edition (a sparkling fruity-floral that turns heads). Three pocket-sized perfumes for the woman who changes her scent with her outfit. Each 25ml (0.8 fl.oz) Eau de Parfum with natural spray.',
      1000, 1200, cat_id, true, true, 17, true, false, 'women',
      ARRAY['/images/products/perfume-scents/smart-collection-trio-classic.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/smart-collection-trio-classic.jpeg', 'Smart Collection Trio - Classic Charm (3 x 25ml)', 0, true);
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
      IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 13. Smart Collection Trio - Elegance Edit (No. 563, 422, 514) - KSh 1,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Smart Collection Trio - Elegance Edit',
      'smart-collection-trio-elegance-edit',
      'Curated for the refined woman, the Elegance Edit brings together three versatile scents. Smart Collection No. 563 (a powdery-soft rose musk), No. 422 Pour Femme (a luminous green citrus), and No. 514 (an airy floral-chypre with delicate charm). From morning meetings to evening cocktails, this set has you covered. Each 25ml (0.8 fl.oz) Eau de Parfum with natural spray.',
      1000, 1200, cat_id, false, true, 17, true, false, 'women',
      ARRAY['/images/products/perfume-scents/smart-collection-trio-elegance.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/smart-collection-trio-elegance.jpeg', 'Smart Collection Trio - Elegance Edit (3 x 25ml)', 0, true);
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_everyday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_everyday) ON CONFLICT DO NOTHING; END IF;
      IF tag_birthday IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_birthday) ON CONFLICT DO NOTHING; END IF;
    END IF;

    -- 14. Smart Collection Trio - Luxe Nights (No. 224, 198, 537) - KSh 1,000
    INSERT INTO public.products (name, slug, description, price, original_price, category_id, is_new, is_on_offer, offer_percentage, in_stock, featured, collection, gallery_images)
    VALUES (
      'Smart Collection Trio - Luxe Nights',
      'smart-collection-trio-luxe-nights',
      'Your after-dark essentials in one stunning set. The Luxe Nights trio features Smart Collection No. 224 (a sparkling crystal-clean floral), No. 198 (a bold, glamorous fruity-oriental with a pink-bow charm), and No. 537 (a deep, mysterious amber-oud that owns the night). Three show-stopping mini perfumes for when ordinary just won''t do. Each 25ml (0.8 fl.oz) Eau de Parfum with natural spray.',
      1000, 1200, cat_id, true, true, 17, true, false, 'women',
      ARRAY['/images/products/perfume-scents/smart-collection-trio-luxe.jpeg']
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO prod_id;

    IF prod_id IS NOT NULL THEN
      INSERT INTO public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES (prod_id, '/images/products/perfume-scents/smart-collection-trio-luxe.jpeg', 'Smart Collection Trio - Luxe Nights (3 x 25ml)', 0, true);
      IF tag_new_arrival IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_new_arrival) ON CONFLICT DO NOTHING; END IF;
      IF tag_gift_idea IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_gift_idea) ON CONFLICT DO NOTHING; END IF;
      IF tag_luxury IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_luxury) ON CONFLICT DO NOTHING; END IF;
      IF tag_valentine IS NOT NULL THEN INSERT INTO public.product_tags (product_id, tag_id) VALUES (prod_id, tag_valentine) ON CONFLICT DO NOTHING; END IF;
    END IF;

  END IF;
END $$;

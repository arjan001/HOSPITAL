-- ============================================================
-- Her Kingdom - Blog Schema + Seed (2 blogs)
-- ============================================================
-- Adds editorial blog content separate from the shop. Includes
-- posts, reader comments, and star ratings. Safe to re-run: uses
-- IF NOT EXISTS for tables and ON CONFLICT for seed rows.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. BLOG POSTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  slug character varying NOT NULL UNIQUE,
  title character varying NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image text,
  author character varying DEFAULT 'Her Kingdom Editorial',
  author_avatar text,
  author_role character varying DEFAULT 'Style Editor',
  tags text[] DEFAULT ARRAY[]::text[],
  category character varying DEFAULT 'Style',
  read_time_minutes integer DEFAULT 5,
  views integer DEFAULT 0,
  is_published boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  published_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(is_published, published_at DESC);

-- ------------------------------------------------------------
-- 2. BLOG COMMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  blog_id uuid NOT NULL,
  name character varying NOT NULL,
  email character varying,
  comment text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_comments_pkey PRIMARY KEY (id),
  CONSTRAINT blog_comments_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON public.blog_comments(blog_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. BLOG RATINGS (stars)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_ratings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  blog_id uuid NOT NULL,
  session_id character varying,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT blog_ratings_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_ratings_blog_id ON public.blog_ratings(blog_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_blog_ratings_unique_session ON public.blog_ratings(blog_id, session_id) WHERE session_id IS NOT NULL;

-- ------------------------------------------------------------
-- SEED: 2 blog posts
-- ------------------------------------------------------------
INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image, author, author_role, tags, category, read_time_minutes, is_featured, published_at)
VALUES (
  'how-to-layer-necklaces-like-an-editor',
  'How To Layer Necklaces Like An Editor',
  'The art of stacking delicate chains without looking cluttered. A five-step formula our stylists use on every shoot.',
  $HTML$
<p class="lead">There is a quiet confidence in a well-layered neckline. Not the kind that shouts — the kind that lingers in a doorway, catches the light, and makes someone ask you where you got it.</p>

<p>After styling hundreds of shoots, our editors have arrived at a formula that works on every neckline, every outfit, every body. It is not about owning a dozen chains. It is about knowing how three talk to each other.</p>

<h2>1. Start with an anchor</h2>
<p>Your anchor is the shortest chain — usually a choker or 14–16 inch piece. It frames the collarbone and sets the tone. If your outfit is soft, choose a chunkier anchor. If your outfit is structured, go minimal.</p>

<h2>2. Add a whisper</h2>
<p>The second layer should sit two fingers below the first. Think of it as a whisper — a fine chain with a small pendant, or a single bar. Its job is to create rhythm, not compete.</p>

<h2>3. Introduce the story</h2>
<p>Your third layer is where the story lives. A locket. A zodiac. A pendant that means something. This is the piece people lean in to ask about.</p>

<blockquote>"The chain you wear every day should feel like a sentence you repeat to yourself."</blockquote>

<h2>4. Mind the metals</h2>
<p>Mixing metals is modern — but only if one dominates. Pick a hero metal (we love 18k gold plate) and let silver or rose gold accent. Never equal thirds.</p>

<h2>5. Let it breathe</h2>
<p>Space is a material. If your chains knot or overlap, shorten one by an inch. The goal is three parallel lines, each doing its own job, quietly.</p>

<p>Layering is not a trend. It is a habit. The same three pieces, worn in a slightly different order, will carry you from a Tuesday meeting to a Saturday dinner. That is the quiet power of curated jewelry.</p>
$HTML$,
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1600&q=80',
  'Amina Odhiambo',
  'Senior Style Editor',
  ARRAY['Layering','Necklaces','Style Guide','Editor''s Pick'],
  'Style',
  6,
  true,
  now() - interval '2 days'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image, author, author_role, tags, category, read_time_minutes, is_featured, published_at)
VALUES (
  'a-gift-guide-for-the-woman-who-has-everything',
  'A Gift Guide For The Woman Who Has Everything',
  'Past the obvious and into the thoughtful — our editors on what to gift when taste is already taken care of.',
  $HTML$
<p class="lead">Gifting someone with taste is terrifying. You are buying into a world she has already carefully built. The trick is not to add — it is to echo.</p>

<p>We spent a month asking our most discerning customers what they keep and what they quietly re-gift. The pattern was clear, and it has nothing to do with price.</p>

<h2>Give her a ritual, not an object</h2>
<p>The best gifts live on a vanity. A scent she will reach for at 7pm. A small tray for the rings she takes off before she sleeps. Think about the five minutes of her day you want to soundtrack.</p>

<h2>Something that ages, not expires</h2>
<p>Trend pieces are exciting for a week. A classic tennis bracelet, a pair of huggie hoops, a pearl drop — these are still themselves in ten years. Her taste already knows this.</p>

<blockquote>"The woman who has everything is usually the woman who knows exactly what she will keep."</blockquote>

<h2>The power of a handwritten card</h2>
<p>We include one with every Her Kingdom gift box, and it is the detail customers mention most. A single sentence in your handwriting is worth more than a second pendant.</p>

<h2>Our editor's three safe bets</h2>
<ul>
  <li><strong>A solitaire pendant on a fine chain.</strong> It layers with anything she owns.</li>
  <li><strong>A single hoop earring in two sizes.</strong> She will mix them with everything.</li>
  <li><strong>A signature scent in a travel size.</strong> Low commitment, high luxury.</li>
</ul>

<p>Gifting well is an act of paying attention. The Her Kingdom woman notices. So should you.</p>
$HTML$,
  'https://images.unsplash.com/photo-1603974372039-adc49044b6bd?auto=format&fit=crop&w=1600&q=80',
  'Wanjiku Kimani',
  'Editor-in-Chief',
  ARRAY['Gifting','Jewelry','Holiday','Luxury'],
  'Gifting',
  5,
  false,
  now() - interval '5 days'
)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published blogs" ON public.blog_posts;
CREATE POLICY "Public can read published blogs" ON public.blog_posts
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Public can read approved comments" ON public.blog_comments;
CREATE POLICY "Public can read approved comments" ON public.blog_comments
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Public can insert comments" ON public.blog_comments;
CREATE POLICY "Public can insert comments" ON public.blog_comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read ratings" ON public.blog_ratings;
CREATE POLICY "Public can read ratings" ON public.blog_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert ratings" ON public.blog_ratings;
CREATE POLICY "Public can insert ratings" ON public.blog_ratings
  FOR INSERT WITH CHECK (true);

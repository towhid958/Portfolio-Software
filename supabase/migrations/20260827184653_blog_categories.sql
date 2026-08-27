-- Blog posts previously stored category as free text (blog_posts.category),
-- so admins had no way to see/manage the actual set of categories in use -
-- every post just retyped a name, with no dedup, no rename-everywhere, no
-- listing. Introduce a real categories table, matching the existing
-- project_categories/service_categories pattern.
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT ALL ON public.blog_categories TO authenticated;
GRANT ALL ON public.blog_categories TO service_role;

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Managers can manage blog categories" ON public.blog_categories;

CREATE POLICY "Public can view blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Managers can manage blog categories" ON public.blog_categories FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL;

-- Backfill: turn every distinct non-empty category string already in use
-- into a real category row, then point each post at it.
INSERT INTO public.blog_categories (name, slug)
SELECT DISTINCT
    category,
    lower(regexp_replace(regexp_replace(trim(category), '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
FROM public.blog_posts
WHERE category IS NOT NULL AND trim(category) <> ''
ON CONFLICT (name) DO NOTHING;

UPDATE public.blog_posts p
SET category_id = c.id
FROM public.blog_categories c
WHERE p.category = c.name AND p.category_id IS NULL;

ALTER TABLE public.blog_posts DROP COLUMN IF EXISTS category;

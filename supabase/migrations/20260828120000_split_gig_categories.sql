-- Gigs previously shared categories with services (gigs.category_id referenced
-- service_categories), but gig categories are conceptually independent from
-- service categories even when a name happens to match. Give gigs their own
-- table, mirroring the blog_categories/project_categories shape.
CREATE TABLE IF NOT EXISTS public.gig_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT ON public.gig_categories TO anon, authenticated;
GRANT ALL ON public.gig_categories TO authenticated;
GRANT ALL ON public.gig_categories TO service_role;

ALTER TABLE public.gig_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view gig categories" ON public.gig_categories;
DROP POLICY IF EXISTS "Managers can manage gig categories" ON public.gig_categories;

CREATE POLICY "Public can view gig categories" ON public.gig_categories FOR SELECT USING (true);
CREATE POLICY "Managers can manage gig categories" ON public.gig_categories FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Backfill: one gig_categories row per distinct service_category currently
-- assigned to a gig, preserving name/slug/description/sort_order.
INSERT INTO public.gig_categories (name, slug, description, sort_order)
SELECT DISTINCT sc.name, sc.slug, sc.description, sc.sort_order
FROM public.service_categories sc
WHERE EXISTS (SELECT 1 FROM public.gigs g WHERE g.category_id = sc.id)
ON CONFLICT (name) DO NOTHING;

-- Point gigs at the new table via a fresh column, backfill it from the old
-- service_categories-based assignment (matched by name), then swap it in.
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS category_id_new UUID;

UPDATE public.gigs g
SET category_id_new = gc.id
FROM public.service_categories sc
JOIN public.gig_categories gc ON gc.name = sc.name
WHERE g.category_id = sc.id;

ALTER TABLE public.gigs DROP COLUMN IF EXISTS category_id;
ALTER TABLE public.gigs RENAME COLUMN category_id_new TO category_id;
ALTER TABLE public.gigs ADD CONSTRAINT gigs_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.gig_categories(id) ON DELETE SET NULL;

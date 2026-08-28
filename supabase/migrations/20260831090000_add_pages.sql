-- Custom section-based pages: each page is a title/slug/status/SEO record
-- plus an ordered array of section blocks (hero, rich text, feature grid,
-- CTA, testimonials, FAQ, image, partners) stored as JSONB, matching the
-- JSONB-array-on-the-parent-row pattern already used for services.process/
-- services.features rather than a separate child table.
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    seo_title TEXT,
    seo_description TEXT,
    og_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT ON public.pages TO anon, authenticated;
GRANT ALL ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published pages" ON public.pages;
DROP POLICY IF EXISTS "Managers can manage pages" ON public.pages;

CREATE POLICY "Public can view published pages" ON public.pages FOR SELECT USING (status = 'published');
CREATE POLICY "Managers can manage pages" ON public.pages FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS handle_pages_updated_at ON public.pages;
CREATE TRIGGER handle_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

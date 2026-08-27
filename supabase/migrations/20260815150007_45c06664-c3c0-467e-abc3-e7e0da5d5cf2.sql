-- Create project categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id to projects if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='category_id') THEN
        ALTER TABLE public.projects ADD COLUMN category_id UUID REFERENCES public.project_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Grants
GRANT SELECT ON public.project_categories TO anon, authenticated;
GRANT ALL ON public.project_categories TO authenticated;
GRANT ALL ON public.project_categories TO service_role;

-- RLS
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;

-- Drop if exists to avoid errors on retry
DROP POLICY IF EXISTS "Public can view project categories" ON public.project_categories;
DROP POLICY IF EXISTS "Admins can manage project categories" ON public.project_categories;

CREATE POLICY "Public can view project categories" ON public.project_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage project categories" ON public.project_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed project categories
INSERT INTO public.project_categories (name, slug, description, sort_order) VALUES
('Web Development', 'web-development', 'Bespoke web applications and sites.', 1),
('Digital Marketing', 'digital-marketing', 'Data-driven marketing campaigns.', 2),
('SEO', 'seo', 'Search engine optimization projects.', 3),
('Branding', 'branding', 'Visual identity and brand strategy.', 4)
ON CONFLICT (slug) DO NOTHING;

-- Seed a sample project if none exist
INSERT INTO public.projects (title, slug, client, industry, description, challenge, solution, results, status, is_featured, completion_date, technologies, services_provided)
VALUES (
    'E-commerce Transformation', 
    'ecommerce-transformation', 
    'Global Retail Co', 
    'Retail', 
    'A complete digital overhaul of a brick-and-mortar retail giant.', 
    'The client was struggling with declining foot traffic and needed a robust online presence to capture digital sales.', 
    'We built a custom headless Shopify storefront integrated with their legacy ERP system.', 
    'Increased online sales by 250% within the first 6 months and improved site performance by 40%.', 
    'published', 
    true, 
    '2024-05-15', 
    '["React", "Shopify", "Node.js", "Tailwind CSS"]'::jsonb, 
    '["Web Development", "UI/UX Design", "SEO"]'::jsonb
) ON CONFLICT (slug) DO NOTHING;

-- Update the sample project with a category
UPDATE public.projects SET category_id = (SELECT id FROM public.project_categories WHERE slug = 'web-development') WHERE slug = 'ecommerce-transformation';

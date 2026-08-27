-- 1. Extend services table with comprehensive content and configuration
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS hero_image TEXT,
ADD COLUMN IF NOT EXISTS icon_image TEXT,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS technologies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS process JSONB DEFAULT '[]',
-- Display Settings
ADD COLUMN IF NOT EXISTS show_packages BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_portfolio BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_case_studies BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_testimonials BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_faq BOOLEAN DEFAULT TRUE,
-- Quotation Settings
ADD COLUMN IF NOT EXISTS enable_quote_request BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS budget_options JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS timeline_options JSONB DEFAULT '[]',
-- SEO Settings
ADD COLUMN IF NOT EXISTS meta_title TEXT,
ADD COLUMN IF NOT EXISTS meta_description TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]';

-- 2. Create service_quote_questions table for custom questions per service
CREATE TABLE IF NOT EXISTS public.service_quote_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'text', -- text, textarea, select, checkbox
    options JSONB DEFAULT '[]', -- For select/checkbox
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_quote_questions TO authenticated;
GRANT ALL ON public.service_quote_questions TO service_role;
GRANT SELECT ON public.service_quote_questions TO anon;

ALTER TABLE public.service_quote_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for questions" ON public.service_quote_questions FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can manage questions" ON public.service_quote_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create service_quotes table to store inquiries
CREATE TABLE IF NOT EXISTS public.service_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    company_name TEXT,
    country TEXT,
    website_url TEXT,
    project_description TEXT,
    requirements TEXT,
    budget TEXT,
    timeline TEXT,
    custom_answers JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    status TEXT DEFAULT 'new',
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_quotes TO authenticated;
GRANT ALL ON public.service_quotes TO service_role;
GRANT INSERT ON public.service_quotes TO anon;

ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a quote" ON public.service_quotes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Admins can manage quotes" ON public.service_quotes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create service_packages_link table
CREATE TABLE IF NOT EXISTS public.service_packages_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    gig_id UUID REFERENCES public.gigs(id) ON DELETE CASCADE NOT NULL,
    display_order INTEGER DEFAULT 0,
    UNIQUE(service_id, gig_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages_link TO authenticated;
GRANT ALL ON public.service_packages_link TO service_role;
GRANT SELECT ON public.service_packages_link TO anon;

ALTER TABLE public.service_packages_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for package links" ON public.service_packages_link FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can manage package links" ON public.service_packages_link FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

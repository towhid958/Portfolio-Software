-- Create service_inquiries table
CREATE TABLE public.service_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    email TEXT NOT NULL,
    phone_whatsapp TEXT,
    country TEXT,
    website_url TEXT,
    industry TEXT,
    selected_services TEXT[] DEFAULT '{}',
    project_title TEXT,
    project_description TEXT,
    business_goals TEXT,
    required_features TEXT,
    target_audience TEXT,
    existing_platform TEXT,
    competitor_references TEXT,
    budget_range TEXT,
    timeline TEXT,
    status TEXT DEFAULT 'new' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create service_faqs table
CREATE TABLE public.service_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true
);

-- Update projects table to support case studies (if not already there)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS challenge TEXT,
ADD COLUMN IF NOT EXISTS strategy TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS implementation TEXT,
ADD COLUMN IF NOT EXISTS results TEXT,
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS timeline TEXT;

-- Grants
GRANT SELECT, INSERT ON public.service_inquiries TO anon, authenticated;
GRANT ALL ON public.service_inquiries TO service_role;

GRANT SELECT ON public.service_faqs TO anon, authenticated;
GRANT ALL ON public.service_faqs TO service_role;

-- RLS
ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to service_inquiries" ON public.service_inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated select for service_inquiries" ON public.service_inquiries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public read for service_faqs" ON public.service_faqs FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Allow authenticated all for service_faqs" ON public.service_faqs TO authenticated USING (true);

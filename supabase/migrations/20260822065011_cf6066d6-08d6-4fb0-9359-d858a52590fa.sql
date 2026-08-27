-- Create Service FAQs table
CREATE TABLE IF NOT EXISTS public.service_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Service Inquiries table
CREATE TABLE IF NOT EXISTS public.service_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    company_name TEXT,
    email TEXT NOT NULL,
    phone_whatsapp TEXT,
    country TEXT,
    website_url TEXT,
    industry TEXT,
    selected_services TEXT[] DEFAULT '{}',
    project_title TEXT NOT NULL,
    project_description TEXT NOT NULL,
    business_goals TEXT,
    required_features TEXT,
    target_audience TEXT,
    existing_platform TEXT,
    competitor_references TEXT,
    budget_range TEXT,
    timeline TEXT,
    status TEXT DEFAULT 'new', -- new, reviewing, contact_made, proposal_sent, closed, rejected
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add case study columns to projects if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='strategy') THEN
        ALTER TABLE public.projects ADD COLUMN strategy TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='implementation') THEN
        ALTER TABLE public.projects ADD COLUMN implementation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='metrics') THEN
        ALTER TABLE public.projects ADD COLUMN metrics JSONB DEFAULT '[]';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.service_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.service_faqs TO anon, authenticated;
GRANT ALL ON public.service_faqs TO service_role;
GRANT INSERT ON public.service_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.service_inquiries TO authenticated;
GRANT ALL ON public.service_inquiries TO service_role;

-- Policies for FAQs
CREATE POLICY "Anyone can view published FAQs" ON public.service_faqs
    FOR SELECT TO anon, authenticated
    USING (is_published = true);

CREATE POLICY "Admins can manage FAQs" ON public.service_faqs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Policies for Inquiries
CREATE POLICY "Anyone can submit inquiry" ON public.service_inquiries
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Admins can view inquiries" ON public.service_inquiries
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update inquiries" ON public.service_inquiries
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Foundation & RBAC
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'editor', 'staff', 'user');

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    professional_title TEXT,
    location TEXT,
    phone TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    website_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.profiles TO anon;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security Definer Function for Roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    from public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Policies for User Roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super Admins can manage roles" ON public.user_roles
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. CMS Content Tables

-- Service Categories
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    full_description TEXT,
    icon TEXT,
    featured_image TEXT,
    starting_price DECIMAL(10,2),
    pricing_type TEXT, 
    delivery_time TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    tools JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft', 
    is_featured BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gigs
CREATE TABLE public.gigs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
    thumbnail TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    short_description TEXT,
    full_description TEXT,
    problem_statement TEXT,
    solution TEXT,
    deliverables JSONB DEFAULT '[]'::jsonb,
    requirements TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gig Packages
CREATE TABLE public.gig_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gig_id UUID REFERENCES public.gigs(id) ON DELETE CASCADE,
    name TEXT NOT NULL, 
    price DECIMAL(10,2) NOT NULL,
    delivery_time TEXT,
    revisions INT DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    cta_text TEXT DEFAULT 'Order Now'
);

-- Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    client TEXT,
    industry TEXT,
    featured_image TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    project_url TEXT,
    description TEXT,
    challenge TEXT,
    solution TEXT,
    results TEXT,
    technologies JSONB DEFAULT '[]'::jsonb,
    services_provided JSONB DEFAULT '[]'::jsonb,
    completion_date DATE,
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners & Offers
CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo TEXT,
    description TEXT,
    partnership_type TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    benefit TEXT, 
    cta_text TEXT DEFAULT 'Claim Offer',
    destination_url TEXT NOT NULL,
    expiry_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog
CREATE TABLE public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    featured_image TEXT,
    excerpt TEXT,
    content TEXT,
    category TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    author_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft',
    seo_title TEXT,
    seo_description TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    service_type TEXT,
    budget_range TEXT,
    status TEXT DEFAULT 'unread', 
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings
CREATE TABLE public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GRANTS FOR CMS TABLES
GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.gigs TO anon, authenticated;
GRANT SELECT ON public.gig_packages TO anon, authenticated;
GRANT SELECT ON public.projects TO anon, authenticated;
GRANT SELECT ON public.partners TO anon, authenticated;
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT ON public.contact_messages TO anon, authenticated;

GRANT ALL ON public.service_categories TO authenticated;
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.gigs TO authenticated;
GRANT ALL ON public.gig_packages TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.partners TO authenticated;
GRANT ALL ON public.offers TO authenticated;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT ALL ON public.contact_messages TO authenticated;
GRANT ALL ON public.activity_logs TO authenticated;
GRANT ALL ON public.site_settings TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- RLS FOR CMS TABLES
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- General view policies for public content
CREATE POLICY "Public can view categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Public can view published services" ON public.services FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view published gigs" ON public.gigs FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view gig packages" ON public.gig_packages FOR SELECT USING (true);
CREATE POLICY "Public can view published projects" ON public.projects FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view partners" ON public.partners FOR SELECT USING (true);
CREATE POLICY "Public can view active offers" ON public.offers FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view published posts" ON public.blog_posts FOR SELECT USING (status = 'published');

-- Editor/Admin policies 
CREATE POLICY "Staff can view content" ON public.services FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Editors can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- SEED DATA
INSERT INTO public.service_categories (name, slug, description, icon) VALUES
('Digital Marketing', 'digital-marketing', 'Results-driven digital marketing strategies.', 'Megaphone'),
('Web Development', 'web-development', 'Modern, performant web applications.', 'Code'),
('Business Consulting', 'business-consulting', 'Professional business advice and formation.', 'Briefcase');

INSERT INTO public.site_settings (key, value) VALUES
('general', '{"site_name": "Hasan Kamrul", "site_description": "Full-Stack Portfolio & Service Platform"}'::jsonb),
('social', '{"facebook": "", "linkedin": "", "twitter": "", "github": ""}'::jsonb);
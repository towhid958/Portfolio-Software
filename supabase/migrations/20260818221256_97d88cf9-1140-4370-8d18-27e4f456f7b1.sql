-- Create module_permissions table
CREATE TABLE public.module_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    module text NOT NULL,
    can_view boolean DEFAULT false,
    can_create boolean DEFAULT false,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(role, module)
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_permissions TO authenticated;
GRANT ALL ON public.module_permissions TO service_role;

-- Enable RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage permissions" ON public.module_permissions
    USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default permissions from the hook logic
INSERT INTO public.module_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
('admin', 'projects', true, true, true, true),
('admin', 'gigs', true, true, true, true),
('admin', 'blog', true, true, true, true),
('admin', 'partners', true, true, true, true),
('admin', 'orders', true, true, true, true),
('admin', 'messages', true, true, true, true),
('admin', 'testimonials', true, true, true, true),
('admin', 'about', true, true, true, true),
('admin', 'media', true, true, true, true),
('admin', 'documents', true, true, true, true),
('admin', 'clients', true, true, true, true),
('editor', 'projects', true, true, true, false),
('editor', 'gigs', true, true, true, false),
('editor', 'blog', true, true, true, false),
('editor', 'partners', true, true, true, false),
('editor', 'orders', true, false, false, false),
('editor', 'messages', true, false, false, false),
('editor', 'testimonials', true, false, true, false),
('editor', 'about', true, false, true, false),
('editor', 'media', true, true, true, true),
('editor', 'documents', true, true, true, false),
('editor', 'clients', true, true, true, false),
('staff', 'projects', true, false, false, false),
('staff', 'gigs', true, false, false, false),
('staff', 'blog', true, false, false, false),
('staff', 'partners', true, false, false, false),
('staff', 'orders', true, false, true, false),
('staff', 'messages', true, false, true, false),
('staff', 'testimonials', true, false, false, false),
('staff', 'about', true, false, false, false),
('staff', 'documents', true, false, false, false),
('staff', 'clients', true, false, false, false);
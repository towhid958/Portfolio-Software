-- Foundation: Create Configuration Tables
CREATE TABLE IF NOT EXISTS public.site_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb,
  category text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_configuration TO authenticated;
GRANT ALL ON public.site_configuration TO service_role;
ALTER TABLE public.site_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site configuration"
ON public.site_configuration
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Client Portal Settings
CREATE TABLE IF NOT EXISTS public.client_portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  is_enabled boolean DEFAULT true,
  access_level text DEFAULT 'full',
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_settings TO authenticated;
GRANT ALL ON public.client_portal_settings TO service_role;
ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage portal settings"
ON public.client_portal_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

GRANT SELECT ON public.client_portal_settings TO authenticated;
-- Allow clients to view portal settings (to know what features are available)
CREATE POLICY "Clients can view portal settings"
ON public.client_portal_settings
FOR SELECT
TO authenticated
USING (true);

-- Seed basic data
INSERT INTO public.client_portal_settings (feature_key, is_enabled, access_level)
VALUES 
  ('projects', true, 'full'),
  ('documents', true, 'full'),
  ('billing', true, 'full'),
  ('support', true, 'full'),
  ('messaging', true, 'full')
ON CONFLICT (feature_key) DO NOTHING;

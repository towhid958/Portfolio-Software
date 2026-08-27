
-- Create media table
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    folder TEXT DEFAULT 'general',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;

-- Enable RLS
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated select media" ON public.media
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to manage media" ON public.media
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Setup Storage (Buckets are often pre-created or managed via UI, but we can attempt to create it)
-- Note: Storage policies usually need to be done separately or via supabase.storage API if available.
-- We will assume the bucket is 'media'.

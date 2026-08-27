-- Check if the table already exists, if not create it.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'testimonials') THEN
        CREATE TABLE public.testimonials (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            role text,
            company text,
            content text NOT NULL,
            rating integer DEFAULT 5,
            is_approved boolean DEFAULT true,
            created_at timestamptz DEFAULT now()
        );

        GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
        GRANT SELECT ON public.testimonials TO anon;
        GRANT ALL ON public.testimonials TO service_role;

        ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow public read access to approved testimonials"
        ON public.testimonials
        FOR SELECT
        TO anon, authenticated
        USING (is_approved = true);

        CREATE POLICY "Allow admin to manage all testimonials"
        ON public.testimonials
        FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
    END IF;
END $$;

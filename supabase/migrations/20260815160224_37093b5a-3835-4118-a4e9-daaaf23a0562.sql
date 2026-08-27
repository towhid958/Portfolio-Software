
ALTER TABLE public.gig_reviews ADD COLUMN IF NOT EXISTS moderator_notes text;
GRANT ALL ON public.gig_reviews TO service_role;
GRANT SELECT, UPDATE ON public.gig_reviews TO authenticated;

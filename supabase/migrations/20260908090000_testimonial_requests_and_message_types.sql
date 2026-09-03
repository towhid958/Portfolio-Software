-- Messages get a "type" so a conversation can carry a special interactive
-- message (currently: a testimonial request) rather than plain text. Plain
-- messages are unaffected - they default to 'text'.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text';

-- Testimonials gain client-submission support: a client can now respond to
-- an admin's "please leave a testimonial" request with their own entry,
-- distinct from admin-authored ones (source) and starting unpublished until
-- moderated (status) - mirroring the existing gig_reviews moderation model
-- instead of the old plain is_approved boolean, so the admin Testimonials
-- section can use the same All/Pending/Approved/Rejected filter pattern
-- Reviews already has.
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- Backfill from the old boolean (still present at this point): previously-
-- hidden testimonials become "pending" rather than "rejected" - hiding one
-- wasn't necessarily a rejection, and pending is the safer, reversible
-- default for existing data.
UPDATE public.testimonials SET status = 'pending' WHERE is_approved = false;

-- Must drop the old policy before the column it references, or the column
-- drop fails with a dependency error.
DROP POLICY IF EXISTS "Allow public read access to approved testimonials" ON public.testimonials;

ALTER TABLE public.testimonials DROP COLUMN IF EXISTS is_approved;

CREATE POLICY "Allow public read access to approved testimonials" ON public.testimonials
    FOR SELECT TO anon, authenticated USING (status = 'approved');

-- A client can submit their own testimonial (in response to a request) and
-- check back on its status - but never approve/publish it themselves; that
-- stays exclusively with "Allow admin to manage all testimonials" (FOR ALL).
CREATE POLICY "Clients can submit their own testimonial" ON public.testimonials
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clients can view their own testimonial submissions" ON public.testimonials
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

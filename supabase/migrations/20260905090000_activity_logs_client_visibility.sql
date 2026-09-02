-- Admin-side actions on a client's behalf (e.g. document upload/replace in
-- admin/documents/index.tsx) are logged with user_id = the acting admin, not
-- the client, so the existing "Users can view their own activity" policy
-- (user_id = auth.uid()) never lets the client see them even though those
-- rows already carry details->>'client_id' identifying them. This adds a
-- second, permissive SELECT policy (RLS OR's multiple permissive policies
-- together) so a client can also see activity rows about them specifically,
-- without changing who activity_logs.user_id represents.
CREATE POLICY "Users can view activity about them" ON public.activity_logs
    FOR SELECT TO authenticated USING (details->>'client_id' = auth.uid()::text);

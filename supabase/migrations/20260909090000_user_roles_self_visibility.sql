-- user_roles had SELECT policies for "admin/super_admin can see all roles"
-- and "super_admin can manage roles", but no policy letting a user see
-- their OWN row. A staff/editor account's own role lookup (auth.tsx,
-- auth.callback.tsx, admin/route.tsx, dashboard/route.tsx, useRBAC) returned
-- zero rows under RLS, so the app concluded they had no admin access and
-- forcibly signed them back out - a total, hard denial of legitimate access
-- for two of the four roles the app treats as staff.
CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT TO authenticated USING (user_id = auth.uid());

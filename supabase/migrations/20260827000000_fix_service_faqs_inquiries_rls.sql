-- service_faqs and service_inquiries were each created by more than one
-- historical migration (20260822000000, ...061653, ...065011), and since
-- CREATE POLICY names differed across them, the table ended up with BOTH
-- a blanket "any authenticated user" policy AND a later admin-only policy
-- coexisting. Postgres OR's multiple permissive policies together, so the
-- blanket ones silently overrode the admin-only intent:
--   - service_faqs: any authenticated user (including plain clients) could
--     insert/update/delete FAQs, not just admins.
--   - service_inquiries: any authenticated user could read every inquiry
--     (name, email, phone, budget, project details), not just admins.
-- Dropping the redundant blanket policies leaves the admin-scoped ones
-- ("Admins can manage FAQs", "Admins can view inquiries") as the only
-- policies governing those operations.
DROP POLICY IF EXISTS "Allow authenticated all for service_faqs" ON public.service_faqs;
DROP POLICY IF EXISTS "Allow authenticated select for service_inquiries" ON public.service_inquiries;

-- The admin UI's RBAC model (useRBAC.tsx ROLE_PERMISSIONS.services_custom) grants
-- 'editor' create/edit on FAQs and view/edit on inquiries, but not delete. The
-- remaining "Admins can manage FAQs"/"...view/update inquiries" policies only
-- checked admin/super_admin, which would silently 403 an editor using the admin
-- panel's own FAQ/inquiry controls. Split by command and include editor where
-- the app's permission model already allows it.
DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.service_faqs;
CREATE POLICY "Staff can insert FAQs" ON public.service_faqs FOR INSERT TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Staff can update FAQs" ON public.service_faqs FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete FAQs" ON public.service_faqs FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can view inquiries" ON public.service_inquiries;
CREATE POLICY "Staff can view inquiries" ON public.service_inquiries FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "Admins can update inquiries" ON public.service_inquiries;
CREATE POLICY "Staff can update inquiries" ON public.service_inquiries FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor'));

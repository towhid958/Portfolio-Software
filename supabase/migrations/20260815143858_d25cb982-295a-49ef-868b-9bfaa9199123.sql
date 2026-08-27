-- 1. Restrict execution of has_role function
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

-- 2. Add missing RLS policies for management
-- Services (Already has some, adding more granular if needed)
CREATE POLICY "Managers can manage service categories" ON public.service_categories
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Gigs
CREATE POLICY "Managers can manage gigs" ON public.gigs
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Gig Packages
CREATE POLICY "Managers can manage gig packages" ON public.gig_packages
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Projects
CREATE POLICY "Managers can manage projects" ON public.projects
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Partners
CREATE POLICY "Managers can manage partners" ON public.partners
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Offers
CREATE POLICY "Managers can manage offers" ON public.offers
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Blog Posts
CREATE POLICY "Managers can manage blog posts" ON public.blog_posts
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Contact Messages
CREATE POLICY "Managers can view messages" ON public.contact_messages
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Managers can update messages" ON public.contact_messages
    FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Activity Logs
CREATE POLICY "Admins can view logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Site Settings
CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can view settings" ON public.site_settings
    FOR SELECT USING (true);

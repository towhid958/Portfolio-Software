-- blog_posts, gigs, projects, and services all have an updated_at column
-- that the admin UI now displays, but nothing ever set it on UPDATE (no
-- trigger, and the form save code never touches it) - every row's
-- updated_at was permanently frozen at its created_at value, so the
-- "Updated At" column never reflected real edits. public.handle_updated_at()
-- already exists and is used the same way for orders/client_projects/
-- client_tasks/conversations/messages; just apply it here too.
DROP TRIGGER IF EXISTS handle_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER handle_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_gigs_updated_at ON public.gigs;
CREATE TRIGGER handle_gigs_updated_at
    BEFORE UPDATE ON public.gigs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_projects_updated_at ON public.projects;
CREATE TRIGGER handle_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_services_updated_at ON public.services;
CREATE TRIGGER handle_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

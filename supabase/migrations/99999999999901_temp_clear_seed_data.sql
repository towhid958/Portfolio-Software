-- One-time cleanup that ran during the project migration off Lovable: clears
-- the starter/demo rows the earlier migrations seed, so the real-data import
-- (from the old project) didn't collide with them on unique constraints.
-- Kept here permanently (not deleted after use) because Supabase's migration
-- history on the remote project already recorded it as applied - removing
-- the local file breaks "supabase db push" with "Remote migration versions
-- not found in local migrations directory".
TRUNCATE TABLE
  public.service_categories,
  public.site_settings,
  public.project_categories,
  public.projects,
  public.gigs,
  public.gig_packages,
  public.blog_posts,
  public.partners,
  public.offers,
  public.bank_details,
  public.invoice_settings,
  public.invoice_templates,
  public.module_permissions,
  public.client_portal_settings,
  public.service_faqs
CASCADE;

-- Saved page-builder sections ("Save as Section" in the editor's context
-- menu) used to live in the browser's own localStorage only - this promotes
-- that to a real shared table so the library is visible across admins and
-- devices, not just the one browser that saved it. Same JSONB-subtree
-- pattern as pages.sections; no separate thumbnail/preview column - the
-- Toolbox's Sections tab renders a generic icon + name, same as before.
CREATE TABLE IF NOT EXISTS public.builder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subtree JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.builder_templates TO authenticated;
GRANT ALL ON public.builder_templates TO service_role;

ALTER TABLE public.builder_templates ENABLE ROW LEVEL SECURITY;

-- No public policy - unlike pages, this table has no published/visitor-facing
-- side at all, so it's editor/admin/super_admin or nothing, same shape as
-- "Managers can manage pages" in 20260831090000_add_pages.sql.
CREATE POLICY "Managers can manage builder templates" ON public.builder_templates FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

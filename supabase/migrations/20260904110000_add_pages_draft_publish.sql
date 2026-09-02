-- Draft/live content split: `sections` used to be both "what the editor
-- saves" and "what visitors see", so saving mid-edit on an already-published
-- page instantly changed the live page. `draft_sections` is now the
-- editor's own working copy; `sections` only ever changes when a page is
-- explicitly published (see EditorShell.tsx's publishMutation), which also
-- stamps `published_at` and snapshots the outgoing `sections` into
-- page_versions below.
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS draft_sections JSONB;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill: every existing page's current content becomes its starting
-- draft, so the very next edit continues from what's already there instead
-- of from an empty document. Already-published rows also get a
-- best-effort published_at (their last known update time) so "last
-- published" isn't blank for pages that predate this column.
UPDATE public.pages SET draft_sections = sections WHERE draft_sections IS NULL;
UPDATE public.pages SET published_at = updated_at WHERE status = 'published' AND published_at IS NULL;

-- One row per publish (not per save) - a lightweight, scoped version of
-- "revision history": a changelog of what actually went live and when,
-- with enough to restore an older version's content (see EditorShell.tsx's
-- History dialog, which loads a past row's `sections` back into the
-- current draft for review rather than republishing it immediately).
CREATE TABLE IF NOT EXISTS public.page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    sections JSONB NOT NULL,
    title TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_versions_page_id_created_at_idx ON public.page_versions (page_id, created_at DESC);

GRANT ALL ON public.page_versions TO authenticated;
GRANT ALL ON public.page_versions TO service_role;

ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

-- Same shape as "Managers can manage pages" - no public policy, this is an
-- editor-facing history, not visitor-facing content.
CREATE POLICY "Managers can manage page versions" ON public.page_versions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- The admin pages list's bulk "Mark as Published" action can't express
-- "copy each row's own draft_sections into its own sections" through a
-- plain PostgREST .update() (which applies one literal value to every
-- matched row) - this function does the per-row copy server-side instead.
-- SECURITY INVOKER (the default, stated explicitly): runs as the calling
-- user, so the existing "Managers can manage pages" RLS policy is what
-- actually authorizes the update, same as every other write this app makes
-- to this table - no elevated privilege needed or granted here.
CREATE OR REPLACE FUNCTION public.publish_pages(page_ids UUID[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.pages
  SET sections = COALESCE(draft_sections, sections),
      status = 'published',
      published_at = NOW()
  WHERE id = ANY(page_ids);
$$;

GRANT EXECUTE ON FUNCTION public.publish_pages(UUID[]) TO authenticated;
